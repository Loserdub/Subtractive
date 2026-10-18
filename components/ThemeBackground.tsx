import React, { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeBackground: React.FC = () => {
  const { theme } = useTheme();

  const backgroundSvg = useMemo(() => {
    switch (theme) {
      case 'solar-aurora':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Animated Solar Aurora Moving SVG Waves */}
            <svg
              className="absolute inset-0 w-full h-full opacity-35"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              viewBox="0 0 1440 900"
            >
              <defs>
                <linearGradient id="auroraGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#00ff9d" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#7928ca" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="auroraGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff007f" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#7928ca" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.1" />
                </linearGradient>
                <filter id="auroraGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="60" result="blur" />
                </filter>
              </defs>
              <g filter="url(#auroraGlow)">
                {/* Ribbon 1 */}
                <path
                  className="aurora-wave-1"
                  d="M-200,350 C300,150 600,550 1100,280 C1300,180 1500,400 1700,320 L1700,900 L-200,900 Z"
                  fill="url(#auroraGrad1)"
                />
                {/* Ribbon 2 */}
                <path
                  className="aurora-wave-2"
                  d="M-100,200 C400,450 700,100 1200,380 C1400,480 1600,220 1800,280 L1800,900 L-100,900 Z"
                  fill="url(#auroraGrad2)"
                />
              </g>
            </svg>
            {/* Ambient Aurora Shimmer Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#08091a]/80 via-transparent to-[#08091a]/60" />
          </div>
        );

      case 'cyber-matrix':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Animated Cyber Matrix Perspective Grid SVG */}
            <svg
              className="absolute inset-0 w-full h-full opacity-20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="cyberGridPattern"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#00ff66"
                    strokeWidth="0.8"
                    strokeOpacity="0.4"
                  />
                  <circle cx="0" cy="0" r="1.5" fill="#00ff66" fillOpacity="0.7" />
                </pattern>
                <linearGradient id="matrixFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000" stopOpacity="0.1" />
                  <stop offset="40%" stopColor="#000" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#00ff66" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#cyberGridPattern)" className="matrix-grid-scroll" />
              <rect width="100%" height="100%" fill="url(#matrixFade)" />
            </svg>
            {/* Scanning Radar Laser Line */}
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00ff66] to-transparent opacity-40 matrix-scanline pointer-events-none" />
          </div>
        );

      case 'synthwave-sunset':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Synthwave 80s Horizon Vector Glow */}
            <svg
              className="absolute bottom-0 inset-x-0 w-full h-[55%] opacity-25"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              viewBox="0 0 1000 400"
            >
              <defs>
                <linearGradient id="synthSun" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffe600" />
                  <stop offset="50%" stopColor="#ff0077" />
                  <stop offset="100%" stopColor="#7928ca" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Sun Arc */}
              <circle cx="500" cy="220" r="140" fill="url(#synthSun)" opacity="0.6" />
              {/* Perspective Grid Floor */}
              <g stroke="#ff00aa" strokeWidth="1" strokeOpacity="0.5">
                {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(x => (
                  <line key={x} x1={x} y1="400" x2="500" y2="220" />
                ))}
                <line x1="0" y1="230" x2="1000" y2="230" stroke="#00f5ff" />
                <line x1="0" y1="250" x2="1000" y2="250" stroke="#00f5ff" />
                <line x1="0" y1="280" x2="1000" y2="280" stroke="#ff00aa" />
                <line x1="0" y1="330" x2="1000" y2="330" stroke="#ff00aa" />
              </g>
            </svg>
            <div className="absolute inset-0 bg-gradient-to-b from-[#0d081e] via-transparent to-[#1a0528]/80" />
          </div>
        );

      case 'obsidian-minimal':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Swiss Engineering Crosshair Alignment Grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-15"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="swissCrosshairs"
                  width="120"
                  height="120"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 60 54 L 60 66 M 54 60 L 66 60"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                    strokeOpacity="0.4"
                  />
                  <rect x="0" y="0" width="120" height="120" fill="none" stroke="#ffffff" strokeWidth="0.3" strokeOpacity="0.08" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#swissCrosshairs)" />
            </svg>
          </div>
        );

      case 'ghost-frost':
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Icy Frosted Glass Micro-Refractions */}
            <svg
              className="absolute inset-0 w-full h-full opacity-20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#818cf8" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#c084fc" stopOpacity="0.25" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#iceGrad)" />
            </svg>
            <div className="absolute inset-0 bg-radial from-transparent via-[#080d16]/40 to-[#080d16]/90" />
          </div>
        );

      default:
        // Default subtle analog circuit grain
        return (
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none z-0"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.75%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
            }}
          />
        );
    }
  }, [theme]);

  return backgroundSvg;
};
