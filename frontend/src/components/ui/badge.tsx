import { ReactNode, HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
}

const Badge = ({ children, className = '', variant = 'default', ...props }: BadgeProps) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
    primary: 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100',
    secondary: 'bg-white text-blue-600 border border-blue-200',
    success: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
    warning: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100',
    error: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100',
  };

  const variantClasses = variants[variant] || variants.default;

  return (
    <span
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export { Badge };
