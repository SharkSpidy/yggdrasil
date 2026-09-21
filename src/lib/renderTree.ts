import * as d3 from "d3";
import type { MutableRefObject } from "react";
import type { TreeNode, TreeLink, SpouseInfo } from "../types";
import { lifespan, isLiving, ringLabel } from "../utils/format";
import { nodeX, nodeY } from "../hooks/useTreeLayout";

export interface NodeHandlers {
  onNodeClick: (node: TreeNode) => void;
  onToggleExpand: (id: string) => void;
  onNodeHover: (node: TreeNode, clientX: number, clientY: number) => void;
  onNodeMove: (clientX: number, clientY: number) => void;
  onNodeLeave: () => void;
}

type GSel = d3.Selection<SVGGElement, unknown, null, undefined>;

/* Timings shared across the grow-in choreography — tune these together. */
const GROW_DURATION = 640; // how long a branch takes to draw itself in, ms
const NODE_POP_DELAY = GROW_DURATION * 0.7; // node starts popping in just before the vine finishes reaching it
const NODE_POP_DURATION = 420;
const LEAF_DURATION = 260;
const SHRINK_DURATION = 260; // collapse is quicker/simpler than growth

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
   GENERATIONAL VISUAL HIERARCHY  (unchanged palette — same theme throughout)
   ========================================================================== */

const GEN_PALETTE = ["#e8c97a", "#c9a066", "#b78a4a", "#8fb094", "#6b8f71", "#4f6f57"];
const generationInterpolator = d3.interpolateRgbBasis(GEN_PALETTE);

export function generationColor(depth: number, maxDepth: number): string {
  const t = maxDepth > 0 ? Math.min(depth / maxDepth, 1) : 0;
  return generationInterpolator(t);
}

export function nodeRadius(depth: number): number {
  return Math.max(15, 29 - depth * 3);
}

export function linkWidth(targetDepth: number, maxDepth: number): number {
  const t = maxDepth > 0 ? Math.min(targetDepth / maxDepth, 1) : 0;
  return 3.2 - t * 2;
}

export function primaryRadius(d: TreeNode): number {
  return d.depth === 0 ? nodeRadius(d.depth) + 6 : nodeRadius(d.depth);
}

/* ==========================================================================
   TWISTING VINE GEOMETRY
   Every branch travels from parent to child along a gently curling path —
   a lateral wiggle that tapers to zero at both ends (so it still lands
   exactly on the node centers) — rather than a straight or single-arc line.
   Leaves are sampled from this exact same curve, so they sit precisely on
   the rendered vine instead of being separately guessed at.
   ========================================================================== */

interface VineParams {
  amp: number;
  freq: number;
  phase: number;
}

function vineParams(seed: string): VineParams {
  const rnd = mulberry32(hashStr(seed));
  return { amp: 13 + rnd() * 15, freq: 1.15 + rnd() * 1.1, phase: rnd() * Math.PI * 2 };
}

function vinePointAt(s: TreeNode, t: TreeNode, p: VineParams, u: number): { x: number; y: number } {
  const angle = s.x + (t.x - s.x) * u;
  const radius = s.y + (t.y - s.y) * u;
  const bx = radius * Math.cos(angle);
  const by = -radius * Math.sin(angle);

  // Perpendicular ("tangential") displacement, eased to zero at both
  // endpoints via a sine envelope so the curve still meets the node centers.
  const envelope = Math.sin(u * Math.PI);
  const wiggle = Math.sin(u * Math.PI * 2 * p.freq + p.phase) * p.amp * envelope;
  const perpX = -Math.sin(angle);
  const perpY = -Math.cos(angle);

  return { x: bx + perpX * wiggle, y: by + perpY * wiggle };
}

const VINE_STEPS = 9;

