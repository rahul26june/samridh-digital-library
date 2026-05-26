import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../apiClient.js';
import { validateRowForm, validateUserForm } from '../utils/validators.js';
import { UserCheck, Users, Armchair, Trash2, Edit, Check, X, AlertCircle, Plus } from 'lucide-react';

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('approvals');
  const [users, setUsers] = useState([]);
  const [seats, setSeats] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for seat config
  const [rowLetter, setRowLetter] = useState('');
  const [seatsCount, setSeatsCount] = useState('');
  const [rowErrors, setRowErrors] = useState({});

  // Edit row state
  const [editingRow, setEditingRow] = useState(null);
  const [editRowSeatsCount, setEditRowSeatsCount] = useState('');
  const [editRowErrors, setEditRowErrors] = useState({});

  // Edit seat state
  const [editingSeat, setEditingSeat] = useState(null);
  const [editSeatStatus, setEditSeatStatus] = useState('available');
  const [viewingRowSeats, setViewingRowSeats] = useState(null);

  // Form states for adding/editing users
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null if adding
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formApproved, setFormApproved] = useState(true);
  // Assign seat modal state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUser, setAssignUser] = useState(null);
  const [assignSeatId, setAssignSeatId] = useState('');
  const [assignShift, setAssignShift] = useState('full');

  // Fetch admin stats and data
  const fetchData = async () => {
    try {
      // 1. Fetch Users
      const usersRes = await apiFetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      // 2. Fetch Seats
      const seatsRes = await apiFetch('/api/seats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (seatsRes.ok) {
        const seatsData = await seatsRes.json();
        setSeats(seatsData);
      }
      // 3. Fetch change requests (admin)
      if (user && user.role === 'admin') {
        const crRes = await apiFetch('/api/seats/change-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (crRes.ok) {
          const crData = await crRes.json();
          setChangeRequests(crData);
        }
      }
    } catch (err) {
      setError('Failed to fetch dashboard data.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);


  // Actions
  const handleApprove = async (userId) => {
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/api/users/${userId}/approve`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('User approved successfully.');
        fetchData();
      } else {
        setError(data.message || 'Approval failed.');
      }
    } catch (err) {
      setError('Connection error. Approval failed.');
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"? This will release all their seat bookings.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'User deleted.');
        fetchData();
      } else {
        setError(data.message || 'Deletion failed.');
      }
    } catch (err) {
      setError('Connection error. Deletion failed.');
    }
  };

  const handleAddRow = async (e) => {
    e.preventDefault();
    const validation = validateRowForm(rowLetter, seatsCount);
    if (!validation.valid) {
      setRowErrors(validation.errors);
      setError('Please fix the row form errors.');
      return;
    }

    setRowErrors({});
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch('/api/seats/row', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ row: validation.clean.rowLetter, seatsCount: validation.clean.seatsCount })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setRowLetter('');
        setSeatsCount('');
        fetchData();
      } else {
        setError(data.message || 'Failed to create row.');
      }
    } catch (err) {
      setError('Connection error. Row creation failed.');
    }
  };

  const handleDeleteRow = async (rowName) => {
    if (!window.confirm(`Are you sure you want to delete Row "${rowName}" and all its seats? Current bookings for Row "${rowName}" will be lost.`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch(`/api/seats/row/${rowName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        fetchData();
      } else {
        setError(data.message || 'Failed to delete row.');
      }
    } catch (err) {
      setError('Connection error. Row deletion failed.');
    }
  };

  const openEditRowForm = (rowName) => {
    const rowSeats = seats.filter(s => s.row === rowName);
    setEditingRow(rowName);
    setEditRowSeatsCount(rowSeats.length.toString());
    setEditRowErrors({});
    setError('');
    setSuccess('');
  };

  const handleEditRow = async (e) => {
    e.preventDefault();
    const validation = validateRowForm(editingRow, editRowSeatsCount);
    if (!validation.valid) {
      setEditRowErrors(validation.errors);
      setError('Please fix the row form errors.');
      return;
    }

    setEditRowErrors({});
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch(`/api/seats/row/${editingRow}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ seatsCount: validation.clean.seatsCount })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setEditingRow(null);
        setEditRowSeatsCount('');
        fetchData();
      } else {
        setError(data.message || 'Failed to update row.');
      }
    } catch (err) {
      setError('Connection error. Row update failed.');
    }
  };

  const openViewRowSeats = (rowName) => {
    setViewingRowSeats(rowName);
    setError('');
    setSuccess('');
  };

  const closeViewRowSeats = () => {
    setViewingRowSeats(null);
    setEditingSeat(null);
  };

  const openEditSeatForm = (seat) => {
    setEditingSeat(seat);
    setEditSeatStatus(seat.status);
    setError('');
    setSuccess('');
  };

  const handleEditSeat = async () => {
    if (!editingSeat) return;

    setError('');
    setSuccess('');

    try {
      const res = await apiFetch(`/api/seats/${editingSeat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: editSeatStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        setEditingSeat(null);
        fetchData();
        openViewRowSeats(editingSeat.row);
      } else {
        setError(data.message || 'Failed to update seat.');
      }
    } catch (err) {
      setError('Connection error. Seat update failed.');
    }
  };

  const handleSeatStatusChange = async (seat, newStatus) => {
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch(`/api/seats/${seat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        fetchData();
      } else {
        setError(data.message || 'Failed to update seat.');
      }
    } catch (err) {
      setError('Connection error. Seat update failed.');
    }
  };

  const handleDeleteSeat = async (seatId, seatName) => {
    if (!window.confirm(`Are you sure you want to delete seat ${seatName}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await apiFetch(`/api/seats/${seatId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        fetchData();
        const row = seats.find(s => s.id === seatId)?.row;
        if (row) {
          openViewRowSeats(row);
        }
      } else {
        setError(data.message || 'Failed to delete seat.');
      }
    } catch (err) {
      setError('Connection error. Seat deletion failed.');
    }
  };

  // Open form for adding a new user
  const openAddForm = () => {
    setEditingUser(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('user');
    setFormApproved(true);
    setFormErrors({});
    setError('');
    setSuccess('');
    setUserFormOpen(true);
  };

  // Open form for editing an existing user
  const openEditForm = (user) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormPhone(user.phone);
    setFormEmail(user.email || '');
    setFormPassword(''); // blank unless updating password
    setFormRole(user.role);
    setFormApproved(user.isApproved);
    setFormErrors({});
    setError('');
    setSuccess('');
    setUserFormOpen(true);
  };

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validation = validateUserForm(formName, formPhone, formEmail, formPassword, !editingUser);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      setError('Please fix the highlighted fields before submitting.');
      return;
    }

    setFormErrors({});

    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    const payload = {
      name: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      role: formRole,
      isApproved: formApproved
    };

    if (formPassword) {
      payload.password = formPassword;
    }

    try {
      const res = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(editingUser ? 'User updated successfully.' : 'User created successfully.');
        setUserFormOpen(false);
        fetchData();
      } else {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        setError(data.message || 'Operation failed.');
      }
    } catch (err) {
      setError('Connection error. Form submission failed.');
    }
  };

  // Derived states
  const pendingUsers = users.filter(u => !u.isApproved);
  // Map userId -> array of bookings like { seatId, seatLabel, shift }
  const userBookings = seats.reduce((acc, seat) => {
    if (!seat.bookedBy) return acc;

    const addBooking = (uid, shiftLabel) => {
      acc[uid] = acc[uid] || [];
      acc[uid].push({ seatId: seat.id, seatLabel: `${seat.row}${seat.number}`, shift: shiftLabel });
    };

    // Shift-aware structure
    if (seat.bookedBy.morning || seat.bookedBy.evening) {
      if (seat.bookedBy.morning && seat.bookedBy.morning.id) {
        addBooking(seat.bookedBy.morning.id, 'Morning');
      }
      if (seat.bookedBy.evening && seat.bookedBy.evening.id) {
        addBooking(seat.bookedBy.evening.id, 'Evening');
      }
      return acc;
    }

    // Legacy full-day bookedBy structure
    if (seat.bookedBy.id) {
      addBooking(seat.bookedBy.id, 'Full Day');
    }

    return acc;
  }, {});
  
  // Group rows for Seat config overview
  const uniqueRows = [...new Set(seats.map(s => s.row))].sort();
  const seatsCountByRow = seats.reduce((acc, seat) => {
    acc[seat.row] = (acc[seat.row] || 0) + 1;
    return acc;
  }, {});
  const bookedSeatsCountByRow = seats.reduce((acc, seat) => {
    if (seat.status === 'booked') {
      acc[seat.row] = (acc[seat.row] || 0) + 1;
    }
    return acc; 
  }, {});

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem' }} className="gradient-text">Administrator Control Panel</h2>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('approvals')}
        >
          Pending Approvals ({pendingUsers.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Manage Users ({users.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'editSeats' ? 'active' : ''}`}
          onClick={() => setActiveTab('editSeats')}
        >
          Edit Seats ({seats.length} Total)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'seats' ? 'active' : ''}`}
          onClick={() => setActiveTab('seats')}
        >
          Configure Seats ({uniqueRows.length} Rows)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'changeRequests' ? 'active' : ''}`}
          onClick={() => setActiveTab('changeRequests')}
        >
          Change Requests ({changeRequests.length})
        </button>
      </div>

      {/* Tab Panels */}
      
      {/* 1. Pending Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>User Registration Approvals</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            The following users signed up themselves and are waiting for approval before they can log in.
          </p>

          {pendingUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '12px', color: '#6b7280' }}>
              <UserCheck size={36} style={{ marginBottom: '0.5rem' }} />
              <p>No pending approvals at this time.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone (UserID)</th>
                    <th>Email</th>
                    <th>Registered At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.phone}</td>
                      <td>{user.email || <span style={{ color: '#6b7280' }}>N/A</span>}</td>
                      <td>{new Date(user.createdAt).toLocaleString()}</td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApprove(user.id)}
                        >
                          <Check size={14} />
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. Manage Users Tab */}
      {activeTab === 'users' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem' }}>All Registered Accounts</h3>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>View, add, edit details or delete system users.</p>
            </div>
            {user && user.role === 'admin' && (
              <button className="btn btn-primary btn-sm" onClick={openAddForm}>
                <Plus size={16} />
                Add User
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone (UserID)</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Booked</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.phone}</td>
                    <td>{u.email || <span style={{ color: '#6b7280' }}>N/A</span>}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {userBookings[u.id] && userBookings[u.id].length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          {userBookings[u.id].map(b => (
                            <div key={`${u.id}_${b.seatId}`} style={{ fontSize: '0.85rem' }}>{b.seatLabel} • {b.shift}</div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280' }}>None</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.isApproved ? 'badge-approved' : 'badge-pending'}`}>
                        {u.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                      <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {u.role !== 'admin' && (
                          <button className="btn btn-primary btn-sm" onClick={() => { setAssignUser(u); setAssignOpen(true); setAssignSeatId(''); setAssignShift('full'); }} style={{ padding: '0.25rem 0.5rem' }}>
                            Assign
                          </button>
                        )}
                        {/* Quick cancel buttons per user's bookings */}
                        {userBookings[u.id] && userBookings[u.id].length > 0 && (
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {userBookings[u.id].map(b => (
                              <div key={`${b.seatId}_${b.shift}`} style={{ display: 'flex', gap: '0.25rem' }}>
                                <button className="btn btn-warning btn-sm" title={`Cancel ${b.shift} on ${b.seatId}`} onClick={async () => {
                                  if (!window.confirm(`Cancel ${b.shift} booking for ${u.name} (${b.seatId})?`)) return;
                                  setError(''); setSuccess('');
                                  try {
                                    const res = await apiFetch(`/api/seats/${b.seatId}/cancel`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                      body: JSON.stringify({ shift: b.shift.toLowerCase() === 'full day' ? 'full' : b.shift.toLowerCase() })
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                      setSuccess(data.message || 'Booking cancelled');
                                      fetchData();
                                    } else {
                                      setError(data.message || 'Cancel failed');
                                    }
                                  } catch (err) { setError('Connection error.'); }
                                }} style={{ padding: '0.2rem 0.4rem' }}>{b.shift}</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {user && user.role === 'admin' && (
                          <>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => openEditForm(u)}
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => handleDeleteUser(u.id, u.name)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Assign Seat Modal */}
          {assignOpen && assignUser && (
            <div className="modal-overlay" onClick={() => setAssignOpen(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 className="modal-title">Assign Seat to {assignUser.name}</h3>
                  <button className="modal-close" onClick={() => setAssignOpen(false)}>&times;</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Select Seat</label>
                    <select value={assignSeatId} onChange={(e) => setAssignSeatId(e.target.value)} className="form-control">
                      <option value="">-- choose seat --</option>
                      {seats.map(s => (
                        <option key={s.id} value={s.id}>{s.row}{s.number} {s.bookedShifts && s.bookedShifts.length>0 ? `(${s.bookedShifts.join(',')})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Shift</label>
                    <select value={assignShift} onChange={(e) => setAssignShift(e.target.value)} className="form-control">
                      <option value="full">Full Day (morning+evening)</option>
                      <option value="morning">Morning (7am-1pm)</option>
                      <option value="evening">Evening (2pm-8pm)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={async () => {
                      if (!assignSeatId) { setError('Please select a seat'); return; }
                      setError(''); setSuccess('');
                      try {
                        const res = await apiFetch(`/api/seats/${assignSeatId}/assign`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                          body: JSON.stringify({ userId: assignUser.id, shift: assignShift })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setSuccess(data.message || 'Assigned successfully');
                          setAssignOpen(false);
                          fetchData();
                        } else {
                          setError(data.message || 'Assign failed');
                        }
                      } catch (err) { setError('Connection error.'); }
                    }}>Assign Seat</button>
                    <button className="btn btn-secondary" onClick={() => setAssignOpen(false)}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Edit Seats Tab (Admin Only) */}
      {activeTab === 'editSeats' && user && user.role === 'admin' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Edit Individual Seat Configurations</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Change the status of individual seats. Only admins can perform these operations.
          </p>

          {uniqueRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '12px', color: '#6b7280' }}>
              <Armchair size={36} style={{ marginBottom: '0.5rem' }} />
              <p>No seats defined yet. Create rows first in the "Configure Seats" tab.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {uniqueRows.map(row => {
                const rowSeats = seats.filter(s => s.row === row).sort((a, b) => a.number - b.number);
                const totalInRow = rowSeats.length;
                const bookedInRow = rowSeats.filter(s => s.status === 'booked').length;

                return (
                  <div key={row} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Row {row}</h4>
                        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                          {bookedInRow} / {totalInRow} booked • {totalInRow - bookedInRow} available
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                      {rowSeats.map(seat => (
                        <div 
                          key={seat.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.8rem',
                            background: seat.status === 'available' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${seat.status === 'available' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: '8px'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{seat.row}{seat.number}</div>
                          
                          <div>
                            <select
                              className="form-control"
                              value={seat.status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                if (newStatus !== seat.status) {
                                  setEditingSeat(seat);
                                  setEditSeatStatus(newStatus);
                                  // Directly handle the edit with the new status
                                  handleSeatStatusChange(seat, newStatus);
                                }
                              }}
                              style={{ padding: '0.4rem', fontSize: '0.8rem' }}
                            >
                              <option value="available">Available</option>
                              <option value="booked">Booked</option>
                            </select>
                          </div>

                          {seat.status === 'booked' && seat.bookedBy && (
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textAlign: 'center', width: '100%' }}>
                              <div>{seat.bookedBy.name}</div>
                              <div>{seat.bookedBy.phone}</div>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                            <button 
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', flex: 1 }}
                              onClick={() => handleDeleteSeat(seat.id, `${seat.row}${seat.number}`)}
                              title={`Delete ${seat.row}${seat.number}`}
                            >
                              <Trash2 size={12} style={{ marginRight: '0.2rem' }} />
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3b. Edit Seats Tab - Non-Admin Access Denied */}
      {activeTab === 'editSeats' && (!user || user.role !== 'admin') && (
        <div className="glass-card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={48} style={{ marginBottom: '1rem', color: '#ef4444' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Admin Access Required</h3>
            <p style={{ color: '#9ca3af' }}>Only administrators can edit seat configurations. Please log in with an admin account.</p>
          </div>
        </div>
      )}

      {/* 4. Configure Seats Tab */}
      {activeTab === 'seats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Add Row Form */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Generate New Seat Row</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Add a completely new horizontal row of seats. Choose a unique single character (e.g. A-Z) and count.
            </p>
            <form onSubmit={handleAddRow}>
              <div className="form-group">
                <label className="form-label" htmlFor="row-letter">Row Letter / Identifier</label>
                <input 
                  type="text" 
                  id="row-letter" 
                  className={`form-control ${rowErrors.rowLetter ? 'input-error' : ''}`}
                  placeholder="e.g. D"
                  maxLength="2"
                  value={rowLetter}
                  onChange={(e) => {
                    setRowLetter(e.target.value.toUpperCase());
                    if (rowErrors.rowLetter) {
                      setRowErrors(prev => ({ ...prev, rowLetter: '' }));
                    }
                  }}
                  required
                />
                {rowErrors.rowLetter && (
                  <div className="field-error">
                    <AlertCircle size={14} style={{ marginRight: '4px' }} />
                    {rowErrors.rowLetter}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="seats-count">Number of Seats in Row</label>
                <input 
                  type="number" 
                  id="seats-count" 
                  className={`form-control ${rowErrors.seatsCount ? 'input-error' : ''}`}
                  placeholder="e.g. 10"
                  min="1"
                  max="30"
                  value={seatsCount}
                  onChange={(e) => {
                    setSeatsCount(e.target.value);
                    if (rowErrors.seatsCount) {
                      setRowErrors(prev => ({ ...prev, seatsCount: '' }));
                    }
                  }}
                  required
                />
                {rowErrors.seatsCount && (
                  <div className="field-error">
                    <AlertCircle size={14} style={{ marginRight: '4px' }} />
                    {rowErrors.seatsCount}
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Armchair size={16} />
                Generate Row
              </button>
            </form>
          </div>

          {/* Current Row Layout */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Active Row Configurations</h3>
            
            {uniqueRows.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '12px', color: '#6b7280' }}>
                <Armchair size={36} style={{ marginBottom: '0.5rem' }} />
                <p>No seat rows defined yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {uniqueRows.map(row => {
                  const total = seatsCountByRow[row] || 0;
                  const booked = bookedSeatsCountByRow[row] || 0;

                  // If editing this row, show inline edit form
                  if (editingRow === row) {
                    return (
                      <form key={row} onSubmit={handleEditRow} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Edit Row {row}</div>
                          <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Adjust number of seats in this row.</div>
                        </div>
                        <div style={{ width: '120px' }}>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            className={`form-control ${editRowErrors.seatsCount ? 'input-error' : ''}`}
                            value={editRowSeatsCount}
                            onChange={(e) => setEditRowSeatsCount(e.target.value)}
                          />
                          {editRowErrors.seatsCount && (
                            <div className="field-error">{editRowErrors.seatsCount}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary btn-sm" type="submit">Save</button>
                          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditingRow(null)}>Cancel</button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div 
                      key={row}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>Row {row}</div>
                        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.1rem' }}>
                          Seats: {total} total | Booked: {booked} ({Math.round(total ? (booked/total)*100 : 0)}%)
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.4rem' }}
                          onClick={() => openViewRowSeats(row)}
                          title={`View Row ${row} Seats`}
                        >
                          <Armchair size={15} />
                        </button>
                        {user && user.role === 'admin' && (
                          <>
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.4rem' }}
                              onClick={() => openEditRowForm(row)}
                              title={`Edit Row ${row}`}
                            >
                              <Edit size={15} />
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              style={{ padding: '0.4rem' }}
                              onClick={() => handleDeleteRow(row)}
                              title={`Delete Row ${row}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Change Requests Tab (Admin Only) */}
      {activeTab === 'changeRequests' && user && user.role === 'admin' && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Pending Change Requests</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Users who requested to move their active booking to another seat. Approve to apply the change.
          </p>
          {changeRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
              No pending requests.
            </div>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Shift</th>
                    <th>Requested At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {changeRequests.filter(r => r.status === 'pending').map(r => (
                    <tr key={r.id}>
                      <td>{r.userName} ({r.userId})</td>
                      <td>{r.fromSeatId}</td>
                      <td>{r.toSeatId}</td>
                      <td>{Array.isArray(r.shift) ? r.shift.join(',') : r.shift}</td>
                      <td>{new Date(r.createdAt).toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={async () => {
                            try {
                              const res = await apiFetch(`/api/seats/change-requests/${r.id}/approve`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                              const data = await res.json();
                              if (res.ok) {
                                setSuccess('Request approved.');
                                fetchData();
                              } else {
                                setError(data.message || 'Approve failed');
                              }
                            } catch (err) { setError('Connection error.'); }
                          }}>Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={async () => {
                            try {
                              const res = await apiFetch(`/api/seats/change-requests/${r.id}/decline`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                              const data = await res.json();
                              if (res.ok) {
                                setSuccess('Request declined.');
                                fetchData();
                              } else {
                                setError(data.message || 'Decline failed');
                              }
                            } catch (err) { setError('Connection error.'); }
                          }}>Decline</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Row Seats Modal */}
      {viewingRowSeats && (
        <div className="modal-overlay" onClick={closeViewRowSeats}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '760px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Row {viewingRowSeats} — Seats</h3>
              <button className="modal-close" onClick={closeViewRowSeats}>&times;</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem', maxHeight: '55vh', overflow: 'auto', padding: '0.5rem' }}>
              {seats.filter(s => s.row === viewingRowSeats).map(seat => (
                    <div key={seat.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 700 }}>{seat.row}{seat.number}</div>
                  <div>
                    <span className={`badge ${seat.status === 'available' ? 'badge-approved' : 'badge-pending'}`}>{seat.status}</span>
                  </div>
                  {user && user.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditSeatForm(seat)} title={`Edit123 ${seat.row}${seat.number}`}>
                        <Edit size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSeat(seat.id, `${seat.row}${seat.number}`)} title={`Delete ${seat.row}${seat.number}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Seat Modal */}
      {editingSeat && (
        <div className="modal-overlay" onClick={() => setEditingSeat(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Seat {editingSeat.row}{editingSeat.number}</h3>
              <button className="modal-close" onClick={() => setEditingSeat(null)}>&times;</button>
            </div>

            <div style={{ padding: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={editSeatStatus} onChange={(e) => setEditSeatStatus(e.target.value)}>
                  <option value="available">Available</option>
                  <option value="booked">Booked (use booking flow)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" onClick={handleEditSeat}>Save</button>
                <button className="btn btn-secondary" onClick={() => setEditingSeat(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {userFormOpen && (
        <div className="modal-overlay" onClick={() => setUserFormOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingUser ? 'Edit User Details' : 'Create New Account'}</h3>
              <button className="modal-close" onClick={() => setUserFormOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleUserFormSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="form-name">Full Name *</label>
                <input 
                  type="text" 
                  id="form-name" 
                  className={`form-control ${formErrors.name ? 'input-error' : ''}`}
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (formErrors.name) {
                      setFormErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  required
                />
                {formErrors.name && (
                  <div className="field-error">
                    <AlertCircle size={14} style={{ marginRight: '4px' }} />
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-phone">Phone Number (UserID) *</label>
                <input 
                  type="text" 
                  id="form-phone" 
                  className={`form-control ${formErrors.phone ? 'input-error' : ''}`}
                  value={formPhone}
                  onChange={(e) => {
                    setFormPhone(e.target.value);
                    if (formErrors.phone) {
                      setFormErrors(prev => ({ ...prev, phone: '' }));
                    }
                  }}
                  required
                />
                {formErrors.phone && (
                  <div className="field-error">
                    <AlertCircle size={14} style={{ marginRight: '4px' }} />
                    {formErrors.phone}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-email">Email Address</label>
                <input 
                  type="email" 
                  id="form-email" 
                  className={`form-control ${formErrors.email ? 'input-error' : ''}`}
                  value={formEmail}
                  onChange={(e) => {
                    setFormEmail(e.target.value);
                    if (formErrors.email) {
                      setFormErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                />
                {formErrors.email && (
                  <div className="field-error">
                    <AlertCircle size={14} style={{ marginRight: '4px' }} />
                    {formErrors.email}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-password">
                  Password {editingUser ? '(Leave blank to keep same)' : '*'}
                </label>
                <input 
                  type="password" 
                  id="form-password" 
                  className={`form-control ${formErrors.password ? 'input-error' : ''}`}
                  value={formPassword}
                  onChange={(e) => {
                    setFormPassword(e.target.value);
                    if (formErrors.password) {
                      setFormErrors(prev => ({ ...prev, password: '' }));
                    }
                  }}
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Min 8 characters'}
                />
                {formErrors.password && (
                  <div className="field-error">
                    <AlertCircle size={14} style={{ marginRight: '4px' }} />
                    {formErrors.password}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="form-role">Account Role</label>
                  <select 
                    id="form-role" 
                    className="form-control"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    style={{ background: '#1f2937' }}
                  >
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="form-status">Approval Status</label>
                  <select 
                    id="form-status" 
                    className="form-control"
                    value={formApproved ? 'approved' : 'pending'}
                    onChange={(e) => setFormApproved(e.target.value === 'approved')}
                    style={{ background: '#1f2937' }}
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Approval</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingUser ? 'Save Updates' : 'Create Account'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setUserFormOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
