import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Armchair, User, LogOut, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';

const Navbar = ({ currentView, setCurrentView }) => {
  const { user, logout } = useAuth();

  return (
    <header style={styles.header}>
      <div style={styles.navContainer}>
        <div style={styles.logo} onClick={() => setCurrentView('map')}>
          <Armchair size={24} style={styles.logoIcon} />
          <span style={styles.logoText}>Seat<span style={styles.logoAccent}>Book</span></span>
        </div>

        <nav style={styles.navLinks}>
          <button 
            style={{
              ...styles.navBtn,
              ...(currentView === 'map' ? styles.activeNavBtn : {})
            }}
            onClick={() => setCurrentView('map')}
          >
            Seat Map
          </button>

          {user && user.role === 'admin' && (
            <button 
              style={{
                ...styles.navBtn,
                ...(currentView === 'admin' ? styles.activeNavBtn : {})
              }}
              onClick={() => setCurrentView('admin')}
            >
              <LayoutDashboard size={16} />
              Admin Panel
            </button>
          )}

          {user ? (
            <div style={styles.userSection}>
              <button 
                style={{
                  ...styles.navBtn,
                  ...(currentView === 'profile' ? styles.activeNavBtn : {})
                }}
                onClick={() => setCurrentView('profile')}
              >
                <User size={16} />
                {user.name}
              </button>
              <button style={styles.logoutBtn} onClick={logout}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          ) : (
            <div style={styles.guestSection}>
              <button 
                style={{
                  ...styles.navBtn,
                  ...(currentView === 'login' ? styles.activeNavBtn : {})
                }}
                onClick={() => setCurrentView('login')}
              >
                <LogIn size={16} />
                Login
              </button>
              <button 
                style={styles.registerBtn}
                onClick={() => setCurrentView('register')}
              >
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

const styles = {
  header: {
    background: 'rgba(17, 24, 39, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 90,
  },
  navContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  logoIcon: {
    color: '#6366f1',
    filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))',
  },
  logoText: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.4rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    color: '#ffffff',
  },
  logoAccent: {
    color: '#6366f1',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.95rem',
    fontWeight: '550',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'all 0.15s ease',
  },
  activeNavBtn: {
    color: '#ffffff',
    background: 'rgba(255, 255, 255, 0.05)',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
    paddingLeft: '0.5rem',
  },
  guestSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#f87171',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.95rem',
    fontWeight: '500',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'all 0.15s ease',
  },
  registerBtn: {
    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border: 'none',
    color: '#ffffff',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '0.95rem',
    fontWeight: '550',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
    transition: 'all 0.15s ease',
  },
};

export default Navbar;
