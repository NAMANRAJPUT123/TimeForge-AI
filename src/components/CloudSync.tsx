import React, { useState } from 'react';
import { Cloud, RefreshCw, Key, ArrowUpRight, HelpCircle, CheckCircle } from 'lucide-react';

interface CloudSyncProps {
  syncId: string;
  lastSyncedAt: string | null;
  onInitializeSyncId: (newId: string) => void;
  onSyncPush: () => Promise<void>;
  onSyncPull: (id: string) => Promise<boolean>;
}

export default function CloudSync({
  syncId,
  lastSyncedAt,
  onInitializeSyncId,
  onSyncPush,
  onSyncPull,
}: CloudSyncProps) {
  const [inputSyncId, setInputSyncId] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Helper to generate a random 8-char secure backup ID
  const handleGenerateId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'DG-';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '-';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    onInitializeSyncId(result);
    setMessage({ text: `Backup Sync Key initialized: ${result}`, error: false });
  };

  const handlePush = async () => {
    if (!syncId) return;
    setIsPushing(true);
    setMessage(null);
    try {
      await onSyncPush();
      setMessage({ text: 'Data pushed and backed up successfully to cloud!', error: false });
    } catch (e) {
      setMessage({ text: 'Error backing up to cloud.', error: true });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePullSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = inputSyncId.trim().toUpperCase();
    if (!id) return;

    setIsPulling(true);
    setMessage(null);
    try {
      const success = await onSyncPull(id);
      if (success) {
        setMessage({ text: `Successfully pulled backup and synced with profile: ${id}`, error: false });
        setInputSyncId('');
      } else {
        setMessage({ text: `Failed to restore. Verify Sync Key "${id}" exists in Cloud Firestore.`, error: true });
      }
    } catch (e) {
      setMessage({ text: 'Error downloading backup.', error: true });
    } finally {
      setIsPulling(false);
    }
  };

  return (
    <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-50 dark:border-slate-800/80">
        <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
          <Cloud size={16} />
        </div>
        <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100">
          Multi-Device Backup Sync
        </h3>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 leading-relaxed">
        Sync tasks securely to Firebase Cloud Firestore. Access the exact same schedule and plans on another device by entering your unique backup key.
      </p>

      {/* Profile Active Status */}
      {syncId ? (
        <div className="space-y-3.5">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Sync Key
            </span>
            <span className="block font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {syncId}
            </span>
            {lastSyncedAt && (
              <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Last backed up: {new Date(lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePush}
              disabled={isPushing}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
              id="btn-cloud-push"
            >
              <RefreshCw size={12} className={isPushing ? 'animate-spin' : ''} />
              <span>{isPushing ? 'Backing up...' : 'Back Up Now'}</span>
            </button>
            <button
              onClick={() => onInitializeSyncId('')}
              className="px-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* No active Key: option to generate or restore */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleGenerateId}
              className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
              id="btn-generate-sync"
            >
              <Key size={12} />
              <span>Initialize Cloud Backup Key</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              OR RESTORE
            </span>
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          </div>

          {/* Connect form */}
          <form onSubmit={handlePullSubmit} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="e.g. DG-AB12-XY89"
              value={inputSyncId}
              onChange={(e) => setInputSyncId(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-mono font-bold uppercase placeholder:text-slate-500 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isPulling}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              {isPulling ? 'Restoring...' : 'Restore'}
            </button>
          </form>
        </div>
      )}

      {/* Messages */}
      {message && (
        <div className={`mt-3 p-2.5 rounded-xl text-[11px] font-sans ${message.error ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'}`}>
          <div className="flex gap-1.5 items-start">
            <CheckCircle size={12} className="mt-0.5 flex-shrink-0" />
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
