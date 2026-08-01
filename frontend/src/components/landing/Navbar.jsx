import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { toggleTheme } from '../../store/themeSlice';
import { logout } from '../../store/authSlice';
import { Sun, Moon, Menu, X, Zap, LogOut, LayoutDashboard } from 'lucide-react';

const NAV_LINKS = [
  { label: 'How It Works',   href: '/#how-it-works',                    external: false },
  { label: 'Features',       href: '/#features',                        external: false },
  { label: 'Architecture',   href: '/#architecture',                    external: false },
  { label: 'Pricing',        href: '/#pricing',                         external: false },
  { label: 'Reviews',        href: '/#testimonials',                    external: false },
];

/**
 * Navbar — sticky, blurs on scroll, collapses to hamburger on mobile.
 */
const Navbar = () => {
  const dispatch = useDispatch();
  const mode = useSelector((s) => s.theme.mode);
  const { token, user } = useSelector((s) => s.auth);
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleNavClick = (link) => {
    setMobileOpen(false);
    if (link.external) {
      window.open(link.href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (link.href.startsWith('/#')) {
      const id = link.href.slice(2);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-xl border-b border-zinc-200 dark:border-border-dark shadow-sm dark:shadow-none'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 flex-shrink-0 group"
          >
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-sm group-hover:shadow-accent/40 transition-shadow duration-200">
              <Zap className="w-4.5 h-4.5 text-[#09090B]" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
              Site<span className="text-accent">Mind</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className="px-3.5 py-2 text-sm text-txt-secondary-light dark:text-txt-secondary-dark hover:text-txt-primary-light dark:hover:text-txt-primary-dark transition-colors duration-150 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="p-2 rounded-lg text-txt-secondary-dark hover:text-txt-primary-dark hover:bg-white/5 transition-colors duration-150"
              aria-label="Toggle theme"
            >
              {mode === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {token ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm text-txt-secondary-dark hover:text-txt-primary-dark hover:bg-white/5 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => dispatch(logout())}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm text-txt-secondary-dark hover:text-txt-primary-dark hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/signup"
                  className="px-4 py-2.5 rounded-[14px] bg-accent hover:bg-accent-hover text-[#09090B] text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm hover:shadow-accent/30"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg text-txt-secondary-dark hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-16 inset-x-0 z-40 bg-white/95 dark:bg-[#09090B]/95 backdrop-blur-xl border-b border-zinc-200 dark:border-border-dark lg:hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-txt-secondary-light dark:text-txt-secondary-dark hover:text-txt-primary-light dark:hover:text-txt-primary-dark hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </button>
              ))}
              <div className="mt-3 pt-3 border-t border-border-dark flex flex-col gap-2">
                {token ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="px-3 py-2.5 rounded-lg text-sm font-medium text-txt-primary-dark hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <button
                      onClick={() => { dispatch(logout()); setMobileOpen(false); }}
                      className="px-3 py-2.5 rounded-lg text-sm font-medium text-txt-secondary-dark hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="px-4 py-2.5 rounded-[14px] bg-accent hover:bg-accent-hover text-[#09090B] text-sm font-semibold text-center transition-all"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
