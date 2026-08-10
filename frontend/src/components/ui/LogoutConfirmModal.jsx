import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, AlertTriangle, X } from 'lucide-react';

/**
 * LogoutConfirmModal
 * Prompts the user with a confirmation dialog before logging out.
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onConfirm: () => void,
 * }} props
 */
const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-white dark:bg-surface-dark border border-zinc-200 dark:border-border-dark rounded-[20px] p-6 shadow-2xl overflow-hidden z-10"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              id="logout-modal-close"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-txt-secondary-light dark:text-txt-secondary-dark hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header & Content */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="pr-6">
                <h3 className="font-heading font-bold text-lg text-zinc-900 dark:text-white tracking-tight">
                  Confirm Log Out
                </h3>
                <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mt-1.5 leading-relaxed">
                  Are you sure you want to log out of your account? You will need to sign back in to access your dashboard.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-border-dark">
              <button
                type="button"
                id="logout-modal-cancel"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[14px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-txt-primary-light dark:text-txt-primary-dark text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="logout-modal-confirm"
                onClick={() => {
                  onClose();
                  onConfirm();
                }}
                className="px-4 py-2.5 rounded-[14px] bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Yes, Log Out
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LogoutConfirmModal;
