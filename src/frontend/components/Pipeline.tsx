import { motion } from 'framer-motion';
import type { AppStage } from '../../App';

interface PipelineProps {
  currentStage: AppStage;
}

const stages = [
  { id: 'upload', label: 'Upload', icon: '📂' },
  { id: 'knowledge_base', label: 'Framework', icon: '📚' },
  { id: 'campaign_builder', label: 'Campaign', icon: '✉️' },
  { id: 'configure', label: 'Configure', icon: '⚙️' },
  { id: 'finding_emails', label: 'Find Emails', icon: '🔍' },
  { id: 'review', label: 'Review', icon: '👀' },
  { id: 'enriching', label: 'Icebreakers', icon: '💬' },
  { id: 'complete', label: 'Export', icon: '✅' },
];

// Map stages to their index for progress calculation
const stageOrder: Record<AppStage, number> = {
  loading: -2, // Not shown in pipeline
  setup: -1, // Not shown in pipeline
  upload: 0,
  knowledge_base: 1,
  campaign_builder: 2,
  configure: 3,
  finding_emails: 4,
  review: 5,
  enriching: 6,
  complete: 7,
};

function Pipeline({ currentStage }: PipelineProps) {
  const currentIndex = stageOrder[currentStage];

  return (
    <div className="pipeline">
      <div className="pipeline-track">
        {stages.map((stage, index) => {
          const isActive = index === currentIndex;
          const isComplete = index < currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={stage.id} className="pipeline-step">
              <motion.div
                className={`step-node ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''} ${isPending ? 'pending' : ''}`}
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  boxShadow: isActive ? '0 0 20px var(--color-accent-glow)' : 'none',
                }}
                transition={{ duration: 0.3 }}
              >
                <span className="step-icon">{stage.icon}</span>
              </motion.div>
              <span className={`step-label ${isActive ? 'active' : ''}`}>
                {stage.label}
              </span>
              {index < stages.length - 1 && (
                <div className="step-connector">
                  <motion.div
                    className="connector-fill"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isComplete ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .pipeline {
          padding: var(--space-lg) 0;
          margin-bottom: var(--space-lg);
        }

        .pipeline-track {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 0;
        }

        .pipeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
          max-width: 140px;
        }

        .step-node {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--color-bg-elevated);
          border: 2px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          z-index: 2;
        }

        .step-node.active {
          border-color: var(--color-accent);
          background: var(--color-accent-subtle);
        }

        .step-node.complete {
          border-color: var(--color-success);
          background: rgba(45, 212, 191, 0.1);
        }

        .step-node.pending {
          opacity: 0.5;
        }

        .step-icon {
          font-size: 1.1rem;
        }

        .step-label {
          margin-top: var(--space-sm);
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          transition: color 0.3s ease;
          text-align: center;
        }

        .step-label.active {
          color: var(--color-accent);
        }

        .step-connector {
          position: absolute;
          top: 22px;
          left: calc(50% + 26px);
          right: calc(-50% + 26px);
          height: 2px;
          background: var(--color-border);
          z-index: 1;
        }

        .connector-fill {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, var(--color-success), var(--color-accent));
          transform-origin: left;
        }

        @media (max-width: 700px) {
          .pipeline-track {
            gap: var(--space-xs);
          }

          .step-node {
            width: 36px;
            height: 36px;
          }

          .step-icon {
            font-size: 0.9rem;
          }

          .step-label {
            font-size: 0.55rem;
          }

          .step-connector {
            top: 18px;
            left: calc(50% + 20px);
            right: calc(-50% + 20px);
          }
        }
      `}</style>
    </div>
  );
}

export default Pipeline;
