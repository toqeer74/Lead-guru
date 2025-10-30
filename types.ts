export enum LeadStatus {
  New = 'New',
  Contacted = 'Contacted',
  Replied = 'Replied',
  Nurturing = 'Nurturing',
  Closed = 'Closed',
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  role: string;
  status: LeadStatus;
  tags: string[];
  source: string;
  createdAt: string;
  notes?: string;
  followUpCount?: number;
  companyInfo?: {
    description: string;
    location: string;
    website: string;
  }
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets: {
        uri: string;
        text: string;
      }[];
    }[];
  };
}

export enum LeadActivityType {
  Created = 'Created',
  EmailSent = 'Email Sent',
  EmailOpened = 'Email Opened',
  LinkClicked = 'Link Clicked',
  NoteAdded = 'Note Added',
}

export interface LeadActivity {
  id: string;
  type: LeadActivityType;
  timestamp: string;
  details: {
    subject?: string;
    body?: string; 
    url?: string; 
    note?: string;
    emailId?: string;
  };
}