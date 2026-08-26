import * as d3 from "d3";
import type { MutableRefObject } from "react";
import type { TreeNode, TreeLink } from "../types";
import { lifespan, isLiving, ringLabel } from "../utils/format";
import { nodeX, nodeY } from "../hooks/useTreeLayout";

const NODE_RADIUS = 22;

export interface NodeHandlers {
  onNodeClick: (node: TreeNode) => void;
  onNodeHover: (node: TreeNode, clientX: number, clientY: number) => void;
  onNodeMove: (clientX: number, clientY: number) => void;
  onNodeLeave: () => void;
}

type GSel = d3.Selection<SVGGElement, unknown, null, undefined>;

/** Smooth radial branch: bezier whose control points sit on each node's own
 * angle at the mid-radius, so branches curve rather than read as spokes. */
export function linkPath(d: TreeLink): string {
  const s = d.source as TreeNode;
  const t = d.target as TreeNode;
  const sx = nodeX(s);
  const sy = nodeY(s);
  const tx = nodeX(t);
  const ty = nodeY(t);
  const midR = (s.y + t.y) / 2;
  const c1x = midR * Math.cos(s.x);
  const c1y = -midR * Math.sin(s.x);
  const c2x = midR * Math.cos(t.x);
  const c2y = -midR * Math.sin(t.x);
  return `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${tx},${ty}`;
}

/** Semicircular generation-ring guide at radius r. */
export function ringPath(r: number): string {
  return `M ${-r},0 A ${r},${r} 0 0 1 ${r},0`;
}

/** A handful of static decorative roots spreading below the trunk — purely
 * ornamental, grounds the tree at its anchor point. */
export function drawRootFlourish(layer: GSel): void {
  const roots = [
    "M0,0 C -18,26 -46,34 -78,58",
    "M0,0 C -8,30 -14,52 -20,84",
    "M0,0 C 6,28 6,54 4,86",
    "M0,0 C 18,26 46,34 78,58",
    "M0,0 C -30,18 -60,20 -92,36",
    "M0,0 C 30,18 60,20 92,36",
  ];
  layer
    .selectAll<SVGPathElement, string>("path")
    .data(roots)
    .join("path")
    .attr("d", (d) => d);
}

export function drawRings(layer: GSel, maxDepth: number, ringSpacing: number): void {
  const rings = d3.range(1, maxDepth + 1).map((depth) => depth * ringSpacing);

  layer
    .selectAll<SVGPathElement, number>("path.ring")
    .data(rings)
    .join("path")
    .attr("class", "ring")
    .attr("d", ringPath);

  layer
    .selectAll<SVGTextElement, number>("text.ring-label")
    .data(rings)
    .join("text")
    .attr("class", "ring-label")
    .attr("x", (r) => -r - 6)
    .attr("y", 4)
    .attr("text-anchor", "end")
    .text((_r, i) => ringLabel(i));
}

export function drawLinks(layer: GSel, links: TreeLink[]): void {
  layer
    .selectAll<SVGPathElement, TreeLink>("path.link")
    .data(links, (d) => (d.target as TreeNode).data.id)
    .join("path")
    .attr("class", "link")
    .attr("d", linkPath);
}

export function drawNodes(
  layer: GSel,
  nodes: TreeNode[],
  handlersRef: MutableRefObject<NodeHandlers>
): void {
  layer
    .selectAll<SVGGElement, TreeNode>("g.node")
    .data(nodes, (d) => d.data.id)
    .join((enter) => {
      const g = enter
        .append("g")
        .attr(
          "class",
          (d) => `node ${d.depth === 0 ? "node--trunk" : ""} ${isLiving(d.data) ? "node--living" : ""}`
        )
        .attr("transform", (d) => `translate(${nodeX(d)},${nodeY(d)})`)
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("aria-label", (d) => `${d.data.name}, ${lifespan(d.data)}`);

      const r = (d: TreeNode) => (d.depth === 0 ? NODE_RADIUS + 6 : NODE_RADIUS);

      g.append("circle")
        .attr("class", "node-halo")
        .attr("r", (d) => r(d) + 6);

      g.append("clipPath")
        .attr("id", (d) => `clip-${d.data.id}`)
        .append("circle")
        .attr("r", (d) => r(d) - 2);

      g.append("circle").attr("class", "node-photo-ring").attr("r", r);

      g.append("image")
        .attr("class", "node-photo")
        .attr("href", (d) => d.data.photo || "https://placehold.co/120x120/1b2621/c9a066?text=%3F")
        .attr("x", (d) => -(r(d) - 2))
        .attr("y", (d) => -(r(d) - 2))
        .attr("width", (d) => (r(d) - 2) * 2)
        .attr("height", (d) => (r(d) - 2) * 2)
        .attr("clip-path", (d) => `url(#clip-${d.data.id})`)
        .attr("preserveAspectRatio", "xMidYMid slice");

      g.append("text")
        .attr("class", "node-label")
        .attr("y", (d) => r(d) + 17)
        .attr("font-size", (d) => (d.depth === 0 ? 13.5 : 12))
        .text((d) => d.data.name);

      g.append("text")
        .attr("class", "node-years")
        .attr("y", (d) => r(d) + 31)
        .attr("font-size", 9.5)
        .text((d) => lifespan(d.data));

      g.on("mouseenter", (event: MouseEvent, d) => {
        handlersRef.current.onNodeHover(d, event.clientX, event.clientY);
      })
        .on("mousemove", (event: MouseEvent) => {
          handlersRef.current.onNodeMove(event.clientX, event.clientY);
        })
        .on("mouseleave", () => {
          handlersRef.current.onNodeLeave();
        })
        .on("click", (event: MouseEvent, d) => {
          event.stopPropagation();
          handlersRef.current.onNodeLeave();
          handlersRef.current.onNodeClick(d);
        })
        .on("keydown", (event: KeyboardEvent, d) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handlersRef.current.onNodeClick(d);
          }
        });

      return g;
    });
}
