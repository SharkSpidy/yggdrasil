import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as d3 from "d3";
import type { TreeLayout } from "../hooks/useTreeLayout";
import type { TreeNode } from "../types";
import { drawLinks, drawNodes, drawRootFlourish, drawRings, type NodeHandlers } from "../lib/renderTree";
import { RING_SPACING } from "../hooks/useTreeLayout";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.5;

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
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

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

  const fitToView = (instant: boolean) => {
    const svg = svgRef.current;
    const stage = stageRef.current;
    const zoom = zoomRef.current;
    if (!svg || !stage || !zoom) return;

    const rect = stage.getBoundingClientRect();
    const scale = 0.82;
    const transform = d3.zoomIdentity.translate(rect.width / 2, rect.height - 70).scale(scale);

    const selection = d3.select(svg);
    if (instant) {
      selection.call(zoom.transform, transform);
    } else {
      selection.transition().duration(600).call(zoom.transform, transform);
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
    const x = node.y * Math.cos(node.x);
    const y = -node.y * Math.sin(node.x);

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

  // Draw / update the tree whenever the layout changes.
  useEffect(() => {
    if (!ringsLayerRef.current || !flourishLayerRef.current || !linksLayerRef.current || !nodesLayerRef.current) {
      return;
    }
    drawRootFlourish(d3.select(flourishLayerRef.current));
    drawRings(d3.select(ringsLayerRef.current), layout.maxDepth, RING_SPACING);
    drawLinks(d3.select(linksLayerRef.current), layout.links);
    drawNodes(d3.select(nodesLayerRef.current), layout.nodes, handlersRef);
  }, [layout]);

  // Highlight active/dimmed state without re-drawing the whole tree.
  useEffect(() => {
    if (!nodesLayerRef.current || !linksLayerRef.current) return;

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
        </g>
      </svg>
      <p className="stage-hint">Scroll or pinch to zoom · Drag to pan · Click a name for their record</p>
    </div>
  );
});

export default FamilyTree;
