import React from 'react';
import { cn } from '@/src/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'default' | 'white' | 'dark';
}

export const BrandLogo: React.FC<LogoProps> = ({ 
  className = "w-32 md:w-54", 
}) => {
  const logoUrl = "/logo.png";

  return (
    <div className={cn("flex items-center mx-auto transition-all duration-300 shrink-0", className)}>
      <img 
        src={logoUrl} 
        alt="OP Media Agency" 
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
};
