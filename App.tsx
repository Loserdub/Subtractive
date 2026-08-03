import React from 'react';
import { Synth } from './components/Synth';

const App: React.FC = () => {
  return (
    <div className="h-full h-[100dvh] w-full overflow-hidden synth-chassis text-gray-200 flex flex-col font-sans touch-lock relative">
      {/* Subtle Analog Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.75%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' 
        }} 
      />
      <div className="relative z-10 h-full w-full overflow-hidden flex flex-col">
        <Synth />
      </div>
    </div>
  );
};

export default App;
