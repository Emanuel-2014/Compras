'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [appSettings, setAppSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAppSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setAppSettings(data);
      } else {
        console.error('Error fetching app settings:', response.statusText);
        setAppSettings({}); // Set to empty object on error to prevent crashes
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
      setAppSettings({}); // Set to empty object on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppSettings();
  }, [fetchAppSettings]);

  const value = {
    appSettings,
    loadingAppSettings: loading,
    refreshAppSettings: fetchAppSettings, // Expose a function to allow manual refresh
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
}
