import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('dashboard shell', () => {
  it('renders analytics v2 and opens the encrypted vault', () => {
    render(<App />);

    expect(screen.getByRole('region', { name: 'Metrik analisis lanjutan' })).toBeInTheDocument();
    expect(screen.getByText('Keyakinan analisis')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Vault' }));
    expect(screen.getByRole('dialog', { name: 'Backup tanpa membuka isi.' })).toBeInTheDocument();
  });

  it('can switch to non-persistent session mode', () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Tersimpan lokal' });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Mode sesi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(window.localStorage.getItem('cermin:snapshots:v1')).toBeNull();
  });
});
