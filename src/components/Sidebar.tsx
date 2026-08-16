export type NavKey = 'profile' | 'tree' | 'journal' | 'settings';

interface SidebarProps {
  activeNav: NavKey;
  onNavigate: (key: NavKey) => void;
  currentUserName?: string;
  currentUserRole?: string;
  currentUserPhoto?: string;
}

const NAV_ITEMS: { key: NavKey; label: string; icon: string; filled?: boolean }[] = [
  { key: 'profile', label: 'My Profile', icon: 'person' },
  { key: 'tree', label: 'Family Tree', icon: 'account_tree', filled: true },
  { key: 'journal', label: 'Personal Journal', icon: 'menu_book' },
  { key: 'settings', label: 'Legacy Settings', icon: 'settings' },
];

export function Sidebar({
  activeNav,
  onNavigate,
  currentUserName = 'Elizabeth Avery',
  currentUserRole = 'Keeper of the 4th Generation',
  currentUserPhoto = 'https://i.pravatar.cc/96?u=keeper',
}: SidebarProps) {
  return (
    <nav className="hidden md:flex flex-col h-screen py-8 w-80 left-0 fixed bg-panel border-r border-umber/10 shadow-xl shadow-umber-dark/5 z-40">
      <div className="px-6 mb-12">
        <h1 className="font-display text-[22px] text-umber mb-2 font-semibold">HeritageArchive</h1>
        <div className="flex items-center gap-3 mt-6">
          <img
            className="w-12 h-12 rounded-full object-cover border border-umber/20"
            src={currentUserPhoto}
            alt={currentUserName}
          />
          <div>
            <p className="font-sans text-[14px] font-bold text-umber">{currentUserName}</p>
            <p className="font-sans text-[12px] text-slate">{currentUserRole}</p>
          </div>
        </div>
      </div>
      <ul className="flex flex-col flex-grow">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activeNav;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onNavigate(item.key)}
                className={
                  active
                    ? 'w-full flex items-center gap-3 side-nav-active transition-transform font-sans font-medium text-left'
                    : 'w-full flex items-center gap-3 text-slate px-6 py-4 hover:bg-paper/50 transition-transform font-sans font-medium text-left'
                }
              >
                <span
                  className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
        <li className="mt-auto mb-4">
          <button
            type="button"
            className="w-full flex items-center gap-3 text-slate px-6 py-4 hover:bg-paper/50 transition-transform font-sans font-medium text-left"
          >
            <span className="material-symbols-outlined">logout</span> Log Out
          </button>
        </li>
      </ul>
      <div className="px-6">
        <button className="w-full py-3 px-4 rounded border border-dove text-umber font-sans text-[14px] uppercase tracking-widest hover:bg-dove/10 font-semibold">
          Upgrade to Heirloom
        </button>
      </div>
    </nav>
  );
}
