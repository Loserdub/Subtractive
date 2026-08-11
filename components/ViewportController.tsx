import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ViewportControllerProps {
  children: React.ReactNode;
}

export const ViewportController: React.FC<ViewportControllerProps> = ({ children }) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Touch gesture state tracking
  const touchStateRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialMidX: number;
    initialMidY: number;
    initialPanX: number;
    initialPanY: number;
    isPinching: boolean;
    isSinglePanning: boolean;
    lastSingleX: number;
    lastSingleY: number;
  }>({
    initialDist: 0,
    initialZoom: 1,
    initialMidX: 0,
    initialMidY: 0,
    initialPanX: 0,
    initialPanY: 0,
    isPinching: false,
    isSinglePanning: false,
    lastSingleX: 0,
    lastSingleY: 0,
  });

  // Mouse pan state
  const mousePanRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Helper functions for distance and midpoint
  const getTouchDistance = (t1: Touch, t2: Touch) => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchMidpoint = (t1: Touch, t2: Touch) => {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    };
  };

  // Reset view to 100% framing
  const handleReset = useCallback(() => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
  }, []);

  // Fit view to 100% visible height & width
  const handleFit = useCallback(() => {
    if (wrapperRef.current && contentRef.current) {
      const containerHeight = contentRef.current.scrollHeight || 900;
      const windowHeight = wrapperRef.current.clientHeight || window.innerHeight;
      const fitZoom = Math.min(1.0, Math.max(0.45, +(windowHeight / (containerHeight + 20)).toFixed(2)));
      setZoom(fitZoom);
      setPanX(0);
      setPanY(0);
    } else {
      setZoom(0.85);
      setPanX(0);
      setPanY(0);
    }
  }, []);

  // Auto-fit on initial mount for desktop
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      handleFit();
    }
  }, [handleFit]);

  // Zoom in / out handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(2.5, +(prev + 0.15).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.5, +(prev - 0.15).toFixed(2)));
  }, []);

  // Touch gesture listeners attached natively with passive: false to prevent default page zoom/scroll
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const mid = getTouchMidpoint(e.touches[0], e.touches[1]);
        
        touchStateRef.current = {
          initialDist: dist,
          initialZoom: zoom,
          initialMidX: mid.x,
          initialMidY: mid.y,
          initialPanX: panX,
          initialPanY: panY,
          isPinching: true,
          isSinglePanning: false,
          lastSingleX: 0,
          lastSingleY: 0,
        };
      } else if (e.touches.length === 1 && isPanMode) {
        touchStateRef.current.isSinglePanning = true;
        touchStateRef.current.lastSingleX = e.touches[0].clientX;
        touchStateRef.current.lastSingleY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const state = touchStateRef.current;

      if (e.touches.length === 2 && state.isPinching) {
        e.preventDefault();
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        const mid = getTouchMidpoint(e.touches[0], e.touches[1]);

        if (state.initialDist > 0) {
          const scale = dist / state.initialDist;
          const newZoom = Math.min(2.5, Math.max(0.5, +(state.initialZoom * scale).toFixed(2)));
          
          const deltaX = mid.x - state.initialMidX;
          const deltaY = mid.y - state.initialMidY;

          setZoom(newZoom);
          setPanX(state.initialPanX + deltaX);
          setPanY(state.initialPanY + deltaY);
        }
      } else if (e.touches.length === 1 && state.isSinglePanning) {
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - state.lastSingleX;
        const dy = touch.clientY - state.lastSingleY;

        state.lastSingleX = touch.clientX;
        state.lastSingleY = touch.clientY;

        setPanX(prev => prev + dx);
        setPanY(prev => prev + dy);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchStateRef.current.isPinching = false;
      }
      if (e.touches.length === 0) {
        touchStateRef.current.isSinglePanning = false;
      }
    };

    wrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    wrapper.addEventListener('touchend', handleTouchEnd);
    wrapper.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      wrapper.removeEventListener('touchstart', handleTouchStart);
      wrapper.removeEventListener('touchmove', handleTouchMove);
      wrapper.removeEventListener('touchend', handleTouchEnd);
      wrapper.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [zoom, panX, panY, isPanMode]);

  // Mouse wheel navigation handler for Desktop
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Zooming via ctrl + wheel or touchpad pinch
      e.preventDefault();
      const deltaZoom = -e.deltaY * 0.003;
      setZoom(prev => Math.min(2.5, Math.max(0.5, +(prev + deltaZoom).toFixed(2))));
    } else {
      // Normal wheel scrolling -> navigate vertically up and down
      setPanY(prev => Math.max(-1500, Math.min(800, prev - e.deltaY * 0.85)));
    }
  };

  // Mouse drag panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button or Pan Mode active
    if (isPanMode || e.button === 1) {
      e.preventDefault();
      mousePanRef.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: panX,
        startPanY: panY,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mousePanRef.current.isDragging) return;
    e.preventDefault();
    const dx = e.clientX - mousePanRef.current.startX;
    const dy = e.clientY - mousePanRef.current.startY;
    setPanX(mousePanRef.current.startPanX + dx);
    setPanY(mousePanRef.current.startPanY + dy);
  };

  const handleMouseUp = () => {
    mousePanRef.current.isDragging = false;
  };

  return (
    <div 
      ref={wrapperRef}
      className={`relative h-full w-full overflow-hidden bg-[#080a0e] select-none ${
        isPanMode ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* On-Screen Skeuomorphic Navigation Toolbar (Mobile & Desktop) */}
      <nav 
        className="absolute top-2 right-2 z-50 flex items-center gap-1.5 p-1.5 rounded-md bg-[#10141d]/90 backdrop-blur-md border border-[#232b3d] shadow-xl text-gray-200"
        aria-label="Viewport Controls"
      >
        {/* Monospaced Readout */}
        <div className="oled-screen px-2 py-0.5 rounded flex items-center justify-between min-w-[70px]">
          <span className="font-mono-lcd text-[9px] text-[#00e5ff] uppercase tracking-wider">
            {Math.round(zoom * 100)}%
          </span>
          <span className="font-mono-lcd text-[8px] text-gray-400 ml-1">
            Y:{Math.round(panY)}
          </span>
        </div>

        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="h-6 w-6 rounded bg-[#18202e] hover:bg-[#263248] text-gray-300 hover:text-white flex items-center justify-center border border-[#2d384e] text-xs font-mono font-bold transition-all"
        >
          -
        </button>

        {/* Mouse Zoom Slider */}
        <div className="hidden sm:flex items-center gap-1 px-1">
          <span className="text-[9px] font-mono text-gray-400">ZOOM</span>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-[#18202e] accent-[#00e5ff] rounded cursor-pointer"
            title="Drag mouse slider to zoom in/out"
          />
        </div>

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={handleZoomIn}
          title="Zoom In"
          className="h-6 w-6 rounded bg-[#18202e] hover:bg-[#263248] text-gray-300 hover:text-white flex items-center justify-center border border-[#2d384e] text-xs font-mono font-bold transition-all"
        >
          +
        </button>

        {/* Desktop Mouse Vertical Navigation Slider */}
        <div className="hidden md:flex items-center gap-1 border-l border-[#232b3d] pl-1.5 pr-1">
          <span className="text-[9px] font-mono text-gray-400">NAV</span>
          <input
            type="range"
            min="-800"
            max="800"
            step="10"
            value={-panY}
            onChange={(e) => setPanY(-parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-[#18202e] accent-[#ffaa00] rounded cursor-pointer"
            title="Drag mouse slider to navigate up and down"
          />
        </div>

        {/* Pan Mode Toggle */}
        <button
          type="button"
          onClick={() => setIsPanMode(!isPanMode)}
          title={isPanMode ? "Disable Drag Pan" : "Enable Drag Pan (🖐)"}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all flex items-center gap-1 ${
            isPanMode
              ? 'bg-[#00e5ff] text-black border-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.6)]'
              : 'bg-[#18202e] text-gray-400 border-[#2d384e] hover:text-gray-200'
          }`}
        >
          🖐 <span className="hidden sm:inline">PAN</span>
        </button>

        {/* Fit to Viewport Button */}
        <button
          type="button"
          onClick={handleFit}
          title="Fit synth to screen height & width"
          className="px-2 py-0.5 rounded bg-[#18202e] hover:bg-[#263248] text-[#00e5ff] border border-[#2d384e] text-[9px] font-mono font-bold transition-all"
        >
          FIT
        </button>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleReset}
          title="Reset Zoom & Pan to 100%"
          className="px-2 py-0.5 rounded bg-[#18202e] hover:bg-[#263248] text-[#00ff66] border border-[#2d384e] text-[9px] font-mono font-bold transition-all"
        >
          100%
        </button>
      </nav>

      {/* Transform Container with smooth CSS scaling and translation */}
      <div 
        ref={contentRef}
        className="h-full w-full origin-top transition-transform duration-75 ease-out"
        style={{
          transform: `translate3d(${panX}px, ${panY}px, 0px) scale(${zoom})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
};
