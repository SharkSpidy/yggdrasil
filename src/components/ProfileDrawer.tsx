import { useEffect } from 'react';
import { X, MapPin, Briefcase, Users, Calendar } from 'lucide-react';
import type { YggdrasilTreeApi } from '../hooks/useYggdrasilTree';

interface ProfileDrawerProps {
  tree: YggdrasilTreeApi;
}

const EVENT_ICON_COLOR: Record<string, string> = {
  birth: 'bg-sage/15 text-sage',
  marriage: 'bg-mahogany-deep/10 text-mahogany-deep',
  graduation: 'bg-amber-100 text-amber-700',
  career: 'bg-blue-50 text-blue-700',
  relocation: 'bg-purple-50 text-purple-700',
  death: 'bg-stone-200 text-stone-600',
  general: 'bg-mahogany-deep/5 text-mahogany-deep/60',
};

export function ProfileDrawer({ tree }: ProfileDrawerProps) {
  const { selectedProfile, closeProfile, getSpouse, getParents, getChildren, openProfile } = tree;
  const isOpen = !!selectedProfile;

  // Close on Escape for accessibility
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeProfile();
    }
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, closeProfile]);

  const spouse = selectedProfile ? getSpouse(selectedProfile) : null;
  const parents = selectedProfile ? getParents(selectedProfile) : [];
  const children = selectedProfile ? getChildren(selectedProfile) : [];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeProfile}
        aria-hidden={!isOpen}
        className={[
          'fixed inset-0 z-40 bg-mahogany/20 backdrop-blur-[2px] transition-opacity duration-300',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={selectedProfile ? `${selectedProfile.firstName} ${selectedProfile.lastName} profile` : 'Profile drawer'}
        className={[
          'fixed right-0 top-0 z-50 h-dvh w-full max-w-md overflow-y-auto bg-linen shadow-drawer transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {selectedProfile && (
          <div className="flex flex-col">
            {/* Header / photo */}
            <div className="relative flex flex-col items-center gap-4 border-b border-mahogany-deep/10 bg-white/60 px-6 pb-8 pt-6">
              <button
                onClick={closeProfile}
                aria-label="Close profile"
                className="absolute right-4 top-4 rounded-full p-2 text-mahogany-deep/50 transition-colors hover:bg-mahogany-deep/10 hover:text-mahogany-deep"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="h-32 w-32 overflow-hidden rounded-full ring-4 ring-mahogany-deep/5">
                {selectedProfile.photoUrl ? (
                  <img
                    src={selectedProfile.photoUrl}
                    alt={`${selectedProfile.firstName} ${selectedProfile.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-mahogany-deep/10 font-serif text-3xl text-mahogany-deep/50">
                    {selectedProfile.firstName[0]}
                  </div>
                )}
              </div>

              <div className="text-center">
                <h2 className="font-serif text-2xl font-semibold text-mahogany">
                  {selectedProfile.firstName} {selectedProfile.lastName}
                </h2>
                {selectedProfile.maidenName && (
                  <p className="text-sm text-mahogany-deep/40">née {selectedProfile.maidenName}</p>
                )}
                <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-sage">
                  <Calendar className="h-4 w-4" />
                  {selectedProfile.birthDate?.slice(0, 4) ?? '—'}
                  {selectedProfile.deathDate ? ` – ${selectedProfile.deathDate.slice(0, 4)}` : ' – Present'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-8 px-6 py-6">
              {/* Quick facts */}
              <div className="flex flex-col gap-2.5">
                {selectedProfile.birthPlace && (
                  <div className="flex items-center gap-2.5 text-sm text-mahogany-deep/70">
                    <MapPin className="h-4 w-4 text-mahogany-deep/40" />
                    {selectedProfile.birthPlace}
                  </div>
                )}
                {selectedProfile.occupation && (
                  <div className="flex items-center gap-2.5 text-sm text-mahogany-deep/70">
                    <Briefcase className="h-4 w-4 text-mahogany-deep/40" />
                    {selectedProfile.occupation}
                  </div>
                )}
              </div>

              {/* Biography */}
              {selectedProfile.biography && (
                <div>
                  <h3 className="mb-2 font-serif text-lg font-semibold text-mahogany">Biography</h3>
                  <p className="text-sm leading-relaxed text-mahogany-deep/70">{selectedProfile.biography}</p>
                </div>
              )}

              {/* Life events timeline */}
              {selectedProfile.lifeEvents && selectedProfile.lifeEvents.length > 0 && (
                <div>
                  <h3 className="mb-3 font-serif text-lg font-semibold text-mahogany">Life Events</h3>
                  <ol className="flex flex-col gap-4 border-l border-mahogany-deep/10 pl-4">
                    {selectedProfile.lifeEvents.map((event) => (
                      <li key={event.id} className="relative">
                        <span
                          className={[
                            'absolute -left-[21px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-linen',
                            EVENT_ICON_COLOR[event.icon ?? 'general'],
                          ].join(' ')}
                        />
                        <p className="text-xs font-semibold text-sage">{event.date}</p>
                        <p className="text-sm font-medium text-mahogany">{event.title}</p>
                        {event.description && (
                          <p className="mt-0.5 text-xs text-mahogany-deep/60">{event.description}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Direct relations */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-mahogany">
                  <Users className="h-4 w-4" /> Direct Relations
                </h3>
                <div className="flex flex-col gap-4">
                  <RelationRow label="Parents" people={parents} onSelect={openProfile} />
                  {spouse && <RelationRow label="Spouse" people={[spouse]} onSelect={openProfile} />}
                  <RelationRow label="Children" people={children} onSelect={openProfile} />
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function RelationRow({
  label,
  people,
  onSelect,
}: {
  label: string;
  people: { id: string; firstName: string; lastName: string; photoUrl?: string }[];
  onSelect: (id: string) => void;
}) {
  if (people.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-mahogany-deep/40">{label}</p>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="flex items-center gap-2 rounded-full border border-mahogany-deep/10 bg-white/70 py-1 pl-1 pr-3 text-sm font-medium text-mahogany-deep/80 transition-colors hover:bg-mahogany-deep/5"
          >
            <span className="h-6 w-6 overflow-hidden rounded-full bg-mahogany-deep/10">
              {p.photoUrl && <img src={p.photoUrl} alt={p.firstName} className="h-full w-full object-cover" />}
            </span>
            {p.firstName} {p.lastName}
          </button>
        ))}
      </div>
    </div>
  );
}
