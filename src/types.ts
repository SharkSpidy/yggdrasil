import type { HierarchyLink, HierarchyPointNode } from "d3";

/** A spouse is displayed alongside a person but is not itself a tree node. */
export interface SpouseInfo {
  name: string;
  born?: number;
  died?: number | null;
  photo?: string;
}

/** A single member of the family record. */
export interface Person {
  id: string;
  name: string;
  born?: number;
  /** `null` or omitted means living. */
  died?: number | null;
  role?: string;
  bio?: string;
  photo?: string;
  gender?: "f" | "m" | "nb";
  spouse?: SpouseInfo;
  children?: Person[];
}

/** A person once positioned by the radial tree layout (has .x angle / .y radius). */
export type TreeNode = HierarchyPointNode<Person>;

export type TreeLink = HierarchyLink<Person>;
