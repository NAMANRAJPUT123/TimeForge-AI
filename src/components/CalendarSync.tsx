import React, { useState, useEffect } from 'react';
import { Calendar, Check, LogOut, Loader2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { googleSignIn, logout, initAuth, triggerSandboxSignIn } from '../firebase';
import { User } from 'firebase/auth';

interface CalendarSyncProps {
  user: User | null;
  token: string | null;
  onAuthChange: (user: User | null, token: string | null) => void;
}

export default function CalendarSync({ user, token, onAuthChange }: CalendarSyncProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    // Listen for auth state
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        onAuthChange(currentUser, accessToken);
        setIsLoading(false);
      },
      () => {
        onAuthChange(null, null);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [onAuthChange]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setErrorText(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onAuthChange(result.user, result.accessToken);
      }
    } catch (error: any) {
      console.error('Failed to connect Google Calendar:', error);
      const errMsg = error?.message || '';
      if (errMsg.includes('popup-closed-by-user') || errMsg.includes('popup-blocked')) {
        setErrorText('Google sign-in popup was closed or blocked by your browser settings (common in iframe previews).');
      } else {
        setErrorText(error?.message || 'Failed to authenticate Google account. Popups may be blocked.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleActivateSandbox = () => {
    setErrorText(null);
    const result = triggerSandboxSignIn();
    onAuthChange(result.user, result.accessToken);
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    setErrorText(null);
    try {
      await logout();
      onAuthChange(null, null);
    } catch (error) {
      console.error('Failed to sign out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-5 border border-slate-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm flex justify-center items-center py-8">
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    );
  }

  return (
    <div className="p-5 border border-slate-100 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-50 dark:border-slate-800/80">
        <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
          <Calendar size={16} />
        </div>
        <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
          Google Calendar Sync
        </h3>
      </div>

      {!user ? (
        <div className="space-y-3">
          <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 font-medium">
            Connect your Google Calendar to sync task deadlines and AI-generated smart milestone distributions automatically to your personal agenda.
          </p>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all duration-150 disabled:opacity-70"
            id="gsi-login-button"
          >
            {isConnecting ? (
              <Loader2 className="animate-spin text-blue-500" size={16} />
            ) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
            )}
            <span>{isConnecting ? 'Authorizing...' : 'Connect Google Calendar'}</span>
          </button>

          {errorText && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-[11px] space-y-2">
              <div className="flex gap-2 items-start">
                <AlertCircle size={14} className="mt-0.5 text-amber-500 flex-shrink-0" />
                <p className="leading-relaxed font-medium">
                  {errorText}
                </p>
              </div>
              <div className="pt-1.5 border-t border-amber-100/50 dark:border-amber-900/20 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleActivateSandbox}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-1.5 px-3 rounded-lg font-bold text-[10px] cursor-pointer shadow-sm transition-colors"
                >
                  <Sparkles size={11} />
                  <span>Activate Sandbox Demo Mode</span>
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-normal">
                  Alternatively, click <span className="font-semibold text-slate-600 dark:text-slate-300">Open in New Tab</span> in the top-right header to authorize with your live Google Account.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google Account'}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                {(user.displayName || user.email || 'G')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate leading-none mb-0.5">
                {user.displayName || 'Google Account'}
              </p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate leading-none">
                {user.email}
              </p>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1">
            <Check size={12} />
            <span>Authorized to Sync Calendar Events {token === 'demo-sandbox-token-12345' && '(Sandbox Demo)'}</span>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-950 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer border border-slate-100 dark:border-slate-850"
            id="btn-disconnect-google"
          >
            <LogOut size={11} />
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}
