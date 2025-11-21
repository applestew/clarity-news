import React from 'react';
import { DetoxStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ShieldCheck, Clock, Brain, Activity } from 'lucide-react';

interface DetoxDashboardProps {
  stats: DetoxStats;
  weaningMode: boolean;
  onToggleWeaning: () => void;
}

const DetoxDashboard: React.FC<DetoxDashboardProps> = ({ stats, weaningMode, onToggleWeaning }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Quality Filter</p>
            <p className="text-2xl font-bold text-slate-800">98%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Time Saved</p>
            <p className="text-2xl font-bold text-slate-800">45m</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 rounded-full text-purple-600">
            <Brain size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Mental Load</p>
            <p className="text-2xl font-bold text-slate-800">Low</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 rounded-full text-orange-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Anxiety Level</p>
            <p className="text-2xl font-bold text-slate-800">2/10</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Mood vs. Consumption</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.moodTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, 10]} />
                        <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line type="monotone" dataKey="mood" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0ea5e9'}} activeDot={{r: 6}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Weaning Control */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Detox Protocol</h3>
                <p className="text-slate-500 text-sm mb-6">
                    Automatically limit exposure to high-stress topics and sensationalist headlines.
                </p>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">Weaning Mode</span>
                        <button 
                            onClick={onToggleWeaning}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${weaningMode ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${weaningMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Currently Filtering</h4>
                        <div className="flex flex-wrap gap-2">
                            {stats.topicsAvoided.map(topic => (
                                <span key={topic} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-600">
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center italic">
                    "Information is food for the mind. Choose nutritious sources."
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DetoxDashboard;