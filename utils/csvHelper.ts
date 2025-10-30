import { Lead, LeadStatus } from '../types';

export const exportLeadsToCSV = (leads: Lead[]) => {
  if (leads.length === 0) return;

  const headers = ['id', 'firstName', 'lastName', 'email', 'companyName', 'role', 'status', 'tags', 'source', 'createdAt', 'notes', 'followUpCount'];
  const csvRows = [headers.join(',')];

  leads.forEach(lead => {
    const values = headers.map(header => {
      let value = (lead as any)[header];
       if (header === 'followUpCount') {
        value = value || 0;
      }
      if (Array.isArray(value)) {
        value = value.join(';');
      }
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(values.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'leads.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const importLeadsFromCSV = (file: File, callback: (newLeads: Lead[]) => void) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target?.result as string;
    if (!text) return;

    const rows = text.split('\n').filter(row => row.trim() !== '');
    if (rows.length < 2) return;

    const headerRow = rows[0].trim().split(',').map(h => h.replace(/"/g, '').trim());
    const importedLeads: Lead[] = [];

    for (let i = 1; i < rows.length; i++) {
      try {
        const values = rows[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const leadData: any = {};
        headerRow.forEach((header, index) => {
            const rawValue = (values[index] || '').trim();
            const value = rawValue.startsWith('"') && rawValue.endsWith('"') ? rawValue.slice(1, -1).replace(/""/g, '"') : rawValue;
            leadData[header] = value;
        });

        const newLead: Lead = {
          id: leadData.id || crypto.randomUUID(),
          firstName: leadData.firstName || '',
          lastName: leadData.lastName || '',
          email: leadData.email || '',
          companyName: leadData.companyName || '',
          role: leadData.role || '',
          status: Object.values(LeadStatus).includes(leadData.status) ? leadData.status : LeadStatus.New,
          tags: leadData.tags ? leadData.tags.split(';') : [],
          source: leadData.source || 'CSV Import',
          createdAt: leadData.createdAt || new Date().toISOString(),
          notes: leadData.notes || '',
          followUpCount: parseInt(leadData.followUpCount, 10) || 0,
        };
        importedLeads.push(newLead);
      } catch (e) {
        console.error(`Error parsing row ${i}:`, e);
      }
    }
    callback(importedLeads);
  };
  reader.readAsText(file);
};