/** Smooth, twisting branch curve rendered through a Catmull-Rom spline. */
export function linkPath(d: TreeLink): string {
  const s = d.source as TreeNode;
  const t = d.target as TreeNode;
  const params = vineParams(t.data.id);

  const points: Array<[number, number]> = d3.range(VINE_STEPS + 1).map((i) => {
    const p = vinePointAt(s, t, params, i / VINE_STEPS);
    return [p.x, p.y];
  });

  return d3.line().curve(d3.curveCatmullRom.alpha(0.75))(points) ?? "";
}

interface LeafSpot {
  x: number;
  y: number;
  angleDeg: number;
  side: 1 | -1;
}

const LEAF_FRACTIONS: readonly number[] = [0.34, 0.64];

function leafSpots(d: TreeLink): LeafSpot[] {
  const s = d.source as TreeNode;
  const t = d.target as TreeNode;
  const params = vineParams(t.data.id);

  return LEAF_FRACTIONS.map((u, i) => {
    const back = vinePointAt(s, t, params, Math.max(0, u - 0.02));
    const fwd = vinePointAt(s, t, params, Math.min(1, u + 0.02));
    const here = vinePointAt(s, t, params, u);
    const angleDeg = (Math.atan2(fwd.y - back.y, fwd.x - back.x) * 180) / Math.PI;
    return { x: here.x, y: here.y, angleDeg, side: (i % 2 === 0 ? 1 : -1) as 1 | -1 };
  });
}

/** A small pointed leaf blade, drawn around its own base at the origin.
 *  Left/right variants are baked into the path data (mirrored x-coordinates)
 *  rather than done via a negative `scale()` transform, because combining a
 *  negative scale with a `rotate()` in the same transform string makes the
 *  browser's matrix decomposition ambiguous mid-transition — this avoids a
 *  visible wobble during the pop-in animation. */
const LEAF_SHAPE_RIGHT = "M0,0 C5,-3 9,-9 6,-16 C11,-10 11,-2 6,3 C4,1.5 2,0.6 0,0 Z";
const LEAF_SHAPE_LEFT = "M0,0 C-5,-3 -9,-9 -6,-16 C-11,-10 -11,-2 -6,3 C-4,1.5 -2,0.6 0,0 Z";

/* ==========================================================================
   RINGS + ROOT FLOURISH  (static backdrop, unchanged)
   ========================================================================== */

export function ringPath(r: number): string {
  return `M ${-r},0 A ${r},${r} 0 0 1 ${r},0`;
}

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

/* ==========================================================================
   LINKS — grow-in / shrink-out vines
   ========================================================================== */

function growPath(selection: d3.Selection<SVGPathElement, TreeLink, SVGGElement, unknown>): void {
  selection.each(function () {
    const el = this;
    const length = el.getTotalLength();
    d3.select(el)
      .attr("stroke-dasharray", `${length} ${length}`)
      .attr("stroke-dashoffset", length)
      .transition()
      .duration(GROW_DURATION)
      .ease(d3.easeCubicOut)
      .attr("stroke-dashoffset", 0)
      .on("end", function () {
        d3.select(this).attr("stroke-dasharray", null).attr("stroke-dashoffset", null);
      });
  });
}

export function drawLinks(layer: GSel, links: TreeLink[], maxDepth: number): void {
  layer
    .selectAll<SVGPathElement, TreeLink>("path.link")
    .data(links, (d) => (d.target as TreeNode).data.id)
    .join(
      (enter) => {
        const path = enter
          .append("path")
          .attr("class", "link")
          .attr("d", (d) => linkPath(d))
          .attr("stroke", (d) => generationColor((d.target as TreeNode).depth, maxDepth))
          .attr("stroke-width", (d) => linkWidth((d.target as TreeNode).depth, maxDepth));
        growPath(path);
        return path;
      },
      (update) => update,
      (exit) =>
        exit
          .style("opacity", null)
          .transition()
          .duration(SHRINK_DURATION)
          .style("opacity", 0)
          .remove()
    );
}

/* ==========================================================================
   LEAVES — sprout along the vine as it grows past them
   ========================================================================== */

interface LeafDatum extends LeafSpot {
  key: string;
  delay: number;
}

