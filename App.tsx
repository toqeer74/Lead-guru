
import React, { useState } from 'react';
import { LeadManagementView } from './components/views/LeadManagementView';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DiscoveryView } from './components/views/DiscoveryView';
import { Chatbot } from './components/chatbot/Chatbot';
import { AnalyticsView } from './components/views/AnalyticsView';
import { TemplatesView } from './components/views/TemplatesView';
import { Lead, Template } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';

export type View = 'leads' | 'discovery' | 'templates' | 'analytics';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('leads');
  const [leads, setLeads] = useLocalStorage<Lead[]>('leads', []);
  const [templates, setTemplates] = useLocalStorage<Template[]>('templates', []);

  const renderView = () => {
    switch (activeView) {
      case 'leads':
        return <LeadManagementView leads={leads} setLeads={setLeads} templates={templates} />;
      case 'discovery':
        return <DiscoveryView setLeads={setLeads} />;
      case 'templates':
        return <TemplatesView templates={templates} setTemplates={setTemplates} />;
      case 'analytics':
        return <AnalyticsView leads={leads} />;
      default:
        return <LeadManagementView leads={leads} setLeads={setLeads} templates={templates} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header view={activeView} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-800 p-4 sm:p-6 lg:p-8">
          {renderView()}
        </main>
      </div>
      <Chatbot />
    </div>
  );
};

export default App;
