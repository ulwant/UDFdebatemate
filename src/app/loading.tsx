export default function Loading() {
  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <article className="panel" style={{ display: 'grid', gap: 12 }}>
        <div style={{ width: 120, height: 12, borderRadius: 999, background: 'var(--green-soft)' }} />
        <div style={{ width: '60%', height: 24, borderRadius: 8, background: '#eef1ef' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {[0, 1, 2].map((item) => (
            <div key={item} style={{ height: 96, borderRadius: 8, background: '#fbfcfb', border: '1px solid var(--line)' }} />
          ))}
        </div>
      </article>
    </section>
  );
}
