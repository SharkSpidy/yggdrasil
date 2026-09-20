import { useMemo } from "react";
import * as d3 from "d3";
import type { Person, TreeNode, TreeLink } from "../types";

/** Fallback ring gap used only before a real layout has been computed. */
export const RING_SPACING = 168;

/**
 * The fan doesn't sweep the full circle — a hair short of a half-turn, so
 * there's a calm gap at the bottom for the trunk and root flourish to sit
 * in, and the silhouette reads as a tree/vine reaching upward rather than
 * a spoked wheel.
 */
const ANGLE_SPAN = Math.PI * 0.94;
const ANGLE_OFFSET = (Math.PI - ANGLE_SPAN) / 2;

/**
 * Minimum arc-length (px) we insist on between two neighboring leaf nodes
 * at the outermost ring. Generous enough to fit a photo node, its name +
 * lifespan label, *and* a spouse companion badge without crowding.
 */
const MIN_LEAF_ARC = 190;

/** Innermost sensible radius, so a shallow/small tree doesn't look cramped. */
const MIN_RADIUS = 620;

export interface TreeLayout {
  root: TreeNode;
  nodes: TreeNode[];
  links: TreeLink[];
  maxDepth: number;
  radius: number;
  /** Actual px gap between generation rings for *this* dataset (rings scale
   *  to fill whatever radius the leaf count demanded). */
  ringSpacing: number;
}

/**
 * Computes the radial fan layout for a family tree.
 *
 * node.x -> angle in [ANGLE_OFFSET, ANGLE_OFFSET + ANGLE_SPAN]
 * node.y -> radius in [0, radius], 0 = trunk, increasing with generation
 *
 * The outer radius is *derived from the leaf count* rather than fixed, so
 * a 12-person tree and a 268-person, 5-generation tree both end up with
 * legible, non-overlapping labels — the big tree simply grows a bigger
 * canvas instead of squeezing its nodes.
 *
 * Memoized on `data` so the layout pass only reruns when the dataset changes.
 */
export function useTreeLayout(data: Person): TreeLayout {
  return useMemo(() => {
    const hierarchyRoot = d3.hierarchy<Person>(data, (d) => d.children);
    const maxDepth = Math.max(hierarchyRoot.height, 1);
    const leafCount = Math.max(hierarchyRoot.leaves().length, 1);

    // Required outer circumference to give every leaf its MIN_LEAF_ARC,
    // converted back to a radius for the given angular span.
    const requiredRadius = (leafCount * MIN_LEAF_ARC) / ANGLE_SPAN;
    const radius = Math.max(MIN_RADIUS, maxDepth * RING_SPACING, requiredRadius);
    const ringSpacing = radius / maxDepth;

    // Separation is intentionally *not* depth-weighted: d3.tree normalizes
    // relative separation values across the fixed angular span, and since
    // arc-length = angle * radius, and radius already grows generously with
    // leafCount above, a flat ratio keeps siblings snug while giving cousin
    // branches (from different parents) visibly more breathing room —
    // exactly the "spacious but grouped" read a real family tree wants.
    const layout = d3
      .tree<Person>()
      .size([ANGLE_SPAN, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.65));

    const root = layout(hierarchyRoot);

    // Recenter the fan: d3 lays x out across [0, ANGLE_SPAN]; shift so it's
    // centered in [0, π] the way the rest of the app's math expects.
    root.each((d) => {
      d.x += ANGLE_OFFSET;
    });

    const nodes = root.descendants();
    const links = root.links();

    return { root, nodes, links, maxDepth, radius, ringSpacing };
  }, [data]);
}

/** Cartesian x for a positioned node (SVG coordinate space). */
export const nodeX = (d: TreeNode): number => d.y * Math.cos(d.x);

/** Cartesian y for a positioned node — negative is "up" in SVG. */
export const nodeY = (d: TreeNode): number => -d.y * Math.sin(d.x);
