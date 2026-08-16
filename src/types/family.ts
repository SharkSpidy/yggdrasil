/**
 * ---------------------------------------------------------------------------
 * HeritageArchive data model
 * ---------------------------------------------------------------------------
 * Family data is authored/stored as a FLAT array (`FamilyMember[]`) — this is
 * what you'd get back from a database or JSON API. It's flat on purpose:
 *
 *   - Multiple marriages and blended families mean a person can't be reduced
 *     to a single "parent" pointer — relationships are graph-shaped, not
 *     tree-shaped, at the data layer.
 *   - A flat array with id-based references is trivial to patch (add one
 *     record), diff, and persist, whereas a nested tree is not.
 *
 * The NESTED `TreeNode` structure used for rendering is derived from the flat
 * array on demand by `buildFamilyTree()` (see src/utils/buildTree.ts). React
 * only ever consumes the derived tree; it never mutates it directly.
 * ---------------------------------------------------------------------------
 */

/** Stable unique identifier. Using string (not number) keeps room for UUIDs. */
export type MemberId = string;

export type Gender = 'male' | 'female' | 'nonbinary' | 'unspecified';

export type RelationshipType = 'biological' | 'adopted' | 'step' | 'foster';

export type MarriageStatus = 'married' | 'divorced' | 'widowed' | 'partnered' | 'separated';

/**
 * A single marriage/partnership record. A member can have several of these
 * across their life (remarriage, widowhood, divorce), each with its own
 * child set — this is what makes blended, multi-generation families work.
 */
export interface Marriage {
  id: string;
  /** The other partner's member id. */
  spouseId: MemberId;
  status: MarriageStatus;
  startDate?: string; // ISO date
  endDate?: string; // ISO date, if divorced/widowed
  /** Children produced by/raised within this specific union. */
  childIds: MemberId[];
}

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** A notable life event, rendered on the profile drawer timeline. */
export interface LifeEvent {
  id: string;
  date: string; // ISO date or free-text era e.g. "c. 1892"
  title: string;
  description?: string;
  location?: string;
  icon?: string; // Material Symbols icon name
}

/**
 * The canonical, flat record for one person in the archive.
 *
 * Relationship fields are intentionally redundant with `marriages[]` in a
 * couple of places (e.g. `parentIds`) so that tree-building doesn't require
 * walking every other member's marriages to find "who are my children" —
 * cheap-to-query denormalization on a dataset this size (100+ members) is a
 * good trade for render performance.
 */
export interface FamilyMember {
  id: MemberId;

  // --- Identity -------------------------------------------------------
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  photoUrl?: string;

  // --- Vital stats ------------------------------------------------------
  birthDate?: string; // ISO date; undated ancestors can omit
  birthDateApprox?: boolean; // true => render as "c. 1892"
  deathDate?: string; // omit if living
  birthPlace?: string;
  address?: Address; // current/last known address, for living members

  // --- Narrative content --------------------------------------------------
  biography?: string;
  occupation?: string;
  events?: LifeEvent[];

  // --- Relationships -------------------------------------------------
  /**
   * Direct parent ids (0, 1, or 2 — 0 for a tree root, 1 for a single known
   * parent, 2 for both). This is the primary pointer `buildFamilyTree` uses
   * to place a member under its parent(s).
   */
  parentIds: MemberId[];
  relationshipToParents?: RelationshipType;
  marriages: Marriage[];

  // --- Meta -------------------------------------------------------------
  generation: number; // 0 = root generation, increases going down
  isRoot?: boolean; // marks the tree's anchor member(s)
}

/** The flat, wire-format shape the app is seeded with / would fetch from an API. */
export type FamilyDataset = FamilyMember[];

/**
 * ---------------------------------------------------------------------------
 * Derived, render-oriented tree structure
 * ---------------------------------------------------------------------------
 * Built by `buildFamilyTree()`. A `TreeNode` wraps a `FamilyMember` plus:
 *   - `spouses`: co-equal partner nodes shown beside this node (not below it)
 *   - `children`: this node's children, already merged across all marriages
 *   - layout coordinates computed by the canvas layout pass
 */
export interface TreeNode {
  member: FamilyMember;
  spouses: FamilyMember[];
  children: TreeNode[];
  depth: number;
  /** Populated by the layout algorithm (src/utils/buildTree.ts -> layoutTree). */
  x: number;
  y: number;
  /** Width in px this node's entire subtree occupies once laid out. */
  subtreeWidth: number;
}

export interface TreeLayout {
  roots: TreeNode[];
  /** Flat lookup used for click-handling / centering the canvas on a node. */
  nodesById: Map<MemberId, TreeNode>;
  width: number;
  height: number;
}
