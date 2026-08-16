import { Heart, Sprout } from 'lucide-react';
import type { YggdrasilTreeApi } from '../hooks/useYggdrasilTree';
import { ProfileCard } from './ProfileCard';
import { ChildCard } from './ChildCard';

interface ActiveFamilyViewProps {
  tree: YggdrasilTreeApi;
}

export function ActiveFamilyView({ tree }: ActiveFamilyViewProps) {
  const { activeMember, activeSpouse, activeChildren, openProfile, drillInto, getSpouse, getChildren } = tree;

  if (!activeMember) {
    return (
      <div className="flex flex-1 items-center justify-center text-mahogany-deep/50">
        No active family unit selected.
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-center gap-14 px-4 pb-24 pt-12 sm:px-8">
      {/* ---------- ROOTS: the active couple ---------- */}
      <section
        key={activeMember.id}
        aria-label="Focused family unit"
        className="flex w-full animate-[fadeIn_0.4s_ease-out] flex-col items-center gap-6"
      >
        <div className="flex items-center gap-2 text-mahogany-deep/40">
          <span className="h-px w-8 bg-mahogany-deep/20" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Focused Family Unit</span>
          <span className="h-px w-8 bg-mahogany-deep/20" />
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
          <ProfileCard member={activeMember} onSelect={openProfile} size="large" />
          {activeSpouse && (
            <>
              <div className="flex flex-col items-center gap-1 text-mahogany-deep/30">
                <Heart className="h-5 w-5" fill="currentColor" strokeWidth={0} />
                <span className="text-[10px] font-medium uppercase tracking-wide">united</span>
              </div>
              <ProfileCard member={activeSpouse} onSelect={openProfile} size="large" />
            </>
          )}
        </div>
      </section>

      {/* ---------- BRANCHES: children of the active couple ---------- */}
      <section aria-label="Children" className="flex w-full flex-col items-center gap-6">
        {activeChildren.length > 0 && (
          <div className="flex items-center gap-2 text-mahogany-deep/40">
            <Sprout className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              {activeChildren.length} {activeChildren.length === 1 ? 'Child' : 'Children'}
            </span>
          </div>
        )}

        {activeChildren.length === 0 ? (
          <p className="max-w-sm text-center text-sm text-mahogany-deep/40">
            No children recorded for this couple yet. This is the end of the recorded branch.
          </p>
        ) : (
          <div className="flex w-full flex-wrap items-start justify-center gap-6 sm:gap-8">
            {activeChildren.map((child) => {
              const spouse = getSpouse(child);
              const descendants = getChildren(child);
              return (
                <ChildCard
                  key={child.id}
                  child={child}
                  spouse={spouse}
                  hasDescendants={descendants.length > 0}
                  onSelectProfile={openProfile}
                  onExploreBranch={drillInto}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
