import React, { useState, useMemo } from 'react';
import { Template } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { generateSubjectLines, generateEmailBody } from '../../services/geminiService';
import { Spinner } from '../ui/Spinner';

const TemplateForm: React.FC<{
  template: Partial<Template> | null;
  onSave: (template: Template) => void;
  onClose: () => void;
}> = ({ template, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<Template>>(template || { name: '', subject: '', body: '' });
  const [isSuggestingSubjects, setIsSuggestingSubjects] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [isGeneratingBody, setIsGeneratingBody] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: formData.id || crypto.randomUUID(),
      ...formData,
    } as Template);
  };

  const handleSuggestSubjects = async () => {
    if (!formData.body) {
      alert("Please write some content in the body before suggesting subjects.");
      return;
    }
    setIsSuggestingSubjects(true);
    setSuggestions([]);
    const generatedSubjects = await generateSubjectLines(formData.body);
    setSuggestions(generatedSubjects);
    setIsSuggestingSubjects(false);
  };

  const handleSuggestionClick = (subject: string) => {
    setFormData(prev => ({ ...prev, subject }));
    setSuggestions([]);
  };

  const handleGenerateBody = async () => {
    if (!generationPrompt) {
        alert("Please enter a prompt to generate the email body.");
        return;
    }
    setIsGeneratingBody(true);
    const generatedBody = await generateEmailBody(generationPrompt);
    if (generatedBody) {
        setFormData(prev => ({ ...prev, body: generatedBody }));
    }
    setIsGeneratingBody(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Template Name</label>
        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2" />
      </div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="subject" className="block text-sm font-medium text-gray-300">Subject</label>
          <Button type="button" variant="secondary" onClick={handleSuggestSubjects} disabled={isSuggestingSubjects || !formData.body} className="text-xs !py-1 !px-2">
            {isSuggestingSubjects ? <Spinner size="sm" /> : 'Suggest with AI'}
          </Button>
        </div>
        <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} required className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2" />
        {suggestions.length > 0 && (
          <div className="mt-2 bg-gray-900 border border-gray-600 rounded-md p-2">
            <ul className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <li 
                  key={index} 
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-sm text-blue-300 hover:text-blue-200 p-1 rounded cursor-pointer hover:bg-gray-700"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

       <div>
        <label htmlFor="generationPrompt" className="block text-sm font-medium text-gray-300">
            Generate Body from Prompt
        </label>
        <p className="text-xs text-gray-400 mb-1">Describe the email's purpose (e.g., "follow-up after demo," "cold outreach for SEO services").</p>
        <div className="flex items-center gap-2 mt-1">
            <input
                type="text"
                id="generationPrompt"
                name="generationPrompt"
                value={generationPrompt}
                onChange={(e) => setGenerationPrompt(e.target.value)}
                placeholder="e.g., Cold outreach about our new AI analytics tool"
                className="block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"
            />
            <Button type="button" variant="secondary" onClick={handleGenerateBody} disabled={isGeneratingBody || !generationPrompt} className="flex-shrink-0">
                {isGeneratingBody ? <Spinner size="sm" /> : 'Generate'}
            </Button>
        </div>
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-medium text-gray-300">Body</label>
        <p className="text-xs text-gray-400 mb-1">Use tokens like {`{firstName}`}, {`{lastName}`}, {`{companyName}`}.</p>
        <textarea id="body" name="body" value={formData.body} onChange={handleChange} required rows={10} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2"></textarea>
      </div>
      <div className="flex justify-end pt-4 space-x-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">Save Template</Button>
      </div>
    </form>
  );
};


export const TemplatesView: React.FC<{
  templates: Template[];
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
}> = ({ templates, setTemplates }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = useMemo(() => {
    if (!searchTerm) {
      return templates;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return templates.filter(template =>
      template.name.toLowerCase().includes(lowercasedFilter) ||
      template.subject.toLowerCase().includes(lowercasedFilter)
    );
  }, [templates, searchTerm]);

  const handleSaveTemplate = (template: Template) => {
    setTemplates(prev => {
      const index = prev.findIndex(t => t.id === template.id);
      if (index > -1) {
        const newTemplates = [...prev];
        newTemplates[index] = template;
        return newTemplates;
      }
      return [...prev, template];
    });
    setIsModalOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <input
            type="text"
            placeholder="Search templates by name or subject..."
            className="bg-gray-700 p-2 rounded w-full sm:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button onClick={() => { setEditingTemplate(null); setIsModalOpen(true); }}>+ New Template</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <div key={template.id} className="bg-gray-900 rounded-lg shadow-lg p-6 flex flex-col">
            <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
            <p className="text-sm text-gray-400 mb-4"><strong>Subject:</strong> {template.subject}</p>
            <p className="text-sm text-gray-300 flex-grow mb-4 line-clamp-4">{template.body}</p>
            <div className="flex justify-end space-x-2 mt-auto">
              <Button variant="secondary" onClick={() => { setEditingTemplate(template); setIsModalOpen(true); }}>Edit</Button>
              <Button variant="danger" onClick={() => handleDeleteTemplate(template.id)}>Delete</Button>
            </div>
          </div>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-900 rounded-lg">
              <p className="text-gray-400">
                {searchTerm
                  ? 'No templates match your search.'
                  : 'No templates yet. Create one to get started!'}
              </p>
          </div>
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTemplate(null); }}
        title={editingTemplate ? "Edit Template" : "Create New Template"}
      >
        <TemplateForm
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => { setIsModalOpen(false); setEditingTemplate(null); }}
        />
      </Modal>
    </div>
  );
};