'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from './AuditLog.module.css';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type AuditLog = {
  id: string;
  created_at: string;
  actor_id: string | null;
  action_type: string;
  details: Record<string, JsonValue> | null;
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
  const [accessDenied, setAccessDenied] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  function groupLogsByDate(logsToGroup: AuditLog[]) {
    const grouped: Record<string, AuditLog[]> = {};
    for (const log of logsToGroup) {
      const d = new Date(log.created_at);
      const dateKey = d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(log);
    }
    return grouped;
  }

  useEffect(() => {
    async function boot() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('system_role').eq('user_id', session.user.id).single();
      if (profile?.system_role !== 'admin') {
        setAccessDenied(true);
        window.setTimeout(() => router.push('/'), 1800);
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    }
    boot();
  }, [router]);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin, selectedDate]);

  async function fetchLogs() {
    setLoading(true);
    
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: logsData, error: logsError } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('Error fetching logs:', logsError.message);
      setLoading(false);
      return;
    }

    const logs = (logsData || []) as AuditLog[];
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
            log.profiles = log.actor_id ? profileMap[log.actor_id] || null : null;
          }
        }
      }
    }

    setLogs(logs);
    setLoading(false);
  }

  if (accessDenied) {
    return (
      <section className="section active-section" style={{ display: 'block' }}>
        <article className="panel">
          <p className="eyebrow">Access denied</p>
          <h3>Audit Log hanya tersedia untuk Admin.</h3>
          <p className={styles.empty}>Kamu akan diarahkan kembali ke dashboard.</p>
        </article>
      </section>
    );
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
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="date" 
              className="input" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              style={{ padding: '6px 12px', minHeight: '36px' }}
            />
            <button className="ghost-button" type="button" onClick={fetchLogs} disabled={loading}>Refresh</button>
          </div>
        </div>

        {loading ? (
          <p className={styles.empty}>Memuat logs...</p>
        ) : logs.length === 0 ? (
          <p className={styles.empty}>Belum ada log aktivitas.</p>
        ) : (
          <div className={styles.logList}>
            {Object.entries(groupLogsByDate(logs)).map(([dateKey, dayLogs]) => (
              <div key={dateKey}>
                <h4 style={{ margin: '24px 0 12px', paddingBottom: '8px', borderBottom: '1px solid var(--line)', color: 'var(--muted)' }}>{dateKey}</h4>
                {dayLogs.map((log) => (
                  <div key={log.id} className={styles.logItem}>
                    <div className={styles.logMeta}>
                      <span className={styles.time}>{new Date(log.created_at).toLocaleTimeString('id-ID')}</span>
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
                            return <p><strong>Aktivitas:</strong> {changes.join(', ')} (Target ID: <code>{String(details.record_id || '').substring(0, 8)}...</code>)</p>;
                          }
                          
                          if (details.record_id) {
                            return <p><strong>Target ID:</strong> <code>{String(details.record_id)}</code></p>;
                          }
                          
                          return <pre>{JSON.stringify(details, null, 2)}</pre>;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
