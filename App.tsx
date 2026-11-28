import React from 'react';
import './components/instrument.css';
import { Synth } from './components/Synth';

const App: React.FC = () => {
  return (
    <div className="h-full w-full overflow-hidden synth-chassis text-[var(--text-primary)] flex flex-col font-sans relative">
      <Synth />
    </div>
  );
};

export default App;
