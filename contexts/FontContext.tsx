"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type FontContextType = {
  font: string;
  setFont: (font: string) => void;
};

const FontContext = createContext<FontContextType | undefined>(undefined);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFont] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('font') || 'nunito-sans';
    }
    return 'nunito-sans';
  });

  useEffect(() => {
    // Apply font to document root
    document.documentElement.style.setProperty('--font-family', font);
    document.body.style.fontFamily = `var(--font-${font})`;
  }, [font]);

  const handleFontChange = (newFont: string) => {
    setFont(newFont);
    localStorage.setItem('font', newFont);
  };

  return (
    <FontContext.Provider value={{ font, setFont: handleFontChange }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error("useFont must be used within a FontProvider");
  }
  return context;
}