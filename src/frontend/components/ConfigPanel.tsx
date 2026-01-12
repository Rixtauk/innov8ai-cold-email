import { motion } from 'framer-motion';
import type { EnrichmentConfig } from '../../agent/types';

interface ConfigPanelProps {
  config: EnrichmentConfig;
  onChange: (config: EnrichmentConfig) => void;
  leadsCount: number;
  mode: 'initial' | 'review';
  selectedCount?: number;
  onFindEmails?: () => void;
  onGenerateIcebreakers?: () => void;
  onSkip?: () => void;
}

function ConfigPanel({
  config,
  onChange,
  leadsCount,
  mode,
  selectedCount = 0,
  onFindEmails,
  onGenerateIcebreakers,
  onSkip,
}: ConfigPanelProps) {
  if (mode === 'initial') {
    return (
      <motion.div
        className="config-panel"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="config-header">
          <h2 className="config-title">Step 1: Find Emails</h2>
          <span className="leads-badge">{leadsCount} leads</span>
        </div>

        <div className="config-section">
          <label className="config-label">
            <span className="label-text">Concurrency</span>
            <span className="label-hint">Parallel requests</span>
          </label>
          <div className="slider-container">
            <input
              type="range"
              min="1"
              max="10"
              value={config.maxConcurrency}
              onChange={(e) => onChange({ ...config, maxConcurrency: parseInt(e.target.value) })}
              className="slider"
            />
            <span className="slider-value">{config.maxConcurrency}</span>
          </div>
        </div>

        <div className="config-info">
          <p>This step will crawl each website and extract email addresses.</p>
          <p>After finding emails, you can choose which leads to enrich with personalized icebreakers.</p>
        </div>

        <div className="config-actions">
          <motion.button
            className="start-btn"
            onClick={onFindEmails}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="btn-icon">🔍</span>
            Find Emails
          </motion.button>
        </div>

        <style>{configStyles}</style>
      </motion.div>
    );
  }

  // Review mode - after emails found
  return (
    <motion.div
      className="config-panel review-mode"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="config-header">
        <h2 className="config-title">Step 2: Generate Icebreakers</h2>
        <span className="leads-badge">{selectedCount} selected</span>
      </div>

      <div className="config-section">
        <label className="config-label">
          <span className="label-text">Icebreaker Tone</span>
        </label>
        <div className="tone-options">
          {(['professional', 'casual', 'friendly'] as const).map((tone) => (
            <button
              key={tone}
              className={`tone-btn ${config.icebreakerTone === tone ? 'active' : ''}`}
              onClick={() => onChange({ ...config, icebreakerTone: tone })}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      <div className="config-info">
        <p>Generate personalized icebreakers for {selectedCount} selected leads.</p>
        <p>Or skip this step to export just the emails.</p>
      </div>

      <div className="config-actions two-buttons">
        <motion.button
          className="start-btn"
          onClick={onGenerateIcebreakers}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={selectedCount === 0}
        >
          <span className="btn-icon">💬</span>
          Generate Icebreakers
        </motion.button>

        <motion.button
          className="skip-btn"
          onClick={onSkip}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="btn-icon">⏭️</span>
          Skip to Export
        </motion.button>
      </div>

      <style>{configStyles}</style>
    </motion.div>
  );
}

const configStyles = `
  .config-panel {
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
  }

  .config-panel.review-mode {
    width: 100%;
  }

  .config-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--color-border);
  }

  .config-title {
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .leads-badge {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-accent);
    background: var(--color-accent-subtle);
    padding: var(--space-xs) var(--space-sm);
    border-radius: var(--radius-sm);
  }

  .config-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .config-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .label-text {
    font-family: var(--font-display);
    font-size: 0.875rem;
    color: var(--color-text-primary);
  }

  .label-hint {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .slider-container {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .slider {
    width: 100px;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--color-border);
    border-radius: 2px;
    cursor: pointer;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-accent);
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .slider-value {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--color-accent);
    min-width: 24px;
    text-align: center;
  }

  .tone-options {
    display: flex;
    gap: var(--space-xs);
  }

  .tone-btn {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    text-transform: capitalize;
  }

  .tone-btn:hover {
    border-color: var(--color-accent);
    color: var(--color-text-primary);
  }

  .tone-btn.active {
    background: var(--color-accent-subtle);
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .config-info {
    padding: var(--space-md) 0;
  }

  .config-info p {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin-bottom: var(--space-xs);
  }

  .config-actions {
    margin-top: var(--space-lg);
  }

  .config-actions.two-buttons {
    display: flex;
    gap: var(--space-md);
  }

  .start-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    padding: var(--space-md) var(--space-lg);
    background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dim));
    border: none;
    border-radius: var(--radius-md);
    color: var(--color-bg-primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .start-btn:hover:not(:disabled) {
    box-shadow: var(--shadow-glow);
  }

  .start-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .skip-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 500;
    padding: var(--space-md) var(--space-lg);
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .skip-btn:hover {
    border-color: var(--color-text-secondary);
    color: var(--color-text-primary);
  }

  .btn-icon {
    font-size: 0.9rem;
  }
`;

export default ConfigPanel;
