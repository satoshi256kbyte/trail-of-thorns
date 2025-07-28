// Jest setup file for mocking Phaser and other dependencies

// Mock HTMLCanvasElement.getContext to avoid jsdom issues
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    fillStyle: '',
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fillText: jest.fn(),
    strokeText: jest.fn(),
  })),
});

// Mock WebGL context
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(contextType => {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(() => ({ data: new Array(4) })),
        putImageData: jest.fn(),
        createImageData: jest.fn(() => ({ data: new Array(4) })),
        setTransform: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        stroke: jest.fn(),
        fill: jest.fn(),
        measureText: jest.fn(() => ({ width: 0 })),
        transform: jest.fn(),
        translate: jest.fn(),
        scale: jest.fn(),
        rotate: jest.fn(),
        arc: jest.fn(),
        fillText: jest.fn(),
        strokeText: jest.fn(),
      };
    }
    if (contextType === 'webgl' || contextType === 'experimental-webgl') {
      return {
        getExtension: jest.fn(),
        getParameter: jest.fn(),
        createShader: jest.fn(),
        shaderSource: jest.fn(),
        compileShader: jest.fn(),
        createProgram: jest.fn(),
        attachShader: jest.fn(),
        linkProgram: jest.fn(),
        useProgram: jest.fn(),
        createBuffer: jest.fn(),
        bindBuffer: jest.fn(),
        bufferData: jest.fn(),
        enableVertexAttribArray: jest.fn(),
        vertexAttribPointer: jest.fn(),
        drawArrays: jest.fn(),
        clear: jest.fn(),
        clearColor: jest.fn(),
        viewport: jest.fn(),
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