export function drawLeaves(layer: GSel, links: TreeLink[]): void {
  const data: LeafDatum[] = links.flatMap((d) =>
    leafSpots(d).map((spot, i) => ({
      ...spot,
      key: `${(d.target as TreeNode).data.id}__leaf${i}`,
      delay: LEAF_FRACTIONS[i] * GROW_DURATION,
    }))
  );

  layer
    .selectAll<SVGGElement, LeafDatum>("g.vine-leaf")
    .data(data, (d) => d.key)
    .join(
      (enter) => {
        const g = enter
          .append("g")
          .attr("class", "vine-leaf")
          .attr("transform", (d) => `translate(${d.x},${d.y}) rotate(${d.angleDeg + d.side * 42}) scale(0.3)`);

        g.append("path")
          .attr("class", "vine-leaf-blade")
          .attr("d", (d) => (d.side === 1 ? LEAF_SHAPE_RIGHT : LEAF_SHAPE_LEFT));

        g.style("opacity", 0)
          .transition()
          .delay((d) => d.delay)
          .duration(LEAF_DURATION)
          .ease(d3.easeCubicOut)
          .style("opacity", 1)
          .attr("transform", (d) => `translate(${d.x},${d.y}) rotate(${d.angleDeg + d.side * 42}) scale(1)`);

        return g;
      },
      (update) => update,
      (exit) =>
        exit
          .style("opacity", null)
          .transition()
          .duration(SHRINK_DURATION)
          .style("opacity", 0)
          .remove()
    );
}

/* ==========================================================================
   LEAF-BLOB HALO (organic backdrop behind each photo circle)
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
   PRIMARY NODES — pop in as their vine arrives; badge marks "more to reveal"
   ========================================================================== */

function applyExpandBadges(
  merged: d3.Selection<SVGGElement, TreeNode, SVGGElement, unknown>,
  expandedIds: Set<string>
): void {
  merged.each(function (d) {
    const group = d3.select<SVGGElement, TreeNode>(this);
    const hasChildren = !!(d.data.children && d.data.children.length > 0);
    const shouldShow = hasChildren && !expandedIds.has(d.data.id);
    const existing = group.select<SVGGElement>(".expand-badge-anchor");

    if (shouldShow && existing.empty()) {
      const r = primaryRadius(d) * 0.66;
      const anchor = group
        .append("g")
        .attr("class", "expand-badge-anchor")
        .attr("transform", `translate(${r},${r})`);
      anchor.append("circle").attr("class", "expand-badge").attr("r", 7.5);
      anchor.append("text").attr("class", "expand-badge-icon").attr("text-anchor", "middle").attr("dy", "0.32em").text("+");
    } else if (!shouldShow && !existing.empty()) {
      existing.remove();
    }
  });
}

