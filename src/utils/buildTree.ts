import type { FamilyDataset, FamilyMember, MemberId, TreeLayout, TreeNode } from '../types/family';

/**
 * ---------------------------------------------------------------------------
 * buildFamilyTree
 * ---------------------------------------------------------------------------
 * Turns a flat `FamilyMember[]` into one or more `TreeNode` hierarchies.
 *
 * Algorithm (linear-ish, O(n) with a couple of O(n) passes — comfortably
 * fine for the 100+ member target):
 *
 *   1. Index every member by id, and every member's *spouse* ids (derived
 *      from `marriages[]`) so a person's spouses can be looked up in O(1).
 *   2. Build a parent -> children adjacency list from `parentIds`.
 *   3. Find "roots": members with no parentIds in the dataset (the top of
 *      each known lineage) OR members explicitly flagged `isRoot`.
 *   4. Recursively walk each root down through its children, attaching
 *      spouses alongside (spouses render beside a node, never as a
 *      "child", so they don't distort generational depth).
 *   5. A `visited` set guards against cycles/duplicate wiring in malformed
 *      data so recursion always terminates.
 * ---------------------------------------------------------------------------
 */
export function buildFamilyTree(dataset: FamilyDataset): TreeNode[] {
  const byId = new Map<MemberId, FamilyMember>();
  dataset.forEach((m) => byId.set(m.id, m));

  // spouseId -> Set of spouse ids, derived from marriages[] on both sides
  const spouseIndex = new Map<MemberId, Set<MemberId>>();
  const addSpouseLink = (a: MemberId, b: MemberId) => {
    if (!spouseIndex.has(a)) spouseIndex.set(a, new Set());
    spouseIndex.get(a)!.add(b);
  };
  dataset.forEach((m) => {
    m.marriages.forEach((mg) => {
      addSpouseLink(m.id, mg.spouseId);
      addSpouseLink(mg.spouseId, m.id);
    });
  });

  // parentId -> children ids (union of parentIds pointers across the dataset)
  const childrenIndex = new Map<MemberId, MemberId[]>();
  dataset.forEach((m) => {
    m.parentIds.forEach((pid) => {
      if (!childrenIndex.has(pid)) childrenIndex.set(pid, []);
      const list = childrenIndex.get(pid)!;
      if (!list.includes(m.id)) list.push(m.id);
    });
  });

  const roots = dataset.filter((m) => m.isRoot || m.parentIds.length === 0);

  const visited = new Set<MemberId>();

  function walk(member: FamilyMember, depth: number): TreeNode {
    visited.add(member.id);

    const spouseIds = Array.from(spouseIndex.get(member.id) ?? []);
    const spouses = spouseIds.map((id) => byId.get(id)).filter((m): m is FamilyMember => Boolean(m));

    // Children = union of this member's own children pointer PLUS any
    // children whose parentIds list a spouse but not yet this member
    // (covers step/blended cases where only one parent is recorded).
    const childIdSet = new Set<MemberId>(childrenIndex.get(member.id) ?? []);
    member.marriages.forEach((mg) => mg.childIds.forEach((cid) => childIdSet.add(cid)));

    const childNodes: TreeNode[] = [];
    childIdSet.forEach((cid) => {
      if (visited.has(cid)) return; // guard against cycles / already-placed nodes
      const child = byId.get(cid);
      if (!child) return;
      childNodes.push(walk(child, depth + 1));
    });

    // Sort children by birth date so siblings render oldest-first.
    childNodes.sort((a, b) => (a.member.birthDate ?? '').localeCompare(b.member.birthDate ?? ''));

    return {
      member,
      spouses,
      children: childNodes,
      depth,
      x: 0,
      y: 0,
      subtreeWidth: 0,
    };
  }

  return roots.filter((r) => !visited.has(r.id)).map((r) => walk(r, 0));
}

/**
 * ---------------------------------------------------------------------------
 * layoutTree
 * ---------------------------------------------------------------------------
 * Assigns (x, y) canvas coordinates to every node with a classic bottom-up
 * "subtree width" layout (the same family of algorithm used by most tree
 * visualizers): each leaf reserves a fixed width; each parent's width is the
 * sum of its children's widths (or its own min width, whichever is larger);
 * a parent is horizontally centered over its children.
 *
 * This is O(n) and produces stable, non-overlapping positions for 100+
 * nodes without any iterative force-simulation, which keeps pan/zoom smooth.
 * ---------------------------------------------------------------------------
 */
const NODE_WIDTH = 300;
const SPOUSE_GAP = 24;
const SIBLING_GAP = 64;
const LEVEL_HEIGHT = 220;

function nodeSelfWidth(node: TreeNode): number {
  // A node's own footprint includes any spouses drawn beside it.
  return NODE_WIDTH * (1 + node.spouses.length) + SPOUSE_GAP * node.spouses.length;
}

function measure(node: TreeNode): number {
  if (node.children.length === 0) {
    node.subtreeWidth = nodeSelfWidth(node);
    return node.subtreeWidth;
  }
  const childrenWidth =
    node.children.reduce((sum, c) => sum + measure(c), 0) + SIBLING_GAP * (node.children.length - 1);
  node.subtreeWidth = Math.max(nodeSelfWidth(node), childrenWidth);
  return node.subtreeWidth;
}

function place(node: TreeNode, leftEdge: number, depth: number) {
  node.y = depth * LEVEL_HEIGHT;

  if (node.children.length === 0) {
    node.x = leftEdge + node.subtreeWidth / 2 - nodeSelfWidth(node) / 2;
    return;
  }

  let cursor = leftEdge + (node.subtreeWidth - measureChildrenSpan(node)) / 2;
  node.children.forEach((child) => {
    place(child, cursor, depth + 1);
    cursor += child.subtreeWidth + SIBLING_GAP;
  });

  const first = node.children[0];
  const last = node.children[node.children.length - 1];
  const center = (first.x + nodeSelfWidth(first) / 2 + last.x + nodeSelfWidth(last) / 2) / 2;
  node.x = center - nodeSelfWidth(node) / 2;
}

function measureChildrenSpan(node: TreeNode): number {
  return (
    node.children.reduce((sum, c) => sum + c.subtreeWidth, 0) + SIBLING_GAP * (node.children.length - 1)
  );
}

export function layoutTree(roots: TreeNode[]): TreeLayout {
  const nodesById = new Map<MemberId, TreeNode>();
  let cursor = 0;
  let maxDepth = 0;

  roots.forEach((root) => {
    measure(root);
    place(root, cursor, 0);
    cursor += root.subtreeWidth + SIBLING_GAP * 2;
  });

  const indexNode = (node: TreeNode) => {
    nodesById.set(node.member.id, node);
    maxDepth = Math.max(maxDepth, node.depth);
    node.children.forEach(indexNode);
  };
  roots.forEach(indexNode);

  const width = Math.max(cursor, NODE_WIDTH);
  const height = (maxDepth + 1) * LEVEL_HEIGHT + NODE_WIDTH / 2;

  return { roots, nodesById, width, height };
}

/** Convenience: flatten a layout back into an array, useful for virtualization. */
export function flattenTree(layout: TreeLayout): TreeNode[] {
  return Array.from(layout.nodesById.values());
}

export { NODE_WIDTH, LEVEL_HEIGHT };
