import express from 'express';
import { getSeats, saveSeats, getChangeRequests, saveChangeRequests } from '../utils/db.js';
import { getUsers } from '../utils/db.js';
import { protect, admin, optionalProtect } from '../middleware/auth.js';

const router = express.Router();
const VALID_SHIFTS = ['morning', 'evening'];

const parseShifts = (shiftInput) => {
  if (Array.isArray(shiftInput)) {
    return shiftInput.flatMap((value) => parseShifts(value));
  }

  const value = String(shiftInput || 'full').toLowerCase().trim();
  if (value === 'full') {
    return [...VALID_SHIFTS];
  }
  return [value];
};

const normalizeSeatBookingData = (seat) => {
  if (!seat.bookedShifts || !Array.isArray(seat.bookedShifts)) {
    seat.bookedShifts = [];
  }

  // Normalize legacy 'full' booking values into explicit shifts
  if (seat.bookedShifts.includes('full')) {
    seat.bookedShifts = [...new Set([...seat.bookedShifts.filter(s => s !== 'full'), 'morning', 'evening'])];
  }

  const bookedShifts = Array.isArray(seat.bookedShifts) ? seat.bookedShifts : [];
  const shiftKeys = ['morning', 'evening'];

  if (!seat.bookedBy || typeof seat.bookedBy !== 'object') {
    seat.bookedBy = { morning: null, evening: null };
  } else if (seat.bookedBy.id && !seat.bookedBy.morning && !seat.bookedBy.evening) {
    seat.bookedBy = shiftKeys.reduce((acc, shift) => {
      acc[shift] = bookedShifts.includes(shift) ? seat.bookedBy : null;
      return acc;
    }, { morning: null, evening: null });
  } else {
    seat.bookedBy = shiftKeys.reduce((acc, shift) => {
      acc[shift] = seat.bookedBy[shift] || null;
      return acc;
    }, { morning: null, evening: null });
  }

  if (!seat.bookedAt || typeof seat.bookedAt !== 'object') {
    const originalAt = seat.bookedAt;
    seat.bookedAt = shiftKeys.reduce((acc, shift) => {
      acc[shift] = bookedShifts.includes(shift) ? originalAt || null : null;
      return acc;
    }, { morning: null, evening: null });
  } else {
    seat.bookedAt = shiftKeys.reduce((acc, shift) => {
      acc[shift] = seat.bookedAt[shift] || null;
      return acc;
    }, { morning: null, evening: null });
  }
};

const getBookingUserId = (seat, shift) => {
  if (seat.bookedBy?.[shift]?.id) return seat.bookedBy[shift].id;
  if (seat.bookedBy?.id) return seat.bookedBy.id;
  return null;
};

const seatHasShiftBooked = (seat, shift) => {
  if (!seat.bookedShifts || !Array.isArray(seat.bookedShifts)) return false;
  if (seat.bookedShifts.includes(shift) || seat.bookedShifts.includes('full')) return true;
  return Boolean(seat.bookedBy?.[shift]?.id);
};

// @desc    Get all seats (rows and status). Guest gets filtered results; logged-in user gets full details.
// @route   GET /api/seats
// @access  Public (Conditional visibility) 
router.get('/', optionalProtect, async (req, res) => {
  const seats = await getSeats();
  
  if (req.user) {
    // Logged in user: return all details including who booked it
    return res.json(seats);
  } else {
    // Guest user: hide booking details (name/phone/email) but preserve shift status.
    const filteredSeats = seats.map(seat => ({
      id: seat.id,
      row: seat.row,
      number: seat.number,
      status: seat.status,
      bookedShifts: seat.bookedShifts || [],
      bookedBy: null,
      bookedAt: null
    }));
    return res.json(filteredSeats);
  }
});

