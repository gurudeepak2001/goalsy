import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

vi.mock('wouter', () => ({
  useLocation: () => ['/signin', vi.fn()],
}));

vi.mock('@clerk/react/legacy', () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: { create: vi.fn() },
    setActive: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/components/AppHeader', () => ({ default: () => null }));
vi.mock('@/components/ExecutiveButton', () => ({
  default: ({ text, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { text: string }) => (
    <button type="button" {...props}>{text}</button>
  ),
}));
vi.mock('@/components/ExecutiveInput', () => ({
  default: ({
    label,
    value,
    onChange,
    type,
  }: {
    label: string;
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    type?: string;
  }) => <label>{label}<input aria-label={label} type={type} value={value} onChange={onChange} /></label>,
}));

import SignInScreen from './SignInScreen';

describe('SignInScreen native remount protection', () => {
  it('keeps freshly typed credentials through a Clerk startup remount', () => {
    const firstMount = render(<SignInScreen />);

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'ios.tester@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'KeepThisPassword!' },
    });

    // Models the Capacitor-only Clerk route-tree replacement observed shortly
    // after opening the screen, before the user submits the form.
    firstMount.unmount();
    render(<SignInScreen />);

    expect(screen.getByLabelText('Email Address')).toHaveValue('ios.tester@example.com');
    expect(screen.getByLabelText('Password')).toHaveValue('KeepThisPassword!');
  });
});