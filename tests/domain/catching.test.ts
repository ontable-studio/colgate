import { describe, expect, it } from 'vitest';
import { OBJECT_SIZE, RULES } from '@/config/game';
import { catchHalfWidth, crossedLine, isCaught } from '@/domain/catching';

const C = RULES.catching;
const capsuleR = OBJECT_SIZE.capsule / 2;
const stainR = OBJECT_SIZE.stain / 2;

describe('catch zone', () => {
  it('is wider than the opening for capsules and narrower for hazards', () => {
    expect(catchHalfWidth('capsule', capsuleR, C)).toBeGreaterThan(C.basketHalfWidth);
    expect(catchHalfWidth('stain', stainR, C)).toBeLessThan(C.basketHalfWidth);
    expect(catchHalfWidth('decoy', capsuleR, C)).toBeLessThan(C.basketHalfWidth);
  });

  it('counts a capsule that only touches the rim', () => {
    const edge = C.basketHalfWidth + 10; // centre outside the opening, but within the forgiveness
    expect(isCaught('capsule', 500 + edge, 500, capsuleR, C)).toBe(true);
    expect(isCaught('capsule', 500 - edge, 500, capsuleR, C)).toBe(true);
  });

  it('lets a near miss pass for a stain, so a hit always looks deserved', () => {
    const justInsideOpening = C.basketHalfWidth - 5;
    expect(isCaught('stain', 500 + justInsideOpening, 500, stainR, C)).toBe(false);
    expect(isCaught('stain', 500, 500, stainR, C)).toBe(true); // dead centre still hits
  });

  it('misses a capsule that is clearly beside the basket', () => {
    expect(isCaught('capsule', 500 + 400, 500, capsuleR, C)).toBe(false);
  });

  it('is symmetric left and right', () => {
    for (const dx of [0, 60, 120, 180, 240]) {
      expect(isCaught('capsule', 500 + dx, 500, capsuleR, C)).toBe(
        isCaught('capsule', 500 - dx, 500, capsuleR, C),
      );
    }
  });
});

describe('crossedLine', () => {
  it('is true only on the frame the centre passes the line going down', () => {
    expect(crossedLine(1390, 1405, 1400)).toBe(true);
    expect(crossedLine(1380, 1395, 1400)).toBe(false);
    expect(crossedLine(1410, 1425, 1400)).toBe(false);
  });

  it('fires once even with large frame steps', () => {
    let hits = 0;
    let previous = 1000;
    for (let y = 1000; y < 1700; y += 37) {
      if (crossedLine(previous, y, 1400)) hits += 1;
      previous = y;
    }
    expect(hits).toBe(1);
  });
});
