
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[]; // Changed from fullContext string to array for bullet points
  source: string;
  sourceUrl?: string;
  timestamp: string;
  imageUrl: string;
  relatedImages: string[]; // New field for gallery
  bias: 'Left' | 'Center' | 'Right';
  biasScore: number; // 0 to 100 (0=Left, 50=Center, 100=Right)
  importanceScore: number; // 1 to 10 (Impact vs Sensationalism)
  verified: boolean;
  timeline: TimelineEvent[];
  category: string;
  country: string;
  newsType: string;
}

export interface TimelineEvent {
  date: string;
  event: string;
}

export interface DetoxStats {
  dailyTimeSpent: number; // in minutes
  storiesRead: number;
  anxietyScore: number; // 1-10
  topicsAvoided: string[];
  moodTrend: { day: string; mood: number }[];
}

export interface UserProfile {
  name: string;
  email: string;
  country: string;
  topics: string[];
  prioritizeLocal: boolean;
  detoxLevel: 'low' | 'medium' | 'strict';
}

export enum ViewState {
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  FEED = 'FEED',
  ARTICLE = 'ARTICLE',
  DETOX = 'DETOX',
  PROFILE = 'PROFILE'
}

export type FilterScope = 'top10' | 'domestic' | 'world' | 'state' | 'search';

export interface UserSettings {
  weaningMode: boolean;
  contentFilterLevel: 'low' | 'medium' | 'strict';
  focusTopics: string[];
}
