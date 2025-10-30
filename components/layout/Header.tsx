
import React from 'react';
import { View } from '../../App';

interface HeaderProps {
    view: View;
}

const viewTitles: Record<View, string> = {
    leads: 'Lead Management',
    discovery: 'Lead Discovery',
    templates: 'Email Templates',
    analytics: 'Analytics Dashboard',
};

export const Header: React.FC<HeaderProps> = ({ view }) => {
    return (
        <header className="bg-gray-900 shadow-md p-4">
            <h1 className="text-2xl font-bold text-white capitalize">{viewTitles[view]}</h1>
        </header>
    );
};
