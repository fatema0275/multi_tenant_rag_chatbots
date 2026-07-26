/**
 * cn — className utility
 * Joins class strings, filtering falsy values.
 * Lightweight alternative to clsx for simple cases.
 * @param {...(string|false|null|undefined)} classes
 * @returns {string}
 */
export const cn = (...classes) => classes.filter(Boolean).join(' ');

export default cn;
