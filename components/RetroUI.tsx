import React from 'react';

export const RetroBox: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => (
  <div className={`relative bg-blue-900 border-4 border-white shadow-lg p-4 font-mono-retro text-white ${className}`}>
    {title && (
      <div className="absolute -top-5 left-4 bg-white text-blue-900 px-2 py-0.5 border-2 border-blue-900 font-bold text-lg">
        {title}
      </div>
    )}
    <div className="corner-decoration"></div>
    {children}
  </div>
);

export const RetroButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className = '', ...props }) => (
  <button
    className={`bg-yellow-500 hover:bg-yellow-400 text-black font-pixel text-xs py-3 px-4 border-b-4 border-r-4 border-yellow-700 active:border-0 active:translate-y-1 ${className}`}
    {...props}
  >
    {children}
  </button>
);