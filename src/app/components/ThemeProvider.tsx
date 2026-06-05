'use client';

import { useEffect } from 'react';
import { hexToRgb, readableTextColor } from '@/lib/profileUtils';

function applyThemeColor(color: string) {
  const { r, g, b } = hexToRgb(color);
  document.documentElement.style.setProperty('--green', color);
  document.documentElement.style.setProperty('--green-rgb', `${r}, ${g}, ${b}`);
  document.documentElement.style.setProperty('--green-soft', `rgba(${r}, ${g}, ${b}, 0.14)`);
  document.documentElement.style.setProperty('--green-contrast', readableTextColor(color));
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved preferences
    const savedColor = localStorage.getItem('theme-color');
    const isDark = localStorage.getItem('dark-mode') === 'true';

    if (savedColor) {
      applyThemeColor(savedColor);
    }

    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

  return <>{children}</>;
}
