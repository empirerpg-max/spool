import { describe, it, expect } from 'vitest';
import { cinemaStatus } from '@/lib/catalog/cinema';

describe('cinemaStatus', () => {
  const today = '2026-11-15';
  it.each([
    ['2026-12-01', null, 'em_breve'],
    ['2026-11-01', null, 'em_cartaz'],
    ['2026-11-15', null, 'em_cartaz'],
    ['2026-11-01', '2026-11-10', null],
    ['2026-11-01', '2026-12-10', 'em_cartaz'],
    ['2026-08-01', null, null],
    [null, null, null],
  ] as const)('theatrical %s digital %s → %s', (theatricalDateBR, digitalDateBR, expected) => {
    expect(cinemaStatus({ theatricalDateBR, digitalDateBR }, today)).toBe(expected);
  });
});
