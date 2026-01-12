import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAPIUsage, formatCost, formatTokens } from '../hooks/useAPIUsage';

function UsageMonitor() {
  const { usage, history, resetUsage } = useAPIUsage();
  const [isExpanded, setIsExpanded] = useState(false);

  // Group history by operation type
  const operationStats = history.reduce((acc, event) => {
    if (!acc[event.operation]) {
      acc[event.operation] = { count: 0, tokens: 0 };
    }
    acc[event.operation].count++;
    acc[event.operation].tokens += event.inputTokens + event.outputTokens;
    return acc;
  }, {} as Record<string, { count: number; tokens: number }>);

  return (
    <div className="usage-monitor">
      <motion.button
        className="usage-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="usage-icon">📊</span>
        <span className="usage-summary">
          <span className="usage-cost">{formatCost(usage.estimatedCost)}</span>
          <span className="usage-tokens">{formatTokens(usage.totalTokens)} tokens</span>
        </span>
        <span className={`usage-chevron ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="usage-details"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="usage-header">
              <h4>API Usage This Session</h4>
              <button className="reset-btn" onClick={resetUsage}>
                Reset
              </button>
            </div>

            <div className="usage-grid">
              <div className="usage-stat">
                <span className="stat-label">Input Tokens</span>
                <span className="stat-value">{formatTokens(usage.inputTokens)}</span>
              </div>
              <div className="usage-stat">
                <span className="stat-label">Output Tokens</span>
                <span className="stat-value">{formatTokens(usage.outputTokens)}</span>
              </div>
              <div className="usage-stat">
                <span className="stat-label">API Requests</span>
                <span className="stat-value">{usage.requestCount}</span>
              </div>
              <div className="usage-stat highlight">
                <span className="stat-label">Est. Cost</span>
                <span className="stat-value cost">{formatCost(usage.estimatedCost)}</span>
              </div>
            </div>

            {Object.keys(operationStats).length > 0 && (
              <div className="usage-breakdown">
                <h5>Breakdown by Operation</h5>
                <div className="breakdown-list">
                  {Object.entries(operationStats).map(([op, stats]) => (
                    <div key={op} className="breakdown-item">
                      <span className="breakdown-op">
                        {op === 'email_search' && '🔍 Email Search'}
                        {op === 'icebreaker_generation' && '💬 Icebreakers'}
                        {op === 'other' && '⚙️ Other'}
                      </span>
                      <span className="breakdown-stats">
                        {stats.count} calls · {formatTokens(stats.tokens)} tokens
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="usage-footer">
              <span className="pricing-note">
                Pricing based on Claude 3.5 Sonnet rates
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .usage-monitor {
          position: fixed;
          bottom: var(--space-lg);
          right: var(--space-lg);
          z-index: 1000;
        }

        .usage-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-md);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-md);
        }

        .usage-toggle:hover {
          border-color: var(--color-accent);
          box-shadow: var(--shadow-glow);
        }

        .usage-icon {
          font-size: 1rem;
        }

        .usage-summary {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .usage-cost {
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-success);
        }

        .usage-tokens {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .usage-chevron {
          font-size: 0.6rem;
          color: var(--color-text-muted);
          transition: transform 0.2s ease;
          margin-left: var(--space-xs);
        }

        .usage-chevron.expanded {
          transform: rotate(180deg);
        }

        .usage-details {
          position: absolute;
          bottom: calc(100% + var(--space-sm));
          right: 0;
          width: 320px;
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .usage-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md);
          border-bottom: 1px solid var(--color-border);
        }

        .usage-header h4 {
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }

        .reset-btn {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: var(--space-xs) var(--space-sm);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .reset-btn:hover {
          border-color: var(--color-error);
          color: var(--color-error);
        }

        .usage-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: var(--color-border);
          padding: 1px;
        }

        .usage-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: var(--space-md);
          background: var(--color-bg-secondary);
        }

        .usage-stat.highlight {
          background: var(--color-accent-subtle);
        }

        .stat-label {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .stat-value.cost {
          color: var(--color-success);
        }

        .usage-breakdown {
          padding: var(--space-md);
          border-top: 1px solid var(--color-border);
        }

        .usage-breakdown h5 {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 var(--space-sm) 0;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-sm);
        }

        .breakdown-op {
          font-family: var(--font-display);
          font-size: 0.8rem;
          color: var(--color-text-primary);
        }

        .breakdown-stats {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .usage-footer {
          padding: var(--space-sm) var(--space-md);
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
        }

        .pricing-note {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}

export default UsageMonitor;