export function drawNodes(
  layer: GSel,
  nodes: TreeNode[],
  maxDepth: number,
  expandedIds: Set<string>,
  handlersRef: MutableRefObject<NodeHandlers>
): void {
  const joined = layer
    .selectAll<SVGGElement, TreeNode>("g.node")
    .data(nodes, (d) => d.data.id)
    .join(
      (enter) => {
        const g = enter
          .append("g")
          .attr(
            "class",
            (d) => `node ${d.depth === 0 ? "node--trunk" : ""} ${isLiving(d.data) ? "node--living" : ""}`
          )
          .attr("transform", (d) => `translate(${nodeX(d)},${nodeY(d)}) scale(0.2)`)
          .style("opacity", 0)
          .attr("tabindex", 0)
          .attr("role", "button")
          .attr("aria-label", (d) => `${d.data.name}, ${lifespan(d.data)}`);

        const r = primaryRadius;

        // Invisible, larger-than-the-visual tap target — the smallest
        // outer-generation circles are well under the ~44px minimum touch
        // target size, so this pads out what actually registers a tap
        // without changing anything anyone can see.
        g.append("circle")
          .attr("class", "node-hit-area")
          .attr("r", (d) => Math.max(r(d) + 16, 22))
          .attr("fill", "transparent")
          .attr("pointer-events", "all");

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
            if (d.data.children && d.data.children.length > 0) {
              handlersRef.current.onToggleExpand(d.data.id);
            }
          })
          .on("keydown", (event: KeyboardEvent, d) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handlersRef.current.onNodeClick(d);
              if (d.data.children && d.data.children.length > 0) {
                handlersRef.current.onToggleExpand(d.data.id);
              }
            }
          });

        // Pop in — timed to arrive just as the parent's vine finishes growing.
        g.transition()
          .delay(NODE_POP_DELAY)
          .duration(NODE_POP_DURATION)
          .ease(d3.easeBackOut.overshoot(1.7))
          .style("opacity", 1)
          .attr("transform", (d) => `translate(${nodeX(d)},${nodeY(d)}) scale(1)`)
          .on("end", function () {
            // Hand opacity control back to CSS (.is-dimmed etc.) — an
            // inline style left behind here would permanently outrank it.
            d3.select(this).style("opacity", null);
          });

        return g;
      },
      (update) => update,
      (exit) =>
        exit
          .style("opacity", null)
          .transition()
          .duration(SHRINK_DURATION)
          .style("opacity", 0)
          .attr("transform", (d) => `translate(${nodeX(d)},${nodeY(d)}) scale(0.3)`)
          .remove()
    );

  applyExpandBadges(joined, expandedIds);
}

/* ==========================================================================
   SPOUSE COMPANIONS
   ========================================================================== */

interface SpouseDatum {
  key: string;
  host: TreeNode;
  spouse: SpouseInfo;
}

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

  const spouseR = (d: SpouseDatum) => Math.max(11, primaryRadius(d.host) * 0.72);

  layer
    .selectAll<SVGGElement, SpouseDatum>("g.spouse")
    .data(data, (d) => d.key)
    .join(
      (enter) => {
        const g = enter
          .append("g")
          .attr("class", (d) => `spouse ${d.spouse.died == null ? "node--living" : ""}`)
          .style("opacity", 0)
          .attr("transform", (d) => {
            const hostR = primaryRadius(d.host);
            const dist = hostR + spouseR(d) + 7;
            const { tx, ty } = tangentUnit(d.host);
            return `translate(${nodeX(d.host) + tx * dist},${nodeY(d.host) + ty * dist}) scale(0.2)`;
          });

        g.append("path")
          .attr("class", "spouse-tie")
          .attr("transform", (d) => `translate(${nodeX(d.host)},${nodeY(d.host)})`)
          .attr("d", (d) => tiePath(primaryRadius(d.host), spouseR(d), d.host));

        g.append("path")
          .attr("class", "node-blob spouse-blob")
          .attr("d", (d) => leafBlobPath(d.key, spouseR(d) + 6))
          .attr("fill", (d) => generationColor(d.host.depth, maxDepth));

        g.append("clipPath")
          .attr("id", (d) => `clip-${d.key}`)
          .append("circle")
          .attr("r", (d) => spouseR(d) - 2);

        g.append("circle").attr("class", "node-photo-ring spouse-photo-ring").attr("r", spouseR);

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

        g.transition()
          .delay(NODE_POP_DELAY + 90)
          .duration(NODE_POP_DURATION)
          .ease(d3.easeBackOut.overshoot(1.7))
          .style("opacity", 1)
          .attr("transform", (d) => {
            const hostR = primaryRadius(d.host);
            const dist = hostR + spouseR(d) + 7;
            const { tx, ty } = tangentUnit(d.host);
            return `translate(${nodeX(d.host) + tx * dist},${nodeY(d.host) + ty * dist}) scale(1)`;
          })
          .on("end", function () {
            d3.select(this).style("opacity", null);
          });

        return g;
      },
      (update) => update,
      (exit) =>
        exit
          .style("opacity", null)
          .transition()
          .duration(SHRINK_DURATION)
          .style("opacity", 0)
          .remove()
    );
}
