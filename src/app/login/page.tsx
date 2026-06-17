'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type AuthMode = 'login' | 'register';
type RegisterType = 'udf' | 'guest';

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
  const [birthdate, setBirthdate] = useState('');
  const [username, setUsername] = useState('');
  const [registerType, setRegisterType] = useState<RegisterType>('udf');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [delegationStatus, setDelegationStatus] = useState('non-delegasi');
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
    const cleanedUsername = username.trim();
    const cleanedFaculty = faculty.trim();
    const cleanedMajor = major.trim();

    if (cleanedName.length < 2) {
      setMessage('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (registerType === 'udf' && !cleanedUsername) {
      setMessage('Username wajib diisi untuk akun UDF.');
      return;
    }
    if (!cleanedFaculty) {
      setMessage('Fakultas wajib diisi.');
      return;
    }
    if (!cleanedMajor) {
      setMessage('Jurusan wajib diisi.');
      return;
    }
    if (password.length < 8) {
      setMessage('Password minimal 8 karakter.');
      return;
    }

    setAuthLoading(true);
    setMessage('Mendaftarkan akun...');

    try {
      const caption = registerType === 'guest' ? 'Guest Debate Mate' : `Calon member UDF${cleanedBatch ? ` ${cleanedBatch}` : ''}`;
      const memberType = registerType === 'guest' ? 'guest' : 'newbie';
      const systemRole = registerType === 'guest' ? 'guest' : 'member';
      const approvalStatus = registerType === 'guest' ? 'approved' : 'pending_approval';
      const authMetadata = {
        name: cleanedName,
        batch: cleanedBatch,
        faculty: cleanedFaculty,
        major: cleanedMajor,
        member_type: memberType,
        caption,
        ...(registerType === 'udf'
          ? {
              birthdate,
              username: cleanedUsername,
            }
          : {
              delegation_status: delegationStatus,
            }),
      };

      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: authMetadata,
          },
        }),
        'Register',
      );

      if (error) {
        setMessage(`Daftar gagal: ${error.message}`);
        return;
      }

      if (data.session?.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          user_id: data.session.user.id,
          email: data.session.user.email,
          name: cleanedName,
          caption,
          bio: '',
          avatar_initials: initialsFromName(cleanedName),
          avatar_color: 'blue',
          system_role: systemRole,
          approval_status: approvalStatus,
          batch: cleanedBatch || null,
          birthdate: registerType === 'udf' ? birthdate || null : null,
          username: registerType === 'udf' ? cleanedUsername : null,
          faculty: cleanedFaculty,
          major: cleanedMajor,
          delegation_status: registerType === 'guest' ? delegationStatus : null,
          member_type: memberType,
          debating_experience: null,
          discord_roles: [],
          contact_links: {},
          privacy_settings: {},
          achievements: [],
        }, { onConflict: 'user_id' });

        if (profileError) {
          setMessage(`Akun dibuat, tapi profil gagal disimpan: ${profileError.message}`);
          return;
        }

        setMessage(registerType === 'guest' ? 'Akun guest berhasil dibuat.' : 'Akun berhasil dibuat. Profilmu masuk antrean approval EB/Admin.');
        router.push('/my-profile');
        router.refresh();
        return;
      }

      setMessage(registerType === 'guest' ? 'Akun guest berhasil dibuat. Cek email untuk verifikasi, lalu login.' : 'Akun berhasil dibuat. Cek email untuk verifikasi, lalu login. Profil akan masuk antrean approval EB/Admin.');
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
            <h3>{isRegister ? (registerType === 'guest' ? 'Daftar Guest' : 'Daftar Akun UDF') : 'Login to Debate Mate'}</h3>
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
              <div className="segmented" role="group" aria-label="Register type">
                <button className={`segment ${registerType === 'udf' ? 'active' : ''}`} type="button" onClick={() => setRegisterType('udf')}>Akun UDF</button>
                <button className={`segment ${registerType === 'guest' ? 'active' : ''}`} type="button" onClick={() => setRegisterType('guest')}>Guest</button>
              </div>
              <div>
                <label className="field-label" style={{ marginTop: 0 }}>{registerType === 'guest' ? 'Nama' : 'Nama Lengkap'}</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="field-label" style={{ marginTop: 0 }}>Batch</label>
                  <input className="input" placeholder="2025" value={batch} onChange={(e) => setBatch(e.target.value)} />
                </div>
                {registerType === 'udf' ? (
                  <div>
                    <label className="field-label" style={{ marginTop: 0 }}>Birthdate</label>
                    <input type="date" className="input" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
                  </div>
                ) : (
                  <div>
                    <label className="field-label" style={{ marginTop: 0 }}>Delegasi/non-delegasi</label>
                    <select className="input" value={delegationStatus} onChange={(e) => setDelegationStatus(e.target.value)}>
                      <option value="delegasi">Delegasi</option>
                      <option value="non-delegasi">Non-delegasi</option>
                    </select>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="field-label" style={{ marginTop: 0 }}>Fakultas</label>
                  <input className="input" value={faculty} onChange={(e) => setFaculty(e.target.value)} required />
                </div>
                <div>
                  <label className="field-label" style={{ marginTop: 0 }}>Jurusan</label>
                  <input className="input" value={major} onChange={(e) => setMajor(e.target.value)} required />
                </div>
              </div>
              {registerType === 'udf' && (
                <div>
                  <label className="field-label" style={{ marginTop: 0 }}>Username</label>
                  <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
              )}
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
            {authLoading ? 'Processing...' : isRegister ? (registerType === 'guest' ? 'Daftar Guest' : 'Daftar dan Minta Approval') : 'Login'}
          </button>
        </form>

        {isRegister && (
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.5, marginTop: '16px' }}>
            {registerType === 'guest' ? 'Akun guest bisa menggunakan QR presensi setelah login.' : 'Akun UDF baru akan masuk antrean approval EB/Admin. Pengalaman debat tidak diminta saat pendaftaran.'}
          </p>
        )}
      </article>
    </section>
  );
}
