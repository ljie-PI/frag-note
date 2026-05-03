export type Point = {
  x: number;
  y: number;
};

export type CropMonitor = {
  width: number;
  height: number;
};

export type CropRegion = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export function computeCropRegion({
  start,
  end,
  scaleFactor,
  monitor,
}: {
  start: Point;
  end: Point;
  scaleFactor: number;
  monitor: CropMonitor;
}): CropRegion | null {
  const scale = scaleFactor > 0 ? scaleFactor : 1;
  const logicalWidth = monitor.width / scale;
  const logicalHeight = monitor.height / scale;

  const left = clamp(Math.min(start.x, end.x), 0, logicalWidth);
  const right = clamp(Math.max(start.x, end.x), 0, logicalWidth);
  const top = clamp(Math.min(start.y, end.y), 0, logicalHeight);
  const bottom = clamp(Math.max(start.y, end.y), 0, logicalHeight);

  // xcap captures physical pixels, while browser mouse events use logical CSS pixels.
  // Multiplying the normalized logical rectangle by the monitor scale factor keeps
  // Hi-DPI crops aligned with the region the user selected on Retina/4K displays.
  const sx = Math.round(left * scale);
  const sy = Math.round(top * scale);
  const ex = Math.round(right * scale);
  const ey = Math.round(bottom * scale);
  const sw = ex - sx;
  const sh = ey - sy;

  if (sw <= 0 || sh <= 0) {
    return null;
  }

  return { sx, sy, sw, sh };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
