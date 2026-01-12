import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { KnowledgeBase as KnowledgeBaseType } from '../../agent/types';
import {
  getKnowledgeBases,
  saveKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
} from '../../utils/localStorage';

interface KnowledgeBaseProps {
  onSelect: (kb: KnowledgeBaseType) => void;
  onSkip?: () => void;
}

function KnowledgeBase({ onSelect, onSkip }: KnowledgeBaseProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseType[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load knowledge bases on mount
  useEffect(() => {
    const kbs = getKnowledgeBases();
    setKnowledgeBases(kbs);
    if (kbs.length > 0) {
      setSelectedId(kbs[0].id);
    }
  }, []);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setName('');
    setContent(DEFAULT_TEMPLATE);
    setError(null);
  };

  const handleEdit = (kb: KnowledgeBaseType) => {
    setEditingId(kb.id);
    setIsCreating(false);
    setName(kb.name);
    setContent(kb.content);
    setError(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter a name for your framework');
      return;
    }
    if (!content.trim()) {
      setError('Please add some content to your framework');
      return;
    }

    if (isCreating) {
      const newKb = saveKnowledgeBase({ name: name.trim(), content: content.trim() });
      setKnowledgeBases([...knowledgeBases, newKb]);
      setSelectedId(newKb.id);
      setIsCreating(false);
    } else if (editingId) {
      const updated = updateKnowledgeBase(editingId, { name: name.trim(), content: content.trim() });
      if (updated) {
        setKnowledgeBases(knowledgeBases.map(kb => kb.id === editingId ? updated : kb));
      }
      setEditingId(null);
    }
    setName('');
    setContent('');
    setError(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this framework?')) {
      deleteKnowledgeBase(id);
      const updated = knowledgeBases.filter(kb => kb.id !== id);
      setKnowledgeBases(updated);
      if (selectedId === id) {
        setSelectedId(updated.length > 0 ? updated[0].id : null);
      }
      if (editingId === id) {
        setEditingId(null);
        setName('');
        setContent('');
      }
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setName('');
    setContent('');
    setError(null);
  };

  const handleContinue = () => {
    const selected = knowledgeBases.find(kb => kb.id === selectedId);
    if (selected) {
      onSelect(selected);
    }
  };

  const selectedKb = knowledgeBases.find(kb => kb.id === selectedId);
  const isEditing = isCreating || editingId !== null;

  return (
    <div className="knowledge-base-container">
      <motion.div
        className="knowledge-base"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="kb-header">
          <h2>Knowledge Base</h2>
          <p className="kb-subtitle">
            Create or select a framework with your value proposition, pain points, and messaging.
            This will be used to generate your email campaigns.
          </p>
        </div>

        <div className="kb-layout">
          {/* Sidebar - List of frameworks */}
          <div className="kb-sidebar">
            <div className="kb-sidebar-header">
              <span>Saved Frameworks</span>
              <button className="kb-add-btn" onClick={handleCreate} disabled={isEditing}>
                + New
              </button>
            </div>
            <div className="kb-list">
              {knowledgeBases.length === 0 && !isCreating ? (
                <div className="kb-empty">
                  No frameworks yet. Click "+ New" to create one.
                </div>
              ) : (
                <AnimatePresence>
                  {knowledgeBases.map(kb => (
                    <motion.div
                      key={kb.id}
                      className={`kb-item ${selectedId === kb.id ? 'selected' : ''} ${editingId === kb.id ? 'editing' : ''}`}
                      onClick={() => !isEditing && setSelectedId(kb.id)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                    >
                      <div className="kb-item-content">
                        <span className="kb-item-name">{kb.name}</span>
                        <span className="kb-item-date">
                          {new Date(kb.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="kb-item-actions">
                        <button
                          className="kb-item-btn"
                          onClick={(e) => { e.stopPropagation(); handleEdit(kb); }}
                          disabled={isEditing && editingId !== kb.id}
                        >
                          Edit
                        </button>
                        <button
                          className="kb-item-btn delete"
                          onClick={(e) => { e.stopPropagation(); handleDelete(kb.id); }}
                          disabled={isEditing}
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="kb-main">
            {isEditing ? (
              /* Edit/Create mode */
              <div className="kb-editor">
                <div className="kb-editor-header">
                  <h3>{isCreating ? 'Create New Framework' : 'Edit Framework'}</h3>
                </div>
                <div className="kb-form">
                  <div className="kb-field">
                    <label>Framework Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., SaaS Outreach, Agency Pitch"
                    />
                  </div>
                  <div className="kb-field">
                    <label>Content (Markdown)</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter your framework content..."
                      rows={20}
                    />
                  </div>
                  {error && <div className="kb-error">{error}</div>}
                  <div className="kb-editor-actions">
                    <button className="kb-cancel-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button className="kb-save-btn" onClick={handleSave}>
                      Save Framework
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedKb ? (
              /* Preview mode */
              <div className="kb-preview">
                <div className="kb-preview-header">
                  <h3>{selectedKb.name}</h3>
                  <button className="kb-edit-btn" onClick={() => handleEdit(selectedKb)}>
                    Edit
                  </button>
                </div>
                <div className="kb-preview-content">
                  <pre>{selectedKb.content}</pre>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="kb-empty-main">
                <div className="kb-empty-icon">📚</div>
                <h3>No Framework Selected</h3>
                <p>Create a new framework or select one from the sidebar.</p>
                <button className="kb-create-btn" onClick={handleCreate}>
                  Create Framework
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="kb-footer">
          {onSkip && (
            <button className="kb-skip-btn" onClick={onSkip}>
              Skip (Use Default)
            </button>
          )}
          <button
            className="kb-continue-btn"
            onClick={handleContinue}
            disabled={!selectedKb || isEditing}
          >
            Continue with "{selectedKb?.name || 'Framework'}"
          </button>
        </div>
      </motion.div>

      <style>{`
        .knowledge-base-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--space-lg);
        }

        .knowledge-base {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .kb-header {
          padding: var(--space-xl);
          border-bottom: 1px solid var(--color-border);
        }

        .kb-header h2 {
          font-family: var(--font-display);
          font-size: 1.5rem;
          color: var(--color-text-primary);
          margin-bottom: var(--space-xs);
        }

        .kb-subtitle {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .kb-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          min-height: 500px;
        }

        /* Sidebar */
        .kb-sidebar {
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
        }

        .kb-sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-md);
          border-bottom: 1px solid var(--color-border);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .kb-add-btn {
          padding: var(--space-xs) var(--space-sm);
          background: var(--color-accent);
          border: none;
          border-radius: var(--radius-sm);
          color: #0f172a;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .kb-add-btn:hover:not(:disabled) {
          background: #67e8f9;
        }

        .kb-add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .kb-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-sm);
        }

        .kb-empty {
          padding: var(--space-lg);
          text-align: center;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }

        .kb-item {
          padding: var(--space-md);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: var(--space-xs);
        }

        .kb-item:hover {
          background: var(--color-bg-elevated);
        }

        .kb-item.selected {
          background: var(--color-accent-subtle);
          border: 1px solid var(--color-accent);
        }

        .kb-item.editing {
          background: rgba(167, 139, 250, 0.1);
          border: 1px solid #a78bfa;
        }

        .kb-item-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .kb-item-name {
          font-family: var(--font-display);
          font-size: 0.875rem;
          color: var(--color-text-primary);
        }

        .kb-item-date {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-muted);
        }

        .kb-item-actions {
          display: flex;
          gap: var(--space-xs);
          margin-top: var(--space-sm);
        }

        .kb-item-btn {
          padding: var(--space-xs) var(--space-sm);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .kb-item-btn:hover:not(:disabled) {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .kb-item-btn.delete:hover:not(:disabled) {
          border-color: var(--color-error);
          color: var(--color-error);
        }

        .kb-item-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Main content */
        .kb-main {
          padding: var(--space-xl);
          background: var(--color-bg-elevated);
        }

        .kb-editor-header,
        .kb-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-lg);
        }

        .kb-editor-header h3,
        .kb-preview-header h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          color: var(--color-text-primary);
        }

        .kb-edit-btn {
          padding: var(--space-sm) var(--space-md);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .kb-edit-btn:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }

        .kb-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .kb-field label {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--space-xs);
        }

        .kb-field input,
        .kb-field textarea {
          width: 100%;
          padding: var(--space-md);
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          resize: vertical;
        }

        .kb-field input:focus,
        .kb-field textarea:focus {
          outline: none;
          border-color: var(--color-accent);
        }

        .kb-field textarea {
          min-height: 300px;
          line-height: 1.6;
        }

        .kb-error {
          padding: var(--space-sm) var(--space-md);
          background: rgba(248, 113, 113, 0.1);
          border: 1px solid var(--color-error);
          border-radius: var(--radius-md);
          color: var(--color-error);
          font-family: var(--font-mono);
          font-size: 0.875rem;
        }

        .kb-editor-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-md);
        }

        .kb-cancel-btn {
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

        .kb-cancel-btn:hover {
          border-color: var(--color-text-secondary);
          color: var(--color-text-primary);
        }

        .kb-save-btn {
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

        .kb-save-btn:hover {
          background: #67e8f9;
        }

        .kb-preview-content {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--space-lg);
          max-height: 400px;
          overflow-y: auto;
        }

        .kb-preview-content pre {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.6;
          margin: 0;
        }

        .kb-empty-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
        }

        .kb-empty-icon {
          font-size: 3rem;
          margin-bottom: var(--space-md);
        }

        .kb-empty-main h3 {
          font-family: var(--font-display);
          font-size: 1.25rem;
          color: var(--color-text-primary);
          margin-bottom: var(--space-xs);
        }

        .kb-empty-main p {
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin-bottom: var(--space-lg);
        }

        .kb-create-btn {
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

        .kb-create-btn:hover {
          background: #67e8f9;
        }

        /* Footer */
        .kb-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-md);
          padding: var(--space-lg) var(--space-xl);
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-secondary);
        }

        .kb-skip-btn {
          padding: var(--space-md) var(--space-xl);
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          color: var(--color-text-secondary);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .kb-skip-btn:hover {
          border-color: var(--color-text-secondary);
          color: var(--color-text-primary);
        }

        .kb-continue-btn {
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

        .kb-continue-btn:hover:not(:disabled) {
          background: #67e8f9;
        }

        .kb-continue-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .kb-layout {
            grid-template-columns: 1fr;
          }

          .kb-sidebar {
            border-right: none;
            border-bottom: 1px solid var(--color-border);
            max-height: 200px;
          }
        }
      `}</style>
    </div>
  );
}

// Default template for new frameworks
const DEFAULT_TEMPLATE = `# Value Proposition
What unique value do you offer? What problem do you solve?

Example: We help B2B SaaS companies increase their demo bookings by 40% using AI-powered personalisation.

# Target Audience
Who are you reaching out to? What are their roles and responsibilities?

Example: Marketing Directors and Growth Leads at Series A-C SaaS companies with 50-500 employees.

# Pain Points
What problems does your target audience face?

- Pain point 1: Low response rates on cold outreach
- Pain point 2: Spending too much time on manual personalisation
- Pain point 3: Generic emails that don't resonate

# Solution
How does your product/service solve these pain points?

Our AI analyses prospect websites and generates personalised hooks that feel genuine, not automated.

# Social Proof
Case studies, testimonials, or results you can reference.

Example: "We helped [Company X] increase their reply rate from 2% to 12% in 30 days."

# Call to Action
What action do you want the recipient to take?

Example: Book a 15-minute demo call to see how it works.
`;

export default KnowledgeBase;
