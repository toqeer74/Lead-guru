import React, { useState, useEffect } from 'react';
import { Lead, Template } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { personalizeEmailBody } from '../../services/leadprotonService';
import { Spinner } from '../ui/Spinner';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  templates: Template[];
  onSend: (lead: Lead, subject: string, body: string, modifiedBody: string, scheduledAt?: string) => void;
}

const replaceTokens = (text: string, lead: Lead): string => {
    if (!text || !lead) return '';
    return text
        .replace(/{firstName}/g, lead.firstName)
        .replace(/{lastName}/g, lead.lastName)
        .replace(/{companyName}/g, lead.companyName)
        .replace(/{role}/g, lead.role);
};

const injectTracking = (body: string, leadId: string, emailId: string): string => {
    let trackedBody = body;

    // Wrap links for click tracking
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/g;
    trackedBody = trackedBody.replace(linkRegex, (match, url) => {
        if (url.startsWith('data-') || url.startsWith('#')) return match;
        const trackingAttrs = `data-trackable-link="true" data-lead-id="${leadId}" data-email-id="${emailId}" data-original-url="${encodeURIComponent(url)}"`;
        return `<a href="${url}" ${trackingAttrs}`;
    });

    // Add open tracking pixel
    const pixel = `<img src="pixel.gif" width="1" height="1" alt="" style="display:none;" data-trackable-pixel="true" data-lead-id="${leadId}" data-email-id="${emailId}" />`;
    trackedBody += pixel;

    return trackedBody;
};

export const FollowUpModal: React.FC<FollowUpModalProps> = ({ isOpen, onClose, lead, templates, onSend }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const [isPersonalizing, setIsPersonalizing] = useState(false);

    useEffect(() => {
        if (lead && selectedTemplateId) {
            const template = templates.find(t => t.id === selectedTemplateId);
            if (template) {
                setSubject(replaceTokens(template.subject, lead));
                setBody(replaceTokens(template.body, lead));
            }
        } else if (lead) {
            setSubject('');
            setBody('');
        }
    }, [lead, selectedTemplateId, templates]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedTemplateId('');
            setSubject('');
            setBody('');
            setScheduleDateTime('');
            setIsPersonalizing(false);
        }
    }, [isOpen]);
    
    const handlePersonalize = async () => {
        if (!lead || !body) {
            alert("Please select a template or write some text in the body to personalize.");
            return;
        }
        setIsPersonalizing(true);
        const personalizedBody = await personalizeEmailBody(lead, body);
        setBody(personalizedBody);
        setIsPersonalizing(false);
    };

    const handleSubmit = () => {
        if (!lead || !subject || !body) return;
        const emailId = crypto.randomUUID();
        const modifiedBody = injectTracking(body, lead.id, emailId);
        onSend(lead, subject, body, modifiedBody, scheduleDateTime);
    };

    if (!lead) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Send Follow-up to ${lead.firstName} ${lead.lastName}`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!subject || !body}>
                        {scheduleDateTime ? 'Schedule Email' : 'Send Now'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label htmlFor="template" className="block text-sm font-medium text-gray-300 mb-1">Select Template</label>
                    <select
                        id="template"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"
                    >
                        <option value="">-- No Template --</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                    <input
                        type="text"
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"
                        required
                    />
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label htmlFor="body" className="block text-sm font-medium text-gray-300">Body</label>
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={handlePersonalize} 
                            disabled={isPersonalizing || !body}
                            className="text-xs !py-1 !px-2 flex items-center gap-1"
                        >
                            {isPersonalizing ? <Spinner size="sm" /> : '✨ Personalize'}
                        </Button>
                    </div>
                    <textarea
                        id="body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={12}
                        className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 font-mono text-sm"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="schedule" className="block text-sm font-medium text-gray-300 mb-1">Schedule for Later (Optional)</label>
                    <input
                        type="datetime-local"
                        id="schedule"
                        value={scheduleDateTime}
                        onChange={(e) => setScheduleDateTime(e.target.value)}
                        className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 [color-scheme:dark]"
                    />
                </div>
            </div>
        </Modal>
    );
};
