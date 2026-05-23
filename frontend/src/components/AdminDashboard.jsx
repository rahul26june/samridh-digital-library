import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../apiClient.js';
import { UserCheck, Users, Armchair, Trash2, Edit, Check, X, AlertCircle, Plus } from 'lucide-react';

const AdminDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('approvals');
  const [users, setUsers] = useState([]);
  const [seats, setSeats] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for seat config
  const [rowLetter, setRowLetter] = useState('');
  const [seatsCount, setSeatsCount] = useState('');

  // Form states for adding/editing users
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null if adding
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formApproved, setFormApproved] = useState(true);

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
    if (!rowLetter || !seatsCount) {
      setError('Please provide both row letter and number of seats.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch('/api/seats/row', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ row: rowLetter, seatsCount })
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

  // Open form for adding a new user
  const openAddForm = () => {
    setEditingUser(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('user');
    setFormApproved(true);
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
    setUserFormOpen(true);
  };

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    // Password is only required when adding a new user
    if (!editingUser && !formPassword) {
      setError('Password is required for new users.');
      return;
    }

    const payload = {
      name: formName,
      phone: formPhone,
      email: formEmail,
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
        setError(data.message || 'Operation failed.');
      }
    } catch (err) {
      setError('Connection error. Form submission failed.');
    }
  };

  // Derived states
  const pendingUsers = users.filter(u => !u.isApproved);
  
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
          className={`tab-btn ${activeTab === 'seats' ? 'active' : ''}`}
          onClick={() => setActiveTab('seats')}
        >
          Configure Seats ({uniqueRows.length} Rows)
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
            <button className="btn btn-primary btn-sm" onClick={openAddForm}>
              <Plus size={16} />
              Add User
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone (UserID)</th>
                  <th>Email</th>
                  <th>Role</th>
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
                      <span className={`badge ${u.isApproved ? 'badge-approved' : 'badge-pending'}`}>
                        {u.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Configure Seats Tab */}
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
                  className="form-control"
                  placeholder="e.g. D"
                  maxLength="2"
                  value={rowLetter}
                  onChange={(e) => setRowLetter(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" htmlFor="seats-count">Number of Seats in Row</label>
                <input 
                  type="number" 
                  id="seats-count" 
                  className="form-control"
                  placeholder="e.g. 10"
                  min="1"
                  max="30"
                  value={seatsCount}
                  onChange={(e) => setSeatsCount(e.target.value)}
                  required
                />
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
                      
                      <button 
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.4rem' }}
                        onClick={() => handleDeleteRow(row)}
                        title={`Delete Row ${row}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
                  className="form-control"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-phone">Phone Number (UserID) *</label>
                <input 
                  type="text" 
                  id="form-phone" 
                  className="form-control"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-email">Email Address</label>
                <input 
                  type="email" 
                  id="form-email" 
                  className="form-control"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="form-password">
                  Password {editingUser ? '(Leave blank to keep same)' : '*'}
                </label>
                <input 
                  type="password" 
                  id="form-password" 
                  className="form-control"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                />
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
