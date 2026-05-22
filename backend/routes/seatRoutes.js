import express from 'express';
import { getSeats, saveSeats } from '../utils/db.js';
import { protect, admin, optionalProtect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all seats (rows and status). Guest gets filtered results; logged-in user gets full details.
// @route   GET /api/seats
// @access  Public (Conditional visibility)
router.get('/', optionalProtect, (req, res) => {
  const seats = getSeats();
  
  if (req.user) {
    // Logged in user: return all details including who booked it
    return res.json(seats);
  } else {
    // Guest user: hide booking details (name/phone) of other users
    const filteredSeats = seats.map(seat => {
      if (seat.status === 'booked') {
        return {
          id: seat.id,
          row: seat.row,
          number: seat.number,
          status: 'booked',
          // Omit bookedBy and bookedAt for guests
          bookedBy: null,
          bookedAt: null
        };
      }
      return seat;
    });
    return res.json(filteredSeats);
  }
});

// @desc    Book a seat
// @route   POST /api/seats/:id/book
// @access  Private
router.post('/:id/book', protect, (req, res) => {
  const seats = getSeats();
  const seatIndex = seats.findIndex(s => s.id === req.params.id);

  if (seatIndex === -1) {
    return res.status(404).json({ message: 'Seat not found' });
  }

  const seat = seats[seatIndex];

  if (seat.status === 'booked') {
    return res.status(400).json({ message: 'This seat is already booked' });
  }

  // Enforce limit: Non-admin users can book at most 1 seat to prevent seat hoarding
  if (req.user.role !== 'admin') {
    const alreadyBooked = seats.find(s => s.status === 'booked' && s.bookedBy && s.bookedBy.id === req.user.id);
    if (alreadyBooked) {
      return res.status(400).json({ 
        message: `You have already booked seat ${alreadyBooked.row}${alreadyBooked.number}. Please cancel it before booking a new one.` 
      });
    }
  }

  // Update seat status
  seat.status = 'booked';
  seat.bookedBy = {
    id: req.user.id,
    name: req.user.name,
    phone: req.user.phone,
    email: req.user.email
  };
  seat.bookedAt = new Date().toISOString();

  seats[seatIndex] = seat;
  saveSeats(seats);

  res.json({
    message: `Seat ${seat.row}${seat.number} booked successfully!`,
    seat
  });
});

// @desc    Cancel a seat booking
// @route   POST /api/seats/:id/cancel
// @access  Private
router.post('/:id/cancel', protect, (req, res) => {
  const seats = getSeats();
  const seatIndex = seats.findIndex(s => s.id === req.params.id);

  if (seatIndex === -1) {
    return res.status(404).json({ message: 'Seat not found' });
  }

  const seat = seats[seatIndex];

  if (seat.status === 'available') {
    return res.status(400).json({ message: 'This seat is already available' });
  }

  // User can cancel their own booking, Admin can cancel any booking
  if (req.user.role !== 'admin' && seat.bookedBy.id !== req.user.id) {
    return res.status(403).json({ message: 'You are not authorized to cancel this booking' });
  }

  const seatRow = seat.row;
  const seatNum = seat.number;

  // Reset seat
  seat.status = 'available';
  seat.bookedBy = null;
  seat.bookedAt = null;

  seats[seatIndex] = seat;
  saveSeats(seats);

  res.json({
    message: `Booking for seat ${seatRow}${seatNum} cancelled successfully`,
    seat
  });
});

// ==================== ADMIN ONLY CONFIGURATION ROUTES ====================

// @desc    Add a new row with seats
// @route   POST /api/seats/row
// @access  Private/Admin
router.post('/row', protect, admin, (req, res) => {
  const { row, seatsCount } = req.body;

  if (!row || !seatsCount) {
    return res.status(400).json({ message: 'Please provide row name (e.g. D) and seats count' });
  }

  const upperRow = row.toUpperCase().trim();
  const count = parseInt(seatsCount);

  if (count <= 0 || isNaN(count)) {
    return res.status(400).json({ message: 'Seats count must be a positive number' });
  }

  const seats = getSeats();
  
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

  saveSeats(seats);

  res.status(201).json({
    message: `Row ${upperRow} with ${count} seats created successfully.`
  });
});

// @desc    Delete a row and all its seats
// @route   DELETE /api/seats/row/:rowName
// @access  Private/Admin
router.delete('/row/:rowName', protect, admin, (req, res) => {
  const targetRow = req.params.rowName.toUpperCase().trim();
  const seats = getSeats();

  const originalLength = seats.length;
  const filteredSeats = seats.filter(s => s.row !== targetRow);

  if (originalLength === filteredSeats.length) {
    return res.status(404).json({ message: `Row ${targetRow} not found` });
  }

  saveSeats(filteredSeats);
  res.json({ message: `Row ${targetRow} and all its seats have been deleted` });
});

export default router;
