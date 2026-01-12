import { useState } from 'react';
import { motion } from 'framer-motion';

interface APISetupProps {
  onComplete: (anthropicKey: string, firecrawlKey: string) => void;
  initialAnthropicKey?: string;
  initialFirecrawlKey?: string;
}

function APISetup({ onComplete, initialAnthropicKey = '', initialFirecrawlKey = '' }: APISetupProps) {
  const [anthropicKey, setAnthropicKey] = useState(initialAnthropicKey);
  const [firecrawlKey, setFirecrawlKey] = useState(initialFirecrawlKey);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!anthropicKey.trim()) {
      setError('Anthropic API key is required');
      return;
    }

    if (!firecrawlKey.trim()) {
      setError('Firecrawl API key is required');
      return;
    }

    // Basic validation of key formats
    if (!anthropicKey.startsWith('sk-ant-')) {
      setError('Anthropic API key should start with "sk-ant-"');
      return;
    }

    setIsValidating(true);

    // Store keys in localStorage for convenience (in production, use more secure storage)
    localStorage.setItem('innov8ai_anthropic_key', anthropicKey);
    localStorage.setItem('innov8ai_firecrawl_key', firecrawlKey);

    // Small delay to show validation state
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsValidating(false);
    onComplete(anthropicKey, firecrawlKey);
  };

  return (
    <div className="api-setup">
      <motion.div
        className="setup-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="setup-header">
          <h2>API Configuration</h2>
          <p>Enter your API keys to start enriching leads</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label htmlFor="anthropic-key">
              <span className="label-text">Anthropic API Key</span>
              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="label-link"
              >
                Get key
              </a>
            </label>
            <input
              id="anthropic-key"
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="form-input"
              autoComplete="off"
            />
            <span className="input-hint">Used for AI-powered email extraction and icebreaker generation</span>
          </div>

          <div className="form-group">
            <label htmlFor="firecrawl-key">
              <span className="label-text">Firecrawl API Key</span>
              <a
                href="https://firecrawl.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="label-link"
              >
                Get key
              </a>
            </label>
            <input
              id="firecrawl-key"
              type="password"
              value={firecrawlKey}
              onChange={(e) => setFirecrawlKey(e.target.value)}
              placeholder="fc-..."
              className="form-input"
              autoComplete="off"
            />
            <span className="input-hint">Used for fast, reliable website scraping</span>
          </div>

          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="submit-btn"
            disabled={isValidating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isValidating ? (
              <>
                <span className="spinner" />
                Validating...
              </>
            ) : (
              'Continue'
            )}
          </motion.button>
        </form>

        <div className="setup-footer">
          <p>Your API keys are stored locally and never sent to our servers.</p>
        </div>
      </motion.div>

      <style>{`
        .api-setup {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: var(--space-2xl);
        }

        .setup-card {
          width: 100%;
          max-width: 480px;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .setup-header {
          padding: var(--space-xl);
          border-bottom: 1px solid var(--color-border);
          text-align: center;
        }

        .setup-header h2 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--space-xs);
        }

        .setup-header p {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .setup-form {
          padding: var(--space-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .form-group label {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .label-text {
          font-family: var(--font-display);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }

        .label-link {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-accent);
          text-decoration: none;
        }

        .label-link:hover {
          text-decoration: underline;
        }

        .form-input {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          padding: var(--space-md);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px var(--color-accent-subtle);
        }

        .form-input::placeholder {
          color: var(--color-text-muted);
        }

        .input-hint {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .error-message {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-error);
          padding: var(--space-sm) var(--space-md);
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid var(--color-error);
          border-radius: var(--radius-md);
        }

        .submit-btn {
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

        .submit-btn:hover:not(:disabled) {
          box-shadow: var(--shadow-glow);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .setup-footer {
          padding: var(--space-md) var(--space-xl);
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-elevated);
        }

        .setup-footer p {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-align: center;
        }
      `}</style>
    </div>
  );
}

export default APISetup;
