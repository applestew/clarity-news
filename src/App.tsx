
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import NewsCard from './components/NewsCard';
import DetoxDashboard from './components/DetoxDashboard';
import ArticleDetail from './components/ArticleDetail';
import Onboarding from './components/Onboarding';
import ProfileSettings from './components/ProfileSettings';
import { analyzeDetoxProgress, processArticleDetox } from './services/geminiService';
import { fetchRealNews } from './services/newsService';
import { NewsArticle, ViewState, DetoxStats, UserProfile, FilterScope } from './types';
import { RefreshCw, Loader2, Search, Globe, MapPin, Zap, ArrowLeft, Clock, Leaf, Smile, Sparkles } from 'lucide-react';

// Mock data for stats
const INITIAL_STATS: DetoxStats = {
  dailyTimeSpent: 0,
  storiesRead: 0,
  zenScore: 100,
  topicsAvoided: ['Partisan Outrage', 'Clickbait', 'Sensationalism'],
  moodTrend: [
    { day: 'M', mood: 7 },
    { day: 'T', mood: 6 },
    { day: 'W', mood: 8 },
    { day: 'T', mood: 7 },
    { day: 'F', mood: 8 },
  ],
  sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
  shieldedCount: 0,
  totalProcessed: 0
};

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
  
  // ✅ ADDED: Detox Mode State
  const [detoxMode, setDetoxMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('clarity_detox_mode');
    return saved === 'true';
  });
  const [moodFilter, setMoodFilter] = useState<'Just Positives' | 'Balanced' | 'Full Feed (Calmed)'>('Balanced');
  
  // Filter & Search State
  const [filterScope, setFilterScope] = useState<FilterScope>('top10');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("");

  // Background refresh staging
  const [pendingArticles, setPendingArticles] = useState<NewsArticle[]>([]);
  
  // ✅ ADDED: Tracking history for stats
  const [readCount, setReadCount] = useState<number>(() => {
    const saved = localStorage.getItem('clarity_read_count');
    return saved ? parseInt(saved, 10) : 0;
  });

  // ✅ ADDED: Calculate Real-time Stats
  const realStats = React.useMemo(() => {
    const total = articles.length;
    if (total === 0) return INITIAL_STATS;

    const positive = articles.filter(a => a.sentiment === 'positive').length;
    const neutral = articles.filter(a => a.sentiment === 'neutral' || !a.sentiment).length;
    const negative = articles.filter(a => a.sentiment === 'negative').length;
    const shielded = articles.filter(a => a.rewrittenTitle && a.rewrittenTitle !== a.originalTitle).length;

    // Zen Score: Percentage of non-negative news, with extra weight for positive
    // (Positive * 1.5 + Neutral) / (Total * 1.5) * 100
    const zenBase = (positive * 1.5) + neutral;
    const zenMax = (total * 1.5);
    const zenScore = total > 0 ? Math.round((zenBase / zenMax) * 100) : 100;

    return {
      ...INITIAL_STATS,
      storiesRead: readCount,
      sentimentDistribution: { positive, neutral, negative },
      shieldedCount: shielded,
      totalProcessed: total,
      zenScore
    };
  }, [articles, readCount]);

  const loadNews = useCallback(async (
      profile: UserProfile, 
      scope: FilterScope, 
      query: string = '', 
      region: string = '',
      background: boolean = false
    ) => {
    
    if (!background) setLoading(true);
    
    // 1. Fetch REAL news data from NewsAPI
    const rawArticles = await fetchRealNews(profile, scope, query, region);
    
    // 2. ENRICH news data with Gemini
    const processedArticles = await Promise.all(
        rawArticles.map(article => processArticleDetox(article))
    );
    
    if (processedArticles.length > 0) {
        if (background) {
            setPendingArticles(processedArticles);
        } else {
            setArticles(processedArticles);
            setLastUpdated(Date.now());
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                articles: processedArticles,
                timestamp: Date.now(),
                scope,
                region,
                query
            }));
        }
    }
    
    if (!background) {
        const tip = await analyzeDetoxProgress(Math.floor(Math.random() * 15), profile.name);
        setCoachMessage(tip);
        setLoading(false);
    }
  }, []);

  // Wrapper for UI triggered loads (always replaces feed)
  const handleManualLoad = (profile: UserProfile, scope: FilterScope, query: string = '', region: string = '') => {
      setLoading(true);
      setArticles([]); // Clear current
      fetchRealNews(profile, scope, query, region).then(async fetched => {
          const enriched = await Promise.all(fetched.map(a => processArticleDetox(a)));
          setArticles(enriched);
          setLastUpdated(Date.now());
          setLoading(false);
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            articles: enriched,
            timestamp: Date.now(),
            scope,
            region,
            query
        }));
      });
  };

  // Wrapper for "Load More" (appends)
  const handleLoadMore = () => {
      if (!userProfile) return;
      setLoading(true);
      fetchRealNews(userProfile, filterScope, searchQuery, regionFilter).then(async fetched => {
           const enriched = await Promise.all(fetched.map(a => processArticleDetox(a)));
           setArticles(prev => [...prev, ...enriched]);
           setLoading(false);
      });
  };

  // INITIALIZATION
  useEffect(() => {
    const savedProfile = localStorage.getItem('clarity_user_profile');
    const savedCache = localStorage.getItem(CACHE_KEY);

    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        setUserProfile(profile);

        if (savedCache) {
            try {
                const { articles: cachedArticles, timestamp, scope, region, query } = JSON.parse(savedCache);
                
                if (cachedArticles && cachedArticles.length > 0) {
                    setArticles(cachedArticles);
                    setLastUpdated(timestamp);
                    setFilterScope(scope || 'top10');
                    setRegionFilter(region || '');
                    setSearchQuery(query || '');
                    
                    // Background refresh check
                    const isStale = Date.now() - timestamp > CACHE_DURATION;
                    if (isStale) {
                         // Trigger background refresh
                         fetchRealNews(profile, scope, query, region).then(async fresh => {
                             if (fresh.length > 0) {
                                 const enriched = await Promise.all(fresh.map(a => processArticleDetox(a)));
                                 setPendingArticles(enriched);
                             }
                         });
                    }
                } else {
                    handleManualLoad(profile, 'top10');
                }
            } catch (e) {
                handleManualLoad(profile, 'top10');
            }
        } else {
            handleManualLoad(profile, 'top10');
        }

      } catch (e) {
        localStorage.removeItem('clarity_user_profile');
        setCurrentView(ViewState.ONBOARDING);
      }
    } else {
      setCurrentView(ViewState.ONBOARDING);
    }
  }, []);

  useEffect(() => {
    if (userProfile) {
      localStorage.setItem('clarity_user_profile', JSON.stringify(userProfile));
    }
  }, [userProfile]);

  // ✅ ADDED: Persist Detox Mode
  useEffect(() => {
    localStorage.setItem('clarity_detox_mode', String(detoxMode));
  }, [detoxMode]);

  const handleLogout = () => {
      localStorage.removeItem('clarity_user_profile');
      localStorage.removeItem(CACHE_KEY);
      setUserProfile(null);
      setArticles([]);
      setCurrentView(ViewState.ONBOARDING);
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
      setUserProfile(updatedProfile);
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile); 
    setCurrentView(ViewState.FEED);
    handleManualLoad(profile, 'top10');
  };

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (!userProfile || !searchQuery.trim()) return;
      setFilterScope('search');
      handleManualLoad(userProfile, 'search', searchQuery);
  };

  const handleFilterChange = (scope: FilterScope) => {
      if(!userProfile) return;
      setFilterScope(scope);
      if (scope === 'state' && !regionFilter) return;
      handleManualLoad(userProfile, scope, '', '');
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setRegionFilter(val);
      if(val && userProfile) {
          handleManualLoad(userProfile, filterScope, '', val);
      }
  };

  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article);
    setCurrentView(ViewState.ARTICLE);
    // ✅ ADDED: Track read history
    setReadCount(prev => {
        const next = prev + 1;
        localStorage.setItem('clarity_read_count', String(next));
        return next;
    });
  };

  const applyPendingUpdates = () => {
      setArticles(pendingArticles);
      setPendingArticles([]);
      setLastUpdated(Date.now());
  };

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
            stats={realStats} 
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
                    <button 
                        onClick={() => handleFilterChange('top10')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${filterScope === 'top10' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        <Zap size={16} /> Top 10
                    </button>
                    
                    {/* Domestic Mode - Only show if user is NOT in India */}
                    {userProfile?.country?.trim().toLowerCase() !== 'india' && (filterScope === 'top10' || filterScope === 'domestic') && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => {
                                    setFilterScope('domestic');
                                    if(userProfile) handleManualLoad(userProfile, 'domestic');
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${filterScope === 'domestic' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <MapPin size={16} /> Domestic
                            </button>
                        </div>
                    )}

                    {(filterScope === 'top10' || filterScope === 'world') && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleFilterChange('world')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${filterScope === 'world' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Globe size={16} /> World
                            </button>
                        </div>
                    )}
                    
                    {(filterScope === 'domestic' || filterScope === 'state' || filterScope === 'world' || filterScope === 'search') && (
                        <button 
                            onClick={() => handleFilterChange('top10')}
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-brand-600 transition-colors ml-auto"
                        >
                            <ArrowLeft size={14} /> Back to Feed
                        </button>
                    )}
                </div>

                {/* ✅ ADDED: Mental Health Mode Toggle & Mood Filter */}
                <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-1.5 rounded-full border border-slate-200">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                         <Leaf size={16} />
                         <span className="text-xs font-bold uppercase tracking-tight">Mental Health Mode</span>
                         <button 
                            onClick={() => setDetoxMode(!detoxMode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${detoxMode ? 'bg-emerald-600' : 'bg-slate-300'}`}
                         >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${detoxMode ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                    </div>

                    {detoxMode && (
                        <div className="flex items-center gap-1">
                            {(['Just Positives', 'Balanced', 'Full Feed (Calmed)'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMoodFilter(m)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${moodFilter === m ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* ✅ ADDED: Good News Section */}
            {detoxMode && articles.some(a => a.sentiment === 'positive') && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                    <Sparkles className="absolute top-2 right-2 opacity-20" size={80} />
                    <div className="flex items-center gap-2 mb-4">
                        <Smile size={24} />
                        <h2 className="text-xl font-bold italic">✨ Good News Today</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {articles.filter(a => a.sentiment === 'positive').slice(0, 2).map(a => (
                            <div key={`good-${a.id}`} className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                                <h4 className="font-bold text-sm mb-1">{a.rewrittenTitle || a.title}</h4>
                                <p className="text-xs text-white/80 line-clamp-1">{a.source}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* ✅ ADDED: Daily Positive Digest */}
            {detoxMode && articles.filter(a => a.sentiment === 'positive').length > 0 && (
                <div className="flex items-center gap-2 px-2 py-1">
                    <Sparkles className="text-amber-500" size={16} />
                    <span className="text-sm font-bold text-slate-700">Daily Positive Digest:</span>
                    <div className="text-xs text-slate-500 flex-1 overflow-hidden whitespace-nowrap">
                        {articles.filter(a => a.sentiment === 'positive').map(a => `🌟 ${a.rewrittenTitle || a.title}`).join(' | ')}
                    </div>
                </div>
            )}
            
            {!loading && articles.length > 0 && (
                <div className="flex items-center justify-end gap-2 text-xs text-slate-400 px-2">
                    <Clock size={12} />
                    <span>
                        Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </span>
                    <button onClick={() => userProfile && handleManualLoad(userProfile, filterScope, searchQuery, regionFilter)} className="text-brand-600 font-medium hover:underline ml-2 flex items-center gap-1">
                        <RefreshCw size={12} /> Refresh
                    </button>
                </div>
            )}

            {/* Pending Updates Pill */}
            {pendingArticles.length > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
                    <button 
                        onClick={applyPendingUpdates}
                        className="bg-brand-600 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform animate-bounce"
                    >
                        <RefreshCw size={18} />
                        {pendingArticles.length} New Stories Available
                    </button>
                </div>
            )}

            {loading && articles.length === 0 && (
                 <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-400 animate-pulse py-12">
                    <Loader2 className="animate-spin mb-4 text-brand-500" size={48} />
                    <p className="text-lg font-medium text-slate-700">Curating your feed...</p>
                    <p className="text-sm">Finding news...</p>
                </div>
            )}
            
            {loading && articles.length > 0 && (
                <div className="flex items-center justify-center gap-2 p-2 bg-brand-50 text-brand-700 rounded-lg text-sm animate-pulse">
                    <RefreshCw className="animate-spin" size={14} />
                    Loading more stories...
                </div>
            )}

            {articles.length > 0 && (
                <div className={`grid grid-cols-1 gap-4 ${loading && articles.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                    {articles
                      .filter(article => {
                          if (!detoxMode) return true;
                          
                          // ✅ ADDED: Strict Credibility Filter
                          // If not in Full Feed, hide anything that isn't verified or is flagged as negative
                          if (moodFilter !== 'Full Feed (Calmed)' && article.verified === false) return false;

                          if (moodFilter === 'Just Positives') return article.sentiment === 'positive';
                          if (moodFilter === 'Balanced') return article.sentiment !== 'negative';
                          return true; // Full Feed (Calmed)
                      })
                      .map(article => (
                        <NewsCard 
                          key={article.id} 
                          article={article} 
                          onClick={handleArticleClick}
                          detoxMode={detoxMode}
                        />
                      ))}
                    
                    {/* Load More Button */}
                    <button 
                        onClick={handleLoadMore}
                        disabled={loading}
                        className="w-full py-4 mt-4 bg-white border border-slate-200 text-brand-600 font-bold rounded-xl hover:bg-brand-50 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Loading...' : 'Load More Stories'}
                    </button>
                </div>
            )}
            
            {!loading && articles.length === 0 && (
               <div className="text-center py-20 text-slate-500 bg-white rounded-xl border border-slate-100">
                  <p className="text-lg font-medium mb-2">No stories found.</p>
                  <button 
                    onClick={() => userProfile && handleManualLoad(userProfile, 'top10')} 
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
