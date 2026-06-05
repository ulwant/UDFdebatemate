'use client';
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error caught by Boundary:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'var(--bg, #0f172a)',
            color: 'var(--fg, #f8fafc)',
            fontFamily: 'inherit',
          }}>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#f43f5e' }}>⚠️ Terjadi Kesalahan</h2>
            <p style={{ color: 'var(--muted, #94a3b8)', marginBottom: '1.5rem', maxWidth: '400px' }}>
              {this.state.error?.message || 'Terjadi kesalahan sistem yang tidak terduga pada halaman ini.'}
            </p>
            <button 
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--primary, #3b82f6)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Muat Ulang Halaman
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
