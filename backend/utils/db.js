import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PG_SCHEMA_FILE = path.join(__dirname, '..', 'scripts', 'postgresSchema.sql');
const connectionString = process.env.PG_CONNECTION_STRING;
const usePostgres = Boolean(connectionString);
const pool = usePostgres ? new Pool({ connectionString, max: 10 }) : null;

const DEFAULT_ADMIN_PHONE = '1234567890';
const DEFAULT_ADMIN_PASSWORD = 'admin';

function normalizeSeatRow(seat) {
  if (!seat) return null;

  const normalized = {
    id: seat.id,
    row: seat.row || seat.row_label,
    number: seat.number != null ? seat.number : seat.seat_number,
    status: seat.status || 'available',
    bookedBy: { morning: null, evening: null },
    bookedAt: { morning: null, evening: null },
    bookedShifts: [],
    bookings: { morning: null, evening: null }
  };

  if (seat.bookings || seat.bookedShifts || seat.bookedBy || seat.bookedAt) {
    normalized.bookedShifts = Array.isArray(seat.bookedShifts) ? seat.bookedShifts : [];
    normalized.bookedBy = {
      morning: seat.bookedBy?.morning || null,
      evening: seat.bookedBy?.evening || null
    };
    normalized.bookedAt = {
      morning: seat.bookedAt?.morning || null,
      evening: seat.bookedAt?.evening || null
    };
    return normalized;
  }

  if (seat.status === 'booked' && seat.bookedBy) {
    normalized.bookedShifts = ['morning', 'evening'];
    normalized.bookedBy = {
      morning: seat.bookedBy,
      evening: seat.bookedBy
    };
    normalized.bookedAt = {
      morning: seat.bookedAt || null,
      evening: seat.bookedAt || null
    };
  }

  return normalized;
}

function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || '',
    password: row.password,
    role: row.role,
    isApproved: row.is_approved,
    createdAt: row.created_at ? row.created_at.toISOString() : null
  };
}

function mapChangeRequestRow(row) {
  const request = {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    fromSeatId: row.from_seat_id,
    toSeatId: row.to_seat_id,
    shift: row.shift,
    status: row.status,
    requestedAt: row.requested_at ? row.requested_at.toISOString() : null,
    notes: row.notes || null,
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null
  };

  if (row.status === 'approved') {
    request.approvedBy = row.reviewed_by || null;
  } else if (row.status === 'declined') {
    request.declinedBy = row.reviewed_by || null;
  }

  return request;
}

async function query(sql, params = []) {
  if (!pool) {
    throw new Error('PostgreSQL connection is not configured');
  }
  return pool.query(sql, params);
}

function createDefaultAdmin() {
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, salt);
  return {
    id: 'user_admin_default',
    name: 'System Admin',
    phone: DEFAULT_ADMIN_PHONE,
    email: 'admin@seatbook.com',
    password: hashedPassword,
    role: 'admin',
    isApproved: true,
    createdAt: new Date().toISOString()
  };
}

function createDefaultSeats() {
  const rows = ['A', 'B', 'C'];
  const seatsPerRow = 6;
  const defaultSeats = [];

  rows.forEach((row) => {
    for (let num = 1; num <= seatsPerRow; num++) {
      defaultSeats.push({
        id: `seat_${row}_${num}`,
        row,
        number: num,
        status: 'available',
        bookedBy: { morning: null, evening: null },
        bookedAt: { morning: null, evening: null },
        bookedShifts: [],
        bookings: { morning: null, evening: null }
      });
    }
  });

  return defaultSeats;
}

async function initPostgres() {
  const schemaSql = fs.readFileSync(PG_SCHEMA_FILE, 'utf8');
  await query(schemaSql);

  const { rows: userRows } = await query('SELECT COUNT(*)::int AS count FROM users');
  if (userRows[0].count === 0) {
    const admin = createDefaultAdmin();
    await query(
      `INSERT INTO users (id, name, phone, email, password, role, is_approved, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [admin.id, admin.name, admin.phone, admin.email, admin.password, admin.role, admin.isApproved, admin.createdAt]
    );
    console.log('Seeded default admin user into PostgreSQL');
  }

  const { rows: seatRows } = await query('SELECT COUNT(*)::int AS count FROM seats');
  if (seatRows[0].count === 0) {
    const defaultSeats = createDefaultSeats();
    for (const seat of defaultSeats) {
      await query(
        `INSERT INTO seats (id, row_label, seat_number, status, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [seat.id, seat.row, seat.number, seat.status, new Date().toISOString()]
      );
    }
    console.log('Seeded default seats into PostgreSQL');
  }
}

export async function initDB() {
  if (!usePostgres) {
    throw new Error('PostgreSQL is required. Set PG_CONNECTION_STRING in your environment.');
  }
  await initPostgres();
}

export async function getUsers() {
  if (!usePostgres) {
    throw new Error('PostgreSQL connection is required for getUsers');
  }

  const { rows } = await query('SELECT * FROM users ORDER BY created_at');
  return rows.map(mapUserRow);
}

