import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";
import type { TreeLayout } from "../hooks/useTreeLayout";
import { nodeX, nodeY } from "../hooks/useTreeLayout";
import type { TreeNode } from "../types";
import { drawLinks, drawNodes, drawRootFlourish, drawRings, drawSpouses, type NodeHandlers } from "../lib/renderTree";

const MIN_ZOOM = 0.14;
const MAX_ZOOM = 3.5;

// Extra room (px, at scale 1) reserved around the raw node positions when
// framing the tree, so labels and spouse badges hanging off the outermost
// nodes never get clipped by the initial fit.
const FIT_PADDING = 170;

export interface FamilyTreeHandle {
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  panToNode(id: string): void;
}

interface FamilyTreeProps {
  layout: TreeLayout;
  activeId: string | null;
  matchIds: Set<string> | null;
  onNodeClick: (node: TreeNode) => void;
  onNodeHover: (node: TreeNode, clientX: number, clientY: number) => void;
  onNodeMove: (clientX: number, clientY: number) => void;
  onNodeLeave: () => void;
}

const FamilyTree = forwardRef<FamilyTreeHandle, FamilyTreeProps>(function FamilyTree(
  { layout, activeId, matchIds, onNodeClick, onNodeHover, onNodeMove, onNodeLeave },
  ref
) {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const ringsLayerRef = useRef<SVGGElement>(null);
  const flourishLayerRef = useRef<SVGGElement>(null);
  const linksLayerRef = useRef<SVGGElement>(null);
  const nodesLayerRef = useRef<SVGGElement>(null);
  const spousesLayerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const layoutRef = useRef<TreeLayout>(layout);
  layoutRef.current = layout;

  // Latest event-handler props, read by D3 callbacks that are bound once.
  // Keeps the draw effect from re-binding listeners on every parent render.
  const handlersRef = useRef<NodeHandlers>({
    onNodeClick,
    onNodeHover,
    onNodeMove,
    onNodeLeave,
  });
  useEffect(() => {
    handlersRef.current = { onNodeClick, onNodeHover, onNodeMove, onNodeLeave };
  }, [onNodeClick, onNodeHover, onNodeMove, onNodeLeave]);

  /**
   * Frames the whole tree inside the stage, however big it is. Rather than a
   * fixed guess-and-check scale (which breaks the moment the dataset grows
   * or shrinks), this measures the actual node bounding box for the current
   * layout and solves for the scale + offset that fits it with breathing
   * room for labels/spouse badges — so a 12-person tree and a 268-person,
   * 5-generation one both open perfectly framed.
   */
  const fitToView = (instant: boolean) => {
    const svg = svgRef.current;
    const stage = stageRef.current;
    const zoom = zoomRef.current;
    const currentLayout = layoutRef.current;
    if (!svg || !stage || !zoom || currentLayout.nodes.length === 0) return;

    const rect = stage.getBoundingClientRect();

    let minX = 0;
    let maxX = 0;
    let minY = 0;
    currentLayout.nodes.forEach((n) => {
      const x = nodeX(n);
      const y = nodeY(n);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y; // node y is <= 0 (root at 0, fan extends upward)
    });

    const contentWidth = maxX - minX + FIT_PADDING * 2;
    const contentHeight = -minY + FIT_PADDING + 90; // +90: room for the root flourish below the trunk
    const availW = Math.max(rect.width - 60, 100);
    const availH = Math.max(rect.height - 100, 100);

    const scale = Math.min(availW / contentWidth, availH / contentHeight, 1);
    const clampedScale = Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);

    const midX = (minX + maxX) / 2;
    const transform = d3.zoomIdentity
      .translate(rect.width / 2 - midX * clampedScale, rect.height - 70)
      .scale(clampedScale);

    const selection = d3.select(svg);
    if (instant) {
      selection.call(zoom.transform, transform);
    } else {
      selection.transition().duration(650).ease(d3.easeCubicOut).call(zoom.transform, transform);
    }
  };

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    d3.select(svg).transition().duration(220).call(zoom.scaleBy, factor);
  };

  const panToNode = (node: TreeNode) => {
    const svg = svgRef.current;
    const stage = stageRef.current;
    const zoom = zoomRef.current;
    if (!svg || !stage || !zoom) return;

    const rect = stage.getBoundingClientRect();
    const currentScale = d3.zoomTransform(svg).k;
    const targetScale = Math.max(currentScale, 1.1);
    const x = nodeX(node);
    const y = nodeY(node);

    const transform = d3.zoomIdentity
      .translate(rect.width / 2 - x * targetScale, rect.height * 0.6 - y * targetScale)
      .scale(targetScale);

    d3.select(svg).transition().duration(650).call(zoom.transform, transform);
  };

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomBy(1.35),
      zoomOut: () => zoomBy(1 / 1.35),
      resetView: () => fitToView(false),
      panToNode: (id: string) => {
        const node = layout.nodes.find((n) => n.data.id === id);
        if (node) panToNode(node);
      },
    }),
    [layout]
  );

  // Set up zoom/pan once on mount.
  useEffect(() => {
    const svg = svgRef.current;
    const viewport = viewportRef.current;
    if (!svg || !viewport) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on("zoom", (event) => {
        d3.select(viewport).attr("transform", event.transform.toString());
      });

    d3.select(svg).call(zoom).on("dblclick.zoom", null);
    zoomRef.current = zoom;

    fitToView(true);

    const handleResize = () => {
      const t = d3.zoomTransform(svg);
      d3.select(svg).call(zoom.transform, d3.zoomIdentity.translate(t.x, t.y).scale(t.k));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fit whenever the underlying dataset actually changes shape (not on
  // every render — activeId/matchIds updates shouldn't yank the viewport).
  const nodeCountRef = useRef<number>(0);
  useEffect(() => {
    if (!ringsLayerRef.current || !flourishLayerRef.current || !linksLayerRef.current || !nodesLayerRef.current || !spousesLayerRef.current) {
      return;
    }
    drawRootFlourish(d3.select(flourishLayerRef.current));
    drawRings(d3.select(ringsLayerRef.current), layout.maxDepth, layout.ringSpacing);
    drawLinks(d3.select(linksLayerRef.current), layout.links, layout.maxDepth);
    drawNodes(d3.select(nodesLayerRef.current), layout.nodes, layout.maxDepth, handlersRef);
    drawSpouses(d3.select(spousesLayerRef.current), layout.nodes, layout.maxDepth);

    if (layout.nodes.length !== nodeCountRef.current) {
      nodeCountRef.current = layout.nodes.length;
      fitToView(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Highlight active/dimmed state without re-drawing the whole tree.
  useEffect(() => {
    if (!nodesLayerRef.current || !linksLayerRef.current || !spousesLayerRef.current) return;

    d3.select(nodesLayerRef.current)
      .selectAll<SVGGElement, TreeNode>("g.node")
      .classed("is-active", (d) => d.data.id === activeId)
      .classed("is-dimmed", (d) => matchIds != null && !matchIds.has(d.data.id));

    d3.select(linksLayerRef.current)
      .selectAll<SVGPathElement, d3.HierarchyLink<unknown>>("path.link")
      .classed(
        "is-dimmed",
        (d) =>
          matchIds != null &&
          (!matchIds.has((d.source as TreeNode).data.id) || !matchIds.has((d.target as TreeNode).data.id))
      );

    d3.select(spousesLayerRef.current)
      .selectAll<SVGGElement, { host: TreeNode }>("g.spouse")
      .classed("is-dimmed", (d) => matchIds != null && !matchIds.has(d.host.data.id));
  }, [activeId, matchIds, layout]);

  return (
    <div ref={stageRef} className="stage">
      <div className="stage-vignette" aria-hidden="true" />
      <svg
        id="tree-canvas"
        ref={svgRef}
        aria-label="Interactive radial family tree of the Yggdrasil lineage"
      >
        <g ref={viewportRef} className="viewport">
          <g ref={ringsLayerRef} className="rings-layer" />
          <g ref={flourishLayerRef} className="root-flourish" />
          <g ref={linksLayerRef} className="links-layer" />
          <g ref={nodesLayerRef} className="nodes-layer" />
          <g ref={spousesLayerRef} className="spouses-layer" />
        </g>
      </svg>
      <p className="stage-hint">Scroll or pinch to zoom · Drag to pan · Click a name for their record</p>
    </div>
  );
});

export default FamilyTree;
