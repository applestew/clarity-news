
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Save, LogOut, ArrowLeft, Check, User, Mail, Globe, ListFilter } from 'lucide-react';

interface ProfileSettingsProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onLogout: () => void;
  onBack: () => void;
}

const AVAILABLE_TOPICS = [
  "Technology", "Politics", "Business", "Science", 
  "Health", "Entertainment", "Sports", "Environment"
];

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", 
  "Australia", "Global"
];

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ profile, onUpdate, onLogout, onBack }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const toggleTopic = (topic: string) => {
    const currentTopics = formData.topics;
    if (currentTopics.includes(topic)) {
      handleChange('topics', currentTopics.filter(t => t !== topic));
    } else {
      handleChange('topics', [...currentTopics, topic]);
    }
  };

  const handleSave = () => {
    onUpdate(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-500 hover:text-brand-600 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-900">Profile & Settings</h2>
        </div>
        <button 
          onClick={onLogout}
          className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Personal Details */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <User size={16} /> Personal Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
              <div className="relative">
                 <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                 <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                 />
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Globe size={16} /> Region & Content
          </h3>
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
              <select 
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          </div>
          
          <div 
              onClick={() => handleChange('prioritizeLocal', !formData.prioritizeLocal)}
              className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center gap-4 ${formData.prioritizeLocal ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${formData.prioritizeLocal ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 bg-white'}`}>
                  {formData.prioritizeLocal && <Check size={12} />}
              </div>
              <div>
                  <h4 className="font-bold text-slate-800 text-sm">Prioritize Local News</h4>
                  <p className="text-xs text-slate-500">Show more stories from {formData.country}.</p>
              </div>
          </div>
        </section>

        {/* Topics */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ListFilter size={16} /> Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TOPICS.map(topic => (
              <button
                key={topic}
                onClick={() => toggleTopic(topic)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  formData.topics.includes(topic) 
                  ? 'bg-slate-800 border-slate-800 text-white' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </section>

        {/* Footer Actions */}
        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
           <button 
             onClick={handleSave}
             className={`px-6 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 transition-all ${saved ? 'bg-emerald-500' : 'bg-brand-600 hover:bg-brand-700'}`}
           >
             {saved ? <Check size={18} /> : <Save size={18} />}
             {saved ? 'Saved' : 'Save Changes'}
           </button>
        </div>

      </div>
    </div>
  );
};

export default ProfileSettings;
