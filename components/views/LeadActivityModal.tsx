import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lead, LeadActivity, LeadActivityType } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getActivitiesForLead, addActivity, formatTimeAgo } from '../../utils/activityHelper';

interface LeadActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
}

const SentEmail: React.FC<{ activity: LeadActivity, leadId: string }> = ({ activity, leadId }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isOpened, setIsOpened] = useState(false);

    const emailId = activity.details.emailId;

    const checkIsOpened = useCallback(() => {
        const allActivities = getActivitiesForLead(leadId);
        const hasOpened = allActivities.some(a => a.type === LeadActivityType.EmailOpened && a.details.emailId === emailId);
        setIsOpened(hasOpened);
    }, [leadId, emailId]);

    useEffect(() => {
        checkIsOpened();
        const handleStorage = () => checkIsOpened();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [checkIsOpened]);
    

    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const handleLinkClick = (e: MouseEvent) => {
            const target = e.target as HTMLAnchorElement;
            if (target && target.matches('[data-trackable-link="true"]')) {
                e.preventDefault();
                const originalUrl = decodeURIComponent(target.dataset.originalUrl || '');
                addActivity(leadId, LeadActivityType.LinkClicked, {
                    url: originalUrl,
                    emailId: target.dataset.emailId,
                });
                window.open(originalUrl, '_blank');
            }
        };

        container.addEventListener('click', handleLinkClick);
        return () => container.removeEventListener('click', handleLinkClick);
    }, [leadId]);

    const handleSimulateOpen = () => {
        if (!emailId || isOpened) return;
        addActivity(leadId, LeadActivityType.EmailOpened, { emailId });
    };

    return (
        <div className="bg-gray-700 p-3 rounded-md mt-2">
            <div className="flex justify-between items-center mb-2">
                <p className="font-semibold text-sm">Subject: {activity.details.subject}</p>
                 <Button
                    variant={isOpened ? 'secondary' : 'primary'}
                    onClick={handleSimulateOpen}
                    disabled={isOpened}
                    className="!text-xs !py-1 !px-2"
                >
                    {isOpened ? 'Opened' : 'Simulate Open'}
                </Button>
            </div>
            <div 
                ref={contentRef}
                className="prose prose-sm prose-invert max-w-none text-gray-300 bg-gray-800 p-3 rounded border border-gray-600"
                dangerouslySetInnerHTML={{ __html: activity.details.body || '' }}
            />
        </div>
    );
};

const ActivityIcon: React.FC<{ type: LeadActivityType }> = ({ type }) => {
    const icons: Record<LeadActivityType, React.ReactElement> = {
        [LeadActivityType.Created]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>,
        [LeadActivityType.EmailSent]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>,
        [LeadActivityType.EmailOpened]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>,
        [LeadActivityType.LinkClicked]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0m-4.242 0a2 2 0 010 2.828l-3 3a2 2 0 01-2.828-2.828l3-3a2 2 0 012.828 0zM8.464 9.172a1 1 0 00-1.414-1.414l-1.414 1.414a1 1 0 001.414 1.414l1.414-1.414zM13.536 12.828a1 1 0 00-1.414-1.414l-1.414 1.414a1 1 0 001.414 1.414l1.414-1.414z" clipRule="evenodd" /></svg>,
        [LeadActivityType.NoteAdded]: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm2 1a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" /></svg>,
    };
    return icons[type] || null;
};

export const LeadActivityModal: React.FC<LeadActivityModalProps> = ({ isOpen, onClose, lead }) => {
    const [activities, setActivities] = useState<LeadActivity[]>([]);

    const fetchActivities = useCallback(() => {
        setActivities(getActivitiesForLead(lead.id));
    }, [lead.id]);

    useEffect(() => {
        if (isOpen) {
            fetchActivities();
        }
        window.addEventListener('storage', fetchActivities);
        return () => window.removeEventListener('storage', fetchActivities);
    }, [isOpen, fetchActivities]);

    if (!lead) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Activity Log: ${lead.firstName} ${lead.lastName}`}
        >
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {activities.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No activity recorded for this lead yet.</p>
                ) : (
                    <div className="flow-root">
                        <ul role="list" className="-mb-8">
                            {activities.map((activity, index) => (
                                <li key={activity.id}>
                                    <div className="relative pb-8">
                                        {index !== activities.length - 1 && (
                                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-600" aria-hidden="true" />
                                        )}
                                        <div className="relative flex space-x-3 items-start">
                                            <div>
                                                <span className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center ring-8 ring-gray-800">
                                                    <ActivityIcon type={activity.type} />
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1 pt-1.5">
                                                <div className="flex justify-between items-center text-sm">
                                                    <p className="font-medium text-gray-200">{activity.type}</p>
                                                    <p className="whitespace-nowrap text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                                                </div>
                                                <div className="mt-1 text-sm text-gray-400">
                                                    {activity.type === LeadActivityType.LinkClicked && `Clicked: ${activity.details.url}`}
                                                    {activity.type === LeadActivityType.Created && activity.details.note}
                                                    {activity.type === LeadActivityType.EmailSent && (
                                                        <SentEmail activity={activity} leadId={lead.id} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Modal>
    );
};
