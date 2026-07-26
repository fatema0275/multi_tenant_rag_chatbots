/**
 * useScrolled.js
 * Returns true when the window has been scrolled past a given threshold.
 * Used by the Navbar to activate the blur/border backdrop.
 */
import { useState, useEffect } from 'react';

/**
 * @param {number} [threshold=16] - pixels scrolled before returning true
 * @returns {boolean}
 */
const useScrolled = (threshold = 16) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initialise without waiting for first scroll
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
};

export default useScrolled;
