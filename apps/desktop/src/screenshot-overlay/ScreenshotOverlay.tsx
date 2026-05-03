import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { computeCropRegion, type Point } from './crop-region.ts';

export type MonitorCapture = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scale_factor: number;
  is_primary: boolean;
  base64_png: string;
};

type OverlayRequest = {
  requestId?: string | null;
  targetLabel?: string | null;
  cursorX?: number | null;
  cursorY?: number | null;
};

type DragState = {
  start: Point;
  end: Point;
};

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function ScreenshotOverlay() {
  const [monitor, setMonitor] = useState<MonitorCapture | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [loading, setLoading] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const monitorRef = useRef<MonitorCapture | null>(null);
  const requestRef = useRef<OverlayRequest>({});
  const loadingRef = useRef(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    monitorRef.current = monitor;
  }, [monitor]);

  const setDragState = useCallback((nextDrag: DragState | null) => {
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }, []);

  const hideOverlay = useCallback(async () => {
    setMonitor(null);
    setDragState(null);
    await getCurrentWindow().hide();
  }, [setDragState]);

  const cancelCapture = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    await emit('screenshot-cancelled', requestRef.current);
    await hideOverlay();
  }, [hideOverlay]);

  const loadScreens = useCallback(
    async (request: OverlayRequest = requestRef.current) => {
      if (loadingRef.current) {
        requestRef.current = request;
        return;
      }

      loadingRef.current = true;
      finishedRef.current = false;
      requestRef.current = request;
      setMonitor(null);
      setDragState(null);
      setLoading(true);

      try {
        const selected = await captureRequestedMonitor(request);
        setMonitor(selected);
      } catch (error) {
        console.error('Failed to capture screens', error);
        await cancelCapture();
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [cancelCapture, setDragState],
  );

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    const loadPendingScreens = async (fallbackToCurrentRequest = false) => {
      const pendingRequest = await takePendingOverlayRequest();
      if (pendingRequest) {
        await loadScreens(pendingRequest);
      } else if (fallbackToCurrentRequest) {
        await loadScreens(requestRef.current);
      }
    };
    const unlistenRequest = currentWindow.listen<OverlayRequest>(
      'screenshot-overlay-request',
      (event) => {
        void loadScreens(event.payload ?? {});
      },
    );
    const unlistenFocus = currentWindow.onFocusChanged(({ payload: focused }) => {
      if (focused && !monitorRef.current) {
        void loadPendingScreens(true);
      }
    });

    void loadPendingScreens();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void cancelCapture();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      void unlistenRequest.then((fn) => fn());
      void unlistenFocus.then((fn) => fn());
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelCapture, loadScreens]);

  const selection = useMemo(() => (drag ? rectFromDrag(drag) : null), [drag]);

  const completeCapture = useCallback(
    async (region: NonNullable<ReturnType<typeof computeCropRegion>>) => {
      if (finishedRef.current) return;
      finishedRef.current = true;

      try {
        const currentMonitor = monitorRef.current;
        if (!currentMonitor) {
          throw new Error('No monitor is selected');
        }

        const base64Data = await cropMonitorPng(currentMonitor.base64_png, region);
        await emit('screenshot-captured', {
          base64Data,
          width: region.sw,
          height: region.sh,
          mimeType: 'image/png',
          ...requestRef.current,
        });
      } catch (error) {
        console.error('Failed to crop region screenshot', error);
        await emit('screenshot-cancelled', requestRef.current);
      } finally {
        await hideOverlay();
      }
    },
    [hideOverlay],
  );

  // We attach mousemove/mouseup to `window` (not the React JSX) on mousedown so
  // a drag still completes if the pointer leaves the overlay window briefly.
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !monitorRef.current || loading) return;
    event.preventDefault();
    const point = { x: event.clientX, y: event.clientY };
    setDragState({ start: point, end: point });

    const onWindowMouseMove = (e: globalThis.MouseEvent) => {
      const activeDrag = dragRef.current;
      if (!activeDrag) return;
      setDragState({
        ...activeDrag,
        end: { x: e.clientX, y: e.clientY },
      });
    };

    const onWindowMouseUp = (e: globalThis.MouseEvent) => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);

      const activeDrag = dragRef.current;
      const currentMonitor = monitorRef.current;
      if (!activeDrag || !currentMonitor) return;

      const finalDrag = {
        ...activeDrag,
        end: { x: e.clientX, y: e.clientY },
      };
      setDragState(finalDrag);

      const region = computeCropRegion({
        start: finalDrag.start,
        end: finalDrag.end,
        scaleFactor: currentMonitor.scale_factor,
        monitor: currentMonitor,
      });

      if (!region) {
        void cancelCapture();
        return;
      }

      void completeCapture(region);
    };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
  };

  const scaleFactor = monitor?.scale_factor && monitor.scale_factor > 0 ? monitor.scale_factor : 1;
  const logicalWidth = monitor ? monitor.width / scaleFactor : 0;
  const logicalHeight = monitor ? monitor.height / scaleFactor : 0;

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white"
      onContextMenu={(event) => {
        event.preventDefault();
        void cancelCapture();
      }}
      onMouseDown={handleMouseDown}
      style={{
        backgroundImage: monitor
          ? `url(data:image/png;base64,${monitor.base64_png})`
          : undefined,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: '0 0',
        backgroundSize: monitor ? `${logicalWidth}px ${logicalHeight}px` : undefined,
      }}
    >
      {monitor ? <SelectionMask selection={selection} /> : null}
      {loading ? (
        <div className="absolute inset-0 grid place-items-center bg-black/40 text-sm">
          正在准备截图…
        </div>
      ) : null}
    </div>
  );
}

