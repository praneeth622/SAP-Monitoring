"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

interface ThemeToggleContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeToggleContext = createContext<ThemeToggleContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

export const ThemeToggleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { theme, setTheme } = useNextTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDarkMode(theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setIsDarkMode(newTheme === 'dark');
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeToggleContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeToggleContext.Provider>
  );
};

export const useThemeToggle = () => useContext(ThemeToggleContext);

export default ThemeToggleContext; 