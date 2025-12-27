// Vitest setup file for mocking Phaser and other dependencies
import { vi, beforeAll, afterAll } from 'vitest';

// Mock phaser3spectorjs before Phaser is imported
vi.mock('phaser3spectorjs', () => ({}));

// Mock HTMLCanvasElement.getContext to avoid jsdom issues
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn((contextType: string) => {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Array(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ({ data: new Array(4) })),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
      };
    }
    if (contextType === 'webgl' || contextType === 'experimental-webgl') {
      return {
        getExtension: vi.fn(),
        getParameter: vi.fn(),
        createShader: vi.fn(),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        createProgram: vi.fn(),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        useProgram: vi.fn(),
        createBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        drawArrays: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        viewport: vi.fn(),
      };
    }
    return null;
  }),
});

// Suppress console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented: HTMLCanvasElement.prototype.getContext') ||
        args[0].includes('Error: Not implemented'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
