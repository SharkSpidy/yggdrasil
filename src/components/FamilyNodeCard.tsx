import { memo } from 'react';
import type { FamilyMember } from '../types/family';
import { NODE_WIDTH } from '../utils/buildTree';

interface FamilyNodeCardProps {
  member: FamilyMember;
  x: number;
  y: number;
  isRoot?: boolean;
  onSelect: (id: string) => void;
}

function lifespan(member: FamilyMember) {
  const born = member.birthDate ? new Date(member.birthDate).getFullYear() : '?';
  const bornLabel = member.birthDateApprox ? `c. ${born}` : String(born);
  if (member.deathDate) {
    return `${bornLabel} — ${new Date(member.deathDate).getFullYear()}`;
  }
  return `${bornLabel} — Present`;
}

/**
 * Memoized so panning/zooming (which only changes the parent wrapper's
 * transform, not any node's props) never triggers a re-render of the 100+
 * individual cards — a key part of keeping drag interactions smooth.
 */
export const FamilyNodeCard = memo(function FamilyNodeCard({
  member,
  x,
  y,
  isRoot,
  onSelect,
}: FamilyNodeCardProps) {
  return (
    <div
      data-node-card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(member.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(member.id)}
      className="absolute bg-white rounded border border-umber/10 shadow-heritage p-4 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300 cursor-pointer select-none"
      style={{ left: x, top: y, width: NODE_WIDTH }}
    >
      <div className={`w-1 absolute left-0 top-4 bottom-4 rounded-r-full ${isRoot ? 'bg-umber' : 'bg-dove'}`} />
      <img
        className="w-16 h-16 rounded-full object-cover border border-umber/20 shrink-0"
        src={member.photoUrl}
        alt={`${member.firstName} ${member.lastName}`}
      />
      <div className="min-w-0">
        <h3 className="font-display text-[20px] text-umber-dark font-semibold truncate">
          {member.firstName} {member.lastName}
        </h3>
        <p className="font-sans text-[12px] text-slate">{lifespan(member)}</p>
        {member.occupation && (
          <p className="font-sans text-[11px] text-dove uppercase tracking-wider mt-0.5 truncate">
            {member.occupation}
          </p>
        )}
      </div>
    </div>
  );
});
