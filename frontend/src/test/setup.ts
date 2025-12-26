import '@testing-library/jest-dom/vitest';

// Minimal IntersectionObserver mock for tests
class MockIntersectionObserver {
  constructor(private _cb: IntersectionObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
// @ts-ignore
if (!('IntersectionObserver' in globalThis)) {
  // @ts-ignore
  globalThis.IntersectionObserver = MockIntersectionObserver as any;
}