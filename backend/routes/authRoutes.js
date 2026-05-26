import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUsers, saveUsers } from '../utils/db.js';
import { protect } from '../middleware/auth.js';
import { validateRegistration } from '../utils/validators.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'Rahul';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, phone: user.phone, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, phone, email, password } = req.body;

  const validation = validateRegistration(name, phone, email, password);
  if (!validation.valid) {
    return res.status(400).json({
      message: validation.message,
      errors: validation.errors
    });
  }

  const { cleanData } = validation;
  const users = await getUsers();
  
  const userExists = users.find(u => u.phone === cleanData.phone);
  if (userExists) {
    return res.status(400).json({
      message: 'A user with this phone number already exists',
      errors: { phone: 'This phone number is already registered' }
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(cleanData.password, salt);

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: cleanData.name,
    phone: cleanData.phone,
    email: cleanData.email,
    password: hashedPassword,
    role: 'user',
    isApproved: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await saveUsers(users);

  res.status(201).json({
    message: 'Registration successful! Your account is pending admin approval.'
  });
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ message: 'Please provide phone number and password' });
  }

  const users = await getUsers();
  const user = users.find(u => u.phone === phone);

  if (!user) {
    return res.status(401).json({ message: 'Invalid phone number or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid phone number or password' });
  }

  if (!user.isApproved) {
    return res.status(403).json({ message: 'Your account is pending admin approval. Please contact the administrator.' });
  }

  const token = generateToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved
    }
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

export default router;
