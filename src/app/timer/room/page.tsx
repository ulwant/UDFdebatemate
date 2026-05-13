'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import styles from './RoomTimer.module.css';

type FormatType = 'AP' | 'BP';
type Role = 'host' | 'member';
type Phase = 'join' | 'create' | 'lobby' | 'live';
type Speech = { name: string; side: string; type: 'main' | 'reply' };
type RoomSnapshot = {
  code: string;
  name: string;
  phase: 'lobby' | 'live';
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
};
type Participant = {
  id: string;
  room_code: string;
  name: string;
  role: Role;
  joined_at: string;
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

function asSnapshot(value: unknown): RoomSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  return value as RoomSnapshot;
}

export default function RoomTimerPage() {
  const [phase, setPhase] = useState<Phase>('join');
  const [role, setRole] = useState<Role>('member');
  const [pin, setPin] = useState('');
  const [displayName, setDisplayName] = useState(makeGuestName);
  const [roomName, setRoomName] = useState('UDF Debate Room');
  const [format, setFormat] = useState<FormatType>('AP');
  const [speechMinutes, setSpeechMinutes] = useState(7);
  const [speechSeconds, setSpeechSeconds] = useState(0);
  const [replyMinutes, setReplyMinutes] = useState(4);
  const [replySeconds, setReplySeconds] = useState(0);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(nowMs());
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [roomBusy, setRoomBusy] = useState(false);

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

  const activeFormat = snapshot?.format || format;
  const speeches = formats[activeFormat].speeches;
  const activeSpeech = speeches[snapshot?.currentSpeech || 0] || speeches[0];
  const canControl = role === 'host';

  const currentRemaining = useMemo(() => {
    if (!snapshot) return getDuration('main', speechMinutes, speechSeconds, replyMinutes, replySeconds);
    if (!snapshot.running || !snapshot.startedAt) return snapshot.remaining;
    return Math.max(0, snapshot.remaining - (now - snapshot.startedAt) / 1000);
  }, [now, replyMinutes, replySeconds, snapshot, speechMinutes, speechSeconds]);

  const duration = snapshot?.duration || getDuration('main', speechMinutes, speechSeconds, replyMinutes, replySeconds);
  const elapsed = duration - currentRemaining;
  const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
  const poiCountdown = snapshot?.poiActive && snapshot.poiStartedAt ? Math.max(0, 15 - (now - snapshot.poiStartedAt) / 1000) : 0;
  const canUsePoi = Boolean(snapshot?.poiEnabled && activeSpeech.type !== 'reply' && elapsed >= 60 && elapsed <= Math.max(0, duration - 60));
  const timerTone = activeSpeech.type !== 'reply' && currentRemaining <= 20 && currentRemaining > 0
    ? styles.danger
    : activeSpeech.type !== 'reply' && currentRemaining <= 60 && currentRemaining > 20
      ? styles.warning
      : '';

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

  async function fetchRoom(code = snapshot?.code) {
    if (!code) return;
    const [{ data: roomData }, { data: memberData }] = await Promise.all([
      supabase.from('debate_timer_rooms').select('*').eq('code', code).single(),
      supabase.from('debate_timer_participants').select('*').eq('room_code', code).order('joined_at', { ascending: true }),
    ]);

    const nextSnapshot = asSnapshot(roomData?.snapshot);
    if (nextSnapshot) {
      setSnapshot(nextSnapshot);
      setPhase(nextSnapshot.phase);
    }
    if (memberData) setParticipants(memberData as Participant[]);
  }

  async function addParticipant(code: string, nextRole: Role, name: string) {
    const { data, error } = await supabase
      .from('debate_timer_participants')
      .insert({ room_code: code, role: nextRole, name })
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

      const joined = await addParticipant(code, 'host', displayName.trim() || 'Host');
      if (!joined) return;
      setRole('host');
      setPin(code);
      setSnapshot(nextSnapshot);
      setPhase('lobby');
      setNotice('');
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
      if (!nextSnapshot) {
        setNotice('Data lobby rusak atau belum siap.');
        return;
      }

      const joined = await addParticipant(code, 'member', displayName.trim() || makeGuestName());
      if (!joined) return;
      setRole('member');
      setSnapshot(nextSnapshot);
      setPhase(nextSnapshot.phase);
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
    await saveSnapshot({ ...snapshot, phase: live ? 'live' : 'lobby', running: false, startedAt: null, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
  }

  async function setSpeech(index: number) {
    if (!snapshot || !canControl) return;
    const safeIndex = Math.min(speeches.length - 1, Math.max(0, index));
    const nextSpeech = speeches[safeIndex];
    const nextDuration = getDuration(nextSpeech.type, snapshot.speechMinutes, snapshot.speechSeconds, snapshot.replyMinutes, snapshot.replySeconds);
    await saveSnapshot({
      ...snapshot,
      currentSpeech: safeIndex,
      duration: nextDuration,
      remaining: nextDuration,
      running: false,
      startedAt: null,
      poiActive: false,
      poiStartedAt: null,
      poiResumeRunning: false,
    });
  }

  async function toggleRun() {
    if (!snapshot || !canControl || snapshot.phase !== 'live' || snapshot.poiActive) return;
    if (snapshot.running) {
      await saveSnapshot({ ...snapshot, running: false, startedAt: null, remaining: currentRemaining });
      return;
    }
    await saveSnapshot({ ...snapshot, running: true, startedAt: now, remaining: currentRemaining });
  }

  async function togglePoi() {
    if (!snapshot || !canControl || snapshot.phase !== 'live' || !canUsePoi) return;
    if (snapshot.poiActive) {
      const shouldResume = snapshot.poiResumeRunning;
      await saveSnapshot({
        ...snapshot,
        poiActive: false,
        poiStartedAt: null,
        poiResumeRunning: false,
        running: shouldResume,
        startedAt: shouldResume ? now : null,
      });
      return;
    }

    await saveSnapshot({
      ...snapshot,
      running: false,
      startedAt: null,
      remaining: currentRemaining,
      poiActive: true,
      poiStartedAt: now,
      poiResumeRunning: snapshot.running,
    });
  }

  async function resetTimer() {
    if (!snapshot || !canControl) return;
    await saveSnapshot({ ...snapshot, running: false, startedAt: null, remaining: snapshot.duration, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
  }

  async function applyRoomConfig() {
    if (!snapshot || !canControl) return;
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
      startedAt: null,
      poiEnabled: true,
      poiActive: false,
      poiStartedAt: null,
      poiResumeRunning: false,
    });
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(nowMs()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!snapshot?.code) return;
    const poller = setInterval(() => {
      void fetchRoom(snapshot.code);
    }, 1500);
    return () => clearInterval(poller);
  }, [snapshot?.code]);

  useEffect(() => {
    if (!participantId) return;
    const heartbeat = setInterval(() => {
      void supabase
        .from('debate_timer_participants')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', participantId);
    }, 10000);
    return () => clearInterval(heartbeat);
  }, [participantId]);

  useEffect(() => {
    if (!snapshot || !canControl || !snapshot.running || currentRemaining > 0) return;
    const timer = setTimeout(() => {
      void saveSnapshot({ ...snapshot, running: false, startedAt: null, remaining: 0, poiActive: false, poiStartedAt: null, poiResumeRunning: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [canControl, currentRemaining, snapshot]);

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
        startedAt: shouldResume ? now : null,
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [canControl, now, poiCountdown, snapshot]);

  if (phase === 'join' || phase === 'create') {
    return (
      <section className="section active-section" style={{ display: 'block' }}>
        <div className={styles.roomShell}>
          <div className={styles.joinHero}>
            <h1 className={styles.brand}>Debate!</h1>
            <div className={styles.choiceRow}>
              <button className={phase === 'join' ? styles.active : ''} onClick={() => setPhase('join')} type="button">Enter PIN</button>
              <button className={phase === 'create' ? styles.active : ''} onClick={() => setPhase('create')} type="button">Create Lobby</button>
            </div>

            {notice && <div className={styles.notice}>{notice}</div>}

            {phase === 'join' ? (
              <div className={styles.joinCard}>
                <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Game PIN" inputMode="numeric" />
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
                <button onClick={joinLobby} type="button" disabled={roomBusy}>{roomBusy ? 'Entering...' : 'Enter'}</button>
              </div>
            ) : (
              <div className={styles.createCard}>
                <div className={styles.formGrid}>
                  <label className={styles.fullSpan}>Lobby name<input value={roomName} onChange={(event) => setRoomName(event.target.value)} /></label>
                  <label className={styles.fullSpan}>Host name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
                  <label>Format<select value={format} onChange={(event) => updateLocalConfig(event.target.value as FormatType, speechMinutes, speechSeconds, replyMinutes, replySeconds)}><option value="AP">Asian Parliamentary</option><option value="BP">British Parliamentary</option></select></label>
                  <label>Speech min<input type="number" min="0" value={speechMinutes} onChange={(event) => updateLocalConfig(format, Number(event.target.value), speechSeconds, replyMinutes, replySeconds)} /></label>
                  <label>Speech sec<input type="number" min="0" max="59" value={speechSeconds} onChange={(event) => updateLocalConfig(format, speechMinutes, Number(event.target.value), replyMinutes, replySeconds)} /></label>
                  <label>Reply min<input type="number" min="0" value={replyMinutes} onChange={(event) => updateLocalConfig(format, speechMinutes, speechSeconds, Number(event.target.value), replySeconds)} /></label>
                  <label>Reply sec<input type="number" min="0" max="59" value={replySeconds} onChange={(event) => updateLocalConfig(format, speechMinutes, speechSeconds, replyMinutes, Number(event.target.value))} /></label>
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
            {notice && <div className={styles.notice}>{notice}</div>}
            <div className={styles.lobbyActions}>
              {canControl && snapshot?.phase === 'lobby' && <button className={styles.darkButton} onClick={() => setLive(true)} type="button">Start Live</button>}
              {canControl && snapshot?.phase === 'live' && <button className={styles.darkButton} onClick={() => setLive(false)} type="button">Back to Lobby</button>}
              {canControl && <button className={styles.darkButton} onClick={applyRoomConfig} type="button">Apply Config</button>}
              <button className={styles.darkButton} onClick={() => navigator.clipboard.writeText(snapshot?.code || '')} type="button">Copy PIN</button>
            </div>

            {canControl && snapshot && (
              <div className={`${styles.formGrid} ${styles.lobbyConfigGrid}`}>
                <label className={styles.fullSpan}>Lobby name<input value={roomName} onChange={(event) => setRoomName(event.target.value)} /></label>
                <div className={styles.settingsGroup}>
                  <span className={styles.groupLabel}>Debate format</span>
                  <div className={styles.choiceRow}>
                    <button className={format === 'AP' ? styles.active : ''} type="button" onClick={() => setFormat('AP')}>AP</button>
                    <button className={format === 'BP' ? styles.active : ''} type="button" onClick={() => setFormat('BP')}>BP</button>
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

            <h3>Players ({participants.length})</h3>
            <div className={styles.participantList}>
              {participants.map((participant) => (
                <div className={styles.participant} key={participant.id}>
                  <span>{participant.name}</span>
                  <strong>{participant.role === 'host' ? 'Host' : 'Joined'}</strong>
                </div>
              ))}
            </div>
          </aside>

          <main>
            <div className={`${styles.timerPanel} ${timerTone}`}>
              <div className={styles.timerMeta}>
                <span>{formats[activeFormat].label}</span>
                <span>{snapshot?.phase === 'live' ? 'Live Room' : 'Lobby'}</span>
              </div>
              <div className={styles.speakerLine}>
                <span>{activeSpeech.side}</span>
                <h2>{activeSpeech.name}</h2>
              </div>
              <div className={styles.timeDisplay}>{formatTime(currentRemaining)}</div>
              {snapshot?.poiActive && <div className={styles.poiCountdown}>POI: {formatTime(poiCountdown)}</div>}
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
              {!canControl && <div className={styles.readOnly}>Synced viewer mode. Host controls the timer.</div>}
              {snapshot?.phase === 'lobby' && <div className={styles.readOnly}>Waiting in lobby. Host will start the room.</div>}
              <div className={styles.controls}>
                <button className={styles.secondary} onClick={() => setSpeech((snapshot?.currentSpeech || 0) - 1)} disabled={!canControl} type="button">Prev</button>
                <button className={styles.primary} onClick={toggleRun} disabled={!canControl || snapshot?.phase !== 'live'} type="button">{snapshot?.running ? 'Pause' : 'Start'}</button>
                {snapshot?.poiEnabled && activeSpeech.type !== 'reply' && <button className={styles.secondary} onClick={togglePoi} disabled={!canControl || (!snapshot.poiActive && !canUsePoi)} type="button">{snapshot.poiActive ? 'Stop POI' : 'POI'}</button>}
                <button className={styles.secondary} onClick={() => setSpeech((snapshot?.currentSpeech || 0) + 1)} disabled={!canControl} type="button">Next</button>
                <button className={styles.secondary} onClick={resetTimer} disabled={!canControl} type="button">Reset</button>
              </div>
            </div>

            <div className={styles.speechStrip}>
              {speeches.map((speech, index) => (
                <button key={`${speech.name}-${index}`} className={index === snapshot?.currentSpeech ? styles.active : ''} onClick={() => setSpeech(index)} disabled={!canControl} type="button">
                  <span>{speech.side}</span>
                  <strong>{speech.name}</strong>
                </button>
              ))}
            </div>
          </main>
        </div>
      </div>
    </section>
  );
}
