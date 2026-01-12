import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { APIUsage, APIUsageEvent } from '../../agent/types';
import { CLAUDE_PRICING } from '../../agent/types';

interface APIUsageContextType {
  usage: APIUsage;
  history: APIUsageEvent[];
  addUsage: (event: Omit<APIUsageEvent, 'timestamp'>) => void;
  resetUsage: () => void;
}

const initialUsage: APIUsage = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  estimatedCost: 0,
  requestCount: 0,
  lastUpdated: new Date(),
};

const APIUsageContext = createContext<APIUsageContextType | null>(null);

function calculateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = CLAUDE_PRICING[model as keyof typeof CLAUDE_PRICING] || CLAUDE_PRICING.default;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

export function APIUsageProvider({ children }: { children: ReactNode }) {
  const [usage, setUsage] = useState<APIUsage>(initialUsage);
  const [history, setHistory] = useState<APIUsageEvent[]>([]);

  const addUsage = useCallback((event: Omit<APIUsageEvent, 'timestamp'>) => {
    const fullEvent: APIUsageEvent = {
      ...event,
      timestamp: new Date(),
    };

    const cost = calculateCost(event.inputTokens, event.outputTokens, event.model);

    setHistory(prev => [...prev, fullEvent]);
    setUsage(prev => ({
      inputTokens: prev.inputTokens + event.inputTokens,
      outputTokens: prev.outputTokens + event.outputTokens,
      totalTokens: prev.totalTokens + event.inputTokens + event.outputTokens,
      estimatedCost: prev.estimatedCost + cost,
      requestCount: prev.requestCount + 1,
      lastUpdated: new Date(),
    }));
  }, []);

  const resetUsage = useCallback(() => {
    setUsage(initialUsage);
    setHistory([]);
  }, []);

  return (
    <APIUsageContext.Provider value={{ usage, history, addUsage, resetUsage }}>
      {children}
    </APIUsageContext.Provider>
  );
}

export function useAPIUsage() {
  const context = useContext(APIUsageContext);
  if (!context) {
    throw new Error('useAPIUsage must be used within an APIUsageProvider');
  }
  return context;
}

// Utility to format cost
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(3)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

// Utility to format token count
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}
