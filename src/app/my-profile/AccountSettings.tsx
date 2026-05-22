'use client';

import React, { useState } from 'react';

import { supabase } from '@/lib/supabaseClient';
import styles from './MyProfile.module.css';

export default function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Semua field password harus diisi.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Password baru dan konfirmasi tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password baru minimal 6 karakter.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) { setMessage('Sesi tidak ditemukan.'); return; }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });
      if (signInError) { setMessage('Password saat ini salah.'); return; }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setMessage(`Gagal mengubah password: ${updateError.message}`);
      } else {
        setMessage('✓ Password berhasil diubah!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.tabContent}>
      <article className="panel">
        <div className="panel-header">
          <h3>Account Settings</h3>
        </div>
        <div style={{ padding: '1.5rem', maxWidth: '480px' }}>
          <p style={{ marginBottom: '1.25rem', opacity: 0.7 }}>Update your login password below.</p>
          <form onSubmit={handleChangePassword} className={styles.settingsForm}>
            <div className={styles.settingsFormGroup}>
              <label htmlFor="currentPass">Current Password</label>
              <input
                id="currentPass"
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />
            </div>
            <div className={styles.settingsFormGroup}>
              <label htmlFor="newPass">New Password</label>
              <input
                id="newPass"
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className={styles.settingsFormGroup}>
              <label htmlFor="confirmPass">Confirm New Password</label>
              <input
                id="confirmPass"
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
            </div>
            <div className={styles.settingsFormActions}>
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Changing...' : 'Update Password'}
              </button>
              {message && (
                <span
                  className={styles.settingsMessage}
                  style={{ color: message.startsWith('✓') ? '#16a34a' : '#dc2626' }}
                >
                  {message}
                </span>
              )}
            </div>
          </form>
        </div>
      </article>
    </div>
  );
}
