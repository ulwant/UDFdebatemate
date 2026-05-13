const formats = {
  AP: {
    label: "Asian Parliamentary",
    speeches: [
      { name: "Prime Minister", side: "Government", type: "main" },
      { name: "Leader of Opposition", side: "Opposition", type: "main" },
      { name: "Deputy Prime Minister", side: "Government", type: "main" },
      { name: "Deputy Leader of Opposition", side: "Opposition", type: "main" },
      { name: "Government Whip", side: "Government", type: "main" },
      { name: "Opposition Whip", side: "Opposition", type: "main" },
      { name: "Opposition Reply", side: "Opposition", type: "reply" },
      { name: "Government Reply", side: "Government", type: "reply" }
    ]
  },
  BP: {
    label: "British Parliamentary",
    speeches: [
      { name: "Prime Minister", side: "Opening Government", type: "main" },
      { name: "Leader of Opposition", side: "Opening Opposition", type: "main" },
      { name: "Deputy Prime Minister", side: "Opening Government", type: "main" },
      { name: "Deputy Leader of Opposition", side: "Opening Opposition", type: "main" },
      { name: "Member of Government", side: "Closing Government", type: "main" },
      { name: "Member of Opposition", side: "Closing Opposition", type: "main" },
      { name: "Government Whip", side: "Closing Government", type: "main" },
      { name: "Opposition Whip", side: "Closing Opposition", type: "main" }
    ]
  }
};

const state = {
  timerType: "solo",
  format: "AP",
  preset: "competition",
  currentSpeech: 0,
  running: false,
  duration: 420,
  remaining: 420,
  startedAt: null,
  roomCode: "SOLO",
  lastBellStage: ""
};

const channel = "BroadcastChannel" in window ? new BroadcastChannel("debate-mate-room") : null;
let tickId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  pageTitle: $("#page-title"),
  roomCode: $("#room-code"),
  roomActions: $("#room-actions"),
  createRoom: $("#create-room"),
  copyRoom: $("#copy-room"),
  formatLabel: $("#format-label"),
  timerTypeLabel: $("#timer-type-label"),
  sideLabel: $("#side-label"),
  speakerName: $("#speaker-name"),
  timeDisplay: $("#time-display"),
  progressFill: $("#progress-fill"),
  poiWindow: $("#poi-window"),
  speechStrip: $("#speech-strip"),
  startPause: $("#start-pause"),
  resetTimer: $("#reset-timer"),
  nextSpeaker: $("#next-speaker"),
  prevSpeaker: $("#prev-speaker"),
  speechMinutes: $("#speech-minutes"),
  replyMinutes: $("#reply-minutes"),
  preset: $("#preset"),
  soundToggle: $("#sound-toggle"),
  mockRecord: $("#mock-record"),
  transcriptText: $("#transcript-text")
};

function navigateTo(sectionId) {
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.section === sectionId));
  $$(".section").forEach((section) => section.classList.toggle("active-section", section.id === sectionId));

  const titles = {
    dashboard: "Debate operations, all in one place.",
    timer: "Flexible debate timer for solo drills and synced rooms.",
    attendance: "QR-based attendance for members and EB.",
    calendar: "Weekly training and UDF activity calendar.",
    library: "A focused knowledge base replacing scattered notes.",
    profiles: "Member profiles that work like debate CVs.",
    transcript: "AI-ready transcript workspace for debate audio."
  };

  elements.pageTitle.textContent = titles[sectionId] || titles.dashboard;
}

function activeSpeech() {
  return formats[state.format].speeches[state.currentSpeech];
}

