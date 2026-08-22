import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
  onSuccess
}) => {
  if (!isOpen) return null;

  const { login, register, resetPassword } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>(defaultTab);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'forgot') {
        if (!email) throw new Error('Please enter your account email address.');
        await resetPassword(email.trim());
        setSuccessMsg('Password reset link sent to your email address.');
      } else if (tab === 'login') {
        await login(email.trim(), password);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        if (!name || !email || !phone || !password) {
          throw new Error('All fields are required.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await register(name.trim(), email.trim(), phone.trim(), password);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 font-sans">
      <div className="relative bg-[#09090b] border border-zinc-800 text-zinc-100 rounded-lg w-full max-w-md p-5 sm:p-6 shadow-2xl animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 mb-1.5">
            <span className="bg-red-600 text-white font-mono font-black text-[10px] px-1.5 py-0.5 rounded">MEGA</span>
            <span className="text-base font-black tracking-tight text-zinc-100 font-mono">
              CITY <span className="text-red-500">ELECTRONICS</span>
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-100 font-mono uppercase">
            {tab === 'login' ? 'ACCOUNT SIGN IN' : tab === 'register' ? 'CREATE CUSTOMER ACCOUNT' : 'RESET PASSWORD'}
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {tab === 'login'
              ? 'Access your orders, saved addresses, and wishlist'
              : tab === 'register'
              ? 'Sign up for fast checkout and real-time delivery tracking'
              : 'Enter your email to receive a secure password reset link'}
          </p>
        </div>

        {/* Tab switcher */}
        {tab !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded mb-4 text-xs font-mono font-bold border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-1.5 rounded transition ${
                tab === 'login' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              SIGN IN
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-1.5 rounded transition ${
                tab === 'register' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              REGISTER
            </button>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-300 rounded text-xs font-mono mb-3 text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded text-xs font-mono mb-3 text-center">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          {tab === 'register' && (
            <>
              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Kamau"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded py-2 pl-8 pr-2.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Phone Number (M-Pesa / Delivery Calls)</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0712 345 678"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded py-2 pl-8 pr-2.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-mono text-zinc-400 block mb-0.5">Email Address</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. customer@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded py-2 pl-8 pr-2.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
              />
            </div>
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-[11px] font-mono text-zinc-400 block">Password</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="text-[10px] font-mono text-red-400 hover:text-red-300 underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded py-2 pl-8 pr-2.5 text-xs text-zinc-100 outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            id="auth-submit-btn"
            className="w-full bg-red-600 hover:bg-red-500 text-white font-mono font-bold py-2.5 rounded text-xs transition cursor-pointer mt-1"
          >
            {loading
              ? 'PROCESSING...'
              : tab === 'login'
              ? 'SIGN IN'
              : tab === 'register'
              ? 'CREATE ACCOUNT'
              : 'SEND RESET LINK'}
          </button>
        </form>

        {tab === 'forgot' && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError('');
                setSuccessMsg('');
              }}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 underline"
            >
              ← Back to Sign In
            </button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Protected with Supabase Authentication & Row Level Security</span>
        </div>
      </div>
    </div>
  );
};
