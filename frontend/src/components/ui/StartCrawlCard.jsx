import React, { useState, useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerCrawl } from '../../store/websiteSlice';
import toast from 'react-hot-toast';
import {
  ChevronDown,
  Loader2,
  Play,
  ShieldAlert,
  Globe,
} from 'lucide-react';

/**
 * StartCrawlCard
 *
 * A self-contained card that lets users choose a registered website from a
 * native <select> (styled to match the dashboard's card system) and trigger a
 * crawl job with a single click.
 *
 * Rules:
 * - Hidden entirely when there are zero registered websites.
 * - Unverified websites appear in the list but are disabled with a tag.
 * - The "Start Crawl" button is disabled until a verified site is chosen.
 * - On success: shows a success toast and updates the site's crawl_status in
 *   Redux state (via the triggerCrawl.fulfilled reducer), no full re-fetch.
 * - On failure: shows an error toast with the actual error message from the
 *   backend (including the "Python bridge unreachable" case).
 *
 * Props: none — reads websites from Redux store directly.
 */
const StartCrawlCard = () => {
  const dispatch = useDispatch();
  const websites = useSelector((s) => s.websites.websites);

  const [selectedId, setSelectedId] = useState('');
  const [crawling, setCrawling] = useState(false);

  // Unique id for label/select association (React 18 useId)
  const selectId = useId();

  // Hide the card entirely when no sites are registered
  if (!websites.length) return null;

  const selectedSite = websites.find((w) => String(w.id) === selectedId);
  const isVerified =
    !selectedSite ||
    !selectedSite.verification_status ||
    selectedSite.verification_status === 'verified' ||
    selectedSite.verification_status === 'pending';

  const canSubmit = selectedId !== '' && isVerified && !crawling;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setCrawling(true);
    const result = await dispatch(triggerCrawl(Number(selectedId)));
    setCrawling(false);

    if (triggerCrawl.fulfilled.match(result)) {
      toast.success(
        result.payload.message || `Crawl started for ${selectedSite?.domain}`
      );
      // Reset dropdown so the user doesn't accidentally double-submit
      setSelectedId('');
    } else {
      toast.error(result.payload || 'Failed to start crawl. Check the activity log.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="rounded-[18px] bg-white dark:bg-surface-dark border border-zinc-100 dark:border-border-dark p-6"
    >
      {/* Card header */}
      <h2 className="font-heading font-semibold text-[15px] text-zinc-900 dark:text-white mb-1">
        Start a Crawl
      </h2>
      <p className="text-xs text-txt-secondary-light dark:text-txt-secondary-dark mb-5">
        Select a registered website and queue an indexing job. Unverified sites are disabled.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5" noValidate>
        <div className="flex gap-3">
          {/* Custom-styled native select */}
          <div className="relative flex-1">
            {/* Prefix icon */}
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10" />

            <select
              id={selectId}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={crawling}
              className={`
                w-full h-11 pl-10 pr-9 rounded-[14px] border appearance-none
                text-sm transition-all duration-200 focus:outline-none cursor-pointer
                bg-zinc-50 dark:bg-[#0E0E12]
                text-txt-primary-light dark:text-txt-primary-dark
                disabled:opacity-50 disabled:cursor-not-allowed
                ${selectedId
                  ? isVerified
                    ? 'border-accent focus:border-accent focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)]'
                    : 'border-amber-400 focus:border-amber-400 focus:shadow-[0_0_0_3px_rgba(251,191,36,0.12)]'
                  : 'border-zinc-200 dark:border-border-dark focus:border-accent focus:shadow-[0_0_0_3px_rgba(34,197,94,0.12)]'
                }
              `}
              aria-label="Select website to crawl"
            >
              <option value="" className="text-zinc-400 dark:text-zinc-500">
                Choose a website...
              </option>

              {websites.map((site) => {
                const verified =
                  !site.verification_status ||
                  site.verification_status === 'verified' ||
                  site.verification_status === 'pending';
                return (
                  <option
                    key={site.id}
                    value={String(site.id)}
                    disabled={!verified}
                    className={`${
                      verified
                        ? 'text-txt-primary-light dark:text-txt-primary-dark'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {site.name ? `${site.name} ` : ''}{site.domain}
                    {!verified ? '  [unverified]' : ''}
                  </option>
                );
              })}
            </select>

            {/* Custom chevron */}
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
          </div>

          {/* Start Crawl button */}
          <button
            type="submit"
            id="start-crawl-submit"
            disabled={!canSubmit}
            className="h-11 px-5 rounded-[14px] bg-accent hover:bg-accent-hover text-white text-sm font-semibold flex items-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] whitespace-nowrap"
          >
            {crawling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Crawl
              </>
            )}
          </button>
        </div>

        {/* Unverified warning hint */}
        <AnimatePresence>
          {selectedId && !isVerified && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-1.5 text-xs font-medium pl-1 text-amber-500 dark:text-amber-400"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              This website hasn't been verified yet. Crawling is disabled until domain registration is complete.
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
};

export default StartCrawlCard;
