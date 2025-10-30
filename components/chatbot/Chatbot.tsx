
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../../types';
import { GoogleGenAI, Chat } from "@google/genai";
import { Spinner } from '../ui/Spinner';

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: "Hello! I'm your AI assistant. How can I help you with your lead generation today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    const initializeChat = useCallback(() => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            chatRef.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: 'You are a helpful AI assistant for a lead generation application. Your role is to provide advice on sales, marketing, lead generation strategies, and how to use the app effectively. Be concise and encouraging.',
                },
            });
        } catch (error) {
            console.error("Failed to initialize chat:", error);
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
        }
    }, []);

    useEffect(() => {
        if (isOpen && !chatRef.current) {
            initializeChat();
        }
    }, [isOpen, initializeChat]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (!chatRef.current) {
              throw new Error("Chat not initialized");
            }
            const response = await chatRef.current.sendMessage({ message: input });
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMessage: ChatMessage = { role: 'model', text: "Oops! Something went wrong. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-500 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                aria-label="Toggle Chatbot"
            >
                <ChatIcon />
            </button>
            {isOpen && (
                <div className="fixed bottom-20 right-6 w-80 h-96 bg-gray-800 rounded-lg shadow-2xl flex flex-col text-sm animate-fade-in-up">
                    <header className="bg-gray-900 p-3 rounded-t-lg">
                        <h3 className="font-semibold text-white">AI Assistant</h3>
                    </header>
                    <div className="flex-1 p-3 overflow-y-auto">
                        {messages.map((msg, index) => (
                            <div key={index} className={`my-2 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-2 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start my-2">
                                <div className="p-2 rounded-lg bg-gray-700 text-gray-200 flex items-center">
                                    <Spinner size="sm" />
                                    <span className="ml-2">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything..."
                            className="w-full bg-gray-700 text-gray-200 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isLoading}
                        />
                    </form>
                </div>
            )}
        </>
    );
};

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);
