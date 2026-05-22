import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import SeatMap from './components/SeatMap.jsx';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import UserProfile from './components/UserProfile.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

// Separate AppContent so we can use useAuth hook inside
const AppContent = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('map'); // 'map', 'login', 'register', 'profile', 'admin'

  // View protection / routing guards
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Guests cannot access profile or admin panel
      if (currentView === 'profile' || currentView === 'admin') {
        setCurrentView('login');
      }
    } else {
      // Logged in users cannot access login/register
      if (currentView === 'login' || currentView === 'register') {
        setCurrentView('map');
      }
      // Non-admins cannot access admin dashboard
      if (currentView === 'admin' && user.role !== 'admin') {
        setCurrentView('map');
      }
    }
  }, [user, currentView, loading]);

  const renderView = () => {
    if (loading) {
      return (
        <div style={styles.loaderContainer}>
          <div style={styles.spinner}></div>
          <p style={{ marginTop: '1rem', color: '#9ca3af' }}>Initializing session...</p>
        </div>
      );
    }

    switch (currentView) {
      case 'map':
        return <SeatMap setCurrentView={setCurrentView} />;
      case 'login':
        return <Login setCurrentView={setCurrentView} />;
      case 'register':
        return <Register setCurrentView={setCurrentView} />;
      case 'profile':
        return user ? <UserProfile /> : <Login setCurrentView={setCurrentView} />;
      case 'admin':
        return user && user.role === 'admin' ? <AdminDashboard /> : <SeatMap setCurrentView={setCurrentView} />;
      default:
        return <SeatMap setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="app-container">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="main-content">
        {renderView()}
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles = {
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5rem 0',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(99, 102, 241, 0.1)',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Add CSS keyframe for spinner dynamically if not loaded
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default App;
