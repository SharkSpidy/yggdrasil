import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import type { TreeLayout } from "../hooks/useTreeLayout";
import { nodeX, nodeY } from "../hooks/useTreeLayout";
import type { TreeNode } from "../types";
import {
  drawLeaves,
  drawLinks,
  drawNodes,
  drawRootFlourish,
  drawRings,
  drawSpouses,
  type NodeHandlers,
} from "../lib/renderTree";

const MIN_ZOOM = 0.14;
const MAX_ZOOM = 3.5;

// Extra room (px, at scale 1) reserved around the raw node positions when
// framing the currently-visible part of the tree, so labels/spouse badges
// on the outermost visible nodes never get clipped by the fit.
const FIT_PADDING = 170;

export interface FamilyTreeHandle {
  zoomIn(): void;
  zoomOut(): void;
  resetView(): void;
  /** Reveals every ancestor of `id` (growing the vine toward it if needed)
   *  and pans to it once it's on screen. Used by search. */
  revealAndPanTo(id: string): void;
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
  const leavesLayerRef = useRef<SVGGElement>(null);
  const nodesLayerRef = useRef<SVGGElement>(null);
  const spousesLayerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Which nodes have chosen to reveal their children. The root always starts
  // expanded, so the very first paint is "parent + one layer of children" —
  // everything deeper only exists once someone clicks their way to it.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set([layout.root.data.id]));
  const rootIdRef = useRef(layout.root.data.id);

  // If the underlying dataset itself changes (a real reload, not just a
  // click), reset back to the default "one layer" view.
  useEffect(() => {
    if (layout.root.data.id !== rootIdRef.current) {
      rootIdRef.current = layout.root.data.id;
      setExpandedIds(new Set([layout.root.data.id]));
    }
  }, [layout.root]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // A node is visible iff every one of its ancestors has chosen to reveal
  // its children. The root has no ancestors, so it's always visible.
  const isVisible = (node: TreeNode): boolean =>
    node.ancestors().slice(1).every((a) => expandedIds.has(a.data.id));

  const visibleNodes = useMemo(() => layout.nodes.filter(isVisible), [layout.nodes, expandedIds]);
  const visibleLinks = useMemo(
    () => layout.links.filter((l) => isVisible(l.target as TreeNode)),
    [layout.links, expandedIds]
  );

  const layoutRef = useRef<TreeLayout>(layout);
  layoutRef.current = layout;
  const visibleNodesRef = useRef<TreeNode[]>(visibleNodes);
  visibleNodesRef.current = visibleNodes;

  // Latest event-handler props, read by D3 callbacks that are bound once.
  const handlersRef = useRef<NodeHandlers>({
    onNodeClick,
    onToggleExpand: toggleExpand,
    onNodeHover,
    onNodeMove,
    onNodeLeave,
  });
  useEffect(() => {
    handlersRef.current = { onNodeClick, onToggleExpand: toggleExpand, onNodeHover, onNodeMove, onNodeLeave };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onNodeClick, onNodeHover, onNodeMove, onNodeLeave]);

  /** Frames whatever is currently visible — not the whole dataset — so the
   *  camera stays close to the action and gently widens as branches unfurl. */
  const fitToView = (instant: boolean) => {
    const svg = svgRef.current;
    const stage = stageRef.current;
    const zoom = zoomRef.current;
    const visible = visibleNodesRef.current;
    if (!svg || !stage || !zoom || visible.length === 0) return;

    const rect = stage.getBoundingClientRect();

    let minX = 0;
    let maxX = 0;
    let minY = 0;
    visible.forEach((n) => {
      const x = nodeX(n);
      const y = nodeY(n);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
    });

    const contentWidth = maxX - minX + FIT_PADDING * 2;
    const contentHeight = -minY + FIT_PADDING + 90;
    const availW = Math.max(rect.width - 60, 100);
    const availH = Math.max(rect.height - 100, 100);

    const scale = Math.min(availW / contentWidth, availH / contentHeight, 1.3);
    const clampedScale = Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);

    const midX = (minX + maxX) / 2;
    const transform = d3.zoomIdentity
      .translate(rect.width / 2 - midX * clampedScale, rect.height - 70)
      .scale(clampedScale);

    const selection = d3.select(svg);
    if (instant) {
      selection.call(zoom.transform, transform);
    } else {
      selection.transition().duration(700).ease(d3.easeCubicOut).call(zoom.transform, transform);
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
      revealAndPanTo: (id: string) => {
        const target = layoutRef.current.nodes.find((n) => n.data.id === id);
        if (!target) return;

        const ancestorIds = target.ancestors().map((a) => a.data.id);
        setExpandedIds((prev) => {
          const next = new Set(prev);
          let changed = false;
          ancestorIds.forEach((aid) => {
            if (!next.has(aid)) {
              next.add(aid);
              changed = true;
            }
          });
          return changed ? next : prev;
        });

        // Give the reveal animation a beat to lay branches out before panning.
        window.setTimeout(() => panToNode(target), 260);
      },
    }),
    []
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

  // Draw the static backdrop once per dataset change.
  useEffect(() => {
    if (!ringsLayerRef.current || !flourishLayerRef.current) return;
    drawRootFlourish(d3.select(flourishLayerRef.current));
    drawRings(d3.select(ringsLayerRef.current), layout.maxDepth, layout.ringSpacing);
  }, [layout]);

  // Draw the interactive, growing part of the tree whenever what's visible
  // changes — either because someone clicked a node, or the dataset reloaded.
  const isFirstDraw = useRef(true);
  useEffect(() => {
    if (!linksLayerRef.current || !leavesLayerRef.current || !nodesLayerRef.current || !spousesLayerRef.current) {
      return;
    }
    drawLinks(d3.select(linksLayerRef.current), visibleLinks, layout.maxDepth);
    drawLeaves(d3.select(leavesLayerRef.current), visibleLinks);
    drawNodes(d3.select(nodesLayerRef.current), visibleNodes, layout.maxDepth, expandedIds, handlersRef);
    drawSpouses(d3.select(spousesLayerRef.current), visibleNodes, layout.maxDepth);

    fitToView(isFirstDraw.current);
    isFirstDraw.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNodes, visibleLinks, layout]);

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
  }, [activeId, matchIds, visibleNodes]);

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
          <g ref={leavesLayerRef} className="leaves-layer" />
          <g ref={nodesLayerRef} className="nodes-layer" />
          <g ref={spousesLayerRef} className="spouses-layer" />
        </g>
      </svg>
      <p className="stage-hint">Select a name to grow their branch · Pinch or scroll to zoom · Drag to pan</p>
    </div>
  );
});

export default FamilyTree;
