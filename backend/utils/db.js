import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data files path (within api/data directory)
const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SEATS_FILE = path.join(DATA_DIR, 'seats.json');

// Initialize database directories and files
export function initDB() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. Initialize users file and seed admin
  if (!fs.existsSync(USERS_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('admin', salt);
    
    const defaultUsers = [
      {
        id: 'user_admin_default',
        name: 'System Admin',
        phone: '1234567890',
        email: 'admin@seatbook.com',
        password: hashedPassword,
        role: 'admin',
        isApproved: true,
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), 'utf-8');
    console.log('Seeded default admin user: Phone 1234567890 / Password admin');
  }

  // 2. Initialize seats file and seed some default rows
  if (!fs.existsSync(SEATS_FILE)) {
    const defaultSeats = [];
    const rows = ['A', 'B', 'C'];
    const seatsPerRow = 6;
    
    let seatIndex = 1;
    rows.forEach(row => {
      for (let num = 1; num <= seatsPerRow; num++) {
        defaultSeats.push({
          id: `seat_${row}_${num}`,
          row: row,
          number: num,
          status: 'available', // available or booked
          bookedBy: null, // will hold user object copy or ID
          bookedAt: null
        });
        seatIndex++;
      }
    });
    
    fs.writeFileSync(SEATS_FILE, JSON.stringify(defaultSeats, null, 2), 'utf-8');
    console.log('Seeded default seats (Rows A, B, C)');
  }
}

// User helper methods
export function getUsers() {
  try {
    initDB();
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users database:', error);
    return [];
  }
}

export function saveUsers(users) {
  try {
    initDB();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing users database:', error);
    return false;
  }
}

// Seat helper methods
export function getSeats() {
  try {
    initDB();
    const data = fs.readFileSync(SEATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading seats database:', error);
    return [];
  }
}

export function saveSeats(seats) {
  try {
    initDB();
    fs.writeFileSync(SEATS_FILE, JSON.stringify(seats, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing seats database:', error);
    return false;
  }
}
