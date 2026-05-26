-- PostgreSQL schema for seat booking app

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  email text,
  password text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seats (
  id text PRIMARY KEY,
  row_label text NOT NULL,
  seat_number integer NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'booked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (row_label, seat_number)
);

CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  seat_id text NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift text NOT NULL CHECK (shift IN ('morning', 'evening')),
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'completed')),
  booked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_seat_shift
  ON bookings (seat_id, shift)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_user_shift
  ON bookings (user_id, shift)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS change_requests (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  from_seat_id text NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  to_seat_id text NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  shift text NOT NULL CHECK (shift IN ('morning', 'evening', 'full')),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'declined')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by text REFERENCES users(id),
  reviewed_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_change_requests_status
  ON change_requests (status);

CREATE INDEX IF NOT EXISTS idx_change_requests_user_id
  ON change_requests (user_id);