// @desc    Book a seat
// @route   POST /api/seats/:id/book
// @access  Private
router.post('/:id/book', protect, async (req, res) => {
  const seats = await getSeats();
  const { shift = 'full' } = req.body || {};
  const seatIndex = seats.findIndex(s => s.id === req.params.id);

  if (seatIndex === -1) {
    return res.status(404).json({ message: 'Seat not found' });
  }

  const seat = seats[seatIndex];
  normalizeSeatBookingData(seat);

  const requestedShifts = parseShifts(shift).filter((value) => value);
  if (!requestedShifts.length || !requestedShifts.every((value) => VALID_SHIFTS.includes(value))) {
    return res.status(400).json({ message: 'Please select a valid shift: morning, evening, or full.' });
  }

  const unavailableShifts = requestedShifts.filter((s) => seatHasShiftBooked(seat, s));
  if (unavailableShifts.length > 0) {
    return res.status(400).json({
      message: `Seat ${seat.row}${seat.number} is already booked for ${unavailableShifts.join(' and ')}. Please choose another shift or seat.`
    });
  }

  if (req.user.role !== 'admin') {
    const existingUserBooking = seats.find((currentSeat) =>
      requestedShifts.some((s) => getBookingUserId(currentSeat, s) === req.user.id)
    );

    if (existingUserBooking) {
      if (existingUserBooking.id === seat.id) {
        return res.status(400).json({
          message: 'You already have this seat booked for the selected shift(s).' }
        );
      }

      const requests = await getChangeRequests();
      const cr = {
        id: `cr_${Date.now()}_${req.user.id}`,
        userId: req.user.id,
        userName: req.user.name,
        fromSeatId: existingUserBooking.id,
        toSeatId: seat.id,
        shift: requestedShifts.length === 2 ? 'full' : requestedShifts[0],
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      requests.push(cr);
      await saveChangeRequests(requests);
      return res.status(202).json({
        message: 'You already have a booking for the selected shift(s). A change request has been sent to admin for approval.',
        request: cr
      });
    }
  }

  const now = new Date().toISOString();
  seat.bookedShifts = Array.from(new Set([...(seat.bookedShifts || []), ...requestedShifts]));
  requestedShifts.forEach((s) => {
    seat.bookedBy[s] = {
      id: req.user.id,
      name: req.user.name,
      phone: req.user.phone,
      email: req.user.email
    };
    seat.bookedAt[s] = now;
  });
  seat.status = seat.bookedShifts.length > 0 ? 'booked' : 'available';

  seats[seatIndex] = seat;
  await saveSeats(seats);

  res.json({
    message: `Seat ${seat.row}${seat.number} booked successfully for ${requestedShifts.length === 2 ? 'full day' : requestedShifts[0]}.`,
    seat
  });
});

// @desc    Cancel a seat booking
// @route   POST /api/seats/:id/cancel
// @access  Private
router.post('/:id/cancel', protect, async (req, res) => {
  const seats = await getSeats();
  const seatIndex = seats.findIndex(s => s.id === req.params.id);

  if (seatIndex === -1) {
    return res.status(404).json({ message: 'Seat not found' });
  }

  const seat = seats[seatIndex];
  const { shift = 'full' } = req.body || {};

  // Normalize structures
  seat.bookedShifts = seat.bookedShifts || [];
  seat.bookedBy = seat.bookedBy || { morning: null, evening: null };
  seat.bookedAt = seat.bookedAt || { morning: null, evening: null };

  if (!seat.bookedShifts || seat.bookedShifts.length === 0) {
    return res.status(400).json({ message: 'This seat has no bookings to cancel' });
  }

  const clearShifts = shift === 'full' ? ['morning', 'evening'] : [shift];

  // Authorization: non-admin can only cancel their own bookings for the shift
  for (const sft of clearShifts) {
    if (!seat.bookedShifts.includes(sft)) continue;
    if (req.user.role !== 'admin') {
      if (!seat.bookedBy[sft] || seat.bookedBy[sft].id !== req.user.id) {
        return res.status(403).json({ message: 'You are not authorized to cancel this booking for the requested shift' });
      }
    }
  }

  // Clear requested shifts
  clearShifts.forEach(sft => {
    const idx = seat.bookedShifts.indexOf(sft);
    if (idx !== -1) seat.bookedShifts.splice(idx, 1);
    seat.bookedBy[sft] = null;
    seat.bookedAt[sft] = null;
  });

  seat.status = (seat.bookedShifts && seat.bookedShifts.length > 0) ? 'booked' : 'available';
  seats[seatIndex] = seat;
  await saveSeats(seats);

  res.json({ message: `Canceled booking on ${seat.row}${seat.number} for ${clearShifts.join(', ')}`, seat });
});

// @desc    List change requests (admin)
// @route   GET /api/seats/change-requests
// @access  Private/Admin
router.get('/change-requests', protect, admin, async (req, res) => {
  const requests = await getChangeRequests();
  res.json(requests);
});

// @desc    Approve a change request (admin)
// @route   POST /api/seats/change-requests/:id/approve
// @access  Private/Admin
router.post('/change-requests/:id/approve', protect, admin, async (req, res) => {
  const requests = await getChangeRequests();
  const reqIndex = requests.findIndex(r => r.id === req.params.id);
  if (reqIndex === -1) return res.status(404).json({ message: 'Change request not found' });

  const cr = requests[reqIndex];
  if (cr.status !== 'pending') return res.status(400).json({ message: 'Change request already processed' });

  const seats = await getSeats();
  const fromIdx = seats.findIndex(s => s.id === cr.fromSeatId);
  const toIdx = seats.findIndex(s => s.id === cr.toSeatId);

  if (fromIdx === -1 || toIdx === -1) return res.status(404).json({ message: 'Seat(s) referenced in change request not found' });

  const fromSeat = seats[fromIdx];
  const toSeat = seats[toIdx];

  const shift = cr.shift || 'full';
  const shifts = shift === 'full' ? ['morning', 'evening'] : [shift];

  // Ensure the fromSeat has booking for the user for the required shifts
  for (const sft of shifts) {
    if (!fromSeat.bookedShifts || !fromSeat.bookedShifts.includes(sft)) {
      return res.status(400).json({ message: `Original booking not found for shift ${sft}` });
    }
    if (!fromSeat.bookedBy || !fromSeat.bookedBy[sft] || fromSeat.bookedBy[sft].id !== cr.userId) {
      return res.status(400).json({ message: `Original booking not held by user for shift ${sft}` });
    }
  }

  // Clear the fromSeat for shifts and assign to toSeat
  fromSeat.bookedShifts = fromSeat.bookedShifts || [];
  fromSeat.bookedBy = fromSeat.bookedBy || { morning: null, evening: null };
  fromSeat.bookedAt = fromSeat.bookedAt || { morning: null, evening: null };
  shifts.forEach(sft => {
    const idx = fromSeat.bookedShifts.indexOf(sft);
    if (idx !== -1) fromSeat.bookedShifts.splice(idx, 1);
    fromSeat.bookedBy[sft] = null;
    fromSeat.bookedAt[sft] = null;
  });
  fromSeat.status = (fromSeat.bookedShifts && fromSeat.bookedShifts.length > 0) ? 'booked' : 'available';

  // Assign to toSeat
  toSeat.bookedShifts = toSeat.bookedShifts || [];
  toSeat.bookedBy = toSeat.bookedBy || { morning: null, evening: null };
  toSeat.bookedAt = toSeat.bookedAt || { morning: null, evening: null };
  const now = new Date().toISOString();
  shifts.forEach(sft => {
    if (!toSeat.bookedShifts.includes(sft)) toSeat.bookedShifts.push(sft);
    toSeat.bookedBy[sft] = { id: cr.userId, name: cr.userName };
    toSeat.bookedAt[sft] = now;
  });
  toSeat.status = (toSeat.bookedShifts && toSeat.bookedShifts.length > 0) ? 'booked' : 'available';

  seats[fromIdx] = fromSeat;
  seats[toIdx] = toSeat;
  await saveSeats(seats);

  cr.status = 'approved';
  cr.approvedBy = req.user.id;
  cr.approvedAt = new Date().toISOString();
  requests[reqIndex] = cr;
  await saveChangeRequests(requests);

  res.json({ message: 'Change request approved and booking moved', request: cr, seats: { fromSeat, toSeat } });
});

// @desc    Decline a change request (admin)
// @route   POST /api/seats/change-requests/:id/decline
// @access  Private/Admin
router.post('/change-requests/:id/decline', protect, admin, async (req, res) => {
  const requests = await getChangeRequests();
  const reqIndex = requests.findIndex(r => r.id === req.params.id);
  if (reqIndex === -1) return res.status(404).json({ message: 'Change request not found' });

  const cr = requests[reqIndex];
  if (cr.status !== 'pending') return res.status(400).json({ message: 'Change request already processed' });

  cr.status = 'declined';
  cr.declinedBy = req.user.id;
  cr.declinedAt = new Date().toISOString();
  requests[reqIndex] = cr;
  await saveChangeRequests(requests);

  res.json({ message: 'Change request declined', request: cr });
});

// @desc    Add a new row with seats
// @route   POST /api/seats/row
// @access  Private/Admin
router.post('/row', protect, admin, async (req, res) => {
  const { row, seatsCount } = req.body;

  if (!row || !seatsCount) {
    return res.status(400).json({ message: 'Please provide row name (e.g. D) and seats count' });
  }

  const upperRow = row.toUpperCase().trim();
  const count = parseInt(seatsCount);

  if (count <= 0 || isNaN(count)) {
    return res.status(400).json({ message: 'Seats count must be a positive number' });
  }

  const seats = await getSeats();
  
  // Check if row already exists
  const rowExists = seats.some(s => s.row === upperRow);
  if (rowExists) {
    return res.status(400).json({ message: `Row ${upperRow} already exists. Please delete it first or choose another letter.` });
  }

  // Generate seats for the row
  for (let i = 1; i <= count; i++) {
    seats.push({
      id: `seat_${upperRow}_${i}`,
      row: upperRow,
      number: i,
      status: 'available',
      bookedBy: null,
      bookedAt: null
    });
  }

  // Sort seats alphabetically by row and then numerically by seat number
  seats.sort((a, b) => {
    if (a.row !== b.row) return a.row.localeCompare(b.row);
    return a.number - b.number;
  });

  await saveSeats(seats);

  res.status(201).json({
    message: `Row ${upperRow} with ${count} seats created successfully.`
  });
});

// @desc    Delete a row and all its seats
// @route   DELETE /api/seats/row/:rowName
// @access  Private/Admin
router.delete('/row/:rowName', protect, admin, async (req, res) => {
  const targetRow = req.params.rowName.toUpperCase().trim();
  const seats = await getSeats();

  const originalLength = seats.length;
  const filteredSeats = seats.filter(s => s.row !== targetRow);

  if (originalLength === filteredSeats.length) {
    return res.status(404).json({ message: `Row ${targetRow} not found` });
  }

  await saveSeats(filteredSeats);
  res.json({ message: `Row ${targetRow} and all its seats have been deleted` });
});

// @desc    Edit a row (update seat count)
// @route   PUT /api/seats/row/:rowName
// @access  Private/Admin
router.put('/row/:rowName', protect, admin, async (req, res) => {
  const targetRow = req.params.rowName.toUpperCase().trim();
  const { seatsCount } = req.body;

  if (!seatsCount || seatsCount <= 0) {
    return res.status(400).json({ message: 'Please provide a valid seats count' });
  }

  const seats = await getSeats();
  const currentRowSeats = seats.filter(s => s.row === targetRow);

  if (currentRowSeats.length === 0) {
    return res.status(404).json({ message: `Row ${targetRow} not found` });
  }

  const currentCount = currentRowSeats.length;
  const newCount = parseInt(seatsCount);

  // If reducing seats, remove booked seats first
  if (newCount < currentCount) {
    const bookedSeats = currentRowSeats.filter(s => s.status === 'booked');
    if (bookedSeats.length > 0) {
      return res.status(400).json({ 
        message: `Cannot reduce row size. Row ${targetRow} has ${bookedSeats.length} booked seats. Cancel bookings first.` 
      });
    }
  }

  // Remove old row seats
  let updatedSeats = seats.filter(s => s.row !== targetRow);

  // Add new seats
  for (let i = 1; i <= newCount; i++) {
    const existingSeat = currentRowSeats.find(s => s.number === i);
    if (existingSeat) {
      // Keep existing seat data
      updatedSeats.push(existingSeat);
    } else {
      // Create new seat
      updatedSeats.push({
        id: `seat_${targetRow}_${i}`,
        row: targetRow,
        number: i,
        status: 'available',
        bookedBy: null,
        bookedAt: null
      });
    }
  }

  // Sort seats
  updatedSeats.sort((a, b) => {
    if (a.row !== b.row) return a.row.localeCompare(b.row);
    return a.number - b.number;
  });

  await saveSeats(updatedSeats);
  res.json({ message: `Row ${targetRow} updated to ${newCount} seats successfully.` });
});

// @desc    Edit a single seat
// @route   PUT /api/seats/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  const seats = await getSeats();
  const seatIndex = seats.findIndex(s => s.id === req.params.id);

  if (seatIndex === -1) {
    return res.status(404).json({ message: 'Seat not found' });
  }

  const { status } = req.body;

  // Validate status if provided
  if (status && !['available', 'booked'].includes(status)) {
    return res.status(400).json({ message: 'Invalid seat status' });
  }

  const seat = seats[seatIndex];

  // If changing to available, clear booking info
  if (status === 'available' && seat.status === 'booked') {
    seat.status = 'available';
    seat.bookedBy = null;
    seat.bookedAt = null;
  } else if (status === 'booked' && seat.status === 'available') {
    // Cannot book a seat via edit endpoint (use /book endpoint instead)
    return res.status(400).json({ message: 'Use the /book endpoint to book a seat' });
  }

  seats[seatIndex] = seat;
  await saveSeats(seats);

  res.json({
    message: `Seat ${seat.row}${seat.number} updated successfully.`,
    seat
  });
});

