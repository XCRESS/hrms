import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes, resolving conflicts and handling conditionals.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
