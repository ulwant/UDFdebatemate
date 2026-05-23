'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/app/components/ToastContext';
import styles from './RoomTimer.module.css';

type FormatType = 'AP' | 'BP';
type Role = 'host' | 'member';
type Phase = 'join' | 'create' | 'lobby' | 'live';
type RoomPhase = 'lobby' | 'live' | 'terminated';
type Speech = { name: string; side: string; type: 'main' | 'reply' };
type SpeechRecord = {
  speechIndex: number;
  speechName: string;
  side: string;
  startedAt: number;
  stoppedAt: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  overtimeSeconds: number;
};
type RoomSnapshot = {
  code: string;
  name: string;
  phase: RoomPhase;
  format: FormatType;
  speechMinutes: number;
  speechSeconds: number;
  replyMinutes: number;
  replySeconds: number;
  currentSpeech: number;
  running: boolean;
  duration: number;
  remaining: number;
  startedAt: number | null;
  poiEnabled: boolean;
  poiActive: boolean;
  poiStartedAt: number | null;
  poiResumeRunning: boolean;
  viewSpeech?: number;
  runningSpeech?: number | null;
  speechRecords?: Record<string, SpeechRecord>;
  sequence_number?: number;
  server_synced_at?: number;
};
type Participant = {
  id: string;
  room_code: string;
  name: string;
  role: Role;
  joined_at: string;
  side?: string;
  speaker_role?: string;
  reply_speaker_role?: string;
};

const formats: Record<FormatType, { label: string; speeches: Speech[] }> = {
  AP: {
    label: 'Asian Parliamentary',
    speeches: [
      { name: 'Prime Minister', side: 'Government', type: 'main' },
      { name: 'Leader of Opposition', side: 'Opposition', type: 'main' },
      { name: 'Deputy Prime Minister', side: 'Government', type: 'main' },
      { name: 'Deputy Leader of Opposition', side: 'Opposition', type: 'main' },
      { name: 'Government Whip', side: 'Government', type: 'main' },
      { name: 'Opposition Whip', side: 'Opposition', type: 'main' },
      { name: 'Opposition Reply', side: 'Opposition', type: 'reply' },
      { name: 'Government Reply', side: 'Government', type: 'reply' },
    ],
  },
  BP: {
    label: 'British Parliamentary',
    speeches: [
      { name: 'Prime Minister', side: 'Opening Government', type: 'main' },
      { name: 'Leader of Opposition', side: 'Opening Opposition', type: 'main' },
      { name: 'Deputy Prime Minister', side: 'Opening Government', type: 'main' },
      { name: 'Deputy Leader of Opposition', side: 'Opening Opposition', type: 'main' },
      { name: 'Member of Government', side: 'Closing Government', type: 'main' },
      { name: 'Member of Opposition', side: 'Closing Opposition', type: 'main' },
      { name: 'Government Whip', side: 'Closing Government', type: 'main' },
      { name: 'Opposition Whip', side: 'Closing Opposition', type: 'main' },
    ],
  },
};

function nowMs() {
  return new Date().getTime();
}

function makePin() {
  const number = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(number).padStart(6, '0');
}

function makeGuestName() {
  return `Guest ${String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000).padStart(3, '0')}`;
}

