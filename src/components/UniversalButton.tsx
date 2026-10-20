import React from 'react';

interface UniversalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
}

export const UniversalButton: React.FC<UniversalButtonProps> = ({
  children,
  variant = 'primary',
  size = 'lg',
  icon,
  className = '',
  onClick,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-150 active:scale-[0.98] select-none shadow-sm focus:outline-none focus:ring-4';

  const sizeClasses = {
    md: 'min-h-[48px] px-5 py-2.5 text-base',
    lg: 'min-h-[56px] px-6 py-3.5 text-lg',       // 通用設計標準 >=56px
    xl: 'min-h-[64px] px-8 py-4 text-xl sm:text-2xl', // 長輩特大模式
  }[size];

  const variantClasses = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-200 focus:ring-indigo-300',
    secondary:
      'bg-slate-800 hover:bg-slate-900 active:bg-black text-white focus:ring-slate-400',
    success:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-200 focus:ring-emerald-300',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-200 focus:ring-rose-300',
    outline:
      'border-2 border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 focus:ring-slate-200',
  }[variant];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // 支援觸覺震動回饋 (通用無障礙防手抖)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(25);
    }
    onClick?.(e);
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {icon && <span className="mr-2.5 flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
