'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// Constants removed

async function withTimeout<T>(promise: PromiseLike<T>, label: string, timeoutMs = 12000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} terlalu lama. Cek koneksi HP ke internet/Supabase.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setMessage('Logging in...');

    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({
        email,
        password,
      }), 'Login');

      if (error) {
        setMessage(`Login failed: ${error.message}`);
      } else {
        setMessage('Login success. Redirecting...');
        router.push('/my-profile');
        router.refresh();
      }
    } catch (error) {
      setMessage(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async () => {
    setAuthLoading(true);
    setMessage('Signing up...');

    try {
      const { error } = await withTimeout(supabase.auth.signUp({
        email,
        password,
      }), 'Sign up');

      if (error) {
        setMessage(`Sign up failed: ${error.message}`);
      } else {
        setMessage('Sign up successful! You can now log in (check email for confirmation if required by your Supabase settings).');
      }
    } catch (error) {
      setMessage(`Sign up failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAuthLoading(false);
    }
  };

  // Developer testing methods removed for production security

  return (
    <section className="section active-section" style={{ display: 'block', maxWidth: '400px', margin: '0 auto', paddingTop: '4rem' }}>
      <article className="panel">
        <div className="panel-header" style={{ justifyContent: 'center' }}>
          <h3>Login to Debate Mate</h3>
        </div>
        
        {message && (
          <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: 'var(--green-soft)', color: 'var(--green)', fontSize: '0.9rem' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Email</label>
            <input 
              type="email" 
              className="input" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Password</label>
            <input 
              type="password" 
              className="input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
            <button type="submit" className="primary-button" disabled={authLoading}>
              {authLoading ? '...' : 'Login'}
            </button>
            <button type="button" className="secondary-button" onClick={handleSignUp} disabled={authLoading}>
              Sign Up
            </button>
          </div>
        </form>
      </article>

      {/* Developer Panel removed for production security */}
    </section>
  );
}
