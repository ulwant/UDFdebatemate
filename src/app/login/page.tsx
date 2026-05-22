'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type AuthMode = 'login' | 'register';

async function withTimeout<T>(promise: PromiseLike<T>, label: string, timeoutMs = 12000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} terlalu lama. Cek koneksi internet atau Supabase.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0]?.slice(0, 2).toUpperCase() || 'DM';
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [batch, setBatch] = useState('');
  const [memberType, setMemberType] = useState('newbie');
  const [debatingExperience, setDebatingExperience] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setMessage('Logging in...');

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        'Login',
      );

      if (error) {
        setMessage(`Login gagal: ${error.message}`);
        return;
      }

      setMessage('Login berhasil. Redirecting...');
      router.push('/my-profile');
      router.refresh();
    } catch (error) {
      setMessage(`Login gagal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const cleanedName = fullName.trim();
    const cleanedBatch = batch.trim();

    if (cleanedName.length < 2) {
      setMessage('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (password.length < 8) {
      setMessage('Password minimal 8 karakter.');
      return;
    }

    setAuthLoading(true);
    setMessage('Mendaftarkan akun...');

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: cleanedName,
              batch: cleanedBatch,
              member_type: memberType,
              debating_experience: debatingExperience.trim(),
              caption: `${memberType === 'newbie' ? 'Calon member' : 'Member'} UDF${cleanedBatch ? ` ${cleanedBatch}` : ''}`,
            },
          },
        }),
        'Register',
      );

      if (error) {
        setMessage(`Daftar gagal: ${error.message}`);
        return;
      }

      if (data.session?.user) {
        await supabase.from('profiles').upsert({
          user_id: data.session.user.id,
          name: cleanedName,
          caption: `${memberType === 'newbie' ? 'Calon member' : 'Member'} UDF${cleanedBatch ? ` ${cleanedBatch}` : ''}`,
          bio: '',
          avatar_initials: initialsFromName(cleanedName),
          avatar_color: 'blue',
          system_role: 'member',
          approval_status: 'pending_approval',
          batch: cleanedBatch || null,
          member_type: memberType,
          debating_experience: debatingExperience.trim() || null,
          discord_roles: [],
          contact_links: {},
          achievements: [],
          debating_history: [],
        }, { onConflict: 'user_id' });

        setMessage('Akun berhasil dibuat. Profilmu masuk antrean approval EB/Admin.');
        router.push('/my-profile');
        router.refresh();
        return;
      }

      setMessage('Akun berhasil dibuat. Cek email untuk verifikasi, lalu login. Profil akan masuk antrean approval EB/Admin.');
      setMode('login');
    } catch (error) {
      setMessage(`Daftar gagal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAuthLoading(false);
    }
  }

  const isRegister = mode === 'register';

  return (
    <section className="section active-section" style={{ display: 'block', maxWidth: '520px', margin: '0 auto', paddingTop: '4rem' }}>
      <article className="panel">
        <div className="panel-header" style={{ justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p className="eyebrow">Debate Mate Account</p>
            <h3>{isRegister ? 'Daftar Akun UDF' : 'Login to Debate Mate'}</h3>
          </div>
          <div className="segmented" role="group" aria-label="Auth mode">
            <button className={`segment ${!isRegister ? 'active' : ''}`} type="button" onClick={() => setMode('login')}>Login</button>
            <button className={`segment ${isRegister ? 'active' : ''}`} type="button" onClick={() => setMode('register')}>Daftar</button>
          </div>
        </div>

        {message && (
          <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: 'var(--green-soft)', color: 'var(--green)', fontSize: '0.9rem', fontWeight: 700 }}>
            {message}
          </div>
        )}

        <form onSubmit={isRegister ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isRegister && (
            <>
              <div>
                <label className="field-label" style={{ marginTop: 0 }}>Nama Lengkap</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="field-label" style={{ marginTop: 0 }}>Angkatan</label>
                  <input className="input" placeholder="UDF25" value={batch} onChange={(e) => setBatch(e.target.value)} />
                </div>
                <div>
                  <label className="field-label" style={{ marginTop: 0 }}>Status</label>
                  <select className="input" value={memberType} onChange={(e) => setMemberType(e.target.value)}>
                    <option value="newbie">Newbie</option>
                    <option value="member">Member</option>
                    <option value="alumni">Alumni</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label" style={{ marginTop: 0 }}>Pengalaman Debat</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Opsional: lomba, adjudication, latihan, atau alasan join UDF"
                  value={debatingExperience}
                  onChange={(e) => setDebatingExperience(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label" style={{ marginTop: 0 }}>Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={isRegister ? 8 : undefined} required />
          </div>

          <button type="submit" className="primary-button" disabled={authLoading}>
            {authLoading ? 'Processing...' : isRegister ? 'Daftar dan Minta Approval' : 'Login'}
          </button>
        </form>

        {isRegister && (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.5, marginTop: '16px' }}>
            Akun baru akan masuk antrean approval EB/Admin. Nomor WhatsApp tidak diminta di form pendaftaran.
          </p>
        )}
      </article>
    </section>
  );
}
