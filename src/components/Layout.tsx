import type { YggdrasilTreeApi } from '../hooks/useYggdrasilTree';
import { Breadcrumbs } from './Breadcrumbs';
import { ActiveFamilyView } from './ActiveFamilyView';
import { ProfileDrawer } from './ProfileDrawer';

interface LayoutProps {
  tree: YggdrasilTreeApi;
}

/**
 * Top-level shell: sticky breadcrumb bar + the focused family unit view.
 * The Profile Drawer is rendered here so it can overlay everything,
 * regardless of scroll position within the active family view.
 */
export function Layout({ tree }: LayoutProps) {
  return (
    <div className="min-h-dvh bg-parchment">
      <Breadcrumbs path={tree.breadcrumbPath} onNavigate={tree.navigateToBreadcrumb} />
      <ActiveFamilyView tree={tree} />
      <ProfileDrawer tree={tree} />
    </div>
  );
}
