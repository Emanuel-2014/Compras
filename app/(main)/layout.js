'use client';
// app/(main)/layout.js
import { useEffect } from 'react'; // Import useEffect
import AppNavbar from '../../components/AppNavbar'; // Corrected import
import { AppSettingsProvider } from '@/app/context/SettingsContext'; // Import AppSettingsProvider
import SessionExpiredHandler from '@/components/SessionExpiredHandler'; // Import SessionExpiredHandler
import ScrollPreserver from '@/components/ScrollPreserver'; // Import ScrollPreserver

import styles from './layout.module.css'; // Use the correct local styles
import '@/components/PrintableSolicitud.module.css';

export default function MainLayout({ children }) {
  // Effect to apply Bootstrap's dark theme based on user's OS preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleThemeChange = (e) => {
      if (e.matches) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-bs-theme');
      }
    };

    // Set initial theme
    handleThemeChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleThemeChange);

    // Cleanup listener on component unmount
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, []);

  return (
    <div className={styles.mainLayout}>
      <ScrollPreserver />
      <SessionExpiredHandler />
      <AppNavbar /> {/* Corrected component */}
      <main className={`main-content ${styles.mainContent}`}>
        <AppSettingsProvider> {/* Wrap children with AppSettingsProvider */}
          {children}
        </AppSettingsProvider>
      </main>
    </div>
  );
}
