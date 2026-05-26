import React from 'react';
import { Armchair, Sparkles } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerContainer}>
        <div style={styles.leftCol}>
          <div style={styles.logo}>
            <Armchair size={20} style={styles.logoIcon} />
            <span style={styles.logoText}>Samridh <span style={styles.logoAccent}> Digital Library</span></span>
          </div>
          <p style={styles.tagline}>Advanced Library & Workspace Management System</p>
        </div>

        <div style={styles.rightCol}>
          <div style={styles.techBadge}>
            <Sparkles size={14} style={{ color: '#fbbf24' }} />
            <span>GITI</span> 
          </div>
          <div style={styles.copyright}>
            &copy; {new Date().getFullYear()} Glorious Industrial Training Institute Inc. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    background: '#090d16',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '2rem 1.5rem',
    marginTop: 'auto',
  },
  footerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  logoIcon: {
    color: '#6366f1',
  },
  logoText: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#ffffff',
  },
  logoAccent: {
    color: '#6366f1',
  },
  tagline: {
    fontSize: '0.85rem',
    color: '#6b7280',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.5rem',
  },
  techBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '0.3rem 0.6rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    color: '#d1d5db',
  },
  copyright: {
    fontSize: '0.8rem',
    color: '#4b5563',
  },
};

export default Footer;
