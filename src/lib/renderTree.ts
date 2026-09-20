import * as d3 from "d3";
import type { MutableRefObject } from "react";
import type { TreeNode, TreeLink, SpouseInfo } from "../types";
import { lifespan, isLiving, ringLabel } from "../utils/format";
import { nodeX, nodeY } from "../hooks/useTreeLayout";

export interface NodeHandlers {
  onNodeClick: (node: TreeNode) => void;
  onNodeHover: (node: TreeNode, clientX: number, clientY: number) => void;
  onNodeMove: (clientX: number, clientY: number) => void;
  onNodeLeave: () => void;
}

type GSel = d3.Selection<SVGGElement, unknown, null, undefined>;

/* ==========================================================================
   DETERMINISTIC "RANDOMNESS"
   Every organic wobble below is seeded off a node's own id, so the vines
   and leaf-blobs look hand-grown but never jitter or re-shuffle on re-render.
   ========================================================================== */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ==========================================================================
   GENERATIONAL VISUAL HIERARCHY
   One palette walks from aged gold at the trunk to soft new-growth green at
   the outer rings; node size and branch thickness taper the same way, so
   depth reads instantly even before you look at a single label.
   ========================================================================== */

const GEN_PALETTE = ["#e8c97a", "#c9a066", "#b78a4a", "#8fb094", "#6b8f71", "#4f6f57"];
const generationInterpolator = d3.interpolateRgbBasis(GEN_PALETTE);

export function generationColor(depth: number, maxDepth: number): string {
  const t = maxDepth > 0 ? Math.min(depth / maxDepth, 1) : 0;
  return generationInterpolator(t);
}

/** Base photo-node radius for a generation; shrinks gently with depth so the
 *  ancestral trunk anchors the composition and outer generations stay light. */
export function nodeRadius(depth: number): number {
  return Math.max(15, 29 - depth * 3);
}

/** Branch stroke tapers from a solid trunk down to slender outer twigs. */
export function linkWidth(targetDepth: number, maxDepth: number): number {
  const t = maxDepth > 0 ? Math.min(targetDepth / maxDepth, 1) : 0;
  return 3.2 - t * 2;
}

/** The photo-circle radius actually drawn for a primary node — the trunk
 *  gets a small ceremonial bump over the plain per-depth radius. */
export function primaryRadius(d: TreeNode): number {
  return d.depth === 0 ? nodeRadius(d.depth) + 6 : nodeRadius(d.depth);
}

/* ==========================================================================
   LINKS — flowing vine curves
   ========================================================================== */

/** Smooth radial branch rendered as an S-curve rather than a single bulging
 *  bezier: two control radii (not one shared midpoint) plus a tiny seeded
 *  angular wobble make each branch read as grown, not drafted. */
