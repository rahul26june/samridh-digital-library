import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../apiClient.js';
import { Armchair, AlertCircle, CheckCircle, Info, LogIn } from 'lucide-react';

const SeatMap = ({ setCurrentView }) => {
  const { user, token } = useAuth();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [modalType, setModalType] = useState(''); // 'book', 'cancel-mine', 'cancel-admin'

  // Fetch seats data
  const fetchSeats = async () => {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await apiFetch('/api/seats', { headers });
      if (res.ok) {
        const data = await res.json();
        setSeats(data);
      } else {
        setError('Failed to load seats layout.');
      }
    } catch (err) {
      setError('Network error. Unable to fetch seat map.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats();
    // Poll every 10 seconds for real-time status updates
    const interval = setInterval(fetchSeats, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {});

  // Sort seats in each row by number
  Object.keys(seatsByRow).forEach(row => {
    seatsByRow[row].sort((a, b) => a.number - b.number);
  });

  const handleSeatClick = (seat) => {
    setError('');
    setSuccess('');

    // 1. Guest flow
    if (!user) {
      setModalType('guest-prompt');
      setSelectedSeat(seat);
      return;
    }

    // 2. Available seat -> Book
    if (seat.status === 'available') {
      setSelectedSeat(seat);
      setModalType('book');
      return;
    }

    // 3. Booked seat -> Cancel (depends on owner / admin status)
    if (seat.status === 'booked') {
      if (seat.bookedBy && seat.bookedBy.id === user.id) {
        // Mine
        setSelectedSeat(seat);
        setModalType('cancel-mine');
      } else if (user.role === 'admin') {
        // Admin cancels user's booking
        setSelectedSeat(seat);
        setModalType('cancel-admin');
      }
    }
  };

  const executeBook = async () => {
    if (!selectedSeat) return;
    try {
      const res = await apiFetch(`/api/seats/${selectedSeat.id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        fetchSeats();
      } else {
        setError(data.message || 'Failed to book seat');
      }
    } catch (err) {
      setError('Connection error. Failed to book seat.');
    } finally {
      setSelectedSeat(null);
      setModalType('');
    }
  };

  const executeCancel = async () => {
    if (!selectedSeat) return;
    try {
      const res = await apiFetch(`/api/seats/${selectedSeat.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        fetchSeats();
      } else {
        setError(data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      setError('Connection error. Failed to release seat.');
    } finally {
      setSelectedSeat(null);
      setModalType('');
    }
  };

  const getSeatClass = (seat) => {
    if (seat.status === 'available') return 'available';
    if (user && seat.bookedBy && seat.bookedBy.id === user.id) return 'mine';
    return 'booked';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading layout map...</div>;
  }

  return (
    <div className="glass-card">
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }} className="gradient-text">Interactive Layout Map</h2>
      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Hover over seats to view booking details (requires login). Click any seat to manage booking.
      </p>

      {error && (
        <div className="alert alert-danger" style={{ maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Legend */}
      <div className="legend-container">
        <div className="legend-item">
          <div className="legend-color legend-available"></div>
          <span>Available</span>
        </div>
        <div className="legend-item">
          <div className="legend-color legend-booked"></div>
          <span>Booked</span>
        </div>
        {user && (
          <div className="legend-item">
            <div className="legend-color legend-mine"></div>
            <span>My Reservation</span>
          </div>
        )}
      </div>

      {/* Grid Container */}
      <div className="seat-map-container">
        <div className="screen-indicator"></div>

        <div className="seat-grid">
          {Object.keys(seatsByRow).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
              No rows defined yet. Admin can generate rows in the Admin Dashboard.
            </div>
          ) : (
            Object.keys(seatsByRow).sort().map(rowName => (
              <div className="seat-row" key={rowName}>
                <div className="row-label">{rowName}</div>
                {seatsByRow[rowName].map(seat => {
                  const seatClass = getSeatClass(seat);
                  const isMine = seatClass === 'mine';
                  return (
                    <div 
                      key={seat.id}
                      className={`seat-item ${seatClass}`}
                      onClick={() => handleSeatClick(seat)}
                    >
                      <div className="seat-icon-wrapper">
                        <Armchair size={22} fill={seat.status === 'booked' ? 'currentColor' : 'none'} />
                      </div>
                      <span className="seat-number">{seat.number}</span>

                      {/* Seat details Hover Tooltip */}
                      <div className="seat-tooltip">
                        <div className="tooltip-title">Seat {seat.row}{seat.number}</div>
                        <div className="tooltip-row">
                          <span>Status:</span>
                          <span 
                            className="tooltip-val"
                            style={{ color: seat.status === 'available' ? '#34d399' : '#f87171' }}
                          >
                            {seat.status === 'available' ? 'Available' : 'Booked'}
                          </span>
                        </div>
                        {seat.status === 'booked' && (
                          <>
                            {seat.bookedBy ? (
                              <>
                                <div className="tooltip-row" style={{ marginTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.4rem' }}>
                                  <span>User:</span>
                                  <span className="tooltip-val">{isMine ? 'You' : seat.bookedBy.name}</span>
                                </div>
                                <div className="tooltip-row">
                                  <span>Phone:</span>
                                  <span className="tooltip-val">{seat.bookedBy.phone}</span>
                                </div>
                              </>
                            ) : (
                              <div className="tooltip-row" style={{ marginTop: '0.4rem', color: '#6b7280', fontStyle: 'italic', fontSize: '0.7rem' }}>
                                Login to see occupant
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Modals */}
      {selectedSeat && modalType && (
        <div className="modal-overlay" onClick={() => { setSelectedSeat(null); setModalType(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Seat {selectedSeat.row}{selectedSeat.number}</h3>
              <button className="modal-close" onClick={() => { setSelectedSeat(null); setModalType(''); }}>&times;</button>
            </div>

            {modalType === 'guest-prompt' && (
              <div>
                <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                  You must be logged in to book seats or view occupant details.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setSelectedSeat(null);
                      setModalType('');
                      setCurrentView('login');
                    }}
                  >
                    <LogIn size={16} />
                    Go to Login
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedSeat(null); setModalType(''); }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {modalType === 'book' && (
              <div>
                <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                  Would you like to book seat <strong>{selectedSeat.row}{selectedSeat.number}</strong>?
                </p>
                {user && user.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', padding: '0.5rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#fbbf24', marginBottom: '1.5rem' }}>
                    <Info size={14} style={{ flexShrink: 0 }} />
                    <span>Each user is limited to 1 active seat reservation.</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={executeBook}>
                    Book Now
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedSeat(null); setModalType(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {modalType === 'cancel-mine' && (
              <div>
                <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                  You currently hold the booking for seat <strong>{selectedSeat.row}{selectedSeat.number}</strong>. Would you like to release it?
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={executeCancel}>
                    Release Reservation
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedSeat(null); setModalType(''); }}
                  >
                    Keep Booking
                  </button>
                </div>
              </div>
            )}

            {modalType === 'cancel-admin' && (
              <div>
                <p style={{ color: '#9ca3af', marginBottom: '0.5rem' }}>
                  This seat is booked by:
                </p>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{selectedSeat.bookedBy?.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.2rem' }}>Phone: {selectedSeat.bookedBy?.phone}</div>
                  {selectedSeat.bookedBy?.email && <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Email: {selectedSeat.bookedBy?.email}</div>}
                </div>
                <p style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem', fontWeight: '500' }}>
                  As Administrator, you have privileges to cancel this user's booking.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={executeCancel}>
                    Cancel User's Booking
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedSeat(null); setModalType(''); }}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatMap;
