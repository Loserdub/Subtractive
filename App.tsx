
import React from 'react';
import { Synth } from './components/Synth';
import { EyeIcon } from './components/Icon';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 flex flex-col items-center justify-center p-4 font-sans selection:bg-white selection:text-black">
      <div className="w-full max-w-7xl mx-auto">
        <header className="flex flex-col items-center mb-8 border-b border-gray-800 pb-6">
          <div className="flex items-center gap-4">
             {/* Logo Graphic */}
             <div className="w-10 h-10 bg-white skew-x-[-10deg] flex items-center justify-center text-black">
                <EyeIcon className="w-6 h-6 transform skew-x-[10deg]" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic transform -skew-x-6">
              VISION SYNTH
            </h1>
          </div>
          <p className="text-gray-500 text-xs font-mono tracking-[0.2em] mt-2 uppercase">
            Polyphonic Analogue Modelling Synthesizer
          </p>
        </header>
        <main>
          <Synth />
        </main>
        <footer className="text-center mt-12 text-gray-600 text-xs font-mono uppercase tracking-widest">
            <p>Audio Engine Active • MIDI Ready</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
