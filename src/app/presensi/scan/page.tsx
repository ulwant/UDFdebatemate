'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { notifyCurrentUser } from '@/lib/notifications';

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const token = searchParams.get('token');
  const isInvalidQr = !sessionId || !token;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying QR Code...');

  async function recordAttendance(resolvedSessionId: string, resolvedToken: string) {
    // 1. Check if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setStatus('error');
      setMessage('You must be logged in to record attendance. Please log in and scan the QR code again.');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    // 2. Verify Session
    const { data: sessionData, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', resolvedSessionId)
      .eq('secret_token', resolvedToken)
      .single();

    if (sessionError || !sessionData) {
      setStatus('error');
      setMessage('Invalid or expired QR Code.');
      return;
    }

    if (new Date(sessionData.expires_at) < new Date()) {
      setStatus('error');
      setMessage('This QR Code has expired. Please ask the EB to generate a new one.');
      return;
    }

    if (sessionData.weekly_session_id) {
      const { data: weeklyData } = await supabase
        .from('weekly_sessions')
        .select('is_locked')
        .eq('id', sessionData.weekly_session_id)
        .maybeSingle();

      if (weeklyData?.is_locked) {
        setStatus('error');
        setMessage('Presensi weekly ini sudah dikunci oleh EB.');
        return;
      }
    }

    // 3. Record Attendance
    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert({
        session_id: resolvedSessionId,
        user_id: session.user.id,
        status: 'Present'
      });

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        setStatus('success');
        setMessage('You have already recorded your attendance for this session!');
      } else {
        setStatus('error');
        setMessage('Failed to record attendance: ' + insertError.message);
      }
    } else {
      setStatus('success');
      setMessage(`Successfully recorded attendance for: ${sessionData.title}`);
      await notifyCurrentUser({
        title: 'Attendance Recorded',
        message: `Presensi kamu untuk "${sessionData.title}" berhasil tercatat.`,
        link: '/presensi',
        type: 'attendance',
      });
    }
  }

  useEffect(() => {
    if (isInvalidQr || !sessionId || !token) return;
    const timer = setTimeout(() => {
      void recordAttendance(sessionId, token);
    }, 0);
    return () => clearTimeout(timer);
  }, [isInvalidQr, sessionId, token]);

  return (
    <article className="panel" style={{ textAlign: 'center', padding: '40px', maxWidth: '500px', margin: '40px auto' }}>
      {(isInvalidQr ? 'error' : status) === 'loading' && (
        <>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--line)', borderTopColor: 'var(--green)', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ margin: 0, color: 'var(--ink)' }}>Verifying...</h2>
        </>
      )}
      
      {(isInvalidQr ? 'error' : status) === 'success' && (
        <>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
          <h2 style={{ margin: '0 0 16px', color: 'var(--green)' }}>Attendance Recorded</h2>
        </>
      )}
      
      {(isInvalidQr ? 'error' : status) === 'error' && (
        <>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>❌</div>
          <h2 style={{ margin: '0 0 16px', color: '#bf616a' }}>Verification Failed</h2>
        </>
      )}
      
      <p style={{ color: 'var(--muted)', fontSize: '1.1rem', lineHeight: 1.5 }}>
        {isInvalidQr ? 'Invalid QR Code. Missing session data.' : message}
      </p>
      
      {(isInvalidQr ? 'error' : status) !== 'loading' && (
        <button className="secondary-button" onClick={() => router.push('/')} style={{ marginTop: '24px' }}>
          Go to Dashboard
        </button>
      )}
    </article>
  );
}

export default function ScanPage() {
  return (
    <section className="section active-section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <Suspense fallback={<div style={{ textAlign: 'center', width: '100%' }}>Loading scanner...</div>}>
        <ScanContent />
      </Suspense>
    </section>
  );
}
