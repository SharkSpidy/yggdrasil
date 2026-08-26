import type { TreeNode } from "../types";
import { lifespan } from "../utils/format";

interface TooltipProps {
  node: TreeNode | null;
  x: number;
  y: number;
}

export default function Tooltip({ node, x, y }: TooltipProps) {
  const visible = node != null;

  return (
    <div
      id="tooltip"
      className={`tooltip ${visible ? "is-visible" : ""}`}
      role="status"
      aria-hidden={!visible}
      style={{ left: x, top: y }}
    >
      <img className="tooltip-photo" src={node?.data.photo ?? ""} alt={node?.data.name ?? ""} />
      <div className="tooltip-body">
        <p className="tooltip-name">{node?.data.name ?? ""}</p>
        <p className="tooltip-years">{node ? lifespan(node.data) : ""}</p>
        <p className="tooltip-role">{node?.data.role ?? ""}</p>
      </div>
    </div>
  );
}
