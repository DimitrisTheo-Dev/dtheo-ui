// @vitest-environment jsdom
import './setup';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeScope } from '../src/lib/theme';

describe('ThemeScope', () => {
  it('writes the mode of the scope around it on a preset scope that sets none', () => {
    render(
      <ThemeScope mode="dark">
        <ThemeScope mode="light">
          <ThemeScope preset="carbon" data-testid="carbon">
            <ThemeScope preset="carbon" data-testid="deeper" />
          </ThemeScope>
        </ThemeScope>
      </ThemeScope>,
    );
    // Three scopes deep, where a stylesheet alone cannot tell which mode is nearer.
    expect(screen.getByTestId('carbon')).toHaveClass('light');
    expect(screen.getByTestId('carbon')).not.toHaveClass('dark');
    expect(screen.getByTestId('deeper')).toHaveClass('light');
  });

  it('leaves a preset scope with no ThemeScope around it to follow the page', () => {
    render(<ThemeScope preset="carbon" data-testid="carbon" />);
    expect(screen.getByTestId('carbon')).not.toHaveClass('light');
    expect(screen.getByTestId('carbon')).not.toHaveClass('dark');
    expect(screen.getByTestId('carbon')).toHaveAttribute('data-preset', 'carbon');
  });

  it('keeps its own mode when it has one', () => {
    render(
      <ThemeScope mode="light">
        <ThemeScope mode="dark" preset="carbon" data-testid="carbon" />
      </ThemeScope>,
    );
    expect(screen.getByTestId('carbon')).toHaveClass('dark');
    expect(screen.getByTestId('carbon')).not.toHaveClass('light');
  });
});
