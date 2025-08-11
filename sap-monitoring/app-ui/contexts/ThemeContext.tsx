"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Theme {
  name: string;
  colors: string[];
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const defaultTheme: Theme = {
  name: 'default',
  colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {}
});

export const ThemeProvider: React.FC<{ children: ReactNode, initialTheme?: Theme }> = ({ 
  children, 
  initialTheme = defaultTheme 
}) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext; 