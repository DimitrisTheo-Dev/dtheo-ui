// Shared setup for the jsdom suites in this folder. Import it first: `import './setup';`.
// The root Vitest config has no globals and no setup files, so each suite opts in here.
import '@testing-library/jest-dom/vitest';
import { act, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom has no layout, so there is no ResizeObserver. This one records what it observes and fires only when a test
 * says so, which lets a test change a box's size and then deliver the resize.
 */
class TestResizeObserver implements ResizeObserver {
  static instances = new Set<TestResizeObserver>();
  readonly targets = new Set<Element>();
  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.add(this);
  }
  observe(target: Element) {
    this.targets.add(target);
  }
  unobserve(target: Element) {
    this.targets.delete(target);
  }
  disconnect() {
    this.targets.clear();
    TestResizeObserver.instances.delete(this);
  }
  fire() {
    const entries = [...this.targets].map((target) => ({ target }) as ResizeObserverEntry);
    if (entries.length) this.callback(entries, this);
  }
}

globalThis.ResizeObserver = TestResizeObserver;

/** Deliver a resize to every observer watching `target` (or to every observer). */
export function resize(target?: Element) {
  act(() => {
    for (const ro of TestResizeObserver.instances) if (!target || ro.targets.has(target)) ro.fire();
  });
}

/** Give an element a layout box for the properties a component reads. */
export function setBox(el: Element, box: Partial<Record<'scrollWidth' | 'clientWidth', number>>) {
  for (const [key, value] of Object.entries(box))
    Object.defineProperty(el, key, { configurable: true, get: () => value });
}

// Lists scroll their highlighted item into view; jsdom does not implement scrolling.
Element.prototype.scrollIntoView ??= () => {};
// jsdom has no Web Animations. Base UI's ScrollArea calls getAnimations() without checking for it; nothing animates
// here, so an empty list is the truth.
Element.prototype.getAnimations ??= () => [];

afterEach(() => {
  cleanup();
});
