import { LeadActivity, LeadActivityType } from '../types';

const ACTIVITY_LOG_KEY = 'leadActivityLogs';

type ActivityLogStore = Record<string, LeadActivity[]>;

const getLogs = (): ActivityLogStore => {
  try {
    const logs = window.localStorage.getItem(ACTIVITY_LOG_KEY);
    return logs ? JSON.parse(logs) : {};
  } catch (error) {
    console.error("Error reading activity logs from localStorage", error);
    return {};
  }
};

const saveLogs = (logs: ActivityLogStore) => {
  try {
    window.localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error("Error saving activity logs to localStorage", error);
  }
};

export const getActivitiesForLead = (leadId: string): LeadActivity[] => {
  const logs = getLogs();
  return logs[leadId] || [];
};

export const addActivity = (leadId: string, type: LeadActivityType, details: LeadActivity['details']): LeadActivity => {
  const logs = getLogs();
  if (!logs[leadId]) {
    logs[leadId] = [];
  }
  
  const newActivity: LeadActivity = {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    details,
  };

  logs[leadId].unshift(newActivity); // Add to the beginning
  saveLogs(logs);
  // Dispatch a storage event so other components can update
  window.dispatchEvent(new Event('storage'));
  return newActivity;
};

export const deleteActivitiesForLead = (leadId: string) => {
    const logs = getLogs();
    if (logs[leadId]) {
        delete logs[leadId];
        saveLogs(logs);
         window.dispatchEvent(new Event('storage'));
    }
};

export const formatTimeAgo = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
};
