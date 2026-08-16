import { useMemo, useRef } from 'react';
import type { TreeLayout, TreeNode } from '../types/family';
import { NODE_WIDTH } from '../utils/buildTree';
import { usePanZoom } from '../hooks/usePanZoom';
import { FamilyNodeCard } from './FamilyNodeCard';

interface TreeCanvasProps {
  layout: TreeLayout;
  onSelectMember: (id: string) => void;
}

const SPOUSE_OFFSET = NODE_WIDTH + 24;
const CARD_HEIGHT = 96;

/** Flattens the tree once per layout change (not per render) for cheap iteration. */
function flatten(nodes: TreeNode[], acc: TreeNode[] = []): TreeNode[] {
  nodes.forEach((n) => {
    acc.push(n);
    flatten(n.children, acc);
  });
  return acc;
}

/** Builds one polyline per parent -> child connector, elbowed like the original template. */
function buildConnectorPaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];
  nodes.forEach((node) => {
    if (node.children.length === 0) return;
    const parentCenterX = node.x + NODE_WIDTH / 2;
    const parentBottomY = node.y + CARD_HEIGHT;
    const midY = parentBottomY + (node.children[0].y - parentBottomY) / 2;

    node.children.forEach((child) => {
      const childCenterX = child.x + NODE_WIDTH / 2;
      const childTopY = child.y;
      paths.push(
        `M ${parentCenterX},${parentBottomY} L ${parentCenterX},${midY} L ${childCenterX},${midY} L ${childCenterX},${childTopY}`,
      );
    });
  });
  return paths;
}

export function TreeCanvas({ layout, onSelectMember }: TreeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { transform, handlers, zoomIn, zoomOut, resetView } = usePanZoom({ x: 80, y: 40, scale: 0.85 });

  const flatNodes = useMemo(() => flatten(layout.roots), [layout]);
  const connectorPaths = useMemo(() => buildConnectorPaths(flatNodes), [flatNodes]);

  return (
    <div className="w-full h-full relative">
      <div className="absolute top-4 right-4 flex gap-2 z-20 bg-panel/90 p-2 rounded-lg border border-umber/10 backdrop-blur-sm shadow-heritage">
        <button
          type="button"
          onClick={zoomIn}
          title="Zoom In"
          className="p-2 text-umber hover:bg-umber-dark/5 rounded transition-colors"
        >
          <span className="material-symbols-outlined">zoom_in</span>
        </button>
        <button
          type="button"
          onClick={zoomOut}
          title="Zoom Out"
          className="p-2 text-umber hover:bg-umber-dark/5 rounded transition-colors"
        >
          <span className="material-symbols-outlined">zoom_out</span>
        </button>
        <button
          type="button"
          onClick={() => resetView({ x: 80, y: 40, scale: 0.85 })}
          title="Reset View"
          className="p-2 text-umber hover:bg-umber-dark/5 rounded transition-colors"
        >
          <span className="material-symbols-outlined">center_focus_weak</span>
        </button>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden no-select"
        {...handlers}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            width: layout.width,
            height: layout.height,
            willChange: 'transform',
          }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.width}
            height={layout.height}
            style={{ zIndex: 1 }}
          >
            {connectorPaths.map((d, i) => (
              <path key={i} className="tree-line" d={d} />
            ))}
          </svg>

          {flatNodes.map((node) => (
            <div key={node.member.id}>
              <FamilyNodeCard
                member={node.member}
                x={node.x}
                y={node.y}
                isRoot={node.depth === 0}
                onSelect={onSelectMember}
              />
              {node.spouses.map((spouse, i) => (
                <FamilyNodeCard
                  key={spouse.id}
                  member={spouse}
                  x={node.x + SPOUSE_OFFSET * (i + 1)}
                  y={node.y}
                  onSelect={onSelectMember}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
