import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.PG_CONNECTION_STRING;
if (!connectionString) {
  console.error('Missing PG_CONNECTION_STRING environment variable.');
  process.exit(1);
}

const dataDir = path.resolve(__dirname, '../data');
const usersPath = path.join(dataDir, 'users.json');
const seatsPath = path.join(dataDir, 'seats.json');
const requestsPath = path.join(dataDir, 'changeRequests.json');

const loadJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const convertSeatBookings = (seat) => {
  const bookings = [];
  const bookedBy = seat.bookedBy || {};
  const legacyBooker = bookedBy.id && !bookedBy.morning && !bookedBy.evening;

  if (legacyBooker) {
    bookings.push({
      shift: 'morning',
      userId: bookedBy.id,
      bookedAt: seat.bookedAt ? new Date(seat.bookedAt).toISOString() : null
    });
    bookings.push({
      shift: 'evening',
      userId: bookedBy.id,
      bookedAt: seat.bookedAt ? new Date(seat.bookedAt).toISOString() : null
    });
  } else {
    ['morning', 'evening'].forEach((shift) => {
      const shiftInfo = bookedBy[shift];
      if (shiftInfo && shiftInfo.id) {
        bookings.push({
          shift,
          userId: shiftInfo.id,
          bookedAt: shiftInfo.bookedAt ? new Date(shiftInfo.bookedAt).toISOString() : null
        });
      }
    });
  }

  return bookings;
};

const run = async () => {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const users = loadJson(usersPath);
    const seats = loadJson(seatsPath);
    const requests = fs.existsSync(requestsPath)
      ? loadJson(requestsPath)
      : [];

    await client.query('BEGIN');

    const schemaSql = fs.readFileSync(path.join(__dirname, 'postgresSchema.sql'), 'utf8');
    await client.query(schemaSql);

    for (const user of users) {
      await client.query(
        `INSERT INTO users (id, name, phone, email, password, role, is_approved, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.name, user.phone, user.email || null, user.password, user.role, user.isApproved ?? false, user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString()]
      );
    }

    const activeUserShiftKeys = new Set();

    for (const seat of seats) {
      await client.query(
        `INSERT INTO seats (id, row_label, seat_number, status, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [seat.id, seat.row, seat.number, seat.status || 'available', seat.createdAt ? new Date(seat.createdAt).toISOString() : new Date().toISOString()]
      );

      const bookings = convertSeatBookings(seat);
      for (const booking of bookings) {
        const userShiftKey = `${booking.userId}-${booking.shift}`;
        if (activeUserShiftKeys.has(userShiftKey)) {
          console.warn(`Skipping duplicate active booking for user ${booking.userId} and shift ${booking.shift}`);
          continue;
        }

        const bookingId = `${seat.id}-${booking.shift}`;
        await client.query(
          `INSERT INTO bookings (id, seat_id, user_id, shift, status, booked_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'active', $5, $6, $6)
           ON CONFLICT (id) DO NOTHING`,
          [bookingId, seat.id, booking.userId, booking.shift, booking.bookedAt, booking.bookedAt || new Date().toISOString()]
        );

        activeUserShiftKeys.add(userShiftKey);
      }
    }

    for (const request of requests) {
      await client.query(
        `INSERT INTO change_requests
         (id, user_id, user_name, from_seat_id, to_seat_id, shift, status, requested_at, reviewed_by, reviewed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          request.id,
          request.userId,
          request.userName,
          request.fromSeatId,
          request.toSeatId,
          request.shift,
          request.status || 'pending',
          request.requestedAt ? new Date(request.requestedAt).toISOString() : new Date().toISOString(),
          request.reviewedBy || null,
          request.reviewedAt ? new Date(request.reviewedAt).toISOString() : null,
          request.notes || null
        ]
      );
    }

    await client.query('COMMIT');
    console.log('PostgreSQL migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run();
