import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

afterEach(cleanup);

Object.defineProperty(globalThis, 'NodeFilter', {
	configurable: true,
	value: window.NodeFilter,
});

class TestResizeObserver implements ResizeObserver {
	constructor(_callback: ResizeObserverCallback) {}

	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
	configurable: true,
	value: TestResizeObserver,
});
