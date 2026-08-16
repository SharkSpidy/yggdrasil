import { useState } from 'react';
import { ArrowRight, Baby } from 'lucide-react';
import type { FamilyMember } from '../types';

interface ChildCardProps {
  child: FamilyMember;
  spouse: FamilyMember | null;
  hasDescendants: boolean;
  onSelectProfile: (id: string) => void;
  onExploreBranch: (id: string) => void;
}

function formatYear(date?: string) {
  return date ? date.slice(0, 4) : null;
}

export function ChildCard({ child, spouse, hasDescendants, onSelectProfile, onExploreBranch }: ChildCardProps) {
  const [expanded, setExpanded] = useState(false);
  const born = formatYear(child.birthDate);

  return (
    <div
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onClick={() => setExpanded((v) => !v)}
      className={[
        'group relative flex w-44 flex-col items-center rounded-2xl border border-mahogany-deep/10 bg-white/60 p-4',
        'shadow-sm transition-all duration-300 ease-out hover:shadow-heirloom sm:w-48',
        expanded ? 'ring-1 ring-mahogany-deep/15' : '',
      ].join(' ')}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelectProfile(child.id);
        }}
        className="flex flex-col items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mahogany-deep/40"
      >
        <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-mahogany-deep/5">
          {child.photoUrl ? (
            <img src={child.photoUrl} alt={child.firstName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-mahogany-deep/10 font-serif text-lg text-mahogany-deep/50">
              {child.firstName[0]}
            </div>
          )}
        </div>
        <div className="text-center">
          <p className="font-serif text-sm font-semibold text-mahogany">
            {child.firstName} {child.lastName}
          </p>
          <p className="text-[11px] font-medium text-sage">{born ?? '—'}</p>
        </div>
      </button>

      {!hasDescendants && (
        <span className="mt-1.5 flex items-center gap-1 text-[10px] font-medium text-mahogany-deep/35">
          <Baby className="h-3 w-3" /> No recorded descendants
        </span>
      )}

      {/* Smooth expand action area */}
      <div
        className={[
          'grid w-full overflow-hidden transition-all duration-300 ease-out',
          expanded ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        ].join(' ')}
      >
        <div className="flex min-h-0 flex-col items-center gap-2 border-t border-mahogany-deep/10 pt-3">
          {spouse && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectProfile(spouse.id);
              }}
              className="flex items-center gap-2 rounded-full bg-mahogany-deep/5 px-2.5 py-1 text-[11px] font-medium text-mahogany-deep/70 transition-colors hover:bg-mahogany-deep/10"
            >
              <span className="h-5 w-5 overflow-hidden rounded-full">
                {spouse.photoUrl ? (
                  <img src={spouse.photoUrl} alt={spouse.firstName} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-mahogany-deep/10 text-[9px]">
                    {spouse.firstName[0]}
                  </span>
                )}
              </span>
              m. {spouse.firstName}
            </button>
          )}
          {hasDescendants && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExploreBranch(child.id);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-mahogany-deep px-3 py-2 text-xs font-semibold text-linen shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Explore Branch <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
