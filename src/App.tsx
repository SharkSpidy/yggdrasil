import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import Legend from "./components/Legend";
import Tooltip from "./components/Tooltip";
import MemberPanel from "./components/MemberPanel";
import FamilyTree, { type FamilyTreeHandle } from "./components/FamilyTree";
import { useTreeLayout } from "./hooks/useTreeLayout";
import { loadFamilyData } from "./data";
import type { Person, TreeNode } from "./types";

interface HoverState {
  node: TreeNode;
  x: number;
  y: number;
}

const fallbackRoot: Person = {
  id: "loading-root",
  name: "Loading family record…",
  children: [],
};

export default function App() {
  const [familyData, setFamilyData] = useState<Person | null>(null);
  // Full static layout for the whole dataset — FamilyTree decides what's
  // actually drawn at any moment, but search needs to see everyone.
  const layout = useTreeLayout(familyData ?? fallbackRoot);
  const treeRef = useRef<FamilyTreeHandle>(null);

  const [query, setQuery] = useState("");
  const [activeNode, setActiveNode] = useState<TreeNode | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  useEffect(() => {
    let active = true;

    loadFamilyData()
      .then((data) => {
        if (active) setFamilyData(data);
      })
      .catch((error) => {
        console.error("Failed to load family tree data:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !familyData) return null;
    return new Set(
      layout.nodes.filter((n) => n.data.name.toLowerCase().includes(q)).map((n) => n.data.id)
    );
  }, [query, familyData, layout]);

  const matchCount = matchIds ? matchIds.size : null;

  useEffect(() => {
    if (matchIds && matchIds.size === 1) {
      const [onlyId] = matchIds;
      treeRef.current?.revealAndPanTo(onlyId);
    }
  }, [matchIds]);

  const handleNodeClick = useCallback((node: TreeNode) => {
    setActiveNode(node);
  }, []);

  const handleNodeHover = useCallback((node: TreeNode, x: number, y: number) => {
    setHover({ node, x, y });
  }, []);

  const handleNodeMove = useCallback((x: number, y: number) => {
    setHover((prev) => (prev ? { ...prev, x, y } : prev));
  }, []);

  const handleNodeLeave = useCallback(() => {
    setHover(null);
  }, []);

  const handleSelectRelative = useCallback((node: TreeNode) => {
    setActiveNode(node);
    treeRef.current?.revealAndPanTo(node.data.id);
  }, []);

  return (
    <>
      <Header
        query={query}
        onQueryChange={setQuery}
        matchCount={matchCount}
        onZoomIn={() => treeRef.current?.zoomIn()}
        onZoomOut={() => treeRef.current?.zoomOut()}
        onReset={() => treeRef.current?.resetView()}
      />

      <main>
        <FamilyTree
          ref={treeRef}
          layout={layout}
          activeId={activeNode?.data.id ?? null}
          matchIds={matchIds}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onNodeMove={handleNodeMove}
          onNodeLeave={handleNodeLeave}
        />
        <Legend />
      </main>

      <Tooltip node={hover?.node ?? null} x={hover?.x ?? 0} y={hover?.y ?? 0} />

      <MemberPanel node={activeNode} onClose={() => setActiveNode(null)} onSelectRelative={handleSelectRelative} />
    </>
  );
}
