'use client';

import React, { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './MyProfile.module.css';
import { useToast } from '@/app/components/ToastContext';
import { useUser } from '@/lib/UserContext';
import { DEFAULT_PRIVACY_SETTINGS, hexToRgb, PrivacySettings, readableTextColor, rgbToHex } from '@/lib/profileUtils';

const DISCORD_COLORS = [
  '#5865F2', '#EB459E', '#ED4245', '#FEE75C', '#57F287', 
  '#1ABC9C', '#3498DB', '#9B59B6', '#E91E63', '#175B45'
];

export default function AccountSettings() {
  const { profile } = useUser();
  const profileId = profile?.id;
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'security' | 'preferences' | 'privacy'>('security');
  
  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Privacy State
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);

  const loadPrivacySettings = useCallback(async () => {
    if (!profileId) return;
    setLoadingPrivacy(true);
    const { data, error } = await supabase.from('profiles').select('privacy_settings').eq('id', profileId).single();
    if (!error && data) {
      setPrivacySettings({ ...DEFAULT_PRIVACY_SETTINGS, ...(data.privacy_settings || {}) });
    }
    setLoadingPrivacy(false);
  }, [profileId]);

  const savePrivacySettings = async () => {
    if (!profileId) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ privacy_settings: privacySettings }).eq('id', profileId);
    if (error) {
      addToast({ title: 'Terjadi Kesalahan', message: 'Gagal memperbarui pengaturan privasi', type: 'error' });
    } else {
      addToast({ title: 'Berhasil', message: 'Pengaturan privasi berhasil diperbarui', type: 'success' });
    }
    setLoading(false);
  };

  React.useEffect(() => {
    if (activeTab === 'privacy') {
      const timer = window.setTimeout(() => { void loadPrivacySettings(); }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [activeTab, loadPrivacySettings]);

  // Preferences State
  const [themeColor, setThemeColor] = useState(() => {
    if (typeof window === 'undefined') return '#175b45';
    return localStorage.getItem('theme-color') || '#175b45';
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dark-mode') === 'true';
  });

  const applyColor = (color: string) => {
    const { r, g, b } = hexToRgb(color);
    setThemeColor(color);
    document.documentElement.style.setProperty('--green', color);
    document.documentElement.style.setProperty('--green-rgb', `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty('--green-soft', `rgba(${r}, ${g}, ${b}, 0.14)`);
    document.documentElement.style.setProperty('--green-contrast', readableTextColor(color));
  };

  const applyRgbColor = (channel: 'r' | 'g' | 'b', value: string) => {
    const current = hexToRgb(themeColor);
    const next = Math.max(0, Math.min(255, Number(value) || 0));
    applyColor(rgbToHex(
      channel === 'r' ? next : current.r,
      channel === 'g' ? next : current.g,
      channel === 'b' ? next : current.b,
    ));
  };

  const toggleDarkMode = (isDark: boolean) => {
    setDarkMode(isDark);
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const savePreferences = () => {
    localStorage.setItem('theme-color', themeColor);
    localStorage.setItem('dark-mode', String(darkMode));
    addToast({ title: 'Tema Diperbarui', message: `Warna telah diperbaharui.`, type: 'info', duration: 2000 });
  };

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      addToast({ title: 'Password Terlalu Pendek', message: 'Password baru minimal 6 karakter.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('Sesi tidak ditemukan.');

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (signInError) throw new Error('Password saat ini salah.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      
      addToast({ title: 'Berhasil', message: 'Password Anda berhasil diperbarui!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      addToast({ title: 'Gagal', message: err instanceof Error ? err.message : 'Terjadi kesalahan', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      addToast({ title: 'Format Tidak Valid', message: 'Harap masukkan alamat email yang benar.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      addToast({ title: 'Konfirmasi Dikirim', message: 'Silakan periksa email baru Anda untuk verifikasi.', type: 'success' });
      setNewEmail('');
    } catch (err) {
      addToast({ title: 'Gagal', message: err instanceof Error ? err.message : 'Terjadi kesalahan', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const [deletePassword1, setDeletePassword1] = useState('');
  const [deletePassword2, setDeletePassword2] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!deletePassword1 || !deletePassword2) {
      addToast({ title: 'Data Tidak Lengkap', message: 'Harap masukkan password di kedua kolom.', type: 'error' });
      return;
    }
    if (deletePassword1 !== deletePassword2) {
      addToast({ title: 'Password Tidak Cocok', message: 'Password yang dimasukkan tidak sama.', type: 'error' });
      return;
    }
    const confirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
    if (!confirmed) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('Sesi tidak ditemukan.');

      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: deletePassword1,
      });
      if (signInError) throw new Error('Password salah.');

      // Proceed to delete via RPC
      const { error: deleteError } = await supabase.rpc('delete_own_user');
      if (deleteError) throw deleteError;

      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      addToast({ title: 'Gagal', message: err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus akun', type: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.settingsNav}>
        <button className={activeTab === 'security' ? 'primary-button' : 'ghost-button'} onClick={() => setActiveTab('security')}>Security & Email</button>
        <button className={activeTab === 'preferences' ? 'primary-button' : 'ghost-button'} onClick={() => setActiveTab('preferences')}>Preferences & Theme</button>
        <button className={activeTab === 'privacy' ? 'primary-button' : 'ghost-button'} onClick={() => setActiveTab('privacy')}>Privacy</button>
      </div>

      <article className="panel" style={{ marginTop: '20px' }}>
        {activeTab === 'security' && (
          <div style={{ padding: '1.5rem', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '5px' }}>Security Settings</h3>
            <p style={{ marginBottom: '20px', color: 'var(--muted)', fontSize: '0.9rem' }}>Update your account email and password.</p>
            
            <form onSubmit={handleChangeEmail} className={styles.settingsForm} style={{ marginBottom: '30px' }}>
              <div className={styles.settingsFormGroup}>
                <label>Change Email Address</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="email" className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={profile?.email || "new@email.com"} />
                  <button type="submit" className="secondary-button" disabled={loading}>Update</button>
                </div>
              </div>
            </form>

            <form onSubmit={handleChangePassword} className={styles.settingsForm}>
              <div className={styles.settingsFormGroup}>
                <label>Current Password</label>
                <input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Required to change password" />
              </div>
              <div className={styles.settingsFormGroup}>
                <label>New Password</label>
                <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
              </div>
              <button type="submit" className="primary-button" disabled={loading} style={{ marginTop: '10px' }}>Change Password</button>
            </form>

            <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid var(--line)' }} />

            <h3 style={{ marginBottom: '5px', color: '#dc2626' }}>Delete Account</h3>
            <p style={{ marginBottom: '20px', color: 'var(--muted)', fontSize: '0.9rem' }}>Permanent action. Confirm with your password twice.</p>
            
            <form onSubmit={handleDeleteAccount} className={styles.settingsForm}>
              <div className={styles.settingsFormGroup}>
                <label>Password</label>
                <input type="password" className="input" value={deletePassword1} onChange={(e) => setDeletePassword1(e.target.value)} placeholder="Enter password" />
              </div>
              <div className={styles.settingsFormGroup}>
                <label>Confirm Password</label>
                <input type="password" className="input" value={deletePassword2} onChange={(e) => setDeletePassword2(e.target.value)} placeholder="Type password again" />
              </div>
              <button type="submit" className="primary-button" disabled={deleting} style={{ marginTop: '10px', background: '#dc2626', borderColor: '#b91c1c' }}>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div style={{ padding: '1.5rem', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '5px' }}>App Preferences</h3>
            <p style={{ marginBottom: '25px', color: 'var(--muted)', fontSize: '0.9rem' }}>Customize your Debate Mate experience.</p>

            <div className={styles.settingsFormGroup} style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 800 }}>Dark Mode</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={!darkMode ? 'primary-button' : 'ghost-button'} onClick={() => toggleDarkMode(false)}>Light</button>
                <button className={darkMode ? 'primary-button' : 'ghost-button'} onClick={() => toggleDarkMode(true)}>Dark</button>
              </div>
            </div>

            <div className={styles.settingsFormGroup}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 800 }}>Theme Color</label>
              <div className={styles.rgbGrid} style={{ marginBottom: 12 }}>
                {(['r', 'g', 'b'] as const).map((channel) => (
                  <label key={channel}>
                    {channel.toUpperCase()}
                    <input
                      className="input"
                      type="number"
                      min={0}
                      max={255}
                      value={hexToRgb(themeColor)[channel]}
                      onChange={(e) => applyRgbColor(channel, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <input type="color" className="input" value={themeColor} onChange={(e) => applyColor(e.target.value)} style={{ maxWidth: 120, padding: 4, marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {DISCORD_COLORS.map(color => (
                  <button 
                    key={color}
                    type="button"
                    onClick={() => applyColor(color)}
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%', backgroundColor: color,
                      border: themeColor === color ? '3px solid var(--ink)' : '2px solid transparent',
                      cursor: 'pointer', outline: 'none', transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <button type="button" className="primary-button" onClick={savePreferences} style={{ marginTop: '20px' }}>
              Save Preferences
            </button>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ padding: '1.5rem', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '15px' }}>Privacy Settings</h3>
            <p style={{ marginBottom: '25px', color: 'var(--muted)', fontSize: '0.9rem' }}>
              Atur bagian profil mana yang dapat dilihat oleh anggota lain (Selain EB dan Admin).
            </p>
            
            {loadingPrivacy ? (
              <p>Memuat pengaturan...</p>
            ) : (
              <div className={styles.privacyGrid}>
                {[
                  ['birthdate', 'Birthdate'],
                  ['whatsapp', 'WhatsApp'],
                  ['instagram', 'Instagram'],
                  ['website', 'Website'],
                  ['bio', 'Full Bio'],
                  ['batch', 'Batch'],
                ].map(([key, label]) => (
                  <label key={key} className={styles.privacyToggle} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(privacySettings[key as keyof PrivacySettings])}
                      onChange={(e) => setPrivacySettings({
                        ...privacySettings,
                        [key]: e.target.checked,
                      })}
                      style={{ width: '18px', height: '18px' }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}

            <button 
              type="button" 
              className="primary-button" 
              onClick={savePrivacySettings} 
              disabled={loading || loadingPrivacy}
              style={{ marginTop: '20px' }}
            >
              {loading ? 'Menyimpan...' : 'Simpan Pengaturan Privasi'}
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
