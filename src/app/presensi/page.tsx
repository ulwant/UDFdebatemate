'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

type AuthSession = {
  user: {
    id: string;
  };
};

type WeeklySession = {
  id: string;
  title: string;
  scheduled_at: string;
  is_locked: boolean;
};

type AttendanceSession = {
  id: string;
  title: string;
  secret_token: string;
  expires_at: string;
};

type AttendanceRecord = {
  id: string;
  user_id: string;
  status: string;
  profiles?: {
    user_id: string;
    name: string;
  } | null;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

export default function PresensiPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [loading, setLoading] = useState(true);

  // EB State
  const [activeAttendanceSession, setActiveAttendanceSession] = useState<AttendanceSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [weeklySessions, setWeeklySessions] = useState<WeeklySession[]>([]);
  const [selectedWeeklyId, setSelectedWeeklyId] = useState('');
  const [endingSession, setEndingSession] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerMessage, setScannerMessage] = useState('');

  async function fetchActiveSession() {
    const { data } = await supabase
      .from('attendance_sessions')
      .select('id, title, secret_token, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveAttendanceSession(data as AttendanceSession);
    } else {
      setActiveAttendanceSession(null);
    }
  }

  async function fetchWeeklySessions() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data } = await supabase
      .from('weekly_sessions')
      .select('id, title, scheduled_at, is_locked')
      .gte('scheduled_at', monthStart)
      .lt('scheduled_at', monthEnd)
      .order('scheduled_at', { ascending: true });
    setWeeklySessions((data || []) as WeeklySession[]);
  }

  async function fetchRecords(sessionId: string) {
    const { data: recordsData, error: recordsError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (recordsError) {
      console.error('Error fetching records:', recordsError);
      return;
    }

    if (!recordsData || recordsData.length === 0) {
      setAttendanceRecords([]);
      return;
    }

    const userIds = recordsData.map((r) => r.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds);

    const mergedData = recordsData.map((record) => {
      const profile = profilesData?.find((p) => p.user_id === record.user_id);
      return {
        ...record,
        profiles: profile || null,
      };
    });

    setAttendanceRecords(mergedData as AttendanceRecord[]);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession((data.session as AuthSession | null) || null);
      if (data.session) {
        supabase.from('profiles').select('system_role').eq('user_id', data.session.user.id).single()
          .then(({ data: profileData }) => {
            if (profileData) {
              setUserRole(profileData.system_role);
              fetchActiveSession();
              if (profileData.system_role !== 'member') fetchWeeklySessions();
            }
            setLoading(false);
          });
      } else {
        router.push('/login');
      }
    });
  }, [router]);

  // Polling for new records
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeAttendanceSession && userRole !== 'member') {
      const immediateFetchTimer = setTimeout(() => {
        void fetchRecords(activeAttendanceSession.id);
      }, 0);
      interval = setInterval(() => fetchRecords(activeAttendanceSession.id), 5000);
      return () => {
        clearTimeout(immediateFetchTimer);
        clearInterval(interval);
      };
    }
    return () => clearInterval(interval);
  }, [activeAttendanceSession, userRole]);

  const generateSession = async () => {
    if (!newSessionTitle) return alert("Please enter a session title");
    if (!session) return alert("Please log in before creating an attendance session.");
    if (!selectedWeeklyId) return alert("Pilih weekly session terlebih dahulu");

    const selectedWeekly = weeklySessions.find((item) => item.id === selectedWeeklyId);
    if (!selectedWeekly) return alert("Weekly session tidak ditemukan");
    if (selectedWeekly.is_locked) return alert("Weekly session ini sudah terkunci");

    const { data: existingLinked } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('weekly_session_id', selectedWeeklyId)
      .maybeSingle();
    if (existingLinked) {
      return alert("Weekly session ini sudah punya QR session.");
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 min expiry

    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({
        title: newSessionTitle,
        expires_at: expiresAt.toISOString(),
        created_by: session.user.id,
        weekly_session_id: selectedWeeklyId,
      })
      .select()
      .single();

    if (error) {
      alert("Error: " + error.message + "\nMake sure you have run the supabase_rbac_presensi.sql script!");
    } else if (data) {
      setActiveAttendanceSession(data);
      setNewSessionTitle('');
      fetchWeeklySessions();
    }
  };

  async function endSession() {
    if (!activeAttendanceSession) return;
    setEndingSession(true);
    const { error } = await supabase
      .from('attendance_sessions')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', activeAttendanceSession.id);

    if (error) {
      alert(`Gagal end session: ${error.message}`);
      setEndingSession(false);
      return;
    }

    setActiveAttendanceSession(null);
    setAttendanceRecords([]);
    await fetchActiveSession();
    setEndingSession(false);
  }

  function stopCameraScanner() {
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
    scanFrameRef.current = null;
    scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    scannerStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScannerOpen(false);
  }

  async function startCameraScanner() {
    setScannerMessage('Opening camera...');

    if (typeof window === 'undefined') return;
    if (!window.isSecureContext) {
      setScannerMessage('Browser HP memblokir kamera di HTTP. Pakai HTTPS tunnel/deploy, atau scan QR dengan aplikasi kamera bawaan HP.');
      return;
    }

    const BarcodeDetector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!BarcodeDetector) {
      setScannerMessage('Browser ini belum support QR scanner bawaan. Pakai Chrome Android terbaru atau scan QR dengan aplikasi kamera HP.');
      return;
    }

    try {
      setScannerOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      scannerStreamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!videoRef.current || !scannerStreamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const rawValue = codes[0]?.rawValue;

          if (rawValue) {
            const url = new URL(rawValue);
            if (url.pathname !== '/presensi/scan') {
              setScannerMessage('QR terbaca, tapi bukan QR Presensi Debate Mate.');
              scanFrameRef.current = requestAnimationFrame(scan);
              return;
            }

            stopCameraScanner();
            router.push(`${url.pathname}${url.search}`);
            return;
          }
        } catch {
          setScannerMessage('Arahkan kamera ke QR presensi sampai terbaca.');
        }

        scanFrameRef.current = requestAnimationFrame(scan);
      };

      setScannerMessage('Arahkan kamera ke QR presensi.');
      scanFrameRef.current = requestAnimationFrame(scan);
    } catch (error) {
      stopCameraScanner();
      setScannerMessage(`Gagal membuka kamera: ${error instanceof Error ? error.message : 'Permission denied'}`);
    }
  }

  useEffect(() => {
    return () => stopCameraScanner();
  }, []);

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  const memberScanUrl = activeAttendanceSession
    ? `/presensi/scan?session_id=${activeAttendanceSession.id}&token=${activeAttendanceSession.secret_token}`
    : '';

  if (userRole === 'member') {
    return (
      <section className="section active-section" style={{ display: 'block' }}>
        <article className="panel" style={{ textAlign: 'center', padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
          <h2>Presensi QR</h2>
          <p style={{ color: 'var(--muted)', marginTop: '16px' }}>
            Please use your smartphone camera to scan the QR Code displayed on the projector by the Executive Board.
          </p>
          <div style={{ display: 'grid', gap: '10px', marginTop: '24px' }}>
            <button className="primary-button" type="button" onClick={startCameraScanner}>
              Scan QR with Camera
            </button>
            {scannerOpen && (
              <button className="secondary-button" type="button" onClick={stopCameraScanner}>
                Stop Camera
              </button>
            )}
          </div>
          {scannerMessage && (
            <p style={{ color: scannerMessage.includes('Gagal') || scannerMessage.includes('memblokir') || scannerMessage.includes('belum support') ? '#9f4f33' : 'var(--green)', fontWeight: 800, marginTop: '14px' }}>
              {scannerMessage}
            </p>
          )}
          {scannerOpen && (
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: '100%', maxWidth: '360px', marginTop: '16px', borderRadius: '12px', border: '1px solid var(--line)', background: '#101513' }}
            />
          )}
          {activeAttendanceSession ? (
            <div style={{ marginTop: '24px' }}>
              <p style={{ color: 'var(--green)', fontWeight: 800, marginBottom: '12px' }}>
                Active session: {activeAttendanceSession.title}
              </p>
              <button className="primary-button" type="button" onClick={() => router.push(memberScanUrl)}>
                Test Scan Active QR
              </button>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '12px' }}>
                Use this button for local HP testing when you are already logged in as Member.
              </p>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '20px' }}>
              No active QR session yet. Ask EB/Admin to generate one first.
            </p>
          )}
        </article>
      </section>
    );
  }

  const scanUrl = (activeAttendanceSession && typeof window !== 'undefined')
    ? `${window.location.origin}/presensi/scan?session_id=${activeAttendanceSession.id}&token=${activeAttendanceSession.secret_token}`
    : '';

  return (
    <section id="attendance" className="section active-section" style={{ display: 'block' }}>
      <div className="two-column">
        <article className="panel qr-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="panel-header" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Presensi QR</h3>
            <span className="rank-badge">EB / Admin</span>
          </div>

          {activeAttendanceSession ? (
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={{ margin: '0 0 16px', color: 'var(--green)' }}>{activeAttendanceSession.title}</h4>
              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid var(--line)', display: 'inline-block' }}>
                {scanUrl && <QRCodeSVG value={scanUrl} size={250} />}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button className="secondary-button" onClick={() => { navigator.clipboard.writeText(scanUrl); alert('Link copied! Open a new Incognito window and paste it to test as a Member.') }} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                  Copy Link (For Testing)
                </button>
                <a href={scanUrl} target="_blank" className="secondary-button" style={{ fontSize: '0.8rem', padding: '4px 8px', textDecoration: 'none' }}>
                  Open in New Tab
                </a>
              </div>

              <p style={{ marginTop: '16px', color: 'var(--muted)', fontSize: '0.9rem' }}>
                Expires at: {new Date(activeAttendanceSession.expires_at).toLocaleTimeString()}
              </p>
              <button className="ghost-button" onClick={endSession} disabled={endingSession} style={{ marginTop: '16px' }}>
                {endingSession ? 'Ending...' : 'End Session'}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '40px', width: '100%', maxWidth: '300px' }}>
              <label className="field-label" style={{ textAlign: 'left' }}>Weekly Session</label>
              <select
                className="input"
                value={selectedWeeklyId}
                onChange={e => setSelectedWeeklyId(e.target.value)}
                style={{ marginBottom: '12px' }}
              >
                <option value="">Pilih weekly</option>
                {weeklySessions.map((weekly) => (
                  <option key={weekly.id} value={weekly.id} disabled={weekly.is_locked}>
                    {weekly.title} - {new Date(weekly.scheduled_at).toLocaleDateString('id-ID')}
                    {weekly.is_locked ? ' (locked)' : ''}
                  </option>
                ))}
              </select>
              <label className="field-label" style={{ textAlign: 'left' }}>Session Title</label>
              <input
                className="input"
                placeholder="e.g. Latrut Minggu 1"
                value={newSessionTitle}
                onChange={e => setNewSessionTitle(e.target.value)}
                style={{ marginBottom: '16px' }}
              />
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'left' }}>
                QR dibuat per sesi training dengan expiry pendek (15 menit) untuk mengurangi titip absen.
              </p>
              <button className="primary-button" onClick={generateSession} style={{ width: '100%' }}>Generate QR Session</button>
            </div>
          )}
        </article>

        <article className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0 }}>Attendance Tracker</h3>
            <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{attendanceRecords.length} Present</span>
          </div>

          <div className="table-list">
            {attendanceRecords.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No attendees yet. Display the QR code for members to scan.</p>
            ) : (
              attendanceRecords.map(record => (
                <div key={record.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontWeight: 600 }}>{record.profiles?.name || 'Unknown User'}</span>
                  <strong style={{ color: 'var(--green)' }}>{record.status}</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