export async function saveUsers(users) {
  if (!usePostgres) {
    throw new Error('PostgreSQL connection is required for saveUsers');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const ids = users.map((user) => user.id);
    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, name, phone, email, password, role, is_approved, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           password = EXCLUDED.password,
           role = EXCLUDED.role,
           is_approved = EXCLUDED.is_approved`,
        [
          user.id,
          user.name,
          user.phone,
          user.email || null,
          user.password,
          user.role,
          user.isApproved ?? false,
          user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString()
        ]
      );
    }

    if (ids.length > 0) {
      await client.query(
        `DELETE FROM users WHERE id NOT IN (${ids.map((_, index) => `$${index + 1}`).join(',')})`,
        ids
      );
    } else {
      await client.query('DELETE FROM users');
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving users to PostgreSQL:', error);
    return false;
  } finally {
    client.release();
  }
}

export async function getSeats() {
  if (!usePostgres) {
    throw new Error('PostgreSQL connection is required for getSeats');
  }

  const { rows: seatRows } = await query('SELECT * FROM seats ORDER BY row_label, seat_number');
  const { rows: bookingRows } = await query(
    `SELECT b.seat_id, b.shift, b.booked_at, u.id AS user_id, u.name, u.phone, u.email
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     WHERE b.status = 'active'`
  );

  const seats = seatRows.map((seatRow) => ({
    id: seatRow.id,
    row: seatRow.row_label,
    number: seatRow.seat_number,
    status: seatRow.status,
    bookedBy: { morning: null, evening: null },
    bookedAt: { morning: null, evening: null },
    bookedShifts: [],
    bookings: { morning: null, evening: null }
  }));

  const seatMap = new Map(seats.map((seat) => [seat.id, seat]));
  bookingRows.forEach((booking) => {
    const seat = seatMap.get(booking.seat_id);
    if (!seat) return;
    if (!['morning', 'evening'].includes(booking.shift)) return;

    seat.bookedShifts.push(booking.shift);
    seat.bookedBy[booking.shift] = {
      id: booking.user_id,
      name: booking.name,
      phone: booking.phone,
      email: booking.email
    };
    seat.bookedAt[booking.shift] = booking.booked_at ? booking.booked_at.toISOString() : null;
  });

  return seats;
}

export async function saveSeats(seats) {
  if (!usePostgres) {
    throw new Error('PostgreSQL connection is required for saveSeats');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = seats.map((seat) => seat.id);

    for (const seat of seats) {
      await client.query(
        `INSERT INTO seats (id, row_label, seat_number, status, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           row_label = EXCLUDED.row_label,
           seat_number = EXCLUDED.seat_number,
           status = EXCLUDED.status`,
        [
          seat.id,
          seat.row,
          seat.number,
          seat.status || 'available',
          seat.createdAt ? new Date(seat.createdAt).toISOString() : new Date().toISOString()
        ]
      );

      const shifts = ['morning', 'evening'];
      for (const shift of shifts) {
        const bookingUser = seat.bookedBy?.[shift] || null;
        const bookedAtValue = seat.bookedAt?.[shift] || null;
        const bookingId = `${seat.id}-${shift}`;

        if (seat.bookedShifts?.includes(shift) && bookingUser?.id) {
          await client.query(
            `INSERT INTO bookings (id, seat_id, user_id, shift, status, booked_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'active', $5, $6, $6)
             ON CONFLICT (id) DO UPDATE SET
               user_id = EXCLUDED.user_id,
               status = 'active',
               booked_at = EXCLUDED.booked_at,
               updated_at = EXCLUDED.updated_at`,
            [
              bookingId,
              seat.id,
              bookingUser.id,
              shift,
              bookedAtValue,
              new Date().toISOString()
            ]
          );
        } else {
          await client.query(
            `DELETE FROM bookings WHERE seat_id = $1 AND shift = $2 AND status = 'active'`,
            [seat.id, shift]
          );
        }
      }
    }

    if (ids.length > 0) {
      await client.query(
        `DELETE FROM seats WHERE id NOT IN (${ids.map((_, index) => `$${index + 1}`).join(',')})`,
        ids
      );
    } else {
      await client.query('DELETE FROM seats');
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving seats to PostgreSQL:', error);
    return false;
  } finally {
    client.release();
  }
}

export async function getChangeRequests() {
  if (!usePostgres) {
    throw new Error('PostgreSQL connection is required for getChangeRequests');
  }

  const { rows } = await query('SELECT * FROM change_requests ORDER BY requested_at DESC');
  return rows.map(mapChangeRequestRow);
}

export async function saveChangeRequests(requests) {
  if (!usePostgres) {
    throw new Error('PostgreSQL connection is required for saveChangeRequests');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = requests.map((request) => request.id);

    for (const request of requests) {
      const reviewedBy = request.reviewedBy || request.approvedBy || request.declinedBy || null;
      const reviewedAt = request.reviewedAt || request.approvedAt || request.declinedAt || null;
      await client.query(
        `INSERT INTO change_requests
         (id, user_id, user_name, from_seat_id, to_seat_id, shift, status, requested_at, reviewed_by, reviewed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           user_name = EXCLUDED.user_name,
           from_seat_id = EXCLUDED.from_seat_id,
           to_seat_id = EXCLUDED.to_seat_id,
           shift = EXCLUDED.shift,
           status = EXCLUDED.status,
           requested_at = EXCLUDED.requested_at,
           reviewed_by = EXCLUDED.reviewed_by,
           reviewed_at = EXCLUDED.reviewed_at,
           notes = EXCLUDED.notes`,
        [
          request.id,
          request.userId || null,
          request.userName,
          request.fromSeatId,
          request.toSeatId,
          request.shift,
          request.status,
          request.requestedAt ? new Date(request.requestedAt).toISOString() : new Date().toISOString(),
          reviewedBy,
          reviewedAt ? new Date(reviewedAt).toISOString() : null,
          request.notes || null
        ]
      );
    }

    if (ids.length > 0) {
      await client.query(
        `DELETE FROM change_requests WHERE id NOT IN (${ids.map((_, index) => `$${index + 1}`).join(',')})`,
        ids
      );
    } else {
      await client.query('DELETE FROM change_requests');
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving change requests to PostgreSQL:', error);
    return false;
  } finally {
    client.release();
  }
}
