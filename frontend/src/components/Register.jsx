import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { validateName, validatePhone, validateEmail, validatePassword, validateRegistration } from '../utils/validators.js';
import { UserPlus, User, Mail, Phone, Key, AlertCircle, CheckCircle } from 'lucide-react';

const Register = ({ setCurrentView }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMessage, setErrMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Real-time validation on field blur
  const handleFieldBlur = (field, value) => {
    let error = '';
    switch (field) {
      case 'name':
        error = validateName(value);
        break;
      case 'phone':
        error = validatePhone(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'confirmPassword':
        if (!value) error = 'Please confirm your password';
        else if (value !== password) error = 'Passwords do not match';
        else error = '';
        break;
      default:
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateRegistration(name, phone, email, password, confirmPassword);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setErrMessage('Please fix the validation errors above');
      return;
    }

    setFieldErrors({});
    setErrMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const msg = await register(name.trim(), phone.trim(), email.trim(), password);
      setSuccessMessage(msg || 'Registration successful! Wait for Admin approval.');
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFieldErrors({});
    } catch (err) {
      if (err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
        setErrMessage('Validation failed. Please check the errors below.');
      } else {
        setErrMessage(err.message || 'Registration failed. Please try again.');
      }
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
              className={`form-control ${fieldErrors.name ? 'input-error' : ''}`}
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) handleFieldBlur('name', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('name', e.target.value)}
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
            <label className="form-label" htmlFor="register-phone">
              <Phone size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Phone Number * <span style={{ fontSize: '0.75rem', color: '#f87171' }}>(Used as User ID, Cannot be edited later)</span>
            </label>
            <input
              type="text"
              id="register-phone"
              className={`form-control ${fieldErrors.phone ? 'input-error' : ''}`}
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) handleFieldBlur('phone', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('phone', e.target.value)}
              required
              disabled={loading}
            />
            {fieldErrors.phone && (
              <div className="field-error">
                <AlertCircle size={14} style={{ marginRight: '4px' }} />
                {fieldErrors.phone}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Email Address (Optional)
            </label>
            <input
              type="email"
              id="register-email"
              className={`form-control ${fieldErrors.email ? 'input-error' : ''}`}
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) handleFieldBlur('email', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('email', e.target.value)}
              disabled={loading}
            />
            {fieldErrors.email && (
              <div className="field-error">
                <AlertCircle size={14} style={{ marginRight: '4px' }} />
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label className="form-label" htmlFor="register-password">
              <Key size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Password *
            </label>
            <input
              type="password"
              id="register-password"
              className={`form-control ${fieldErrors.password ? 'input-error' : ''}`}
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) handleFieldBlur('password', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('password', e.target.value)}
              required
              disabled={loading}
            />
            {fieldErrors.password && (
              <div className="field-error">
                <AlertCircle size={14} style={{ marginRight: '4px' }} />
                {fieldErrors.password}
              </div>
            )}
            {password && !fieldErrors.password && (
              <div className="field-success">
                <CheckCircle size={14} style={{ marginRight: '4px' }} />
                Password looks good
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.75rem', color: '#a1a1a1', marginBottom: '1rem', marginTop: '0.5rem' }}>
            Password must be at least 8 characters
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-confirm-password">
              <Key size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Confirm Password *
            </label>
            <input
              type="password"
              id="register-confirm-password"
              className={`form-control ${fieldErrors.confirmPassword ? 'input-error' : ''}`}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) handleFieldBlur('confirmPassword', e.target.value);
              }}
              onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
              required
              disabled={loading}
            />
            {fieldErrors.confirmPassword && (
              <div className="field-error">
                <AlertCircle size={14} style={{ marginRight: '4px' }} />
                {fieldErrors.confirmPassword}
              </div>
            )}
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
