import { motion } from 'framer-motion';
import type { EnrichedLead } from '../../agent/types';

interface LeadsTableProps {
  leads: EnrichedLead[];
  showEnrichment?: boolean;
  selectable?: boolean;
  selectedLeads?: Set<number>;
  onToggleSelect?: (index: number) => void;
}

function LeadsTable({
  leads,
  showEnrichment = false,
  selectable = false,
  selectedLeads = new Set(),
  onToggleSelect,
}: LeadsTableProps) {
  return (
    <div className="table-container">
      <div className="table-header">
        <h3 className="table-title">Leads Preview</h3>
        <span className="table-count">{leads.length} rows</span>
      </div>

      <div className="table-wrapper">
        <table className="leads-table">
          <thead>
            <tr>
              {selectable && <th className="col-select">Select</th>}
              <th className="col-num">#</th>
              <th className="col-website">Website</th>
              <th className="col-company">Company</th>
              {showEnrichment && (
                <>
                  <th className="col-email">Email</th>
                  <th className="col-icebreaker">Icebreaker</th>
                </>
              )}
              <th className="col-status-badge">Status</th>
            </tr>
          </thead>
          <tbody>
            {leads.slice(0, 100).map((lead, index) => {
              const isSelected = selectedLeads.has(index);
              const hasEmail = !!lead.email;

              return (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5), duration: 0.2 }}
                  className={`row-${lead.enrichmentStatus} ${isSelected ? 'row-selected' : ''} ${lead.domainValidation && !lead.domainValidation.isValid ? 'row-invalid-domain' : ''}`}
                  onClick={selectable && hasEmail ? () => onToggleSelect?.(index) : undefined}
                  style={selectable && hasEmail ? { cursor: 'pointer' } : undefined}
                  title={lead.domainValidation && !lead.domainValidation.isValid ? `Invalid: ${lead.domainValidation.error}` : undefined}
                >
                  {selectable && (
                    <td className="col-select">
                      {hasEmail ? (
                        <label className="checkbox-wrapper" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect?.(index)}
                            className="checkbox-input"
                          />
                          <span className={`checkbox-custom ${isSelected ? 'checked' : ''}`}>
                            {isSelected && '✓'}
                          </span>
                        </label>
                      ) : (
                        <span className="no-email-indicator">—</span>
                      )}
                    </td>
                  )}
                  <td className="col-num">
                    <span className="row-number">{index + 1}</span>
                  </td>
                  <td className="col-website">
                    <span className="website-text">{lead.website}</span>
                  </td>
                  <td className="col-company">
                    {lead.company || <span className="empty-cell">—</span>}
                  </td>
                  {showEnrichment && (
                    <>
                      <td className="col-email">
                        {lead.email ? (
                          <span className="email-found">{lead.email}</span>
                        ) : (
                          <span className="email-not-found">Not found</span>
                        )}
                      </td>
                      <td className="col-icebreaker">
                        {lead.icebreaker ? (
                          <span className="icebreaker-text" title={lead.icebreaker}>
                            {lead.icebreaker.substring(0, 60)}...
                          </span>
                        ) : (
                          <span className="empty-cell">—</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="col-status-badge">
                    <StatusBadge status={lead.enrichmentStatus} />
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {leads.length > 100 && (
          <div className="table-footer">
            <span className="more-text">+ {leads.length - 100} more leads</span>
          </div>
        )}
      </div>

      <style>{`
        .table-container {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md) var(--space-lg);
          border-bottom: 1px solid var(--color-border);
        }

        .table-title {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .table-count {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .table-wrapper {
          overflow-x: auto;
          max-height: 400px;
          overflow-y: auto;
        }

        .leads-table {
          width: 100%;
          border-collapse: collapse;
        }

        .leads-table th,
        .leads-table td {
          padding: var(--space-sm) var(--space-md);
          text-align: left;
          border-bottom: 1px solid var(--color-border);
        }

        .leads-table th {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--color-bg-elevated);
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .leads-table td {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .leads-table tr:hover {
          background: var(--color-bg-hover);
        }

        .row-selected {
          background: var(--color-accent-subtle) !important;
        }

        .row-processing {
          background: var(--color-accent-subtle);
        }

        .row-completed {
          background: rgba(45, 212, 191, 0.03);
        }

        .row-failed {
          background: rgba(248, 113, 113, 0.05);
        }

        .row-skipped,
        .row-invalid-domain {
          background: rgba(251, 191, 36, 0.05);
          opacity: 0.7;
        }

        .row-invalid-domain .website-text {
          color: var(--color-warning);
          text-decoration: line-through;
        }

        .row-number {
          color: var(--color-text-muted);
        }

        .col-select {
          width: 50px;
          text-align: center;
        }

        .col-num {
          width: 40px;
        }

        .col-website {
          min-width: 160px;
        }

        .col-company {
          min-width: 100px;
        }

        .col-email {
          min-width: 160px;
        }

        .col-icebreaker {
          min-width: 200px;
          max-width: 300px;
        }

        .col-status-badge {
          width: 90px;
        }

        .checkbox-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .checkbox-input {
          display: none;
        }

        .checkbox-custom {
          width: 20px;
          height: 20px;
          border: 2px solid var(--color-border);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: var(--color-bg-primary);
          transition: all 0.2s ease;
        }

        .checkbox-custom.checked {
          background: var(--color-accent);
          border-color: var(--color-accent);
        }

        .checkbox-custom:hover {
          border-color: var(--color-accent);
        }

        .no-email-indicator {
          color: var(--color-text-muted);
          opacity: 0.3;
        }

        .website-text {
          color: var(--color-accent);
        }

        .email-found {
          color: var(--color-success);
        }

        .email-not-found {
          color: var(--color-error);
          opacity: 0.7;
          font-size: 0.75rem;
        }

        .icebreaker-text {
          color: var(--color-text-secondary);
          font-size: 0.75rem;
        }

        .empty-cell {
          color: var(--color-text-muted);
          opacity: 0.5;
        }

        .table-footer {
          padding: var(--space-sm) var(--space-md);
          text-align: center;
          background: var(--color-bg-elevated);
        }

        .more-text {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: EnrichedLead['enrichmentStatus'] }) {
  const config = {
    pending: { label: 'Pending', color: 'var(--color-pending)' },
    processing: { label: 'Processing', color: 'var(--color-accent)' },
    completed: { label: 'Done', color: 'var(--color-success)' },
    failed: { label: 'Failed', color: 'var(--color-error)' },
    skipped: { label: 'Invalid', color: 'var(--color-warning)' },
  };

  const { label, color } = config[status];

  return (
    <span
      className="status-badge"
      style={{
        color,
        backgroundColor: `${color}15`,
        borderColor: `${color}30`,
      }}
    >
      {status === 'processing' && <span className="processing-dot" />}
      {label}

      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .processing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </span>
  );
}

export default LeadsTable;
