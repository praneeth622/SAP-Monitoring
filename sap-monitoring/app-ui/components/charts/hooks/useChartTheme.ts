"use client"

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export const useChartTheme = () => {
  const { theme } = useTheme();
  const [chartTheme, setChartTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setChartTheme(theme === 'dark' ? 'dark' : 'light');
  }, [theme]);

  return {
    backgroundColor: chartTheme === 'dark' ? '#1a1a1a' : '#ffffff',
    textColor: chartTheme === 'dark' ? '#ffffff' : '#333333',
    axisLineColor: chartTheme === 'dark' ? '#333333' : '#dddddd',
    splitLineColor: chartTheme === 'dark' ? '#333333' : '#f0f0f0',
    tooltipBackgroundColor: chartTheme === 'dark' ? '#262626' : '#ffffff',
    theme: chartTheme
  };
};