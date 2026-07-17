import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, User, Lock, Eye, EyeOff, Sun, Moon, HelpCircle } from 'lucide-react';
import { API_BASE, safeFetch } from '../config';

interface AdminLoginProps {
  onLoginSuccess: (adminData: { username: string; role: string; token?: string }) => void;
  onBackToApp: () => void;
}

export default function AdminLogin({ onLoginSuccess, onBackToApp }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Load saved admin username if Remember Me was checked
  useEffect(() => {
    const saved = localStorage.getItem('callme_admin_remembered_username');
    if (saved) {
      setUsername(saved);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await safeFetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('callme_admin_remembered_username', username);
      } else {
        localStorage.removeItem('callme_admin_remembered_username');
      }

      // Save admin session
      localStorage.setItem('callme_admin_username', data.admin.username);
      localStorage.setItem('callme_admin_role', data.admin.role);
      if (data.admin.token) {
        localStorage.setItem('callme_admin_token', data.admin.token);
      }

      onLoginSuccess({
        username: data.admin.username,
        role: data.admin.role,
        token: data.admin.token
      });
    } catch (err) {
      setError('فشل الاتصال بالخادم. يرجى التحقق من الشبكة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center p-4 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#09090B] text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`} dir="rtl">
      
      {/* Floating Theme & Back buttons */}
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          id="admin-theme-toggle"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-2.5 rounded-full border transition-all ${
            theme === 'dark' 
              ? 'bg-[#18181B] border-zinc-800 text-amber-400 hover:bg-zinc-800' 
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button
          id="admin-back-to-app"
          onClick={onBackToApp}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
            theme === 'dark'
              ? 'bg-[#18181B] border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          العودة للتطبيق
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-all ${
          theme === 'dark' 
            ? 'bg-[#121214] border-zinc-800/80' 
            : 'bg-white border-zinc-200'
        }`}
      >
        {/* Header Branding */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 mb-2">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">بوابة مشرف النظام</h2>
          <p className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
            لوحة التحكم والإدارة الفنية لتطبيق CallMe
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2"
              >
                <span>⚠️ {error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold block ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
              اسم المستخدم
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                <User className="w-4 h-4" />
              </span>
              <input
                id="admin-username-input"
                type="text"
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pr-10 pl-4 py-3 text-xs rounded-xl border font-semibold outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-[#1C1C1F] border-zinc-800 text-white focus:border-blue-500 focus:bg-[#202024]'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-500 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className={`text-xs font-bold block ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                كلمة المرور
              </label>
              <button
                type="button"
                id="admin-forgot-password-link"
                onClick={() => setShowForgotModal(true)}
                className="text-[10px] text-blue-500 hover:underline font-bold"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pr-10 pl-10 py-3 text-xs rounded-xl border font-semibold outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-[#1C1C1F] border-zinc-800 text-white focus:border-blue-500 focus:bg-[#202024]'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-blue-500 focus:bg-white'
                }`}
              />
              <button
                type="button"
                id="admin-toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 hover:text-zinc-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="admin-remember-me-checkbox"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={`text-xs ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                تذكر بياناتي
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="admin-login-submit-button"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-xs text-white transition-all transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
              loading 
                ? 'bg-blue-600/50 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/10'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'تسجيل الدخول الآمن'
            )}
          </button>
        </form>

        {/* Warning Badge */}
        <div className={`mt-6 p-3 rounded-xl border text-[10px] flex gap-2 items-start ${
          theme === 'dark' 
            ? 'bg-[#18181B] border-zinc-800 text-zinc-400' 
            : 'bg-zinc-50 border-zinc-200 text-zinc-500'
        }`}>
          <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            هذه المنطقة مخصصة لمشرفي تطبيق CallMe فقط. يتم تسجيل جميع محاولات الدخول وعناوين الـ IP الخاصة بالمشرفين لغايات التدقيق الأمني.
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-2xl p-5 border shadow-2xl text-right space-y-4 ${
                theme === 'dark' ? 'bg-[#121214] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <h3 className="text-sm font-extrabold text-blue-500">إرشادات استعادة حساب المشرف</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                لأسباب أمنية وتوافقاً مع بروتوكولات حماية خوادم CallMe، لا يمكن استعادة كلمة المرور للمشرف تلقائياً من الويب.
              </p>
              
              <div className={`p-3 rounded-xl text-xs space-y-1 leading-relaxed ${
                theme === 'dark' ? 'bg-zinc-900 text-zinc-400' : 'bg-zinc-100 text-zinc-700'
              }`}>
                <p>يرجى مراجعة ملف التهيئة الآمن للخادم أو الاتصال بمسؤول البنية التحتية لإعادة تعيين بيانات المرور الخاصة بك.</p>
              </div>

              <p className={`text-[10px] leading-relaxed ${theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>
                * تذكر الاحتفاظ ببيانات الولوج في مكان آمن ومشفر. يُحظر مشاركة بيانات المشرفين نهائياً.
              </p>

              <button
                id="close-forgot-modal"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2 bg-blue-500 text-white font-bold text-xs rounded-xl hover:bg-blue-600 transition"
              >
                موافق، إغلاق
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
