import { motion } from 'framer-motion';
import type { EnrichedLead } from '../../agent/types';

interface ExportPanelProps {
  leads: EnrichedLead[];
  onReset: () => void;
}

function ExportPanel({ leads, onReset }: ExportPanelProps) {
  const handleExportCSV = () => {
    // Get all columns
    const columns = ['website', 'company', 'name', 'email', 'icebreaker', 'enrichmentStatus'];
    const headers = columns.join(',');

    const rows = leads.map(lead =>
      columns
        .map(col => {
          const value = lead[col as keyof EnrichedLead] || '';
          // Escape commas and quotes
          const escaped = String(value).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    downloadFile(csv, 'enriched-leads.csv', 'text/csv');
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(leads, null, 2);
    downloadFile(json, 'enriched-leads.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyForInstantly = () => {
    // Format for Instantly: just the key columns
    const rows = leads
      .filter(l => l.email)
      .map(l => `${l.email}\t${l.icebreaker || ''}\t${l.website}`)
      .join('\n');

    navigator.clipboard.writeText(`email\ticebreaker\twebsite\n${rows}`);
  };

  return (
    <motion.div
      className="export-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <div className="export-header">
        <div className="export-icon">🎉</div>
        <div className="export-text">
          <h3 className="export-title">Enrichment Complete!</h3>
          <p className="export-subtitle">
            Found {leads.filter(l => l.email).length} emails and generated{' '}
            {leads.filter(l => l.icebreaker).length} icebreakers
          </p>
        </div>
      </div>

      <div className="export-actions">
        <motion.button
          className="export-btn primary"
          onClick={handleExportCSV}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="btn-icon">📥</span>
          Download CSV
        </motion.button>

        <motion.button
          className="export-btn secondary"
          onClick={handleExportJSON}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="btn-icon">📄</span>
          Download JSON
        </motion.button>

        <motion.button
          className="export-btn secondary"
          onClick={handleCopyForInstantly}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="btn-icon">📋</span>
          Copy for Instantly
        </motion.button>

        <motion.button
          className="export-btn ghost"
          onClick={onReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="btn-icon">↩️</span>
          Start New Batch
        </motion.button>
      </div>

      <style>{`
        .export-panel {
          background: linear-gradient(135deg, var(--color-accent-subtle), rgba(45, 212, 191, 0.05));
          border: 1px solid var(--color-accent);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }

        .export-header {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }

        .export-icon {
          font-size: 2rem;
        }

        .export-text {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .export-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .export-subtitle {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .export-actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          font-family: var(--font-display);
          font-size: 0.875rem;
          font-weight: 500;
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .export-btn.primary {
          background: linear-gradient(135deg, var(--color-accent), var(--color-accent-dim));
          border: none;
          color: var(--color-bg-primary);
        }

        .export-btn.primary:hover {
          box-shadow: var(--shadow-glow);
        }

        .export-btn.secondary {
          background: var(--color-bg-elevated);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
        }

        .export-btn.secondary:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .export-btn.ghost {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
        }

        .export-btn.ghost:hover {
          border-color: var(--color-text-secondary);
          color: var(--color-text-primary);
        }

        .btn-icon {
          font-size: 1rem;
        }

        @media (max-width: 600px) {
          .export-actions {
            flex-direction: column;
          }

          .export-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </motion.div>
  );
}

export default ExportPanel;
