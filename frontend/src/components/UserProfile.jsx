import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../apiClient.js';
import { validateName, validateEmail, validatePassword, validateProfile } from '../utils/validators.js';
import { User, Mail, Phone, Key, AlertCircle, CheckCircle, Armchair, HelpCircle } from 'lucide-react';

const UserProfile = () => {
  const { user, token, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMessage, setErrMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [mySeat, setMySeat] = useState(null);

  // Sync user state
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Fetch current bookings to find if this user has booked a seat
  const fetchMyBookings = async () => {
    try {
      const res = await apiFetch('/api/seats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const seats = await res.json();
        const booked = seats.find(s => s.status === 'booked' && s.bookedBy && s.bookedBy.id === user.id);
        setMySeat(booked || null);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyBookings();
    }
  }, [user, token]);

  const handleCancelBooking = async () => {
    if (!mySeat) return;
    if (!window.confirm(`Are you sure you want to release seat ${mySeat.row}${mySeat.number}?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/seats/${mySeat.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Released seat ${mySeat.row}${mySeat.number} successfully.`);
        setMySeat(null);
      } else {
        setErrMessage(data.message || 'Failed to release seat.');
      }
    } catch (err) {
      setErrMessage('Network error. Failed to release seat.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateProfile(name, email, password);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrMessage('Please correct the highlighted fields before saving.');
      return;
    }

    setFieldErrors({});
    setErrMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await updateProfile(name.trim(), email.trim(), password);
      setSuccessMessage('Profile updated successfully!');
      setPassword('');
    } catch (err) {
      setErrMessage(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.grid}>
      {/* Edit Profile Form */}
      <div className="glass-card">
        <h2 style={styles.title} className="gradient-text">My Profile</h2>
        
        {errMessage && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{errMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="profile-phone">
              <Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Phone Number (UserID - Read Only)
            </label>
            <input
              type="text"
              id="profile-phone"
              className="form-control"
              value={user?.phone || ''}
              disabled
              style={styles.disabledInput}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-name">
              <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Full Name
            </label>
            <input
              type="text"
              id="profile-name"
              className={`form-control ${fieldErrors.name ? 'input-error' : ''}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors(prev => ({ ...prev, name: '' }));
                }
              }}
              required
              disabled={loading}
            />
            {fieldErrors.name && (
              <div className="field-error">
                <AlertCircle size={14} style={{ marginRight: '4px' }} />
                {fieldErrors.name}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="profile-email">
              <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Email Address
            </label>
            <input
              type="email"
              id="profile-email"
              className={`form-control ${fieldErrors.email ? 'input-error' : ''}`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              disabled={loading}
            />
            {fieldErrors.email && (
              <div className="field-error">
                <AlertCircle size={14} style={{ marginRight: '4px' }} />
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="profile-password">
              <Key size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              New Password (Leave blank to keep current)
            </label>
            <input
              type="password"
              id="profile-password"
              className={`form-control ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors(prev => ({ ...prev, password: '' }));
                }
              }}
              disabled={loading}
            />
            {fieldErrors.password && (
              <div className="field-error">
                <AlertCircle size={14} style={{ marginRight: '4px' }} />
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>

      {/* Active Booking Section */}
      <div className="glass-card" style={styles.bookingCard}>
        <h3 style={styles.title} className="gradient-text">My Reservation</h3>
        
        {mySeat ? (
          <div style={styles.bookingDetails}>
            <div style={styles.iconContainer}>
              <Armchair size={48} style={styles.seatIcon} />
            </div>
            <div style={styles.seatInfoText}>
              <div style={styles.seatId}>Seat {mySeat.row}{mySeat.number}</div>
              <div style={styles.bookingTime}>
                Booked on: {new Date(mySeat.bookedAt).toLocaleString()}
              </div>
            </div>
            <button 
              className="btn btn-danger"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={handleCancelBooking}
            >
              Release Seat Booking
            </button>
          </div>
        ) : (
          <div style={styles.noBooking}>
            <HelpCircle size={40} style={{ color: '#6b7280', marginBottom: '1rem' }} />
            <p style={{ color: '#9ca3af', fontWeight: '500' }}>No Active Bookings</p>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.25rem' }}>
              Head over to the Seat Map and choose a seat to book.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '2rem',
    marginTop: '1rem',
  },
  title: {
    fontSize: '1.4rem',
    marginBottom: '1.5rem',
  },
  disabledInput: {
    background: 'rgba(255, 255, 255, 0.02)',
    color: '#4b5563',
    borderColor: 'rgba(255, 255, 255, 0.03)',
    cursor: 'not-allowed',
  },
  bookingCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  bookingDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '1rem 0',
  },
  iconContainer: {
    width: '5rem',
    height: '5rem',
    borderRadius: '50%',
    background: 'rgba(167, 139, 250, 0.15)',
    border: '2px solid rgba(167, 139, 250, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    boxShadow: '0 0 20px rgba(167, 139, 250, 0.2)',
  },
  seatIcon: {
    color: '#a78bfa',
  },
  seatInfoText: {
    textAlign: 'center',
    marginBottom: '1rem',
  },
  seatId: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.8rem',
    fontWeight: '800',
    color: '#ffffff',
  },
  bookingTime: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    marginTop: '0.25rem',
  },
  noBooking: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '2rem',
    border: '2px dashed rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
  },
};

export default UserProfile;
