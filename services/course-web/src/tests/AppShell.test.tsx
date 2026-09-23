import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '../components/AppShell';

function mockSystemTheme(matches: boolean): void {
  const mediaQueryList = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQueryList));
}

function renderShell(): void {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<h1>Library content</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell appearance control', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSystemTheme(false);
  });

  it('follows the system appearance when no choice has been saved', () => {
    mockSystemTheme(true);
    renderShell();

    expect(screen.getByRole('switch', { name: 'Dark appearance' })).toBeChecked();
  });

  it('persists an explicit accessible appearance choice', async () => {
    const user = userEvent.setup();
    renderShell();
    const appearanceSwitch = screen.getByRole('switch', { name: 'Dark appearance' });

    await user.click(appearanceSwitch);

    expect(appearanceSwitch).toBeChecked();
    expect(window.localStorage.getItem('course-studio-appearance')).toBe('dark');
  });

  it('restores a saved appearance instead of the system setting', () => {
    window.localStorage.setItem('course-studio-appearance', 'dark');
    renderShell();

    expect(screen.getByRole('switch', { name: 'Dark appearance' })).toBeChecked();
  });
});
