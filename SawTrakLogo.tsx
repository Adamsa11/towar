import React from 'react';

interface SawTrakLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'dark' | 'light' | 'white';
  className?: string;
  subtitle?: string;
}

export const SawTrakLogo: React.FC<SawTrakLogoProps> = ({
  size = 'md',
  showText = true,
  variant = 'light',
  className = '',
  subtitle,
}) => {
  // Brand Colors from Saw-Trak Brand Book
  const orange = '#F36F21';
  const bracketColor = variant === 'light' ? '#27272A' : '#737373';
  const trakColor = variant === 'light' ? '#161616' : '#FFFFFF';

  const iconSizes = {
    sm: { w: 24, h: 24, font: 'text-base', sub: 'text-[9px]' },
    md: { w: 32, h: 32, font: 'text-xl', sub: 'text-[10px]' },
    lg: { w: 42, h: 42, font: 'text-2xl', sub: 'text-xs' },
    xl: { w: 56, h: 56, font: 'text-3xl', sub: 'text-sm' },
  };

  const currentSize = iconSizes[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Saw-Trak Brand Icon Symbol */}
      <svg
        width={currentSize.w}
        height={currentSize.h}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm transition-transform hover:scale-105"
      >
        {/* L-shaped dark/grey bracket */}
        <path
          d="M 5 5 L 28 5 L 28 72 L 95 72 L 95 95 L 5 95 Z"
          fill={bracketColor}
        />
        {/* Orange Center Square */}
        <rect
          x="35"
          y="5"
          width="60"
          height="60"
          rx="2"
          fill={orange}
        />
      </svg>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className={`font-['Ubuntu',sans-serif] font-bold tracking-tight ${currentSize.font} flex items-center`}>
            <span style={{ color: orange }}>saw</span>
            <span style={{ color: trakColor }}>trak</span>
          </div>
          {subtitle && (
            <span className={`font-['Poppins',sans-serif] ${variant === 'light' ? 'text-zinc-500' : 'text-slate-400'} font-semibold tracking-wide uppercase ${currentSize.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
