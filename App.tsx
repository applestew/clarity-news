
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import NewsCard from './components/NewsCard';
import DetoxDashboard from './components/DetoxDashboard';
import ArticleDetail from './components/ArticleDetail';
import Onboarding from './components/Onboarding';
import ProfileSettings from './components/ProfileSettings';
import { fetchCuratedNews, analyzeDetoxProgress } from './services/geminiService';
import { NewsArticle, ViewState, DetoxStats, UserProfile, FilterScope } from './types';
import { RefreshCw, Loader2, Filter, Search, Globe, MapPin, Zap, ArrowLeft, Clock } from 'lucide-react';

// Mock data for stats
const INITIAL_STATS: DetoxStats = {
  dailyTimeSpent: 45,
  storiesRead: 12,
  anxietyScore: 2,
  topicsAvoided: ['Celebrity Gossip', 'Violent Crime', 'Partisan Outrage'],
  moodTrend: [
    { day: 'M', mood: 6 },
    { day: 'T', mood: 7 },
    { day: 'W', mood: 6 },
    { day: 'T', mood: 8 },
    { day: 'F', mood: 9 },
  ]
};

// Hardcoded lists for dropdowns
const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir"
];

const MAJOR_COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Japan", "China", "Russia", "Ukraine", "Israel", "Palestine"
];

