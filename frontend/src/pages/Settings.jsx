import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { deleteWebsite } from '../store/websiteSlice';
import { useActiveWebsite } from '../context/ActiveWebsiteContext';
import ConfirmModal from '../components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon,
  User,
  Globe,
  Key,
  Trash2,
  Save,
  Check,
  Shield,
  Loader2,
} from 'lucide-react';

const Settings = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { activeWebsite } = useActiveWebsite();

  const [savingKey, setSavingKey] = useState(false);
  const [apiKey, setApiKey] = useState('sm_live_839f20ab92ef11e29c');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    setSavingKey(true);
    setTimeout(() => {
      setSavingKey(false);
      toast.success('API configuration updated');
    }, 400);
  };

  const handleDeleteWebsite = async () => {
    if (!activeWebsite) return;
    setDeleteLoading(true);
    const result = await dispatch(deleteWebsite(activeWebsite.id));
    setDeleteLoading(false);

    if (deleteWebsite.fulfilled.match(result)) {
      toast.success(`${activeWebsite.domain} removed`);
      setShowDeleteModal(false);
      navigate('/dashboard/websites');
    } else {
      toast.error(result.payload || 'Failed to remove website');
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 sm:p-8 space-y-8 max-w-4xl w-full mx-auto">
      {/* ── Page Title Header ─────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400">
          Manage account preferences, API credentials, and site configurations.
        </p>
      </div>

      {/* ── Account Information ───────────────────────────────── */}
      <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#27272A]">
          <User className="w-4 h-4 text-[#22C55E]" />
          <h2 className="font-heading font-bold text-sm text-white">
            User Profile
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              Full Name
            </span>
            <p className="font-semibold text-white">
              {user?.name || 'Site Owner'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              Email Address
            </span>
            <p className="font-mono text-zinc-300">
              {user?.email || 'user@example.com'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              Account Role
            </span>
            <p className="text-[#22C55E] font-semibold">
              {user?.role || 'Tenant Administrator'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              Security
            </span>
            <p className="text-zinc-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#22C55E]" /> JWT Authentication Active
            </p>
          </div>
        </div>
      </div>

      {/* ── API & Webhook Credentials ─────────────────────────── */}
      <div className="rounded-[18px] bg-[#131318] border border-[#27272A] p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#27272A]">
          <Key className="w-4 h-4 text-[#22C55E]" />
          <h2 className="font-heading font-bold text-sm text-white">
            API Keys &amp; Telemetry
          </h2>
        </div>

        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">
              Publishable SiteMind API Token
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full h-10 px-3.5 rounded-[12px] bg-[#09090B] border border-[#27272A] text-xs font-mono text-white focus:outline-none focus:border-[#22C55E]"
            />
          </div>

          <button
            type="submit"
            disabled={savingKey}
            className="px-4 py-2 rounded-[10px] bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {savingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save API Settings
          </button>
        </form>
      </div>

      {/* ── Active Website Danger Zone ─────────────────────────── */}
      {activeWebsite && (
        <div className="rounded-[18px] bg-[#131318] border border-red-500/20 p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
            <h2 className="font-heading font-bold text-sm text-red-400">
              Danger Zone — {activeWebsite.domain}
            </h2>
            <span className="text-[10px] font-mono text-zinc-500">
              tenant_{activeWebsite.id}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
              Permanently remove this domain, purge its embeddings, and invalidate all chatbot widgets.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-[10px] bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Website
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteWebsite}
        loading={deleteLoading}
        title={`Delete ${activeWebsite?.domain}?`}
        description="This action cannot be undone. All indexed content, configurations, and chat logs will be completely removed."
        confirmText="Yes, Delete Website"
        cancelText="Cancel"
        danger={true}
      />
    </div>
  );
};

export default Settings;
