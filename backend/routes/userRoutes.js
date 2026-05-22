import express from 'express';
import bcrypt from 'bcryptjs';
import { getUsers, saveUsers, getSeats, saveSeats } from '../utils/db.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// @desc    Update user profile (logged-in user edits their own profile, phone is read-only)
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, (req, res) => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === req.user.id);

  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { name, email, password } = req.body;
  const user = users[index];

  // Update properties (phone is explicitly omitted and cannot be changed by user)
  if (name) user.name = name;
  if (email !== undefined) user.email = email;
  
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(password, salt);
  }

  users[index] = user;
  saveUsers(users);

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    isApproved: user.isApproved
  });
});

// ==================== ADMIN ONLY ROUTES ====================

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, admin, (req, res) => {
  const users = getUsers();
  // Strip passwords before returning
  const cleanUsers = users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  res.json(cleanUsers);
});

// @desc    Create a user (by Admin, auto-approved)
// @route   POST /api/users
// @access  Private/Admin
router.post('/', protect, admin, (req, res) => {
  const { name, phone, email, password, role, isApproved } = req.body;

  if (!name || !phone || !password) {
    return res.status(400).json({ message: 'Please provide name, phone number, and password' });
  }

  const users = getUsers();
  const userExists = users.find(u => u.phone === phone);
  if (userExists) {
    return res.status(400).json({ message: 'A user with this phone number already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name,
    phone,
    email: email || '',
    password: hashedPassword,
    role: role || 'user',
    isApproved: isApproved !== undefined ? isApproved : true, // Admin-created defaults to approved
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  const { password: _, ...createdUser } = newUser;
  res.status(201).json(createdUser);
});

// @desc    Update a user (by Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', protect, admin, (req, res) => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { name, phone, email, password, role, isApproved } = req.body;
  const user = users[index];

  // Admin can change phone, check for duplicates if it's changing
  if (phone && phone !== user.phone) {
    const phoneExists = users.find(u => u.phone === phone);
    if (phoneExists) {
      return res.status(400).json({ message: 'Phone number already in use by another user' });
    }
    user.phone = phone;
  }

  if (name) user.name = name;
  if (email !== undefined) user.email = email;
  if (role) user.role = role;
  if (isApproved !== undefined) user.isApproved = isApproved;

  if (password) {
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(password, salt);
  }

  users[index] = user;
  saveUsers(users);

  // If role or approval changes, or phone changes, update booking copies of this user in seats
  const seats = getSeats();
  let seatsUpdated = false;
  seats.forEach(seat => {
    if (seat.bookedBy && seat.bookedBy.id === user.id) {
      seat.bookedBy = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email
      };
      seatsUpdated = true;
    }
  });
  if (seatsUpdated) {
    saveSeats(seats);
  }

  const { password: _, ...updatedUser } = user;
  res.json(updatedUser);
});

// @desc    Approve a pending user
// @route   PUT /api/users/:id/approve
// @access  Private/Admin
router.put('/:id/approve', protect, admin, (req, res) => {
  const users = getUsers();
  const index = users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  users[index].isApproved = true;
  saveUsers(users);

  res.json({ message: 'User approved successfully' });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, (req, res) => {
  const users = getUsers();
  const userToDelete = users.find(u => u.id === req.params.id);

  if (!userToDelete) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Prevent admin from deleting themselves
  if (userToDelete.id === req.user.id || userToDelete.phone === req.user.phone) {
    return res.status(400).json({ message: 'You cannot delete your own admin account' });
  }

  // Delete the user
  const updatedUsers = users.filter(u => u.id !== req.params.id);
  saveUsers(updatedUsers);

  // Release any seats booked by this user
  const seats = getSeats();
  let seatsUpdated = false;
  seats.forEach(seat => {
    if (seat.bookedBy && seat.bookedBy.id === req.params.id) {
      seat.status = 'available';
      seat.bookedBy = null;
      seat.bookedAt = null;
      seatsUpdated = true;
    }
  });

  if (seatsUpdated) {
    saveSeats(seats);
  }

  res.json({ message: 'User and their bookings deleted successfully' });
});

export default router;
