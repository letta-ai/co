// Quick performance test for text input
// Run this in your browser console while typing

let lastTime = performance.now();
let delays = [];

// Patch the input to measure actual delay
const measureInputDelay = () => {
  const input = document.querySelector('input, textarea');
  if (!input) {
    console.log('No input found');
    return;
  }

  input.addEventListener('input', (e) => {
    const now = performance.now();
    const delay = now - lastTime;
    delays.push(delay);

    if (delays.length > 50) delays.shift();

    const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
    const max = Math.max(...delays);

    console.log(`Input delay: ${delay.toFixed(1)}ms | Avg: ${avg.toFixed(1)}ms | Max: ${max.toFixed(1)}ms`);
    lastTime = now;
  });

  console.log('Performance monitoring enabled. Start typing...');
};

measureInputDelay();
