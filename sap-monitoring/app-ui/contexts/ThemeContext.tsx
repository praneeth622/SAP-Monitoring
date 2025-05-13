"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

interface Theme {
  name: string;
  colors: string[];
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  currentTheme: string;
  setCurrentTheme: (theme: string) => void;
}

const defaultTheme: Theme = {
  name: 'default',
  colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  currentTheme: 'system',
  setCurrentTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: ReactNode, initialTheme?: Theme }> = ({ 
  children, 
  initialTheme = defaultTheme 
}) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme();

  const setCurrentTheme = (newTheme: string) => {
    setNextTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme,
      currentTheme: nextTheme || 'system',
      setCurrentTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext; 