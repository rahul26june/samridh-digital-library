import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { LogIn, Key, Phone, AlertCircle } from 'lucide-react';

const Login = ({ setCurrentView }) => {
  const { login, setError } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMessage, setErrMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) {
      setErrMessage('Please enter both phone number and password');
      return;
    }

    setErrMessage('');
    setLoading(true);

    try {
      const user = await login(phone, password);
      // Success! Move to map or admin panel
      if (user.role === 'admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('map');
      }
    } catch (err) {
      setErrMessage(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container glass-card">
      <h2 className="auth-title gradient-text">Welcome Back</h2>
      
      {errMessage && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{errMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-phone">
            <Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Phone Number (UserID)
          </label>
          <input
            type="text"
            id="login-phone"
            className="form-control"
            placeholder="e.g. 1234567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label" htmlFor="login-password">
            <Key size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            Password
          </label>
          <input
            type="password"
            id="login-password"
            className="form-control"
            placeholder="••••••••"
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
          {loading ? 'Authenticating...' : (
            <>
              <LogIn size={18} />
              Login
            </>
          )}
        </button>
      </form>

      <div className="auth-footer">
        Don't have an account?{' '}
        <a href="#register" className="auth-link" onClick={(e) => { e.preventDefault(); setCurrentView('register'); }}>
          Sign Up
        </a>
      </div>
    </div>
  );
};

export default Login;
