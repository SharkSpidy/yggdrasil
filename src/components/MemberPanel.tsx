import type { TreeNode } from "../types";
import { generationLabel, lifespan } from "../utils/format";

interface MemberPanelProps {
  node: TreeNode | null;
  onClose: () => void;
  onSelectRelative: (node: TreeNode) => void;
}

function RelativeRow({
  name,
  born,
  died,
  photo,
  onClick,
}: {
  name: string;
  born?: number;
  died?: number | null;
  photo?: string;
  onClick?: () => void;
}) {
  return (
    <div className="panel-relative" style={onClick ? { cursor: "pointer" } : undefined} onClick={onClick}>
      <img src={photo || "https://placehold.co/80x80/1b2621/c9a066?text=%3F"} alt={name} />
      <div>
        <div className="panel-relative-name">{name}</div>
        <div className="panel-relative-years">
          {born ?? "?"} – {died != null ? died : "present"}
        </div>
      </div>
    </div>
  );
}

export default function MemberPanel({ node, onClose, onSelectRelative }: MemberPanelProps) {
  const isOpen = node != null;
  const d = node?.data;

  return (
    <>
      <div className={`panel-scrim ${isOpen ? "is-open" : ""}`} onClick={onClose} />
      <aside className={`member-panel ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
        <button className="panel-close" aria-label="Close record" onClick={onClose}>
          ×
        </button>

        {d && node && (
          <>
            <div className="panel-photo-wrap">
              <img className="panel-photo" src={d.photo ?? ""} alt={d.name} />
            </div>

            <p className="panel-generation">{generationLabel(node.depth)}</p>
            <h2 className="panel-name">{d.name}</h2>
            <p className="panel-years">{lifespan(d)}</p>
            <p className="panel-role">{d.role ?? ""}</p>

            <p className="panel-bio">{d.bio || "No record has been written for this member yet."}</p>

            {d.spouse && (
              <div className="panel-section">
                <h3 className="panel-label">Married to</h3>
                <div className="panel-relative-wrap">
                  <RelativeRow
                    name={d.spouse.name}
                    born={d.spouse.born}
                    died={d.spouse.died}
                    photo={d.spouse.photo}
                  />
                </div>
              </div>
            )}

            {node.parent && (
              <div className="panel-section">
                <h3 className="panel-label">Child of</h3>
                <RelativeRow
                  name={node.parent.data.name}
                  born={node.parent.data.born}
                  died={node.parent.data.died}
                  photo={node.parent.data.photo}
                  onClick={() => onSelectRelative(node.parent as TreeNode)}
                />
              </div>
            )}

            <div className="panel-section">
              <h3 className="panel-label">Children</h3>
              {node.children && node.children.length ? (
                <div className="panel-children-list">
                  {node.children.map((child) => (
                    <button
                      key={child.data.id}
                      className="panel-child-btn"
                      onClick={() => onSelectRelative(child)}
                    >
                      <img src={child.data.photo ?? ""} alt={child.data.name} />
                      <div>
                        <div className="panel-relative-name">{child.data.name}</div>
                        <div className="panel-relative-years">
                          {child.data.born ?? "?"} – {child.data.died != null ? child.data.died : "present"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="panel-empty">No recorded descendants.</p>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
