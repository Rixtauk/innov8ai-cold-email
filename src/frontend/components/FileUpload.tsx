import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import type { EnrichedLead } from '../../agent/types';
import { validateDomain } from '../../agent/crawl';

interface FileUploadProps {
  onUpload: (leads: EnrichedLead[]) => void;
}

interface ParsedCSV {
  headers: string[];
  rows: string[][];
  rawContent: string;
}

function FileUpload({ onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null);
  const [selectedWebsiteCol, setSelectedWebsiteCol] = useState<number>(-1);
  const [selectedCompanyCol, setSelectedCompanyCol] = useState<number>(-1);
  const [selectedEmailCol, setSelectedEmailCol] = useState<number>(-1);

  // Proper CSV parsing that handles quoted fields with commas
  const parseCSVContent = (content: string): { headers: string[]; rows: string[][] } => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else if (char === '"') {
          // End of quoted field
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          // Start of quoted field
          inQuotes = true;
        } else if (char === ',') {
          // Field separator
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          // Row separator
          currentRow.push(currentField.trim());
          if (currentRow.some(f => f !== '')) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
          if (char === '\r') i++; // Skip \n in \r\n
        } else if (char !== '\r') {
          currentField += char;
        }
      }
    }

    // Don't forget last field/row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(f => f !== '')) {
        rows.push(currentRow);
      }
    }

    if (rows.length < 2) {
      throw new Error('CSV must have headers and at least one data row');
    }

    return {
      headers: rows[0],
      rows: rows.slice(1),
    };
  };

  // Find columns that look like URLs
  const detectUrlColumns = (headers: string[], rows: string[][]): number[] => {
    const urlLikeColumns: number[] = [];
    const urlPatterns = ['website', 'url', 'domain', 'site', 'homepage', 'web'];

    headers.forEach((header, idx) => {
      const headerLower = header.toLowerCase();
      // Check if header name suggests URL
      if (urlPatterns.some(p => headerLower.includes(p))) {
        urlLikeColumns.push(idx);
        return;
      }
      // Check if values look like URLs
      const sampleValues = rows.slice(0, 10).map(r => r[idx] || '');
      const urlCount = sampleValues.filter(v =>
        v.includes('http') || v.includes('www.') || /\.[a-z]{2,}$/i.test(v)
      ).length;
      if (urlCount >= 3) {
        urlLikeColumns.push(idx);
      }
    });

    return urlLikeColumns;
  };

  const processWithSelectedColumns = useCallback(() => {
    // Require at least email OR domain column to be selected
    if (!parsedCSV || (selectedWebsiteCol === -1 && selectedEmailCol === -1)) return;

    const { headers, rows } = parsedCSV;
    const leads: EnrichedLead[] = [];

    for (const row of rows) {
      const websiteValue = selectedWebsiteCol !== -1 ? row[selectedWebsiteCol] : undefined;
      const existingEmail = selectedEmailCol !== -1 ? row[selectedEmailCol]?.trim() : undefined;
      const hasExistingEmail = existingEmail && existingEmail.includes('@');

      // Skip rows that have neither domain nor email
      if (!websiteValue && !hasExistingEmail) continue;

      // Only validate domain if we have one
      const validation = websiteValue ? validateDomain(websiteValue) : { isValid: false, domain: '', tld: '', error: 'No domain provided' };

      // Collect extra fields (exclude selected columns)
      const extraFields: Record<string, string> = {};
      headers.forEach((header, idx) => {
        if (
          idx !== selectedWebsiteCol &&
          idx !== selectedCompanyCol &&
          idx !== selectedEmailCol &&
          row[idx]
        ) {
          extraFields[header] = row[idx];
        }
      });

      // Determine status:
      // - If has existing email: completed (skip scraping)
      // - If has valid domain but no email: pending (needs scraping)
      // - If no domain and no email: skipped
      let enrichmentStatus: EnrichedLead['enrichmentStatus'] = 'pending';
      if (hasExistingEmail) {
        enrichmentStatus = 'completed';
      } else if (!websiteValue || !validation.isValid) {
        enrichmentStatus = 'skipped';
      }

      const lead: EnrichedLead = {
        website: websiteValue || '',
        company: selectedCompanyCol !== -1 ? row[selectedCompanyCol] : undefined,
        email: hasExistingEmail ? existingEmail : undefined,
        extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
        enrichmentStatus,
        domainValidation: websiteValue ? {
          isValid: validation.isValid,
          domain: validation.domain,
          tld: validation.tld,
          error: validation.error,
        } : undefined,
        errorMessage: websiteValue && !validation.isValid ? `Invalid domain: ${validation.error}` : undefined,
      };

      leads.push(lead);
    }

    if (leads.length === 0) {
      setError('No valid leads found in the CSV');
      return;
    }

    onUpload(leads);
    setParsedCSV(null);
    setSelectedWebsiteCol(-1);
    setSelectedCompanyCol(-1);
    setSelectedEmailCol(-1);
  }, [parsedCSV, selectedWebsiteCol, selectedCompanyCol, selectedEmailCol, onUpload]);

  const handleFile = useCallback((file: File) => {
    setError(null);
    setParsedCSV(null);

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const { headers, rows } = parseCSVContent(content);

        // Detect URL columns
        const urlColumns = detectUrlColumns(headers, rows);

        // If only one URL column found, auto-select and proceed
        if (urlColumns.length === 1) {
          const websiteCol = urlColumns[0];
          const leads: EnrichedLead[] = [];

          // Try to find company column
          const companyCol = headers.findIndex(h =>
            ['company', 'company_name', 'business', 'organization', 'title'].includes(h.toLowerCase())
          );

          for (const row of rows) {
            const websiteValue = row[websiteCol];
            if (!websiteValue) continue;

            const validation = validateDomain(websiteValue);

            const extraFields: Record<string, string> = {};
            headers.forEach((header, idx) => {
              if (idx !== websiteCol && idx !== companyCol && row[idx]) {
                extraFields[header] = row[idx];
              }
            });

            leads.push({
              website: websiteValue,
              company: companyCol !== -1 ? row[companyCol] : undefined,
              extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
              enrichmentStatus: validation.isValid ? 'pending' : 'skipped',
              domainValidation: {
                isValid: validation.isValid,
                domain: validation.domain,
                tld: validation.tld,
                error: validation.error,
              },
              errorMessage: validation.isValid ? undefined : `Invalid domain: ${validation.error}`,
            });
          }

          if (leads.length === 0) {
            setError('No valid leads found in the CSV');
            return;
          }
          onUpload(leads);
        } else {
          // Multiple or no URL columns - show selector
          setParsedCSV({ headers, rows, rawContent: content });
          if (urlColumns.length > 0) {
            setSelectedWebsiteCol(urlColumns[0]);
          }
          // Try to auto-select company column
          const companyCol = headers.findIndex(h =>
            ['company', 'company_name', 'business', 'organization', 'title'].includes(h.toLowerCase())
          );
          if (companyCol !== -1) {
            setSelectedCompanyCol(companyCol);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      }
    };
    reader.readAsText(file);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Column selector UI
  if (parsedCSV) {
    const sampleRows = parsedCSV.rows.slice(0, 3);

    return (
      <div className="upload-container">
        <motion.div
          className="column-selector"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>Select Columns</h3>
          <p className="selector-subtitle">
            We found {parsedCSV.rows.length} rows. Please select which columns to use.
          </p>

          <div className="selector-grid">
            <div className="selector-field">
              <label>Domain Column (optional)</label>
              <select
                value={selectedWebsiteCol}
                onChange={(e) => setSelectedWebsiteCol(Number(e.target.value))}
              >
                <option value={-1}>-- None (skip scraping) --</option>
                {parsedCSV.headers.map((header, idx) => (
                  <option key={idx} value={idx}>
                    {header} (e.g., "{sampleRows[0]?.[idx]?.substring(0, 40) || ''}")
                  </option>
                ))}
              </select>
              <span className="field-hint">Used for website scraping and email discovery</span>
            </div>

            <div className="selector-field">
              <label>Company Column (optional)</label>
              <select
                value={selectedCompanyCol}
                onChange={(e) => setSelectedCompanyCol(Number(e.target.value))}
              >
                <option value={-1}>-- None --</option>
                {parsedCSV.headers.map((header, idx) => (
                  <option key={idx} value={idx}>
                    {header} (e.g., "{sampleRows[0]?.[idx]?.substring(0, 40) || ''}")
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-field">
              <label>Email Column (optional)</label>
              <select
                value={selectedEmailCol}
                onChange={(e) => setSelectedEmailCol(Number(e.target.value))}
              >
                <option value={-1}>-- None (find emails) --</option>
                {parsedCSV.headers.map((header, idx) => (
                  <option key={idx} value={idx}>
                    {header} (e.g., "{sampleRows[0]?.[idx]?.substring(0, 40) || ''}")
                  </option>
                ))}
              </select>
              <span className="field-hint">If selected, rows with emails will skip email discovery</span>
            </div>
          </div>

          <div className="preview-table">
            <div className="preview-header">Preview (first 3 rows)</div>
            <table>
              <thead>
                <tr>
                  {parsedCSV.headers.map((h, i) => (
                    <th key={i} className={
                      i === selectedWebsiteCol ? 'selected-website' :
                      i === selectedCompanyCol ? 'selected-company' :
                      i === selectedEmailCol ? 'selected-email' : ''
                    }>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={
                        ci === selectedWebsiteCol ? 'selected-website' :
                        ci === selectedCompanyCol ? 'selected-company' :
                        ci === selectedEmailCol ? 'selected-email' : ''
                      }>
                        {cell?.substring(0, 30)}{cell?.length > 30 ? '...' : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="selector-actions">
            <button
              className="cancel-btn"
              onClick={() => {
                setParsedCSV(null);
                setSelectedWebsiteCol(-1);
                setSelectedCompanyCol(-1);
                setSelectedEmailCol(-1);
              }}
            >
              Cancel
            </button>
            <button
              className="confirm-btn"
              onClick={processWithSelectedColumns}
              disabled={selectedWebsiteCol === -1 && selectedEmailCol === -1}
            >
              Continue with {parsedCSV.rows.length} rows
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div
            className="upload-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        <style>{`
          .column-selector {
            width: 100%;
            background: var(--color-bg-secondary);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-xl);
            padding: var(--space-xl);
          }

          .column-selector h3 {
            font-family: var(--font-display);
            font-size: 1.25rem;
            color: var(--color-text-primary);
            margin-bottom: var(--space-xs);
          }

          .selector-subtitle {
            font-family: var(--font-mono);
            font-size: 0.875rem;
            color: var(--color-text-secondary);
            margin-bottom: var(--space-lg);
          }

          .selector-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: var(--space-lg);
            margin-bottom: var(--space-lg);
          }

          .selector-field label {
            display: block;
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--color-text-secondary);
            margin-bottom: var(--space-xs);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .selector-field select {
            width: 100%;
            padding: var(--space-sm) var(--space-md);
            background: var(--color-bg-elevated);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            color: var(--color-text-primary);
            font-family: var(--font-mono);
            font-size: 0.875rem;
            cursor: pointer;
          }

          .selector-field select:focus {
            outline: none;
            border-color: var(--color-accent);
          }

          .preview-table {
            background: var(--color-bg-elevated);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            overflow-x: auto;
            margin-bottom: var(--space-lg);
          }

          .preview-header {
            font-family: var(--font-mono);
            font-size: 0.75rem;
            color: var(--color-text-muted);
            padding: var(--space-sm) var(--space-md);
            background: var(--color-bg-primary);
            border-bottom: 1px solid var(--color-border);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .preview-table table {
            width: 100%;
            border-collapse: collapse;
            font-family: var(--font-mono);
            font-size: 0.75rem;
          }

          .preview-table th,
          .preview-table td {
            padding: var(--space-sm) var(--space-md);
            text-align: left;
            border-bottom: 1px solid var(--color-border);
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .preview-table th {
            background: var(--color-bg-primary);
            color: var(--color-text-secondary);
            font-weight: 500;
          }

          .preview-table td {
            color: var(--color-text-muted);
          }

          .preview-table .selected-website {
            background: rgba(34, 211, 238, 0.1);
            color: var(--color-accent);
          }

          .preview-table .selected-company {
            background: rgba(167, 139, 250, 0.1);
            color: #a78bfa;
          }

          .preview-table .selected-email {
            background: rgba(74, 222, 128, 0.1);
            color: #4ade80;
          }

          .field-hint {
            display: block;
            font-size: 0.7rem;
            color: var(--color-text-muted);
            margin-top: var(--space-xs);
            font-style: italic;
          }

          .selector-actions {
            display: flex;
            gap: var(--space-md);
            justify-content: flex-end;
          }

          .cancel-btn {
            padding: var(--space-sm) var(--space-lg);
            background: transparent;
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            color: var(--color-text-secondary);
            font-family: var(--font-mono);
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .cancel-btn:hover {
            border-color: var(--color-text-secondary);
            color: var(--color-text-primary);
          }

          .confirm-btn {
            padding: var(--space-sm) var(--space-lg);
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

          .confirm-btn:hover:not(:disabled) {
            background: #67e8f9;
            color: #0f172a;
          }

          .confirm-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          @media (max-width: 900px) {
            .selector-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="upload-container">
      <motion.div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="file-input"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="upload-label">
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path
                d="M24 32V16M24 16L18 22M24 16L30 22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="upload-text">
            <span className="upload-title">Drop your CSV file here</span>
            <span className="upload-subtitle">or click to browse</span>
          </div>
          <div className="upload-hint">
            You'll be able to select which column contains the website URLs
          </div>
        </label>
      </motion.div>

      {error && (
        <motion.div
          className="upload-error"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      <div className="sample-section">
        <span className="sample-label">Sample CSV format:</span>
        <code className="sample-code">
          website,company,name<br />
          acme.com,Acme Corp,John Doe<br />
          example.io,Example Inc,Jane Smith
        </code>
      </div>

      <style>{`
        .upload-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-lg);
          padding: var(--space-2xl) 0;
        }

        .upload-zone {
          width: 100%;
          max-width: 600px;
          border: 2px dashed var(--color-border);
          border-radius: var(--radius-xl);
          background: var(--color-bg-secondary);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .upload-zone:hover,
        .upload-zone.dragging {
          border-color: var(--color-accent);
          background: var(--color-accent-subtle);
          box-shadow: var(--shadow-glow);
        }

        .upload-zone.dragging {
          animation: pulse-glow 1.5s ease-in-out infinite;
        }

        .file-input {
          position: absolute;
          width: 0;
          height: 0;
          opacity: 0;
        }

        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: var(--space-2xl);
          cursor: pointer;
        }

        .upload-icon {
          color: var(--color-accent);
          margin-bottom: var(--space-md);
        }

        .upload-text {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-xs);
        }

        .upload-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .upload-subtitle {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .upload-hint {
          margin-top: var(--space-md);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          padding: var(--space-xs) var(--space-md);
          background: var(--color-bg-elevated);
          border-radius: var(--radius-sm);
        }

        .upload-error {
          color: var(--color-error);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          padding: var(--space-sm) var(--space-md);
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid var(--color-error);
          border-radius: var(--radius-md);
        }

        .sample-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-sm);
          opacity: 0.7;
        }

        .sample-label {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sample-code {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          background: var(--color-bg-elevated);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
}

export default FileUpload;
