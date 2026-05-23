'use client';

import { useEffect } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply saved preferences
    const savedColor = localStorage.getItem('theme-color');
    const isDark = localStorage.getItem('dark-mode') === 'true';

    if (savedColor) {
      document.documentElement.style.setProperty('--green', savedColor);
      document.documentElement.style.setProperty('--green-soft', `${savedColor}22`);
    }

    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

  return <>{children}</>;
}
