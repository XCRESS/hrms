import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ 
  to, 
  onClick, 
  label = "Back", 
  className = "", 
  variant = "default",
  size = "default"
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  // Variant styles
  const variants = {
    default: "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200",
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-500 hover:bg-gray-600 text-white",
    outline: "border-2 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200",
    ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
  };

  // Size styles
  const sizes = {
    sm: "px-2 py-1 text-sm",
    default: "px-3 py-2 text-sm",
    lg: "px-4 py-2 text-base"
  };

  const variantClasses = variants[variant] || variants.default;
  const sizeClasses = sizes[size] || sizes.default;

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center space-x-2 rounded-lg font-medium 
        transition-all duration-200 hover:shadow-sm focus:outline-none 
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-fit
        ${variantClasses} ${sizeClasses} ${className}
      `}
      type="button"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;