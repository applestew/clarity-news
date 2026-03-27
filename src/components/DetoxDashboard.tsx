
import React from 'react';
import { DetoxStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ShieldCheck, Clock, Brain, Activity, Sun, Sparkles } from 'lucide-react';

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
            <p className="text-sm text-slate-500 font-medium">Headlines Shielded</p>
            <p className="text-2xl font-bold text-slate-800">{stats.shieldedCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Stories Read</p>
            <p className="text-2xl font-bold text-slate-800">{stats.storiesRead}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 rounded-full text-purple-600">
            <Brain size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Detected Positive</p>
            <p className="text-2xl font-bold text-slate-800">{stats.sentimentDistribution.positive}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-brand-50 rounded-full text-brand-600">
            <Sun size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Zen Index</p>
            <p className="text-2xl font-bold text-slate-800">{stats.zenScore}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6 font-display">Feed Sentiment Analysis</h3>
            <div className="h-64 w-full flex items-center justify-around">
                <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Positive', value: stats.sentimentDistribution.positive },
                                    { name: 'Neutral', value: stats.sentimentDistribution.neutral },
                                    { name: 'Negative', value: stats.sentimentDistribution.negative },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                <Cell fill="#10b981" />
                                <Cell fill="#94a3b8" />
                                <Cell fill="#f59e0b" />
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-600 font-bold">☀️ Positive</span>
                        <span className="text-slate-500">{Math.round((stats.sentimentDistribution.positive / stats.totalProcessed) * 100) || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400 font-bold">☁️ Neutral</span>
                        <span className="text-slate-500">{Math.round((stats.sentimentDistribution.neutral / stats.totalProcessed) * 100) || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-amber-500 font-bold">⚠️ Negative</span>
                        <span className="text-slate-500">{Math.round((stats.sentimentDistribution.negative / stats.totalProcessed) * 100) || 0}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                        Analysis based on the {stats.totalProcessed} articles currently in your curated feed.
                    </p>
                </div>
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
