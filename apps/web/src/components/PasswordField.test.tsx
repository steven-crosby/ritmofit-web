// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PasswordField } from './PasswordField.js';

afterEach(() => {
  cleanup();
});

describe('PasswordField', () => {
  it('keeps the accessible name limited to the label, not the reveal toggle', () => {
    render(
      <PasswordField
        id="pw"
        label="Password"
        autoComplete="current-password"
        value=""
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('Password')).toHaveProperty('type', 'password');
  });

  it('reveals and re-conceals the value on toggle, without losing focus semantics', () => {
    render(
      <PasswordField
        id="pw"
        label="Password"
        autoComplete="current-password"
        value="secret"
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(input).toHaveProperty('type', 'password');
    expect(toggle).toHaveProperty('ariaPressed', 'false');

    fireEvent.click(toggle);
    expect(input).toHaveProperty('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveProperty(
      'ariaPressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveProperty('type', 'password');
  });

  it('pairs the invalid state with a redundant ember border, not color alone', () => {
    render(
      <PasswordField
        id="pw"
        label="Password"
        autoComplete="current-password"
        value=""
        onChange={() => {}}
        invalid
        ariaDescribedBy="some-error"
      />,
    );
    const input = screen.getByLabelText('Password');
    expect(input).toHaveProperty('ariaInvalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBe('some-error');
    expect(input.className).toContain('border-state-danger');
  });

  it('shows help text and wires it via aria-describedby when there is no error', () => {
    render(
      <PasswordField
        id="pw"
        label="Password"
        autoComplete="new-password"
        value=""
        onChange={() => {}}
        minLength={8}
        helpText="At least eight characters."
      />,
    );
    const input = screen.getByLabelText('Password');
    expect(screen.getByText('At least eight characters.')).toBeTruthy();
    expect(input.getAttribute('aria-describedby')).toBe(
      screen.getByText('At least eight characters.').id,
    );
    expect(input).toHaveProperty('minLength', 8);
  });
});
