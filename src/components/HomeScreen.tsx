import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Clock, User, Settings, Search, LogOut, RefreshCw, Phone, Video, 
  Bell, HelpCircle, Info, Lock, Shield, Globe, Edit3, Calendar, 
  TrendingUp, Check, X, ChevronRight, MessageSquare, AlertCircle, Sparkles,
  Heart, Star, Volume2, Camera, Compass, UserCheck, ShieldAlert, FileText, ImageIcon, Music,
  Sun, Moon, Laptop, Trash2, ShieldCheck, Activity, Cpu, Server, BarChart3, HelpCircle as HelpIcon, Upload
} from 'lucide-react';
import { User as UserType, CallLog } from '../types';
import ChatScreen from './ChatScreen';
import { useTheme } from '../ThemeContext';
import { API_BASE, safeFetch } from '../config';

interface HomeScreenProps {
  myEmail: string;
  myName: string;
  users: UserType[];
  unreadCounts?: Record<string, number>;
  onInitiateCall: (calleeEmail: string, type: 'audio' | 'video') => void;
  onLogout: () => void;
  onRefresh: () => void;
  status: 'online' | 'offline' | 'busy';
  onStatusChange: (newStatus: 'online' | 'offline' | 'busy') => void;
}

export default function HomeScreen({
  myEmail,
  myName,
  users,
  unreadCounts = {},
  onInitiateCall,
  onLogout,
  onRefresh,
  status,
  onStatusChange
}: HomeScreenProps) {
  const { theme, setTheme, themeColor, setThemeColor } = useTheme();
  // Navigation Tabs: 'users' | 'logs' | 'profile' | 'settings' | 'notifications' | 'admin'
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'profile' | 'settings' | 'notifications' | 'admin'>('users');
  const [activeChatUser, setActiveChatUser] = useState<UserType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['أحمد', 'محمد', 'سارة']);
  
  // Filter chips: 'all' | 'online' | 'favorites' | 'missed'
  const [filterType, setFilterType] = useState<'all' | 'online' | 'favorites' | 'missed'>('all');
  
  // State for logs
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  
  // Favorites system simulation
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('callme_favorites') || localStorage.getItem('hoo_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // Dynamic typing simulator for online users
  const [userActivitySim, setUserActivitySim] = useState<Record<string, 'typing' | 'recording' | 'online' | null>>({});

  // Premium customizable profile bio
  const [bio, setBio] = useState(localStorage.getItem('callme_logged_bio') || localStorage.getItem('hoo_logged_bio') || 'مهندس برمجيات • أستخدم تطبيق CallMe الفاخر للاتصالات المشفرة.');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(bio);

  const [username, setUsername] = useState(localStorage.getItem('callme_logged_username') || localStorage.getItem('hoo_logged_username') || myEmail.split('@')[0]);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);

  // Toggle helpers saved to local storage
  const [enableSoundEffects, setEnableSoundEffects] = useState((localStorage.getItem('callme_sound_effects') || localStorage.getItem('hoo_sound_effects')) !== 'false');
  const [enableSmartCamFilter, setEnableSmartCamFilter] = useState((localStorage.getItem('callme_smart_cam') || localStorage.getItem('hoo_smart_cam')) === 'true');
  const [privacyScope, setPrivacyScope] = useState(localStorage.getItem('callme_privacy_scope') || localStorage.getItem('hoo_privacy_scope') || 'contacts');
  const [appLanguage, setAppLanguage] = useState<'ar' | 'en'>((localStorage.getItem('callme_app_language') || localStorage.getItem('hoo_app_language')) === 'en' ? 'en' : 'ar');

  // Swipe gesture simulator index tracking
  const [swipedUserId, setSwipedUserId] = useState<string | null>(null);

  // Developer & Privacy options (Disabled for safety and role compliance)
  const developerModeUnlocked = false;

  // New Privacy states (Requirement 3 & 4)
  const [emailPrivacy, setEmailPrivacy] = useState<'show' | 'hide' | 'me' | 'contacts'>(
    (localStorage.getItem('callme_email_privacy') as any) || 'contacts'
  );
  const [phonePrivacy, setPhonePrivacy] = useState<'show' | 'hide' | 'me' | 'contacts'>(
    (localStorage.getItem('callme_phone_privacy') as any) || 'contacts'
  );
  const [onlineStatusPrivacy, setOnlineStatusPrivacy] = useState<'all' | 'none' | 'contacts'>(
    (localStorage.getItem('callme_online_privacy') as any) || 'contacts'
  );
  const [lastSeenPrivacy, setLastSeenPrivacy] = useState<'all' | 'none' | 'contacts'>(
    (localStorage.getItem('callme_last_seen_privacy') as any) || 'contacts'
  );
  const [profilePrivacy, setProfilePrivacy] = useState<'all' | 'none' | 'contacts'>(
    (localStorage.getItem('callme_profile_privacy') as any) || 'contacts'
  );
  const [profilePhotoColor, setProfilePhotoColor] = useState<string>(
    localStorage.getItem('callme_avatar_color') || 'bg-blue-600'
  );

  // Edit Profile modal and temp state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState(myName);
  const [tempName, setTempName] = useState(myName);
  const [tempProfileEmailPrivacy, setTempProfileEmailPrivacy] = useState(emailPrivacy);
  const [tempProfilePhonePrivacy, setTempProfilePhonePrivacy] = useState(phonePrivacy);
  const [tempProfileOnlinePrivacy, setTempProfileOnlinePrivacy] = useState(onlineStatusPrivacy);
  const [tempProfileLastSeenPrivacy, setTempProfileLastSeenPrivacy] = useState(lastSeenPrivacy);
  const [tempProfilePrivacy, setTempProfilePrivacy] = useState(profilePrivacy);
  const [tempAvatarColor, setTempAvatarColor] = useState(profilePhotoColor);

  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string>(
    localStorage.getItem('callme_avatar_url') || ''
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("خطأ: حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت.");
      return;
    }

    setIsUploadingAvatar(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      try {
        const res = await safeFetch(`${API_BASE}/profile/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            avatarBase64: base64Str,
            avatarName: file.name
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setProfileAvatarUrl(data.user.avatarUrl || '');
            localStorage.setItem('callme_avatar_url', data.user.avatarUrl || '');
            showToast("تم تحديث الصورة الشخصية بنجاح!");
          } else {
            showToast("فشل رفع الصورة الشخصية.");
          }
        } else {
          showToast("حدث خطأ أثناء رفع الصورة الشخصية.");
        }
      } catch (err: any) {
        console.error("Avatar upload error:", err);
        showToast("فشل رفع الصورة: " + err.message);
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      const res = await safeFetch(`${API_BASE}/profile/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deleteAvatar: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfileAvatarUrl('');
          localStorage.removeItem('callme_avatar_url');
          showToast("تم حذف الصورة الشخصية بنجاح!");
        } else {
          showToast("فشل حذف الصورة الشخصية.");
        }
      } else {
        showToast("حدث خطأ أثناء حذف الصورة الشخصية.");
      }
    } catch (err: any) {
      console.error("Avatar delete error:", err);
      showToast("فشل حذف الصورة: " + err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Elegant Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 2500);
  }, []);

  // Rich notifications list
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; desc: string; time: string; read: boolean; category: 'general' | 'security' | 'calls'; dateGroup: 'today' | 'yesterday' | 'older'; type?: 'message' | 'call' | 'security' }>>([
    { id: '1', title: 'مكالمة فائتة من سارة فوزي', desc: 'حاولت سارة الاتصال بك مرئياً عبر بروتوكول CallMe المباشر.', time: '١٠:٣٠ ص', read: false, category: 'calls', dateGroup: 'today', type: 'call' },
    { id: '2', title: 'تحديث هوية أمان العميل', desc: 'تم تحديث معرّف التطبيق الرقمي الفريد ومزامنته بآلية عالية التماسك.', time: '٠٨:١٥ ص', read: false, category: 'security', dateGroup: 'today', type: 'security' },
    { id: '3', title: 'تبادل مفاتيح القناة الآمنة', desc: 'مفاتيح التبادل الثنائي لـ Diffie-Hellman تم توليدها وتحديثها مع الخادم.', time: 'أمس، ٠٩:٤٥ م', read: true, category: 'security', dateGroup: 'yesterday', type: 'security' },
    { id: '4', title: 'أحمد علي نشط الآن', desc: 'أصبح صديقك أحمد علي نشطاً الآن وجاهزاً للاتصال الفوري.', time: 'أمس، ١٢:٢٠ م', read: true, category: 'general', dateGroup: 'yesterday', type: 'message' },
    { id: '5', title: 'مكالمة صوتية فائقة الوضوح', desc: 'اتصال مشفر ثنائي مع أحمد علي استغرق دقيقة واحدة و٢٢ ثانية بنجاح.', time: '٥ يوليو ٢٠٢٦', read: true, category: 'calls', dateGroup: 'older', type: 'call' },
    { id: '6', title: 'تهيئة الأمان للمرة الأولى', desc: 'تم إنشاء مفتاح الجلسة التلقائي وتفعيل حماية تسريب الهوية عبر النظام.', time: '١ يوليو ٢٠٢٦', read: true, category: 'security', dateGroup: 'older', type: 'security' }
  ]);

  const [notificationSearch, setNotificationSearch] = useState('');
  const [activeNotificationCategory, setActiveNotificationCategory] = useState<'all' | 'general' | 'security' | 'calls'>('all');

  const handleLanguageChange = (lang: 'ar' | 'en') => {
    setAppLanguage(lang);
    localStorage.setItem('hoo_app_language', lang);
  };

  const handleSoundToggle = () => {
    const newVal = !enableSoundEffects;
    setEnableSoundEffects(newVal);
    localStorage.setItem('hoo_sound_effects', String(newVal));
  };

  const handleCamToggle = () => {
    const newVal = !enableSmartCamFilter;
    setEnableSmartCamFilter(newVal);
    localStorage.setItem('hoo_smart_cam', String(newVal));
  };

  const handlePrivacyChange = (val: string) => {
    setPrivacyScope(val);
    localStorage.setItem('hoo_privacy_scope', val);
  };

  const toggleFavorite = (email: string) => {
    const nextFavs = favorites.includes(email)
      ? favorites.filter(e => e !== email)
      : [...favorites, email];
    setFavorites(nextFavs);
    localStorage.setItem('hoo_favorites', JSON.stringify(nextFavs));
  };

  // Simulating random typing/recording status updates like Telegram
  useEffect(() => {
    const interval = setInterval(() => {
      const activeUsers = users.filter(u => u.status === 'online');
      if (activeUsers.length === 0) return;

      const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
      const states: Array<'typing' | 'recording' | null> = ['typing', 'recording', null, null];
      const randomState = states[Math.floor(Math.random() * states.length)];

      setUserActivitySim(prev => ({
        ...prev,
        [randomUser.email]: randomState
      }));

      // Clear after 3 seconds
      if (randomState) {
        setTimeout(() => {
          setUserActivitySim(prev => ({
            ...prev,
            [randomUser.email]: null
          }));
        }, 3000);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [users]);

  // Fetch call logs
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await safeFetch(`${API_BASE}/logs?email=${encodeURIComponent(myEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Error loading call logs:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, myEmail]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    if (activeTab === 'logs') {
      fetchLogs();
    }
    setTimeout(() => setIsRefreshing(false), 850);
  };

  // Profile saving methods
  const handleSaveBio = () => {
    setBio(tempBio);
    localStorage.setItem('hoo_logged_bio', tempBio);
    setIsEditingBio(false);
  };

  const handleSaveUsername = () => {
    const cleaned = tempUsername.trim().toLowerCase().replace('@', '');
    setUsername(cleaned);
    localStorage.setItem('hoo_logged_username', cleaned);
    setIsEditingUsername(false);
  };

  // Human greeting string
  const greetingText = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'صباح الخير ☀️';
    if (hours < 18) return 'مساء النور 🌆';
    return 'مساء الخير 🌃';
  }, []);

  // Format Telegram status in real-time
  const getTelegramStatusText = useCallback((user: UserType) => {
    // Check if simulated state is active
    const simState = userActivitySim[user.email];
    if (simState === 'typing') {
      return { text: 'يكتب الآن...', color: 'text-blue-400 font-medium' };
    }
    if (simState === 'recording') {
      return { text: 'يسجل مقطعاً صوتياً...', color: 'text-purple-400 font-medium' };
    }

    if (user.status === 'online') {
      return { text: 'متصل الآن', color: 'text-[#22C55E]' };
    }
    if (user.status === 'busy') {
      return { text: 'في مكالمة أخرى 📞', color: 'text-[#F59E0B] font-semibold' };
    }

    const lastSeenMs = user.lastSeen;
    if (!lastSeenMs) {
      return { text: 'آخر ظهور منذ زمن طويل', color: 'text-app-text-secondary' };
    }

    const diffSec = Math.floor((Date.now() - lastSeenMs) / 1000);
    if (diffSec < 15) {
      return { text: 'آخر ظهور للتو', color: 'text-blue-500' };
    }
    if (diffSec < 60) {
      return { text: 'آخر ظهور منذ ثوانٍ', color: 'text-app-text-secondary' };
    }
    if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return { text: `آخر ظهور منذ ${mins} دقيقة`, color: 'text-app-text-secondary' };
    }

    const date = new Date(lastSeenMs);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

    if (isToday) {
      const timeStr = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
      return { text: `آخر ظهور اليوم في ${timeStr}`, color: 'text-app-text-secondary' };
    }

    const dateStr = date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    return { text: `آخر ظهور في ${dateStr}`, color: 'text-app-text-secondary' };
  }, [userActivitySim]);

  // Highlighting matching query characters
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span className="text-white">{text}</span>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{part}</mark> 
            : <span key={i} className="text-white">{part}</span>
        )}
      </span>
    );
  };

  // Filtered lists logic with search
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const query = searchQuery.toLowerCase();
      const userHandle = `@${user.email.split('@')[0]}`;
      const nameMatch = user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query) || userHandle.toLowerCase().includes(query);
      
      if (!nameMatch) return false;

      if (filterType === 'online') {
        return user.status === 'online';
      }
      if (filterType === 'favorites') {
        return favorites.includes(user.email);
      }
      if (filterType === 'missed') {
        // Missed filtering depends on logged logs
        return logs.some(l => l.status === 'missed' && (l.caller === user.email || l.callee === user.email));
      }

      return true;
    });
  }, [users, searchQuery, filterType, favorites, logs]);

  // Statistics calculation for logs
  const stats = useMemo(() => {
    const totalLogs = logs.length;
    const voiceCalls = logs.filter(l => l.type === 'audio').length;
    const videoCalls = logs.filter(l => l.type === 'video').length;
    const missedCalls = logs.filter(l => l.status === 'missed').length;
    return { totalLogs, voiceCalls, videoCalls, missedCalls };
  }, [logs]);

  const getStatusRingColor = (user: UserType) => {
    const simState = userActivitySim[user.email];
    if (simState === 'typing') return 'border-blue-500 border-2 animate-pulse';
    if (simState === 'recording') return 'border-purple-500 border-2 animate-pulse';

    switch (user.status) {
      case 'online': return 'border-emerald-500 border-2';
      case 'busy': return 'border-amber-500 border-2';
      default: return 'border-zinc-700 border';
    }
  };

  const getStatusBubbleColor = (userStatus: 'online' | 'offline' | 'busy') => {
    switch (userStatus) {
      case 'online': return 'bg-[#22C55E]';
      case 'busy': return 'bg-[#F59E0B]';
      default: return 'bg-[#A1A1AA]';
    }
  };

  const readAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-app-bg text-app-text-primary flex flex-col font-sans relative pb-28 transition-colors duration-250 ease-in-out">
      
      {/* High precision background layers */}
      <div className="absolute top-0 right-1/4 w-[280px] h-[280px] bg-blue-600/5 rounded-full blur-[110px] pointer-events-none z-0"></div>
      <div className="absolute bottom-20 left-1/4 w-[280px] h-[280px] bg-[#22C55E]/5 rounded-full blur-[110px] pointer-events-none z-0"></div>

      {/* Top Header Row */}
      <header className="sticky top-0 bg-app-bg/90 backdrop-blur-md border-b border-app-border px-6 py-4 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between">
          
          {/* User profile dropdown and mini status */}
          <div className="flex items-center gap-3">
            <div className="relative cursor-pointer" onClick={() => setActiveTab('profile')}>
              <div className="w-10 h-10 rounded-full bg-app-secondary-bg border border-app-border flex items-center justify-center font-bold text-app-text-primary shadow-sm select-none text-sm uppercase">
                {myName.slice(0, 1)}
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-app-bg ${getStatusBubbleColor(status)} shadow`}></span>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-app-text-secondary block">{greetingText}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-start">
                <span className="text-xs font-bold text-app-text-primary">{myName}</span>
              </div>
            </div>
          </div>

          {/* Premium Logo Header */}
          <div className="text-center">
            <h1 className="text-lg font-black tracking-widest text-app-text-primary font-sans flex items-center justify-center gap-1">
              CallMe
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            </h1>
          </div>

          {/* Settings and Notification elements */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab('notifications');
                setSwipedUserId(null);
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition duration-150 relative cursor-pointer ${
                activeTab === 'notifications' 
                  ? 'bg-app-card text-app-primary' 
                  : 'text-app-text-secondary hover:text-app-text-primary hover:bg-app-secondary-bg'
              }`}
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-app-bg animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('settings');
                setSwipedUserId(null);
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition duration-150 cursor-pointer ${
                activeTab === 'settings' 
                  ? 'bg-app-card text-app-text-primary' 
                  : 'text-app-text-secondary hover:text-app-text-primary hover:bg-app-secondary-bg'
              }`}
            >
              <Settings className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Container View */}
      <main className="flex-1 max-w-md w-full mx-auto px-5 py-6 z-10">

        {/* 1. ACTIVE USERS TAB */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            
            {/* Elegant Search bar container */}
            <div className="relative">
              <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-app-text-secondary" />
              <input
                type="text"
                placeholder="ابحث بالاسم، البريد الإلكتروني..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-app-card border border-app-border rounded-xl pr-11 pl-12 py-3 text-xs text-white placeholder-[#A1A1AA]/60 focus:border-[#2563EB]/40 focus:ring-1 focus:ring-[#2563EB]/10 transition duration-150 text-right font-sans"
              />
              
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-10 top-1/2 -translate-y-1/2 text-app-text-secondary hover:text-white text-xs"
                >
                  مسح
                </button>
              )}

              <button
                onClick={handleManualRefresh}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-secondary hover:text-app-text-primary p-1 rounded-lg hover:bg-app-secondary-bg transition duration-150 cursor-pointer active:scale-95"
                title="تحديث سريع"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Expandable Search Suggestions or Recent Searches */}
            <AnimatePresence>
              {isSearchFocused && !searchQuery && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-app-card border border-app-border rounded-xl p-3 text-right space-y-2 overflow-hidden"
                >
                  <div className="flex justify-between items-center text-[10px] text-app-text-secondary">
                    <button 
                      onClick={() => setRecentSearches([])} 
                      className="hover:underline cursor-pointer"
                    >
                      مسح الكل
                    </button>
                    <span>عمليات البحث الأخيرة</span>
                  </div>
                  
                  {recentSearches.length === 0 ? (
                    <p className="text-[10px] text-app-text-secondary/60 py-1">لا يوجد بحث مؤخراً</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {recentSearches.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSearchQuery(s)}
                          className="bg-app-secondary-bg hover:bg-app-secondary-bg text-[10px] text-white px-2.5 py-1 rounded-full transition cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setIsSearchFocused(false)}
                    className="w-full text-center text-[10px] text-blue-500 hover:underline pt-2 border-t border-white/5"
                  >
                    إغلاق الاقتراحات
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Premium segmented chips filter list */}
            <div className="flex bg-app-card p-1 rounded-xl border border-app-border overflow-x-auto justify-start select-none no-scrollbar">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg shrink-0 transition ${
                  filterType === 'all' ? 'bg-app-secondary-bg text-white' : 'text-app-text-secondary'
                }`}
              >
                الكل ({users.length})
              </button>
              
              <button
                onClick={() => setFilterType('online')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg shrink-0 transition ${
                  filterType === 'online' ? 'bg-app-secondary-bg text-white' : 'text-app-text-secondary'
                }`}
              >
                النشطين ({users.filter(u => u.status === 'online').length})
              </button>

              <button
                onClick={() => setFilterType('favorites')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg shrink-0 transition ${
                  filterType === 'favorites' ? 'bg-app-secondary-bg text-white' : 'text-app-text-secondary'
                }`}
              >
                المفضلة ({favorites.length})
              </button>

              <button
                onClick={() => setFilterType('missed')}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg shrink-0 transition ${
                  filterType === 'missed' ? 'bg-app-secondary-bg text-white' : 'text-app-text-secondary'
                }`}
              >
                الفائتة ({logs.filter(l => l.status === 'missed').length})
              </button>
            </div>

            {/* Skeleton Shimmer Loading Simulation */}
            {isRefreshing ? (
              <div className="space-y-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="bg-app-card/60 border border-app-border rounded-2xl p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-app-secondary-bg rounded-full"></div>
                      <div className="space-y-1.5 text-right">
                        <div className="h-3 w-20 bg-app-secondary-bg rounded"></div>
                        <div className="h-2 w-28 bg-app-secondary-bg rounded"></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-9 h-9 bg-app-secondary-bg rounded-xl"></div>
                      <div className="w-9 h-9 bg-app-secondary-bg rounded-xl"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-app-card/40 rounded-2xl border border-app-border p-6">
                <div className="w-12 h-12 bg-app-secondary-bg rounded-full flex items-center justify-center text-app-text-secondary">
                  <Compass className="w-6 h-6 stroke-1 text-app-text-secondary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-app-text-primary">لم نعثر على أي جهات اتصال</p>
                  <p className="text-[10px] text-app-text-secondary max-w-xs leading-relaxed">
                    جرب تغيير مرشحات التصفية أو قم بكتابة اسم مستخدم مسجل آخر للبحث المباشر.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user, idx) => {
                  const isFav = favorites.includes(user.email);

                  return (
                    <motion.div
                      key={user.email}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="bg-app-card border border-app-border rounded-2xl p-4 flex items-center justify-between hover:border-app-primary/40 hover:bg-app-secondary-bg transition duration-150 group relative cursor-pointer"
                      onClick={() => {
                        setActiveChatUser(user);
                      }}
                    >
                      {/* Avatar, Username & Bio */}
                      <div className="flex items-center gap-3.5 select-none w-full">
                        <div className="relative shrink-0">
                          {/* Ring code based on user status */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center p-0.5 ${getStatusRingColor(user)}`}>
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-app-secondary-bg flex items-center justify-center font-extrabold text-app-primary text-sm uppercase">
                                {user.name.slice(0, 1)}
                              </div>
                            )}
                          </div>
                          
                          {/* Small status bullet on avatar bottom right */}
                          <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-app-card ${getStatusBubbleColor(user.status)} shadow`}></span>
                        </div>

                        <div className="text-right flex-1 min-w-0 pr-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-app-text-primary group-hover:text-app-primary transition duration-100 flex items-center gap-1.5">
                              {highlightMatch(user.name, searchQuery)}
                              {isFav && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                            </h4>
                            {(unreadCounts[user.email] || 0) > 0 && (
                              <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                                {unreadCounts[user.email]}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-app-text-secondary truncate mt-1 max-w-[240px] font-sans">
                            {user.bio || 'لا توجد نبذة تعريفية.'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. CALL LOGS HISTORY TAB */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <button 
                onClick={handleManualRefresh}
                className="text-[10px] text-[#2563EB] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>تحديث السجل</span>
                <RefreshCw className="w-3 h-3" />
              </button>
              <h3 className="text-xs font-bold text-app-text-secondary">تاريخ المكالمات المشفرة</h3>
            </div>

            <div className="space-y-3">
              {isLoadingLogs ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-app-card/40 rounded-2xl border border-app-border p-6">
                  <div className="w-12 h-12 bg-app-secondary-bg rounded-full flex items-center justify-center text-app-text-secondary">
                    <Clock className="w-6 h-6 stroke-1 text-app-text-secondary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-app-text-primary">سجل المكالمات فارغ</p>
                    <p className="text-[10px] text-app-text-secondary">لم تقم بإجراء أو استقبال أي مكالمة مشفرة حتى الآن.</p>
                  </div>
                </div>
              ) : (
                logs.map((log) => {
                  const isOutgoing = log.caller === myEmail;
                  const partyName = isOutgoing ? log.calleeName : log.callerName;
                  const partyEmail = isOutgoing ? log.callee : log.caller;
                  const isMissed = log.status === 'missed';
                  const isRejected = log.status === 'rejected';

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-app-card border border-app-border rounded-2xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 text-right">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isMissed ? 'bg-rose-500/10 text-rose-500' :
                          isRejected ? 'bg-amber-500/10 text-amber-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {log.type === 'video' ? <Video className="w-4.5 h-4.5" /> : <Phone className="w-4.5 h-4.5" />}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-white">{partyName}</h4>
                          <p className="text-[9px] text-app-text-secondary font-mono mt-0.5">@{partyEmail.split('@')[0]}</p>
                          
                          <div className="flex items-center gap-1.5 text-[9px] text-app-text-secondary mt-1">
                            <span>{new Date(log.timestamp).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}</span>
                            <span>•</span>
                            <span className={isMissed ? 'text-rose-400 font-medium' : isRejected ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
                              {isMissed ? 'فائتة' : isRejected ? 'مرفوضة' : `مكتملة (${log.duration || 0}ث)`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onInitiateCall(partyEmail, log.type)}
                        className="px-3.5 py-1.5 bg-app-secondary-bg hover:bg-[#2563EB] hover:text-white rounded-lg text-[10px] font-bold text-app-text-secondary transition duration-150 cursor-pointer active:scale-95"
                      >
                        اتصال ثنائي
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 3. REDESIGNED PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            
            {/* Premium Header Banner */}
            <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden shadow-xl relative pb-6">
              <div className="h-24 bg-gradient-to-r from-blue-600/20 via-indigo-600/10 to-transparent relative">
                {/* Simulated connection status with animated pulse dot */}
                <span className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-[9px] text-emerald-400 font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>اتصال مباشر آمن</span>
                </span>
              </div>
              
              <div className="px-6 flex flex-col items-center text-center -mt-12 space-y-4">
                
                {/* Large Avatar with animated status rings */}
                <div className="relative select-none">
                  {/* Outer pulsating status ring */}
                  <motion.div 
                    animate={{ scale: [0.96, 1.04, 0.96] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    className={`absolute -inset-1.5 rounded-full border-2 ${
                      status === 'online' ? 'border-emerald-500/40' : status === 'busy' ? 'border-amber-500/40' : 'border-zinc-500/30'
                    } blur-sm`}
                  />
                  
                  {/* Inner status ring */}
                  <div className={`w-24 h-24 rounded-full p-1 bg-gradient-to-tr ${
                    status === 'online' ? 'from-emerald-500 to-teal-400' : status === 'busy' ? 'from-amber-500 to-orange-400' : 'from-zinc-600 to-zinc-400'
                  }`}>
                    <div className="w-full h-full rounded-full bg-app-secondary-bg border-4 border-[#18181B] flex items-center justify-center font-black text-white text-3xl uppercase overflow-hidden shadow-inner">
                      {profileAvatarUrl ? (
                        <img
                          src={profileAvatarUrl}
                          alt={profileDisplayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${profilePhotoColor}`}>
                          {profileDisplayName.slice(0, 1)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Online status indicator dot */}
                  <span className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-4 border-[#18181B] ${
                    status === 'online' ? 'bg-emerald-500' : status === 'busy' ? 'bg-amber-500' : 'bg-zinc-500'
                  } shadow-md`}></span>
                </div>

                {/* Profile Display Name & Biography */}
                <div className="space-y-1.5">
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-1 justify-center">
                    {profileDisplayName}
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                  </h2>
                  <p className="text-xs font-mono text-blue-400">@{username}</p>
                  
                  {/* Biography Section directly under the name */}
                  <p className="text-xs text-app-text-secondary font-sans max-w-sm leading-relaxed pt-2 px-4 border-t border-white/5 mx-auto italic">
                    "{bio}"
                  </p>
                </div>

                {/* Professional Profile Edit Action Button */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setTempName(profileDisplayName);
                      setTempAvatarColor(profilePhotoColor);
                      setTempProfileEmailPrivacy(emailPrivacy);
                      setTempProfilePhonePrivacy(phonePrivacy);
                      setTempProfileOnlinePrivacy(onlineStatusPrivacy);
                      setTempProfileLastSeenPrivacy(lastSeenPrivacy);
                      setTempProfilePrivacy(profilePrivacy);
                      setIsEditingProfile(true);
                    }}
                    className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-[11px] font-bold px-5 py-2.5 rounded-xl transition cursor-pointer active:scale-95 shadow-lg flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل الملف والخصوصية</span>
                  </button>

                  {/* Secret toggle button to access developer admin panel */}
                  {developerModeUnlocked && (
                    <button
                      onClick={() => setActiveTab('admin')}
                      className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 text-purple-400 text-[11px] font-bold px-4 py-2.5 rounded-xl transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>لوحة التحكم</span>
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Account Details & Customizable Privacy Parameters Card */}
            <div className="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-app-text-secondary text-right">بيانات الحساب وتصاريح الخصوصية</h3>
              
              <div className="divide-y divide-app-border text-right text-xs">
                
                {/* Email address displaying its respective privacy status */}
                <div className="py-3 flex justify-between items-center">
                  <div className="text-left">
                    <p className="font-mono text-white">{myEmail}</p>
                    <p className="text-[9px] text-app-text-secondary mt-0.5">
                      {emailPrivacy === 'show' ? 'مرئي للجميع' : emailPrivacy === 'hide' ? 'مخفي تماماً' : emailPrivacy === 'me' ? 'مرئي لي فقط' : 'لجهات الاتصال فقط'}
                    </p>
                  </div>
                  <span className="text-app-text-secondary font-medium">البريد الإلكتروني</span>
                </div>

                {/* Phone number & privacy status */}
                <div className="py-3 flex justify-between items-center">
                  <div className="text-left">
                    <p className="font-mono text-white">+٩٦٦ •• ••• ••••</p>
                    <p className="text-[9px] text-app-text-secondary mt-0.5">
                      {phonePrivacy === 'show' ? 'مرئي للجميع' : phonePrivacy === 'hide' ? 'مخفي تماماً' : phonePrivacy === 'me' ? 'مرئي لي فقط' : 'لجهات الاتصال فقط'}
                    </p>
                  </div>
                  <span className="text-app-text-secondary font-medium">رقم الهاتف</span>
                </div>

                {/* Last Seen Privacy settings display */}
                <div className="py-3 flex justify-between items-center">
                  <div className="text-left text-white font-medium">
                    {lastSeenPrivacy === 'all' ? 'الجميع' : lastSeenPrivacy === 'none' ? 'لا أحد' : 'جهات الاتصال فقط'}
                  </div>
                  <span className="text-app-text-secondary font-medium">حالة آخر ظهور</span>
                </div>

                {/* Join date */}
                <div className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-white">
                    <span>يوليو ٢٠٢٦</span>
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <span className="text-app-text-secondary font-medium">تاريخ الانضمام</span>
                </div>

              </div>
            </div>

            {/* Call Statistics section with clean modern cards */}
            <div className="bg-app-card border border-app-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4 justify-end text-right">
                <span className="text-xs font-bold text-app-text-secondary">إحصائيات المكالمات (P2P)</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/25 p-3.5 rounded-xl border border-white/5 text-center">
                  <h6 className="text-[10px] text-app-text-secondary">المكالمات</h6>
                  <p className="text-lg font-black text-white mt-1">{stats.totalLogs}</p>
                </div>
                <div className="bg-black/25 p-3.5 rounded-xl border border-white/5 text-center">
                  <h6 className="text-[10px] text-app-text-secondary">صوتية</h6>
                  <p className="text-lg font-black text-blue-400 mt-1">{stats.voiceCalls}</p>
                </div>
                <div className="bg-black/25 p-3.5 rounded-xl border border-white/5 text-center">
                  <h6 className="text-[10px] text-app-text-secondary">مرئية</h6>
                  <p className="text-lg font-black text-emerald-400 mt-1">{stats.videoCalls}</p>
                </div>
              </div>
            </div>

            {/* Shared media folder widgets like Telegram */}
            <div className="bg-app-card border border-app-border rounded-2xl p-5">
              <span className="text-xs font-bold text-app-text-secondary block text-right mb-3">الوسائط والملفات المشتركة</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#09090B] hover:bg-app-bg border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition">
                  <ImageIcon className="w-5 h-5 text-blue-500 mb-1.5" />
                  <span className="text-[10px] text-white">الصور (٠)</span>
                </div>
                <div className="bg-[#09090B] hover:bg-app-bg border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition">
                  <FileText className="w-5 h-5 text-purple-500 mb-1.5" />
                  <span className="text-[10px] text-white">المستندات (٠)</span>
                </div>
                <div className="bg-[#09090B] hover:bg-app-bg border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition">
                  <Music className="w-5 h-5 text-emerald-500 mb-1.5" />
                  <span className="text-[10px] text-white">الصوتيات (٠)</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 3B. GORGEOUS SLIDE-UP PROFILE EDIT MODAL */}
        <AnimatePresence>
          {isEditingProfile && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
              <div className="absolute inset-0" onClick={() => setIsEditingProfile(false)} />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="bg-app-secondary-bg border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden relative z-10 text-right shadow-2xl flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="bg-app-secondary-bg px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="text-app-text-secondary hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-sm font-bold text-white">إعدادات ملف التعريف والخصوصية</h3>
                </div>

                {/* Modal scrollable form */}
                <div className="p-5 space-y-4 overflow-y-auto no-scrollbar flex-1">
                  
                  {/* Photo Avatar Upload, Replace, and Delete section */}
                  <div className="space-y-2 border-b border-white/5 pb-4 flex flex-col items-center">
                    <label className="text-[11px] text-app-text-secondary font-bold self-end">الصورة الشخصية</label>
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full bg-app-secondary-bg border-2 border-white/10 flex items-center justify-center text-2xl font-black uppercase text-white overflow-hidden shadow-md">
                        {profileAvatarUrl ? (
                          <img
                            src={profileAvatarUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${tempAvatarColor}`}>
                            {tempName.slice(0, 1)}
                          </div>
                        )}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                      {/* Upload/Replace Button */}
                      <label className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition">
                        <Upload className="w-3 h-3" />
                        <span>{profileAvatarUrl ? 'استبدال الصورة' : 'رفع صورة'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          disabled={isUploadingAvatar}
                          className="hidden"
                        />
                      </label>

                      {/* Delete Button */}
                      {profileAvatarUrl && (
                        <button
                          type="button"
                          onClick={handleDeleteAvatar}
                          disabled={isUploadingAvatar}
                          className="flex items-center gap-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف الصورة</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-app-text-secondary font-bold">الاسم الظاهر</label>
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full bg-app-bg border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 transition text-right font-sans"
                    />
                  </div>

                  {/* Biography field */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-app-text-secondary font-bold">الوصف (النبذة)</label>
                    <textarea
                      value={tempBio}
                      onChange={(e) => setTempBio(e.target.value)}
                      className="w-full bg-app-bg border border-white/5 rounded-xl p-3 text-xs text-white focus:border-blue-500 transition resize-none text-right font-sans"
                      rows={2.5}
                    />
                  </div>

                  {/* Avatar Color selector */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-app-text-secondary font-bold block mb-1">لون الصورة الرمزية</label>
                    <div className="flex gap-2 justify-end">
                      {[
                        { color: 'bg-blue-600', hover: 'hover:bg-blue-500' },
                        { color: 'bg-emerald-600', hover: 'hover:bg-emerald-500' },
                        { color: 'bg-purple-600', hover: 'hover:bg-purple-500' },
                        { color: 'bg-indigo-600', hover: 'hover:bg-indigo-500' },
                        { color: 'bg-rose-600', hover: 'hover:bg-rose-500' },
                        { color: 'bg-amber-600', hover: 'hover:bg-amber-500' }
                      ].map((avatar) => (
                        <button
                          key={avatar.color}
                          onClick={() => setTempAvatarColor(avatar.color)}
                          className={`w-6 h-6 rounded-full ${avatar.color} ${avatar.hover} border-2 ${
                            tempAvatarColor === avatar.color ? 'border-white scale-110' : 'border-transparent'
                          } transition`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Email Privacy Picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-app-text-secondary font-bold">خصوصية البريد الإلكتروني</label>
                    <select
                      value={tempProfileEmailPrivacy}
                      onChange={(e: any) => setTempProfileEmailPrivacy(e.target.value)}
                      className="w-full bg-app-bg border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none transition text-right cursor-pointer"
                    >
                      <option value="contacts">جهات الاتصال فقط</option>
                      <option value="show">مرئي للجميع</option>
                      <option value="me">مرئي لي فقط</option>
                      <option value="hide">مخفي تماماً</option>
                    </select>
                  </div>

                  {/* Phone Privacy Picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-app-text-secondary font-bold">خصوصية رقم الهاتف</label>
                    <select
                      value={tempProfilePhonePrivacy}
                      onChange={(e: any) => setTempProfilePhonePrivacy(e.target.value)}
                      className="w-full bg-app-bg border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none transition text-right cursor-pointer"
                    >
                      <option value="contacts">جهات الاتصال فقط</option>
                      <option value="show">مرئي للجميع</option>
                      <option value="me">مرئي لي فقط</option>
                      <option value="hide">مخفي تماماً</option>
                    </select>
                  </div>

                  {/* Last Seen Privacy Picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-app-text-secondary font-bold">خصوصية حالة ظهورك</label>
                    <select
                      value={tempProfileLastSeenPrivacy}
                      onChange={(e: any) => setTempProfileLastSeenPrivacy(e.target.value)}
                      className="w-full bg-app-bg border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none transition text-right cursor-pointer"
                    >
                      <option value="contacts">جهات اتصالي فقط</option>
                      <option value="all">الجميع</option>
                      <option value="none">لا أحد</option>
                    </select>
                  </div>

                </div>

                {/* Modal Footer Controls */}
                <div className="bg-app-secondary-bg p-4 border-t border-white/5 flex gap-2">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-app-secondary-bg text-app-text-primary hover:bg-app-secondary-bg transition"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      if (tempName.trim()) {
                        setProfileDisplayName(tempName.trim());
                      }
                      setBio(tempBio);
                      setProfilePhotoColor(tempAvatarColor);
                      setEmailPrivacy(tempProfileEmailPrivacy);
                      setPhonePrivacy(tempProfilePhonePrivacy);
                      setLastSeenPrivacy(tempProfileLastSeenPrivacy);
                      
                      // Save to LocalStorage
                      localStorage.setItem('callme_avatar_color', tempAvatarColor);
                      localStorage.setItem('callme_logged_bio', tempBio);
                      localStorage.setItem('callme_email_privacy', tempProfileEmailPrivacy);
                      localStorage.setItem('callme_phone_privacy', tempProfilePhonePrivacy);
                      localStorage.setItem('callme_last_seen_privacy', tempProfileLastSeenPrivacy);
                      
                      setIsEditingProfile(false);
                      // Custom Toast
                      showToast("تم تحديث الملف وإعدادات الخصوصية بنجاح!");
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition"
                  >
                    حفظ التغييرات
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 5. GORGEOUS FULL-SCREEN NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-5 select-none">
            
            {/* Header section with count & Mark-all-as-read */}
            <div className="bg-app-card border border-app-border rounded-2xl p-4 shadow-xl">
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-3.5">
                <button 
                  onClick={() => {
                    readAllNotifications();
                    showToast("تم وضع علامة مقروء للجميع");
                  }}
                  className="text-[10px] text-blue-500 font-bold hover:underline cursor-pointer"
                >
                  تحديد الكل كمقروء
                </button>
                <div className="flex items-center gap-1.5 text-right">
                  <span className="text-xs font-bold text-white">مركز تنبيهات الحماية والنشاط</span>
                  <Bell className="w-4 h-4 text-blue-500" />
                </div>
              </div>

              {/* Advanced search bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-app-text-secondary" />
                <input
                  type="text"
                  placeholder="ابحث في التنبيهات والتقارير..."
                  value={notificationSearch}
                  onChange={(e) => setNotificationSearch(e.target.value)}
                  className="w-full bg-app-bg border border-app-border rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder-app-text-secondary/50 focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 transition text-right font-sans"
                />
                {notificationSearch && (
                  <button 
                    onClick={() => setNotificationSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-app-text-secondary hover:text-white"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Categories segmented chips */}
              <div className="flex bg-app-bg p-1 rounded-xl border border-app-border mt-3 justify-start overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', title: 'الكل' },
                  { id: 'security', title: 'الأمان' },
                  { id: 'calls', title: 'المكالمات' },
                  { id: 'general', title: 'عام' }
                ].map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveNotificationCategory(category.id as any)}
                    className={`px-3 py-1.5 text-[9.5px] font-bold rounded-lg transition shrink-0 cursor-pointer ${
                      activeNotificationCategory === category.id ? 'bg-app-secondary-bg text-white shadow-sm' : 'text-app-text-secondary'
                    }`}
                  >
                    {category.title}
                  </button>
                ))}
              </div>
            </div>

            {/* List Grouped by Time Frames */}
            <div className="space-y-6">
              {['today', 'yesterday', 'older'].map((timeGroup) => {
                const groupNotifications = notifications.filter(
                  n => n.dateGroup === timeGroup && 
                  (activeNotificationCategory === 'all' || n.category === activeNotificationCategory) &&
                  (n.title.toLowerCase().includes(notificationSearch.toLowerCase()) || n.desc.toLowerCase().includes(notificationSearch.toLowerCase()))
                );

                if (groupNotifications.length === 0) return null;

                return (
                  <div key={timeGroup} className="space-y-2.5">
                    {/* Date subtitle header */}
                    <h4 className="text-[10px] font-black tracking-wider text-app-text-secondary text-right uppercase px-2">
                      {timeGroup === 'today' ? 'اليوم' : timeGroup === 'yesterday' ? 'أمس' : 'أقدم من ذلك'}
                    </h4>

                    {/* Notifications mapping with Swipe to Delete simulator */}
                    <div className="space-y-2">
                      {groupNotifications.map((n) => (
                        <div
                          key={n.id}
                          className="relative overflow-hidden rounded-xl border border-white/5 bg-[#18181B] flex items-center justify-between"
                        >
                          {/* Inner Row Content (Swipe/Reveal style) */}
                          <div className={`flex-1 p-3 flex items-center justify-between gap-3 text-right cursor-pointer transition ${
                            n.read ? 'opacity-70 bg-transparent' : 'bg-blue-600/[0.03]'
                          }`}>
                            {/* Actions / Read Status indicator dots */}
                            <div className="flex flex-col items-end gap-1.5 shrink-0 justify-center">
                              <span className="text-[8.5px] text-app-text-secondary font-mono">{n.time}</span>
                              {!n.read && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                              )}
                            </div>

                            {/* Center Title / Desc */}
                            <div className="flex-1 min-w-0 pr-1.5">
                              <h5 className="text-xs font-bold text-white truncate">{n.title}</h5>
                              <p className="text-[10px] text-app-text-secondary mt-0.5 leading-relaxed">{n.desc}</p>
                            </div>

                            {/* Custom Category Avatar */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              n.type === 'call' ? 'bg-emerald-500/10 text-emerald-400' : n.type === 'security' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {n.type === 'call' ? (
                                <Phone className="w-4 h-4" />
                              ) : n.type === 'security' ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                <MessageSquare className="w-4 h-4" />
                              )}
                            </div>
                          </div>

                          {/* Side Action Button (Trash Bin style) */}
                          <button
                            onClick={() => {
                              setNotifications(prev => prev.filter(item => item.id !== n.id));
                              showToast("تم حذف التنبيه بنجاح");
                            }}
                            className="w-12 h-full bg-red-600/10 hover:bg-red-600/20 border-l border-white/5 flex items-center justify-center text-red-400 transition cursor-pointer self-stretch shrink-0"
                            title="حذف التنبيه"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {notifications.filter(
                n => (activeNotificationCategory === 'all' || n.category === activeNotificationCategory) &&
                (n.title.toLowerCase().includes(notificationSearch.toLowerCase()) || n.desc.toLowerCase().includes(notificationSearch.toLowerCase()))
              ).length === 0 && (
                <div className="py-12 text-center text-app-text-secondary space-y-2">
                  <Bell className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-xs">لا توجد تنبيهات تطابق عوامل البحث</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* 6. RESTRICTED SECURITY ADMIN DASHBOARD TAB */}
        {activeTab === 'admin' && (
          <div className="space-y-5 select-none">
            
            {/* System Status Banner Row */}
            <div className="bg-app-card border border-app-border rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <div className="flex items-center gap-1.5 text-left font-mono text-[10px] text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>المخدم متصل: 3000</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">حالة الخادم الفيدرالي لـ CallMe</span>
                  <Server className="w-4 h-4 text-purple-400" />
                </div>
              </div>

              {/* Diagnostic grid */}
              <div className="grid grid-cols-2 gap-3 text-right">
                <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-emerald-400 text-xs font-bold">١٢ مللي ثانية</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-app-text-secondary">زمن الاستجابة</span>
                    <Activity className="w-3.5 h-3.5 text-app-text-secondary" />
                  </div>
                </div>

                <div className="bg-black/25 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                  <span className="font-mono text-white text-xs">١٤.٨ ميجابايت</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-app-text-secondary">الذاكرة المستهلكة</span>
                    <Cpu className="w-3.5 h-3.5 text-app-text-secondary" />
                  </div>
                </div>
              </div>
            </div>

            {/* General Database Statistics Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-app-card border border-app-border p-4 rounded-xl text-right relative overflow-hidden">
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-blue-500/5 rounded-full blur-md"></div>
                <Users className="w-5 h-5 text-blue-500 mb-2" />
                <h4 className="text-[10px] text-app-text-secondary">المستخدمين المسجلين</h4>
                <p className="text-2xl font-black text-white mt-1">٣٤٢ مستخدم</p>
                <span className="text-[8.5px] text-emerald-400 font-mono mt-1 block">▲ +١٢٪ هذا الأسبوع</span>
              </div>

              <div className="bg-app-card border border-app-border p-4 rounded-xl text-right relative overflow-hidden">
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-purple-500/5 rounded-full blur-md"></div>
                <MessageSquare className="w-5 h-5 text-purple-500 mb-2" />
                <h4 className="text-[10px] text-app-text-secondary">إجمالي الرسائل المشفرة</h4>
                <p className="text-2xl font-black text-white mt-1">٤٥,٩٢٠ رسالة</p>
                <span className="text-[8.5px] text-app-text-secondary font-mono mt-1 block">نشط بـ AES-256 نظير لنظير</span>
              </div>
            </div>

            {/* Interactive SVG Sparkline Traffic chart */}
            <div className="bg-app-card border border-app-border rounded-2xl p-4 text-right">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-app-text-secondary font-mono">آخر ٢٤ ساعة</span>
                <span className="text-xs font-bold">حركة الاتصال المزدوج الآمن</span>
              </div>
              <div className="h-28 w-full bg-black/10 rounded-xl p-2 relative flex items-end">
                {/* SVG Area chart with gradients */}
                <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Fill path */}
                  <path 
                    d="M 0 30 Q 15 12, 30 18 T 60 5 T 90 12 T 100 15 L 100 30 L 0 30 Z" 
                    fill="url(#chartGrad)" 
                  />
                  {/* Stroke path */}
                  <path 
                    d="M 0 30 Q 15 12, 30 18 T 60 5 T 90 12 T 100 15" 
                    fill="none" 
                    stroke="#2563EB" 
                    strokeWidth="1.2" 
                  />
                </svg>
                <span className="absolute top-2 right-3 font-mono text-[8.5px] text-blue-400 font-bold">الذروة: ٣٢ مكالمة/ساعة</span>
              </div>
            </div>

            {/* Interactive Registered Users Database Table */}
            <div className="bg-app-card border border-app-border rounded-2xl p-4 space-y-3">
              <span className="text-xs font-black text-white block text-right">سجل إدارة الحسابات النشطة</span>
              <div className="divide-y divide-app-border space-y-2.5 max-h-44 overflow-y-auto pr-1 no-scrollbar text-right">
                {[
                  { name: 'أحمد القحطاني', email: 'ahmed@callme.com', status: 'online', role: 'مشرف النظام' },
                  { name: 'سارة فوزي', email: 'sara@callme.com', status: 'online', role: 'مستخدم آمن' },
                  { name: 'محمد الدوسري', email: 'm.dosari@callme.com', status: 'offline', role: 'مستخدم آمن' },
                  { name: 'عبدالرحمن الشهري', email: 'a.shehri@callme.com', status: 'busy', role: 'مستخدم آمن' }
                ].map((u) => (
                  <div key={u.email} className="pt-2.5 flex items-center justify-between text-xs">
                    <div className="flex gap-1.5 items-center">
                      <button 
                        onClick={() => showToast(`تم إعادة تهيئة مفاتيح أمان ${u.name}`)}
                        className="bg-app-secondary-bg text-app-text-secondary hover:text-white hover:bg-app-secondary-bg px-2.5 py-1 rounded-lg text-[9px] font-bold"
                      >
                        إعادة المفاتيح
                      </button>
                      <button 
                        onClick={() => showToast(`تم تغيير صلاحية ${u.name}`)}
                        className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-2 py-1 rounded-lg text-[9px] font-bold"
                      >
                        {u.role === 'مشرف النظام' ? 'نزع صلاحية' : 'ترقية لمشرف'}
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end font-bold text-white text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'online' ? 'bg-emerald-500' : u.status === 'busy' ? 'bg-amber-500' : 'bg-zinc-500'}`} />
                        <span>{u.name}</span>
                      </div>
                      <span className="text-[9px] text-app-text-secondary font-mono mt-0.5 block">@{u.email.split('@')[0]} ({u.role})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Security Violations / Reports Logs */}
            <div className="bg-app-card border border-app-border rounded-2xl p-4 text-right space-y-3">
              <span className="text-xs font-black text-white block">تقارير انتهاكات أمان الجلسات</span>
              
              <div className="space-y-2 text-xs">
                <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl flex items-center justify-between">
                  <button 
                    onClick={() => showToast("تم إغلاق البلاغ بنجاح")}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-[9px] px-2.5 py-1 rounded"
                  >
                    حظر الجلسة
                  </button>
                  <div>
                    <h5 className="font-bold text-red-400">محاولة دخول عشوائي مكررة (Bruteforce)</h5>
                    <p className="text-[9px] text-app-text-secondary font-mono mt-0.5">المرسل: ip_142.250.74.46 • هدف: admin@callme.com</p>
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl flex items-center justify-between">
                  <button 
                    onClick={() => showToast("تم الفحص والتحقق من التوقيع الرقمي")}
                    className="bg-app-secondary-bg text-app-text-primary font-bold text-[9px] px-2.5 py-1 rounded"
                  >
                    تجاهل التنبيه
                  </button>
                  <div>
                    <h5 className="font-bold text-amber-400">توقيع أمان غير متطابق لشهادة الجلسة</h5>
                    <p className="text-[9px] text-app-text-secondary font-mono mt-0.5">المرسل: sara@callme.com • مفتاح SHA-256 تالف</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 4. PREMIUM COMPREHENSIVE SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-4 max-w-xl mx-auto pb-8 animate-fade-in select-none">
            
            {/* PROFILE HEADER SECTION */}
            <div className="bg-app-card border border-app-border rounded-2xl p-4 flex items-center justify-between shadow-sm dark:shadow-none transition-all duration-200">
              {/* Left action - Edit button */}
              <button 
                onClick={() => {
                  setTempName(profileDisplayName);
                  setTempAvatarColor(profilePhotoColor);
                  setTempProfileEmailPrivacy(emailPrivacy);
                  setTempProfilePhonePrivacy(phonePrivacy);
                  setTempProfileOnlinePrivacy(onlineStatusPrivacy);
                  setTempProfileLastSeenPrivacy(lastSeenPrivacy);
                  setTempProfilePrivacy(profilePrivacy);
                  setIsEditingProfile(true);
                }}
                className="bg-app-primary/10 hover:bg-app-primary/15 text-app-primary text-xs font-bold px-3 py-2 rounded-xl transition-all duration-150 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
              
              {/* Right Profile Info: Avatar + Identity */}
              <div className="flex items-center gap-3 text-right flex-1 min-w-0">
                <div className="relative shrink-0 select-none">
                  {/* Gradient Status Border */}
                  <div className={`w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr ${
                    status === 'online' ? 'from-emerald-500 to-teal-400' : status === 'busy' ? 'from-amber-500 to-orange-400' : 'from-zinc-500 to-zinc-400'
                  }`}>
                    <div className="w-full h-full rounded-full bg-app-card border border-app-card flex items-center justify-center font-bold text-app-text-primary text-lg uppercase overflow-hidden">
                      {profileAvatarUrl ? (
                        <img
                          src={profileAvatarUrl}
                          alt={profileDisplayName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-white text-base font-black ${profilePhotoColor}`}>
                          {profileDisplayName.slice(0, 1)}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Status Ring Indicator Dot */}
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-app-card ${
                    status === 'online' ? 'bg-emerald-500' : status === 'busy' ? 'bg-amber-500' : 'bg-zinc-500'
                  } shadow`} />
                </div>
                
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-app-text-primary truncate flex items-center gap-1 justify-start">
                    {profileDisplayName}
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                  </h4>
                  <p className="text-[10px] font-mono text-app-primary">@{username}</p>
                  <p className="text-[10px] text-app-text-secondary truncate mt-0.5 font-sans leading-relaxed max-w-[200px]">
                    {bio}
                  </p>
                </div>
              </div>
            </div>

            {/* SETTINGS SECTIONS CONTAINER */}
            <div className="space-y-4">
              
              {/* Appearance Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider px-3 block text-right">المظهر (Appearance)</span>
                <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden divide-y divide-app-border shadow-sm dark:shadow-none">
                  {/* Row 1: Theme Select Segmented Bar */}
                  <div className="p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                        <Sun className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-app-text-primary">نمط المظهر</span>
                    </div>
                    
                    <div className="flex bg-app-bg p-0.5 rounded-lg border border-app-border gap-0.5 self-end sm:self-auto w-full sm:w-auto">
                      {[
                        { id: 'light', icon: Sun, label: 'مضيء', color: 'text-amber-500' },
                        { id: 'dark', icon: Moon, label: 'مظلم', color: 'text-indigo-400' },
                        { id: 'system', icon: Laptop, label: 'تلقائي', color: 'text-emerald-500' }
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const active = theme === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTheme(opt.id as any)}
                            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[10px] font-bold transition-all duration-150 cursor-pointer ${
                              active 
                                ? 'bg-app-card text-app-primary shadow-sm scale-[1.02]' 
                                : 'text-app-text-secondary hover:text-app-text-primary'
                            }`}
                          >
                            <Icon className={`w-3 h-3 ${opt.color}`} />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 2: Theme Primary Preset Selector */}
                  <div className="p-3 px-4 flex flex-col justify-between gap-2.5 text-right">
                    <span className="text-[11px] font-bold text-app-text-primary block">اللون الأساسي للسمة</span>
                    <div className="grid grid-cols-6 gap-2 w-full">
                      {[
                        { key: 'pink-light', name: 'وردي ف.', color: '#EC4899' },
                        { key: 'pink-dark', name: 'وردي د.', color: '#DB2777' },
                        { key: 'purple', name: 'بنفسجي', color: '#8B5CF6' },
                        { key: 'blue', name: 'أزرق', color: '#2563EB' },
                        { key: 'red', name: 'أحمر', color: '#EF4444' },
                        { key: 'green', name: 'أخضر', color: '#10B981' }
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => setThemeColor(preset.key as any)}
                          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                            themeColor === preset.key
                              ? 'border-app-primary bg-app-primary/10 text-app-primary font-black scale-102 shadow-sm'
                              : 'border-app-border hover:bg-app-bg text-app-text-secondary'
                          }`}
                        >
                          <div 
                            className="w-3.5 h-3.5 rounded-full border border-black/5 shrink-0 shadow-inner" 
                            style={{ backgroundColor: preset.color }}
                          />
                          <span className="text-[9px] font-bold truncate w-full text-center">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 3: Live Preview Block */}
                  <div className="p-2.5 px-4 bg-app-bg/15">
                    <div className="rounded-xl border border-app-border p-2 bg-app-bg/60 text-right space-y-1">
                      <span className="text-[9px] font-bold text-app-text-secondary block">معاينة السمة الحية</span>
                      <div className="flex items-center justify-between bg-app-card p-1.5 rounded-lg border border-app-border text-xs shadow-sm">
                        <div className="flex items-center gap-1">
                          <span className="bg-app-primary text-white text-[8px] px-1 py-0.5 rounded font-black">متصل</span>
                          <span className="font-mono text-[8px] text-app-text-secondary">@preview</span>
                        </div>
                        <div className="font-bold text-app-text-primary text-[9px]">معاينة واجهة الاتصال</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider px-3 block text-right">التنبيهات والإشعارات (Notifications)</span>
                <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden divide-y divide-app-border shadow-sm dark:shadow-none">
                  <div className="p-3 px-4 flex items-center justify-between text-right">
                    {/* Left toggle button */}
                    <button
                      onClick={handleSoundToggle}
                      className={`w-9 h-5.5 rounded-full p-0.5 transition-all duration-200 cursor-pointer flex items-center ${enableSoundEffects ? 'bg-app-primary justify-end' : 'bg-app-secondary-bg justify-start'}`}
                    >
                      <motion.div 
                        layout
                        className="w-4.5 h-4.5 rounded-full bg-white shadow"
                      />
                    </button>
                    
                    {/* Right label & Icon */}
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                        <Volume2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-app-text-primary block">نغمات رنين ومؤثرات صوتية</span>
                        <span className="text-[9.5px] text-app-text-secondary block">تشغيل نغمات رنين التنبيهات ونقاء الاتصال</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Privacy Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider px-3 block text-right">الخصوصية والأمن (Privacy)</span>
                <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden divide-y divide-app-border shadow-sm dark:shadow-none">
                  
                  {/* Who can call me */}
                  <div className="p-3 px-4 flex items-center justify-between text-right">
                    <select
                      value={privacyScope}
                      onChange={(e) => handlePrivacyChange(e.target.value)}
                      className="bg-app-bg border border-app-border rounded-lg text-[10.5px] font-bold px-2 py-1 text-app-text-primary text-left focus:outline-none cursor-pointer"
                    >
                      <option value="all">للجميع</option>
                      <option value="contacts">جهات الاتصال</option>
                      <option value="none">لا أحد</option>
                    </select>
                    
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-app-text-primary block">من يمكنه مكالمتي؟</span>
                        <span className="text-[9.5px] text-app-text-secondary block">تصفية وحظر المكالمات الواردة</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Privacy */}
                  <div className="p-3 px-4 flex items-center justify-between text-right">
                    <select
                      value={emailPrivacy}
                      onChange={(e: any) => {
                        const val = e.target.value;
                        setEmailPrivacy(val);
                        localStorage.setItem('callme_email_privacy', val);
                        showToast("تم تحديث خصوصية البريد الإلكتروني");
                      }}
                      className="bg-app-bg border border-app-border rounded-lg text-[10.5px] font-bold px-2 py-1 text-app-text-primary text-left focus:outline-none cursor-pointer"
                    >
                      <option value="show">الجميع</option>
                      <option value="contacts">جهات الاتصال</option>
                      <option value="me">أنا فقط</option>
                      <option value="hide">مخفي تماماً</option>
                    </select>
                    
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-app-text-primary block">خصوصية البريد الإلكتروني</span>
                        <span className="text-[9.5px] text-app-text-secondary block">ظهور بريدك في ملف التعريف</span>
                      </div>
                    </div>
                  </div>

                  {/* Phone Privacy */}
                  <div className="p-3 px-4 flex items-center justify-between text-right">
                    <select
                      value={phonePrivacy}
                      onChange={(e: any) => {
                        const val = e.target.value;
                        setPhonePrivacy(val);
                        localStorage.setItem('callme_phone_privacy', val);
                        showToast("تم تحديث خصوصية رقم الهاتف");
                      }}
                      className="bg-app-bg border border-app-border rounded-lg text-[10.5px] font-bold px-2 py-1 text-app-text-primary text-left focus:outline-none cursor-pointer"
                    >
                      <option value="show">الجميع</option>
                      <option value="contacts">جهات الاتصال</option>
                      <option value="me">أنا فقط</option>
                      <option value="hide">مخفي تماماً</option>
                    </select>
                    
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500 shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-app-text-primary block">خصوصية رقم الهاتف</span>
                        <span className="text-[9.5px] text-app-text-secondary block">ظهور رقم الهاتف للمستخدمين</span>
                      </div>
                    </div>
                  </div>

                  {/* Last Seen Privacy */}
                  <div className="p-3 px-4 flex items-center justify-between text-right">
                    <select
                      value={lastSeenPrivacy}
                      onChange={(e: any) => {
                        const val = e.target.value;
                        setLastSeenPrivacy(val);
                        localStorage.setItem('callme_last_seen_privacy', val);
                        showToast("تم تحديث خصوصية حالة ظهورك");
                      }}
                      className="bg-app-bg border border-app-border rounded-lg text-[10.5px] font-bold px-2 py-1 text-app-text-primary text-left focus:outline-none cursor-pointer"
                    >
                      <option value="all">الجميع</option>
                      <option value="contacts">جهات اتصالي</option>
                      <option value="none">لا أحد</option>
                    </select>
                    
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-app-text-primary block">خصوصية حالة النشاط</span>
                        <span className="text-[9.5px] text-app-text-secondary block">تحديد من يمكنه رؤية آخر ظهور لك</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Specs Info Banner */}
                  <div className="p-3 px-4 flex items-start gap-3 text-right bg-app-bg/5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-app-text-primary block">تشفير تام نظير لنظير (Secure WebRTC)</span>
                      <p className="text-[9px] text-app-text-secondary leading-relaxed mt-0.5">
                        جميع مكالمات ووسائط CallMe مشفرة بالكامل بين الطرفين مباشر ولا تعبر أي خوادم وسيطة لضمان سرية محادثاتك.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Settings Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider px-3 block text-right">إعدادات الدردشة واللغة (Chat Settings)</span>
                <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden divide-y divide-app-border shadow-sm dark:shadow-none">
                  
                  {/* Camera Filter toggle */}
                  <div className="p-3 px-4 flex items-center justify-between text-right">
                    <button
                      onClick={handleCamToggle}
                      className={`w-9 h-5.5 rounded-full p-0.5 transition-all duration-200 cursor-pointer flex items-center ${enableSmartCamFilter ? 'bg-app-primary justify-end' : 'bg-app-secondary-bg justify-start'}`}
                    >
                      <motion.div 
                        layout
                        className="w-4.5 h-4.5 rounded-full bg-white shadow"
                      />
                    </button>
                    
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 shrink-0">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-app-text-primary block">مفلتر الكاميرا الذكي</span>
                        <span className="text-[9.5px] text-app-text-secondary block">محاكاة بث مرئي تلقائي لحماية الخصوصية</span>
                      </div>
                    </div>
                  </div>

                  {/* Language Selector */}
                  <div className="p-3 px-4 flex items-center justify-between text-right">
                    <div className="flex bg-app-bg p-0.5 rounded-lg border border-app-border gap-0.5">
                      <button
                        onClick={() => handleLanguageChange('ar')}
                        className={`px-2.5 py-1 text-[9.5px] font-bold rounded-md transition-all duration-150 cursor-pointer ${appLanguage === 'ar' ? 'bg-app-card text-app-primary shadow-sm' : 'text-app-text-secondary hover:text-app-text-primary'}`}
                      >
                        العربية
                      </button>
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`px-2.5 py-1 text-[9.5px] font-bold rounded-md transition-all duration-150 cursor-pointer ${appLanguage === 'en' ? 'bg-app-card text-app-primary shadow-sm' : 'text-app-text-secondary hover:text-app-text-primary'}`}
                      >
                        English
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-app-text-primary block">لغة واجهة التطبيق</span>
                        <span className="text-[9.5px] text-app-text-secondary block">تغيير لغة العرض ونصوص الواجهة</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calls Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider px-3 block text-right">إحصائيات الاتصال والشبكة (Calls)</span>
                <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden divide-y divide-app-border shadow-sm dark:shadow-none">
                  <div className="p-3.5 px-4 text-right space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-app-text-primary">إحصائيات المكالمات الجارية</span>
                      <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-app-bg p-2 rounded-xl border border-app-border">
                        <h6 className="text-[9px] text-app-text-secondary font-bold">المكالمات</h6>
                        <p className="text-sm font-black text-app-text-primary mt-0.5">{stats.totalLogs}</p>
                      </div>
                      <div className="bg-app-bg p-2 rounded-xl border border-app-border">
                        <h6 className="text-[9px] text-app-text-secondary font-bold">صوتية</h6>
                        <p className="text-sm font-black text-app-primary mt-0.5">{stats.voiceCalls}</p>
                      </div>
                      <div className="bg-app-bg p-2 rounded-xl border border-app-border">
                        <h6 className="text-[9px] text-app-text-secondary font-bold">مرئية</h6>
                        <p className="text-sm font-black text-emerald-500 mt-0.5">{stats.videoCalls}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Storage Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider px-3 block text-right">الوسائط وحجم التخزين (Storage)</span>
                <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden divide-y divide-app-border shadow-sm dark:shadow-none">
                  <div className="p-3.5 px-4 text-right space-y-2.5">
                    <span className="text-xs font-bold text-app-text-primary block">الوسائط والملفات المشتركة</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div 
                        onClick={() => showToast("لا توجد صور مشتركة")}
                        className="bg-app-bg hover:bg-app-secondary-bg/20 border border-app-border p-2 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 active:scale-98"
                      >
                        <ImageIcon className="w-4 h-4 text-blue-500 mb-1" />
                        <span className="text-[10px] text-app-text-primary font-bold">الصور (٠)</span>
                      </div>
                      <div 
                        onClick={() => showToast("لا توجد مستندات مشتركة")}
                        className="bg-app-bg hover:bg-app-secondary-bg/20 border border-app-border p-2 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 active:scale-98"
                      >
                        <FileText className="w-4 h-4 text-purple-500 mb-1" />
                        <span className="text-[10px] text-app-text-primary font-bold">المستندات (٠)</span>
                      </div>
                      <div 
                        onClick={() => showToast("لا توجد صوتيات مشتركة")}
                        className="bg-app-bg hover:bg-app-secondary-bg/20 border border-app-border p-2 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 active:scale-98"
                      >
                        <Music className="w-4 h-4 text-emerald-500 mb-1" />
                        <span className="text-[10px] text-app-text-primary font-bold">الصوتيات (٠)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider px-3 block text-right">معلومات التطبيق والدعم (About)</span>
                <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden divide-y divide-app-border shadow-sm dark:shadow-none">
                  
                  {/* Version info */}
                  <div className="p-3 px-4 flex items-center justify-between text-right">
                    <div className="flex items-center gap-1.5 text-app-primary">
                      <span className="text-[10.5px] font-bold bg-app-primary/10 px-2 py-0.5 rounded-full">v1.4.0 (مستقر)</span>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-app-text-primary block">إصدار منصة CallMe</span>
                        <span className="text-[9.5px] text-app-text-secondary block">مبني وفق أحدث تقنيات الويب والأمان</span>
                      </div>
                    </div>
                  </div>

                  {/* Dev Panel Link if Unlocked */}
                  {developerModeUnlocked && (
                    <div className="p-3 px-4 flex items-center justify-between text-right">
                      <button
                        onClick={() => setActiveTab('admin')}
                        className="bg-purple-600/10 hover:bg-purple-600/15 text-purple-500 text-[10px] font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        فتح لوحة التحكم
                      </button>
                      <span className="text-xs font-bold text-app-text-primary">لوحة تحكم المطور</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="w-full bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-500 rounded-xl py-2.5 text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج من الحساب</span>
              </button>

            </div>

          </div>
        )}

      </main>

      {/* Bottom Floating Navigation Tab bar */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40 pointer-events-none">
        <div className="max-w-md mx-auto bg-app-card/85 backdrop-blur-xl border border-app-border rounded-2xl p-2 flex justify-around items-center pointer-events-auto shadow-2xl">
          
          <button
            onClick={() => { setActiveTab('users'); setSwipedUserId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition duration-150 cursor-pointer ${
              activeTab === 'users' ? 'text-app-primary font-bold' : 'text-app-text-secondary hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[9px] font-bold">المتصلون</span>
            {activeTab === 'users' && <div className="w-1 h-1 bg-app-primary rounded-full"></div>}
          </button>

          <button
            onClick={() => { setActiveTab('logs'); setSwipedUserId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition duration-150 cursor-pointer ${
              activeTab === 'logs' ? 'text-app-primary font-bold' : 'text-app-text-secondary hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[9px] font-bold">السجل</span>
            {activeTab === 'logs' && <div className="w-1 h-1 bg-app-primary rounded-full"></div>}
          </button>

          {developerModeUnlocked && (
            <button
              onClick={() => { setActiveTab('admin'); setSwipedUserId(null); }}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 transition duration-150 cursor-pointer ${
                activeTab === 'admin' ? 'text-app-primary font-bold' : 'text-app-text-secondary hover:text-white'
              }`}
            >
              <Cpu className="w-5 h-5" />
              <span className="text-[9px] font-bold">الإدارة</span>
              {activeTab === 'admin' && <div className="w-1 h-1 bg-app-primary rounded-full"></div>}
            </button>
          )}

          <button
            onClick={() => { setActiveTab('profile'); setSwipedUserId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition duration-150 cursor-pointer ${
              activeTab === 'profile' ? 'text-app-primary font-bold' : 'text-app-text-secondary hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-bold">الملف</span>
            {activeTab === 'profile' && <div className="w-1 h-1 bg-app-primary rounded-full"></div>}
          </button>

          <button
            onClick={() => { setActiveTab('settings'); setSwipedUserId(null); }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 transition duration-150 cursor-pointer ${
              activeTab === 'settings' ? 'text-app-primary font-bold' : 'text-app-text-secondary hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[9px] font-bold">الإعدادات</span>
            {activeTab === 'settings' && <div className="w-1 h-1 bg-app-primary rounded-full"></div>}
          </button>

        </div>
      </div>

      {/* Active Chat Screen Overlay */}
      <AnimatePresence>
        {activeChatUser && (
          <ChatScreen
            myEmail={myEmail}
            myName={myName}
            chatUser={activeChatUser}
            onBack={() => setActiveChatUser(null)}
            onInitiateCall={onInitiateCall}
          />
        )}
      </AnimatePresence>

      {/* Floating System Toast Messages */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-app-secondary-bg border border-white/10 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-[99] text-right"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
