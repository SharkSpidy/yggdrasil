import { ChevronRight, TreePine } from 'lucide-react';
import type { BreadcrumbNode } from '../types';

interface BreadcrumbsProps {
  path: BreadcrumbNode[];
  onNavigate: (id: string) => void;
}

export function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Family lineage breadcrumb"
      className="sticky top-0 z-30 w-full border-b border-mahogany-deep/10 bg-linen/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-8">
        <div className="flex shrink-0 items-center gap-2 pr-3 text-mahogany-deep">
          <TreePine className="h-5 w-5" strokeWidth={1.75} />
          <span className="font-serif text-lg font-semibold tracking-tight">Yggdrasil</span>
        </div>
        <div className="h-6 w-px shrink-0 bg-mahogany-deep/15" />
        <ol className="flex min-w-0 items-center gap-1 text-sm">
          {path.map((node, idx) => {
            const isLast = idx === path.length - 1;
            return (
              <li key={node.id} className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => onNavigate(node.id)}
                  aria-current={isLast ? 'location' : undefined}
                  className={[
                    'rounded-full px-3 py-1.5 font-medium transition-colors duration-200',
                    isLast
                      ? 'bg-mahogany-deep text-linen shadow-sm'
                      : 'text-mahogany-deep/70 hover:bg-mahogany-deep/8 hover:text-mahogany-deep',
                  ].join(' ')}
                >
                  {node.label}
                </button>
                {!isLast && <ChevronRight className="h-4 w-4 shrink-0 text-mahogany-deep/30" />}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
