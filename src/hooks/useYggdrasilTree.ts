import { useCallback, useMemo, useState } from 'react';
import type { BreadcrumbNode, FamilyGraph, FamilyMember } from '../types';

interface UseYggdrasilTreeArgs {
  graph: FamilyGraph;
  rootId: string | null;
}

/**
 * Central navigation controller for the Yggdrasil drill-down UI.
 *
 * Responsibilities:
 *  - Tracks which family unit is currently "in focus" (activeNodeId)
 *  - Derives the breadcrumb lineage path by walking parentIds back to the root
 *  - Tracks which profile's side-drawer is open (independent of navigation)
 *  - Exposes pure lookup helpers (spouse, children, parents) so components
 *    never have to reach into the graph directly.
 */
export function useYggdrasilTree({ graph, rootId }: UseYggdrasilTreeArgs) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(rootId);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const getMember = useCallback((id: string | null | undefined): FamilyMember | null => {
    if (!id) return null;
    return graph[id] ?? null;
  }, [graph]);

  const getSpouse = useCallback((member: FamilyMember | null): FamilyMember | null => {
    if (!member || member.unions.length === 0) return null;
    // Prefer the current/most recent union
    const union = [...member.unions].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))[0];
    return getMember(union.spouseId);
  }, [getMember]);

  const getChildren = useCallback((member: FamilyMember | null): FamilyMember[] => {
    if (!member) return [];
    return member.childIds
      .map((edge) => getMember(edge.childId))
      .filter((m): m is FamilyMember => m !== null);
  }, [getMember]);

  const getParents = useCallback((member: FamilyMember | null): FamilyMember[] => {
    if (!member) return [];
    return member.parentIds
      .map((id) => getMember(id))
      .filter((m): m is FamilyMember => m !== null);
  }, [getMember]);

  /** Walks parentIds upward from the active node to build the lineage trail. */
  const breadcrumbPath: BreadcrumbNode[] = useMemo(() => {
    const path: BreadcrumbNode[] = [];
    let current = getMember(activeNodeId);
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift({ id: current.id, label: `${current.firstName} ${current.lastName}` });
      const parents = getParents(current);
      // Follow the first parent found (both parents share the same lineage upward)
      current = parents[0] ?? null;
    }
    return path;
  }, [activeNodeId, getMember, getParents]);

  /** Sets a new focal family unit and animates the drill-down. */
  const drillInto = useCallback((memberId: string) => {
    if (!graph[memberId]) return;
    setActiveNodeId(memberId);
    // Scroll to top of the active unit smoothly on drill-down
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [graph]);

  /** Jump directly to a breadcrumb ancestor. */
  const navigateToBreadcrumb = useCallback((memberId: string) => {
    drillInto(memberId);
  }, [drillInto]);

  const openProfile = useCallback((memberId: string) => setSelectedProfileId(memberId), []);
  const closeProfile = useCallback(() => setSelectedProfileId(null), []);

  const activeMember = getMember(activeNodeId);
  const activeSpouse = getSpouse(activeMember);
  const activeChildren = getChildren(activeMember);
  const selectedProfile = getMember(selectedProfileId);

  return {
    activeNodeId,
    activeMember,
    activeSpouse,
    activeChildren,
    breadcrumbPath,
    selectedProfileId,
    selectedProfile,
    drillInto,
    navigateToBreadcrumb,
    openProfile,
    closeProfile,
    getSpouse,
    getChildren,
    getParents,
    getMember,
  };
}

export type YggdrasilTreeApi = ReturnType<typeof useYggdrasilTree>;
