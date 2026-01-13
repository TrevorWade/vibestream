import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  active = false,
  ...props 
}) => {
  const baseStyle = "rounded-full font-medium transition-all duration-200 flex items-center justify-center";
  
  const variants = {
    /**
     * Button styling rationale:
     * - We moved the app toward a Spotify-like look (neutral surfaces + green accent).
     * - Keep names the same (primary/secondary/ghost/icon) to avoid touching many call sites.
     * - Primary is “accent button”. Secondary is “surface button”.
     */
    // Teal-blue accent requested by user (hover is a slightly lighter teal).
    primary: "bg-accent hover:bg-[#22d3ee] text-black shadow-lg shadow-black/30",
    secondary: "bg-surfaceElevated hover:bg-surfaceHighlight text-textMain border border-divider",
    ghost: `bg-transparent hover:bg-white/10 ${active ? 'text-accent' : 'text-textSub hover:text-white'}`,
    icon: `hover:scale-110 active:scale-95 ${active ? 'text-accent' : 'text-textMain'}`,
  };

  const sizes = {
    sm: "px-3 py-1 text-xs",
    md: "px-6 py-2 text-sm",
    lg: "px-8 py-3 text-base",
    icon: "p-2",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};