function speechDuration(speech = activeSpeech()) {
  const main = Math.max(1, Number(elements.speechMinutes.value || 7)) * 60;
  const reply = Math.max(1, Number(elements.replyMinutes.value || 4)) * 60;
  return speech.type === "reply" ? reply : main;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const secs = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${secs}`;
}

function currentRemaining() {
  if (!state.running || !state.startedAt) {
    return state.remaining;
  }

  const elapsed = (Date.now() - state.startedAt) / 1000;
  return Math.max(0, state.remaining - elapsed);
}

function updateDurationForSpeech(resetRemaining = true) {
  state.duration = speechDuration();
  if (resetRemaining) {
    state.remaining = state.duration;
    state.startedAt = null;
    state.running = false;
  }
}

function renderSpeechStrip() {
  elements.speechStrip.innerHTML = formats[state.format].speeches
    .map((speech, index) => {
      const active = index === state.currentSpeech ? " active" : "";
      return `
        <button class="speech-pill${active}" data-speech-index="${index}">
          <span>${speech.side}</span>
          <strong>${speech.name}</strong>
        </button>
      `;
    })
    .join("");

  $$(".speech-pill").forEach((button) => {
    button.addEventListener("click", () => {
      setSpeech(Number(button.dataset.speechIndex));
      broadcastState();
    });
  });
}

function renderTimer() {
  const speech = activeSpeech();
  const remaining = currentRemaining();
  const elapsed = state.duration - remaining;
  const progress = Math.min(100, Math.max(0, (elapsed / state.duration) * 100));

  elements.roomCode.textContent = state.roomCode;
  elements.formatLabel.textContent = formats[state.format].label;
  elements.timerTypeLabel.textContent = state.timerType === "room" ? "Room Timer" : "Solo Timer";
  elements.sideLabel.textContent = speech.side;
  elements.speakerName.textContent = speech.name;
  elements.timeDisplay.textContent = formatTime(remaining);
  elements.progressFill.style.width = `${progress}%`;
  elements.startPause.textContent = state.running ? "Pause" : "Start";
  elements.roomActions.hidden = state.timerType !== "room";

  const poiStart = 60;
  const poiEnd = Math.max(0, state.duration - 60);
  if (speech.type === "reply") {
    elements.poiWindow.textContent = "Reply speech: no POI";
  } else if (elapsed < poiStart) {
    elements.poiWindow.textContent = "Protected time: no POI";
  } else if (elapsed >= poiStart && elapsed <= poiEnd) {
    elements.poiWindow.textContent = "POI window open";
  } else {
    elements.poiWindow.textContent = "Protected final minute";
  }

  if (remaining <= 0 && state.running) {
    state.running = false;
    state.remaining = 0;
    state.startedAt = null;
    ringBell("end");
    broadcastState();
  }

  maybeBell(elapsed, speech);
}

function maybeBell(elapsed, speech) {
  if (!elements.soundToggle.checked || !state.running || speech.type === "reply") {
    return;
  }

  const stage = elapsed >= state.duration - 60 ? "final" : elapsed >= 60 ? "open" : "";
  if (stage && stage !== state.lastBellStage) {
    state.lastBellStage = stage;
    ringBell(stage);
  }
}

function ringBell(stage) {
  if (!elements.soundToggle.checked) {
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.frequency.value = stage === "end" ? 880 : 660;
  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.14, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.28);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.3);
}

function startTicker() {
  clearInterval(tickId);
  tickId = setInterval(renderTimer, 200);
}

function toggleRun() {
  if (state.running) {
    state.remaining = currentRemaining();
    state.running = false;
    state.startedAt = null;
  } else {
    state.startedAt = Date.now();
    state.running = true;
    state.lastBellStage = "";
  }

  renderTimer();
  broadcastState();
}

function setSpeech(index) {
  const maxIndex = formats[state.format].speeches.length - 1;
  state.currentSpeech = Math.min(maxIndex, Math.max(0, index));
  updateDurationForSpeech(true);
  renderSpeechStrip();
  renderTimer();
}

function resetTimer() {
  updateDurationForSpeech(true);
  renderTimer();
  broadcastState();
}

function setFormat(format) {
  state.format = format;
  state.currentSpeech = 0;
  updateDurationForSpeech(true);
  renderSpeechStrip();
  renderTimer();
  broadcastState();
}

function setTimerType(type) {
  state.timerType = type;
  state.roomCode = type === "room" && state.roomCode === "SOLO" ? makeRoomCode() : type === "solo" ? "SOLO" : state.roomCode;
  renderTimer();
  broadcastState();
}

function makeRoomCode() {
  return `UDF-${Math.floor(1000 + Math.random() * 9000)}`;
}

function broadcastState() {
  if (state.timerType !== "room") {
    return;
  }

  const payload = {
    ...state,
    remaining: currentRemaining(),
    startedAt: state.running ? Date.now() : null
  };

  localStorage.setItem("debate-mate-room-state", JSON.stringify(payload));
  channel?.postMessage(payload);
}

function acceptRoomState(payload) {
  if (!payload || payload.timerType !== "room") {
    return;
  }

  Object.assign(state, payload);
  elements.speechMinutes.value = Math.round(payload.duration / 60);
  renderSpeechStrip();
  renderTimer();
}

function applyPreset(preset) {
  state.preset = preset;
  if (preset === "training") {
    elements.speechMinutes.value = 5;
    elements.replyMinutes.value = 3;
  }
  if (preset === "competition") {
    elements.speechMinutes.value = 7;
    elements.replyMinutes.value = 4;
  }
  resetTimer();
}

function startMockTranscript() {
  const lines = [
    "Prime Minister: Our burden is to prove why vocational education creates faster economic mobility.",
    "Leader of Opposition: The opposition challenges the assumption that university access is less inclusive.",
    "Deputy Prime Minister: The comparative is not prestige, but employability and state capacity.",
    "Adjudication note: Both teams need clearer weighing on long-term labor market resilience."
  ];

  elements.mockRecord.textContent = "Recording...";
  elements.transcriptText.textContent = "";

  lines.forEach((line, index) => {
    setTimeout(() => {
      elements.transcriptText.textContent += `${line}\n\n`;
      if (index === lines.length - 1) {
        elements.mockRecord.textContent = "Start Recording";
      }
    }, 700 * (index + 1));
  });
}

function bindEvents() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => navigateTo(button.dataset.section)));

  $$("[data-timer-type]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-timer-type]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      setTimerType(button.dataset.timerType);
    });
  });

  $$("[data-format]").forEach((button) => {
    button.addEventListener("click", () => {
      $$("[data-format]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      setFormat(button.dataset.format);
    });
  });

  elements.startPause.addEventListener("click", toggleRun);
  elements.resetTimer.addEventListener("click", resetTimer);
  elements.nextSpeaker.addEventListener("click", () => {
    setSpeech(state.currentSpeech + 1);
    broadcastState();
  });
  elements.prevSpeaker.addEventListener("click", () => {
    setSpeech(state.currentSpeech - 1);
    broadcastState();
  });

  elements.preset.addEventListener("change", (event) => applyPreset(event.target.value));
  elements.speechMinutes.addEventListener("change", resetTimer);
  elements.replyMinutes.addEventListener("change", resetTimer);
  elements.createRoom.addEventListener("click", () => {
    state.roomCode = makeRoomCode();
    broadcastState();
    renderTimer();
  });
  elements.copyRoom.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(state.roomCode);
    elements.copyRoom.textContent = "Copied";
    setTimeout(() => {
      elements.copyRoom.textContent = "Copy code";
    }, 1200);
  });
  elements.mockRecord.addEventListener("click", startMockTranscript);

  window.addEventListener("storage", (event) => {
    if (event.key === "debate-mate-room-state") {
      acceptRoomState(JSON.parse(event.newValue));
    }
  });

  channel?.addEventListener("message", (event) => acceptRoomState(event.data));

  document.addEventListener("keydown", (event) => {
    if ($("#timer").classList.contains("active-section") && event.code === "Space") {
      event.preventDefault();
      toggleRun();
    }
    if ($("#timer").classList.contains("active-section") && event.key.toLowerCase() === "n") {
      setSpeech(state.currentSpeech + 1);
      broadcastState();
    }
  });
}

bindEvents();
renderSpeechStrip();
renderTimer();
startTicker();
