import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { CreateCompanyModal } from './modals/CreateCompanyModal';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Gavel,
  Settings,
  ChevronDown,
  Building2,
  User as UserIcon,
  LogOut,
  ArrowLeftRight,
  Plus,
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
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Projects',
    to: '/projects',
    icon: Briefcase,
    permission: ['project:view', 'company:view-projects'],
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
  const { user, signOut, activeProfile, switchToProfile, organizationProfiles, refreshUserCompanies } = useAuth();
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

  const handleCompanyCreated = async (company: Company) => {
    await refreshUserCompanies();
    await switchToProfile('organization', company._id);
  };

  const isPersonal = activeProfile?.type === 'personal';
  const hasOrgs = organizationProfiles.length > 0;
  const isMultiOrg = organizationProfiles.length > 1;

  const getWorkspaceName = () => {
    if (isPersonal) return user?.fullName || 'Personal';
    return activeProfile?.name || 'Organization';
  };

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
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
            isActive
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Icon
            className={cn(
              'h-[18px] w-[18px] flex-shrink-0',
              isActive ? 'text-orange-500' : 'text-gray-400'
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
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />
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

  /**
   * 1 org → simple toggle button  Personal ↔ Company
   */
  const renderSingleOrgToggle = () => {
    const org = organizationProfiles[0];
    return (
      <button
        onClick={() =>
          isPersonal
            ? switchToProfile('organization', org._id)
            : switchToProfile('personal', user?._id || user?.id || '')
        }
        title={isPersonal ? `Switch to ${org.name}` : 'Switch to Personal'}
        className={cn(
          'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors',
          'bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-700 border border-gray-200 hover:border-blue-200',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <ArrowLeftRight className="h-3.5 w-3.5 flex-shrink-0" />
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="truncate"
            >
              {isPersonal ? `Switch to ${org.name}` : 'Switch to Personal'}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  };

  /**
   * 2+ orgs → avatar strip: Personal + one clickable avatar per org.
   * Active profile gets a blue ring; others are muted gray.
   */
  const renderMultiOrgStrip = () => {
    const avatarClass = (active: boolean) =>
      cn(
        'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all border-2 cursor-pointer',
        active
          ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200'
          : 'bg-gray-100 text-gray-500 border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300'
      );

    return (
      <div
        className={cn(
          'flex items-center gap-1.5 flex-wrap',
          isCollapsed && 'flex-col justify-center'
        )}
      >
        {/* Personal */}
        <button
          onClick={() => switchToProfile('personal', user?._id || user?.id || '')}
          title="Personal"
          className={avatarClass(isPersonal)}
        >
          {user?.fullName?.[0] ?? 'P'}
        </button>

        {/* One avatar per org */}
        {organizationProfiles.map((org) => (
          <button
            key={org._id}
            onClick={() => switchToProfile('organization', org._id)}
            title={org.name}
            className={avatarClass(isActiveOrg(org._id))}
          >
            {org.name?.[0]?.toUpperCase() ?? '?'}
          </button>
        ))}

        {/* "Switch workspace" label when sidebar is expanded */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-[10px] text-gray-400 ml-1 truncate"
            >
              Switch workspace
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-200',
        isCollapsed ? 'w-[68px]' : 'w-60'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Workspace Selector */}
        <div
          className={cn(
            'p-3 border-b border-gray-100',
            isCollapsed && 'flex justify-center'
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-3 w-full rounded-lg p-2 hover:bg-gray-50 transition-colors',
                  isCollapsed && 'justify-center p-2'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  {isPersonal ? (
                    <UserIcon className="h-4 w-4 text-white" />
                  ) : (
                    <Building2 className="h-4 w-4 text-white" />
                  )}
                </div>

                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex-1 text-left min-w-0 overflow-hidden"
                    >
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        {isPersonal ? 'Personal' : 'Workspace'}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {getWorkspaceName()}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isCollapsed && (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-lg p-1">
              <DropdownMenuLabel className="text-xs text-gray-400 font-normal px-3">
                Switch workspace
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => switchToProfile('personal', user?._id || user?.id || '')}
                className={cn('rounded-lg mx-1', isPersonal && 'bg-blue-50 text-blue-700')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">
                      {user?.fullName?.[0]}
                    </span>
                  </div>
                  <span className="text-sm">Personal</span>
                </div>
              </DropdownMenuItem>
              {organizationProfiles.map((org) => (
                <DropdownMenuItem
                  key={org._id}
                  onClick={() => switchToProfile('organization', org._id)}
                  className={cn(
                    'rounded-lg mx-1',
                    isActiveOrg(org._id) && 'bg-blue-50 text-blue-700'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                      <Building2 className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm truncate">{org.name}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setCreateCompanyOpen(true)}
                className="rounded-lg mx-1 text-blue-600 focus:text-blue-700 focus:bg-blue-50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center">
                    <Plus className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-sm">Create company</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Quick Profile Switcher ── */}
        {hasOrgs && (
          <div className={cn('px-3 pt-3', isCollapsed && 'flex justify-center')}>
            {isMultiOrg ? renderMultiOrgStrip() : renderSingleOrgToggle()}
          </div>
        )}

        {/* ── Create Company ── */}
        <div className={cn('px-3 pt-2', isCollapsed && 'flex justify-center')}>
          <button
            onClick={() => setCreateCompanyOpen(true)}
            title="Create company"
            className={cn(
              'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium transition-colors',
              'text-gray-400 hover:text-blue-600 hover:bg-blue-50',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <Plus className="h-3.5 w-3.5 flex-shrink-0" />
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="truncate"
                >
                  Create company
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 mt-1">
          {navigation.map(renderNavItemWithPermission)}
        </nav>

        {/* Bottom Navigation */}
        <div className="p-3 space-y-1 border-t border-gray-100">
          {bottomNavigation.filter(item => item.name !== 'System Admin' || (user?.role as string) === 'admin' || (user?.role as string) === 'Admin').map(renderNavItem)}

          {/* User */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex items-center gap-3 w-full rounded-lg p-2 hover:bg-gray-50 transition-colors text-left',
                  isCollapsed && 'justify-center'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-700">
                    {user?.fullName?.[0]}
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
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

      <CreateCompanyModal
        open={createCompanyOpen}
        onOpenChange={setCreateCompanyOpen}
        onSuccess={handleCompanyCreated}
      />
    </aside>
  );
}
