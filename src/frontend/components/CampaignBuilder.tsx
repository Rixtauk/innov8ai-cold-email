import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { KnowledgeBase, Campaign, SequenceEmail, EmailPosition, EmailComponentType } from '../../agent/types';
import { DEFAULT_SEQUENCE as defaultSequence } from '../../agent/types';
import { saveCampaign, getCampaigns } from '../../utils/localStorage';
import EmailEditor from './EmailEditor';

interface CampaignBuilderProps {
  knowledgeBase?: KnowledgeBase;
  onComplete: (campaign: Campaign) => void;
  onBack?: () => void;
}

function CampaignBuilder({ knowledgeBase, onComplete, onBack }: CampaignBuilderProps) {
  const [campaignName, setCampaignName] = useState('');
  const [sequence, setSequence] = useState<SequenceEmail[]>(
    JSON.parse(JSON.stringify(defaultSequence)) // Deep copy
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCampaigns, setSavedCampaigns] = useState<Campaign[]>([]);
  const [showLoadCampaign, setShowLoadCampaign] = useState(false);

  // Load saved campaigns
  useEffect(() => {
    setSavedCampaigns(getCampaigns());
  }, []);

  // Generate a single component via AI
  const handleGenerateComponent = async (
    position: EmailPosition,
    type: EmailComponentType,
    variant: 'A' | 'B'
  ): Promise<string> => {
    if (!knowledgeBase) {
      setError('Please select a knowledge base first');
      return '';
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-email-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knowledgeBase: knowledgeBase.content,
          componentType: type,
          emailPosition: position,
          variant,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate component');
      }

      const data = await response.json();
      return data.content || '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      return '';
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate all components for all emails
  const handleGenerateAll = async () => {
    if (!knowledgeBase) {
      setError('Please select a knowledge base first');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Generate components for each email in sequence
      const newSequence = [...sequence];
      const componentTypes: EmailComponentType[] = ['subject', 'preview', 'problem', 'agitate', 'solution', 'cta', 'ps'];
      // Note: 'hook' is typically {{hook}} which gets filled per-lead, so we skip auto-generation

      for (const email of newSequence) {
        for (const type of componentTypes) {
          const component = email.components.find(c => c.type === type);
          if (!component) continue;

          // Generate variant A
          const responseA = await fetch('/api/generate-email-component', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              knowledgeBase: knowledgeBase.content,
              componentType: type,
              emailPosition: email.position,
              variant: 'A',
            }),
          });
          if (responseA.ok) {
            const dataA = await responseA.json();
            component.variantA = dataA.content || component.variantA;
          }

          // Generate variant B
          const responseB = await fetch('/api/generate-email-component', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              knowledgeBase: knowledgeBase.content,
              componentType: type,
              emailPosition: email.position,
              variant: 'B',
            }),
          });
          if (responseB.ok) {
            const dataB = await responseB.json();
            component.variantB = dataB.content || component.variantB;
          }
        }
      }

      setSequence(newSequence);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save and continue
  const handleContinue = () => {
    if (!campaignName.trim()) {
      setError('Please enter a campaign name');
      return;
    }

    // Check if any content has been added
    const hasContent = sequence.some(email =>
      email.components.some(c => c.variantA.trim() || c.variantB.trim())
    );

    if (!hasContent) {
      setError('Please add some content to your email templates');
      return;
    }

    const campaign = saveCampaign({
      name: campaignName.trim(),
      knowledgeBaseId: knowledgeBase?.id || '',
      sequence,
    });

    onComplete(campaign);
  };

  // Load an existing campaign
  const handleLoadCampaign = (campaign: Campaign) => {
    setCampaignName(campaign.name);
    setSequence(campaign.sequence);
    setShowLoadCampaign(false);
  };

  return (
    <div className="campaign-builder-container">
      <motion.div
        className="campaign-builder"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="cb-header">
          <div className="cb-header-content">
            <h2>Campaign Builder</h2>
            <p className="cb-subtitle">
              Create your 3-email sequence with A/B variants. Use merge fields like {'{{firstName}}'}, {'{{company}}'}, and {'{{hook}}'} for personalisation.
            </p>
          </div>
          <div className="cb-header-actions">
            {onBack && (
              <button className="cb-back-btn" onClick={onBack}>
                ← Back
              </button>
            )}
            {savedCampaigns.length > 0 && (
              <button
                className="cb-load-btn"
                onClick={() => setShowLoadCampaign(!showLoadCampaign)}
              >
                Load Campaign
              </button>
            )}
          </div>
        </div>

        {/* Load Campaign Dropdown */}
        {showLoadCampaign && (
          <div className="cb-load-dropdown">
            <div className="cb-load-header">Saved Campaigns</div>
            {savedCampaigns.map(c => (
              <button
                key={c.id}
                className="cb-load-item"
                onClick={() => handleLoadCampaign(c)}
              >
                <span className="cb-load-name">{c.name}</span>
                <span className="cb-load-date">
                  {new Date(c.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Knowledge Base Info */}
        {knowledgeBase && (
          <div className="cb-kb-info">
            <span className="cb-kb-label">Using Framework:</span>
            <span className="cb-kb-name">{knowledgeBase.name}</span>
          </div>
        )}

        {/* Campaign Name */}
        <div className="cb-name-field">
          <label>Campaign Name</label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="e.g., Q1 SaaS Outreach, Product Launch"
          />
        </div>

        {/* Merge Fields Reference */}
        <div className="cb-merge-fields">
          <span className="cb-merge-label">Available merge fields:</span>
          <div className="cb-merge-tags">
            <code>{'{{firstName}}'}</code>
            <code>{'{{lastName}}'}</code>
            <code>{'{{company}}'}</code>
            <code>{'{{domain}}'}</code>
            <code>{'{{hook}}'}</code>
          </div>
        </div>

        {/* Email Editor */}
        <EmailEditor
          sequence={sequence}
          onChange={setSequence}
          onGenerateComponent={knowledgeBase ? handleGenerateComponent : undefined}
          onGenerateAll={knowledgeBase ? handleGenerateAll : undefined}
          isGenerating={isGenerating}
        />

        {/* Error */}
        {error && (
          <div className="cb-error">{error}</div>
        )}

        {/* Footer */}
        <div className="cb-footer">
          <div className="cb-footer-info">
            <span className="cb-info-label">Spintax format:</span>
            <span className="cb-info-value">
              Variants will be exported as {'{Variant A|Variant B}'} for Instantly.ai
            </span>
          </div>
          <button
            className="cb-continue-btn"
            onClick={handleContinue}
            disabled={isGenerating}
          >
            Save &amp; Continue
          </button>
        </div>
      </motion.div>

      <style>{`
        .campaign-builder-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-lg);
        }

        .campaign-builder {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .cb-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: var(--space-xl);
          border-bottom: 1px solid var(--color-border);
        }

        .cb-header h2 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          color: var(--color-text-primary);
          margin-bottom: var(--space-xs);
        }

        .cb-subtitle {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .cb-header-actions {
          display: flex;
          gap: var(--space-sm);
        }

        .cb-back-btn,
        .cb-load-btn {
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cb-back-btn:hover,
        .cb-load-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .cb-load-dropdown {
          margin: 0 var(--space-xl);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .cb-load-header {
          padding: var(--space-sm) var(--space-md);
          background: var(--color-bg-primary);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--color-border);
        }

        .cb-load-item {
          display: flex;
          justify-content: space-between;
          width: 100%;
          padding: var(--space-md);
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--color-border);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .cb-load-item:last-child {
          border-bottom: none;
        }

        .cb-load-item:hover {
          background: var(--color-accent-subtle);
        }

        .cb-load-name {
          font-family: var(--font-display);
          font-size: 0.875rem;
          color: var(--color-text-primary);
        }

        .cb-load-date {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .cb-kb-info {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-xl);
          background: var(--color-accent-subtle);
          border-bottom: 1px solid var(--color-border);
        }

        .cb-kb-label {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .cb-kb-name {
          font-family: var(--font-display);
          font-size: 0.875rem;
          color: var(--color-accent);
          font-weight: 500;
        }

        .cb-name-field {
          padding: var(--space-lg) var(--space-xl);
          border-bottom: 1px solid var(--color-border);
        }

        .cb-name-field label {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--space-xs);
        }

        .cb-name-field input {
          width: 100%;
          max-width: 400px;
          padding: var(--space-sm) var(--space-md);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-family: var(--font-mono);
          font-size: 0.875rem;
        }

        .cb-name-field input:focus {
          outline: none;
          border-color: var(--color-accent);
        }

        .cb-merge-fields {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--space-sm);
          padding: var(--space-md) var(--space-xl);
          background: var(--color-bg-elevated);
          border-bottom: 1px solid var(--color-border);
        }

        .cb-merge-label {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .cb-merge-tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-xs);
        }

        .cb-merge-tags code {
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-accent);
        }

        .cb-error {
          margin: var(--space-lg) var(--space-xl);
          padding: var(--space-md);
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid var(--color-error);
          border-radius: var(--radius-md);
          color: var(--color-error);
          font-family: var(--font-mono);
          font-size: 0.875rem;
        }

        .cb-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-lg) var(--space-xl);
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
        }

        .cb-footer-info {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .cb-info-label {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cb-info-value {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .cb-continue-btn {
          padding: var(--space-md) var(--space-xl);
          background: var(--color-accent);
          border: none;
          border-radius: var(--radius-md);
          color: #0f172a;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cb-continue-btn:hover:not(:disabled) {
          background: #67e8f9;
        }

        .cb-continue-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .cb-header {
            flex-direction: column;
            gap: var(--space-md);
          }

          .cb-header-actions {
            width: 100%;
          }

          .cb-footer {
            flex-direction: column;
            gap: var(--space-lg);
            align-items: stretch;
          }

          .cb-continue-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default CampaignBuilder;
