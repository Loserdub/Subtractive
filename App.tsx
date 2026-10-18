import React from 'react';
import { Synth } from './components/Synth';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeBackground } from './components/ThemeBackground';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="h-full h-[100dvh] w-full overflow-hidden synth-chassis text-gray-200 flex flex-col font-sans relative">
        <ThemeBackground />
        <div className="relative z-10 h-full w-full overflow-hidden flex flex-col">
          <Synth />
        </div>
      </div>
    </ThemeProvider>
  );
};

export default App;