function SelectionMask({ selection }: { selection: SelectionRect | null }) {
  if (!selection) {
    return <div className="absolute inset-0 bg-black/40 pointer-events-none" />;
  }

  const right = selection.left + selection.width;
  const bottom = selection.top + selection.height;

  return (
    <>
      <div
        className="absolute left-0 right-0 top-0 bg-black/40 pointer-events-none"
        style={{ height: selection.top }}
      />
      <div
        className="absolute left-0 right-0 bg-black/40 pointer-events-none"
        style={{ top: bottom, bottom: 0 }}
      />
      <div
        className="absolute left-0 bg-black/40 pointer-events-none"
        style={{ top: selection.top, width: selection.left, height: selection.height }}
      />
      <div
        className="absolute right-0 bg-black/40 pointer-events-none"
        style={{ top: selection.top, left: right, height: selection.height }}
      />
      <div
        className="absolute border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)] pointer-events-none"
        style={selection}
      />
    </>
  );
}

async function captureRequestedMonitor(request: OverlayRequest) {
  if (typeof request.cursorX === 'number' && typeof request.cursorY === 'number') {
    return invoke<MonitorCapture>('capture_monitor_at_point', {
      x: Math.round(request.cursorX),
      y: Math.round(request.cursorY),
    });
  }

  return invoke<MonitorCapture>('capture_monitor_at_cursor');
}

async function takePendingOverlayRequest() {
  return invoke<OverlayRequest | null>('take_pending_screenshot_overlay_request').catch(() => null);
}

function rectFromDrag({ start, end }: DragState): SelectionRect {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);

  return {
    left,
    top,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

async function cropMonitorPng(base64Png: string, region: NonNullable<ReturnType<typeof computeCropRegion>>) {
  const image = await loadImage(`data:image/png;base64,${base64Png}`);
  const canvas = document.createElement('canvas');
  canvas.width = region.sw;
  canvas.height = region.sh;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context is unavailable');
  }

  context.drawImage(
    image,
    region.sx,
    region.sy,
    region.sw,
    region.sh,
    0,
    0,
    region.sw,
    region.sh,
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Failed to encode cropped screenshot');
  }

  return blobToBase64(blob);
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load captured screenshot'));
    image.src = src;
  });
}

async function blobToBase64(blob: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read screenshot blob'));
    reader.readAsDataURL(blob);
  });

  const base64Data = dataUrl.split(',', 2)[1];
  if (!base64Data) {
    throw new Error('Screenshot blob did not produce base64 data');
  }

  return base64Data;
}
