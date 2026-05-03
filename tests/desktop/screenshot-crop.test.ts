import { describe, expect, it } from 'bun:test';
import { computeCropRegion } from '../../apps/desktop/src/screenshot-overlay/crop-region.ts';

const monitor = { width: 100, height: 80 };

describe('computeCropRegion', () => {
  it('computes a positive drag at scale 1', () => {
    expect(
      computeCropRegion({
        start: { x: 10, y: 12 },
        end: { x: 40, y: 32 },
        scaleFactor: 1,
        monitor,
      }),
    ).toEqual({ sx: 10, sy: 12, sw: 30, sh: 20 });
  });

  it('normalizes reverse drags before computing physical pixels', () => {
    expect(
      computeCropRegion({
        start: { x: 70, y: 60 },
        end: { x: 20, y: 10 },
        scaleFactor: 1,
        monitor,
      }),
    ).toEqual({ sx: 20, sy: 10, sw: 50, sh: 50 });
  });

  it('clamps drags beyond the bottom-right monitor edge', () => {
    expect(
      computeCropRegion({
        start: { x: 10, y: 10 },
        end: { x: 150, y: 90 },
        scaleFactor: 1,
        monitor,
      }),
    ).toEqual({ sx: 10, sy: 10, sw: 90, sh: 70 });
  });

  it('maps Retina logical pixels to 2x physical pixels', () => {
    expect(
      computeCropRegion({
        start: { x: 10, y: 15 },
        end: { x: 30, y: 45 },
        scaleFactor: 2,
        monitor: { width: 200, height: 160 },
      }),
    ).toEqual({ sx: 20, sy: 30, sw: 40, sh: 60 });
  });

  it('keeps a single-pixel drag as a valid crop', () => {
    expect(
      computeCropRegion({
        start: { x: 5, y: 5 },
        end: { x: 6, y: 6 },
        scaleFactor: 1,
        monitor,
      }),
    ).toEqual({ sx: 5, sy: 5, sw: 1, sh: 1 });
  });

  it('returns null for zero-area selections', () => {
    expect(
      computeCropRegion({
        start: { x: 20, y: 20 },
        end: { x: 20, y: 50 },
        scaleFactor: 1,
        monitor,
      }),
    ).toBeNull();
  });
});
