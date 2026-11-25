import { useEffect, useRef } from 'react';

type Point = { x: number; y: number };
type Ripple = Point & { time: number };
const lifetime = 720;

// Each trace is a cross-section of the same signal, from a saw at the rear
// to its smooth fundamental at the front. Depth also sets the projection.
function makeTraces(width: number, height: number) {
  const rows = width < 600 ? 23 : 36;
  const samples = Math.ceil(width / 3);
  return Array.from({ length: rows }, (_, row) => {
    const depth = 1 - row / (rows - 1);
    const sharpness = depth ** 2.2;
    return Array.from({ length: samples + 1 }, (_, i) => {
      const u = i / samples;
      const cycles = u * 4.65 + 0.1;
      const saw = 1 - 2 * (cycles % 1);
      const sine = Math.sin(cycles * 2 * Math.PI);
      const wave = sine + sharpness * (saw - sine);
      const x = 0.006 + depth * 0.20 + u * (0.988 - depth * 0.35);
      const center = 0.63 + 0.11 * u - depth * (0.12 + 0.44 * u);
      const amplitude = 0.009 + (0.16 + 0.03 * depth) * u;
      return { x: x * width, y: (center + amplitude * wave) * height };
    });
  });
}

export function FilterStudy() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const paper = getComputedStyle(canvas).getPropertyValue('--paper').trim();
    let width = 0, height = 0;
    let traces: Point[][] = [];
    let ripples: Ripple[] = [];
    let frame = 0;

    function draw(now: number) {
      frame = 0;
      ripples = ripples.filter(ripple => now - ripple.time < lifetime);
      ctx!.clearRect(0, 0, width, height);
      const radius = Math.min(150, width * 0.23);
      for (const trace of traces) {
        ctx!.beginPath();
        for (const [i, point] of trace.entries()) {
          let dy = 0;
          for (const ripple of ripples) {
            const dx = point.x - ripple.x;
            if (Math.abs(dx) >= radius) continue;
            const distance = Math.hypot(dx, point.y - ripple.y);
            if (distance >= radius) continue;
            const age = (now - ripple.time) / lifetime;
            const phase = age * 2.8 - distance / radius;
            if (phase <= 0) continue;
            dy += 8 * Math.sin(phase * 7) * (1 - age) ** 2 * (1 - distance / radius) ** 2;
          }
          const y = point.y + dy;
          if (i === 0) ctx!.moveTo(point.x, y);
          else ctx!.lineTo(point.x, y);
        }
        ctx!.stroke();
        // Hide the rear contours below this edge, like stacked sheets of paper.
        ctx!.lineTo(trace[trace.length - 1].x, height);
        ctx!.lineTo(trace[0].x, height);
        ctx!.closePath();
        ctx!.fill();
      }
      if (ripples.length) frame = requestAnimationFrame(draw);
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      if (!width || !height) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx!.setTransform(scale, 0, 0, scale, 0, 0);
      ctx!.strokeStyle = '#191a18';
      ctx!.fillStyle = paper;
      ctx!.lineWidth = width < 600 ? 1.3 : 1.7;
      ctx!.lineJoin = 'round';
      traces = makeTraces(width, height);
      reset();
    }

    function reset() {
      cancelAnimationFrame(frame);
      ripples = [];
      draw(performance.now());
    }

    function disturb(event: PointerEvent) {
      if (motion.matches) return;
      const now = performance.now();
      const last = ripples[ripples.length - 1];
      const x = event.offsetX, y = event.offsetY;
      if (last && (now - last.time < 42 || Math.hypot(x - last.x, y - last.y) < 4)) return;
      ripples = [...ripples.slice(-4), { x, y, time: now }];
      if (!frame) frame = requestAnimationFrame(draw);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    canvas.addEventListener('pointermove', disturb);
    canvas.addEventListener('pointerdown', disturb);
    motion.addEventListener('change', reset);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointermove', disturb);
      canvas.removeEventListener('pointerdown', disturb);
      motion.removeEventListener('change', reset);
    };
  }, []);

  return <canvas ref={ref} className="initialize-wave" aria-hidden="true" />;
}
