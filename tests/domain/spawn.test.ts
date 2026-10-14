import { describe, expect, it } from 'vitest';
import { pickKind } from '@/domain/spawn';

const weights = { capsule: 6, stain: 3, decoy: 1 } as const;

describe('pickKind', () => {
  it('maps the roll to weighted buckets', () => {
    expect(pickKind(weights, () => 0)).toBe('capsule');
    expect(pickKind(weights, () => 0.59)).toBe('capsule');
    expect(pickKind(weights, () => 0.6)).toBe('stain');
    expect(pickKind(weights, () => 0.89)).toBe('stain');
    expect(pickKind(weights, () => 0.9)).toBe('decoy');
    expect(pickKind(weights, () => 0.999)).toBe('decoy');
  });
});
