import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { UserPlus, User, Mail, Phone, Key, AlertCircle, CheckCircle } from 'lucide-react';

const Register = ({ setCurrentView }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMessage, setErrMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !password) {
      setErrMessage('Please fill in all required fields');
      return;
    }

    setErrMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const msg = await register(name, phone, email, password);
      setSuccessMessage(msg || 'Registration successful! Wait for Admin approval.');
      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setErrMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container glass-card">
      <h2 className="auth-title gradient-text">Create Account</h2>
      
      {errMessage && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{errMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong>Registered!</strong>
            <span style={{ fontSize: '0.85rem' }}>{successMessage}</span>
          </div>
        </div>
      )}

      {!successMessage ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">
              <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Full Name *
            </label>
            <input
              type="text"
              id="register-name"
              className="form-control"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-phone">
              <Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Phone Number * <span style={{ fontSize: '0.75rem', color: '#f87171' }}>(Used as User ID, Cannot be edited later)</span>
            </label>
            <input
              type="text"
              id="register-phone"
              className="form-control"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Email Address (Optional)
            </label>
            <input
              type="email"
              id="register-email"
              className="form-control"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" htmlFor="register-password">
              <Key size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Password *
            </label>
            <input
              type="password"
              id="register-password"
              className="form-control"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Registering...' : (
              <>
                <UserPlus size={18} />
                Register
              </>
            )}
          </button>
        </form>
      ) : (
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={() => setCurrentView('login')}
        >
          Go to Login
        </button>
      )}

      <div className="auth-footer">
        Already have an account?{' '}
        <a href="#login" className="auth-link" onClick={(e) => { e.preventDefault(); setCurrentView('login'); }}>
          Login here
        </a>
      </div>
    </div>
  );
};

export default Register;