function getDuration(type: 'main' | 'reply', speechMin: number, speechSec: number, replyMin: number, replySec: number) {
  return Math.max(1, type === 'reply' ? replyMin * 60 + replySec : speechMin * 60 + speechSec);
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${minutes}:${secs}`;
}

function formatClock(ms: number) {
  return new Date(ms).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function clampIndex(index: number, max: number) {
  return Math.min(Math.max(0, index), Math.max(0, max - 1));
}

function asSnapshot(value: unknown): RoomSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  return value as RoomSnapshot;
}

function isActiveRoomPhase(phase: RoomPhase): phase is 'lobby' | 'live' {
  return phase === 'lobby' || phase === 'live';
}

export default function RoomTimerPage() {
  const [phase, setPhase] = useState<Phase>('join');
  const [role, setRole] = useState<Role>('member');
  const [pin, setPin] = useState('');
  const [displayName, setDisplayName] = useState(makeGuestName);
  const [playerSide, setPlayerSide] = useState('Observer');
  const [playerRole] = useState('');
  const [roomName, setRoomName] = useState('UDF Debate Room');
  const [format, setFormat] = useState<FormatType>('AP');
  const [speechMinutes, setSpeechMinutes] = useState(7);
  const [speechSeconds, setSpeechSeconds] = useState(20);
  const [replyMinutes, setReplyMinutes] = useState(4);
  const [replySeconds, setReplySeconds] = useState(20);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { addToast } = useToast();
  const setNotice = (msg: string) => {
    if (!msg) return;
    const isError = msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('terminated');
    addToast({ title: isError ? 'Terjadi Kesalahan' : 'Pemberitahuan', message: msg, type: isError ? 'error' : 'success' });
  };
  const [now, setNow] = useState(nowMs());
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [roomBusy, setRoomBusy] = useState(false);
  const latestViewSpeechRef = useRef(0);
  const lastLocalViewChangeRef = useRef(0);
  const viewSaveCounterRef = useRef(0);
  const realtimeSubscriptionRef = useRef<any>(null);

  function updateLocalConfig(
    nextFormat: FormatType,
    nextSpeechMinutes: number,
    nextSpeechSeconds: number,
    nextReplyMinutes: number,
    nextReplySeconds: number
  ) {
    setFormat(nextFormat);
    setSpeechMinutes(nextSpeechMinutes);
    setSpeechSeconds(nextSpeechSeconds);
    setReplyMinutes(nextReplyMinutes);
    setReplySeconds(nextReplySeconds);
  }

  function syncLocalConfig(nextSnapshot: RoomSnapshot) {
    setRoomName(nextSnapshot.name);
    setFormat(nextSnapshot.format);
    setSpeechMinutes(nextSnapshot.speechMinutes);
    setSpeechSeconds(nextSnapshot.speechSeconds);
    setReplyMinutes(nextSnapshot.replyMinutes);
    setReplySeconds(nextSnapshot.replySeconds);
  }

  const canControl = role === 'host';
  const activeFormat = snapshot?.format || format;
  const speeches = formats[activeFormat].speeches;
  const viewSpeechIndex = clampIndex(snapshot?.viewSpeech ?? snapshot?.currentSpeech ?? 0, speeches.length);
  const runningSpeechIndex = typeof snapshot?.runningSpeech === 'number'
    ? clampIndex(snapshot.runningSpeech, speeches.length)
    : snapshot?.running
      ? clampIndex(snapshot.currentSpeech, speeches.length)
      : null;
  const activeSpeech = speeches[viewSpeechIndex] || speeches[0];
  const runningSpeech = runningSpeechIndex !== null ? speeches[runningSpeechIndex] : null;
  const formatSides = Array.from(new Set(speeches.map(s => s.side)));
  const myParticipant = participants.find(p => p.id === participantId);
  const speechRecords = snapshot?.speechRecords || {};
  const activeRecord = speechRecords[String(viewSpeechIndex)];

  async function updateMyRole(newSide: string, newRole: string, newReplyRole = myParticipant?.reply_speaker_role || '') {
    if (!participantId) return;
    await supabase
      .from('debate_timer_participants')
      .update({ side: newSide, speaker_role: newRole, reply_speaker_role: newReplyRole })
      .eq('id', participantId);
  }

  function durationFor(index: number) {
    const speech = speeches[clampIndex(index, speeches.length)] || speeches[0];
    return getDuration(
      speech.type,
      snapshot?.speechMinutes ?? speechMinutes,
      snapshot?.speechSeconds ?? speechSeconds,
      snapshot?.replyMinutes ?? replyMinutes,
      snapshot?.replySeconds ?? replySeconds
    );
  }

  const runningRemaining = useMemo(() => {
    if (!snapshot || !snapshot.running || !snapshot.startedAt || runningSpeechIndex === null) return snapshot?.remaining ?? null;
    
    // Use smoothly ticking server time reference
    const timeReference = now + serverTimeOffset;
    const startRef = snapshot.startedAt;
    
    // Calculate elapsed seconds from server time
    const elapsed = (timeReference - startRef) / 1000;
    return snapshot.remaining - elapsed;
  }, [now, serverTimeOffset, runningSpeechIndex, snapshot]);

  const duration = durationFor(viewSpeechIndex);
  const currentRemaining = useMemo(() => {
    if (!snapshot) return getDuration('main', speechMinutes, speechSeconds, replyMinutes, replySeconds);
    if (runningSpeechIndex === viewSpeechIndex && typeof runningRemaining === 'number') return runningRemaining;
    if (!snapshot.running && snapshot.currentSpeech === viewSpeechIndex) return snapshot.remaining;
    if (activeRecord) return activeRecord.remainingSeconds;
    return duration;
  }, [activeRecord, duration, replyMinutes, replySeconds, runningRemaining, runningSpeechIndex, snapshot, speechMinutes, speechSeconds, viewSpeechIndex]);
  const elapsed = duration - currentRemaining;
  const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
  const activeOvertime = Math.max(0, Math.ceil(-currentRemaining));
  const isViewingRunningSpeech = runningSpeechIndex === viewSpeechIndex && Boolean(snapshot?.running);
  const poiCountdown = snapshot?.poiActive && snapshot.poiStartedAt 
    ? Math.max(0, 15 - ((now + serverTimeOffset) - snapshot.poiStartedAt) / 1000) 
    : 0;
  const isPoiLocked = activeSpeech.type !== 'reply' && (elapsed < 60 || currentRemaining <= 60);
  const canUsePoi = Boolean(snapshot?.poiEnabled && isViewingRunningSpeech && activeSpeech.type !== 'reply' && !isPoiLocked);
  const timerTone = activeOvertime > 0
    ? styles.danger
    : activeSpeech.type !== 'reply' && currentRemaining <= 20 && currentRemaining > 0
    ? styles.danger
    : activeSpeech.type !== 'reply' && currentRemaining <= 60 && currentRemaining > 20
      ? styles.warning
      : '';
  const runningLabel = runningSpeech && typeof runningRemaining === 'number'
    ? `${runningSpeech.name} ${formatTime(runningRemaining)}`
    : '';
  const myReplyOptions = activeFormat === 'AP'
    ? speeches.filter(s => s.type === 'reply' && s.side === myParticipant?.side)
    : [];

  function mergeFreshLocalView(nextSnapshot: RoomSnapshot) {
    if (!canControl || nowMs() - lastLocalViewChangeRef.current > 2500) return nextSnapshot;
    const latestView = clampIndex(latestViewSpeechRef.current, formats[nextSnapshot.format].speeches.length);
    if ((nextSnapshot.viewSpeech ?? nextSnapshot.currentSpeech) === latestView) return nextSnapshot;
    return { ...nextSnapshot, viewSpeech: latestView };
  }

  async function saveSnapshot(next: RoomSnapshot) {
    setSnapshot(next);
    const { error } = await supabase
      .from('debate_timer_rooms')
      .update({
        phase: next.phase,
        snapshot: next,
        updated_at: new Date().toISOString(),
      })
      .eq('code', next.code);

    if (error) setNotice(`Gagal sync room: ${error.message}`);
  }

  async function getServerTime(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_server_time_ms');
      if (error) throw error;
      return data as number;
    } catch (error) {
      console.error('Failed to get server time:', error);
      return nowMs();
    }
  }

  function mergeSnapshotWithSequence(incoming: RoomSnapshot): RoomSnapshot | null {
    if (!snapshot) return incoming;
    
    const incomingSeq = incoming.sequence_number ?? 0;
    const currentSeq = snapshot.sequence_number ?? 0;
    
    // Reject stale updates - only apply if incoming sequence is greater
    if (incomingSeq <= currentSeq) {
      return null;
    }
    
    return incoming;
  }

  async function fetchRoom(code = snapshot?.code) {
    if (!code) return;
    const [{ data: roomData }, { data: memberData }] = await Promise.all([
      supabase.from('debate_timer_rooms').select('*').eq('code', code).single(),
      supabase.from('debate_timer_participants').select('*').eq('room_code', code).order('joined_at', { ascending: true }),
    ]);

    const nextSnapshot = asSnapshot(roomData?.snapshot);
    if (nextSnapshot) {
      const mergedSnapshot = mergeFreshLocalView(nextSnapshot);
      setSnapshot(mergedSnapshot);
      if (isActiveRoomPhase(mergedSnapshot.phase)) setPhase(mergedSnapshot.phase);
      if (!canControl) syncLocalConfig(mergedSnapshot);
    }
    if (memberData) setParticipants(memberData as Participant[]);
  }

  async function addParticipant(code: string, nextRole: Role, name: string, pSide: string, pRole: string) {
    const { data, error } = await supabase
      .from('debate_timer_participants')
      .insert({ room_code: code, role: nextRole, name, side: pSide, speaker_role: pRole })
      .select()
      .single();

    if (error) {
      setNotice(`Gagal masuk lobby: ${error.message}`);
      return false;
    }

    setParticipantId(data.id);
    return true;
  }

  async function createLobby() {
    setRoomBusy(true);
    setNotice('Membuat lobby...');
    const code = makePin();
    const firstDuration = getDuration('main', speechMinutes, speechSeconds, replyMinutes, replySeconds);
    const nextSnapshot: RoomSnapshot = {
      code,
      name: roomName.trim() || 'UDF Debate Room',
      phase: 'lobby',
      format,
      speechMinutes,
      speechSeconds,
      replyMinutes,
      replySeconds,
      currentSpeech: 0,
      running: false,
      duration: firstDuration,
      remaining: firstDuration,
      startedAt: null,
      poiEnabled: true,
      poiActive: false,
      poiStartedAt: null,
      poiResumeRunning: false,
      viewSpeech: 0,
      runningSpeech: null,
      speechRecords: {},
    };

    try {
      const { error } = await supabase
        .from('debate_timer_rooms')
        .insert({
          code,
          name: nextSnapshot.name,
          phase: 'lobby',
          snapshot: nextSnapshot,
        });

      if (error) {
        setNotice(`Gagal buat lobby: ${error.message}. Pastikan supabase_timer_rooms.sql sudah dijalankan.`);
        return;
      }

      const joined = await addParticipant(code, 'host', displayName.trim() || 'Host', playerSide, playerRole);
      if (!joined) return;
      setRole('host');
      setPin(code);
      setSnapshot(nextSnapshot);
      syncLocalConfig(nextSnapshot);
      setPhase('lobby');
      setNotice(`Lobby ${code} dibuat. Bagikan PIN ini ke peserta; mereka akan mendapat update live di room ini.`);
      await fetchRoom(code);
    } catch (error) {
      setNotice(`Gagal buat lobby: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRoomBusy(false);
    }
  }

  async function joinLobby() {
    setRoomBusy(true);
    setNotice('Masuk lobby...');
    const code = pin.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setNotice('Masukkan 6 digit PIN lobby.');
      setRoomBusy(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('debate_timer_rooms')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !data) {
        setNotice('Lobby tidak ditemukan. Cek PIN atau minta host buat lobby dulu.');
        return;
      }

      const nextSnapshot = asSnapshot(data.snapshot);
      if (!nextSnapshot || nextSnapshot.phase === 'terminated') {
        setNotice('Session has been terminated by host.');
        return;
      }

      const joined = await addParticipant(code, 'member', displayName.trim() || makeGuestName(), playerSide, playerRole);
      if (!joined) return;
      setRole('member');
      setSnapshot(nextSnapshot);
      syncLocalConfig(nextSnapshot);
      if (isActiveRoomPhase(nextSnapshot.phase)) setPhase(nextSnapshot.phase);
      setNotice('');
      await fetchRoom(code);
    } catch (error) {
      setNotice(`Gagal masuk lobby: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRoomBusy(false);
    }
  }

  async function setLive(live: boolean) {
    if (!snapshot || !canControl) return;
    const viewIndex = viewSpeechIndex;
    await saveSnapshot({
      ...snapshot,
      phase: live ? 'live' : 'lobby',
      currentSpeech: viewIndex,
      duration: durationFor(viewIndex),
      remaining: durationFor(viewIndex),
      running: false,
      startedAt: null,
      poiActive: false,
      poiStartedAt: null,
      poiResumeRunning: false,
      viewSpeech: viewIndex,
      runningSpeech: null,
    });
    setNotice(live ? 'Room sudah live. Peserta di lobby akan melihat timer sinkron.' : 'Room kembali ke lobby.');
  }

  async function setSpeech(index: number) {
    if (!snapshot || !canControl) return;
    const safeIndex = Math.min(speeches.length - 1, Math.max(0, index));
    latestViewSpeechRef.current = safeIndex;
    lastLocalViewChangeRef.current = nowMs();
    const requestId = ++viewSaveCounterRef.current;
    const nextSnapshot = {
      ...snapshot,
      viewSpeech: safeIndex,
    };
    await saveSnapshot(nextSnapshot);
    if (requestId !== viewSaveCounterRef.current && snapshot.code) {
      const latestView = latestViewSpeechRef.current;
      await saveSnapshot({ ...nextSnapshot, viewSpeech: latestView });
    }
  }

  function buildStoppedSnapshot(base: RoomSnapshot, stoppedAt: number, nextViewSpeech = viewSpeechIndex): RoomSnapshot {
    const stopIndex = runningSpeechIndex ?? clampIndex(base.currentSpeech, speeches.length);
    const stopSpeech = speeches[stopIndex] || speeches[0];
    const stopDuration = durationFor(stopIndex);
    const stopRemaining = typeof runningRemaining === 'number' ? runningRemaining : base.remaining;
    const elapsedSeconds = Math.min(stopDuration + 10, Math.max(0, stopDuration - stopRemaining));
    const remainingSeconds = Math.max(-10, Math.min(stopDuration, stopRemaining));
    const overtimeSeconds = Math.max(0, Math.ceil(-remainingSeconds));
    const record: SpeechRecord = {
      speechIndex: stopIndex,
      speechName: stopSpeech.name,
      side: stopSpeech.side,
      startedAt: base.startedAt ?? stoppedAt,
      stoppedAt,
      elapsedSeconds,
      remainingSeconds,
      overtimeSeconds,
    };
    const safeView = clampIndex(nextViewSpeech, speeches.length);
    return {
      ...base,
      currentSpeech: stopIndex,
      duration: stopDuration,
      remaining: remainingSeconds,
      running: false,
      startedAt: null,
      poiActive: false,
      poiStartedAt: null,
      poiResumeRunning: false,
      viewSpeech: safeView,
      runningSpeech: null,
      speechRecords: {
        ...(base.speechRecords || {}),
        [String(stopIndex)]: record,
      },
    };
  }

  async function toggleRun() {
    if (!snapshot || !canControl || snapshot.phase !== 'live' || snapshot.poiActive) return;
    if (snapshot.running && runningSpeechIndex !== viewSpeechIndex) {
      setNotice(`Timer ${runningSpeech?.name || 'speaker lain'} masih berjalan. Stop atau Next dulu sebelum mulai speaker ini.`);
      return;
    }
    if (snapshot.running && runningSpeechIndex === viewSpeechIndex) {
      await saveSnapshot({
        ...snapshot,
        currentSpeech: viewSpeechIndex,
        duration,
        running: false,
        runningSpeech: null,
        startedAt: null,
        remaining: currentRemaining,
      });
      return;
    }
    const resumeRemaining = snapshot.currentSpeech === viewSpeechIndex && snapshot.remaining < duration
      ? snapshot.remaining
      : activeRecord?.remainingSeconds ?? duration;
    await saveSnapshot({
      ...snapshot,
      currentSpeech: viewSpeechIndex,
      duration,
      remaining: resumeRemaining,
      running: true,
      runningSpeech: viewSpeechIndex,
      startedAt: now + serverTimeOffset,
      viewSpeech: viewSpeechIndex,
    });
    setNotice('');
  }

  async function togglePoi() {
    if (!snapshot || !canControl || snapshot.phase !== 'live') return;
    if (snapshot.poiActive) {
      const shouldResume = snapshot.poiResumeRunning;
      await saveSnapshot({
        ...snapshot,
        poiActive: false,
        poiStartedAt: null,
        poiResumeRunning: false,
        running: shouldResume,
        runningSpeech: shouldResume ? runningSpeechIndex : null,
        startedAt: shouldResume ? now + serverTimeOffset : null,
      });
      return;
    }
    if (!canUsePoi) {
      setNotice('POI masih terkunci pada menit pertama dan menit terakhir.');
      return;
    }

    await saveSnapshot({
      ...snapshot,
      running: false,
      startedAt: null,
      remaining: currentRemaining,
      poiActive: true,
      poiStartedAt: now + serverTimeOffset,
      runningSpeech: viewSpeechIndex,
      poiResumeRunning: snapshot.running,
    });
  }

  async function resetTimer() {
    if (!snapshot || !canControl) return;
    if (snapshot.running && !window.confirm('Reset akan menghentikan speaker yang sedang berjalan. Lanjutkan?')) return;
    await saveSnapshot({
      ...snapshot,
      currentSpeech: viewSpeechIndex,
      duration,
      remaining: duration,
      running: false,
      runningSpeech: null,
      startedAt: null,
      poiActive: false,
      poiStartedAt: null,
      poiResumeRunning: false,
    });
  }

  async function nextSpeech() {
    if (!snapshot || !canControl) return;
    if (snapshot.running && runningSpeechIndex !== null) {
      const nextIndex = clampIndex(runningSpeechIndex + 1, speeches.length);
      const message = `Stop timer ${runningSpeech?.name || 'speaker aktif'} dan catat waktu bicara sekarang?`;
      if (!window.confirm(message)) return;
      await saveSnapshot(buildStoppedSnapshot(snapshot, now + serverTimeOffset, nextIndex));
      setNotice(`${runningSpeech?.name || 'Speaker'} dihentikan dan waktunya tercatat.`);
      return;
    }
    const nextIndex = clampIndex(viewSpeechIndex + 1, speeches.length);
    await setSpeech(nextIndex);
  }

  async function applyRoomConfig() {
    if (!snapshot || !canControl) return;
    if (snapshot.running || snapshot.currentSpeech > 0 || Object.keys(speechRecords).length > 0 || currentRemaining < duration) {
       if (!window.confirm('Menerapkan config baru akan mereset timer dan state. Lanjutkan?')) {
          return;
       }
    }
    const nextSpeeches = formats[format].speeches;
    const nextDuration = getDuration(nextSpeeches[0].type, speechMinutes, speechSeconds, replyMinutes, replySeconds);
    await saveSnapshot({
      ...snapshot,
      name: roomName,
      format,
      speechMinutes,
      speechSeconds,
      replyMinutes,
      replySeconds,
      currentSpeech: 0,
      duration: nextDuration,
      remaining: nextDuration,
      running: false,
      viewSpeech: 0,
      runningSpeech: null,
      speechRecords: {},
      startedAt: null,
      poiEnabled: true,
      poiActive: false,
      poiStartedAt: null,
      poiResumeRunning: false,
    });
    setNotice('Config room diupdate dan timer peserta ikut tersinkron.');
  }

  async function changeRoomFormat(nextFormat: FormatType) {
    updateLocalConfig(nextFormat, speechMinutes, speechSeconds, replyMinutes, replySeconds);
    // Tidak auto save, harus via applyRoomConfig
  }

  async function leaveLobby() {
    if (canControl && snapshot?.code) {
       await supabase.from('debate_timer_rooms').update({ snapshot: { ...snapshot, phase: 'terminated' } }).eq('code', snapshot.code);
       await supabase.from('debate_timer_rooms').delete().eq('code', snapshot.code);
       await supabase.from('debate_timer_participants').delete().eq('room_code', snapshot.code);
    } else if (participantId) {
       await supabase.from('debate_timer_participants').delete().eq('id', participantId);
    }
    setSnapshot(null);
    setPhase('join');
    setParticipantId(null);
    setNotice(canControl ? 'Room selesai dan ditutup untuk semua peserta.' : 'Kamu telah keluar dari room.');
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(nowMs()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!snapshot?.code) return;
    
    // Subscribe to realtime changes
    const subscription = supabase
      .channel(`room:${snapshot.code}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'debate_timer_rooms', filter: `code=eq.${snapshot.code}` },
        (payload) => {
          const incoming = asSnapshot(payload.new.snapshot);
          if (!incoming) return;
          
          incoming.sequence_number = payload.new.sequence_number;
          
          // Apply sequence-based merge to prevent stale updates
          const merged = mergeSnapshotWithSequence(incoming);
          if (merged) {
            setSnapshot(merged);
          }
        }
      )
      .subscribe();
    
    realtimeSubscriptionRef.current = subscription;
    return () => {
      if (realtimeSubscriptionRef.current) {
        void supabase.removeChannel(realtimeSubscriptionRef.current);
      }
    };
  }, [snapshot?.code]);

  useEffect(() => {
    if (!snapshot?.code) return;
    
    // Fallback polling for participant updates and periodic sync
    const poller = setInterval(async () => {
      const [{ data: roomData }, { data: memberData }] = await Promise.all([
        supabase.from('debate_timer_rooms').select('*').eq('code', snapshot.code).single(),
        supabase.from('debate_timer_participants').select('*').eq('room_code', snapshot.code).order('joined_at', { ascending: true }),
      ]);
      if (!roomData) {
         setNotice('Session has been terminated by host.');
         setSnapshot(null);
         setPhase('join');
         setParticipantId(null);
         return;
      }
      const nextSnapshot = asSnapshot(roomData.snapshot);
      if (nextSnapshot?.phase === 'terminated') {
         setNotice('Session has been terminated by host.');
         setSnapshot(null);
         setPhase('join');
         setParticipantId(null);
         return;
      }
      
      if (nextSnapshot) {
         nextSnapshot.sequence_number = roomData.sequence_number;
         const merged = mergeSnapshotWithSequence(nextSnapshot);
         if (merged) {
           const mergedSnapshot = mergeFreshLocalView(merged);
           setSnapshot(mergedSnapshot);
           if (isActiveRoomPhase(mergedSnapshot.phase)) setPhase(mergedSnapshot.phase);
           if (!canControl) syncLocalConfig(mergedSnapshot);
         }
      }
      if (memberData) setParticipants(memberData as Participant[]);
    }, 1500);
    return () => clearInterval(poller);
  }, [snapshot?.code, canControl]);

  useEffect(() => {
    // Sync server time periodically
    const syncTime = async () => {
      const start = nowMs();
      const st = await getServerTime();
      const end = nowMs();
      const rtt = end - start;
      const estimatedServerTime = st + rtt / 2;
      setServerTimeOffset(estimatedServerTime - end);
    };
    
    syncTime();
    const timer = setInterval(syncTime, 5000); // Sync every 5 seconds
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!participantId) return;
    const heartbeat = setInterval(() => {
      void supabase
        .from('debate_timer_participants')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', participantId);
    }, 10000);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
       e.preventDefault();
       e.returnValue = 'Anda berada di dalam debate room. Yakin ingin keluar? Session akan dihapus.';
       return e.returnValue;
    };
    const handleUnload = () => {
       if (participantId) {
          navigator.sendBeacon(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/debate_timer_participants?id=eq.${participantId}`, '');
          if (canControl && snapshot?.code) {
             navigator.sendBeacon(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/debate_timer_rooms?code=eq.${snapshot.code}`, '');
          }
       }
    };
    
    const handleLinkClick = (e: MouseEvent) => {
       if (!participantId) return;
       const target = (e.target as HTMLElement).closest('a');
       if (target && target.href && !target.href.includes(window.location.pathname) && !target.hasAttribute('target')) {
          e.preventDefault();
          if (window.confirm('Anda berada di dalam debate room. Yakin ingin keluar? Session akan dihapus.')) {
             leaveLobby().finally(() => {
                window.location.href = target.href;
             });
          }
       }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    document.addEventListener('click', handleLinkClick, { capture: true });

    return () => {
       clearInterval(heartbeat);
       window.removeEventListener('beforeunload', handleBeforeUnload);
       window.removeEventListener('unload', handleUnload);
       document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [participantId, canControl, snapshot?.code]);

  useEffect(() => {
    if (!snapshot || !canControl || !snapshot.running || runningSpeechIndex === null || typeof runningRemaining !== 'number' || runningRemaining > -10) return;
    const timer = setTimeout(() => {
      void saveSnapshot(buildStoppedSnapshot(snapshot, now + serverTimeOffset, viewSpeechIndex));
      setNotice(`${runningSpeech?.name || 'Speaker'} auto-stop setelah overtime 10 detik.`);
    }, 0);
    return () => clearTimeout(timer);
  }, [canControl, now, runningRemaining, runningSpeechIndex, snapshot, viewSpeechIndex]);

  useEffect(() => {
    if (!snapshot || !canControl || !snapshot.poiActive || !snapshot.poiStartedAt || poiCountdown > 0) return;
    const timer = setTimeout(() => {
      const shouldResume = snapshot.poiResumeRunning;
      void saveSnapshot({
        ...snapshot,
        poiActive: false,
        poiStartedAt: null,
        poiResumeRunning: false,
        running: shouldResume,
        startedAt: shouldResume ? now + serverTimeOffset : null,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [canControl, now, poiCountdown, snapshot]);

  if (phase === 'join' || phase === 'create') {
    return (
      <section className="section active-section" style={{ display: 'block' }}>
        <div className={styles.roomShell} style={{ position: 'relative' }}>
          <Link href="/timer" style={{ position: 'absolute', top: '24px', left: '24px', width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--panel)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <div className={styles.joinHero}>
            <h1 className={styles.brand} style={{ textAlign: 'center' }}>Debate!</h1>
            <div className={styles.choiceRow}>
              <button className={phase === 'join' ? styles.active : ''} onClick={() => { setPhase('join'); setPlayerSide('Observer'); }} type="button">Enter PIN</button>
              <button className={phase === 'create' ? styles.active : ''} onClick={() => { setPhase('create'); setPlayerSide('Host'); }} type="button">Create Lobby</button>
            </div>

            {phase === 'join' ? (
              <div className={styles.joinCard}>
                <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Game PIN" inputMode="numeric" />
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={playerSide} onChange={(e) => setPlayerSide(e.target.value)} style={{ flex: 1 }} className="input">
                    <option value="Observer">Observer</option>
                    <option value="Debater">Debater</option>
                  </select>
                </div>
                <button onClick={joinLobby} type="button" disabled={roomBusy}>{roomBusy ? 'Entering...' : 'Enter'}</button>
              </div>
            ) : (
              <div className={styles.createCard}>
                <div className={styles.formGrid}>
                  <label className={styles.fullSpan}>Lobby name<input className="input" value={roomName} onChange={(event) => setRoomName(event.target.value)} /></label>
                  <label>Host name<input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
                  <label>Join As
                    <select className="input" value={playerSide} onChange={(e) => setPlayerSide(e.target.value)}>
                      <option value="Host">Host</option>
                      <option value="Debater">Debater</option>
                    </select>
                  </label>
                  <label className={styles.fullSpan}>Format<select className="input" value={format} onChange={(event) => updateLocalConfig(event.target.value as FormatType, speechMinutes, speechSeconds, replyMinutes, replySeconds)}><option value="AP">Asian Parliamentary</option><option value="BP">British Parliamentary</option></select></label>
                  <label>Speech min<input className="input" type="number" min="0" value={speechMinutes} onChange={(event) => updateLocalConfig(format, Number(event.target.value), speechSeconds, replyMinutes, replySeconds)} /></label>
                  <label>Speech sec<input className="input" type="number" min="0" max="59" value={speechSeconds} onChange={(event) => updateLocalConfig(format, speechMinutes, Number(event.target.value), replyMinutes, replySeconds)} /></label>
                  <label>Reply min<input className="input" type="number" min="0" value={replyMinutes} onChange={(event) => updateLocalConfig(format, speechMinutes, speechSeconds, Number(event.target.value), replySeconds)} /></label>
                  <label>Reply sec<input className="input" type="number" min="0" max="59" value={replySeconds} onChange={(event) => updateLocalConfig(format, speechMinutes, speechSeconds, replyMinutes, Number(event.target.value))} /></label>
                </div>
                <button onClick={createLobby} type="button" disabled={roomBusy}>{roomBusy ? 'Creating...' : 'Create Lobby'}</button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <div className={styles.roomShell}>
        <div className={styles.lobbyLayout}>
          <aside className={styles.lobbyCard}>
            <div className={styles.pinBox}>
              <span>Game PIN</span>
              <strong>{snapshot?.code}</strong>
            </div>
            <h2>{snapshot?.name}</h2>
            <div className={styles.lobbyActions}>
              {canControl && snapshot?.phase === 'lobby' && <button className={styles.darkButton} onClick={() => setLive(true)} type="button">Start Live</button>}
              {canControl && snapshot?.phase === 'live' && <button className={styles.darkButton} onClick={() => setLive(false)} type="button">Back to Lobby</button>}
              {canControl && <button className={styles.darkButton} onClick={applyRoomConfig} type="button">Apply Config</button>}
              <button className={styles.darkButton} onClick={() => navigator.clipboard.writeText(snapshot?.code || '')} type="button">Copy PIN</button>
              <button className={styles.darkButton} onClick={leaveLobby} style={{ color: '#ef4444' }} type="button">Leave Room</button>
            </div>

            {canControl && snapshot && (
              <div className={`${styles.formGrid} ${styles.lobbyConfigGrid}`}>
                <label className={styles.fullSpan}>Lobby name<input value={roomName} onChange={(event) => setRoomName(event.target.value)} /></label>
                <div className={styles.settingsGroup}>
                  <span className={styles.groupLabel}>Debate format</span>
                  <div className={styles.choiceRow}>
                    <button className={format === 'AP' ? styles.active : ''} type="button" onClick={() => changeRoomFormat('AP')}>AP</button>
                    <button className={format === 'BP' ? styles.active : ''} type="button" onClick={() => changeRoomFormat('BP')}>BP</button>
                  </div>
                </div>
                <div className={styles.settingsGroup}>
                  <span className={styles.groupLabel}>Speech duration</span>
                  <div className={styles.durationRow}>
                    <label>Min<input type="number" min="0" value={speechMinutes} onChange={(event) => setSpeechMinutes(Number(event.target.value))} /></label>
                    <label>Sec<input type="number" min="0" max="59" value={speechSeconds} onChange={(event) => setSpeechSeconds(Number(event.target.value))} /></label>
                  </div>
                </div>
                <div className={styles.settingsGroup}>
                  <span className={styles.groupLabel}>Reply duration</span>
                  <div className={styles.durationRow}>
                    <label>Min<input type="number" min="0" value={replyMinutes} onChange={(event) => setReplyMinutes(Number(event.target.value))} /></label>
                    <label>Sec<input type="number" min="0" max="59" value={replySeconds} onChange={(event) => setReplySeconds(Number(event.target.value))} /></label>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {formatSides.map(side => (
                  <div key={side} style={{ flex: 1, minWidth: '120px', background: 'var(--panel)', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--muted)' }}>{side}</h4>
                    {participants.filter(p => p.side === side).map(p => (
                      <div key={p.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>{p.name}</strong>
                        {p.speaker_role && <span style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 600 }}>{p.speaker_role}</span>}
                        {p.reply_speaker_role && <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 700 }}>Reply: {p.reply_speaker_role}</span>}
                      </div>
                    ))}
                    {participants.filter(p => p.side === side).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Empty</span>}
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--panel)', padding: '10px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--muted)' }}>Observers / Unassigned</h4>
                {participants.filter(p => !formatSides.includes(p.side || '')).map(p => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>{p.name} {p.role === 'host' && '(Host)'}</strong>
                  </div>
                ))}
                {participants.filter(p => !formatSides.includes(p.side || '')).length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Empty</span>}
              </div>
            </div>

            {participantId && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--paper)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'var(--ink)' }}>Set My Role</h4>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                  <select className="input" value={myParticipant?.side || 'Observer'} onChange={(e) => updateMyRole(e.target.value, '', '')}>
                    <option value="Observer">Observer / Unassigned</option>
                    {formatSides.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {formatSides.includes(myParticipant?.side || '') && (
                    <select className="input" value={myParticipant?.speaker_role || ''} onChange={(e) => updateMyRole(myParticipant!.side!, e.target.value)}>
                      <option value="">Select Main Speaker Role...</option>
                      {speeches.filter(s => s.type === 'main' && s.side === myParticipant?.side).map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  )}
                  {myReplyOptions.length > 0 && (
                    <select className="input" value={myParticipant?.reply_speaker_role || ''} onChange={(e) => updateMyRole(myParticipant!.side!, myParticipant?.speaker_role || '', e.target.value)}>
                      <option value="">No Reply Speaker Role</option>
                      {myReplyOptions.map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </aside>

          <main>
            <div className={`${styles.timerPanel} ${timerTone}`}>
              <div className={styles.timerMeta}>
                <span>{formats[activeFormat].label}</span>
                <span>{snapshot?.phase === 'live' ? 'Live Room' : 'Lobby'}</span>
              </div>
              {runningLabel && runningSpeechIndex !== viewSpeechIndex && (
                <div className={styles.runningBanner}>Running now: {runningLabel}</div>
              )}
              <div className={styles.speakerLine}>
                <span>{activeSpeech.side}</span>
                <h2>{activeSpeech.name}</h2>
              </div>
              <div className={styles.timeDisplay}>{formatTime(currentRemaining)}</div>
              {activeOvertime > 0 && <div className={styles.overtimeAlert}>Overtime by {activeOvertime}s</div>}
              {snapshot?.poiActive && <div className={styles.poiCountdown}>POI: {formatTime(poiCountdown)}</div>}
              {!snapshot?.poiActive && snapshot?.poiEnabled && activeSpeech.type !== 'reply' && isPoiLocked && (
                <div className={styles.poiLock}>Lock for POI</div>
              )}
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              {activeRecord && (
                <div className={styles.recordSummary}>
                  Stopped at {formatClock(activeRecord.stoppedAt)} · {activeRecord.overtimeSeconds > 0
                    ? `overtime by ${activeRecord.overtimeSeconds}s`
                    : `${formatTime(activeRecord.remainingSeconds)} remaining`}
                </div>
              )}
              {!canControl && <div className={styles.readOnly}>Synced viewer mode. Host controls the timer.</div>}
              {snapshot?.phase === 'lobby' && <div className={styles.readOnly}>Waiting in lobby. Host will start the room.</div>}
              <div className={styles.controls}>
                <button className={styles.secondary} onClick={() => setSpeech(viewSpeechIndex - 1)} disabled={!canControl} type="button">Prev</button>
                <button className={styles.primary} onClick={toggleRun} disabled={!canControl || snapshot?.phase !== 'live'} type="button">{isViewingRunningSpeech ? 'Pause' : 'Start'}</button>
                {snapshot?.poiEnabled && activeSpeech.type !== 'reply' && <button className={styles.secondary} onClick={togglePoi} disabled={!canControl || (!snapshot.poiActive && !canUsePoi)} type="button">{snapshot.poiActive ? 'Stop POI' : 'POI'}</button>}
                <button className={styles.secondary} onClick={nextSpeech} disabled={!canControl} type="button">{snapshot?.running ? 'Stop & Next' : 'Next'}</button>
                <button className={styles.secondary} onClick={resetTimer} disabled={!canControl || Boolean(snapshot?.running)} type="button">Reset</button>
              </div>
            </div>

            {Object.values(speechRecords).length > 0 && (
              <div className={styles.recordsPanel}>
                <h3>Speech Records</h3>
                <div className={styles.recordsGrid}>
                  {Object.values(speechRecords).sort((a, b) => b.stoppedAt - a.stoppedAt).map((record, index) => (
                    <div className={styles.recordCard} key={`${record.speechIndex}-${record.stoppedAt}`}>
                      <span>{index === 0 ? 'Latest' : formatClock(record.stoppedAt)}</span>
                      <strong>{record.speechName}</strong>
                      <small>{record.side}</small>
                      <b>{record.overtimeSeconds > 0 ? `Overtime by ${record.overtimeSeconds}s` : `${formatTime(record.remainingSeconds)} left`}</b>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.speechStrip}>
              {speeches.map((speech, index) => {
                const isCurrentSpeech = index === viewSpeechIndex;
                const isRunningSpeech = index === runningSpeechIndex && Boolean(snapshot?.running);
                const hasRecord = Boolean(speechRecords[String(index)]);
                const isMyRole = speech.side === myParticipant?.side && (
                  speech.name === myParticipant?.speaker_role ||
                  speech.name === myParticipant?.reply_speaker_role
                );
                const buttonClass = [
                  isCurrentSpeech ? styles.active : '',
                  isRunningSpeech ? styles.running : '',
                  hasRecord ? styles.recorded : '',
                ].filter(Boolean).join(' ');
                return (
                  <button 
                    key={`${speech.name}-${index}`} 
                    className={buttonClass} 
                    onClick={() => setSpeech(index)} 
                    disabled={!canControl} 
                    type="button"
                    style={{
                      boxShadow: isMyRole && !isCurrentSpeech ? '0 0 0 2px var(--gold)' : 'none',
                      border: isMyRole ? '1px solid var(--gold)' : undefined,
                    }}
                  >
                    <span>{speech.side}</span>
                    <strong>{speech.name}</strong>
                    {isRunningSpeech && <em>Running</em>}
                    {hasRecord && !isRunningSpeech && <em>Recorded</em>}
                    {isMyRole && <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--gold)', marginTop: '2px', fontWeight: 700 }}>YOU</span>}
                  </button>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
