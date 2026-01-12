import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SequenceEmail, EmailComponent, EmailComponentType, EmailPosition } from '../../agent/types';
import ComponentEditor from './ComponentEditor';

interface EmailEditorProps {
  sequence: SequenceEmail[];
  onChange: (sequence: SequenceEmail[]) => void;
  onGenerateComponent?: (position: EmailPosition, type: EmailComponentType, variant: 'A' | 'B') => Promise<string>;
  onGenerateAll?: () => void;
  isGenerating?: boolean;
}

function EmailEditor({ sequence, onChange, onGenerateComponent, onGenerateAll, isGenerating }: EmailEditorProps) {
  const [activeTab, setActiveTab] = useState<EmailPosition>(1);
  const [showPreview, setShowPreview] = useState(false);

  const activeEmail = sequence.find(e => e.position === activeTab);

  const handleComponentChange = (position: EmailPosition, updatedComponent: EmailComponent) => {
    const newSequence = sequence.map(email => {
      if (email.position === position) {
        return {
          ...email,
          components: email.components.map(c =>
            c.type === updatedComponent.type ? updatedComponent : c
          ),
        };
      }
      return email;
    });
    onChange(newSequence);
  };

  const handleDelayChange = (position: EmailPosition, delayDays: number) => {
    const newSequence = sequence.map(email => {
      if (email.position === position) {
        return { ...email, delayDays };
      }
      return email;
    });
    onChange(newSequence);
  };

  const handleGenerate = async (type: EmailComponentType, variant: 'A' | 'B') => {
    if (onGenerateComponent) {
      return await onGenerateComponent(activeTab, type, variant);
    }
    return '';
  };

  // Assemble email body from components
  const assembleBody = (email: SequenceEmail, variant: 'A' | 'B'): string => {
    const parts: string[] = [];
    const componentOrder: EmailComponentType[] = ['hook', 'problem', 'agitate', 'solution', 'cta', 'ps'];

    for (const type of componentOrder) {
      const component = email.components.find(c => c.type === type);
      const value = variant === 'A' ? component?.variantA : component?.variantB;
      if (value && value.trim()) {
        parts.push(value.trim());
      }
    }

    return parts.join('\n\n');
  };

  return (
    <div className="email-editor">
      {/* Tabs */}
      <div className="ee-tabs">
        {sequence.map(email => (
          <button
            key={email.position}
            className={`ee-tab ${activeTab === email.position ? 'active' : ''}`}
            onClick={() => setActiveTab(email.position)}
          >
            <span className="ee-tab-label">{email.label}</span>
            {email.position > 1 && (
              <span className="ee-tab-delay">+{email.delayDays}d</span>
            )}
          </button>
        ))}
        <div className="ee-tabs-actions">
          <button
            className="ee-preview-toggle"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          {onGenerateAll && (
            <button
              className="ee-generate-all"
              onClick={onGenerateAll}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate All'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeEmail && (
          <motion.div
            key={`${activeEmail.position}-${showPreview}`}
            className="ee-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Delay settings for follow-ups */}
            {activeEmail.position > 1 && !showPreview && (
              <div className="ee-delay-setting">
                <label>Send after</label>
                <select
                  value={activeEmail.delayDays}
                  onChange={(e) => handleDelayChange(activeEmail.position, Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 10, 14].map(d => (
                    <option key={d} value={d}>{d} {d === 1 ? 'day' : 'days'}</option>
                  ))}
                </select>
                <span className="ee-delay-hint">after previous email</span>
              </div>
            )}

            {showPreview ? (
              /* Preview mode */
              <div className="ee-preview">
                <div className="ee-preview-variants">
                  <div className="ee-preview-variant variant-a">
                    <h4>Variant A</h4>
                    <div className="ee-preview-email">
                      <div className="ee-preview-meta">
                        <div className="ee-preview-subject">
                          <strong>Subject:</strong>{' '}
                          {activeEmail.components.find(c => c.type === 'subject')?.variantA || '(No subject)'}
                        </div>
                        <div className="ee-preview-preheader">
                          <strong>Preview:</strong>{' '}
                          {activeEmail.components.find(c => c.type === 'preview')?.variantA || '(No preview)'}
                        </div>
                      </div>
                      <div className="ee-preview-body">
                        {assembleBody(activeEmail, 'A') || '(No body content)'}
                      </div>
                    </div>
                  </div>
                  <div className="ee-preview-variant variant-b">
                    <h4>Variant B</h4>
                    <div className="ee-preview-email">
                      <div className="ee-preview-meta">
                        <div className="ee-preview-subject">
                          <strong>Subject:</strong>{' '}
                          {activeEmail.components.find(c => c.type === 'subject')?.variantB || '(No subject)'}
                        </div>
                        <div className="ee-preview-preheader">
                          <strong>Preview:</strong>{' '}
                          {activeEmail.components.find(c => c.type === 'preview')?.variantB || '(No preview)'}
                        </div>
                      </div>
                      <div className="ee-preview-body">
                        {assembleBody(activeEmail, 'B') || '(No body content)'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit mode */
              <div className="ee-components">
                {activeEmail.components.map(component => (
                  <ComponentEditor
                    key={component.type}
                    component={component}
                    onChange={(updated) => handleComponentChange(activeEmail.position, updated)}
                    onGenerate={onGenerateComponent ? handleGenerate : undefined}
                    isGenerating={isGenerating}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .email-editor {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .ee-tabs {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-md);
          background: var(--color-bg-elevated);
          border-bottom: 1px solid var(--color-border);
          overflow-x: auto;
        }

        .ee-tab {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-lg);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .ee-tab:hover {
          border-color: var(--color-text-muted);
          color: var(--color-text-primary);
        }

        .ee-tab.active {
          background: var(--color-accent);
          border-color: var(--color-accent);
          color: #0f172a;
        }

        .ee-tab-label {
          font-weight: 500;
        }

        .ee-tab-delay {
          font-size: 0.7rem;
          opacity: 0.7;
        }

        .ee-tabs-actions {
          margin-left: auto;
          display: flex;
          gap: var(--space-sm);
        }

        .ee-preview-toggle {
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ee-preview-toggle:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .ee-generate-all {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-accent);
          border: none;
          border-radius: var(--radius-md);
          color: #0f172a;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ee-generate-all:hover:not(:disabled) {
          background: #67e8f9;
        }

        .ee-generate-all:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ee-content {
          padding: var(--space-lg);
        }

        .ee-delay-setting {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
        }

        .ee-delay-setting label {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .ee-delay-setting select {
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-primary);
          font-family: var(--font-mono);
          font-size: 0.875rem;
        }

        .ee-delay-hint {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .ee-components {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        /* Preview styles */
        .ee-preview-variants {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-lg);
        }

        .ee-preview-variant h4 {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--space-md);
        }

        .ee-preview-variant.variant-a h4 {
          color: var(--color-accent);
        }

        .ee-preview-variant.variant-b h4 {
          color: #a78bfa;
        }

        .ee-preview-email {
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .ee-preview-meta {
          padding: var(--space-md);
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-primary);
        }

        .ee-preview-subject,
        .ee-preview-preheader {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin-bottom: var(--space-xs);
        }

        .ee-preview-subject strong,
        .ee-preview-preheader strong {
          color: var(--color-text-muted);
        }

        .ee-preview-body {
          padding: var(--space-lg);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--color-text-primary);
          line-height: 1.7;
          white-space: pre-wrap;
          min-height: 200px;
        }

        @media (max-width: 900px) {
          .ee-preview-variants {
            grid-template-columns: 1fr;
          }

          .ee-tabs {
            flex-wrap: wrap;
          }

          .ee-tabs-actions {
            width: 100%;
            margin-left: 0;
            margin-top: var(--space-sm);
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}

export default EmailEditor;
