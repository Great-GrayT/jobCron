export default function Home() {
  return (
    <main style={{
      padding: '2rem',
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>LinkedIn Jobs Monitor</h1>

      <p>This application automatically monitors RSS feeds for new job postings and sends notifications to Telegram.</p>

      <div style={{
        padding: '1rem',
        background: '#f0f9ff',
        borderRadius: '8px',
        marginTop: '1.5rem'
      }}>
        <p style={{ margin: 0 }}>
          <strong>Status:</strong> <span style={{ color: '#059669' }}>Active ✓</span>
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong>Schedule:</strong> Every 5 minutes
        </p>
      </div>

      <h2 style={{ marginTop: '2rem' }}>Endpoints</h2>
      <ul>
        <li>
          <code>/api/cron/check-jobs</code> - Cron endpoint (automated RSS monitoring)
        </li>
        <li>
          <code>/api/scrape-jobs</code> - LinkedIn job scraper (manual trigger)
        </li>
      </ul>

      <h2>Manual Triggers</h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <a
          href="/api/cron/check-jobs"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px'
          }}
        >
          Trigger RSS Job Check
        </a>
        <a
          href="/scrape"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#0073b1',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px'
          }}
        >
          LinkedIn Job Scraper
        </a>
      </div>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem' }}>
        Note: RSS job check may require authentication if CRON_SECRET is set.
      </p>

      <h2>Documentation</h2>
      <ul>
        <li><a href="https://github.com/Great-GrayT/jobCron">GitHub Repository</a></li>
        <li>See README.md for setup instructions</li>
        <li>See DEPLOYMENT.md for deployment guide</li>
      </ul>

      <footer style={{
        marginTop: '3rem',
        paddingTop: '1rem',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        <p>Built with Next.js • Deployed on Vercel</p>
      </footer>
    </main>
  );
}
