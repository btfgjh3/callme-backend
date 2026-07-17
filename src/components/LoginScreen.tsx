import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, ShieldAlert, Check, ShieldCheck, Key, HelpCircle } from 'lucide-react';
import { API_BASE, safeFetch } from '../config';

interface LoginScreenProps {
  onLoginSuccess: (email: string, name: string) => void;
  onNavigateToAdmin: () => void;
}

export default function LoginScreen({ onLoginSuccess, onNavigateToAdmin }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register states
  const [registerName, setRegisterName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState(1);
  
  // Forgot password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Live password strength
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: 'ضعيف للغاية',
    color: 'bg-zinc-800'
  });

  // Calculate password strength in register
  useEffect(() => {
    if (!registerPassword) {
      setPasswordStrength({ score: 0, label: '', color: 'bg-zinc-800' });
      return;
    }
    let score = 0;
    if (registerPassword.length >= 6) score += 1;
    if (registerPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(registerPassword)) score += 1;
    if (/[0-9]/.test(registerPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(registerPassword)) score += 1;

    let label = 'ضعيف';
    let color = 'bg-rose-500';

    if (score >= 4) {
      label = 'قوي جداً';
      color = 'bg-emerald-500';
    } else if (score >= 3) {
      label = 'قوي';
      color = 'bg-teal-500';
    } else if (score >= 2) {
      label = 'متوسط';
      color = 'bg-amber-500';
    }

    setPasswordStrength({ score, label, color });
  }, [registerPassword]);

  // Validations
  const isValidEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    if (!isValidEmail(loginEmail)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }

    setIsLoading(true);
    try {
      const res = await safeFetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      setSuccess('تم تسجيل الدخول بنجاح! جاري تحويلك...');
      setTimeout(() => {
        onLoginSuccess(data.user.email, data.user.name);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim() || !registerConfirmPassword.trim()) {
      setError('يرجى تعبئة كافة الحقول المطلوبة لإنشاء الحساب');
      return;
    }

    if (registerName.trim().length < 2) {
      setError('الاسم يجب أن يحتوي على حرفين على الأقل');
      return;
    }

    if (!isValidEmail(registerEmail)) {
      setError('يرجى كتابة بريد إلكتروني صحيح');
      return;
    }

    if (registerPassword.length < 6) {
      setError('كلمة المرور يجب أن لا تقل عن 6 أحرف');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);
    try {
      // Store full name combined with handle if needed, or just full name.
      const displayName = registerUsername.trim() 
        ? `${registerName.trim()} (@${registerUsername.trim().replace('@', '')})`
        : registerName.trim();

      const res = await safeFetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: registerEmail, 
          password: registerPassword, 
          name: displayName 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إنشاء الحساب');
      }

      setSuccess('تم إنشاء حسابك بنجاح! جاري تسجيل الدخول...');
      setTimeout(() => {
        onLoginSuccess(data.user.email, data.user.name);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما أثناء تسجيل الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccessMessage('');

    if (!resetEmail.trim() || !isValidEmail(resetEmail)) {
      setError('يرجى إدخال بريد إلكتروني صالح');
      return;
    }

    setIsLoading(true);
    try {
      const res = await safeFetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'البريد الإلكتروني غير مسجل في النظام');
      }

      setResetSuccessMessage(data.message);
    } catch (err: any) {
      setError(err.message || 'فشلت عملية استعادة كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-app-bg text-app-text-primary px-4 relative overflow-hidden font-sans">
      
      {/* Premium subtle glow spots (No high neon contrast, just elegant shadows) */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-zinc-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[440px] flex flex-col space-y-8 z-10 py-12">
        
        {/* Apple Style Centered Minimal Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <motion.div 
            whileHover={{ scale: 0.98 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              const count = logoClickCount + 1;
              setLogoClickCount(count);
              if (count >= 5) {
                onNavigateToAdmin();
                setLogoClickCount(0);
              }
            }}
            className="w-14 h-14 bg-app-secondary-bg border border-app-border rounded-2xl flex items-center justify-center shadow-inner relative cursor-pointer"
          >
            <span className="text-app-text-primary font-bold text-3xl font-sans tracking-tight">C</span>
            <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2563EB] rounded-full animate-pulse"></div>
          </motion.div>
          
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-app-text-primary">
              {activeTab === 'login' ? 'مرحباً بك مجدداً في CallMe' : 'إنشاء حساب جديد في CallMe'}
            </h1>
            <p className="text-xs text-app-text-secondary max-w-sm leading-relaxed">
              تطبيق الاتصالات الآمنة المشفرة نظير إلى نظير (P2P) المعتمد دولياً
            </p>
          </div>
        </div>

        {/* Telegram/Signal Segmented Control */}
        <div className="flex bg-app-secondary-bg p-1 rounded-xl border border-app-border shadow-sm">
          <button
            onClick={() => {
              setActiveTab('login');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'login'
                ? 'bg-app-card text-app-text-primary shadow'
                : 'text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            تسجيل الدخول
          </button>
          
          <button
            onClick={() => {
              setActiveTab('register');
              setError('');
              setSuccess('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
              activeTab === 'register'
                ? 'bg-app-card text-app-text-primary shadow'
                : 'text-app-text-secondary hover:text-app-text-primary'
            }`}
          >
            إنشاء حساب
          </button>
        </div>

        {/* Beautiful notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-red-400 text-xs text-right leading-relaxed"
            >
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-right leading-relaxed"
            >
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-app-secondary-bg rounded-2xl border border-app-border p-6 shadow-xl relative">
          <AnimatePresence mode="wait">
            {activeTab === 'login' ? (
              <motion.form
                key="login-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4 text-right"
              >
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-app-text-secondary mr-1">
                    البريد الإلكتروني
                  </label>
                  <div className="relative rounded-xl border border-app-border bg-app-bg focus-within:border-app-primary/60 focus-within:ring-2 focus-within:ring-app-primary/10 transition duration-150">
                    <span className="absolute inset-y-0 right-4 flex items-center text-app-text-secondary">
                      <Mail className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-transparent text-app-text-primary text-xs pr-11 pl-4 py-3.5 focus:outline-none font-mono text-left"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetModal(true);
                        setResetSuccessMessage('');
                        setError('');
                      }}
                      className="text-xs font-semibold text-app-primary hover:text-app-primary/80 transition cursor-pointer"
                    >
                      نسيت كلمة المرور؟
                    </button>
                    <label className="block text-xs font-medium text-app-text-secondary">
                      كلمة المرور
                    </label>
                  </div>
                  <div className="relative rounded-xl border border-app-border bg-app-bg focus-within:border-app-primary/60 focus-within:ring-2 focus-within:ring-app-primary/10 transition duration-150">
                    <span className="absolute inset-y-0 right-4 flex items-center text-app-text-secondary">
                      <Lock className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-transparent text-app-text-primary text-xs pr-11 pl-12 py-3.5 focus:outline-none font-mono text-left"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 left-4 flex items-center text-app-text-secondary hover:text-app-text-primary cursor-pointer transition"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[54px] bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150 mt-6"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>تسجيل الدخول الآمن</span>
                      <ArrowRight className="w-4 h-4 transform rotate-180" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="register-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4 text-right"
              >
                {/* Premium Interactive Circular Avatar Placeholder */}
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-full bg-app-bg border-2 border-app-border flex items-center justify-center font-bold text-app-primary text-xl shadow-inner overflow-hidden">
                      {registerName ? registerName.charAt(0).toUpperCase() : <User className="w-6 h-6 text-app-text-secondary" />}
                    </div>
                    <span className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-app-secondary-bg shadow"></span>
                  </div>
                  <span className="text-[10px] text-app-text-secondary">هوية CallMe المشفرة التلقائية</span>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-app-text-secondary mr-1">
                    الاسم بالكامل
                  </label>
                  <div className="relative rounded-xl border border-app-border bg-app-bg focus-within:border-app-primary/60 focus-within:ring-2 focus-within:ring-app-primary/10 transition duration-150">
                    <span className="absolute inset-y-0 right-4 flex items-center text-app-text-secondary">
                      <User className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="أدخل اسمك الحقيقي الكامل"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full bg-transparent text-app-text-primary text-xs pr-11 pl-4 py-3.5 focus:outline-none"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-app-text-secondary mr-1">
                    اسم المستخدم (اختياري)
                  </label>
                  <div className="relative rounded-xl border border-app-border bg-app-bg focus-within:border-app-primary/60 focus-within:ring-2 focus-within:ring-app-primary/10 transition duration-150">
                    <span className="absolute inset-y-0 right-4 flex items-center text-app-text-secondary font-mono text-xs pr-1">
                      @
                    </span>
                    <input
                      type="text"
                      placeholder="username"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      className="w-full bg-transparent text-app-text-primary text-xs pr-8 pl-4 py-3.5 focus:outline-none font-mono text-left"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Email address */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-app-text-secondary mr-1">
                    البريد الإلكتروني
                  </label>
                  <div className="relative rounded-xl border border-app-border bg-app-bg focus-within:border-app-primary/60 focus-within:ring-2 focus-within:ring-app-primary/10 transition duration-150">
                    <span className="absolute inset-y-0 right-4 flex items-center text-app-text-secondary">
                      <Mail className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full bg-transparent text-app-text-primary text-xs pr-11 pl-4 py-3.5 focus:outline-none font-mono text-left"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-app-text-secondary mr-1">
                    كلمة المرور
                  </label>
                  <div className="relative rounded-xl border border-app-border bg-app-bg focus-within:border-app-primary/60 focus-within:ring-2 focus-within:ring-app-primary/10 transition duration-150">
                    <span className="absolute inset-y-0 right-4 flex items-center text-app-text-secondary">
                      <Lock className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full bg-transparent text-app-text-primary text-xs pr-11 pl-12 py-3.5 focus:outline-none font-mono text-left"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute inset-y-0 left-4 flex items-center text-app-text-secondary hover:text-app-text-primary cursor-pointer transition"
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {registerPassword && (
                    <div className="pt-2 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-app-text-secondary">قوة كلمة المرور:</span>
                        <span className="font-bold text-app-text-primary">{passwordStrength.label}</span>
                      </div>
                      <div className="h-1 w-full bg-app-border rounded-full overflow-hidden flex gap-0.5">
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'}`}></div>
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-transparent'}`}></div>
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-transparent'}`}></div>
                        <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 4 ? passwordStrength.color : 'bg-transparent'}`}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-app-text-secondary mr-1">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative rounded-xl border border-app-border bg-app-bg focus-within:border-app-primary/60 focus-within:ring-2 focus-within:ring-app-primary/10 transition duration-150">
                    <span className="absolute inset-y-0 right-4 flex items-center text-app-text-secondary">
                      <Lock className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      className="w-full bg-transparent text-app-text-primary text-xs pr-11 pl-12 py-3.5 focus:outline-none font-mono text-left"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 left-4 flex items-center text-app-text-secondary hover:text-app-text-primary cursor-pointer transition"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[54px] bg-app-primary hover:bg-app-primary/90 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors duration-150 mt-6"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>إنشاء هوية CallMe</span>
                      <ArrowRight className="w-4 h-4 transform rotate-180" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer legal credits */}
        <div className="text-center text-[10px] text-app-text-secondary">
          بالاستمرار، توافق على <span className="text-app-text-primary underline cursor-pointer">سياسة التشفير التام</span> و <span className="text-app-text-primary underline cursor-pointer">شروط استخدام CallMe</span>.
        </div>

        {/* Administrative Dashboard Portal Access button (Hidden from normal users) */}
        {(typeof window !== 'undefined' && (window.location.search.includes('admin') || window.location.hash.includes('admin'))) && (
          <div className="text-center pt-2">
            <button
              type="button"
              id="admin-dashboard-access-button"
              onClick={onNavigateToAdmin}
              className="text-[10px] font-extrabold text-zinc-500 hover:text-blue-500 cursor-pointer transition flex items-center justify-center gap-1.5 mx-auto"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>بوابة الإدارة والتحكم الفني</span>
            </button>
          </div>
        )}
      </div>

      {/* Forgot Password iOS Style Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 bg-app-bg/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-app-secondary-bg border border-app-border p-6 rounded-2xl w-full max-w-sm text-right relative shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-2 mb-6">
                <div className="w-12 h-12 bg-app-primary/10 rounded-2xl flex items-center justify-center text-app-primary">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-app-text-primary">استعادة كلمة المرور</h3>
                <p className="text-xs text-app-text-secondary max-w-[260px] leading-relaxed">
                  أدخل بريدك الإلكتروني وسيقوم نظام CallMe بإرسال رابط تعيين كلمة المرور الافتراضية فوراً.
                </p>
              </div>

              {resetSuccessMessage ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-center font-medium leading-relaxed">
                    {resetSuccessMessage}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="w-full bg-app-card hover:bg-app-card/85 text-app-text-primary rounded-xl py-3 text-xs font-semibold cursor-pointer transition-colors duration-150"
                  >
                    العودة لتسجيل الدخول
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-app-text-secondary">
                      البريد الإلكتروني المسجل
                    </label>
                    <div className="relative rounded-xl border border-app-border bg-app-bg focus-within:border-app-primary/60 focus-within:ring-2 focus-within:ring-app-primary/10 transition duration-150">
                      <span className="absolute inset-y-0 right-4 flex items-center text-app-text-secondary">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full bg-transparent text-app-text-primary text-xs pr-11 pl-4 py-3.5 focus:outline-none font-mono text-left"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="flex-1 bg-app-card hover:bg-app-card/85 text-app-text-secondary rounded-xl py-3 text-xs font-semibold cursor-pointer transition-colors duration-150"
                      disabled={isLoading}
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-app-primary hover:bg-app-primary/90 text-white rounded-xl py-3 text-xs font-bold cursor-pointer transition-colors duration-150 flex items-center justify-center"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        'إرسال الرابط'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