export function linkPath(d: TreeLink, maxDepth: number): string {
  const s = d.source as TreeNode;
  const t = d.target as TreeNode;
  const sx = nodeX(s);
  const sy = nodeY(s);
  const tx = nodeX(t);
  const ty = nodeY(t);

  const rnd = mulberry32(hashStr(t.data.id));
  const wobbleScale = maxDepth > 0 ? 1 - t.depth / (maxDepth + 2) : 1; // inner branches wobble a touch more
  const wobble = (rnd() - 0.5) * 0.1 * wobbleScale;

  const r1 = s.y + (t.y - s.y) * 0.36;
  const r2 = s.y + (t.y - s.y) * 0.74;
  const a1 = s.x + wobble;
  const a2 = t.x - wobble * 0.6;

  const c1x = r1 * Math.cos(a1);
  const c1y = -r1 * Math.sin(a1);
  const c2x = r2 * Math.cos(a2);
  const c2y = -r2 * Math.sin(a2);

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

export function drawLinks(layer: GSel, links: TreeLink[], maxDepth: number): void {
  layer
    .selectAll<SVGPathElement, TreeLink>("path.link")
    .data(links, (d) => (d.target as TreeNode).data.id)
    .join("path")
    .attr("class", "link")
    .attr("d", (d) => linkPath(d, maxDepth))
    .attr("stroke", (d) => generationColor((d.target as TreeNode).depth, maxDepth))
    .attr("stroke-width", (d) => linkWidth((d.target as TreeNode).depth, maxDepth));
}

/* ==========================================================================
   ORGANIC "LEAF" HALO
   A soft, irregular blob drawn behind each photo circle so nodes read as
   botanical growths rather than mechanical dots. Shape is a closed radial
   spline through seeded points — cheap vector geometry, no runtime filters,
   so it stays smooth while panning/zooming a few hundred of these at once.
   ========================================================================== */

function leafBlobPath(seed: string, baseR: number): string {
  const rnd = mulberry32(hashStr(seed));
  const pointCount = 9;
  const phase = rnd() * Math.PI * 2;
  const points: Array<[number, number]> = d3.range(pointCount).map((i) => {
    const angle = (i / pointCount) * Math.PI * 2;
    const variance = 0.14 + rnd() * 0.12;
    const r = baseR * (1 + variance * Math.sin(angle * 2 + phase));
    return [angle, r];
  });

  const line = d3
    .lineRadial<[number, number]>()
    .angle((p) => p[0])
    .radius((p) => p[1])
    .curve(d3.curveBasisClosed);

  return line(points) ?? "";
}

/* ==========================================================================
   PRIMARY NODES
   ========================================================================== */

export function drawNodes(
  layer: GSel,
  nodes: TreeNode[],
  maxDepth: number,
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

      const r = primaryRadius;

      // Soft irregular leaf-blob, tinted by generation — the "botanical"
      // layer that sits behind the crisp photo circle.
      g.append("path")
        .attr("class", "node-blob")
        .attr("d", (d) => leafBlobPath(d.data.id, r(d) + 9))
        .attr("fill", (d) => generationColor(d.depth, maxDepth));

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

/* ==========================================================================
   SPOUSE COMPANIONS
   Spouses live as an attribute on their partner in the data (no id, no
   children of their own), so they're drawn as a smaller badge bound tight
   to the primary node's own tangent — never as an independent branch —
   joined by a short curling "tie" vine instead of a structural link.
   ========================================================================== */

interface SpouseDatum {
  key: string;
  host: TreeNode;
  spouse: SpouseInfo;
}

/** Unit vector tangent to the fan at this node's angle — i.e. "sideways",
 *  perpendicular to the radial direction the node itself sits along. */
function tangentUnit(d: TreeNode): { tx: number; ty: number; ux: number; uy: number } {
  const ux = Math.cos(d.x);
  const uy = -Math.sin(d.x);
  return { tx: -uy, ty: ux, ux, uy };
}

function spouseLifespan(s: SpouseInfo): string {
  const born = s.born ?? "?";
  const died = s.died != null ? s.died : "present";
  return `${born} – ${died}`;
}

/** Short curling vine tying a spouse badge to its partner, bulging gently
 *  outward (radially) so it doesn't read as a rigid strut. */
function tiePath(hostR: number, spouseR: number, d: TreeNode) {
  const { tx, ty, ux, uy } = tangentUnit(d);
  const dist = hostR + spouseR + 7;
  const startX = tx * hostR;
  const startY = ty * hostR;
  const endX = tx * dist - tx * spouseR;
  const endY = ty * dist - ty * spouseR;
  const bulge = 5;
  const midX = (startX + endX) / 2 + ux * bulge;
  const midY = (startY + endY) / 2 + uy * bulge;
  return `M${startX},${startY} Q${midX},${midY} ${endX},${endY}`;
}

export function drawSpouses(layer: GSel, nodes: TreeNode[], maxDepth: number): void {
  const data: SpouseDatum[] = nodes
    .filter((d) => d.data.spouse)
    .map((d) => ({ key: `${d.data.id}__spouse`, host: d, spouse: d.data.spouse as SpouseInfo }));

  layer
    .selectAll<SVGGElement, SpouseDatum>("g.spouse")
    .data(data, (d) => d.key)
    .join((enter) => {
      const g = enter
        .append("g")
        .attr("class", (d) => `spouse ${d.spouse.died == null ? "node--living" : ""}`)
        .attr("transform", (d) => {
          const hostR = primaryRadius(d.host);
          const spouseR = Math.max(11, hostR * 0.72);
          const { tx, ty } = tangentUnit(d.host);
          const dist = hostR + spouseR + 7;
          return `translate(${nodeX(d.host) + tx * dist},${nodeY(d.host) + ty * dist})`;
        });

      g.append("path")
        .attr("class", "spouse-tie")
        .attr("transform", (d) => `translate(${nodeX(d.host)},${nodeY(d.host)})`)
        .attr("d", (d) => {
          const hostR = primaryRadius(d.host);
          const spouseR = Math.max(11, hostR * 0.72);
          return tiePath(hostR, spouseR, d.host);
        });

      const spouseR = (d: SpouseDatum) => {
        const hostR = primaryRadius(d.host);
        return Math.max(11, hostR * 0.72);
      };

      g.append("path")
        .attr("class", "node-blob spouse-blob")
        .attr("d", (d) => leafBlobPath(d.key, spouseR(d) + 6))
        .attr("fill", (d) => generationColor(d.host.depth, maxDepth));

      g.append("clipPath")
        .attr("id", (d) => `clip-${d.key}`)
        .append("circle")
        .attr("r", (d) => spouseR(d) - 2);

      g.append("circle")
        .attr("class", "node-photo-ring spouse-photo-ring")
        .attr("r", spouseR);

      g.append("image")
        .attr("class", "node-photo")
        .attr("href", (d) => d.spouse.photo || "https://placehold.co/96x96/1b2621/8fb094?text=%3F")
        .attr("x", (d) => -(spouseR(d) - 2))
        .attr("y", (d) => -(spouseR(d) - 2))
        .attr("width", (d) => (spouseR(d) - 2) * 2)
        .attr("height", (d) => (spouseR(d) - 2) * 2)
        .attr("clip-path", (d) => `url(#clip-${d.key})`)
        .attr("preserveAspectRatio", "xMidYMid slice");

      g.append("text")
        .attr("class", "node-label spouse-label")
        .attr("y", (d) => spouseR(d) + 15)
        .attr("font-size", 10.5)
        .text((d) => d.spouse.name);

      g.append("text")
        .attr("class", "node-years spouse-years")
        .attr("y", (d) => spouseR(d) + 27)
        .attr("font-size", 8.5)
        .text((d) => spouseLifespan(d.spouse));

      g.append("title").text((d) => `${d.spouse.name} · ${spouseLifespan(d.spouse)}`);

      return g;
    });
}
