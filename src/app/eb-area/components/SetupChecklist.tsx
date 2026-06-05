import styles from '../../my-profile/MyProfile.module.css';

export default function SetupChecklist() {
  return (
    <div className="panel" style={{ margin: '0 0 14px', background: 'var(--paper)' }}>
      <p className="eyebrow">Admin setup checklist</p>
      <strong>Pastikan SQL pendukung sudah dideploy sebelum memakai aksi admin.</strong>
      <p className={styles.subtle} style={{ marginTop: 6 }}>
        Jalankan <code>supabase_user_deletion.sql</code> untuk tombol Hapus, <code>supabase_major_and_calendar_color.sql</code> untuk field fakultas/jurusan, dan <code>supabase_motion_submissions.sql</code> untuk review motion member.
      </p>
    </div>
  );
}
