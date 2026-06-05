import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section active-section" style={{ display: 'block' }}>
      <article className="panel" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', padding: '42px 24px' }}>
        <p className="eyebrow">404</p>
        <h2>Halaman tidak ditemukan</h2>
        <p style={{ color: 'var(--muted)', margin: '12px auto 24px', maxWidth: 480 }}>
          Link ini tidak tersedia di Debate Mate. Kembali ke dashboard untuk lanjut mengelola training, presensi, motion bank, dan records.
        </p>
        <Link className="primary-button" href="/" style={{ display: 'inline-flex', textDecoration: 'none' }}>
          Kembali ke Dashboard
        </Link>
      </article>
    </section>
  );
}
