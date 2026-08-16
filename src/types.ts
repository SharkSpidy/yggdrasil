/**
 * YGGDRASIL — Family Graph Type System
 * ------------------------------------------------------
 * The tree is stored as a NORMALIZED flat map (Record<id, FamilyMember>),
 * NOT as nested objects. Every relationship is expressed as an ID reference.
 * This lets us support 100+ individuals, multiple marriages, adoption,
 * and re-married branches without infinite/duplicated nesting, and makes
 * "drill down" navigation an O(1) lookup instead of a tree traversal.
 */

export type Gender = 'male' | 'female' | 'nonbinary' | 'unspecified';

export type RelationshipType = 'biological' | 'adopted' | 'step';

export type MaritalStatus = 'married' | 'divorced' | 'widowed' | 'partnered' | 'unmarried';

/** A single dated event in a person's life, shown on their profile drawer timeline. */
export interface LifeEvent {
  id: string;
  date: string; // ISO string or free-form "circa 1934"
  title: string; // e.g. "Emigrated to Boston"
  description?: string;
  icon?: 'birth' | 'marriage' | 'graduation' | 'career' | 'relocation' | 'death' | 'general';
}

/** Represents a marriage/partnership edge. Kept on the member rather than a
 *  separate table for simplicity, but references the spouse by ID only. */
export interface Union {
  spouseId: string;
  status: MaritalStatus;
  startDate?: string;
  endDate?: string; // divorce or death of union
}

/**
 * The atomic node of the graph. No child ever contains a nested copy of
 * their parent — everything is an ID pointer resolved via the tree map.
 */
export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: Gender;
  photoUrl?: string;
  birthDate?: string;
  deathDate?: string; // undefined/null = living
  birthPlace?: string;
  occupation?: string;
  biography?: string;

  /** IDs of every union this person has been part of (supports remarriage). */
  unions: Union[];

  /** IDs of this person's biological/legal parents (max 2 in this schema, extensible to more for step-parents via `parentIds`). */
  parentIds: string[];

  /**
   * Children are stored as edges with relationship metadata rather than
   * plain ID arrays, so blended families render correctly.
   */
  childIds: ChildEdge[];

  /** Denormalized flag so the UI can quickly render "Root Ancestor" badges. */
  isRoot?: boolean;

  lifeEvents?: LifeEvent[];
}

/** A parent -> child edge, annotated with how the relationship was formed
 *  and (optionally) which specific union produced the child, so a child of
 *  a second marriage doesn't visually get attached to the first spouse. */
export interface ChildEdge {
  childId: string;
  relationship: RelationshipType;
  viaUnionSpouseId?: string; // which spouse this child is shared with, if any
}

/** The full graph — a normalized dictionary keyed by member id. */
export type FamilyGraph = Record<string, FamilyMember>;

/* -------------------------------------------------------------------------- */
/*  Navigation / UI State types consumed by useYggdrasilTree                  */
/* -------------------------------------------------------------------------- */

export interface BreadcrumbNode {
  id: string;
  label: string; // "First Last"
}

export interface YggdrasilTreeState {
  activeNodeId: string | null;
  breadcrumbPath: BreadcrumbNode[];
  selectedProfileId: string | null;
}

/** Onboarding wizard payload for creating the very first Root node. */
export interface OnboardingDraft {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  photoUrl?: string;
}
