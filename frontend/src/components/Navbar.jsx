import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Armchair, User, LogOut, LayoutDashboard, LogIn, UserPlus, Menu } from 'lucide-react';

const Navbar = ({ currentView, setCurrentView }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (view) => {
    setCurrentView(view);
    setMenuOpen(false);
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => handleNav('map')}>
          <Armchair size={20} className="navbar-logo-icon" />
          <span className="navbar-logo-text">Seat<span className="navbar-logo-accent">Book</span></span>
        </div>

        <button
          className="navbar-toggle"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu size={20} />
        </button>

        {user && (
          <div className="navbar-user-display">
            <User size={16} />
            <span>{user.name}</span>
          </div>
        )}

        <nav className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
          <button
            className={`navbar-btn ${currentView === 'map' ? 'active' : ''}`}
            onClick={() => handleNav('map')}
          >
            Seat Map
          </button>

          {user && user.role === 'admin' && (
            <button
              className={`navbar-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => handleNav('admin')}
            >
              <LayoutDashboard size={16} />
              Admin Panel
            </button>
          )}

          {user ? (
            <div className="navbar-group">
              <button
                className={`navbar-btn ${currentView === 'profile' ? 'active' : ''}`}
                onClick={() => handleNav('profile')}
              >
                <User size={16} />
                {user.name}
              </button>
              <button className="navbar-btn navbar-logout" onClick={() => { logout(); setMenuOpen(false); }}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : (
            <div className="navbar-group">
              <button
                className={`navbar-btn ${currentView === 'login' ? 'active' : ''}`}
                onClick={() => handleNav('login')}
              >
                <LogIn size={16} />
                Login
              </button>
              <button className="navbar-btn navbar-register" onClick={() => handleNav('register')}>
                <UserPlus size={16} />
                Sign Up
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
