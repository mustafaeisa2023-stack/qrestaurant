export default function Footer() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '12px 16px',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-muted)',
        letterSpacing: '0.04em',
      }}>
        © {new Date().getFullYear()} All rights reserved · Developed by{' '}
        <span style={{ color: 'var(--brand)', fontWeight: '600' }}>Mustafa Eisa</span>
      </p>
    </footer>
  );
}
