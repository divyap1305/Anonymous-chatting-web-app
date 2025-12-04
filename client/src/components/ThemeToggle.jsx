// src/components/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { toggleTheme, isDark, theme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: 'none',
        border: `2px solid ${theme.colors.border}`,
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s ease',
        backgroundColor: theme.colors.surface,
        color: theme.colors.textPrimary,
      }}
      onMouseOver={(e) => {
        e.target.style.backgroundColor = theme.colors.borderLight;
        e.target.style.transform = 'scale(1.05)';
      }}
      onMouseOut={(e) => {
        e.target.style.backgroundColor = theme.colors.surface;
        e.target.style.transform = 'scale(1)';
      }}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {isDark ? '🌞' : '🌙'}
    </button>
  );
};

export default ThemeToggle;