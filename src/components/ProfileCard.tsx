import { Calendar, MapPin } from 'lucide-react';
import type { FamilyMember } from '../types';

interface ProfileCardProps {
  member: FamilyMember;
  onSelect: (id: string) => void;
  size?: 'large' | 'medium';
}

function formatYear(date?: string) {
  if (!date) return null;
  return date.slice(0, 4);
}

export function ProfileCard({ member, onSelect, size = 'large' }: ProfileCardProps) {
  const born = formatYear(member.birthDate);
  const died = formatYear(member.deathDate);
  const isLarge = size === 'large';

  return (
    <button
      onClick={() => onSelect(member.id)}
      className={[
        'group flex flex-col items-center rounded-3xl border border-mahogany-deep/10 bg-white/70',
        'shadow-heirloom transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mahogany-deep/40',
        isLarge ? 'w-64 gap-4 p-6 sm:w-72' : 'w-40 gap-2 p-3',
      ].join(' ')}
    >
      <div
        className={[
          'relative overflow-hidden rounded-full ring-4 ring-mahogany-deep/5 transition-all duration-300 group-hover:ring-mahogany-deep/15',
          isLarge ? 'h-28 w-28 sm:h-32 sm:w-32' : 'h-16 w-16',
        ].join(' ')}
      >
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={`${member.firstName} ${member.lastName}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-mahogany-deep/10 font-serif text-2xl text-mahogany-deep/50">
            {member.firstName[0]}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5 text-center">
        <h3 className={['font-serif font-semibold text-mahogany', isLarge ? 'text-xl' : 'text-sm'].join(' ')}>
          {member.firstName} {member.lastName}
        </h3>
        {isLarge && (
          <>
            <div className="flex items-center gap-1.5 text-xs font-medium text-sage">
              <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
              <span>
                {born ?? '—'} {died ? `– ${died}` : member.deathDate === undefined ? '– Present' : ''}
              </span>
            </div>
            {member.birthPlace && (
              <div className="flex items-center gap-1.5 text-xs text-mahogany-deep/50">
                <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{member.birthPlace}</span>
              </div>
            )}
          </>
        )}
        {!isLarge && <span className="text-[11px] text-sage">{born ?? '—'}</span>}
      </div>
    </button>
  );
}