// @desc    Assign a seat (admin) to a user for a shift
// @route   POST /api/seats/:id/assign
// @access  Private/Admin
router.post('/:id/assign', protect, admin, async (req, res) => {
  const { userId, shift = 'full' } = req.body || {};
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  const users = await getUsers();
  const targetUser = users.find(u => u.id === userId || u.phone === userId);
  if (!targetUser) return res.status(404).json({ message: 'User not found' });
  if (targetUser.role === 'admin') return res.status(400).json({ message: 'Cannot assign a seat to an admin user' });

  const seats = await getSeats();
  const seatIndex = seats.findIndex(s => s.id === req.params.id);
  if (seatIndex === -1) return res.status(404).json({ message: 'Seat not found' });

  const seat = seats[seatIndex];

  // Normalize structures
  seat.bookedShifts = seat.bookedShifts || [];
  seat.bookedBy = seat.bookedBy || { morning: null, evening: null };
  seat.bookedAt = seat.bookedAt || { morning: null, evening: null };

  const now = new Date().toISOString();
  const assignShifts = shift === 'full' ? ['morning', 'evening'] : [shift];

  // Remove this user's existing bookings for the assignShifts
  seats.forEach(s => {
    assignShifts.forEach(sft => {
      if (s.bookedBy && s.bookedBy[sft] && s.bookedBy[sft].id === targetUser.id) {
        // clear existing
        s.bookedShifts = (s.bookedShifts || []).filter(x => x !== sft);
        if (s.bookedBy) s.bookedBy[sft] = null;
        if (s.bookedAt) s.bookedAt[sft] = null;
        s.status = (s.bookedShifts && s.bookedShifts.length > 0) ? 'booked' : 'available';
      }
    });
  });

  // Assign requested shifts on the target seat (override any existing occupant for those shifts)
  assignShifts.forEach(sft => {
    // Remove any occupant currently holding this seat for the shift
    if (seat.bookedBy && seat.bookedBy[sft] && seat.bookedBy[sft].id !== targetUser.id) {
      // simply overwrite
    }
    if (!seat.bookedShifts.includes(sft)) seat.bookedShifts.push(sft);
    seat.bookedBy[sft] = { id: targetUser.id, name: targetUser.name, phone: targetUser.phone, email: targetUser.email };
    seat.bookedAt[sft] = now;
  });

  seat.status = (seat.bookedShifts && seat.bookedShifts.length > 0) ? 'booked' : 'available';

  seats[seatIndex] = seat;
  await saveSeats(seats);

  res.json({ message: `Seat ${seat.row}${seat.number} assigned to ${targetUser.name} for ${shift}`, seat });
});

// @desc    Delete a single seat
// @route   DELETE /api/seats/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  const seats = await getSeats();
  const seatIndex = seats.findIndex(s => s.id === req.params.id);

  if (seatIndex === -1) {
    return res.status(404).json({ message: 'Seat not found' });
  }

  const seat = seats[seatIndex];

  if (seat.status === 'booked') {
    return res.status(400).json({ message: `Cannot delete seat ${seat.row}${seat.number} - it is currently booked. Cancel the booking first.` });
  }

  seats.splice(seatIndex, 1);
  await saveSeats(seats);

  res.json({ message: `Seat ${seat.row}${seat.number} has been deleted.` });
});

export default router;
