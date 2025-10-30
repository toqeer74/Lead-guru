import React, { useState, useCallback, ChangeEvent, useMemo, useEffect, useRef } from 'react';
import { Lead, LeadStatus, Template, GroundingChunk, LeadActivity, LeadActivityType } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { exportLeadsToCSV, importLeadsFromCSV } from '../../utils/csvHelper';
import { findCompanyLocation } from '../../services/leadprotonService';
import { getActivitiesForLead, addActivity, deleteActivitiesForLead, formatTimeAgo } from '../../utils/activityHelper';
import { FollowUpModal } from './FollowUpModal';
import { LeadInsights } from './LeadInsights';
import { LeadActivityModal } from './LeadActivityModal';

const LeadForm: React.FC<{ lead: Partial<Lead> | null; onSave: (lead: Lead) => void; onClose: () => void }> = ({ lead, onSave, onClose }) => {
    const [formData, setFormData] = useState<Partial<Lead>>(lead || {
        firstName: '', lastName: '', email: '', companyName: '', role: '',
        status: LeadStatus.New, tags: [], source: 'Manual', followUpCount: 0,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalLead: Lead = {
            id: formData.id || crypto.randomUUID(),
            createdAt: formData.createdAt || new Date().toISOString(),
            ...formData,
        } as Lead;
        onSave(finalLead);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className="bg-gray-700 p-2 rounded w-full" required />
                <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="bg-gray-700 p-2 rounded w-full" required />
            </div>
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="bg-gray-700 p-2 rounded w-full" required />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Company Name" className="bg-gray-700 p-2 rounded w-full" />
                <input name="role" value={formData.role} onChange={handleChange} placeholder="Role" className="bg-gray-700 p-2 rounded w-full" />
            </div>
             <select name="status" value={formData.status} onChange={handleChange} className="bg-gray-700 p-2 rounded w-full">
                {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input name="tags" value={formData.tags?.join(', ')} onChange={handleTagsChange} placeholder="Tags (comma-separated)" className="bg-gray-700 p-2 rounded w-full" />
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" className="bg-gray-700 p-2 rounded w-full h-24" />
            
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit">Save Lead</Button>
            </div>
        </form>
    );
};

const statusColors: Record<LeadStatus, string> = {
    [LeadStatus.New]: 'bg-blue-500',
    [LeadStatus.Contacted]: 'bg-yellow-500',
    [LeadStatus.Replied]: 'bg-green-500',
    [LeadStatus.Nurturing]: 'bg-purple-500',
    [LeadStatus.Closed]: 'bg-gray-500',
};

const LastActivity: React.FC<{ leadId: string }> = ({ leadId }) => {
    const [lastActivity, setLastActivity] = useState<LeadActivity | null>(null);

    const updateLastActivity = useCallback(() => {
        const activities = getActivitiesForLead(leadId);
        setLastActivity(activities[0] || null);
    }, [leadId]);

    useEffect(() => {
        updateLastActivity();
        window.addEventListener('storage', updateLastActivity);
        return () => window.removeEventListener('storage', updateLastActivity);
    }, [updateLastActivity]);

    if (!lastActivity) return <span className="text-gray-500">None</span>;

    return (
        <div className="text-xs">
            <p className="font-semibold">{lastActivity.type}</p>
            <p className="text-gray-400">{formatTimeAgo(lastActivity.timestamp)}</p>
        </div>
    );
};

export const LeadManagementView: React.FC<{ leads: Lead[]; setLeads: React.Dispatch<React.SetStateAction<Lead[]>>; templates: Template[] }> = ({ leads, setLeads, templates }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [infoModal, setInfoModal] = useState<{ open: boolean; content: string; loading: boolean, title: string, sources?: GroundingChunk[] }>({ open: false, content: '', loading: false, title: '' });
    const [followUpState, setFollowUpState] = useState<{ open: boolean; lead: Lead | null }>({ open: false, lead: null });
    const [activityModalLead, setActivityModalLead] = useState<Lead | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Lead | 'lastActivity'; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [selectedLeadForInsights, setSelectedLeadForInsights] = useState<Lead | null>(null);
    const masterCheckboxRef = useRef<HTMLInputElement>(null);

    const filteredAndSortedLeads = useMemo(() => {
        let filteredLeads = leads.filter(lead => {
            if (!searchTerm) return true;
            const lowercasedFilter = searchTerm.toLowerCase();
            return (
                `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(lowercasedFilter) ||
                lead.email.toLowerCase().includes(lowercasedFilter) ||
                lead.companyName.toLowerCase().includes(lowercasedFilter)
            );
        });

        if (sortConfig !== null) {
            filteredLeads.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'lastActivity') {
                    aValue = getActivitiesForLead(a.id)[0]?.timestamp || 0;
                    bValue = getActivitiesForLead(b.id)[0]?.timestamp || 0;
                } else {
                    aValue = a[sortConfig.key as keyof Lead];
                    bValue = b[sortConfig.key as keyof Lead];
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filteredLeads;
    }, [leads, searchTerm, sortConfig]);
    
    useEffect(() => {
        setSelectedLeads(new Set());
    }, [searchTerm, sortConfig]);

    useEffect(() => {
        if (masterCheckboxRef.current) {
            const numSelected = selectedLeads.size;
            const numVisible = filteredAndSortedLeads.length;
            masterCheckboxRef.current.checked = numSelected === numVisible && numVisible > 0;
            masterCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numVisible;
        }
    }, [selectedLeads, filteredAndSortedLeads]);

    const requestSort = (key: keyof Lead | 'lastActivity') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleSaveLead = (lead: Lead) => {
        let isNew = true;
        setLeads(prev => {
            const index = prev.findIndex(l => l.id === lead.id);
            if (index > -1) {
                isNew = false;
                const newLeads = [...prev];
                newLeads[index] = lead;
                return newLeads;
            }
            return [...prev, lead];
        });

        if (isNew) {
            addActivity(lead.id, LeadActivityType.Created, { note: 'Lead created manually.'});
        }
        
        setIsModalOpen(false);
        setEditingLead(null);
    };
    
    const handleSendFollowUp = (lead: Lead, subject: string, body: string, modifiedBody: string, scheduledAt?: string) => {
        const isSendingNow = !scheduledAt;
        const emailId = crypto.randomUUID();
        
        addActivity(lead.id, LeadActivityType.EmailSent, { 
            subject, 
            body: modifiedBody,
            emailId,
            note: isSendingNow ? `Email sent` : `Email scheduled for ${new Date(scheduledAt!).toLocaleString()}`
        });

        const noteAction = isSendingNow
            ? `Email sent at ${new Date().toLocaleString()}`
            : `Email scheduled for ${new Date(scheduledAt!).toLocaleString()}`;
        const noteContent = `\n--- Follow-up ---\n${noteAction}\nSubject: ${subject}\n--- End Follow-up ---`;
        
        const updatedLead: Lead = {
            ...lead,
            status: lead.status === LeadStatus.New ? LeadStatus.Contacted : lead.status,
            notes: (lead.notes || '') + noteContent,
            followUpCount: isSendingNow ? (lead.followUpCount || 0) + 1 : (lead.followUpCount || 0),
        };
        
        const index = leads.findIndex(l => l.id === updatedLead.id);
        if (index > -1) {
            const newLeads = [...leads];
            newLeads[index] = updatedLead;
            setLeads(newLeads);
        }
        setFollowUpState({ open: false, lead: null });
    };

    const handleDeleteLeads = (ids: string[]) => {
        setLeads(prev => prev.filter(l => !ids.includes(l.id)));
        ids.forEach(id => deleteActivitiesForLead(id));
    };
    
    const handleStrategicAnalysis = (lead: Lead) => {
        setSelectedLeadForInsights(current => (current?.id === lead.id ? null : lead));
    };

    const handleFindLocation = useCallback(async (lead: Lead) => {
        setInfoModal({ open: true, loading: true, content: '', title: `Location for ${lead.companyName}` });
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            const result = await findCompanyLocation(lead.companyName, { latitude, longitude });
            setInfoModal({ open: true, loading: false, content: result.info, title: `Location for ${lead.companyName}`, sources: result.sources });
        }, (error) => {
            console.error("Geolocation error:", error);
            setInfoModal({ open: false, loading: false, content: "Geolocation is required for this feature.", title: "Error" });
            alert("Geolocation access was denied. Please enable it in your browser settings to use this feature.");
        });
    }, []);

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            importLeadsFromCSV(file, (newLeads) => {
                const uniqueNewLeads: Lead[] = [];
                setLeads(prev => {
                    const existingIds = new Set(prev.map(l => l.id));
                    newLeads.forEach(nl => {
                        if (!existingIds.has(nl.id)) {
                            uniqueNewLeads.push(nl);
                        }
                    });
                    return [...prev, ...uniqueNewLeads];
                });
                uniqueNewLeads.forEach(nl => {
                    addActivity(nl.id, LeadActivityType.Created, { note: `Lead imported from ${file.name}` });
                });
            });
        }
    };
    
    const handleSelectLead = (id: string) => {
        setSelectedLeads(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedLeads(new Set(filteredAndSortedLeads.map(l => l.id)));
        } else {
            setSelectedLeads(new Set());
        }
    };
    
    const handleBulkDelete = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedLeads.size} selected leads?`)) {
            handleDeleteLeads(Array.from(selectedLeads));
            setSelectedLeads(new Set());
        }
    };
    
    const handleBulkStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as LeadStatus;
        if (Object.values(LeadStatus).includes(newStatus)) {
            setLeads(prev => prev.map(lead => 
                selectedLeads.has(lead.id) ? { ...lead, status: newStatus } : lead
            ));
            setSelectedLeads(new Set());
        }
    };
    
    const handleBulkExport = () => {
        const leadsToExport = leads.filter(l => selectedLeads.has(l.id));
        exportLeadsToCSV(leadsToExport);
    };


    return (
        <div className="bg-gray-800 text-gray-100 p-0">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex-grow w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search by name, company, or email..."
                        className="bg-gray-700 p-2 rounded w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} />
                    <Button variant="secondary" onClick={handleImportClick}>Import</Button>
                    <Button variant="secondary" onClick={() => exportLeadsToCSV(leads)}>Export All</Button>
                    <Button onClick={() => { setEditingLead(null); setIsModalOpen(true); }}>+ Add Lead</Button>
                </div>
            </div>
            
             {selectedLeads.size > 0 && (
                <div className="bg-gray-700 p-3 rounded-md mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="font-semibold text-sm">{selectedLeads.size} lead(s) selected</span>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <label htmlFor="bulk-status" className="text-xs sm:text-sm">Change Status:</label>
                            <select 
                                id="bulk-status" 
                                onChange={handleBulkStatusChange}
                                className="bg-gray-800 text-white rounded p-1 text-xs sm:text-sm border border-gray-600 focus:ring-blue-500"
                                value=""
                            >
                                <option value="" disabled>Select...</option>
                                {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <Button variant="secondary" onClick={handleBulkExport} className="text-xs !py-1 !px-2">Export Selected</Button>
                        <Button variant="danger" onClick={handleBulkDelete} className="text-xs !py-1 !px-2">Delete</Button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto bg-gray-900 rounded-lg shadow">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-700 text-xs uppercase">
                        <tr>
                            <th scope="col" className="p-4">
                                <input 
                                    type="checkbox"
                                    ref={masterCheckboxRef}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 focus:ring-2"
                                />
                            </th>
                            {['Name', 'Company', 'Email', 'Status', 'Last Activity', 'Actions'].map(header => {
                                const keyMap: Record<string, keyof Lead | 'lastActivity'> = {
                                    'Name': 'firstName',
                                    'Company': 'companyName',
                                    'Email': 'email',
                                    'Status': 'status',
                                    'Last Activity': 'lastActivity',
                                };
                                const key = keyMap[header] || header.toLowerCase();
                                return (
                                <th key={header} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => key !== 'actions' && requestSort(key as keyof Lead | 'lastActivity')}>
                                    {header}
                                    {sortConfig?.key === key && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                                </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedLeads.map(lead => (
                            <tr key={lead.id} className={`border-b border-gray-700 ${selectedLeads.has(lead.id) ? 'bg-blue-900/50' : ''} ${selectedLeadForInsights?.id === lead.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
                                <td className="p-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedLeads.has(lead.id)}
                                        onChange={() => handleSelectLead(lead.id)}
                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 focus:ring-2"
                                    />
                                </td>
                                <td className="px-6 py-4 font-medium whitespace-nowrap">{lead.firstName} {lead.lastName}<br/><span className="text-gray-400 text-xs">{lead.role}</span></td>
                                <td className="px-6 py-4">
                                    {lead.companyName}
                                    {lead.companyInfo?.website && (
                                        <a 
                                            href={lead.companyInfo.website} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            title={`Visit ${lead.companyName}'s website`}
                                            className="ml-1.5 inline-flex items-center text-blue-400 hover:text-blue-300"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4">{lead.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${statusColors[lead.status]}`}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4"><LastActivity leadId={lead.id} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => setActivityModalLead(lead)} title="View Activity" className="text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg></button>
                                        <button onClick={() => setFollowUpState({ open: true, lead })} title="Send Follow-up" className="text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></button>
                                        <button onClick={() => { setEditingLead(lead); setIsModalOpen(true); }} title="Edit Lead" className="text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                        <button onClick={() => handleStrategicAnalysis(lead)} title="Strategic Analysis" className="text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></button>
                                        <button onClick={() => handleDeleteLeads([lead.id])} title="Delete Lead" className="text-gray-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {filteredAndSortedLeads.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-500">
                                    {leads.length > 0 ? 'No leads match your search.' : 'No leads found.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedLeadForInsights && (
                <LeadInsights 
                    lead={selectedLeadForInsights} 
                    onClose={() => setSelectedLeadForInsights(null)} 
                />
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLead ? 'Edit Lead' : 'Add New Lead'}>
                <LeadForm lead={editingLead} onSave={handleSaveLead} onClose={() => { setIsModalOpen(false); setEditingLead(null); }} />
            </Modal>
            
            <Modal isOpen={infoModal.open} onClose={() => setInfoModal({ open: false, content: '', loading: false, title: '' })} title={infoModal.title}>
                {infoModal.loading ? (
                    <div className="flex justify-center items-center h-48"><Spinner /></div>
                ) : (
                    <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap font-mono text-sm">
                        <p>{infoModal.content}</p>
                         {infoModal.sources && infoModal.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-600">
                                <h4 className="font-semibold text-gray-200 mb-2">Sources:</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    {infoModal.sources.map((source, index) => (
                                        <li key={index}>
                                            {source.web && <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{source.web.title}</a>}
                                            {source.maps && <a href={source.maps.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{source.maps.title}</a>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <FollowUpModal
                isOpen={followUpState.open}
                onClose={() => setFollowUpState({ open: false, lead: null })}
                lead={followUpState.lead}
                templates={templates}
                onSend={handleSendFollowUp}
            />

            {activityModalLead && (
                <LeadActivityModal
                    isOpen={!!activityModalLead}
                    onClose={() => setActivityModalLead(null)}
                    lead={activityModalLead}
                />
            )}
        </div>
    );
};
