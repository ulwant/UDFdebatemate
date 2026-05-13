export default function Loading() {
  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <article className="panel" style={{ maxWidth: 520, margin: '40px auto' }}>
        <p className="eyebrow">Debate Room Timer</p>
        <h3 style={{ marginBottom: 8 }}>Loading room...</h3>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Preparing the lobby controls.</p>
      </article>
    </section>
  );
}
