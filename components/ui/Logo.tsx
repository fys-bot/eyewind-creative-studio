import React from 'react';

export const Logo: React.FC<{ size?: number, className?: string }> = ({ size = 32, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="desora_mono_grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" /> {/* Pure White Highlight */}
          <stop offset="50%" stopColor="#6B7280" /> {/* Cool Gray */}
          <stop offset="100%" stopColor="#000000" /> {/* Pure Black Depth */}
        </linearGradient>
      </defs>
      
      {/* 
        Shape: Abstract 4-Pointed Star / Sparkle
        Symbolizes: AI, Magic, and Creativity
      */}
      <path 
        d="M16 2C17.5 10 20 13.5 29 16C20 18.5 17.5 22 16 30C14.5 22 12 18.5 3 16C12 13.5 14.5 10 16 2Z" 
        fill="url(#desora_mono_grad)"
        filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.15))"
      />
      
      {/* Center Highlight */}
      <circle cx="16" cy="16" r="2" fill="white" fillOpacity="0.9" />
    </svg>
  );
};
