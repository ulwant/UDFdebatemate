'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { notifyApprovedMembers, notifyEbAdmins } from '@/lib/notifications';
import { useToast } from '@/app/components/ToastContext';
import styles from './Calendar.module.css';

type WeeklySession = {
  id: string;
  title: string;
  scheduled_at: string;
  notes?: string | null;
  is_locked: boolean;
};

type CalendarVisibility = 'public' | 'eb_admin';

type CalendarEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  notes?: string | null;
  visibility: CalendarVisibility;
  created_by: string;
};

type CalendarItem = {
  id: string;
  source: 'weekly' | 'event';
  title: string;
  starts_at: string;
  ends_at?: string | null;
  notes?: string | null;
  location?: string | null;
  visibility: CalendarVisibility;
  is_locked?: boolean;
};

type CalendarFilter = 'all' | 'event' | 'weekly';
type CalendarView = 'schedule' | 'day' | 'threeDays' | 'week' | 'month';

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const VIEW_LABEL: Record<CalendarView, string> = {
  schedule: 'Schedule',
  day: 'Day',
  threeDays: '3 Days',
  week: 'Week',
  month: 'Month',
};

const EVENT_TYPE_LABEL = {
  event: 'Event',
  weekly: 'Weekly',
};

const VISIBILITY_LABEL = {
  public: 'Semua member',
  eb_admin: 'EB/Admin',
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthRangeWithPadding(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  start.setDate(start.getDate() - 7);
  const end = new Date(year, monthIndex, 1);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatInputDate(iso: string) {
  const date = new Date(iso);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function addMonth(month: string, offset: number) {
  const [year, monthIndex] = month.split('-').map(Number);
  const base = new Date(year, monthIndex - 1 + offset, 1);
  return monthKey(base);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getWeekStart(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() - ((next.getDay() + 6) % 7));
  return next;
}

function toEventItem(event: CalendarEvent): CalendarItem {
  return {
    id: event.id,
    source: 'event',
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    location: event.location,
    notes: event.notes,
    visibility: event.visibility,
  };
}

function toWeeklyItem(weekly: WeeklySession): CalendarItem {
  return {
    id: weekly.id,
    source: 'weekly',
    title: weekly.title,
    starts_at: weekly.scheduled_at,
    notes: weekly.notes,
    visibility: 'public',
    is_locked: weekly.is_locked,
  };
}

function formatTimeRange(item: CalendarItem) {
  const start = new Date(item.starts_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (!item.ends_at) return start;
  const end = new Date(item.ends_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${start}-${end}`;
}

function getItemEnd(item: CalendarItem) {
  return new Date(item.ends_at || item.starts_at);
}

function itemOverlapsRange(item: CalendarItem, start: Date, end: Date) {
  const itemStart = new Date(item.starts_at);
  const itemEnd = getItemEnd(item);
  return itemStart < end && itemEnd >= start;
}

function formatStartTime(item: CalendarItem) {
  return new Date(item.starts_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function defaultEventDraft(date?: Date | null) {
  const base = date ? new Date(date) : new Date();
  base.setHours(19, 0, 0, 0);
  const end = new Date(base);
  end.setHours(base.getHours() + 1);
  return {
    title: '',
    starts_at: formatInputDate(base.toISOString()),
    ends_at: formatInputDate(end.toISOString()),
    location: '',
    notes: '',
    visibility: 'public' as CalendarVisibility,
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [userRole, setUserRole] = useState('member');
  const [weeklySessions, setWeeklySessions] = useState<WeeklySession[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const { addToast } = useToast();
  const setNotice = useCallback((msg: string) => {
    if (!msg) return;
    const isError = msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('error') || msg.toLowerCase().includes('wajib');
    addToast({ title: isError ? 'Terjadi Kesalahan' : 'Pemberitahuan', message: msg, type: isError ? 'error' : 'success' });
  }, [addToast]);
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [eventDraft, setEventDraft] = useState(defaultEventDraft(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(defaultEventDraft());
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const touchStartX = useRef<number | null>(null);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const isEb = userRole === 'eb' || userRole === 'admin';

  useEffect(() => {
    async function boot() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('system_role').eq('user_id', session.user.id).single();
      if (profile?.system_role) setUserRole(profile.system_role);
      setLoading(false);
    }

    boot();
  }, [router]);

  const fetchCalendar = useCallback(async () => {
    const { start, end } = getMonthRangeWithPadding(selectedMonth);
    const [weeklyResult, eventResult] = await Promise.all([
      supabase
        .from('weekly_sessions')
        .select('id, title, scheduled_at, notes, is_locked')
        .gte('scheduled_at', start)
        .lt('scheduled_at', end)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('calendar_events')
        .select('id, title, starts_at, ends_at, location, notes, visibility, created_by')
        .gte('starts_at', start)
        .lt('starts_at', end)
        .order('starts_at', { ascending: true }),
    ]);

    if (weeklyResult.error) {
      setNotice(`Gagal memuat weekly: ${weeklyResult.error.message}`);
      return;
    }
    if (eventResult.error) {
      setNotice(`Gagal memuat event: ${eventResult.error.message}. Pastikan supabase_calendar_events.sql sudah dijalankan.`);
      setWeeklySessions((weeklyResult.data || []) as WeeklySession[]);
      return;
    }
    setWeeklySessions((weeklyResult.data || []) as WeeklySession[]);
    setCalendarEvents((eventResult.data || []) as CalendarEvent[]);
  }, [selectedMonth, setNotice]);

  useEffect(() => {
    if (loading) return;
    void Promise.resolve().then(fetchCalendar);
  }, [fetchCalendar, loading]);

  async function createEvent() {
    if (!eventDraft.title || !eventDraft.starts_at) {
      setNotice('Judul dan tanggal event wajib diisi.');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('calendar_events').insert({
      title: eventDraft.title,
      starts_at: new Date(eventDraft.starts_at).toISOString(),
      ends_at: eventDraft.ends_at ? new Date(eventDraft.ends_at).toISOString() : null,
      location: eventDraft.location || null,
      notes: eventDraft.notes || null,
      visibility: eventDraft.visibility,
      created_by: session.user.id,
    });
    if (error) {
      setNotice(`Gagal menambah event: ${error.message}. Pastikan supabase_calendar_events.sql sudah dijalankan.`);
      return;
    }

    const notifyAudience = eventDraft.visibility === 'eb_admin' ? notifyEbAdmins : notifyApprovedMembers;
    await notifyAudience({
      title: 'New Calendar Event',
      message: `${eventDraft.title} ditambahkan ke kalender pada ${new Date(eventDraft.starts_at).toLocaleString('id-ID')}.`,
      link: '/calendar',
      type: 'calendar',
    });
    setEventDraft(defaultEventDraft(selectedDate));
    setShowCreateCard(false);
    setNotice('Event kalender berhasil ditambahkan. Event ini terpisah dari weekly.');
    await fetchCalendar();
  }

  function chooseDate(date: Date) {
    setSelectedDate(date);
    setSelectedMonth(monthKey(date));
    setActiveItem(null);
    setEventDraft((current) => {
      const start = new Date(date);
      const existing = current.starts_at ? new Date(current.starts_at) : new Date();
      start.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      return {
        ...current,
        starts_at: formatInputDate(start.toISOString()),
        ends_at: formatInputDate(end.toISOString()),
      };
    });
  }

  const navigateCalendar = useCallback((direction: -1 | 1) => {
    const base = selectedDate || new Date();
    let nextDate = base;

    if (calendarView === 'month' || calendarView === 'schedule') {
      const nextMonth = addMonth(selectedMonth, direction);
      setSelectedMonth(nextMonth);
      const [year, month] = nextMonth.split('-').map(Number);
      nextDate = new Date(year, month - 1, 1);
    } else if (calendarView === 'day') {
      nextDate = addDays(base, direction);
      setSelectedMonth(monthKey(nextDate));
    } else if (calendarView === 'threeDays') {
      nextDate = addDays(base, direction * 3);
      setSelectedMonth(monthKey(nextDate));
    } else {
      nextDate = addDays(base, direction * 7);
      setSelectedMonth(monthKey(nextDate));
    }

    setSelectedDate(nextDate);
    setActiveItem(null);
  }, [calendarView, selectedDate, selectedMonth]);

  useEffect(() => {
    if (calendarView === 'month') return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateCalendar(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateCalendar(1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calendarView, navigateCalendar]);

  useEffect(() => {
    function closeViewMenu(event: MouseEvent) {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setShowViewMenu(false);
      }
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowViewMenu(false);
    }

    document.addEventListener('mousedown', closeViewMenu);
    document.addEventListener('keydown', closeWithEscape);
    return () => {
      document.removeEventListener('mousedown', closeViewMenu);
      document.removeEventListener('keydown', closeWithEscape);
    };
  }, []);

  function startSwipe(clientX: number) {
    if (calendarView === 'month') return;
    touchStartX.current = clientX;
  }

  function endSwipe(clientX: number) {
    if (calendarView === 'month' || touchStartX.current === null) return;
    const delta = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    navigateCalendar(delta > 0 ? -1 : 1);
  }

  function startEdit(item: CalendarItem) {
    if (item.source !== 'event') return;
    setEditingId(item.id);
    setEditingDraft({
      title: item.title,
      starts_at: formatInputDate(item.starts_at),
      ends_at: item.ends_at ? formatInputDate(item.ends_at) : '',
      location: item.location || '',
      notes: item.notes || '',
      visibility: item.visibility,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDraft(defaultEventDraft(selectedDate));
  }

  async function saveEdit(id: string) {
    if (!editingDraft.title || !editingDraft.starts_at) {
      setNotice('Judul dan tanggal event wajib diisi.');
      return;
    }
    const { error } = await supabase.from('calendar_events').update({
      title: editingDraft.title,
      starts_at: new Date(editingDraft.starts_at).toISOString(),
      ends_at: editingDraft.ends_at ? new Date(editingDraft.ends_at).toISOString() : null,
      location: editingDraft.location || null,
      notes: editingDraft.notes || null,
      visibility: editingDraft.visibility,
    }).eq('id', id);
    if (error) {
      setNotice(`Gagal update event: ${error.message}`);
      return;
    }

    const notifyAudience = editingDraft.visibility === 'eb_admin' ? notifyEbAdmins : notifyApprovedMembers;
    await notifyAudience({
      title: 'Calendar Event Updated',
      message: `${editingDraft.title} punya update jadwal/detail terbaru.`,
      link: '/calendar',
      type: 'calendar',
      priority: 'high',
    });
    cancelEdit();
    setNotice('Event kalender berhasil diupdate.');
    await fetchCalendar();
  }

  async function removeEvent(id: string) {
    const removedEvent = calendarEvents.find((event) => event.id === id);
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) {
      setNotice(`Gagal hapus event: ${error.message}`);
      return;
    }
    if (removedEvent) {
      const notifyAudience = removedEvent.visibility === 'eb_admin' ? notifyEbAdmins : notifyApprovedMembers;
      await notifyAudience({
        title: 'Calendar Event Cancelled',
        message: `${removedEvent.title} dihapus dari kalender.`,
        link: '/calendar',
        type: 'calendar',
        priority: 'high',
      });
    }
    setNotice('Event kalender berhasil dihapus.');
    setActiveItem(null);
    await fetchCalendar();
  }

  const allItems = useMemo(() => {
    const items = [...weeklySessions.map(toWeeklyItem), ...calendarEvents.map(toEventItem)];
    return items.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [calendarEvents, weeklySessions]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (filter === 'all') return true;
      return item.source === filter;
    });
  }, [allItems, filter]);

  const selectedDateItems = useMemo(() => {
    if (!selectedDate) return filteredItems;
    const selected = dateKey(selectedDate);
    return filteredItems.filter((item) => dateKey(new Date(item.starts_at)) === selected);
  }, [filteredItems, selectedDate]);

  const activeDate = useMemo(() => selectedDate || new Date(), [selectedDate]);

  const visibleDays = useMemo(() => {
    if (calendarView === 'day') return [startOfDay(activeDate)];
    if (calendarView === 'threeDays') {
      const start = startOfDay(activeDate);
      return [start, addDays(start, 1), addDays(start, 2)];
    }
    const start = getWeekStart(activeDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [activeDate, calendarView]);

  const visibleRangeItems = useMemo(() => {
    if (calendarView === 'month' || calendarView === 'schedule') return filteredItems;
    const rangeStart = visibleDays[0];
    const rangeEnd = addDays(visibleDays[visibleDays.length - 1], 1);
    return filteredItems.filter((item) => itemOverlapsRange(item, rangeStart, rangeEnd));
  }, [calendarView, filteredItems, visibleDays]);

  const visibleDayGroups = useMemo(() => {
    return visibleDays.map((date) => {
      const dayStart = startOfDay(date);
      const dayEnd = addDays(dayStart, 1);
      return {
        date,
        items: visibleRangeItems.filter((item) => itemOverlapsRange(item, dayStart, dayEnd)),
      };
    });
  }, [visibleDays, visibleRangeItems]);

  const scheduleGroups = useMemo(() => {
    const itemsInMonth = filteredItems.filter((item) => monthKey(new Date(item.starts_at)) === selectedMonth);
    const groups = new Map<string, CalendarItem[]>();
    itemsInMonth.forEach((item) => {
      const key = dateKey(new Date(item.starts_at));
      groups.set(key, [...(groups.get(key) || []), item]);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      date: startOfDay(new Date(items[0].starts_at)),
      items,
    }));
  }, [filteredItems, selectedMonth]);

  const calendarCells = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const totalDays = new Date(year, month, 0).getDate();
    const mondayStartOffset = (first.getDay() + 6) % 7;
    const cells: Array<{ date: Date | null; events: CalendarItem[] }> = [];

    for (let i = 0; i < mondayStartOffset; i += 1) {
      cells.push({ date: null, events: [] });
    }
    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month - 1, day);
      const events = filteredItems.filter((event) => dateKey(new Date(event.starts_at)) === dateKey(date));
      cells.push({ date, events });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, events: [] });
    }
    return cells;
  }, [filteredItems, selectedMonth]);

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <section id="calendar" className="section active-section" style={{ display: 'block' }}>
      <article className="panel">
        <div className={styles.calendarHeader}>
          <div>
            <p className="eyebrow">Kalender UDF</p>
            <h3>Weekly, event publik, dan agenda EB/Admin</h3>
          </div>
          <div className={styles.monthNav}>
            <button className="ghost-button" type="button" onClick={() => navigateCalendar(-1)}>Bulan lalu</button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (!e.target.value) return;
                setSelectedMonth(e.target.value);
                const [year, month] = e.target.value.split('-').map(Number);
                setSelectedDate(new Date(year, month - 1, 1));
              }}
              className="input"
              style={{ width: 'auto', fontWeight: 'bold' }}
            />
            <button className="ghost-button" type="button" onClick={() => navigateCalendar(1)}>Bulan depan</button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.viewMenu} ref={viewMenuRef}>
            <button
              className="ghost-button"
              type="button"
              aria-haspopup="menu"
              aria-expanded={showViewMenu}
              onClick={() => setShowViewMenu((current) => !current)}
            >
              ☰ {VIEW_LABEL[calendarView]}
            </button>
            {showViewMenu && (
              <div className={styles.viewMenuList} role="menu">
                {(['schedule', 'day', 'threeDays', 'week', 'month'] as CalendarView[]).map((view) => (
                  <button
                    key={view}
                    type="button"
                    role="menuitem"
                    data-active={calendarView === view}
                    onClick={() => {
                      setCalendarView(view);
                      setShowViewMenu(false);
                    }}
                  >
                    {VIEW_LABEL[view]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.filterGroup}>
            {(['all', 'event', 'weekly'] as CalendarFilter[]).map((item) => (
              <button
                key={item}
                className={filter === item ? 'primary-button' : 'ghost-button'}
                type="button"
                onClick={() => setFilter(item)}
              >
                {item === 'all' ? 'Semua' : item === 'event' ? 'Event' : 'Weekly'}
              </button>
            ))}
          </div>
          <div className={styles.toolbarActions}>
            {isEb && (
              <button className="secondary-button" type="button" onClick={() => setShowCreateCard((current) => !current)}>
                {showCreateCard ? 'Tutup Form' : 'Tambah Event'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.legendRow} aria-label="Calendar legend">
          <span><i data-kind="event" /> Event</span>
          <span><i data-kind="weekly" /> Weekly</span>
          <span><i data-kind="eb" /> EB/Admin</span>
        </div>

        <div className={styles.calendarShell}>
          <div
            className={styles.calendarCanvas}
            onTouchStart={(event) => startSwipe(event.changedTouches[0].clientX)}
            onTouchEnd={(event) => endSwipe(event.changedTouches[0].clientX)}
          >
            {calendarView !== 'month' && (
              <button className={`${styles.viewNavButton} ${styles.viewNavPrev}`} type="button" aria-label="Sebelumnya" onClick={() => navigateCalendar(-1)}>
                ‹
              </button>
            )}

            {calendarView === 'month' && (
              <div>
                <div className={styles.dayNameRow}>
                  {DAY_NAMES.map((day) => <div key={day}>{day}</div>)}
                </div>
                <div className={styles.grid}>
                  {calendarCells.map((cell, index) => {
                    const isSelected = Boolean(cell.date && selectedDate && dateKey(cell.date) === dateKey(selectedDate));
                    const isToday = Boolean(cell.date && dateKey(cell.date) === dateKey(new Date()));
                    return (
                      <button
                        key={`${cell.date?.toISOString() || 'blank'}-${index}`}
                        className={styles.cell}
                        data-empty={!cell.date}
                        data-selected={isSelected}
                        data-today={isToday}
                        type="button"
                        onClick={() => cell.date && chooseDate(cell.date)}
                      >
                        {cell.date ? (
                          <>
                            <strong>{cell.date.getDate()}</strong>
                            <div className={styles.cellEvents}>
                              {cell.events.slice(0, 3).map((item) => (
                                <span
                                  key={`${item.source}-${item.id}`}
                                  className={styles.eventPill}
                                  data-source={item.source}
                                  data-visibility={item.visibility}
                                  data-locked={item.is_locked}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedDate(cell.date);
                                    setActiveItem(item);
                                  }}
                                >
                                  {item.title} - {formatStartTime(item)}
                                </span>
                              ))}
                              {cell.events.length > 3 && <span className={styles.morePill}>+{cell.events.length - 3} lagi</span>}
                            </div>
                          </>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {calendarView === 'schedule' && (
              <div className={styles.scheduleList}>
                {scheduleGroups.length === 0 ? (
                  <p className={styles.empty}>Tidak ada agenda di bulan ini.</p>
                ) : (
                  scheduleGroups.map((group) => (
                    <div key={group.key} className={styles.scheduleDay}>
                      <button className={styles.scheduleDate} type="button" onClick={() => chooseDate(group.date)}>
                        <span>{group.date.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                        <strong>{group.date.getDate()}</strong>
                        <small>{group.date.toLocaleDateString('id-ID', { month: 'short' })}</small>
                      </button>
                      <div className={styles.scheduleItems}>
                        {group.items.map((item) => (
                          <button
                            key={`${item.source}-${item.id}`}
                            className={styles.timelineItem}
                            type="button"
                            data-source={item.source}
                            data-visibility={item.visibility}
                            onClick={() => {
                              chooseDate(group.date);
                              setActiveItem(item);
                            }}
                          >
                            <span>{formatTimeRange(item)}</span>
                            <strong>{item.title}</strong>
                            <small>{EVENT_TYPE_LABEL[item.source]} - {VISIBILITY_LABEL[item.visibility]}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {calendarView !== 'month' && calendarView !== 'schedule' && (
              <div className={styles.timelineGrid} style={{ gridTemplateColumns: `repeat(${visibleDayGroups.length}, minmax(0, 1fr))` }}>
                {visibleDayGroups.map((group) => {
                const isSelected = Boolean(selectedDate && dateKey(group.date) === dateKey(selectedDate));
                const isToday = dateKey(group.date) === dateKey(new Date());
                return (
                  <section key={dateKey(group.date)} className={styles.timelineDay} data-selected={isSelected} data-today={isToday}>
                      <button className={styles.timelineDate} type="button" onClick={() => chooseDate(group.date)}>
                        <span>{group.date.toLocaleDateString('id-ID', { weekday: 'short' })}</span>
                        <strong>{group.date.getDate()}</strong>
                        <small>{group.date.toLocaleDateString('id-ID', { month: 'short' })}</small>
                      </button>
                      <div className={styles.timelineEvents}>
                        {group.items.length === 0 ? (
                          <p className={styles.empty}>Kosong</p>
                        ) : (
                          group.items.map((item) => (
                            <button
                              key={`${item.source}-${item.id}`}
                              className={styles.timelineItem}
                              type="button"
                              data-source={item.source}
                              data-visibility={item.visibility}
                              data-active={activeItem?.id === item.id && activeItem.source === item.source}
                              onClick={() => {
                                chooseDate(group.date);
                                setActiveItem(item);
                              }}
                            >
                              <span>{formatTimeRange(item)}</span>
                              <strong>{item.title}</strong>
                              {item.location && <small>{item.location}</small>}
                            </button>
                          ))
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {calendarView !== 'month' && (
              <button className={`${styles.viewNavButton} ${styles.viewNavNext}`} type="button" aria-label="Berikutnya" onClick={() => navigateCalendar(1)}>
                ›
              </button>
            )}
            </div>

          <aside className={styles.sidePanel}>
            {isEb && showCreateCard && (
              <div className={styles.createCard}>
                <div>
                  <p className="eyebrow">Tambah event</p>
                  <h4>Event kalender</h4>
                </div>
                <div className={styles.formGrid}>
                  <label>Judul<input className="input" placeholder="Lomba, rapat, technical meeting" value={eventDraft.title} onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))} /></label>
                  <label>Mulai<input className="input" type="datetime-local" value={eventDraft.starts_at} onChange={(event) => setEventDraft((current) => ({ ...current, starts_at: event.target.value }))} /></label>
                  <label>Selesai<input className="input" type="datetime-local" value={eventDraft.ends_at} onChange={(event) => setEventDraft((current) => ({ ...current, ends_at: event.target.value }))} /></label>
                  <label>Akses<select className="input" value={eventDraft.visibility} onChange={(event) => setEventDraft((current) => ({ ...current, visibility: event.target.value as CalendarVisibility }))}>
                    <option value="public">Semua member</option>
                    <option value="eb_admin">EB/Admin only</option>
                  </select></label>
                  <label>Lokasi/link<input className="input" placeholder="Opsional" value={eventDraft.location} onChange={(event) => setEventDraft((current) => ({ ...current, location: event.target.value }))} /></label>
                  <label>Catatan<input className="input" placeholder="Opsional" value={eventDraft.notes} onChange={(event) => setEventDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
                </div>
                <div className={styles.actions}>
                  <button className="primary-button" type="button" onClick={createEvent}>Simpan Event</button>
                  <button className="ghost-button" type="button" onClick={() => setShowCreateCard(false)}>Batal</button>
                </div>
              </div>
            )}
            <div>
              <p className="eyebrow">Agenda tanggal</p>
              <h4>{selectedDate ? selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Pilih tanggal'}</h4>
            </div>
            {selectedDateItems.length === 0 ? (
              <p className={styles.empty}>Tidak ada agenda di tanggal ini.</p>
            ) : (
              <div className={styles.list}>
                {selectedDateItems.map((item) => (
                  <button
                    key={`${item.source}-${item.id}`}
                    className={styles.agendaButton}
                    type="button"
                    data-active={activeItem?.id === item.id && activeItem.source === item.source}
                    onClick={() => setActiveItem(item)}
                  >
                    <span>{formatTimeRange(item)}</span>
                    <strong>{item.title}</strong>
                    <small>{EVENT_TYPE_LABEL[item.source]} - {VISIBILITY_LABEL[item.visibility]}</small>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>

        <div className={styles.detailPanel}>
          {activeItem ? (
            <>
              <div>
                <p className="eyebrow">{EVENT_TYPE_LABEL[activeItem.source]} - {VISIBILITY_LABEL[activeItem.visibility]}</p>
                <h4>{activeItem.title}</h4>
                <p>{new Date(activeItem.starts_at).toLocaleString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                {activeItem.location && <small>{activeItem.location}</small>}
                {activeItem.notes && <small>{activeItem.notes}</small>}
                {activeItem.source === 'weekly' && <small>Weekly tetap dikelola dari fitur weekly/presensi, bukan dari form event kalender.</small>}
              </div>
              {isEb && activeItem.source === 'event' && (
                <div className={styles.actions}>
                  <button className="secondary-button" type="button" onClick={() => startEdit(activeItem)}>Edit</button>
                  <button className="danger-button" type="button" onClick={() => removeEvent(activeItem.id)}>Hapus</button>
                </div>
              )}
            </>
          ) : (
            <p className={styles.empty}>Klik tanggal atau agenda untuk melihat detail.</p>
          )}
        </div>

        {isEb && editingId && (
          <div className={styles.editPanel}>
            <h4>Edit event kalender</h4>
            <div className={styles.editGrid}>
              <input className="input" value={editingDraft.title} onChange={(event) => setEditingDraft((current) => ({ ...current, title: event.target.value }))} />
              <input className="input" type="datetime-local" value={editingDraft.starts_at} onChange={(event) => setEditingDraft((current) => ({ ...current, starts_at: event.target.value }))} />
              <input className="input" type="datetime-local" value={editingDraft.ends_at} onChange={(event) => setEditingDraft((current) => ({ ...current, ends_at: event.target.value }))} />
              <select className="input" value={editingDraft.visibility} onChange={(event) => setEditingDraft((current) => ({ ...current, visibility: event.target.value as CalendarVisibility }))}>
                <option value="public">Semua member</option>
                <option value="eb_admin">EB/Admin only</option>
              </select>
              <input className="input" value={editingDraft.location} onChange={(event) => setEditingDraft((current) => ({ ...current, location: event.target.value }))} />
              <input className="input" value={editingDraft.notes} onChange={(event) => setEditingDraft((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            <div className={styles.actions}>
              <button className="secondary-button" type="button" onClick={() => saveEdit(editingId)}>Simpan</button>
              <button className="ghost-button" type="button" onClick={cancelEdit}>Batal</button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
