import { motion } from 'framer-motion';
import type { EnrichedLead } from '../../agent/types';

interface StatsPanelProps {
  leads: EnrichedLead[];
  isProcessing: boolean;
  currentIndex: number;
  totalToProcess?: number;
  mode?: 'emails' | 'icebreakers' | 'complete';
  showValidation?: boolean;
}

function StatsPanel({
  leads,
  isProcessing,
  currentIndex,
  totalToProcess,
  mode = 'emails',
  showValidation = false,
}: StatsPanelProps) {
  const stats = {
    total: leads.length,
    completed: leads.filter(l => l.enrichmentStatus === 'completed').length,
    failed: leads.filter(l => l.enrichmentStatus === 'failed').length,
    skipped: leads.filter(l => l.enrichmentStatus === 'skipped').length,
    withEmail: leads.filter(l => l.email).length,
    withIcebreaker: leads.filter(l => l.icebreaker).length,
    validDomains: leads.filter(l => l.domainValidation?.isValid).length,
    invalidDomains: leads.filter(l => !l.domainValidation?.isValid).length,
  };

  const total = totalToProcess || stats.total;
  const progress = total > 0 ? (currentIndex / total) * 100 : 0;

  const getTitle = () => {
    if (!isProcessing) {
      if (mode === 'complete') return 'Enrichment Complete';
      return 'Email Discovery Complete';
    }
    if (mode === 'icebreakers') return 'Generating Icebreakers';
    return 'Finding Emails';
  };

  const getSubtitle = () => {
    if (mode === 'icebreakers') {
      return `Processing ${currentIndex}/${totalToProcess}`;
    }
    return `Processing ${currentIndex}/${stats.total}`;
  };

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <div className="stats-title-section">
          <h2 className="stats-title">{getTitle()}</h2>
          {isProcessing && (
            <span className="processing-indicator">
              <span className="pulse-dot" />
              {getSubtitle()}
            </span>
          )}
        </div>
        <div className="progress-section">
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="stats-grid">
        {showValidation ? (
          <>
            <StatCard
              label="Total Leads"
              value={stats.total}
              icon="📊"
              color="var(--color-text-primary)"
            />
            <StatCard
              label="Valid Domains"
              value={stats.validDomains}
              icon="✅"
              color="var(--color-success)"
            />
            <StatCard
              label="Invalid Domains"
              value={stats.invalidDomains}
              icon="⚠️"
              color="var(--color-warning)"
            />
            <StatCard
              label="To Process"
              value={stats.validDomains}
              icon="🔍"
              color="var(--color-accent)"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Total Leads"
              value={stats.total}
              icon="📊"
              color="var(--color-text-primary)"
            />
            <StatCard
              label="Processed"
              value={stats.completed}
              icon="✅"
              color="var(--color-success)"
            />
            <StatCard
              label="Emails Found"
              value={stats.withEmail}
              icon="✉️"
              color="var(--color-accent)"
              suffix={stats.completed > 0 ? `${Math.round((stats.withEmail / stats.completed) * 100)}%` : undefined}
            />
            {(mode === 'icebreakers' || mode === 'complete') && (
              <StatCard
                label="Icebreakers"
                value={stats.withIcebreaker}
                icon="💬"
                color="var(--color-warning)"
                suffix={stats.withEmail > 0 ? `${Math.round((stats.withIcebreaker / stats.withEmail) * 100)}%` : undefined}
              />
            )}
            {mode === 'emails' && (
              <>
                <StatCard
                  label="Not Found"
                  value={stats.completed - stats.withEmail}
                  icon="❌"
                  color="var(--color-error)"
                />
                {stats.skipped > 0 && (
                  <StatCard
                    label="Skipped"
                    value={stats.skipped}
                    icon="⚠️"
                    color="var(--color-warning)"
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        .stats-panel {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }

        .stats-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--color-border);
        }

        .stats-title-section {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .stats-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .processing-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-accent);
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-accent);
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }

        .progress-section {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .progress-bar {
          width: 200px;
          height: 8px;
          background: var(--color-bg-elevated);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-accent), var(--color-success));
          border-radius: 4px;
        }

        .progress-text {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-accent);
          min-width: 40px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-md);
        }

        @media (max-width: 800px) {
          .stats-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-md);
          }

          .progress-section {
            width: 100%;
          }

          .progress-bar {
            flex: 1;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  suffix,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  suffix?: string;
}) {
  return (
    <motion.div
      className="stat-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value" style={{ color }}>
          {value}
          {suffix && <span className="stat-suffix">{suffix}</span>}
        </div>
        <div className="stat-label">{label}</div>
      </div>

      <style>{`
        .stat-card {
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .stat-icon {
          font-size: 1.5rem;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1;
          display: flex;
          align-items: baseline;
          gap: var(--space-xs);
        }

        .stat-suffix {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 400;
          opacity: 0.7;
        }

        .stat-label {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-top: 2px;
        }
      `}</style>
    </motion.div>
  );
}

export default StatsPanel;
