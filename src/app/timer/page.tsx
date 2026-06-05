'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type FormatType = 'AP' | 'BP';
type RoomRole = 'none' | 'master' | 'member';
type DisplayMode = 'countdown' | 'countup';
type RoomPhase = 'lobby' | 'live';
type Speech = { name: string; side: string; type: 'main' | 'reply' };
type PresenceMeta = { name: string; role: 'master' | 'member'; joinedAt: string };
type RoomSnapshot = {
  roomCode: string;
  roomName: string;
  roomPhase: RoomPhase;
  format: FormatType;
  speechMinutes: number;
  speechSeconds: number;
  replyMinutes: number;
  replySeconds: number;
  soundEnabled: boolean;
  poiEnabled: boolean;
  currentSpeech: number;
  running: boolean;
  duration: number;
  remaining: number;
  startedAt: number | null;
  poiActive: boolean;
  poiStartedAt: number | null;
  poiResumeRunning: boolean;
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

function randomSuffix() {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0');
}

function generateRoomCode() {
  return `UDF-${randomSuffix()}`;
}

function getSpeechDuration(type: 'main' | 'reply', sMin: number, sSec: number, rMin: number, rSec: number) {
  const main = Math.max(1, sMin * 60 + sSec);
  const reply = Math.max(1, rMin * 60 + rSec);
  return type === 'reply' ? reply : main;
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const m = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const s = String(safeSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function roomStorageKey(code: string) {
  return `debate-room-state-${code}`;
}

function TimerContent() {
  const searchParams = useSearchParams();
  const requestedRoom = (searchParams.get('room') || '').toUpperCase();
  const isDisplayView = searchParams.get('display') === '1';
  const [displayMode, setDisplayMode] = useState<DisplayMode>('countdown');
  const [roomRole, setRoomRole] = useState<RoomRole>('none');
  const [roomPhase, setRoomPhase] = useState<RoomPhase>('lobby');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('SOLO');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState(`Guest-${randomSuffix()}`);
  const [participants, setParticipants] = useState<Array<{ key: string; name: string; role: 'master' | 'member'; joinedAt: string }>>([]);
  const [copyText, setCopyText] = useState('Copy code');
  const [notice, setNotice] = useState('');

  const [format, setFormat] = useState<FormatType>('AP');
  const [speechMinutes, setSpeechMinutes] = useState(7);
  const [speechSeconds, setSpeechSeconds] = useState(0);
  const [replyMinutes, setReplyMinutes] = useState(4);
  const [replySeconds, setReplySeconds] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [poiEnabled, setPoiEnabled] = useState(true);

  const [currentSpeech, setCurrentSpeech] = useState(0);
  const [running, setRunning] = useState(false);
  const [duration, setDuration] = useState(420);
  const [remaining, setRemaining] = useState(420);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [poiActive, setPoiActive] = useState(false);
  const [poiStartedAt, setPoiStartedAt] = useState<number | null>(null);
  const [poiResumeRunning, setPoiResumeRunning] = useState(false);
  const [now, setNow] = useState(nowMs());

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const clientPresenceKeyRef = useRef(`client-${randomSuffix()}-${randomSuffix()}`);
  const autoJoinAttemptedRef = useRef(false);
  const lastBellStageRef = useRef('');
  const isRoom = roomRole !== 'none';
  const isMaster = roomRole === 'master';
  const speeches = formats[format].speeches;
  const activeSpeech = speeches[currentSpeech];
  const canControl = (!isRoom || isMaster) && (!isRoom || roomPhase === 'live');

  const currentRemaining = useMemo(() => {
    if (!running || !startedAt) return remaining;
    return Math.max(0, remaining - (now - startedAt) / 1000);
  }, [now, remaining, running, startedAt]);
  const elapsed = duration - currentRemaining;
  const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
  const timeToShow = displayMode === 'countdown' ? currentRemaining : elapsed;
  const poiCountdown = poiActive && poiStartedAt ? Math.max(0, 15 - (now - poiStartedAt) / 1000) : 0;
  const canUsePoi = poiEnabled && activeSpeech.type !== 'reply' && elapsed >= 60 && elapsed <= Math.max(0, duration - 60);

  const poiText = useMemo(() => {
    if (activeSpeech.type === 'reply') return 'Reply speech: no POI';
    if (elapsed < 60) return 'Protected time: no POI';
    if (elapsed <= Math.max(0, duration - 60)) return 'POI window open';
    return 'Protected final minute';
  }, [activeSpeech.type, duration, elapsed]);

  function ringBell(stage: 'open' | 'final' | 'end') {
    if (!soundEnabled) return;
    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = stage === 'end' ? 880 : 660;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // no-op
    }
  }

  function toSnapshot(overrides?: Partial<RoomSnapshot>): RoomSnapshot {
    return {
      roomCode,
      roomName,
      roomPhase,
      format,
      speechMinutes,
      speechSeconds,
      replyMinutes,
      replySeconds,
      soundEnabled,
      poiEnabled,
      currentSpeech,
      running,
      duration,
      remaining: currentRemaining,
      startedAt: running ? now : null,
      poiActive,
      poiStartedAt,
      poiResumeRunning,
      ...overrides,
    };
  }

  function applySnapshot(payload: RoomSnapshot) {
    setRoomCode(payload.roomCode);
    setRoomName(payload.roomName);
    setRoomPhase(payload.roomPhase);
    setFormat(payload.format);
    setSpeechMinutes(payload.speechMinutes);
    setSpeechSeconds(payload.speechSeconds);
    setReplyMinutes(payload.replyMinutes);
    setReplySeconds(payload.replySeconds);
    setSoundEnabled(payload.soundEnabled);
    setPoiEnabled(payload.poiEnabled);
    setCurrentSpeech(payload.currentSpeech);
    setRunning(payload.running);
    setDuration(payload.duration);
    setRemaining(payload.remaining);
    setStartedAt(payload.startedAt);
    setPoiActive(payload.poiActive);
    setPoiStartedAt(payload.poiStartedAt);
    setPoiResumeRunning(payload.poiResumeRunning || false);
  }

  function broadcastSnapshot(overrides?: Partial<RoomSnapshot>) {
    if (!isRoom) return;
    const payload = toSnapshot(overrides);
    localStorage.setItem(roomStorageKey(payload.roomCode), JSON.stringify(payload));
    channelRef.current?.send({ type: 'broadcast', event: 'state', payload });
  }

  async function connectRoomChannel(code: string, role: 'master' | 'member', name: string) {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
    }
    const channel = supabase.channel(`debate-room-${code}`, {
      config: {
        broadcast: { self: false },
        presence: { key: clientPresenceKeyRef.current },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, PresenceMeta[]>;
        const nextParticipants: Array<{ key: string; name: string; role: 'master' | 'member'; joinedAt: string }> = [];
        Object.entries(state).forEach(([key, list]) => {
          const first = list[0];
          if (!first) return;
          nextParticipants.push({ key, name: first.name, role: first.role, joinedAt: first.joinedAt });
        });
        nextParticipants.sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
        setParticipants(nextParticipants);
      })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        if (isMaster) return;
        applySnapshot(payload as RoomSnapshot);
      });

    const subscribed = await new Promise<boolean>((resolve) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(false);
      }, 8000);

      channel.subscribe((status) => {
        if (settled) return;
        if (status === 'SUBSCRIBED') {
          settled = true;
          clearTimeout(timeoutId);
          resolve(true);
        }
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          settled = true;
          clearTimeout(timeoutId);
          resolve(false);
        }
      });
    });

    if (!subscribed) {
      setNotice('Gagal connect room realtime.');
      return false;
    }

    await channel.track({
      name,
      role,
      joinedAt: new Date().toISOString(),
    } satisfies PresenceMeta);

    channelRef.current = channel;
    return true;
  }

  async function createRoom() {
    const code = generateRoomCode();
    const hostName = joinName.trim() || 'Host';
    const roomTitle = roomName.trim() || 'Debate Room';
    const firstDuration = getSpeechDuration('main', speechMinutes, speechSeconds, replyMinutes, replySeconds);
    const connected = await connectRoomChannel(code, 'master', hostName);
    if (!connected) return;

    const snapshot = toSnapshot({
      roomCode: code,
      roomName: roomTitle,
      roomPhase: 'lobby',
      currentSpeech: 0,
      running: false,
      duration: firstDuration,
      remaining: firstDuration,
      startedAt: null,
      poiActive: false,
      poiStartedAt: null,
      poiResumeRunning: false,
    });

    setRoomRole('master');
    setRoomCode(code);
    setRoomName(roomTitle);
    setRoomPhase('lobby');
    setCurrentSpeech(0);
    setDuration(firstDuration);
    setRemaining(firstDuration);
    setRunning(false);
    setStartedAt(null);
    localStorage.setItem(roomStorageKey(code), JSON.stringify(snapshot));
    channelRef.current?.send({ type: 'broadcast', event: 'state', payload: snapshot });
    setNotice(`Room ${code} berhasil dibuat. Tunggu peserta di lobby lalu Start Live.`);
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setNotice('Masukkan kode room dulu.');
      return;
    }
    const raw = localStorage.getItem(roomStorageKey(code));
    if (!raw) {
      setNotice('Room belum ditemukan. Pastikan host sudah create room.');
      return;
    }
    const snapshot = JSON.parse(raw) as RoomSnapshot;
    const participantName = joinName.trim() || `Guest-${randomSuffix()}`;
    const connected = await connectRoomChannel(code, 'member', participantName);
    if (!connected) return;
    applySnapshot(snapshot);
    setRoomRole('member');
    setRoomCode(code);
    setNotice(`Joined ${code}. Menunggu host mulai live.`);
  }

  async function leaveRoom() {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setRoomRole('none');
    setRoomPhase('lobby');
    setParticipants([]);
    setRoomCode('SOLO');
    setRoomName('');
    setJoinCode('');
    setNotice('Keluar room. Kembali ke mode solo.');
  }

  function startRoomLive() {
    if (!isMaster) return;
    setRoomPhase('live');
    broadcastSnapshot({ roomPhase: 'live' });
    setNotice('Room live dimulai.');
  }

  function backToLobby() {
    if (!isMaster) return;
    setRoomPhase('lobby');
    setRunning(false);
    setStartedAt(null);
    setPoiActive(false);
    setPoiStartedAt(null);
    setPoiResumeRunning(false);
    broadcastSnapshot({ roomPhase: 'lobby', running: false, startedAt: null, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
    setNotice('Room kembali ke lobby.');
  }

  function setSpeech(index: number) {
    if (!canControl) return;
    const nextIndex = Math.min(speeches.length - 1, Math.max(0, index));
    const nextDuration = getSpeechDuration(speeches[nextIndex].type, speechMinutes, speechSeconds, replyMinutes, replySeconds);
    setCurrentSpeech(nextIndex);
    setDuration(nextDuration);
    setRemaining(nextDuration);
    setStartedAt(null);
    setRunning(false);
    setPoiActive(false);
    setPoiStartedAt(null);
    setPoiResumeRunning(false);
    broadcastSnapshot({ currentSpeech: nextIndex, duration: nextDuration, remaining: nextDuration, startedAt: null, running: false, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
  }

  function toggleRun() {
    if (!canControl) return;
    if (running) {
      const rem = currentRemaining;
      setRunning(false);
      setStartedAt(null);
      setRemaining(rem);
      broadcastSnapshot({ running: false, startedAt: null, remaining: rem });
      return;
    }
    setRunning(true);
    setStartedAt(now);
    lastBellStageRef.current = '';
    broadcastSnapshot({ running: true, startedAt: now, remaining: currentRemaining });
  }

  function togglePoi() {
    if (!canControl || !canUsePoi) return;
    if (poiActive) {
      const shouldResume = poiResumeRunning;
      setPoiActive(false);
      setPoiStartedAt(null);
      setPoiResumeRunning(false);
      if (shouldResume) {
        setRunning(true);
        setStartedAt(now);
      }
      broadcastSnapshot({ poiActive: false, poiStartedAt: null, poiResumeRunning: false, running: shouldResume, startedAt: shouldResume ? now : null, remaining });
      return;
    }
    const pausedRemaining = currentRemaining;
    const shouldResume = running;
    setRunning(false);
    setStartedAt(null);
    setRemaining(pausedRemaining);
    setPoiActive(true);
    setPoiStartedAt(now);
    setPoiResumeRunning(shouldResume);
    broadcastSnapshot({ running: false, startedAt: null, remaining: pausedRemaining, poiActive: true, poiStartedAt: now, poiResumeRunning: shouldResume });
  }

  function resetTimer() {
    if (!canControl) return;
    const nextDuration = getSpeechDuration(activeSpeech.type, speechMinutes, speechSeconds, replyMinutes, replySeconds);
    setDuration(nextDuration);
    setRemaining(nextDuration);
    setRunning(false);
    setStartedAt(null);
    setPoiActive(false);
    setPoiStartedAt(null);
    setPoiResumeRunning(false);
    lastBellStageRef.current = '';
    broadcastSnapshot({ duration: nextDuration, remaining: nextDuration, running: false, startedAt: null, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
  }

  function applyFormat(next: FormatType) {
    if (!canControl) return;
    const nextDuration = getSpeechDuration(formats[next].speeches[0].type, speechMinutes, speechSeconds, replyMinutes, replySeconds);
    setFormat(next);
    setCurrentSpeech(0);
    setDuration(nextDuration);
    setRemaining(nextDuration);
    setStartedAt(null);
    setRunning(false);
    setPoiActive(false);
    setPoiStartedAt(null);
    setPoiResumeRunning(false);
    broadcastSnapshot({ format: next, currentSpeech: 0, duration: nextDuration, remaining: nextDuration, startedAt: null, running: false, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
  }

  function updateDurations(isReply: boolean, field: 'min' | 'sec', value: number) {
    if (!canControl) return;
    const safe = Math.max(0, value);
    const nextSpeechMin = isReply ? speechMinutes : (field === 'min' ? safe : speechMinutes);
    const nextSpeechSec = isReply ? speechSeconds : (field === 'sec' ? safe : speechSeconds);
    const nextReplyMin = isReply ? (field === 'min' ? safe : replyMinutes) : replyMinutes;
    const nextReplySec = isReply ? (field === 'sec' ? safe : replySeconds) : replySeconds;
    setSpeechMinutes(nextSpeechMin);
    setSpeechSeconds(nextSpeechSec);
    setReplyMinutes(nextReplyMin);
    setReplySeconds(nextReplySec);
    const nextDuration = getSpeechDuration(activeSpeech.type, nextSpeechMin, nextSpeechSec, nextReplyMin, nextReplySec);
    setDuration(nextDuration);
    setRemaining(nextDuration);
    setRunning(false);
    setStartedAt(null);
    setPoiActive(false);
    setPoiStartedAt(null);
    setPoiResumeRunning(false);
    broadcastSnapshot({ speechMinutes: nextSpeechMin, speechSeconds: nextSpeechSec, replyMinutes: nextReplyMin, replySeconds: nextReplySec, duration: nextDuration, remaining: nextDuration, running: false, startedAt: null, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
  }

  function toggleBell(enabled: boolean) {
    if (!canControl) return;
    setSoundEnabled(enabled);
    broadcastSnapshot({ soundEnabled: enabled });
  }

  function togglePoiEnabled(enabled: boolean) {
    if (!canControl) return;
    setPoiEnabled(enabled);
    if (!enabled) {
      setPoiActive(false);
      setPoiStartedAt(null);
      setPoiResumeRunning(false);
      broadcastSnapshot({ poiEnabled: enabled, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
      return;
    }
    broadcastSnapshot({ poiEnabled: enabled });
  }

  useEffect(() => {
    const id = setInterval(() => setNow(nowMs()), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!requestedRoom || autoJoinAttemptedRef.current) return;
    autoJoinAttemptedRef.current = true;
    setJoinCode(requestedRoom);
    const raw = localStorage.getItem(roomStorageKey(requestedRoom));
    if (!raw) {
      const noticeTimer = setTimeout(() => {
        setNotice('Room dari URL belum tersedia di browser ini.');
      }, 0);
      return () => clearTimeout(noticeTimer);
    }
    const timer = setTimeout(() => {
      void joinRoom();
    }, 0);
    return () => clearTimeout(timer);
  }, [requestedRoom]);

  useEffect(() => {
    if (!running || !canControl) return;
    if (currentRemaining > 0) {
      const stage = activeSpeech.type === 'reply' ? '' : (elapsed >= duration - 60 ? 'final' : elapsed >= 60 ? 'open' : '');
      if (stage && stage !== lastBellStageRef.current) {
        lastBellStageRef.current = stage;
        ringBell(stage as 'open' | 'final');
      }
      return;
    }
    const stopTimerId = setTimeout(() => {
      setRunning(false);
      setRemaining(0);
      setStartedAt(null);
      setPoiActive(false);
      setPoiStartedAt(null);
      setPoiResumeRunning(false);
      ringBell('end');
      broadcastSnapshot({ running: false, remaining: 0, startedAt: null, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
    }, 0);
    return () => clearTimeout(stopTimerId);
  }, [activeSpeech.type, canControl, currentRemaining, duration, elapsed, running]);

  useEffect(() => {
    if (!poiActive || !poiStartedAt || !canControl) return;
    const poiElapsed = (now - poiStartedAt) / 1000;
    if (poiElapsed < 15) return;
    const stopPoiId = setTimeout(() => {
      const shouldResume = poiResumeRunning;
      setPoiActive(false);
      setPoiStartedAt(null);
      setPoiResumeRunning(false);
      if (shouldResume) {
        setRunning(true);
        setStartedAt(now);
      }
      broadcastSnapshot({ poiActive: false, poiStartedAt: null, poiResumeRunning: false, running: shouldResume, startedAt: shouldResume ? now : null, remaining });
    }, 0);
    return () => clearTimeout(stopPoiId);
  }, [canControl, now, poiActive, poiResumeRunning, poiStartedAt, remaining]);

  const timerCardStyle = activeSpeech.type !== 'reply' && currentRemaining <= 20 && currentRemaining > 0
    ? { background: 'linear-gradient(145deg, rgba(191, 97, 106, 0.96), rgba(24, 32, 29, 0.98)), #bf616a' }
    : activeSpeech.type !== 'reply' && currentRemaining <= 60 && currentRemaining > 20
      ? { background: 'linear-gradient(145deg, rgba(201, 155, 52, 0.94), rgba(24, 32, 29, 0.98)), var(--gold)' }
      : {};

  return (
    <section id="timer" className="section active-section" style={{ display: 'block' }}>
      <div className={isDisplayView ? '' : 'timer-layout'}>
        {!isDisplayView && (
          <aside className="timer-config panel">
            <div className="panel-header">
              <h3>Debate Room Timer</h3>
              <span className="room-code">{roomCode}</span>
            </div>
            {notice && <p style={{ color: 'var(--green)', fontWeight: 700 }}>{notice}</p>}

            <label className="field-label">Mode</label>
            <div className="segmented">
              <button className={`segment ${roomRole === 'none' ? 'active' : ''}`} type="button" onClick={() => { void leaveRoom(); }}>Solo</button>
              <Link className={`segment ${roomRole !== 'none' ? 'active' : ''}`} href="/timer/room">Room</Link>
            </div>

            {roomRole !== 'none' && (
              <>
                <label className="field-label">Room setup</label>
                <div className="duration-grid">
                  <label>Room name<input className="input" value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="UDF Weekly #1" /></label>
                  <label>Display name<input className="input" value={joinName} onChange={(event) => setJoinName(event.target.value)} placeholder="Nama kamu" /></label>
                  <label>Join code<input className="input" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="UDF-1234" /></label>
                </div>
                <div className="timer-controls" style={{ justifyContent: 'flex-start', marginTop: '10px' }}>
                  <button className="primary-button" type="button" onClick={() => { void createRoom(); }}>Create Room</button>
                  <button className="secondary-button" type="button" onClick={() => { void joinRoom(); }}>Join Room</button>
                  <button className="secondary-button" type="button" onClick={() => { navigator.clipboard.writeText(roomCode); setCopyText('Copied'); setTimeout(() => setCopyText('Copy code'), 1200); }}>{copyText}</button>
                  {isRoom && <button className="ghost-button" type="button" onClick={() => { if (window.confirm('Leave this timer room?')) void leaveRoom(); }}>Leave Room</button>}
                  {isRoom && <button className="ghost-button" type="button" onClick={() => window.open(`/timer?room=${roomCode}&display=1`, '_blank')}>Open Display Tab</button>}
                </div>
                {isRoom && (
                  <div style={{ marginTop: '12px' }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Lobby participants ({participants.length})</strong>
                    <div className="table-list">
                      {participants.map((participant) => (
                        <div key={participant.key}>
                          <span>{participant.name}</span>
                          <strong>{participant.role === 'master' ? 'Host' : 'Member'}</strong>
                        </div>
                      ))}
                    </div>
                    {isMaster && (
                      <div className="timer-controls" style={{ justifyContent: 'flex-start', marginTop: '10px' }}>
                        {roomPhase === 'lobby' ? (
                          <button className="primary-button" type="button" onClick={startRoomLive}>Start Live</button>
                        ) : (
                          <button className="secondary-button" type="button" onClick={backToLobby}>Back to Lobby</button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <label className="field-label">Debate format</label>
            <div className="segmented">
              <button className={`segment ${format === 'AP' ? 'active' : ''}`} type="button" onClick={() => applyFormat('AP')} disabled={!canControl}>AP</button>
              <button className={`segment ${format === 'BP' ? 'active' : ''}`} type="button" onClick={() => applyFormat('BP')} disabled={!canControl}>BP</button>
            </div>

            <label className="field-label">Speech duration</label>
            <div className="duration-grid">
              <label>Min<input className="input" type="number" min="0" value={speechMinutes} onChange={(event) => updateDurations(false, 'min', Number(event.target.value))} disabled={!canControl} /></label>
              <label>Sec<input className="input" type="number" min="0" max="59" value={speechSeconds} onChange={(event) => updateDurations(false, 'sec', Number(event.target.value))} disabled={!canControl} /></label>
            </div>

            <label className="field-label">Reply duration</label>
            <div className="duration-grid">
              <label>Min<input className="input" type="number" min="0" value={replyMinutes} onChange={(event) => updateDurations(true, 'min', Number(event.target.value))} disabled={!canControl} /></label>
              <label>Sec<input className="input" type="number" min="0" max="59" value={replySeconds} onChange={(event) => updateDurations(true, 'sec', Number(event.target.value))} disabled={!canControl} /></label>
            </div>

            <label className="switch-row">
              <input type="checkbox" checked={soundEnabled} onChange={(event) => toggleBell(event.target.checked)} disabled={!canControl} />
              Bell at protected time
            </label>
            <label className="switch-row">
              <input type="checkbox" checked={poiEnabled} onChange={(event) => togglePoiEnabled(event.target.checked)} disabled={!canControl} />
              Enable POI Button
            </label>
            {isRoom && <p style={{ color: 'var(--muted)' }}>{isMaster ? 'Kamu room master: full control timer.' : 'Kamu peserta: sinkron real-time read-only.'}</p>}
            {isRoom && roomPhase === 'lobby' && <p style={{ color: 'var(--gold)', fontWeight: 700 }}>Room masih di lobby. Timer belum bisa dijalankan.</p>}
          </aside>
        )}

        <div className="timer-stage">
          <div className="timer-card" style={timerCardStyle}>
            <div className="segmented" style={{ maxWidth: '240px', margin: '0 auto 24px', background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }}>
              <button className={`segment ${displayMode === 'countdown' ? 'active' : ''}`} type="button" onClick={() => setDisplayMode('countdown')} style={{ color: displayMode === 'countdown' ? 'var(--green)' : 'white' }}>Countdown</button>
              <button className={`segment ${displayMode === 'countup' ? 'active' : ''}`} type="button" onClick={() => setDisplayMode('countup')} style={{ color: displayMode === 'countup' ? 'var(--green)' : 'white' }}>Countup</button>
            </div>

            <div className="timer-meta">
              <span>{formats[format].label}</span>
              <span>{isRoom ? `${roomName || 'Room'} • ${roomPhase === 'lobby' ? 'Lobby' : 'Live'} • ${isMaster ? 'Master' : 'Member'}` : 'Solo Timer'}</span>
            </div>
            <div className="speaker-line">
              <span>{activeSpeech.side}</span>
              <h2>{activeSpeech.name}</h2>
            </div>

            <div style={{ position: 'relative' }}>
              <div className="time-display" style={{ marginBottom: poiActive ? '10px' : '0' }}>{formatTime(timeToShow)}</div>
              {poiActive && <div style={{ fontSize: '2.5rem', color: 'var(--gold)', textAlign: 'center', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>POI: {formatTime(poiCountdown)}</div>}
            </div>

            <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
            <div className="poi-window">{poiText}</div>
            {isRoom && roomPhase === 'lobby' && <div className="poi-window" style={{ color: 'var(--gold)' }}>Menunggu host memulai room...</div>}

            <div className="timer-controls">
              <button className="icon-button" type="button" onClick={() => setSpeech(currentSpeech - 1)} disabled={!canControl}>Prev</button>
              <button className="primary-button large" type="button" onClick={toggleRun} disabled={!canControl}>{running ? 'Pause' : 'Start'}</button>
              {poiEnabled && activeSpeech.type !== 'reply' && <button className="secondary-button" type="button" onClick={togglePoi} disabled={!canControl || (!poiActive && !canUsePoi)}>{poiActive ? 'Stop POI' : 'POI'}</button>}
              <button className="icon-button" type="button" onClick={() => setSpeech(currentSpeech + 1)} disabled={!canControl}>Next</button>
              <button className="secondary-button" type="button" onClick={resetTimer} disabled={!canControl}>Reset</button>
            </div>
          </div>

          {!isDisplayView && (
            <div className="speech-strip">
              {speeches.map((sp, index) => (
                <button key={`${sp.name}-${index}`} className={`speech-pill ${index === currentSpeech ? 'active' : ''}`} type="button" onClick={() => setSpeech(index)} disabled={!canControl}>
                  <span>{sp.side}</span>
                  <strong>{sp.name}</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function TimerPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem' }}>Loading timer...</div>}>
      <TimerContent />
    </Suspense>
  );
}
