import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Package,
  Users,
  Gavel,
  Settings,
  ChevronDown,
  Building2,
  LogOut,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { Can } from '@/components/PermissionGate';

interface SidebarProps {
  isCollapsed: boolean;
}

const navigation = [
  // The whole company across all projects, even while a project is open
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Projects',
    to: '/projects',
    icon: Briefcase,
    permission: ['project:view', 'company:view-projects'],
  },
  {
    name: 'Inventory',
    to: '/inventory',
    icon: Package,
    permission: ['inventory:view'],
  },
  {
    name: 'Members',
    to: '/members',
    icon: Users,
    permission: ['company:view'],
  },
  {
    name: 'Bidding',
    to: '/bidding/tenders',
    icon: Gavel,
    permission: ['bidding:view-tender'],
  },
];

const bottomNavigation = [
  { name: 'Settings', to: '/settings', icon: Settings },
  { name: 'System Admin', to: '/admin', icon: Key },
];

export function Sidebar({ isCollapsed }: SidebarProps) {
  const location = useLocation();
  const { user, signOut, activeProfile, switchToProfile, organizationProfiles } = useAuth();
  // Everyone works in a company; people invited to one of its projects only see their projects
  const workspaceName = activeProfile?.name || 'Company';
  const projectOnly = !!(activeProfile?.data as { projectAccessOnly?: boolean } | undefined)?.projectAccessOnly;
  const canSwitch = organizationProfiles.length > 1;

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const isActiveOrg = (orgId: string) =>
    activeProfile?.type === 'organization' && activeProfile.id === orgId;

  const renderNavItem = (item: (typeof navigation)[0]) => {
    const Icon = item.icon;
    const isActive = isActiveRoute(item.to);

    return (
      <div key={item.name}>
        <NavLink
          to={item.to}
          title={isCollapsed ? item.name : undefined}
          className={cn(
            'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
            isActive
              ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
              : 'text-white/55 hover:text-white hover:bg-white/[0.05]',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Icon
            className={cn(
              'h-[18px] w-[18px] flex-shrink-0',
              isActive ? 'text-orange-400' : 'text-white/40 group-hover:text-white/70'
            )}
          />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="truncate"
              >
                {item.name}
              </motion.span>
            )}
          </AnimatePresence>
          {isActive && !isCollapsed && (
            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_2px_rgba(249,115,22,0.55)]" />
          )}
        </NavLink>
      </div>
    );
  };

  const renderNavItemWithPermission = (item: (typeof navigation)[0]) => {
    if ('permission' in item && item.permission) {
      return (
        <Can key={item.name} permission={item.permission}>
          {renderNavItem(item)}
        </Can>
      );
    }
    return renderNavItem(item);
  };

  return (
    <aside
      className={cn(
        'fixed left-3 top-[80px] bottom-3 z-30 flex flex-col overflow-hidden rounded-2xl surface-glass-dark text-white ring-1 ring-white/[0.08] transition-all duration-200',
        isCollapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      {/* Soft orange light at the top of the panel */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-orange-500/[0.12] to-transparent" />
      <div className="relative flex flex-col h-full">
        {/* Company workspace */}
        <div className={cn('p-3 border-b border-white/[0.06]', isCollapsed && 'flex justify-center')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!canSwitch}>
              <button
                className={cn(
                  'flex items-center gap-3 w-full rounded-xl p-2 transition-colors',
                  canSwitch ? 'hover:bg-white/[0.05]' : 'cursor-default',
                  isCollapsed && 'justify-center p-2'
                )}
                title={isCollapsed ? workspaceName : undefined}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-glow-orange flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 text-left min-w-0 overflow-hidden"
                    >
                      <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                        {projectOnly ? 'Project access' : 'Company'}
                      </p>
                      <p className="text-sm font-semibold text-white truncate">{workspaceName}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!isCollapsed && canSwitch && <ChevronDown className="h-4 w-4 text-white/40 flex-shrink-0" />}
              </button>
            </DropdownMenuTrigger>
            {canSwitch && (
              <DropdownMenuContent align="start" className="w-56 rounded-lg p-1">
                <DropdownMenuLabel className="text-xs text-gray-400 font-normal px-3">Switch company</DropdownMenuLabel>
                {organizationProfiles.map((org) => (
                  <DropdownMenuItem
                    key={org._id}
                    onClick={() => switchToProfile('organization', org._id)}
                    className={cn('rounded-lg mx-1', isActiveOrg(org._id) && 'bg-blue-50 text-blue-700')}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm truncate">{org.name}</span>
                      {(org as { projectAccessOnly?: boolean }).projectAccessOnly && (
                        <span className="ml-auto text-[10px] text-gray-400">projects</span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 mt-1">
          {navigation.map(renderNavItemWithPermission)}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-3 space-y-1 border-t border-white/[0.06]">
          {bottomNavigation.filter(item => item.name !== 'System Admin' || (user?.role as string) === 'admin' || (user?.role as string) === 'Admin').map(renderNavItem)}

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-3 w-full rounded-xl p-2 hover:bg-white/[0.05] transition-colors text-left',
                  isCollapsed && 'justify-center'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-orange-500 ring-2 ring-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-white">
                    {user?.fullName?.[0]}
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-white/45 truncate">{user?.email}</p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56 rounded-lg p-1">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="rounded-lg mx-1 text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
