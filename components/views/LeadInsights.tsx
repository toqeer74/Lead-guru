import React, { useState, useEffect } from 'react';
import { Lead } from '../../types';
import { getStrategicAnalysis } from '../../services/geminiService';
import { Spinner } from '../ui/Spinner';

interface LeadInsightsProps {
    lead: Lead;
    onClose: () => void;
}

export const LeadInsights: React.FC<LeadInsightsProps> = ({ lead, onClose }) => {
    const [insights, setInsights] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInsights = async () => {
            setIsLoading(true);
            setError(null);
            setInsights(null); 
            try {
                const result = await getStrategicAnalysis(`${lead.firstName} ${lead.lastName}`, lead.companyName, lead.role);
                setInsights(result);
            } catch (err) {
                setError('Failed to fetch strategic analysis. Please try again.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsights();
    }, [lead]);

    return (
        <div className="mt-6 bg-gray-900 rounded-lg shadow-lg p-6 animate-fade-in relative">
             <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl font-bold leading-none"
                aria-label="Close insights"
            >
                &times;
            </button>
            <h3 className="text-xl font-bold mb-4 text-white">
                Strategic Outreach Plan: <span className="text-blue-400">{lead.firstName} at {lead.companyName}</span>
            </h3>

            {isLoading && (
                <div className="flex flex-col justify-center items-center h-48">
                    <Spinner />
                    <p className="ml-4 mt-4 text-gray-400">Generating strategic plan with Gemini...</p>
                </div>
            )}
            
            {error && <p className="text-red-400 text-center py-10">{error}</p>}

            {insights && !isLoading && (
                 <div className="text-gray-300 whitespace-pre-wrap font-sans text-sm space-y-2 leading-relaxed">
                   {insights}
                </div>
            )}
        </div>
    );
};
