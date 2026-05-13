'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const TEST_PASSWORD = 'password123';

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
  const [testRoleLoading, setTestRoleLoading] = useState('');
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

  const createTestAccount = async (role: string) => {
    if (testRoleLoading) return;
    setTestRoleLoading(role);
    setMessage(`Logging in as ${role}...`);

    try {
      const testEmail = `${role}@debatemate.com`;

      let loginResponse = await withTimeout(supabase.auth.signInWithPassword({
        email: testEmail,
        password: TEST_PASSWORD,
      }), 'Login test account');

      if (loginResponse.error) {
        setMessage(`Akun ${role} belum siap, mencoba membuat akun...`);

        const signUpResponse = await withTimeout(supabase.auth.signUp({
          email: testEmail,
          password: TEST_PASSWORD,
        }), 'Create test account');

        if (signUpResponse.error && !/already|registered|exists/i.test(signUpResponse.error.message)) {
          setMessage(`Gagal membuat akun ${role}: ${signUpResponse.error.message}`);
          return;
        }

        loginResponse = await withTimeout(supabase.auth.signInWithPassword({
          email: testEmail,
          password: TEST_PASSWORD,
        }), 'Login setelah create account');

        if (loginResponse.error) {
          setMessage(`Gagal login ${role}: ${loginResponse.error.message}. Kalau email confirmation aktif di Supabase, matikan dulu untuk test account atau confirm emailnya.`);
          return;
        }
      }

      if (!loginResponse.data.user) {
        setMessage(`Gagal login ${role}: Supabase tidak mengembalikan user.`);
        return;
      }

      const userId = loginResponse.data.user.id;
      setMessage(`Logged in. Menyiapkan profile ${role}...`);

      // 3. Since we are logged in, RLS will pass. Update or create the profile.
      const { data: existingProfile, error: profileLookupError } = await withTimeout(
        supabase.from('profiles').select('id').eq('user_id', userId).maybeSingle(),
        'Profile lookup'
      );
      if (profileLookupError) {
        setMessage(`Account logged in but profile lookup failed: ${profileLookupError.message}`);
        return;
      }
      
      let profileError = null;
      if (existingProfile) {
        const { error } = await withTimeout(
          supabase.from('profiles').update({
            system_role: role,
            name: `Test ${role.toUpperCase()}`
          }).eq('id', existingProfile.id),
          'Profile update'
        );
        profileError = error;
      } else {
        const { error } = await withTimeout(
          supabase.from('profiles').insert({
            user_id: userId,
            name: `Test ${role.toUpperCase()}`,
            avatar_initials: role.substring(0, 2).toUpperCase(),
            system_role: role
          }),
          'Profile create'
        );
        profileError = error;
      }

      if (profileError) {
        setMessage(`Account logged in but failed to set role: ${profileError.message}`);
        return;
      }

      setMessage(`Logged in as ${role}. Redirecting...`);
      router.push('/my-profile');
      router.refresh();
    } catch (error) {
      setMessage(`Unexpected login error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestRoleLoading('');
    }
  };

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

      <article className="panel" style={{ marginTop: '20px', background: '#fff3cd', borderColor: '#ffe69c' }}>
        <div className="panel-header" style={{ marginBottom: '10px' }}>
          <h3 style={{ fontSize: '1rem', color: '#664d03' }}>🛠 Developer Panel</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#664d03', marginBottom: '16px' }}>Quickly create or login to test accounts (Password: password123).</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button type="button" disabled={Boolean(testRoleLoading)} onPointerDown={() => setMessage('Tapped Login as Admin...')} onClick={() => createTestAccount('admin')} className="secondary-button" style={{ fontSize: '0.9rem', padding: '8px' }}>{testRoleLoading === 'admin' ? 'Logging in...' : 'Login as Admin'}</button>
          <button type="button" disabled={Boolean(testRoleLoading)} onPointerDown={() => setMessage('Tapped Login as EB...')} onClick={() => createTestAccount('eb')} className="secondary-button" style={{ fontSize: '0.9rem', padding: '8px' }}>{testRoleLoading === 'eb' ? 'Logging in...' : 'Login as EB'}</button>
          <button type="button" disabled={Boolean(testRoleLoading)} onPointerDown={() => setMessage('Tapped Login as Member...')} onClick={() => createTestAccount('member')} className="secondary-button" style={{ fontSize: '0.9rem', padding: '8px' }}>{testRoleLoading === 'member' ? 'Logging in...' : 'Login as Member'}</button>
        </div>
      </article>
    </section>
  );
}
