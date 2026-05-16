/**
 * Lazy loading utilities for code splitting and performance optimization
 */

import React from 'react';
import dynamic from 'next/dynamic';

// Lazy load heavy components
export const EbAreaPage = dynamic(() => import('@/app/eb-area/page'), {
  loading: () => React.createElement('div', {}, 'Loading EB Area...'),
  ssr: false,
});

export const TimerRoomPage = dynamic(() => import('@/app/timer/room/page'), {
  loading: () => React.createElement('div', {}, 'Loading Timer Room...'),
  ssr: false,
});
