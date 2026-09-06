import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

/**
 * ConfirmModal
 * Reusable modal for destructive actions across the application.
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = true,
  loading = false,
  icon: Icon = AlertTriangle,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={loading ? undefined : onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-[#131318] border border-[#27272A] rounded-[18px] p-6 shadow-2xl overflow-hidden z-10"
          >
            {/* Close Button */}
            {!loading && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Content */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${
                  danger
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="pr-4">
                <h3 className="font-sans font-bold text-base text-white tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#27272A]">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 rounded-[12px] text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm ${
                  danger
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-[#22C55E] hover:bg-[#16A34A]'
                }`}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
