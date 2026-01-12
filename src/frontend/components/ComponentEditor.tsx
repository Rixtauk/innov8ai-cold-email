import { useState } from 'react';
import type { EmailComponent, EmailComponentType } from '../../agent/types';

interface ComponentEditorProps {
  component: EmailComponent;
  onChange: (component: EmailComponent) => void;
  onGenerate?: (type: EmailComponentType, variant: 'A' | 'B') => Promise<string>;
  isGenerating?: boolean;
}

const COMPONENT_LABELS: Record<EmailComponentType, { label: string; description: string; placeholder: string }> = {
  subject: {
    label: 'Subject Line',
    description: 'Keep under 50 characters. Create curiosity without clickbait.',
    placeholder: 'Quick question about {{company}}...',
  },
  preview: {
    label: 'Preview Text',
    description: 'Appears after subject in inbox. Under 100 characters.',
    placeholder: 'I noticed something interesting on your website...',
  },
  hook: {
    label: 'Hook',
    description: 'Opening line that grabs attention. Reference something specific.',
    placeholder: '{{hook}} or write a custom opening...',
  },
  problem: {
    label: 'Problem',
    description: 'Identify a pain point your recipient faces.',
    placeholder: 'Most {{industry}} companies struggle with...',
  },
  agitate: {
    label: 'Agitate',
    description: 'Amplify the problem. Make them feel the pain.',
    placeholder: 'This means lost revenue, wasted time, and frustrated teams.',
  },
  solution: {
    label: 'Solution',
    description: 'How you solve the problem. Be specific.',
    placeholder: 'We help companies like yours increase X by Y%...',
  },
  cta: {
    label: 'Call to Action',
    description: 'Clear, specific ask. Low commitment works best.',
    placeholder: 'Would you be open to a quick 15-minute chat this week?',
  },
  ps: {
    label: 'P.S.',
    description: 'Optional. Second hook or social proof.',
    placeholder: 'P.S. We just helped {{similar_company}} achieve {{result}}.',
  },
};

function ComponentEditor({ component, onChange, onGenerate, isGenerating }: ComponentEditorProps) {
  const [expandedVariant, setExpandedVariant] = useState<'A' | 'B' | 'both'>('both');
  const config = COMPONENT_LABELS[component.type];

  const handleChange = (variant: 'A' | 'B', value: string) => {
    onChange({
      ...component,
      [variant === 'A' ? 'variantA' : 'variantB']: value,
    });
  };

  const handleGenerate = async (variant: 'A' | 'B') => {
    if (onGenerate) {
      const generated = await onGenerate(component.type, variant);
      handleChange(variant, generated);
    }
  };

  const charCountA = component.variantA.length;
  const charCountB = component.variantB.length;
  const isSubjectOrPreview = component.type === 'subject' || component.type === 'preview';

  return (
    <div className="component-editor">
      <div className="ce-header">
        <div className="ce-label">
          <span className="ce-type">{config.label}</span>
          <span className="ce-description">{config.description}</span>
        </div>
        <div className="ce-toggle">
          <button
            className={expandedVariant === 'A' ? 'active' : ''}
            onClick={() => setExpandedVariant(expandedVariant === 'A' ? 'both' : 'A')}
          >
            A
          </button>
          <button
            className={expandedVariant === 'B' ? 'active' : ''}
            onClick={() => setExpandedVariant(expandedVariant === 'B' ? 'both' : 'B')}
          >
            B
          </button>
        </div>
      </div>

      <div className={`ce-variants ${expandedVariant !== 'both' ? 'single' : ''}`}>
        {(expandedVariant === 'A' || expandedVariant === 'both') && (
          <div className="ce-variant variant-a">
            <div className="ce-variant-header">
              <span className="ce-variant-label">Variant A</span>
              <span className="ce-variant-style">Direct &amp; Professional</span>
              {isSubjectOrPreview && (
                <span className={`ce-char-count ${charCountA > (component.type === 'subject' ? 50 : 100) ? 'over' : ''}`}>
                  {charCountA}/{component.type === 'subject' ? 50 : 100}
                </span>
              )}
            </div>
            <textarea
              value={component.variantA}
              onChange={(e) => handleChange('A', e.target.value)}
              placeholder={config.placeholder}
              rows={component.type === 'subject' || component.type === 'preview' ? 2 : 4}
            />
            {onGenerate && (
              <button
                className="ce-generate-btn"
                onClick={() => handleGenerate('A')}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate A'}
              </button>
            )}
          </div>
        )}

        {(expandedVariant === 'B' || expandedVariant === 'both') && (
          <div className="ce-variant variant-b">
            <div className="ce-variant-header">
              <span className="ce-variant-label">Variant B</span>
              <span className="ce-variant-style">Conversational &amp; Curious</span>
              {isSubjectOrPreview && (
                <span className={`ce-char-count ${charCountB > (component.type === 'subject' ? 50 : 100) ? 'over' : ''}`}>
                  {charCountB}/{component.type === 'subject' ? 50 : 100}
                </span>
              )}
            </div>
            <textarea
              value={component.variantB}
              onChange={(e) => handleChange('B', e.target.value)}
              placeholder={config.placeholder}
              rows={component.type === 'subject' || component.type === 'preview' ? 2 : 4}
            />
            {onGenerate && (
              <button
                className="ce-generate-btn"
                onClick={() => handleGenerate('B')}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate B'}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .component-editor {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .ce-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: var(--space-md);
          border-bottom: 1px solid var(--color-border);
          background: var(--color-bg-elevated);
        }

        .ce-label {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .ce-type {
          font-family: var(--font-display);
          font-size: 0.875rem;
          color: var(--color-text-primary);
          font-weight: 600;
        }

        .ce-description {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .ce-toggle {
          display: flex;
          gap: 2px;
          background: var(--color-bg-primary);
          border-radius: var(--radius-sm);
          padding: 2px;
        }

        .ce-toggle button {
          padding: var(--space-xs) var(--space-sm);
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .ce-toggle button:hover {
          color: var(--color-text-secondary);
        }

        .ce-toggle button.active {
          background: var(--color-accent);
          color: #0f172a;
        }

        .ce-variants {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: var(--color-border);
        }

        .ce-variants.single {
          grid-template-columns: 1fr;
        }

        .ce-variant {
          padding: var(--space-md);
          background: var(--color-bg-secondary);
        }

        .ce-variant-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
        }

        .ce-variant-label {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .variant-a .ce-variant-label {
          color: var(--color-accent);
        }

        .variant-b .ce-variant-label {
          color: #a78bfa;
        }

        .ce-variant-style {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--color-text-muted);
          font-style: italic;
        }

        .ce-char-count {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--color-text-muted);
        }

        .ce-char-count.over {
          color: var(--color-error);
        }

        .ce-variant textarea {
          width: 100%;
          padding: var(--space-sm);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-primary);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          line-height: 1.5;
          resize: vertical;
        }

        .ce-variant textarea:focus {
          outline: none;
          border-color: var(--color-accent);
        }

        .ce-generate-btn {
          margin-top: var(--space-sm);
          padding: var(--space-xs) var(--space-md);
          background: transparent;
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
        }

        .ce-generate-btn:hover:not(:disabled) {
          border-color: var(--color-accent);
          color: var(--color-accent);
          border-style: solid;
        }

        .ce-generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .ce-variants {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default ComponentEditor;
