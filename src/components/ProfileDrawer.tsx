import { useEffect } from 'react';
import type { FamilyMember } from '../types/family';

interface ProfileDrawerProps {
  member: FamilyMember | null;
  onClose: () => void;
}

function formatYear(date?: string, approx?: boolean) {
  if (!date) return 'Unknown';
  const year = new Date(date).getFullYear();
  return approx ? `c. ${year}` : String(year);
}

export function ProfileDrawer({ member, onClose }: ProfileDrawerProps) {
  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    if (!member) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [member, onClose]);

  const isOpen = Boolean(member);

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-umber-dark/20 z-10 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-paper shadow-[-10px_0_30px_rgba(78,52,46,0.05)] border-l border-umber/10 z-20 flex flex-col overflow-y-auto transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {member && (
          <>
            <div className="relative h-72 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-b from-umber/10 to-paper z-10" />
              <img
                className="w-full h-full object-cover object-top mix-blend-multiply opacity-80"
                src={member.photoUrl}
                alt={`${member.firstName} ${member.lastName}`}
              />
              <button
                type="button"
                onClick={onClose}
                className="absolute top-6 right-6 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-sm border border-umber/20 text-umber hover:bg-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="absolute bottom-0 left-0 w-full p-8 z-20 bg-gradient-to-t from-paper via-paper/80 to-transparent pt-20">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full border border-dove text-dove font-sans text-[12px] uppercase tracking-widest mb-3 bg-white/50 backdrop-blur-sm">
                      {member.deathDate ? 'Direct Ancestor' : 'Living Member'}
                    </span>
                    <h2 className="font-display text-[40px] text-umber-dark mb-1 font-bold">
                      {member.firstName} {member.lastName}
                    </h2>
                    <p className="font-sans text-[18px] text-slate italic">
                      {formatYear(member.birthDate, member.birthDateApprox)} —{' '}
                      {member.deathDate ? new Date(member.deathDate).getFullYear() : 'Present'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="w-12 h-12 flex items-center justify-center rounded-full btn-primary shadow-lg shrink-0"
                    title="Edit profile"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 flex-grow space-y-12">
              {member.biography && (
                <section>
                  <h3 className="font-display text-[22px] text-umber mb-4 border-b border-umber/10 pb-2 flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-umber/50">auto_stories</span>
                    Biography
                  </h3>
                  <div className="font-sans text-[16px] text-[#504442] space-y-4 leading-relaxed">
                    <p className="first-letter:font-display first-letter:text-5xl first-letter:float-left first-letter:pr-2 first-letter:text-umber">
                      {member.biography}
                    </p>
                  </div>
                </section>
              )}

              {member.occupation && (
                <section>
                  <h3 className="font-display text-[22px] text-umber mb-4 border-b border-umber/10 pb-2 flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-umber/50">work</span>
                    Occupation
                  </h3>
                  <p className="font-sans text-[16px] text-slate">{member.occupation}</p>
                </section>
              )}

              {member.address && (
                <section>
                  <h3 className="font-display text-[22px] text-umber mb-4 border-b border-umber/10 pb-2 flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-umber/50">home</span>
                    Address
                  </h3>
                  <p className="font-sans text-[16px] text-slate">
                    {[member.address.line1, member.address.city, member.address.state, member.address.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </section>
              )}

              {member.events && member.events.length > 0 && (
                <section>
                  <h3 className="font-display text-[22px] text-umber mb-4 border-b border-umber/10 pb-2 flex items-center gap-2 font-semibold">
                    <span className="material-symbols-outlined text-umber/50">history</span>
                    Key Life Events
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {member.events.map((event) => (
                      <div
                        key={event.id}
                        className="bg-panel border border-umber/10 p-5 rounded-lg shadow-heritage relative overflow-hidden group"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-dove" />
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-umber/10 shrink-0">
                            <span className="material-symbols-outlined text-umber">
                              {event.icon ?? 'event'}
                            </span>
                          </div>
                          <div>
                            <p className="font-sans text-[12px] text-dove uppercase tracking-wider mb-1">
                              {event.date}
                            </p>
                            <h4 className="font-display text-[20px] text-umber-dark mb-1 font-semibold">
                              {event.title}
                            </h4>
                            {event.location && (
                              <p className="font-sans text-[14px] text-slate">{event.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
