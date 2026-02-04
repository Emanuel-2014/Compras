'use client';

import { useEffect, useState } from 'react';

export default function ThemeProvider({ children }) {
  const [colors, setColors] = useState(null);

  useEffect(() => {
    const loadColors = async () => {
      try {
        const response = await fetch('/api/settings');
        const settings = await response.json();

        // Mapeo de colores de la base de datos a variables CSS
        const colorMapping = {
          primary_color: '--primary-color',
          secondary_color: '--secondary-color',
          accent_color: '--accent-color',
          success_color: '--success-color',
          danger_color: '--danger-color',
          warning_color: '--warning-color',
          info_color: '--info-color',
          sidebar_background_color: '--sidebar-bg-color',
          sidebar_text_color: '--sidebar-text-color',
          card_background_color: '--card-bg-color',
        };

        // Aplicar todos los colores como CSS variables
        Object.entries(colorMapping).forEach(([settingKey, cssVar]) => {
          if (settings[settingKey]) {
            document.documentElement.style.setProperty(cssVar, settings[settingKey]);
          }
        });

        // También aplicar colores a Bootstrap si están definidos
        if (settings.primary_color) {
          document.documentElement.style.setProperty('--bs-primary', settings.primary_color);
        }
        if (settings.success_color) {
          document.documentElement.style.setProperty('--bs-success', settings.success_color);
        }
        if (settings.danger_color) {
          document.documentElement.style.setProperty('--bs-danger', settings.danger_color);
        }
        if (settings.warning_color) {
          document.documentElement.style.setProperty('--bs-warning', settings.warning_color);
        }
        if (settings.info_color) {
          document.documentElement.style.setProperty('--bs-info', settings.info_color);
        }
        if (settings.secondary_color) {
          document.documentElement.style.setProperty('--bs-secondary', settings.secondary_color);
        }

        setColors(settings);
      } catch (error) {
        console.error('Error loading theme colors:', error);
      }
    };

    loadColors();
  }, []);

  return <>{children}</>;
}
