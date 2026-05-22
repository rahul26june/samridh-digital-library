import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDB } from './utils/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import seatRoutes from './routes/seatRoutes.js';

dotenv.config();

// Initialize JSON database (creates data directory and seeds default data)
initDB();

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/seats', seatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Seat booking system backend operational',
    timestamp: new Date().toISOString()
  });
});

// Fallback for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

export default app;
