'use client';

import { useEffect, useRef, useState, type SVGProps } from 'react';

type DebateMode = 'AP' | 'BP';
type TranscriptSegment = { speaker: string; text: string };
type IconName = 'copy' | 'download' | 'file' | 'mic' | 'pause' | 'play' | 'stop' | 'trash' | 'upload';
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: {
        transcript: string;
      };
    };
  };
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const AP_SPEAKERS = [
  '1st Government',
  '1st Opposition',
  '2nd Government',
  '2nd Opposition',
  '3rd Government',
  '3rd Opposition',
  'Reply Opposition',
  'Reply Government',
];

const BP_SPEAKERS = [
  'Prime Minister',
  'Leader of Opposition',
  'Deputy Prime Minister',
  'Deputy Leader of Opposition',
  'Member of Government',
  'Member of Opposition',
  'Government Whip',
  'Opposition Whip',
];

function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    ...props,
  };

  if (name === 'copy') {
    return (
      <svg {...common}>
        <rect width="14" height="14" x="8" y="8" rx="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    );
  }

  if (name === 'download') {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }

  if (name === 'file') {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    );
  }

  if (name === 'mic') {
    return (
      <svg {...common}>
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <path d="M12 19v3" />
      </svg>
    );
  }

  if (name === 'pause') {
    return (
      <svg {...common}>
        <path d="M8 5v14" />
        <path d="M16 5v14" />
      </svg>
    );
  }

  if (name === 'play') {
    return (
      <svg {...common}>
        <path d="m7 4 13 8-13 8Z" />
      </svg>
    );
  }

  if (name === 'stop') {
    return (
      <svg {...common}>
        <rect width="14" height="14" x="5" y="5" rx="2" />
      </svg>
    );
  }

  if (name === 'trash') {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6 18 20H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export default function TranscriptPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'file'>('live');
  const [debateMode, setDebateMode] = useState<DebateMode>('AP');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('1st Government');
  const [isRecording, setIsRecording] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setSegments((prev) => {
          const nextSegments = [...prev];
          const lastSegment = nextSegments[nextSegments.length - 1];

          if (lastSegment && lastSegment.speaker === currentSpeaker) {
            lastSegment.text += finalTranscript;
          } else {
            nextSegments.push({ speaker: currentSpeaker, text: finalTranscript });
          }

          return nextSegments;
        });
      }

      setCurrentSpeechText(interimTranscript);
    };

    recognitionRef.current.onend = () => {
      if (isRecording) {
        recognitionRef.current?.start();
      }
    };

    if (isRecording) {
      try {
        recognitionRef.current.start();
      } catch {
        // Browser speech recognition can throw when start is called twice quickly.
      }
    }
  }, [currentSpeaker, isRecording]);

  const speakersList = debateMode === 'AP' ? AP_SPEAKERS : BP_SPEAKERS;
  const hasTranscript = segments.length > 0;
  const currentSpeakerIndex = speakersList.indexOf(currentSpeaker);
  const capturedSpeakerCount = speakersList.filter((speaker) =>
    segments.some((segment) => segment.speaker === speaker)
  ).length;

  const formatTranscript = () => {
    let content = `Debate Transcript (${debateMode})\n\n`;
    segments.forEach((seg) => {
      content += `[${seg.speaker}]\n${seg.text.trim()}\n\n`;
    });
    return content;
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current?.stop();
      setCurrentSpeechText('');
      return;
    }

    if (!recognitionRef.current) {
      alert('Your browser does not support Speech Recognition. Please use Chrome or Edge.');
      return;
    }

    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch {
      // Browser speech recognition can throw when start is called twice quickly.
    }
  };

  const handleSpeakerChange = (speaker: string) => {
    setCurrentSpeaker(speaker);
    setCurrentSpeechText('');
  };

  const handleDebateModeChange = (mode: DebateMode) => {
    const nextSpeakers = mode === 'AP' ? AP_SPEAKERS : BP_SPEAKERS;
    setDebateMode(mode);
    if (!nextSpeakers.includes(currentSpeaker)) {
      setCurrentSpeaker(nextSpeakers[0]);
      setCurrentSpeechText('');
    }
  };

  const deleteSegment = (index: number) => {
    if (confirm('Are you sure you want to delete this segment?')) {
      setSegments((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const clearTranscript = () => {
    if (hasTranscript && confirm('Clear all transcript segments?')) {
      setSegments([]);
      setCurrentSpeechText('');
    }
  };

  const updateSegmentText = (index: number, newText: string) => {
    setSegments((prev) => {
      const nextSegments = [...prev];
      nextSegments[index].text = newText;
      return nextSegments;
    });
  };

  const copyTranscript = async () => {
    if (!hasTranscript) return;
    await navigator.clipboard.writeText(formatTranscript());
  };

  const exportTXT = () => {
    const blob = new Blob([formatTranscript()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Debate_Transcript_${debateMode}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    let content = 'Speaker,Transcript\n';
    segments.forEach((seg) => {
      const cleanText = seg.text.replace(/"/g, '""').trim();
      content += `"${seg.speaker}","${cleanText}"\n`;
    });
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Debate_Transcript_${debateMode}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/transcript', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        try {
          const jsonErr = JSON.parse(errText);
          alert(`Error: ${jsonErr.error}`);
        } catch {
          alert(`Error: Received status ${res.status}. Your file might be too large.`);
        }
        setUploadLoading(false);
        return;
      }

      const data = await res.json();
      setSegments([{ speaker: 'Audio File', text: data.text }]);
      setActiveTab('live');
    } catch {
      alert('Error uploading file. Check console for details.');
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <section id="transcript" className="section active-section transcript-workspace">
      <div className="transcript-layout">
        <article className="panel transcript-control-panel">
          <div className="transcript-panel-header">
            <div>
              <p className="eyebrow">AI Transcript</p>
              <h3>Capture Console</h3>
            </div>
            <div className="transcript-tabs" role="tablist" aria-label="Transcript mode">
              <button
                type="button"
                className={activeTab === 'live' ? 'active' : ''}
                onClick={() => setActiveTab('live')}
              >
                <Icon name="mic" />
                Live
              </button>
              <button
                type="button"
                className={activeTab === 'file' ? 'active' : ''}
                onClick={() => setActiveTab('file')}
              >
                <Icon name="file" />
                File
              </button>
            </div>
          </div>

          {activeTab === 'live' && (
            <div className="transcript-control-stack">
              <div className="capture-status">
                <span className={`recording-dot ${isRecording ? 'is-live' : ''}`} />
                <div>
                  <span>{isRecording ? 'Recording' : 'Idle'}</span>
                  <strong>{currentSpeaker}</strong>
                </div>
              </div>

              <label className="transcript-field">
                <span>Debate format</span>
                <select value={debateMode} onChange={(e) => handleDebateModeChange(e.target.value as DebateMode)}>
                  <option value="AP">Asian Parliamentary (AP)</option>
                  <option value="BP">British Parliamentary (BP)</option>
                </select>
              </label>

              <label className="speaker-roll-down">
                <div className="control-section-title">
                  <span>Speech order</span>
                  <small>{capturedSpeakerCount}/{speakersList.length} captured</small>
                </div>
                <select value={currentSpeaker} onChange={(e) => handleSpeakerChange(e.target.value)}>
                  {speakersList.map((speaker, index) => {
                    const hasSpoken = segments.some((segment) => segment.speaker === speaker);

                    return (
                      <option key={speaker} value={speaker}>
                        {String(index + 1).padStart(2, '0')} - {speaker}
                        {hasSpoken ? ' - captured' : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="speaker-roll-down-preview">
                  <span>{currentSpeakerIndex + 1}</span>
                  <div>
                    <small>Now capturing</small>
                    <strong>{currentSpeaker}</strong>
                  </div>
                </div>
              </label>

              <button
                type="button"
                className={`record-button ${isRecording ? 'stop' : ''}`}
                onClick={toggleRecording}
              >
                <Icon name={isRecording ? 'stop' : 'mic'} />
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="transcript-control-stack">
              <label className="upload-dropzone">
                <Icon name="upload" />
                <span>{file ? file.name : 'Choose an audio recording'}</span>
                <small>Audio files will be transcribed into the notes stream.</small>
                <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <button
                type="button"
                className="primary-button transcript-upload-button"
                onClick={handleFileUpload}
                disabled={!file || uploadLoading}
              >
                <Icon name={uploadLoading ? 'pause' : 'file'} />
                {uploadLoading ? 'Transcribing...' : 'Transcribe File'}
              </button>
            </div>
          )}
        </article>

        <article className="panel transcript-stream-panel">
          <div className="transcript-stream-header">
            <div>
              <p className="eyebrow">Live Notes</p>
              <h3>{hasTranscript ? `${segments.length} segment${segments.length === 1 ? '' : 's'}` : 'Transcript Stream'}</h3>
            </div>
            <div className="transcript-actions">
              <button type="button" className="icon-action" onClick={copyTranscript} disabled={!hasTranscript} title="Copy all">
                <Icon name="copy" />
              </button>
              <button type="button" className="icon-action" onClick={exportTXT} disabled={!hasTranscript} title="Export TXT">
                <Icon name="download" />
                TXT
              </button>
              <button type="button" className="icon-action" onClick={exportCSV} disabled={!hasTranscript} title="Export CSV">
                <Icon name="download" />
                CSV
              </button>
              <button type="button" className="icon-action danger" onClick={clearTranscript} disabled={!hasTranscript} title="Clear transcript">
                <Icon name="trash" />
              </button>
            </div>
          </div>

          <div className="transcript-stream">
            {!hasTranscript && !currentSpeechText && (
              <div className="transcript-empty">
                <Icon name="play" />
                <strong>Ready for the first speech</strong>
                <span>Select the active speaker, then start recording to build a clean speaker-by-speaker transcript.</span>
              </div>
            )}

            {segments.map((seg, idx) => (
              <div key={`${seg.speaker}-${idx}`} className="transcript-segment">
                <div className="segment-meta">
                  <span>{idx + 1}</span>
                  <strong>{seg.speaker}</strong>
                  <button type="button" onClick={() => deleteSegment(idx)} title="Delete segment">
                    <Icon name="trash" />
                  </button>
                </div>
                <p
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => updateSegmentText(idx, e.currentTarget.textContent || '')}
                >
                  {seg.text}
                </p>
              </div>
            ))}

            {isRecording && currentSpeechText && (
              <div className="transcript-segment interim">
                <div className="segment-meta">
                  <span className="listening-pulse" />
                  <strong>{currentSpeaker}</strong>
                  <small>Listening...</small>
                </div>
                <p>{currentSpeechText}</p>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
