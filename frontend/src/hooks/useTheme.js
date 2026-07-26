/**
 * useTheme.js
 * Convenience hook — surfaces theme state and toggle action.
 */
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme, setTheme } from '../store/themeSlice';

/**
 * @returns {{
 *   mode: 'light' | 'dark',
 *   isDark: boolean,
 *   toggle: () => void,
 *   setMode: (mode: 'light'|'dark') => void,
 * }}
 */
const useTheme = () => {
  const dispatch = useDispatch();
  const mode = useSelector((s) => s.theme.mode);

  return {
    mode,
    isDark: mode === 'dark',
    toggle: () => dispatch(toggleTheme()),
    setMode: (m) => dispatch(setTheme(m)),
  };
};

export default useTheme;
