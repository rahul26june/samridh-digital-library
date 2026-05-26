import express from 'express';
import bcrypt from 'bcryptjs';
import { getUsers, saveUsers, getSeats, saveSeats } from '../utils/db.js';
import { protect, admin } from '../middleware/auth.js';
import { validateAdminUser, validateProfileUpdate } from '../utils/validators.js';

const router = express.Router();

// @desc    Update user profile (logged-in user edits their own profile, phone is read-only)
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  const users = await getUsers();
  const index = users.findIndex(u => u.id === req.user.id);

  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { name, email, password } = req.body;
  const validation = validateProfileUpdate(name, email, password);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message, errors: validation.errors });
  }

  const user = users[index];
  const { cleanData } = validation;

  if (cleanData.name !== undefined) user.name = cleanData.name;
  if (cleanData.email !== undefined) user.email = cleanData.email;
  
  if (cleanData.password) {
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(cleanData.password, salt);
  }

  users[index] = user;
  await saveUsers(users);

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
router.get('/', protect, admin, async (req, res) => {
  const users = await getUsers();
  const cleanUsers = users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
  res.json(cleanUsers);
});

// @desc    Create a user (by Admin, auto-approved)
// @route   POST /api/users
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const { name, phone, email, password, role, isApproved } = req.body;

  const validation = validateAdminUser(name, phone, email, password, true);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message, errors: validation.errors });
  }

  const { cleanData } = validation;
  const users = await getUsers();
  const userExists = users.find(u => u.phone === cleanData.phone);
  if (userExists) {
    return res.status(400).json({ message: 'A user with this phone number already exists', errors: { phone: 'This phone number is already registered' } });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(cleanData.password, salt);

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: cleanData.name,
    phone: cleanData.phone,
    email: cleanData.email,
    password: hashedPassword,
    role: role || 'user',
    isApproved: isApproved !== undefined ? isApproved : true,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await saveUsers(users);

  const { password: _, ...createdUser } = newUser;
  res.status(201).json(createdUser);
});

// @desc    Update a user (by Admin)
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
  const users = await getUsers();
  const index = users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { name, phone, email, password, role, isApproved } = req.body;
  const validation = validateAdminUser(name, phone, email, password, false);
  if (!validation.valid) {
    return res.status(400).json({ message: validation.message, errors: validation.errors });
  }

  const user = users[index];
  const { cleanData } = validation;

  if (cleanData.phone && cleanData.phone !== user.phone) {
    const phoneExists = users.find(u => u.phone === cleanData.phone);
    if (phoneExists) {
      return res.status(400).json({ message: 'Phone number already in use by another user', errors: { phone: 'Phone number already in use by another user' } });
    }
    user.phone = cleanData.phone;
  }

  if (cleanData.name !== undefined) user.name = cleanData.name;
  if (cleanData.email !== undefined) user.email = cleanData.email;
  if (role) user.role = role;
  if (isApproved !== undefined) user.isApproved = isApproved;

  if (cleanData.password) {
    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(cleanData.password, salt);
  }

  users[index] = user;
  await saveUsers(users);

  const seats = await getSeats();
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
    await saveSeats(seats);
  }

  const { password: _, ...updatedUser } = user;
  res.json(updatedUser);
});

// @desc    Approve a pending user
// @route   PUT /api/users/:id/approve
// @access  Private/Admin
router.put('/:id/approve', protect, admin, async (req, res) => {
  const users = await getUsers();
  const index = users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  users[index].isApproved = true;
  await saveUsers(users);

  res.json({ message: 'User approved successfully' });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
  const users = await getUsers();
  const userToDelete = users.find(u => u.id === req.params.id);

  if (!userToDelete) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (userToDelete.id === req.user.id || userToDelete.phone === req.user.phone) {
    return res.status(400).json({ message: 'You cannot delete your own admin account' });
  }

  const updatedUsers = users.filter(u => u.id !== req.params.id);
  await saveUsers(updatedUsers);

  const seats = await getSeats();
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
    await saveSeats(seats);
  }

  res.json({ message: 'User and their bookings deleted successfully' });
});

export default router;
