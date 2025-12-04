// src/contexts/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Define theme colors
const themes = {
  light: {
    name: 'light',
    colors: {
      // Main backgrounds
      background: '#ffffff',
      surface: '#f8f9fa',
      paper: '#ffffff',
      
      // Text colors
      textPrimary: '#212529',
      textSecondary: '#6c757d',
      textMuted: '#999999',
      
      // Brand colors
      primary: '#007bff',
      primaryLight: '#e3f2fd',
      success: '#28a745',
      danger: '#dc3545',
      warning: '#ffc107',
      
      // Chat specific
      chatBackground: '#ffffff',
      messageBackground: '#f1f3f4',
      ownMessageBackground: '#007bff',
      ownMessageText: '#ffffff',
      messageText: '#212529',
      
      // Role-specific message colors
      adminMessageBackground: '#0d6efd',
      adminMessageText: '#ffffff',
      teacherMessageBackground: '#198754',
      teacherMessageText: '#ffffff',
      studentMessageBackground: '#6c757d',
      studentMessageText: '#ffffff',
      deletedMessageBackground: '#e9ecef',
      deletedMessageText: '#6c757d',
      
      // Header and navigation
      headerBackground: '#007bff',
      headerText: '#ffffff',
      
      // Borders and dividers
      border: '#e1e5e9',
      borderLight: '#f1f3f4',
      
      // Button styles
      buttonBackground: '#007bff',
      buttonText: '#ffffff',
      buttonHover: '#0056b3',
      
      // Input styles
      inputBackground: '#ffffff',
      inputBorder: '#ced4da',
      inputText: '#495057',
      inputFocus: '#007bff',
      
      // Notification styles
      notificationBackground: '#ffffff',
      notificationBorder: '#e1e5e9',
      notificationUnread: '#f8f9ff',
      notificationHover: '#f8f9fa',
      
      // Pinned message styles
      pinnedBackground: '#fff3cd',
      pinnedBorder: '#ffeaa7',
      pinnedText: '#856404',
      
      // Reaction and interactive styles
      reactionBackground: '#f8f9fa',
      reactionBackgroundActive: '#e9ecef',
      reactionBorder: '#dee2e6',
      reactionBorderActive: '#6c757d',
      hoverBackground: '#f8f9fa',
      pinButtonBackground: '#ffc107',
      pinButtonBackgroundActive: '#ffb300',
      pinButtonText: '#000000',
      
      // Message sender and content colors
      senderTextLight: '#495057',
      pinnedIndicatorColor: '#d4700a',
      
      // Shadow
      shadow: 'rgba(0, 0, 0, 0.1)',
      shadowDark: 'rgba(0, 0, 0, 0.15)'
    }
  },
  dark: {
    name: 'dark',
    colors: {
      // Main backgrounds
      background: '#1a1a1a',
      surface: '#2d2d2d',
      paper: '#404040',
      
      // Text colors
      textPrimary: '#e4e6ea',
      textSecondary: '#b0b3b8',
      textMuted: '#8a8a8a',
      
      // Brand colors
      primary: '#4dabf7',
      primaryLight: '#1e3a5f',
      success: '#51cf66',
      danger: '#ff6b6b',
      warning: '#ffd43b',
      
      // Chat specific
      chatBackground: '#1a1a1a',
      messageBackground: '#3a3a3a',
      ownMessageBackground: '#4dabf7',
      ownMessageText: '#ffffff',
      messageText: '#e4e6ea',
      
      // Role-specific message colors
      adminMessageBackground: '#1d4ed8',
      adminMessageText: '#ffffff',
      teacherMessageBackground: '#059669',
      teacherMessageText: '#ffffff',
      studentMessageBackground: '#374151',
      studentMessageText: '#e4e6ea',
      deletedMessageBackground: '#374151',
      deletedMessageText: '#9ca3af',
      
      // Header and navigation
      headerBackground: '#2d2d2d',
      headerText: '#e4e6ea',
      
      // Borders and dividers
      border: '#404040',
      borderLight: '#3a3a3a',
      
      // Button styles
      buttonBackground: '#4dabf7',
      buttonText: '#ffffff',
      buttonHover: '#339af0',
      
      // Input styles
      inputBackground: '#2d2d2d',
      inputBorder: '#404040',
      inputText: '#e4e6ea',
      inputFocus: '#4dabf7',
      
      // Notification styles
      notificationBackground: '#2d2d2d',
      notificationBorder: '#404040',
      notificationUnread: '#1e3a5f',
      notificationHover: '#3a3a3a',
      
      // Pinned message styles
      pinnedBackground: '#3d2f00',
      pinnedBorder: '#665c00',
      pinnedText: '#ffd43b',
      
      // Shadow
      shadow: 'rgba(0, 0, 0, 0.3)',
      shadowDark: 'rgba(0, 0, 0, 0.5)'
    }
  }
};

export const ThemeProvider = ({ children }) => {
  // Get initial theme from localStorage or default to light
  const [currentTheme, setCurrentTheme] = useState(() => {
    const savedTheme = localStorage.getItem('superpaac-theme');
    return savedTheme || 'light';
  });

  // Toggle between light and dark theme
  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    localStorage.setItem('superpaac-theme', newTheme);
    console.log('🎨 Theme switched to:', newTheme);
  };

  // Set theme to specific value
  const setTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
      localStorage.setItem('superpaac-theme', themeName);
      console.log('🎨 Theme set to:', themeName);
    }
  };

  // Get current theme object
  const theme = themes[currentTheme];

  // Apply theme to document root for global CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const colors = theme.colors;
    
    // Set CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    
    // Set theme class on body
    document.body.className = `theme-${currentTheme}`;
    
    // Set meta theme color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.headerBackground);
    }
  }, [theme, currentTheme]);

  const value = {
    currentTheme,
    theme,
    themes,
    toggleTheme,
    setTheme,
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};