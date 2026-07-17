import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, MessageSquare, PhoneCall, Radio, Settings, Shield, AlertOctagon, 
  Database, HardDrive, Wifi, LogOut, Search, Filter, Trash2, Edit3, 
  Ban, ShieldAlert, CheckCircle, RefreshCw, Send, Sliders, Info, MoreVertical,
  Activity, ArrowDown, ArrowUp, Sun, Moon, Eye, Clock, Key
} from 'lucide-react';
import { API_BASE, safeFetch } from '../config';

interface AdminDashboardProps {
  admin: { username: string; role: string };
  onLogout: () => void;
}

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'messages' | 'calls' | 'reports' | 'notifications' | 'security' | 'settings'>('overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // States for backend data
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    onlineUsers: 0,
    offlineUsers: 0,
    totalMessages: 0,
    voiceCalls: 0,
    videoCalls: 0,
    filesShared: 0,
    storageUsage: '0 MB',
    serverStatus: 'offline',
    databaseStatus: 'offline',
    uptime: 0
  });

  const [usersList, setUsersList] = useState<any[]>([]);
  const [messagesList, setMessagesList] = useState<any[]>([]);
  const [callsList, setCallsList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [securityLogs, setSecurityLogs] = useState<any>({
    loginHistory: [],
    auditLogs: [],
    securityEvents: []
  });
  const [appSettings, setAppSettings] = useState<any>({
    appName: 'CallMe',
    appVersion: '1.4.0',
    maintenanceMode: false,
    maxUploadSize: 50,
    storageProvider: 'Local Memory Store',
    privacyLevel: 'Strict Peer-to-Peer'
  });

  // UI state managers
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'online' | 'offline' | 'banned'>('all');
  const [userSortField, setUserSortField] = useState<'name' | 'email' | 'lastSeen'>('name');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 6;

  // Selected entities for detailed models / slide overs
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDetailsUserModal, setShowDetailsUserModal] = useState(false);

  // Broadcast Compose State
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'custom'>('all');
  const [selectedBroadcastEmails, setSelectedBroadcastEmails] = useState<string[]>([]);
  const [broadcastSuccessMessage, setBroadcastSuccessMessage] = useState('');

  // Toast Notification state
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Authenticated fetch wrapper that automatically injects the admin token
  const adminFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('callme_admin_token') || '';
    const headers = {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    };
    const cleanUrl = url.startsWith('/api') 
      ? `${API_BASE}${url.substring(4)}` 
      : `${API_BASE}${url}`;
    const res = await safeFetch(cleanUrl, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      showToast('جلسة العمل انتهت أو غير مصرح لك بالوصول. جاري تحويلك...', 'error');
      setTimeout(() => {
        onLogout();
      }, 1500);
      throw new Error('Unauthorized');
    }
    return res;
  };

  // Main Fetcher
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch Stats
      const statsRes = await adminFetch('/api/admin/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Fetch Users
      const usersRes = await adminFetch('/api/admin/users');
      if (usersRes.ok) setUsersList(await usersRes.json());

      // 3. Fetch Messages
      const messagesRes = await adminFetch('/api/admin/messages');
      if (messagesRes.ok) setMessagesList(await messagesRes.json());

      // 4. Fetch Calls
      const callsRes = await adminFetch('/api/admin/calls');
      if (callsRes.ok) setCallsList(await callsRes.json());

      // 5. Fetch Reports
      const reportsRes = await adminFetch('/api/admin/reports');
      if (reportsRes.ok) setReportsList(await reportsRes.json());

      // 6. Fetch Security Logs
      const logsRes = await adminFetch('/api/admin/security/logs');
      if (logsRes.ok) setSecurityLogs(await logsRes.json());

      // 7. Fetch Settings
      const settingsRes = await adminFetch('/api/admin/settings');
      if (settingsRes.ok) setAppSettings(await settingsRes.json());

    } catch (e) {
      console.error('Error fetching admin data:', e);
      showToast('حدث خطأ في تحميل البيانات من الخادم', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Polling loop for REALTIME updates
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(true);
    }, 5000); // Poll every 5 seconds for live counters
    return () => clearInterval(interval);
  }, []);

  // Update User action handler
  const handleUpdateUser = async (updatedFields: any) => {
    try {
      const res = await adminFetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUser.email,
          adminUsername: admin.username,
          ...updatedFields
        })
      });

      if (res.ok) {
        showToast('تم تحديث بيانات المستخدم بنجاح');
        setShowEditUserModal(false);
        setSelectedUser(null);
        fetchData(true);
      } else {
        const d = await res.json();
        showToast(d.error || 'فشل تحديث المستخدم', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  // Toggle user Ban status directly
  const handleToggleBanUser = async (targetUser: any) => {
    const isCurrentlyBanned = targetUser.isBanned;
    try {
      const res = await adminFetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetUser.email,
          isBanned: !isCurrentlyBanned,
          adminUsername: admin.username
        })
      });

      if (res.ok) {
        showToast(isCurrentlyBanned ? 'تم فك حظر المستخدم' : 'تم حظر المستخدم بنجاح');
        fetchData(true);
      } else {
        showToast('فشل تعديل حالة الحظر', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Delete User action
  const handleDeleteUser = async (email: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الحساب ${email} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    try {
      const res = await adminFetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, adminUsername: admin.username })
      });

      if (res.ok) {
        showToast('تم حذف الحساب بالكامل من قواعد البيانات');
        setSelectedUser(null);
        setShowDetailsUserModal(false);
        fetchData(true);
      } else {
        showToast('فشل حذف حساب المستخدم', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Delete Message Action
  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً من سجلات المحادثة؟')) return;
    try {
      const res = await adminFetch('/api/admin/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msgId, adminUsername: admin.username })
      });

      if (res.ok) {
        showToast('تم حذف الرسالة بنجاح');
        fetchData(true);
      } else {
        showToast('فشل حذف الرسالة', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Update Report (Mark as Solved / Pending)
  const handleUpdateReportStatus = async (reportId: string, newStatus: 'pending' | 'solved') => {
    try {
      const res = await adminFetch('/api/admin/reports/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status: newStatus, adminUsername: admin.username })
      });

      if (res.ok) {
        showToast('تم تحديث حالة البلاغ بنجاح');
        fetchData(true);
      } else {
        showToast('فشل التحديث', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Delete Report
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('هل تريد حذف هذا البلاغ نهائياً؟')) return;
    try {
      const res = await adminFetch('/api/admin/reports/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, adminUsername: admin.username })
      });

      if (res.ok) {
        showToast('تم حذف سجل البلاغ');
        fetchData(true);
      } else {
        showToast('فشل حذف البلاغ', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Broadcast Submission
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) {
      showToast('الرجاء إدخال نص الإعلان الإداري أولاً', 'error');
      return;
    }

    try {
      const res = await adminFetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: broadcastText,
          targetEmails: broadcastTarget === 'custom' ? selectedBroadcastEmails : [],
          adminUsername: admin.username
        })
      });

      if (res.ok) {
        const d = await res.json();
        showToast(`تم بث الإعلان بنجاح إلى ${d.count} مستخدم`);
        setBroadcastText('');
        setSelectedBroadcastEmails([]);
        setBroadcastSuccessMessage(`تم بنجاح إرسال الإشعار لـ ${d.count} مستخدم نشط.`);
        setTimeout(() => setBroadcastSuccessMessage(''), 5000);
        fetchData(true);
      } else {
        showToast('فشل بث الإعلان', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال', 'error');
    }
  };

  // Update System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminFetch('/api/admin/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appSettings,
          adminUsername: admin.username
        })
      });

      if (res.ok) {
        showToast('تم حفظ تفضيلات وإعدادات النظام بنجاح');
        fetchData(true);
      } else {
        showToast('فشل تعديل الإعدادات', 'error');
      }
    } catch (e) {
      showToast('خطأ في حفظ الإعدادات', 'error');
    }
  };

  // Helper formatting values
  const formatTime = (timestamp: number) => {
    if (!timestamp) return 'لم يسجل دخول';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString('ar-SA');
  };

  // Users Filter & Search pipeline
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.username?.toLowerCase().includes(userSearch.toLowerCase());
    
    if (userFilter === 'online') return matchesSearch && u.status === 'online';
    if (userFilter === 'offline') return matchesSearch && u.status === 'offline';
    if (userFilter === 'banned') return matchesSearch && u.isBanned;
    return matchesSearch;
  }).sort((a, b) => {
    let multiplier = userSortOrder === 'asc' ? 1 : -1;
    if (userSortField === 'name') return a.name.localeCompare(b.name) * multiplier;
    if (userSortField === 'email') return a.email.localeCompare(b.email) * multiplier;
    if (userSortField === 'lastSeen') return (a.lastSeen - b.lastSeen) * multiplier;
    return 0;
  });

  // User list pagination
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#09090B] text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`} dir="rtl">
      
      {/* Top Controls Banner / Header */}
      <header className={`px-6 py-3.5 border-b flex items-center justify-between transition-colors duration-300 ${
        theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        {/* Logo and Server State */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight">لوحة تحكم المشرف</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-emerald-500">الخادم متصل ونشط (نظام WebRTC نظير لنظير)</p>
            </div>
          </div>
        </div>

        {/* Center refreshing visual */}
        <div className="flex items-center gap-2">
          {refreshing && (
            <div className="flex items-center gap-1.5 text-blue-500 text-[10px] font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>مزامنة فورية...</span>
            </div>
          )}
        </div>

        {/* Right side controls: Profile, Theme, Logout */}
        <div className="flex items-center gap-3">
          {/* Admin Tag */}
          <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 ${
            theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>{admin.username}</span>
            <span className="text-[9px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-md">
              {admin.role === 'super_admin' ? 'مدير نظام' : 'مراقب'}
            </span>
          </div>

          {/* Theme switch */}
          <button
            id="admin-dashboard-theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-xl border transition-all ${
              theme === 'dark' ? 'bg-[#18181B] border-zinc-800 text-amber-400 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Manual Refresh */}
          <button
            id="admin-dashboard-manual-refresh"
            onClick={() => fetchData()}
            disabled={refreshing}
            className={`p-2 rounded-xl border transition-all ${
              theme === 'dark' ? 'bg-[#18181B] border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Exit admin portal */}
          <button
            id="admin-dashboard-logout"
            onClick={onLogout}
            className="px-3.5 py-2 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Right Sidebar Navigation (Arabic RTL friendly right positioning) */}
        <nav className={`w-64 border-l p-4 flex flex-col gap-1.5 shrink-0 transition-colors duration-300 ${
          theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200'
        }`}>
          <p className={`text-[10px] font-extrabold uppercase tracking-wider px-3.5 mb-2 ${
            theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
          }`}>أقسام النظام الأساسية</p>

          <button
            id="tab-overview"
            onClick={() => { setActiveTab('overview'); setUserPage(1); }}
            className={`w-full py-2.5 px-3.5 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : theme === 'dark' ? 'text-zinc-400 hover:bg-[#1C1C1F] hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-4 h-4" />
              <span>نظرة عامة</span>
            </div>
          </button>

          <button
            id="tab-users"
            onClick={() => { setActiveTab('users'); setUserPage(1); }}
            className={`w-full py-2.5 px-3.5 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : theme === 'dark' ? 'text-zinc-400 hover:bg-[#1C1C1F] hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4" />
              <span>إدارة المستخدمين</span>
            </div>
            {usersList.length > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold ${activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-500'}`}>
                {usersList.length}
              </span>
            )}
          </button>

          <button
            id="tab-messages"
            onClick={() => setActiveTab('messages')}
            className={`w-full py-2.5 px-3.5 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'messages'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : theme === 'dark' ? 'text-zinc-400 hover:bg-[#1C1C1F] hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              <span>الرسائل والوسائط</span>
            </div>
            {messagesList.length > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold ${activeTab === 'messages' ? 'bg-white/20 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                {messagesList.length}
              </span>
            )}
          </button>

          <button
            id="tab-calls"
            onClick={() => setActiveTab('calls')}
            className={`w-full py-2.5 px-3.5 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'calls'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : theme === 'dark' ? 'text-zinc-400 hover:bg-[#1C1C1F] hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <PhoneCall className="w-4 h-4" />
              <span>مراقبة المكالمات</span>
            </div>
            {callsList.length > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold ${activeTab === 'calls' ? 'bg-white/20 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                {callsList.length}
              </span>
            )}
          </button>

          <button
            id="tab-reports"
            onClick={() => setActiveTab('reports')}
            className={`w-full py-2.5 px-3.5 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : theme === 'dark' ? 'text-zinc-400 hover:bg-[#1C1C1F] hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-4 h-4" />
              <span>بلاغات إساءة الاستخدام</span>
            </div>
            {reportsList.filter(r => r.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            id="tab-notifications"
            onClick={() => setActiveTab('notifications')}
            className={`w-full py-2.5 px-3.5 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : theme === 'dark' ? 'text-zinc-400 hover:bg-[#1C1C1F] hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4" />
              <span>البث والتعميمات</span>
            </div>
          </button>

          <div className="my-3 border-t border-dashed border-zinc-800" />
          <p className={`text-[10px] font-extrabold uppercase tracking-wider px-3.5 mb-2 ${
            theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
          }`}>الأمان والإعدادات فنية</p>

          <button
            id="tab-security"
            onClick={() => setActiveTab('security')}
            className={`w-full py-2.5 px-3.5 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'security'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : theme === 'dark' ? 'text-zinc-400 hover:bg-[#1C1C1F] hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4" />
              <span>سجلات الحماية والأمان</span>
            </div>
          </button>

          <button
            id="tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`w-full py-2.5 px-3.5 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-all ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : theme === 'dark' ? 'text-zinc-400 hover:bg-[#1C1C1F] hover:text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span>إعدادات التطبيق العامة</span>
            </div>
          </button>

          {/* Footer branding details */}
          <div className="mt-auto pt-4 text-center">
            <div className={`p-2.5 rounded-xl border text-[9px] flex flex-col gap-1 ${
              theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800 text-zinc-500' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
            }`}>
              <span className="font-bold">CallMe Admin v1.4.0</span>
              <span>تشفير تام نظير لنظير P2P</span>
            </div>
          </div>
        </nav>

        {/* Left Side Main Dashboard Console (Dynamic View Router) */}
        <main className="flex-1 p-6 overflow-y-auto min-w-0">
          
          <AnimatePresence mode="wait">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-zinc-500 font-bold">جاري الاتصال بقاعدة البيانات واسترجاع القياسات الفنية...</p>
              </div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                
                {/* VIEW 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-extrabold tracking-tight">نظرة عامة على النظام والتشخيص المباشر</h2>
                      <div className="text-[10px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-lg font-bold">
                        تحديث تلقائي مستمر كل 5 ثوانٍ
                      </div>
                    </div>

                    {/* Dashboard Metrics grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      
                      {/* Metric Card 1 */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:shadow-md'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500">إجمالي المستخدمين</span>
                          <Users className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-extrabold mt-2 tracking-tight">{stats.totalUsers}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[9px] text-zinc-400">حسابات نشطة مسجلة</span>
                        </div>
                      </div>

                      {/* Metric Card 2 */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:shadow-md'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-500">متصلون الآن</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-2xl font-extrabold mt-2 tracking-tight text-emerald-500">{stats.onlineUsers}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[9px] text-zinc-400">جاهزون لاستقبال الاتصالات</span>
                        </div>
                      </div>

                      {/* Metric Card 3 */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:shadow-md'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500">غير متصلين</span>
                          <span className="w-2 h-2 rounded-full bg-zinc-600" />
                        </div>
                        <p className="text-2xl font-extrabold mt-2 tracking-tight text-zinc-400">{stats.offlineUsers}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[9px] text-zinc-400">في وضع السكون والمبيت</span>
                        </div>
                      </div>

                      {/* Metric Card 4 */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:shadow-md'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500">الرسائل اليوم</span>
                          <MessageSquare className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className="text-2xl font-extrabold mt-2 tracking-tight">{stats.totalMessages}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[9px] text-zinc-400">تدفق فوري ومؤرشف بالكامل</span>
                        </div>
                      </div>

                      {/* Metric Card 5 */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800 hover:border-zinc-700' : 'bg-white border-zinc-200 hover:shadow-md'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500">المكالمات الفعالة</span>
                          <PhoneCall className="w-4 h-4 text-teal-500" />
                        </div>
                        <p className="text-2xl font-extrabold mt-2 tracking-tight text-teal-500">
                          {stats.voiceCalls + stats.videoCalls}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[9px] text-zinc-400">{stats.voiceCalls} صوتية • {stats.videoCalls} فيديو</span>
                        </div>
                      </div>

                    </div>

                    {/* Server Diagnostic Counters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      
                      {/* Diagnostic item 1 */}
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        theme === 'dark' ? 'bg-[#121214]/65 border-zinc-800/80' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <Database className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-bold">حالة قاعدة البيانات</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">سليمة 100%</span>
                      </div>

                      {/* Diagnostic item 2 */}
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        theme === 'dark' ? 'bg-[#121214]/65 border-zinc-800/80' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <HardDrive className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-bold">المساحة المستغلكة</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">{stats.storageUsage}</span>
                      </div>

                      {/* Diagnostic item 3 */}
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        theme === 'dark' ? 'bg-[#121214]/65 border-zinc-800/80' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <Wifi className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold">حالة الخادم المباشر</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">نشط ومستقر</span>
                      </div>

                      {/* Diagnostic item 4 */}
                      <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                        theme === 'dark' ? 'bg-[#121214]/65 border-zinc-800/80' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold">مدة تشغيل النظام</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          {Math.floor(stats.uptime / 60)} دقيقة
                        </span>
                      </div>

                    </div>

                    {/* Premium SVG Line Charts - Professional metrics graph */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      <div className={`p-5 rounded-2xl border col-span-2 ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="text-xs font-bold">إحصائيات الإرسال والمكالمات (ساعة بساعة)</h3>
                            <p className="text-[10px] text-zinc-500 mt-0.5">مقارنة النشاط الفعلي عبر بروتوكول اتصال الـ WebRTC</p>
                          </div>
                          <div className="flex items-center gap-3 text-[9px] font-bold">
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-1 bg-blue-500 rounded-full" />
                              <span>الرسائل</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-1 bg-teal-500 rounded-full" />
                              <span>المكالمات</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Responsive SVG Graph */}
                        <div className="w-full h-44 relative">
                          <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                            {/* Grid Lines */}
                            <line x1="0" y1="20" x2="500" y2="20" stroke="#3F3F46" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                            <line x1="0" y1="60" x2="500" y2="60" stroke="#3F3F46" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />
                            <line x1="0" y1="100" x2="500" y2="100" stroke="#3F3F46" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3" />

                            {/* Line 1: Messages (Blue) */}
                            <path 
                              d="M 10 90 Q 90 40 180 70 T 350 20 T 490 10" 
                              fill="none" 
                              stroke="#3B82F6" 
                              strokeWidth="2.5"
                              strokeLinecap="round" 
                            />
                            {/* Line 2: Calls (Teal) */}
                            <path 
                              d="M 10 110 Q 90 90 180 85 T 350 45 T 490 30" 
                              fill="none" 
                              stroke="#14B8A6" 
                              strokeWidth="2"
                              strokeLinecap="round" 
                            />

                            {/* Node Points */}
                            <circle cx="180" cy="70" r="4" fill="#3B82F6" />
                            <circle cx="350" cy="20" r="4" fill="#3B82F6" />
                            <circle cx="180" cy="85" r="4" fill="#14B8A6" />
                            <circle cx="350" cy="45" r="4" fill="#14B8A6" />
                          </svg>
                          
                          {/* X-axis labels */}
                          <div className="absolute bottom-0 inset-x-0 flex justify-between text-[8px] font-bold text-zinc-500 font-mono px-2 pt-1 border-t border-zinc-800">
                            <span>08:00 صباحاً</span>
                            <span>12:00 ظهراً</span>
                            <span>04:00 عصراً</span>
                            <span>08:00 مساءً</span>
                            <span>الآن</span>
                          </div>
                        </div>
                      </div>

                      {/* Donut Chart - Call Type Distribution */}
                      <div className={`p-5 rounded-2xl border ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <h3 className="text-xs font-bold mb-1">نوع المكالمات المنشأة</h3>
                        <p className="text-[10px] text-zinc-500 mb-4">التوزيع النسبي للمكالمات الصوتية والمرئية</p>

                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              {/* Background Circle */}
                              <circle cx="18" cy="18" r="15.915" fill="none" stroke={theme === 'dark' ? '#27272A' : '#E4E4E7'} strokeWidth="3" />
                              
                              {/* Video segment (60% value) */}
                              <circle 
                                cx="18" 
                                cy="18" 
                                r="15.915" 
                                fill="none" 
                                stroke="#14B8A6" 
                                strokeWidth="3" 
                                strokeDasharray="60 40" 
                                strokeDashoffset="0" 
                              />
                              
                              {/* Voice segment (40% value) */}
                              <circle 
                                cx="18" 
                                cy="18" 
                                r="15.915" 
                                fill="none" 
                                stroke="#3B82F6" 
                                strokeWidth="3" 
                                strokeDasharray="40 60" 
                                strokeDashoffset="60" 
                              />
                            </svg>
                            <div className="absolute text-center">
                              <p className="text-base font-extrabold font-mono text-zinc-200">
                                {stats.voiceCalls + stats.videoCalls}
                              </p>
                              <p className="text-[8px] text-zinc-500 font-bold">مكالمة كليّة</p>
                            </div>
                          </div>

                          <div className="flex gap-4 text-[9px] font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>مكالمات صوتية ({stats.voiceCalls})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-teal-500" />
                              <span>مكالمات فيديو ({stats.videoCalls})</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Quick System Notifications Log */}
                    <div className={`p-4 rounded-2xl border ${
                      theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                      <h3 className="text-xs font-extrabold mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span>آخر الأحداث والعمليات الفنية المنفذة</span>
                      </h3>
                      <div className="space-y-2.5 max-h-44 overflow-y-auto pr-1">
                        {securityLogs.auditLogs.slice(0, 4).map((l: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] font-semibold border-b border-zinc-800/40 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="text-zinc-300">المشرف ({l.adminUsername}) قام بـ: <strong className="text-blue-500 font-bold">{l.action}</strong></span>
                              <span className="text-zinc-500">• {l.details}</span>
                            </div>
                            <span className="text-[9px] text-zinc-500 font-mono">{formatTime(l.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}


                {/* VIEW 2: USER MANAGEMENT */}
                {activeTab === 'users' && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <h2 className="text-base font-extrabold">إدارة وتعديل حسابات المستخدمين المسجلين</h2>
                      
                      {/* Search and filtering row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Search input */}
                        <div className="relative">
                          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-500">
                            <Search className="w-4 h-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="ابحث عن الاسم، البريد، المعرف..."
                            value={userSearch}
                            onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                            className={`pr-8 pl-3 py-2 text-xs rounded-xl border outline-none font-semibold transition-all ${
                              theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white focus:border-blue-500' : 'bg-white border-zinc-200 text-zinc-900 focus:border-blue-500'
                            }`}
                          />
                        </div>

                        {/* Status filter */}
                        <select
                          value={userFilter}
                          onChange={(e: any) => { setUserFilter(e.target.value); setUserPage(1); }}
                          className={`px-3 py-2 text-xs rounded-xl border outline-none font-bold transition-all ${
                            theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                          }`}
                        >
                          <option value="all">جميع الحسابات</option>
                          <option value="online">متصل الآن</option>
                          <option value="offline">غير متصل</option>
                          <option value="banned">الحسابات المحظورة 🚫</option>
                        </select>

                        {/* Sort options */}
                        <select
                          value={`${userSortField}-${userSortOrder}`}
                          onChange={(e) => {
                            const [field, order] = e.target.value.split('-') as [any, any];
                            setUserSortField(field);
                            setUserSortOrder(order);
                            setUserPage(1);
                          }}
                          className={`px-3 py-2 text-xs rounded-xl border outline-none font-bold transition-all ${
                            theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                          }`}
                        >
                          <option value="name-asc">الاسم (أ - ي)</option>
                          <option value="name-desc">الاسم (ي - أ)</option>
                          <option value="email-asc">البريد (أ - ي)</option>
                          <option value="lastSeen-desc">النشاط الأحدث أولاً</option>
                        </select>
                      </div>
                    </div>

                    {/* Users list grid / directory */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {paginatedUsers.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-xs text-zinc-500 font-bold">
                          لم يتم العثور على أي مستخدمين يطابقون خيارات البحث المختارة.
                        </div>
                      ) : (
                        paginatedUsers.map((u, idx) => (
                          <div 
                            key={idx}
                            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                              theme === 'dark' 
                                ? 'bg-[#121214] border-zinc-800 hover:border-zinc-700' 
                                : 'bg-white border-zinc-200 hover:shadow-md'
                            }`}
                          >
                            {/* Ban overlay badge */}
                            {u.isBanned && (
                              <div className="absolute top-2 left-2 bg-red-600/15 border border-red-500/20 text-red-500 text-[8px] font-extrabold px-2 py-0.5 rounded-full">
                                🚫 محظور
                              </div>
                            )}

                            {/* Info */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                {/* Profile circle initials */}
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-extrabold text-sm border border-blue-500/15">
                                  {u.name.substring(0, 1)}
                                </div>
                                <div>
                                  <h3 className="text-xs font-extrabold leading-tight flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {u.status === 'online' ? (
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    ) : (
                                      <span className="w-2 h-2 rounded-full bg-zinc-600" />
                                    )}
                                  </h3>
                                  <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">@{u.username}</p>
                                </div>
                              </div>

                              <div className="space-y-1 text-[10px] text-zinc-400 leading-relaxed font-semibold">
                                <p>📧 البريد: <strong className={theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}>{u.email}</strong></p>
                                <p>📞 الهاتف: <strong className={theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}>{u.phone}</strong></p>
                                <p>⏱ آخر ظهور: <strong className={theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}>{formatTime(u.lastSeen)}</strong></p>
                              </div>
                            </div>

                            {/* Control action buttons */}
                            <div className="mt-4 pt-3 border-t border-zinc-800/40 flex items-center justify-between gap-1">
                              <div className="flex gap-1.5">
                                <button
                                  id={`edit-user-${idx}`}
                                  onClick={() => { setSelectedUser(u); setShowEditUserModal(true); }}
                                  className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
                                  title="تعديل الحساب"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  id={`ban-user-${idx}`}
                                  onClick={() => handleToggleBanUser(u)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    u.isBanned 
                                      ? 'text-emerald-500 hover:bg-emerald-500/10' 
                                      : 'text-red-500 hover:bg-red-500/10'
                                  }`}
                                  title={u.isBanned ? 'فك حظر الحساب' : 'حظر الحساب'}
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                                <button
                                  id={`delete-user-${idx}`}
                                  onClick={() => handleDeleteUser(u.email)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                  title="حذف الحساب نهائياً"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                id={`view-user-${idx}`}
                                onClick={() => { setSelectedUser(u); setShowDetailsUserModal(true); }}
                                className={`text-[9px] font-extrabold px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition-colors ${
                                  theme === 'dark' 
                                    ? 'bg-[#1C1C1F] border-zinc-800 text-zinc-300 hover:bg-zinc-800' 
                                    : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>كامل التفاصيل</span>
                              </button>
                            </div>

                          </div>
                        ))
                      )}
                    </div>

                    {/* Simple Pagination Footer */}
                    {totalUserPages > 1 && (
                      <div className="flex items-center justify-center gap-1.5 mt-6 font-mono text-xs">
                        <button
                          id="user-prev-page"
                          onClick={() => setUserPage(p => Math.max(1, p - 1))}
                          disabled={userPage === 1}
                          className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                            userPage === 1 ? 'opacity-40 cursor-not-allowed' : theme === 'dark' ? 'bg-[#121214] border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          السابق
                        </button>
                        <span className="px-3">صفحة {userPage} من {totalUserPages}</span>
                        <button
                          id="user-next-page"
                          onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                          disabled={userPage === totalUserPages}
                          className={`px-3 py-1.5 rounded-lg border font-bold transition-all ${
                            userPage === totalUserPages ? 'opacity-40 cursor-not-allowed' : theme === 'dark' ? 'bg-[#121214] border-zinc-800 hover:bg-zinc-800' : 'bg-white border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          التالي
                        </button>
                      </div>
                    )}

                  </div>
                )}


                {/* VIEW 3: MESSAGES AND CONVERSATIONS */}
                {activeTab === 'messages' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-extrabold">مراقبة ومراجعة سجلات المحادثات العامة</h2>
                      <p className="text-xs text-zinc-500 font-bold">تمثيل كامل للمراسلات لغايات تدقيق الإساءات</p>
                    </div>

                    {/* Messages audit log */}
                    <div className={`border rounded-2xl overflow-hidden transition-all ${
                      theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                      <div className="p-4 bg-zinc-900/30 border-b border-zinc-800/60 flex items-center justify-between text-xs font-bold text-zinc-400">
                        <span>الرسالة والمحتوى</span>
                        <span>معلومات الأطراف والوقت</span>
                      </div>

                      <div className="divide-y divide-zinc-800/50 max-h-[550px] overflow-y-auto">
                        {messagesList.length === 0 ? (
                          <div className="p-12 text-center text-xs text-zinc-500 font-bold">
                            لا توجد رسائل نشطة حالياً في قواعد البيانات.
                          </div>
                        ) : (
                          messagesList.map((m, idx) => (
                            <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                              
                              {/* Message body */}
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {m.type === 'text' ? (
                                    <span className="text-xs font-extrabold text-blue-500">نصية</span>
                                  ) : (
                                    <span className="text-xs font-extrabold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                                      ملف / وسائط ({m.type})
                                    </span>
                                  )}
                                  <span className="text-[9px] text-zinc-500 font-mono">ID: {m.id}</span>
                                </div>
                                <p className={`text-xs font-medium break-words leading-relaxed ${
                                  theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'
                                }`}>
                                  {m.text || 'مرفق أو تسجيل صوتي مشفر'}
                                </p>
                              </div>

                              {/* Parties info & control */}
                              <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                                <div className="text-right text-[10px] text-zinc-400 font-semibold leading-relaxed">
                                  <p>المرسل: <span className="text-blue-400">{m.sender}</span></p>
                                  <p>المستلم: <span className="text-teal-400">{m.receiver}</span></p>
                                  <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{formatTime(m.timestamp)}</p>
                                </div>

                                <button
                                  id={`delete-message-${idx}`}
                                  onClick={() => handleDeleteMessage(m.id)}
                                  className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                                  title="حذف الرسالة فورياً للكل"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}


                {/* VIEW 4: CALLS MONITORING */}
                {activeTab === 'calls' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-extrabold">سجلات المكالمات والاتصالات المباشرة</h2>
                      <p className="text-xs text-zinc-500 font-bold">متابعة الأداء الفني لمكالمات WebRTC</p>
                    </div>

                    <div className={`border rounded-2xl overflow-hidden transition-all ${
                      theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className={`border-b text-zinc-400 font-bold ${
                            theme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                          }`}>
                            <th className="p-4">نوع المكالمة</th>
                            <th className="p-4">المرسِل / المتصل</th>
                            <th className="p-4">المستقبِل / المتلقي</th>
                            <th className="p-4">حالة الاتصال</th>
                            <th className="p-4">المدة الزمنية</th>
                            <th className="p-4">التاريخ والوقت</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {callsList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-12 text-center text-zinc-500 font-bold">
                                لم تسجل أي مكالمات في الخادم حتى اللحظة.
                              </td>
                            </tr>
                          ) : (
                            callsList.map((c, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                                <td className="p-4 font-bold">
                                  {c.type === 'video' ? (
                                    <span className="text-teal-400 bg-teal-500/10 px-2 py-1 rounded-lg">فيديو مرئي</span>
                                  ) : (
                                    <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">صوتية فقط</span>
                                  )}
                                </td>
                                <td className="p-4">
                                  <p className="font-bold">{c.callerName || c.caller}</p>
                                  <p className="text-[10px] text-zinc-500">{c.caller}</p>
                                </td>
                                <td className="p-4">
                                  <p className="font-bold">{c.calleeName || c.callee}</p>
                                  <p className="text-[10px] text-zinc-500">{c.callee}</p>
                                </td>
                                <td className="p-4">
                                  {c.status === 'completed' && <span className="text-emerald-500 font-bold">✓ ناجحة ومتصلة</span>}
                                  {c.status === 'rejected' && <span className="text-red-500 font-bold">✖ مرفوضة</span>}
                                  {c.status === 'missed' && <span className="text-amber-500 font-bold">⚠ فائتة / لم يرد</span>}
                                </td>
                                <td className="p-4 font-mono font-bold text-zinc-300">
                                  {c.duration ? `${c.duration} ثانية` : '0'}
                                </td>
                                <td className="p-4 text-zinc-400">
                                  {formatTime(c.timestamp)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                {/* VIEW 5: USER REPORTS */}
                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-extrabold">بلاغات إساءة الاستخدام والانتهاكات</h2>
                      <p className="text-xs text-zinc-500 font-bold">حماية أمن المجتمع والتحقق من شكاوى المشتركين</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {reportsList.length === 0 ? (
                        <div className={`p-12 text-center rounded-2xl border text-xs text-zinc-500 font-bold ${
                          theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                        }`}>
                          لا توجد بلاغات مسجلة حالياً في النظام.
                        </div>
                      ) : (
                        reportsList.map((r, idx) => (
                          <div 
                            key={idx}
                            className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                              theme === 'dark' ? 'bg-[#121214] border-zinc-800 hover:border-zinc-800/80' : 'bg-white border-zinc-200 hover:shadow-sm'
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                  r.status === 'pending' ? 'bg-red-500/10 text-red-500 border border-red-500/25' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25'
                                }`}>
                                  {r.status === 'pending' ? '⚠️ قيد المراجعة' : '✓ تم الحل والإغلاق'}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono">بلاغ رقم: {r.id}</span>
                              </div>

                              <p className={`text-xs font-bold leading-relaxed ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                سبب البلاغ الشكوى: <span className="text-amber-500 font-extrabold">"{r.reason}"</span>
                              </p>

                              <div className="flex gap-4 text-[10px] text-zinc-400 font-semibold">
                                <p>مقدّم البلاغ: <strong className="text-blue-400">{r.reporter}</strong></p>
                                <p>المبلغ ضدّه: <strong className="text-red-400">{r.reportedUser}</strong></p>
                                <p>تاريخ البلاغ: <span>{formatTime(r.createdAt)}</span></p>
                              </div>
                            </div>

                            {/* Control block */}
                            <div className="flex items-center gap-2 md:self-center">
                              {r.status === 'pending' ? (
                                <button
                                  id={`solve-report-${idx}`}
                                  onClick={() => handleUpdateReportStatus(r.id, 'solved')}
                                  className="px-3.5 py-2 bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>تحديد كمحلول</span>
                                </button>
                              ) : (
                                <button
                                  id={`unsolve-report-${idx}`}
                                  onClick={() => handleUpdateReportStatus(r.id, 'pending')}
                                  className="px-3.5 py-2 bg-zinc-700/50 text-zinc-400 border border-zinc-600/20 hover:bg-zinc-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                  <span>إعادة فتحه</span>
                                </button>
                              )}

                              <button
                                id={`delete-report-${idx}`}
                                onClick={() => handleDeleteReport(r.id)}
                                className="p-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/10 rounded-xl transition-all cursor-pointer"
                                title="حذف البلاغ تماماً"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}


                {/* VIEW 6: BROADCAST AND ANNOUNCEMENTS */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-extrabold font-sans">بث الإعلانات والتعميمات الإدارية المباشرة</h2>
                      <p className="text-xs text-zinc-500 font-bold">بث رسائل مباشرة إلى حسابات المشتركين عبر الخادم</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Compose area */}
                      <form onSubmit={handleSendBroadcast} className={`p-5 rounded-2xl border space-y-4 md:col-span-2 ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <h3 className="text-xs font-extrabold">منشئ التعميمات الجديد</h3>

                        {broadcastSuccessMessage && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-xl">
                            {broadcastSuccessMessage}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold block text-zinc-400">تحديد فئة المستلمين</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                              <input
                                type="radio"
                                name="b-target"
                                checked={broadcastTarget === 'all'}
                                onChange={() => setBroadcastTarget('all')}
                                className="text-blue-500"
                              />
                              <span>بث لجميع المستخدمين ({usersList.length})</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                              <input
                                type="radio"
                                name="b-target"
                                checked={broadcastTarget === 'custom'}
                                onChange={() => setBroadcastTarget('custom')}
                                className="text-blue-500"
                              />
                              <span>مستهدفين محددين فقط</span>
                            </label>
                          </div>
                        </div>

                        {/* Custom target picker */}
                        {broadcastTarget === 'custom' && (
                          <div className="space-y-1.5 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
                            <label className="text-[10px] font-bold text-zinc-500 block">اختر المستخدمين المستهدفين:</label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pt-1">
                              {usersList.map((u, i) => {
                                const selected = selectedBroadcastEmails.includes(u.email);
                                return (
                                  <button
                                    type="button"
                                    key={i}
                                    id={`select-target-email-${i}`}
                                    onClick={() => {
                                      if (selected) {
                                        setSelectedBroadcastEmails(prev => prev.filter(e => e !== u.email));
                                      } else {
                                        setSelectedBroadcastEmails(prev => [...prev, u.email]);
                                      }
                                    }}
                                    className={`px-2.5 py-1 text-[9px] font-bold rounded-lg border transition-all ${
                                      selected
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'bg-[#1C1C1F] border-zinc-800 text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    {u.name} ({u.email})
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Text body */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold block text-zinc-400">نص الرسالة التعميمية</label>
                          <textarea
                            id="broadcast-textarea"
                            rows={5}
                            placeholder="اكتب هنا إعلان الإدارة العام، سيصل فورياً لجميع المشتركين كرسالة إدارية رسمية..."
                            value={broadcastText}
                            onChange={(e) => setBroadcastText(e.target.value)}
                            className={`w-full p-3 text-xs rounded-xl border outline-none font-medium leading-relaxed transition-all ${
                              theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white focus:border-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-500'
                            }`}
                          />
                        </div>

                        <button
                          type="submit"
                          id="broadcast-submit"
                          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all transform active:scale-95 flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/10"
                        >
                          <Send className="w-4 h-4" />
                          <span>إرسال وبث الإعلان الآن</span>
                        </button>
                      </form>

                      {/* Instructions */}
                      <div className={`p-5 rounded-2xl border space-y-3.5 ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500 shadow-sm'
                      }`}>
                        <h4 className="text-xs font-extrabold text-blue-500">🛡️ سياسة الإعلانات الإدارية</h4>
                        <p className="text-[10px] leading-relaxed">
                          عند إرسال هذا التعميم، سيقوم الخادم ببث الرسالة باسم <strong className="text-zinc-200">system@callme.com</strong> كرسالة تظهر لدى الطرفين بشكل تلقائي وتنبيه مباشر.
                        </p>
                        <p className="text-[10px] leading-relaxed">
                          * يرجى صياغة الإشعار بعناية، وتجنب تكرار الإعلانات العشوائية غير الضرورية لضمان تجربة مستخدم سلسة وممتازة.
                        </p>
                      </div>

                    </div>
                  </div>
                )}


                {/* VIEW 7: SECURITY LOGS */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-extrabold">سجلات التدقيق الأمني ومراقبة الدخول</h2>
                      <p className="text-xs text-zinc-500 font-bold">متابعة دقيقة لعمليات المشرفين والمخاطر السيبرانية</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Sub-table 1: Login History */}
                      <div className={`p-4 rounded-2xl border space-y-3 md:col-span-2 ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <h3 className="text-xs font-extrabold text-blue-500 flex items-center gap-1.5">
                          <Key className="w-4 h-4" />
                          <span>سجل محاولات دخول المشرفين</span>
                        </h3>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-right text-[10px]">
                            <thead>
                              <tr className="border-b border-zinc-800 text-zinc-500 font-bold">
                                <th className="pb-2">اسم المستخدم</th>
                                <th className="pb-2">عنوان الـ IP</th>
                                <th className="pb-2">المتصفح / الجهاز</th>
                                <th className="pb-2">الحالة</th>
                                <th className="pb-2">التاريخ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/40">
                              {securityLogs.loginHistory.map((l: any, i: number) => (
                                <tr key={i} className="hover:bg-white/[0.01]">
                                  <td className="py-2.5 font-bold">{l.username}</td>
                                  <td className="py-2.5 font-mono text-zinc-400">{l.ip}</td>
                                  <td className="py-2.5 text-zinc-500 max-w-[120px] truncate" title={l.device}>{l.device}</td>
                                  <td className="py-2.5 font-bold">
                                    {l.success ? (
                                      <span className="text-emerald-500">✓ ناجحة</span>
                                    ) : (
                                      <span className="text-red-500">✖ فشلت</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 text-zinc-400">{formatTime(l.timestamp)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Sub-table 2: Failed events / threats */}
                      <div className={`p-4 rounded-2xl border space-y-3 ${
                        theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                      }`}>
                        <h3 className="text-xs font-extrabold text-red-500 flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 animate-bounce" />
                          <span>سجل الأحداث الأمنية الخطرة</span>
                        </h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {securityLogs.securityEvents.map((e: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-xl bg-red-600/5 border border-red-500/10 text-[9px] space-y-1.5">
                              <div className="flex justify-between font-bold">
                                <span className="text-red-400">🚨 تهديد {e.severity === 'high' ? 'مرتفع' : 'متوسط'}</span>
                                <span className="text-zinc-500 font-mono">{formatTime(e.timestamp)}</span>
                              </div>
                              <p className="text-zinc-300 leading-relaxed font-semibold">{e.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}


                {/* VIEW 8: GENERAL SETTINGS */}
                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-base font-extrabold">تفضيلات وإعدادات خوادم التطبيق</h2>
                      <p className="text-xs text-zinc-500 font-bold">تعديل بارامترات الاتصال والاستضافة والخصوصية</p>
                    </div>

                    <form onSubmit={handleSaveSettings} className={`p-6 rounded-2xl border space-y-5 max-w-2xl ${
                      theme === 'dark' ? 'bg-[#121214] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Setting 1: App Name */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">اسم التطبيق التجاري</label>
                          <input
                            type="text"
                            value={appSettings.appName}
                            onChange={(e) => setAppSettings({ ...appSettings, appName: e.target.value })}
                            className={`w-full p-2.5 text-xs rounded-xl border outline-none font-bold ${
                              theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                            }`}
                          />
                        </div>

                        {/* Setting 2: Version */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">رقم الإصدار (v)</label>
                          <input
                            type="text"
                            value={appSettings.appVersion}
                            onChange={(e) => setAppSettings({ ...appSettings, appVersion: e.target.value })}
                            className={`w-full p-2.5 text-xs rounded-xl border outline-none font-bold ${
                              theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                            }`}
                          />
                        </div>

                        {/* Setting 3: Max Upload size */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">الحد الأقصى لرفع الملفات (MB)</label>
                          <input
                            type="number"
                            value={appSettings.maxUploadSize}
                            onChange={(e) => setAppSettings({ ...appSettings, maxUploadSize: Number(e.target.value) })}
                            className={`w-full p-2.5 text-xs rounded-xl border outline-none font-mono font-bold ${
                              theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                            }`}
                          />
                        </div>

                        {/* Setting 4: Storage Provider */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">مزود ومخزن الملفات والوسائط</label>
                          <select
                            value={appSettings.storageProvider}
                            onChange={(e) => setAppSettings({ ...appSettings, storageProvider: e.target.value })}
                            className={`w-full p-2.5 text-xs rounded-xl border outline-none font-bold ${
                              theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                            }`}
                          >
                            <option value="Local Memory Store">ذاكرة الخادم المؤقتة (Local RAM)</option>
                            <option value="Google Cloud Storage">Google Cloud Storage (GCP)</option>
                            <option value="AWS S3 Bucket">AWS S3 Bucket Storage</option>
                          </select>
                        </div>

                        {/* Setting 5: Privacy Level */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-zinc-400 block">معيار الخصوصية المتبع</label>
                          <select
                            value={appSettings.privacyLevel}
                            onChange={(e) => setAppSettings({ ...appSettings, privacyLevel: e.target.value })}
                            className={`w-full p-2.5 text-xs rounded-xl border outline-none font-bold ${
                              theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                            }`}
                          >
                            <option value="Strict Peer-to-Peer">Strict P2P (تشفير تام مباشر نظير لنظير)</option>
                            <option value="Encrypted Relay Node">Encrypted Relay (عقد مرور مشفرة TURN/STUN)</option>
                          </select>
                        </div>

                        {/* Setting 6: Maintenance Mode */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <label className="flex items-center gap-2 cursor-pointer select-none py-1.5">
                            <input
                              type="checkbox"
                              checked={appSettings.maintenanceMode}
                              onChange={(e) => setAppSettings({ ...appSettings, maintenanceMode: e.target.checked })}
                              className="w-4 h-4 rounded text-blue-500 border-zinc-800 bg-[#1C1C1F]"
                            />
                            <div>
                              <span className="text-xs font-bold block text-zinc-200">وضع صيانة الخادم ومغادرة المستخدمين</span>
                              <span className="text-[10px] text-zinc-500 font-semibold block">عند تفعيل هذا الخيار، سيقفل التطبيق أمام جميع المشتركين.</span>
                            </div>
                          </label>
                        </div>

                      </div>

                      <div className="pt-4 border-t border-zinc-800 flex justify-end">
                        <button
                          type="submit"
                          id="settings-save-button"
                          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all transform active:scale-95 cursor-pointer shadow-lg shadow-blue-500/10"
                        >
                          حفظ الإعدادات وتعميم التعديل الفني
                        </button>
                      </div>

                    </form>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>

      {/* ======================================================== */}
      {/* DIALOGS AND SLIDE-OVER PANELS */}
      {/* ======================================================== */}

      {/* MODAL 1: EDIT USER INFO SLIDE-OVER */}
      <AnimatePresence>
        {showEditUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
            {/* Closer overlay backdrop */}
            <div className="absolute inset-0" onClick={() => { setSelectedUser(null); setShowEditUserModal(false); }} />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className={`w-full max-w-md h-full relative z-10 p-6 flex flex-col justify-between text-right border-r ${
                theme === 'dark' ? 'bg-[#121214] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="space-y-5 overflow-y-auto pb-4">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-800/50">
                  <h3 className="text-sm font-extrabold text-blue-500">تعديل بيانات المشترك: {selectedUser.name}</h3>
                  <button 
                    id="close-edit-user-modal"
                    onClick={() => { setSelectedUser(null); setShowEditUserModal(false); }}
                    className="text-zinc-500 hover:text-white font-bold text-xs"
                  >
                    إغلاق ✖
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 block">الاسم الكامل للمستخدم</label>
                    <input
                      type="text"
                      id="edit-user-name"
                      defaultValue={selectedUser.name}
                      onBlur={(e) => selectedUser.name = e.target.value}
                      className={`w-full p-2.5 text-xs rounded-xl border outline-none font-bold ${
                        theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                      }`}
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 block">معرّف المستخدم (Username)</label>
                    <input
                      type="text"
                      id="edit-user-username"
                      defaultValue={selectedUser.username}
                      onBlur={(e) => selectedUser.username = e.target.value}
                      className={`w-full p-2.5 text-xs rounded-xl border outline-none font-bold ${
                        theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                      }`}
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 block">رقم الهاتف الجوال</label>
                    <input
                      type="text"
                      id="edit-user-phone"
                      defaultValue={selectedUser.phone}
                      onBlur={(e) => selectedUser.phone = e.target.value}
                      className={`w-full p-2.5 text-xs rounded-xl border outline-none font-bold ${
                        theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                      }`}
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 block">نبذة عامة وحالة الحساب (Bio)</label>
                    <textarea
                      id="edit-user-bio"
                      rows={3}
                      defaultValue={selectedUser.bio}
                      onBlur={(e) => selectedUser.bio = e.target.value}
                      className={`w-full p-2.5 text-xs rounded-xl border outline-none font-medium leading-relaxed ${
                        theme === 'dark' ? 'bg-[#1C1C1F] border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                      }`}
                    />
                  </div>

                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/50 flex gap-2">
                <button
                  id="save-edit-user"
                  onClick={() => handleUpdateUser({
                    name: (document.getElementById('edit-user-name') as HTMLInputElement)?.value,
                    username: (document.getElementById('edit-user-username') as HTMLInputElement)?.value,
                    phone: (document.getElementById('edit-user-phone') as HTMLInputElement)?.value,
                    bio: (document.getElementById('edit-user-bio') as HTMLTextAreaElement)?.value
                  })}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  حفظ البيانات الفنية
                </button>
                <button
                  id="cancel-edit-user"
                  onClick={() => { setSelectedUser(null); setShowEditUserModal(false); }}
                  className="px-4 py-3 bg-zinc-800 text-zinc-400 font-bold text-xs rounded-xl hover:bg-zinc-700 transition"
                >
                  إلغاء
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: USER DETAILS VIEW MODEL */}
      <AnimatePresence>
        {showDetailsUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl text-right space-y-4 ${
                theme === 'dark' ? 'bg-[#121214] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
                <h3 className="text-sm font-extrabold text-blue-500">بطاقة تفاصيل الحساب الكاملة</h3>
                <button 
                  id="close-details-user-modal"
                  onClick={() => { setSelectedUser(null); setShowDetailsUserModal(false); }}
                  className="text-zinc-500 hover:text-zinc-300 font-extrabold text-xs"
                >
                  ✖
                </button>
              </div>

              <div className="space-y-4 pt-1 text-xs">
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-extrabold text-base border border-blue-500/20">
                    {selectedUser.name.substring(0, 1)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">{selectedUser.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-mono">@{selectedUser.username}</p>
                  </div>
                </div>

                <div className="space-y-2 leading-relaxed">
                  <p className="text-zinc-400">📧 البريد الإلكتروني: <strong className="text-zinc-200 font-mono font-semibold">{selectedUser.email}</strong></p>
                  <p className="text-zinc-400">📞 رقم الجوال المحفوظ: <strong className="text-zinc-200 font-semibold">{selectedUser.phone}</strong></p>
                  <p className="text-zinc-400">⏱ حالة التواجد الآن: 
                    {selectedUser.status === 'online' ? (
                      <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md mr-1.5">نشط متصل</span>
                    ) : (
                      <span className="text-zinc-500 bg-zinc-500/10 px-2 py-0.5 rounded-md mr-1.5">غير متصل</span>
                    )}
                  </p>
                  <p className="text-zinc-400">⏱ تاريخ آخر تسجيل دخول: <strong className="text-zinc-300">{formatTime(selectedUser.lastSeen)}</strong></p>
                  <p className="text-zinc-400">📝 نبذة المشترك (Bio): <span className="text-zinc-300 font-medium">"{selectedUser.bio || 'لا توجد نبذة تعريفية.'}"</span></p>
                </div>

                <div className="my-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[10px] text-zinc-400 leading-relaxed">
                  تعتمد اتصالات هذا الحساب كلياً على بروتوكولات تشفير نظير لنظير (P2P). لا يتم تخزين أو تسجيل المكالمات الصوتية والمرئية في أي سيرفرات وسيطة حماية لخصوصية المشتركين.
                </div>

              </div>

              <div className="pt-3 border-t border-zinc-800/40 flex justify-between gap-2">
                <button
                  id="delete-user-details-modal"
                  onClick={() => handleDeleteUser(selectedUser.email)}
                  className="px-4 py-2 bg-red-600/15 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الحساب</span>
                </button>

                <button
                  id="close-user-details-modal"
                  onClick={() => { setSelectedUser(null); setShowDetailsUserModal(false); }}
                  className="px-4 py-2 bg-zinc-800 text-zinc-400 font-bold text-xs rounded-xl hover:bg-zinc-700 transition"
                >
                  موافق، العودة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Box */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={`fixed bottom-6 left-6 px-4 py-3.5 rounded-xl text-xs font-extrabold shadow-2xl z-55 flex items-center gap-2 border ${
              toast.type === 'success' 
                ? 'bg-[#121214] border-emerald-500/30 text-emerald-400' 
                : 'bg-[#121214] border-red-500/30 text-red-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
