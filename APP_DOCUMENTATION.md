# Seat Booking System Documentation

## Overview
This project is a seat booking system built as a two-tier app:
- `backend/`: Express.js API server using PostgreSQL for persistence
- `frontend/`: React + Vite SPA for users and admin interaction

The app implements user registration, login, seat layout viewing, seat booking and cancellation, admin approvals, and booking change request handling.

## Core Concepts

### User roles
- `admin`: can approve users, manage users, seats, rows, and change requests
- `user`: can register, login, request seat bookings, cancel own bookings, and submit seat change requests
- `guest`: can view seat availability but cannot book or modify bookings

### Booking model
- Seats are organized by rows and numbers
- Booking is shift-based: `morning`, `evening`, or `full`
- A seat may be available, partially booked, or fully booked
- Non-admin users may only hold one active booking at a time; additional booking requests create change requests for admin approval

### Change requests
- Created automatically when a logged-in user with an existing booking tries to book a different seat
- Admins can approve or decline requests
- Approval moves the booking from the original seat to the requested seat for the specified shift

## Repository structure

- `backend/`
  - `index.js`: app entry point, route registration, health check
  - `routes/authRoutes.js`: register, login, current user profile
  - `routes/userRoutes.js`: profile update, admin user CRUD, user approvals
  - `routes/seatRoutes.js`: seat listing, booking, cancellation, row/seat management, change requests
  - `middleware/auth.js`: JWT protection, admin guard, optional token parsing
  - `utils/db.js`: PostgreSQL access, data normalization, seed initialization
  - `utils/validators.js`: backend input validation for users and admins
  - `scripts/postgresSchema.sql`: database schema
  - `scripts/migrateToPostgres.js`: legacy JSON -> PostgreSQL migration tool
  - `data/`: legacy JSON sample data files

- `frontend/`
  - `src/App.jsx`: main view routing and page container
  - `src/context/AuthContext.jsx`: authentication state, login/register/logout, profile update
  - `src/apiClient.js`: API request helper with `VITE_API_URL`
  - `src/components/SeatMap.jsx`: seat layout, booking/cancel modal workflow, guest hints
  - `src/components/AdminDashboard.jsx`: admin panels for users, seats, rows, and change requests
  - `src/components/Login.jsx`: user login UI
  - `src/components/Register.jsx`: user registration UI
  - `src/components/UserProfile.jsx`: profile editing UI
  - `src/components/Navbar.jsx`: navigation
  - `src/components/Footer.jsx`: footer
  - `src/utils/validators.js`: frontend validation rules

## Setup

### Backend
1. Create `backend/.env` with:
   ```bash
   PG_CONNECTION_STRING=postgres://user:password@host:5432/database
   JWT_SECRET=your_jwt_secret
   PORT=5001
   ```
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Start the app:
   ```bash
   npm start
   ```

> The backend uses PostgreSQL and initializes schema + default data on startup.

### Frontend
1. Create `frontend/.env` with:
   ```bash
   VITE_API_URL=http://localhost:5001
   ```
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```

## Default initial data
- Default admin credentials seeded when database is empty:
  - phone: `1234567890`
  - password: `admin`
- Default seat layout includes rows `A`, `B`, `C` with 6 seats each

## Backend API Reference

### Authentication
- `POST /api/auth/register`
  - body: `{ name, phone, email, password }`
  - registers new user in pending approval state
- `POST /api/auth/login`
  - body: `{ phone, password }`
  - returns JWT token and user data if approved
- `GET /api/auth/me`
  - protected
  - returns current authenticated user

### User profile
- `PUT /api/users/profile`
  - protected
  - body: `{ name?, email?, password? }`
  - updates current user profile

### Admin user management
- `GET /api/users`
  - admin only
  - returns all users
- `POST /api/users`
  - admin only
  - create a user with optional role and approval
- `PUT /api/users/:id`
  - admin only
  - update user data and sync bookings when user details change
- `PUT /api/users/:id/approve`
  - admin only
  - approve pending user registration
- `DELETE /api/users/:id`
  - admin only
  - delete user and release any bookings

### Seat and booking management
- `GET /api/seats`
  - public; returns seat map
  - returns more detail for authenticated users
- `POST /api/seats/:id/book`
  - protected
  - body: `{ shift }`
  - books a seat or creates a change request if user already has another active booking
- `POST /api/seats/:id/cancel`
  - protected
  - body: `{ shift }`
  - cancels booking for a seat
- `GET /api/seats/change-requests`
  - admin only
  - list pending and processed requests
- `POST /api/seats/change-requests/:id/approve`
  - admin only
  - approve a change request and move booking
- `POST /api/seats/change-requests/:id/decline`
  - admin only
  - decline a request
- `POST /api/seats/row`
  - admin only
  - create a new seat row with seat count
- `PUT /api/seats/row/:rowName`
  - admin only
  - update seat count for a row
- `DELETE /api/seats/row/:rowName`
  - admin only
  - remove a row and its seats
- `PUT /api/seats/:id`
  - admin only
  - update seat status or metadata
- `DELETE /api/seats/:id`
  - admin only
  - remove a seat

## Data model summary

### users
- `id`, `name`, `phone`, `email`
- `password` hashed with bcrypt
- `role`: `admin` or `user`
- `isApproved`: controls login access

### seats
- `id`, `row_label`, `seat_number`, `status`
- status is `available` or `booked`
- seat booking details are reconstructed from `bookings`

### bookings
- `seat_id`, `user_id`, `shift`
- shift is `morning` or `evening`
- `status` is `active`, `cancelled`, or `completed`

### change_requests
- tracks requested seat changes between `from_seat_id` and `to_seat_id`
- status is `pending`, `approved`, or `declined`

## Frontend behavior

- Uses `AuthContext` to store JWT and user state
- `SeatMap` loads seat layout and displays available / booked / partial / user-owned seats
- Bookings and cancellations require login
- Guests can view layout but not modify bookings
- Admin dashboard allows user approval, seat row creation, seat management, and request processing
- API calls use `frontend/src/apiClient.js` and leverage `VITE_API_URL`

## Notes
- The backend is current designed for PostgreSQL only; `PG_CONNECTION_STRING` is required.
- The project includes a migration tool to import legacy JSON data into PostgreSQL: `backend/scripts/migrateToPostgres.js`
- Frontend validation and backend validation both exist to protect user input

## Recommended next steps
- Add tests for route authorization and booking workflows
- Harden admin APIs against invalid row updates and seat reuse
- Add a dedicated service worker strategy or progressive web app support if needed
- Add database migration tooling for schema evolution
