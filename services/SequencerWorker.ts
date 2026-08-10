// Sequencer Worker for precision clock scheduling
let timerId: number | null = null;
let interval = 25;

self.onmessage = (e: MessageEvent) => {
  const { action, interval: newInterval } = e.data;
  if (action === 'start') {
    if (newInterval) interval = newInterval;
    if (timerId !== null) clearInterval(timerId);
    timerId = self.setInterval(() => {
      self.postMessage('tick');
    }, interval) as unknown as number;
  } else if (action === 'stop') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  } else if (action === 'setInterval') {
    interval = newInterval;
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = self.setInterval(() => {
        self.postMessage('tick');
      }, interval) as unknown as number;
    }
  }
};
