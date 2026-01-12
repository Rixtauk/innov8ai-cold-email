import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './frontend/components/Header';
import FileUpload from './frontend/components/FileUpload';
import Pipeline from './frontend/components/Pipeline';
import LeadsTable from './frontend/components/LeadsTable';
import StatsPanel from './frontend/components/StatsPanel';
import ConfigPanel from './frontend/components/ConfigPanel';
import ExportPanel from './frontend/components/ExportPanel';
import UsageMonitor from './frontend/components/UsageMonitor';
import APISetup from './frontend/components/APISetup';
import { APIUsageProvider, useAPIUsage } from './frontend/hooks/useAPIUsage';
import {
  initEnrichment,
  findEmailsForLeads,
  generateIcebreakersForLeads,
  checkServerEnvVars,
  hasServerEnvVars,
} from './api/enrichment';
import type { EnrichedLead, EnrichmentConfig } from './agent/types';

export type AppStage = 'loading' | 'setup' | 'upload' | 'configure' | 'finding_emails' | 'review' | 'enriching' | 'complete';

const defaultConfig: EnrichmentConfig = {
  maxConcurrency: 3,
  retryAttempts: 2,
  includeIcebreaker: true,
  icebreakerTone: 'professional',
};

function AppContent() {
  // Check for stored API keys (fallback for local dev)
  const storedAnthropicKey = localStorage.getItem('innov8ai_anthropic_key') || '';
  const storedFirecrawlKey = localStorage.getItem('innov8ai_firecrawl_key') || '';
  const hasStoredKeys = storedAnthropicKey && storedFirecrawlKey;

  const [stage, setStage] = useState<AppStage>('loading');
  const [leads, setLeads] = useState<EnrichedLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [config, setConfig] = useState<EnrichmentConfig>(defaultConfig);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { addUsage } = useAPIUsage();

  // Store scraped content for icebreaker generation
  const scrapedContentRef = useRef<Map<string, string>>(new Map());

  // Check for server env vars on startup
  useEffect(() => {
    async function checkEnvVars() {
      const health = await checkServerEnvVars();

      if (health.hasAnthropicKey && health.hasFirecrawlKey) {
        // Server has env vars configured, skip setup
        setStage('upload');
      } else if (hasStoredKeys) {
        // Fall back to stored keys (local development)
        initEnrichment(storedAnthropicKey, storedFirecrawlKey);
        setStage('upload');
      } else {
        // Need to show setup screen
        setStage('setup');
      }
    }
    checkEnvVars();
  }, [hasStoredKeys, storedAnthropicKey, storedFirecrawlKey]);

  const handleAPISetup = useCallback((anthropicKey: string, firecrawlKey: string) => {
    initEnrichment(anthropicKey, firecrawlKey);
    setStage('upload');
  }, []);

  const handleFileUpload = useCallback((parsedLeads: EnrichedLead[]) => {
    setLeads(parsedLeads);
    setError(null);
    setStage('configure');
  }, []);

  // Step 1: Find Emails using real APIs
  const handleFindEmails = useCallback(async () => {
    setStage('finding_emails');
    setProcessingIndex(0);
    setError(null);
    scrapedContentRef.current.clear();

    try {
      const results = await findEmailsForLeads(
        leads,
        config,
        (progress, result) => {
          setProcessingIndex(progress.currentIndex);

          // Track API usage
          if (result.emailResult) {
            addUsage({
              inputTokens: result.emailResult.inputTokens,
              outputTokens: result.emailResult.outputTokens,
              model: 'claude-sonnet-4-20250514',
              operation: 'email_search',
            });
          }

          // Store scraped content for later icebreaker generation
          if (result.scrapeResult?.markdown) {
            scrapedContentRef.current.set(result.lead.website, result.scrapeResult.markdown);
          }

          // Update lead in state
          setLeads(prev => {
            const updated = [...prev];
            const index = updated.findIndex(l => l.website === result.lead.website);
            if (index !== -1) {
              updated[index] = result.lead;
            }
            return updated;
          });
        }
      );

      // Auto-select all leads that have emails
      const leadsWithEmails = new Set<number>();
      results.forEach((result, _i) => {
        const index = leads.findIndex(l => l.website === result.lead.website);
        if (index !== -1 && result.lead.email) {
          leadsWithEmails.add(index);
        }
      });
      setSelectedLeads(leadsWithEmails);
      setStage('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find emails');
      setStage('configure');
    }
  }, [leads, config, addUsage]);

  // Step 2: Generate Icebreakers for selected leads
  const handleGenerateIcebreakers = useCallback(async () => {
    setStage('enriching');
    setProcessingIndex(0);
    setError(null);

    const selectedLeadsList = Array.from(selectedLeads).map(i => leads[i]);

    try {
      await generateIcebreakersForLeads(
        selectedLeadsList,
        scrapedContentRef.current,
        config,
        (progress, result) => {
          setProcessingIndex(progress.currentIndex);

          // Track API usage
          if (result.icebreakerResult) {
            addUsage({
              inputTokens: result.icebreakerResult.inputTokens,
              outputTokens: result.icebreakerResult.outputTokens,
              model: 'claude-sonnet-4-20250514',
              operation: 'icebreaker_generation',
            });
          }

          // Update lead in state
          setLeads(prev => {
            const updated = [...prev];
            const index = updated.findIndex(l => l.website === result.lead.website);
            if (index !== -1) {
              updated[index] = {
                ...updated[index],
                icebreaker: result.lead.icebreaker,
              };
            }
            return updated;
          });
        }
      );

      setStage('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate icebreakers');
      setStage('review');
    }
  }, [leads, selectedLeads, config, addUsage]);

  // Skip icebreakers and go straight to export
  const handleSkipToExport = useCallback(() => {
    setStage('complete');
  }, []);

  const handleToggleSelect = (index: number) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allWithEmails = new Set<number>();
    leads.forEach((lead, i) => {
      if (lead.email) allWithEmails.add(i);
    });
    setSelectedLeads(allWithEmails);
  };

  const handleSelectNone = () => {
    setSelectedLeads(new Set());
  };

  const handleReset = () => {
    setStage('upload');
    setLeads([]);
    setSelectedLeads(new Set());
    setProcessingIndex(0);
    setError(null);
    scrapedContentRef.current.clear();
  };

  const handleChangeAPIKeys = () => {
    // Only allow changing keys if not using server env vars
    if (!hasServerEnvVars()) {
      localStorage.removeItem('innov8ai_anthropic_key');
      localStorage.removeItem('innov8ai_firecrawl_key');
      setStage('setup');
    }
  };

  const leadsWithEmails = leads.filter(l => l.email).length;
  const validLeadsCount = leads.filter(l => l.domainValidation?.isValid).length;
  const invalidLeadsCount = leads.filter(l => !l.domainValidation?.isValid).length;

  // Show loading state while checking for env vars
  if (stage === 'loading') {
    return (
      <div className="app">
        <Header />
        <main className="main-content">
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Initializing...</p>
          </div>
        </main>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: var(--space-md);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--color-border);
            border-top-color: var(--color-accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-container p {
            font-family: var(--font-mono);
            font-size: 0.875rem;
            color: var(--color-text-secondary);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <Header onChangeAPIKeys={stage !== 'setup' && !hasServerEnvVars() ? handleChangeAPIKeys : undefined} />

      <main className="main-content">
        {stage !== 'setup' && <Pipeline currentStage={stage} />}

        {error && (
          <motion.div
            className="global-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span className="error-icon">!</span>
            {error}
            <button onClick={() => setError(null)} className="error-dismiss">Dismiss</button>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {stage === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <APISetup
                onComplete={handleAPISetup}
                initialAnthropicKey={storedAnthropicKey}
                initialFirecrawlKey={storedFirecrawlKey}
              />
            </motion.div>
          )}

          {stage === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FileUpload onUpload={handleFileUpload} />
            </motion.div>
          )}

          {stage === 'configure' && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="configure-stage"
            >
              {invalidLeadsCount > 0 && (
                <div className="validation-warning">
                  <span className="warning-icon">!</span>
                  <div className="warning-content">
                    <strong>{invalidLeadsCount} invalid domain{invalidLeadsCount !== 1 ? 's' : ''} detected</strong>
                    <p>These leads have invalid URLs and will be skipped during processing.</p>
                  </div>
                </div>
              )}
              <div className="configure-grid">
                <ConfigPanel
                  config={config}
                  onChange={setConfig}
                  leadsCount={validLeadsCount}
                  onFindEmails={handleFindEmails}
                  mode="initial"
                />
                <LeadsTable leads={leads} />
              </div>
            </motion.div>
          )}

          {stage === 'finding_emails' && (
            <motion.div
              key="finding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="results-stage"
            >
              <StatsPanel
                leads={leads}
                isProcessing={true}
                currentIndex={processingIndex}
                totalToProcess={validLeadsCount}
                mode="emails"
              />
              <LeadsTable leads={leads} showEnrichment />
            </motion.div>
          )}

          {stage === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="results-stage"
            >
              <StatsPanel
                leads={leads}
                isProcessing={false}
                currentIndex={leads.length}
                mode="emails"
              />

              <div className="review-actions">
                <div className="review-header">
                  <h3>Select leads for icebreaker generation</h3>
                  <p>Found {leadsWithEmails} emails. Select which leads you want to generate icebreakers for.</p>
                </div>
                <div className="selection-controls">
                  <button className="select-btn" onClick={handleSelectAll}>Select All ({leadsWithEmails})</button>
                  <button className="select-btn" onClick={handleSelectNone}>Select None</button>
                  <span className="selected-count">{selectedLeads.size} selected</span>
                </div>
              </div>

              <LeadsTable
                leads={leads}
                showEnrichment
                selectable
                selectedLeads={selectedLeads}
                onToggleSelect={handleToggleSelect}
              />

              <div className="review-buttons">
                <ConfigPanel
                  config={config}
                  onChange={setConfig}
                  leadsCount={selectedLeads.size}
                  onGenerateIcebreakers={handleGenerateIcebreakers}
                  onSkip={handleSkipToExport}
                  mode="review"
                  selectedCount={selectedLeads.size}
                />
              </div>
            </motion.div>
          )}

          {stage === 'enriching' && (
            <motion.div
              key="enriching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="results-stage"
            >
              <StatsPanel
                leads={leads}
                isProcessing={true}
                currentIndex={processingIndex}
                totalToProcess={selectedLeads.size}
                mode="icebreakers"
              />
              <LeadsTable leads={leads} showEnrichment />
            </motion.div>
          )}

          {stage === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="results-stage"
            >
              <StatsPanel
                leads={leads}
                isProcessing={false}
                currentIndex={leads.length}
                mode="complete"
              />
              <LeadsTable leads={leads} showEnrichment />
              <ExportPanel leads={leads} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main-content {
          flex: 1;
          padding: var(--space-xl) var(--space-2xl);
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .global-error {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid var(--color-error);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-lg);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-error);
        }

        .error-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: var(--color-error);
          color: white;
          border-radius: 50%;
          font-weight: bold;
          font-size: 0.875rem;
        }

        .error-dismiss {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          padding: var(--space-xs) var(--space-sm);
          background: transparent;
          border: 1px solid var(--color-error);
          border-radius: var(--radius-sm);
          color: var(--color-error);
          cursor: pointer;
        }

        .error-dismiss:hover {
          background: var(--color-error);
          color: white;
        }

        .configure-stage,
        .results-stage {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .configure-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: var(--space-lg);
          align-items: start;
        }

        .review-actions {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }

        .review-header {
          margin-bottom: var(--space-md);
        }

        .review-header h3 {
          font-family: var(--font-display);
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--space-xs);
        }

        .review-header p {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .selection-controls {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .select-btn {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          padding: var(--space-xs) var(--space-md);
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .select-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .selected-count {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-accent);
          margin-left: auto;
        }

        .review-buttons {
          display: flex;
          gap: var(--space-md);
        }

        .validation-warning {
          display: flex;
          align-items: flex-start;
          gap: var(--space-md);
          padding: var(--space-md) var(--space-lg);
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-lg);
        }

        .warning-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: var(--color-warning);
          color: var(--color-bg-primary);
          border-radius: 50%;
          font-weight: bold;
          font-size: 0.875rem;
        }

        .warning-content {
          flex: 1;
        }

        .warning-content strong {
          display: block;
          font-family: var(--font-display);
          font-size: 0.9rem;
          color: var(--color-warning);
          margin-bottom: var(--space-xs);
        }

        .warning-content p {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        @media (max-width: 900px) {
          .main-content {
            padding: var(--space-lg);
          }

          .configure-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <UsageMonitor />
    </div>
  );
}

function App() {
  return (
    <APIUsageProvider>
      <AppContent />
    </APIUsageProvider>
  );
}

export default App;
