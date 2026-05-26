import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../apiClient.js';
import { AirVent, Armchair, AlertCircle, CheckCircle, Circle, Fan, XCircle, Info, LogIn } from 'lucide-react';

const SeatMap = ({ setCurrentView }) => {
  const { user, token } = useAuth();
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getBookingUserId = (seat, shift) => {
    return seat.bookedBy?.[shift]?.id || seat.bookedBy?.id || null;
  };

  const getSeatBookedShifts = (seat) => {
    return Array.isArray(seat.bookedShifts) ? seat.bookedShifts : [];
  };

  const getSeatClass = (seat) => {
    const bookedShifts = getSeatBookedShifts(seat);
    if (bookedShifts.length === 0) return 'available';

    const mine = user && bookedShifts.some((shift) => getBookingUserId(seat, shift) === user.id);
    if (mine) return 'mine';
    if (bookedShifts.length === 1) return 'partial';
    return 'booked';
  };

  const getSeatStatus = (seat) => {
    const bookedShifts = getSeatBookedShifts(seat);
    if (bookedShifts.includes('full') || bookedShifts.length === 2) {
      return 'Fully booked';
    }
    if (bookedShifts.length === 1) {
      return 'Partially booked';
    }
    return 'Available';
  };

  const getSeatIcon = (seatClass) => {
    // Use the Armchair icon for all seat visuals (colored by CSS state)
    return <Armchair size={18} />;
  };
  
  // Modal states
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [modalType, setModalType] = useState(''); // 'book', 'cancel-mine', 'cancel-admin'
  const [selectedShift, setSelectedShift] = useState('full');
  // Tooltip portal state
  const [tooltipSeat, setTooltipSeat] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, visible: false });

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

    const bookedShifts = getSeatBookedShifts(seat);
    const availableShifts = ['morning', 'evening'].filter((shift) => !bookedShifts.includes(shift));
    const fullyBooked = availableShifts.length === 0;
    const userOwnsSeat = user && bookedShifts.some((shift) => getBookingUserId(seat, shift) === user.id);

    if (!user) {
      setSelectedSeat(seat);
      setModalType(fullyBooked ? 'guest-booked-details' : 'guest-prompt');
      return;
    }

    if (fullyBooked) {
      if (user.role === 'admin') {
        setSelectedSeat(seat);
        setModalType('cancel-admin');
        return;
      }

      if (userOwnsSeat) {
        setSelectedSeat(seat);
        setModalType('cancel-mine');
        return;
      }

      setSelectedSeat(seat);
      setModalType('guest-booked-details');
      return;
    }

    // If the current user already has a booking on another seat, open change-request modal
    const currentUserSeat = getCurrentUserSeat();
    if (currentUserSeat && currentUserSeat.id !== seat.id && user.role !== 'admin') {
      const userBookedShifts = getSeatBookedShifts(currentUserSeat).filter((s) => getBookingUserId(currentUserSeat, s) === user.id);
      const possibleShifts = userBookedShifts.filter((s) => availableShifts.includes(s));

      // If no matching shift is available on target seat, show details instead
      if (!possibleShifts.length) {
        setSelectedSeat(seat);
        setModalType('guest-booked-details');
        return;
      }

      setSelectedSeat(seat);
      setSelectedShift(possibleShifts.length === 2 ? 'full' : possibleShifts[0]);
      setModalType('change-request');
      return;
    }

    // Open booking modal for available shift(s)
    setSelectedSeat(seat);
    if (bookedShifts.length === 0) {
      setSelectedShift(availableShifts[0] || 'morning');
    } else {
      setSelectedShift(availableShifts[0]);
    }
    setModalType('book');
  };

  const executeBook = async () => {
    if (!selectedSeat) return;
    try {
      const body = { shift: selectedShift || 'full' };
      const res = await apiFetch(`/api/seats/${selectedSeat.id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        // Wait for seats to be fetched and state to update before closing modal
        await fetchSeats();
        // Small delay to ensure UI updates
        setTimeout(() => {
          setSelectedSeat(null);
          setModalType('');
          setSelectedShift('full');
        }, 500);
      } else {
        setError(data.message || 'Failed to book seat');
      }
    } catch (err) {
      setError('Connection error. Failed to book seat.');
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
        // Wait for seats to be fetched and state to update before closing modal
        await fetchSeats();
        // Small delay to ensure UI updates
        setTimeout(() => {
          setSelectedSeat(null);
          setModalType('');
          setSelectedShift('full');
        }, 500);
      } else {
        setError(data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      setError('Connection error. Failed to release seat.');
    }
  };

  const getCurrentUserSeat = () => seats.find((s) => {
    if (!user) return false;
    return (
      (s.bookedBy?.morning?.id === user.id) ||
      (s.bookedBy?.evening?.id === user.id) ||
      (s.bookedBy?.id === user.id)
    );
  });

  const formatBookingTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return timestamp;
    }
  };

  const shiftLabel = {
    morning: 'Morning (7am - 1pm)',
    evening: 'Evening (2pm - 8pm)'
  };

  const currentUserSeat = getCurrentUserSeat();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading layout map...</div>;
  }

  return (
    <div className="glass-card">
      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem', marginBottom: '1rem' }}>
        Hover seats for details (login required). Click a seat to manage booking.
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
          <Armchair size={16} className="legend-icon legend-available" />
          <span>Available</span>
        </div>
        <div className="legend-item">
          <Armchair size={16} className="legend-icon legend-partial" />
          <span>Partially Booked</span>
        </div>
        <div className="legend-item">
          <Armchair size={16} className="legend-icon legend-booked" />
          <span>Fully Booked</span>
        </div>
        <div className="legend-item">
          <XCircle size={16} className="legend-icon legend-booked" />
          <span>Fully Booked</span>
        </div>
        {user && (
          <div className="legend-item">
            <CheckCircle size={16} className="legend-icon legend-mine" />
            <span>Mine</span>
          </div>
        )}
      </div>

      {/* Grid Container */}
      <div className="seat-map-container">
        
        <div className="screen-indicator"></div>
          
        <div className="seat-grid-wrapper">
         
        <div className="seat-grid-horizontal">
          {Object.keys(seatsByRow).length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
              No rows defined yet. Admin can generate rows in the Admin Dashboard.
            </div>
          ) : (
            Object.keys(seatsByRow).sort().map(rowName => (
              <div className="seat-column" key={rowName}>
                <div className="row-label">{rowName}</div>
                <div className="seat-column-scroll">
                  {seatsByRow[rowName].map(seat => {
                    const seatClass = getSeatClass(seat);
                    const isMine = seatClass === 'mine';
                    const anyBooked = seat.bookedShifts && seat.bookedShifts.length > 0;
                    const onEnter = (e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const top = rect.top + window.scrollY - 12; // a little above
                      const left = rect.left + window.scrollX + rect.width / 2;
                      setTooltipSeat(seat);
                      setTooltipPos({ top, left, visible: true });
                    };

                    const onLeave = () => {
                      setTooltipPos({ top: 0, left: 0, visible: false });
                      setTooltipSeat(null);
                    };

                    return (
                      <div 
                        key={seat.id}
                        className={`seat-item ${seatClass}`}
                        onClick={() => handleSeatClick(seat)}
                        onMouseEnter={onEnter}
                        onMouseLeave={onLeave}
                      >
                        <div className="seat-icon-wrapper">
                          {getSeatIcon(seatClass)}
                        </div>
                        <span className="seat-number">{seat.number}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {selectedSeat && modalType && (
        <div className="modal-overlay" onClick={() => { setSelectedSeat(null); setModalType(''); setSelectedShift('full'); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Seat {selectedSeat.row}{selectedSeat.number}</h3>
              <button className="modal-close" onClick={() => { setSelectedSeat(null); setModalType(''); setSelectedShift('full'); }}>&times;</button>
            </div>

            {modalType === 'guest-prompt' && (
              <div>
                <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                  You must be logged in to book seats.
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
                    onClick={() => { setSelectedSeat(null); setModalType(''); setSelectedShift('full'); }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {modalType === 'guest-booked-details' && (
              <div>
                <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                  This seat is currently reserved. Login to see booking details and manage your reservation.
                </p>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <div className="tooltip-row">
                    <span>Status:</span>
                    <span className="tooltip-val">{getSeatStatus(selectedSeat)}</span>
                  </div>
                  <div className="tooltip-row" style={{ marginTop: '0.5rem' }}>
                    <span>Morning:</span>
                    <span className="tooltip-val">{(selectedSeat.bookedShifts || []).includes('morning') ? 'Booked' : 'Available'}</span>
                  </div>
                  <div className="tooltip-row">
                    <span>Evening:</span>
                    <span className="tooltip-val">{(selectedSeat.bookedShifts || []).includes('evening') ? 'Booked' : 'Available'}</span>
                  </div>
                </div>
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
                    Login to Manage
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedSeat(null); setModalType(''); setSelectedShift('full'); }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}


            {modalType === 'change-request' && (
              <div>
                <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                  You already have an active booking. Sending this request will ask admin to move your reservation to seat <strong>{selectedSeat.row}{selectedSeat.number}</strong>.
                </p>

                {currentUserSeat ? (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem' }}>Your current booking</div>
                    <div className="tooltip-row">
                      <span>Seat:</span>
                      <span className="tooltip-val">{currentUserSeat.row}{currentUserSeat.number}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>Shift(s):</span>
                      <span className="tooltip-val">{(currentUserSeat.bookedShifts || []).filter(s => currentUserSeat.bookedBy?.[s]?.id === user?.id).join(', ') || 'Unknown'}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>Booked at:</span>
                      <span className="tooltip-val">{(() => {
                        const shifts = (currentUserSeat.bookedShifts || []).filter(s => currentUserSeat.bookedBy?.[s]?.id === user?.id);
                        if (!shifts.length) return '';
                        // show earliest booking time among selected shifts
                        const times = shifts.map(s => currentUserSeat.bookedAt?.[s]).filter(Boolean);
                        return times.length ? formatBookingTime(times[0]) : '';
                      })()}</span>
                    </div>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', color: '#9ca3af', minWidth: '80px' }}>Select Shift:</label>
                  <select className="form-control custom-select" value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}>
                    {(['morning', 'evening'].filter((shift) => !selectedSeat?.bookedShifts?.includes(shift))).map((shift) => (
                      <option key={shift} value={shift}>{shift === 'morning' ? 'Morning (7am-1pm)' : 'Evening (2pm-8pm)'}</option>
                    ))}
                    {/* If user holds both shifts and both are available, allow full-day request */}
                    {(() => {
                      const userShifts = (currentUserSeat?.bookedShifts || []).filter(s => currentUserSeat?.bookedBy?.[s]?.id === user?.id);
                      const available = (['morning','evening'].every(s => !selectedSeat?.bookedShifts?.includes(s)));
                      if (userShifts.length === 2 && available) {
                        return <option value="full">Full Day (move both)</option>;
                      }
                      return null;
                    })()}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { executeBook(); setSelectedShift('full'); }}>
                    Request Change
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedSeat(null); setModalType(''); setSelectedShift('full'); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}



            {modalType === 'book' && (
              <div>
                <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                  Book seat <strong>{selectedSeat.row}{selectedSeat.number}</strong>
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', color: '#9ca3af', minWidth: '80px' }}>Select Shift:</label>
                  <select className="form-control custom-select" value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}>
                    {(!selectedSeat?.bookedShifts || selectedSeat.bookedShifts.length === 0) && (
                      <option value="full">Full Day (7am-9pm)</option>
                    )}
                    {['morning', 'evening']
                      .filter((shift) => !selectedSeat?.bookedShifts?.includes(shift))
                      .map((shift) => (
                        <option key={shift} value={shift}>{shift === 'morning' ? 'Morning(7am-1pm)' : 'Evening(2pm-8pm)'}</option>
                      ))}
                  </select>
                </div>
                {user && user.role !== 'admin' && (
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', padding: '0.5rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: '#fbbf24', marginBottom: '1.5rem' }}>
                    <Info size={14} style={{ flexShrink: 0 }} />
                    <span>Each user is limited to 1 active seat reservation.</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { executeBook(); setSelectedShift('full'); }}>
                    Book Now
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={() => { setSelectedSeat(null); setModalType(''); setSelectedShift('full'); }}
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
                    onClick={() => { setSelectedSeat(null); setModalType(''); setSelectedShift('full'); }}
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
                  {selectedSeat.bookedBy?.morning ? (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{selectedSeat.bookedBy.morning.name} (Morning)</div>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Phone: {selectedSeat.bookedBy.morning.phone}</div>
                      {selectedSeat.bookedBy.morning.email && <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Email: {selectedSeat.bookedBy.morning.email}</div>}
                    </div>
                  ) : null}

                  {selectedSeat.bookedBy?.evening ? (
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{selectedSeat.bookedBy.evening.name} (Evening)</div>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Phone: {selectedSeat.bookedBy.evening.phone}</div>
                      {selectedSeat.bookedBy.evening.email && <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Email: {selectedSeat.bookedBy.evening.email}</div>}
                    </div>
                  ): null}
                  {!selectedSeat.bookedBy?.morning && !selectedSeat.bookedBy?.evening && (
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>No bookings on this seat.</div>
                  )}
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
                    onClick={() => { setSelectedSeat(null); setModalType(''); setSelectedShift('full'); }}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tooltip Portal */}
      {tooltipPos.visible && tooltipSeat && typeof document !== 'undefined' && createPortal(
        <div className="seat-tooltip" style={{ position: 'absolute', top: tooltipPos.top + 'px', left: tooltipPos.left + 'px', transform: 'translate(-50%, -120%)', pointerEvents: 'none', zIndex: 9999 }}>
          <div className="tooltip-title">Seat {tooltipSeat.row}{tooltipSeat.number}</div>
          <div className="tooltip-row">
            <span>Status:</span>
            <span className="tooltip-val" style={{ color: getSeatStatus(tooltipSeat) === 'Available' ? '#34d399' : '#f87171' }}>
              {getSeatStatus(tooltipSeat)}
            </span>
          </div>
          {['morning', 'evening'].map((shift) => {
            const isBooked = (tooltipSeat.bookedShifts || []).includes(shift) || (tooltipSeat.bookedShifts || []).includes('full');
            const booking = tooltipSeat.bookedBy?.[shift];
            const bookedAt = tooltipSeat.bookedAt?.[shift];
            return (
              <div key={shift} style={{ marginTop: shift === 'morning' ? '0.6rem' : '0.35rem' }}>
                <div className="tooltip-row" style={{ fontWeight: 600, color: '#f8fafc' }}>
                  <span>{shiftLabel[shift]}:</span>
                  <span className="tooltip-val" style={{ color: isBooked ? '#f87171' : '#34d399' }}>
                    {isBooked ? 'Booked' : 'Available'}
                  </span>
                </div>
                {user && isBooked ? (
                  <>
                    <div className="tooltip-row" style={{ marginTop: '0.15rem' }}>
                      <span>{booking?.id === user?.id ? 'User' : 'Name'}:</span>
                      <span className="tooltip-val">{booking?.id === user?.id ? 'You' : booking?.name || 'Reserved'}</span>
                    </div>
                    <div className="tooltip-row" style={{ marginTop: '0.15rem' }}>
                      <span>Booked at:</span>
                      <span className="tooltip-val">{bookedAt ? formatBookingTime(bookedAt) : 'Unknown'}</span>
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default SeatMap;
