import { useMemo } from "react";
import * as d3 from "d3";
import type { Person, TreeNode, TreeLink } from "../types";

export const RING_SPACING = 168; // px between generations

export interface TreeLayout {
  root: TreeNode;
  nodes: TreeNode[];
  links: TreeLink[];
  maxDepth: number;
  radius: number;
}

/**
 * Computes the radial fan layout for a family tree.
 *
 * Uses d3.tree().size([Math.PI, radius]) so every node gets:
 *   node.x -> angle in [0, π]        (0 = rightmost, π/2 = top, π = leftmost)
 *   node.y -> radius in [0, radius]  (0 = trunk, increases with generation)
 *
 * Memoized on `data` so the (relatively expensive) layout pass only reruns
 * when the underlying dataset actually changes.
 */
export function useTreeLayout(data: Person): TreeLayout {
  return useMemo(() => {
    const hierarchyRoot = d3.hierarchy<Person>(data, (d) => d.children);
    const maxDepth = hierarchyRoot.height || 1;
    const radius = Math.max(560, maxDepth * RING_SPACING);

    const layout = d3
      .tree<Person>()
      .size([Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.6) / Math.max(a.depth, 1));

    const root = layout(hierarchyRoot);
    const nodes = root.descendants();
    const links = root.links();

    return { root, nodes, links, maxDepth, radius };
  }, [data]);
}

/** Cartesian x for a positioned node (SVG coordinate space). */
export const nodeX = (d: TreeNode): number => d.y * Math.cos(d.x);

/** Cartesian y for a positioned node — negative is "up" in SVG. */
export const nodeY = (d: TreeNode): number => -d.y * Math.sin(d.x);
