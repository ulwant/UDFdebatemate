'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './MyProfile.module.css';
import { useToast } from '@/app/components/ToastContext';
import { useUser } from '@/lib/UserContext';

const DISCORD_COLORS = [
  '#5865F2', '#EB459E', '#ED4245', '#FEE75C', '#57F287', 
  '#1ABC9C', '#3498DB', '#9B59B6', '#E91E63', '#175B45'
];

export default function AccountSettings() {
  const { profile } = useUser();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'security' | 'preferences' | 'privacy'>('security');
  
  // Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // Preferences State
  const [themeColor, setThemeColor] = useState('#175b45');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Load preferences from local storage or profile if available
    const savedColor = localStorage.getItem('theme-color');
    const savedTheme = localStorage.getItem('dark-mode');
    if (savedColor) setThemeColor(savedColor);
    if (savedTheme === 'true') setDarkMode(true);
  }, []);

  const applyColor = (color: string) => {
    setThemeColor(color);
    localStorage.setItem('theme-color', color);
    document.documentElement.style.setProperty('--green', color);
    // Darken color slightly for border/hover effects
    document.documentElement.style.setProperty('--green-soft', `${color}22`);
    addToast({ title: 'Tema Diperbarui', message: `Warna aksen berhasil diganti.`, type: 'info', duration: 2000 });
  };

  const toggleDarkMode = (isDark: boolean) => {
    setDarkMode(isDark);
    localStorage.setItem('dark-mode', String(isDark));
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    addToast({ title: 'Tampilan Diperbarui', type: 'info', duration: 2000 });
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
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ padding: '1.5rem', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '5px' }}>Privacy Settings</h3>
            <p style={{ marginBottom: '25px', color: 'var(--muted)', fontSize: '0.9rem' }}>Manage who can see your profile and activity.</p>
            
            <div className={styles.settingsFormGroup}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 800 }}>Profile Visibility</label>
              <select className="input" defaultValue="public">
                <option value="public">Public (Visible to everyone)</option>
                <option value="members">Members Only</option>
                <option value="private">Private (Only EB/Admin)</option>
              </select>
            </div>
            
            <button className="primary-button" style={{ marginTop: '20px' }}>Save Privacy Options</button>
          </div>
        )}
      </article>
    </div>
  );
}
