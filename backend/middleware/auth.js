import jwt from 'jsonwebtoken';
import { getUsers } from '../utils/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'Rahul';

// Protect routes - requires valid token and approved status
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      const users = await getUsers();
      const user = users.find(u => u.id === decoded.id || u.phone === decoded.phone);

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (!user.isApproved) {
        return res.status(403).json({ message: 'User login pending admin approval' });
      }

      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;
      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Admin only middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

// Optional protect middleware (doesn't fail if no token, just parses user details if present)
export const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      const users = await getUsers();
      const user = users.find(u => u.id === decoded.id || u.phone === decoded.phone);

      if (user && user.isApproved) {
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      }
    } catch (error) {
      console.log('Optional JWT parse failed, treating as guest');
    }
  }
  next();
};
