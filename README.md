# Seat Booking System

This project contains a React frontend and an Express backend.
The backend now uses PostgreSQL for all production persistence.

## Backend setup

### Requirements
- Node.js 16+
- PostgreSQL database connection

### Environment variables
Create `backend/.env` with:

```
PG_CONNECTION_STRING=postgres://user:password@host:5432/database
JWT_SECRET=your_jwt_secret
PORT=5001
```

### Install and run

```bash
cd backend
npm install
npm run migrate:postgres
npm start
```

### Notes
- `backend/utils/db.js` requires `PG_CONNECTION_STRING`.
- `backend/scripts/migrateToPostgres.js` loads legacy JSON data into Postgres.
- The app uses Postgres tables:
  - `users`
  - `seats`
  - `bookings`
  - `change_requests`

### Recommended free-tier PostgreSQL providers
- Supabase
- Neon
- Railway

## Frontend setup

The frontend is unchanged. Run from `frontend`:

```bash
cd frontend
npm install
npm run dev
```

### Frontend environment variables
Create `frontend/.env` with:

```bash
VITE_API_URL=http://localhost:5001
```

This tells the app where to reach the backend API.

### Notes
- The frontend client uses `frontend/src/apiClient.js`.
- It will send API requests to `VITE_API_URL` when configured, or to the same origin otherwise.
