/**
 * localStorage utilities for persisting knowledge bases and campaigns
 */

import type { KnowledgeBase, Campaign } from '../agent/types';

const KNOWLEDGE_BASE_KEY = 'innov8ai_knowledge_bases';
const CAMPAIGNS_KEY = 'innov8ai_campaigns';

// Generate a simple unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Knowledge Base Storage
 */

export function getKnowledgeBases(): KnowledgeBase[] {
  try {
    const stored = localStorage.getItem(KNOWLEDGE_BASE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as KnowledgeBase[];
  } catch (error) {
    console.error('Error loading knowledge bases:', error);
    return [];
  }
}

export function saveKnowledgeBase(kb: Omit<KnowledgeBase, 'id' | 'createdAt' | 'updatedAt'>): KnowledgeBase {
  const knowledgeBases = getKnowledgeBases();
  const now = new Date().toISOString();

  const newKb: KnowledgeBase = {
    ...kb,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  knowledgeBases.push(newKb);
  localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(knowledgeBases));

  return newKb;
}

export function updateKnowledgeBase(id: string, updates: Partial<Omit<KnowledgeBase, 'id' | 'createdAt'>>): KnowledgeBase | null {
  const knowledgeBases = getKnowledgeBases();
  const index = knowledgeBases.findIndex(kb => kb.id === id);

  if (index === -1) return null;

  knowledgeBases[index] = {
    ...knowledgeBases[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(knowledgeBases));
  return knowledgeBases[index];
}

export function deleteKnowledgeBase(id: string): boolean {
  const knowledgeBases = getKnowledgeBases();
  const filtered = knowledgeBases.filter(kb => kb.id !== id);

  if (filtered.length === knowledgeBases.length) return false;

  localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(filtered));
  return true;
}

export function getKnowledgeBaseById(id: string): KnowledgeBase | null {
  const knowledgeBases = getKnowledgeBases();
  return knowledgeBases.find(kb => kb.id === id) || null;
}

/**
 * Campaign Storage
 */

export function getCampaigns(): Campaign[] {
  try {
    const stored = localStorage.getItem(CAMPAIGNS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Campaign[];
  } catch (error) {
    console.error('Error loading campaigns:', error);
    return [];
  }
}

export function saveCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Campaign {
  const campaigns = getCampaigns();
  const now = new Date().toISOString();

  const newCampaign: Campaign = {
    ...campaign,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };

  campaigns.push(newCampaign);
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));

  return newCampaign;
}

export function updateCampaign(id: string, updates: Partial<Omit<Campaign, 'id' | 'createdAt'>>): Campaign | null {
  const campaigns = getCampaigns();
  const index = campaigns.findIndex(c => c.id === id);

  if (index === -1) return null;

  campaigns[index] = {
    ...campaigns[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
  return campaigns[index];
}

export function deleteCampaign(id: string): boolean {
  const campaigns = getCampaigns();
  const filtered = campaigns.filter(c => c.id !== id);

  if (filtered.length === campaigns.length) return false;

  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(filtered));
  return true;
}

export function getCampaignById(id: string): Campaign | null {
  const campaigns = getCampaigns();
  return campaigns.find(c => c.id === id) || null;
}
