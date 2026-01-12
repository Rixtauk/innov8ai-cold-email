import { motion } from 'framer-motion';

interface HeaderProps {
  onChangeAPIKeys?: () => void;
}

function Header({ onChangeAPIKeys }: HeaderProps) {
  return (
    <header className="header">
      <motion.div
        className="header-content"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="brand">
          <div className="logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="var(--color-bg-elevated)" />
              <path
                d="M8 12h16M8 16h12M8 20h8"
                stroke="url(#logo-gradient)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="24" cy="20" r="4" fill="url(#logo-gradient)" opacity="0.8" />
              <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-accent)" />
                  <stop offset="100%" stopColor="var(--color-accent-dim)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">Innov8ai</h1>
            <span className="brand-tagline">Cold Email Enrichment</span>
          </div>
        </div>

        <div className="header-actions">
          {onChangeAPIKeys && (
            <button className="settings-btn" onClick={onChangeAPIKeys} title="Change API Keys">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6.5 1.75a.75.75 0 011.5 0v1.5a.75.75 0 01-1.5 0v-1.5zM5.474 3.758a.75.75 0 00-1.06 1.06L5.93 6.346a.75.75 0 101.06-1.06L5.474 3.758zM1.75 6.5a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5zM4.414 10.528a.75.75 0 10-1.06 1.06l1.517 1.518a.75.75 0 101.06-1.06l-1.517-1.518zM6.5 12.75a.75.75 0 011.5 0v1.5a.75.75 0 01-1.5 0v-1.5zM10.528 11.586a.75.75 0 001.06 1.06l1.518-1.517a.75.75 0 10-1.06-1.06l-1.518 1.517zM12.75 8a.75.75 0 000-1.5h-1.5a.75.75 0 000 1.5h1.5zM10.528 4.414a.75.75 0 101.06-1.06L10.07 1.836a.75.75 0 10-1.06 1.06l1.518 1.518zM8 10a2 2 0 100-4 2 2 0 000 4z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
          <a
            href="https://docs.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            Docs
          </a>
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span className="status-text">Ready</span>
          </div>
        </div>
      </motion.div>

      <style>{`
        .header {
          background: var(--color-bg-secondary);
          border-bottom: 1px solid var(--color-border);
          padding: var(--space-md) var(--space-2xl);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-name {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
          line-height: 1.2;
        }

        .brand-tagline {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-accent);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
        }

        .header-link {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .header-link:hover {
          color: var(--color-accent);
        }

        .settings-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .settings-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-xs) var(--space-md);
          background: var(--color-bg-elevated);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-success);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-text {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        @media (max-width: 600px) {
          .header {
            padding: var(--space-md) var(--space-lg);
          }

          .brand-tagline {
            display: none;
          }

          .header-link {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}

export default Header;
