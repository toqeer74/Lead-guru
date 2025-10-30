
import React from 'react';
import { Lead, LeadStatus } from '../../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface Props {
  leads: Lead[];
}

const COLORS = ['#4299E1', '#F6E05E', '#48BB78', '#9F7AEA', '#A0AEC0'];

const AnalyticsCard: React.FC<{ title: string; value: string | number; children?: React.ReactNode }> = ({ title, value, children }) => (
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
        <h3 className="text-sm font-medium text-gray-400 uppercase">{title}</h3>
        <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
        {children}
    </div>
);

export const AnalyticsView: React.FC<Props> = ({ leads }) => {
  const totalLeads = leads.length;

  const leadStatusData = Object.values(LeadStatus).map(status => ({
    name: status,
    value: leads.filter(lead => lead.status === status).length
  })).filter(item => item.value > 0);

  const leadSourceData = leads.reduce((acc, lead) => {
    const source = lead.source || 'Unknown';
    const existing = acc.find(item => item.name === source);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ name: source, count: 1 });
    }
    return acc;
  }, [] as { name: string, count: number }[]);

  const sentCount = leads.filter(l => l.status !== LeadStatus.New).length;
  const repliedCount = leads.filter(l => l.status === LeadStatus.Replied).length;
  const responseRate = sentCount > 0 ? ((repliedCount / sentCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <AnalyticsCard title="Total Leads" value={totalLeads} />
      <AnalyticsCard title="Contacted Leads" value={sentCount} />
      <AnalyticsCard title="Replies Received" value={repliedCount} />
      <AnalyticsCard title="Response Rate" value={`${responseRate}%`} />

      <div className="md:col-span-2 lg:col-span-2 bg-gray-900 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Lead Status Distribution</h3>
        {totalLeads > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={leadStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {leadStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#2d3748', // gray-800
                borderColor: '#4a5568' // gray-700
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        ) : (
             <div className="flex items-center justify-center h-full text-gray-500">No lead data available.</div>
        )}
      </div>

      <div className="md:col-span-2 lg:col-span-2 bg-gray-900 p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Leads by Source</h3>
        {totalLeads > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={leadSourceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
            <XAxis type="number" stroke="#a0aec0" />
            <YAxis dataKey="name" type="category" stroke="#a0aec0" width={100} />
            <Tooltip
                contentStyle={{
                    backgroundColor: '#2d3748', // gray-800
                    borderColor: '#4a5568' // gray-700
                }}
            />
            <Bar dataKey="count" fill="#4299E1" />
          </BarChart>
        </ResponsiveContainer>
        ) : (
             <div className="flex items-center justify-center h-full text-gray-500">No lead data available.</div>
        )}
      </div>
    </div>
  );
};
