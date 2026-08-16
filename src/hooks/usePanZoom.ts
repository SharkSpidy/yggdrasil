import { useCallback, useRef, useState } from 'react';

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2;
const ZOOM_STEP = 0.15;

/**
 * Drag-to-pan + wheel/button zoom for a large canvas surface.
 *
 * Implementation notes:
 *  - Pan is implemented with pointer events (not native HTML5 drag-and-drop)
 *    so it works uniformly across mouse/touch/pen and doesn't fight the
 *    browser's default drag-image ghosting.
 *  - Transform state is applied via a single CSS `transform` on one wrapper
 *    element, so panning/zooming 100+ child nodes costs one composited
 *    layer update rather than 100+ individual re-layouts.
 *  - Drag deltas are computed from pointer position deltas rather than
 *    re-reading getBoundingClientRect every move, keeping the hot path cheap.
 */
export function usePanZoom(initial: Transform = { x: 0, y: 0, scale: 1 }) {
  const [transform, setTransform] = useState<Transform>(initial);
  const isPanning = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Ignore drags started on interactive elements (cards handle their own click).
    if ((e.target as HTMLElement).closest('[data-node-card]')) return;
    isPanning.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  }, []);

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setTransform((t) => {
      const nextScale = clamp(t.scale + delta, MIN_SCALE, MAX_SCALE);
      return { ...t, scale: nextScale };
    });
  }, []);

  const zoomIn = useCallback(() => {
    setTransform((t) => ({ ...t, scale: clamp(t.scale + ZOOM_STEP, MIN_SCALE, MAX_SCALE) }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((t) => ({ ...t, scale: clamp(t.scale - ZOOM_STEP, MIN_SCALE, MAX_SCALE) }));
  }, []);

  const resetView = useCallback((next?: Partial<Transform>) => {
    setTransform((t) => ({ ...t, x: next?.x ?? 0, y: next?.y ?? 0, scale: next?.scale ?? 1 }));
  }, []);

  const centerOn = useCallback((nodeX: number, nodeY: number, viewportW: number, viewportH: number) => {
    setTransform((t) => ({
      ...t,
      x: viewportW / 2 - nodeX * t.scale,
      y: viewportH / 2 - nodeY * t.scale,
    }));
  }, []);

  return {
    transform,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endPan, onPointerLeave: endPan, onWheel },
    zoomIn,
    zoomOut,
    resetView,
    centerOn,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
