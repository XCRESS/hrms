import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes and handle conditional classes
 * @param {...string} inputs - Tailwind CSS classes
 * @returns {string} - Merged classes
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
} 