const CACHE_KEY = 'clarity_feed_cache';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.FEED);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [weaningMode, setWeaningMode] = useState<boolean>(true);
  const [coachMessage, setCoachMessage] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  // Filter & Search State
  const [filterScope, setFilterScope] = useState<FilterScope>('top10');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("");

  // Define loadNews early so it can be used in the effect
  const loadNews = useCallback(async (
      profile: UserProfile, 
      scope: FilterScope, 
      query: string = '', 
      region: string = ''
    ) => {
    
    setLoading(true);
    // Note: We do NOT clear articles here to allow background refreshing without UI flash
    
    const fetchedArticles = await fetchCuratedNews(profile, scope, query, region);
    
    if (fetchedArticles.length > 0) {
        setArticles(fetchedArticles);
        const timestamp = Date.now();
        setLastUpdated(timestamp);
        
        // Cache the result
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            articles: fetchedArticles,
            timestamp: timestamp,
            scope,
            region,
            query
        }));
    }
    
    const tip = await analyzeDetoxProgress(Math.floor(Math.random() * 15), profile.name);
    setCoachMessage(tip);
    
    setLoading(false);
  }, []);

  // INITIALIZATION: Check for User Profile AND Cached News
  useEffect(() => {
    const savedProfile = localStorage.getItem('clarity_user_profile');
    const savedCache = localStorage.getItem(CACHE_KEY);

    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        setUserProfile(profile);

        // Check Cache logic
        if (savedCache) {
            try {
                const { articles: cachedArticles, timestamp, scope, region, query } = JSON.parse(savedCache);
                
                // 1. Restore state immediately for "Instant Load"
                if (cachedArticles && cachedArticles.length > 0) {
                    setArticles(cachedArticles);
                    setLastUpdated(timestamp);
                    setFilterScope(scope || 'top10');
                    setRegionFilter(region || '');
                    setSearchQuery(query || '');
                }

                // 2. Check if stale (> 30 mins)
                const isStale = Date.now() - timestamp > CACHE_DURATION;
                
                if (isStale || !cachedArticles || cachedArticles.length === 0) {
                    // Refresh in background if we have data, or foreground if we don't
                    console.log("Cache stale or empty, refreshing...");
                    loadNews(profile, scope || 'top10', query || '', region || '');
                }
            } catch (e) {
                console.error("Cache parse error", e);
                loadNews(profile, 'top10');
            }
        } else {
            // No cache, fresh load
            loadNews(profile, 'top10');
        }

      } catch (e) {
        console.error("Error parsing profile", e);
        localStorage.removeItem('clarity_user_profile');
        setCurrentView(ViewState.ONBOARDING);
      }
    } else {
      setCurrentView(ViewState.ONBOARDING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PERSISTENCE: Save profile whenever it changes
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('clarity_user_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  const handleLogout = () => {
      localStorage.removeItem('clarity_user_profile');
      localStorage.removeItem(CACHE_KEY); // Clear feed cache on logout
      setUserProfile(null);
      setArticles([]);
      setCurrentView(ViewState.ONBOARDING);
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
      setUserProfile(updatedProfile);
      // If country changed, maybe refresh feed? 
      // For now, just save. Next refresh will pick it up.
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile); 
    setCurrentView(ViewState.FEED);
    loadNews(profile, 'top10');
  };

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (!userProfile || !searchQuery.trim()) return;
      setFilterScope('search');
      setArticles([]); // Clear for search to show loading explicitely
      loadNews(userProfile, 'search', searchQuery);
  };

  const handleFilterChange = (scope: FilterScope) => {
      if(!userProfile) return;
      
      setFilterScope(scope);
      
      if (scope === 'state' && !regionFilter) return;
      
      setArticles([]); // Clear when switching major contexts to avoid confusion
      loadNews(userProfile, scope, '', regionFilter);
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setRegionFilter(val);
      if(val && userProfile) {
          // setArticles([]); // Optional: clear or keep old while loading
          loadNews(userProfile, filterScope, '', val);
      }
  };

  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article);
    setCurrentView(ViewState.ARTICLE);
  };

  const handleRefresh = () => {
      if (userProfile) {
          loadNews(userProfile, filterScope, searchQuery, regionFilter);
      }
  }

  const renderContent = () => {
    if (currentView === ViewState.ONBOARDING) {
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }
    
    if (currentView === ViewState.PROFILE) {
        return userProfile ? (
            <ProfileSettings 
                profile={userProfile} 
                onUpdate={handleProfileUpdate} 
                onLogout={handleLogout} 
                onBack={() => setCurrentView(ViewState.FEED)}
            />
        ) : null;
    }

    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <DetoxDashboard 
            stats={INITIAL_STATS} 
            weaningMode={weaningMode}
            onToggleWeaning={() => setWeaningMode(!weaningMode)}
          />
        );
      
      case ViewState.ARTICLE:
        if (!selectedArticle) return null;
        return (
          <ArticleDetail 
            article={selectedArticle} 
            onBack={() => setCurrentView(ViewState.FEED)}
          />
        );

      case ViewState.FEED:
      default:
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Search Bar Section */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <form onSubmit={handleSearch} className="relative flex items-center">
                    <Search className="absolute left-4 text-slate-400" size={20} />
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for specific news, topics, or events..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    />
                    <button 
                        type="submit"
                        className="absolute right-2 px-4 py-1.5 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 transition-colors"
                    >
                        Search
                    </button>
                </form>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Top 10 Button */}
                    <button 
                        onClick={() => handleFilterChange('top10')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${filterScope === 'top10' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        <Zap size={16} /> Top 10
                    </button>
                    
                    {/* Domestic Mode */}
                    {(filterScope === 'top10' || filterScope === 'domestic' || filterScope === 'state') && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    setFilterScope('domestic');
                                    if(userProfile) {
                                        setArticles([]); 
                                        loadNews(userProfile, 'domestic');
                                    }
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${filterScope === 'domestic' || filterScope === 'state' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <MapPin size={16} /> Domestic ({userProfile?.country})
                            </button>
                            
                            {/* State Dropdown - Only shows if Domestic is active */}
                            {(filterScope === 'domestic' || filterScope === 'state') && userProfile?.country === 'India' && (
                                <select 
                                    value={regionFilter}
                                    onChange={(e) => {
                                        setFilterScope('state');
                                        handleDropdownChange(e);
                                    }}
                                    className="px-4 py-2 rounded-full text-sm border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                                >
                                    <option value="">Select State</option>
                                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            )}
                        </div>
                    )}

                    {/* World Mode */}
                    {(filterScope === 'top10' || filterScope === 'world') && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleFilterChange('world')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${filterScope === 'world' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Globe size={16} /> World
                            </button>
                            
                            {/* Country Dropdown - Only shows if World is active */}
                            {filterScope === 'world' && (
                                <select 
                                    value={regionFilter}
                                    onChange={handleDropdownChange}
                                    className="px-4 py-2 rounded-full text-sm border border-slate-200 bg-white focus:outline-none focus:border-brand-500"
                                >
                                    <option value="">Select Region</option>
                                    {MAJOR_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            )}
                        </div>
                    )}
                    
                    {/* Reset / Back Button if deep in filters */}
                    {(filterScope === 'domestic' || filterScope === 'state' || filterScope === 'world' || filterScope === 'search') && (
                        <button 
                            onClick={() => handleFilterChange('top10')}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-brand-600 transition-colors ml-auto"
                        >
                            <ArrowLeft size={14} /> Back to Feed
                        </button>
                    )}
                </div>
            </div>
            
            {/* Last Updated / Refresh Bar */}
            {!loading && articles.length > 0 && (
                <div className="flex items-center justify-end gap-2 text-xs text-slate-400 px-2">
                    <Clock size={12} />
                    <span>
                        Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </span>
                    <button onClick={handleRefresh} className="text-brand-600 font-medium hover:underline ml-2 flex items-center gap-1">
                        <RefreshCw size={12} /> Refresh
                    </button>
                </div>
            )}

            {/* Loading State - Only show big loader if NO articles */}
            {loading && articles.length === 0 && (
                 <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-400 animate-pulse py-12">
                    <Loader2 className="animate-spin mb-4 text-brand-500" size={48} />
                    <p className="text-lg font-medium text-slate-700">Curating your feed...</p>
                    <p className="text-sm">
                        {filterScope === 'search' ? `Searching for "${searchQuery}"` : 
                         filterScope === 'state' ? `Fetching news from ${regionFilter}` :
                         filterScope === 'top10' ? `Finding Top 10 stories` :
                         `Finding top ${filterScope} stories`}
                    </p>
                </div>
            )}
            
            {/* Background Refreshing Indicator */}
            {loading && articles.length > 0 && (
                <div className="flex items-center justify-center gap-2 p-2 bg-brand-50 text-brand-700 rounded-lg text-sm animate-pulse">
                    <RefreshCw className="animate-spin" size={14} />
                    Refreshing feed with latest stories...
                </div>
            )}

            {/* Articles Grid */}
            {articles.length > 0 && (
                <div className={`grid grid-cols-1 gap-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {articles.map(article => (
                        <NewsCard 
                        key={article.id} 
                        article={article} 
                        onClick={handleArticleClick} 
                        />
                    ))}
                </div>
            )}
            
            {!loading && articles.length === 0 && (
               <div className="text-center py-20 text-slate-500 bg-white rounded-xl border border-slate-100">
                  <p className="text-lg font-medium mb-2">No stories found.</p>
                  <p className="text-sm mb-4">Try adjusting your search or filters.</p>
                  <button 
                    onClick={() => userProfile && loadNews(userProfile, 'top10')} 
                    className="text-brand-600 font-bold hover:underline"
                  >
                      Reset to Top 10
                  </button>
               </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen pb-12 bg-calm-50">
      {currentView !== ViewState.ONBOARDING && (
          <Header 
            view={currentView} 
            setView={setCurrentView} 
            userProfile={userProfile}
            onLogout={handleLogout}
          />
      )}
      
      <main className={`max-w-6xl mx-auto px-4 ${currentView !== ViewState.ONBOARDING ? 'pt-8' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
