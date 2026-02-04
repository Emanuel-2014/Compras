// hooks/useThemeColors.js
'use client';

import { useState, useEffect } from 'react';

/**
 * Hook personalizado para obtener los colores del tema desde variables CSS
 * @returns {Object} Objeto con los colores del tema
 */
export function useThemeColors() {
  const [colors, setColors] = useState({
    primary: '#0056b3',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
  });

  useEffect(() => {
    // Obtener colores de las variables CSS definidas en :root
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    setColors({
      primary: computedStyle.getPropertyValue('--primary-color').trim() || '#0056b3',
      secondary: computedStyle.getPropertyValue('--secondary-color').trim() || '#6c757d',
      success: computedStyle.getPropertyValue('--success-color').trim() || '#28a745',
      danger: computedStyle.getPropertyValue('--danger-color').trim() || '#dc3545',
      warning: computedStyle.getPropertyValue('--warning-color').trim() || '#ffc107',
      info: computedStyle.getPropertyValue('--info-color').trim() || '#17a2b8',
    });
  }, []);

  return colors;
}
