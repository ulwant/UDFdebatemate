'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Topbar from '@/app/components/Topbar';
import styles from './AuditLog.module.css';

type AuditLog = {
  id: string;
  created_at: string;
  actor_id: string | null;
  action_type: string;
  details: any;
  profiles: {
    name: string;
    system_role: string;
  } | null;
};

export default function AuditLogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function boot() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('system_role').eq('user_id', session.user.id).single();
      if (profile?.system_role !== 'admin') {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      fetchLogs();
    }
    boot();
  }, [router]);

  async function fetchLogs() {
    setLoading(true);
    const { data: logsData, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      console.error('Error fetching logs:', logsError.message);
      setLoading(false);
      return;
    }

    const logs = (logsData || []) as any[];
    if (logs.length > 0) {
      // Fetch profiles manually to avoid schema relationship errors
      const actorIds = [...new Set(logs.map(log => log.actor_id).filter(Boolean))];
      if (actorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, system_role')
          .in('user_id', actorIds);

        if (profilesData) {
          const profileMap = Object.fromEntries(profilesData.map(p => [p.user_id, p]));
          for (const log of logs) {
            log.profiles = profileMap[log.actor_id] || null;
          }
        }
      }
    }

    setLogs(logs);
    setLoading(false);
  }

  if (!isAdmin && loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <article className="panel">
        <div className={styles.header}>
          <div>
            <p className="eyebrow">Keamanan & Riwayat</p>
            <h3>System Audit Log</h3>
          </div>
          <button className="ghost-button" type="button" onClick={fetchLogs} disabled={loading}>Refresh</button>
        </div>

        {loading ? (
          <p className={styles.empty}>Memuat logs...</p>
        ) : logs.length === 0 ? (
          <p className={styles.empty}>Belum ada log aktivitas.</p>
        ) : (
          <div className={styles.logList}>
            {logs.map((log) => (
              <div key={log.id} className={styles.logItem}>
                <div className={styles.logMeta}>
                  <span className={styles.time}>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                  <span className={styles.actor}>{log.profiles?.name || 'System / Unknown'}</span>
                  <span className={styles.role}>{log.profiles?.system_role || 'user'}</span>
                </div>
                <div className={styles.logAction}>
                  <strong style={{ color: log.action_type.startsWith('DELETE') ? '#dc2626' : 'var(--blue)' }}>
                    {(() => {
                      const parts = log.action_type.split('_');
                      const op = parts[0];
                      const table = parts.slice(1).join(' ').toLowerCase();
                      if (op === 'UPDATE') return `Memperbarui data di tabel ${table}`;
                      if (op === 'INSERT') return `Menambahkan data baru ke tabel ${table}`;
                      if (op === 'DELETE') return `Menghapus data dari tabel ${table}`;
                      return log.action_type.replace(/_/g, ' ');
                    })()}
                  </strong>
                  
                  <div className={styles.logReadable}>
                    {(() => {
                      const details = log.details || {};
                      const changes = [];
                      for (const [key, value] of Object.entries(details)) {
                        if (key === 'record_id' || key === 'deleted') continue;
                        
                        let valStr = String(value);
                        if (typeof value === 'boolean') valStr = value ? 'Aktif / Ya' : 'Nonaktif / Tidak';
                        else if (typeof value === 'object') valStr = 'Format data kompleks';
                        
                        changes.push(`mengubah ${key.replace(/_/g, ' ')} menjadi "${valStr}"`);
                      }
                      
                      if (changes.length > 0) {
                        return <p><strong>Aktivitas:</strong> {changes.join(', ')} (Target ID: <code>{details.record_id?.substring(0,8)}...</code>)</p>;
                      }
                      
                      if (details.record_id) {
                        return <p><strong>Target ID:</strong> <code>{details.record_id}</code></p>;
                      }
                      
                      return <pre>{JSON.stringify(details, null, 2)}</pre>;
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
