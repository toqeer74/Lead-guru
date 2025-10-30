import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { Lead, LeadStatus, GroundingChunk } from '../../types';
import { generateEmailPatterns, fetchCompanyInfo } from '../../services/geminiService';

interface Props {
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

export const DiscoveryView: React.FC<Props> = ({ setLeads }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [domain, setDomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ emails: string[]; companyInfo: string; sources: GroundingChunk[] } | null>(null);

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !domain) return;
    
    setIsLoading(true);
    setResults(null);

    const [emails, companyData] = await Promise.all([
      generateEmailPatterns(firstName, lastName, domain),
      fetchCompanyInfo(domain)
    ]);
    
    setResults({ emails, companyInfo: companyData.info, sources: companyData.sources });
    setIsLoading(false);
  };

  const handleAddLead = (email: string) => {
    const newLead: Lead = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      email,
      companyName: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
      role: '',
      status: LeadStatus.New,
      tags: [],
      source: 'Discovery Tool',
      createdAt: new Date().toISOString(),
      notes: results?.companyInfo,
      followUpCount: 0,
      companyInfo: {
        description: results?.companyInfo || '',
        location: '',
        website: domain ? `https://${domain.trim()}` : '',
      }
    };
    setLeads(prev => [...prev, newLead]);
    alert(`Lead for ${email} added!`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-white">Lead Discovery Engine</h2>
        <form onSubmit={handleDiscover} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            className="bg-gray-700 p-3 rounded-md w-full focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
            className="bg-gray-700 p-3 rounded-md w-full focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="company.com"
            className="bg-gray-700 p-3 rounded-md w-full focus:ring-2 focus:ring-blue-500"
            required
          />
          <div className="md:col-span-3">
             <Button type="submit" disabled={isLoading} className="w-full mt-2 justify-center">
              {isLoading ? <Spinner size="sm"/> : 'Discover Leads'}
            </Button>
          </div>
        </form>

        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <Spinner />
            <p className="ml-4">Discovering intel with Gemini...</p>
          </div>
        )}
        
        {results && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Company Information</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{results.companyInfo}</p>
              {results.sources.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-400 mb-2 text-sm">Sources:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {results.sources.map((source, index) => (
                      <li key={index} className="text-xs">
                        {source.web && <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{source.web.title}</a>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Generated Email Patterns</h3>
              <ul className="space-y-2">
                {results.emails.map(email => (
                  <li key={email} className="flex justify-between items-center bg-gray-800 p-3 rounded-md">
                    <span className="font-mono text-blue-300">{email}</span>
                    <Button variant="secondary" onClick={() => handleAddLead(email)}>Add as Lead</Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};