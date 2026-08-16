import { useCallback, useMemo, useState } from 'react';
import { Sidebar, type NavKey } from './components/Sidebar';
import { TreeCanvas } from './components/TreeCanvas';
import { ProfileDrawer } from './components/ProfileDrawer';
import { OnboardingForm } from './components/OnboardingForm';
import { buildFamilyTree, layoutTree } from './utils/buildTree';
import { generateSampleData } from './data/generateSampleData';
import type { FamilyMember } from './types/family';

export default function App() {
  const [members, setMembers] = useState<FamilyMember[]>(() => generateSampleData());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nav, setNav] = useState<NavKey>('tree');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Recompute the hierarchical tree + layout only when the flat dataset
  // changes (e.g. after onboarding adds a member) — not on every render,
  // which matters once the dataset is 100+ members.
  const layout = useMemo(() => {
    const tree = buildFamilyTree(members);
    return layoutTree(tree);
  }, [members]);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedId) ?? null,
    [members, selectedId],
  );

  const handleCreateMember = useCallback((newMember: FamilyMember) => {
    setMembers((prev) => {
      const next = [...prev, newMember];
      // Wire the new member into its parent's marriage/child pointers so
      // buildFamilyTree() can place it without a second pass.
      if (newMember.parentIds.length > 0) {
        return next.map((m) =>
          newMember.parentIds.includes(m.id)
            ? { ...m } // parentIds on the child is sufficient for buildFamilyTree
            : m,
        );
      }
      return next;
    });
    setShowOnboarding(false);
  }, []);

  return (
    <div className="bg-parchment text-ink font-sans min-h-screen flex relative overflow-x-hidden">
      <div className="texture-overlay" />
      <Sidebar activeNav={nav} onNavigate={setNav} />

      <main className="flex-1 md:ml-80 bg-parchment relative transition-all duration-300 h-screen overflow-hidden flex flex-col">
        {nav === 'tree' && (
          <>
            <div className="absolute top-[32px] left-[32px] right-[32px] z-10 pointer-events-none flex justify-between items-start">
              <div className="pointer-events-auto">
                <h1 className="font-display text-[28px] text-umber-dark mb-2 font-semibold">
                  The Avery Lineage
                </h1>
                <p className="font-sans text-[14px] text-dove tracking-widest uppercase">
                  {members.length} Members &bull; 5 Generations
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboarding(true)}
                className="pointer-events-auto btn-primary rounded px-5 py-3 font-sans text-[14px] font-semibold flex items-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined text-base">add</span> Add Member
              </button>
            </div>
            <TreeCanvas layout={layout} onSelectMember={setSelectedId} />
          </>
        )}

        {nav === 'profile' && (
          <div className="flex items-center justify-center h-full text-slate font-sans">
            Select a member from the Family Tree to view their profile.
          </div>
        )}

        {nav === 'journal' && (
          <div className="flex items-center justify-center h-full text-slate font-sans">
            Personal Journal coming soon.
          </div>
        )}

        {nav === 'settings' && (
          <div className="flex items-center justify-center h-full text-slate font-sans">
            Legacy Settings coming soon.
          </div>
        )}
      </main>

      {showOnboarding && (
        <div className="fixed inset-0 z-30 bg-umber-dark/30 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-[840px]">
            <OnboardingForm
              members={members}
              onCreate={handleCreateMember}
              onCancel={() => setShowOnboarding(false)}
            />
          </div>
        </div>
      )}

      <ProfileDrawer member={selectedMember} onClose={() => setSelectedId(null)} />
    </div>
  );
}
