'use client';
import { useState, useRef } from 'react';

export default function TranscriptPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState('Transcript will appear here during debate, mattering, or adjudication feedback.');
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const startMockTranscript = () => {
    // Clear any existing timeouts if user clicked again
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const lines = [
      "Prime Minister: Our burden is to prove why vocational education creates faster economic mobility.",
      "Leader of Opposition: The opposition challenges the assumption that university access is less inclusive.",
      "Deputy Prime Minister: The comparative is not prestige, but employability and state capacity.",
      "Adjudication note: Both teams need clearer weighing on long-term labor market resilience."
    ];

    setIsRecording(true);
    setTranscriptText("");

    let accumulatedText = "";

    lines.forEach((line, index) => {
      const timeoutId = setTimeout(() => {
        accumulatedText += `${line}\n\n`;
        setTranscriptText(accumulatedText);
        
        if (index === lines.length - 1) {
          setIsRecording(false);
        }
      }, 700 * (index + 1));
      
      timeoutsRef.current.push(timeoutId);
    });
  };

  return (
    <section id="transcript" className="section active-section" style={{ display: 'block' }}>
      <div className="two-column">
        <article className="panel">
          <div className="panel-header">
            <h3>AI Speech Transcript</h3>
            <span className="rank-badge">Prototype</span>
          </div>
          <button 
            className="primary-button" 
            onClick={startMockTranscript}
            disabled={isRecording}
          >
            {isRecording ? "Recording..." : "Start Recording"}
          </button>
          <p style={{ marginTop: '14px' }}>
            Production version can stream microphone audio to AI transcription and attach the
            transcript to a debate room.
          </p>
        </article>
        <article className="panel transcript-box">
          <h3 style={{ marginBottom: '14px' }}>Live Notes</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>
            {transcriptText}
          </p>
        </article>
      </div>
    </section>
  );
}
