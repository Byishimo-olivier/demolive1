import { PanelLeftClose, PanelLeft, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CurrencySwitcher } from './CurrencySwitcher';
import { BrandLogo } from '@/components/BrandLogo';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export function Navbar({ onToggleSidebar, isSidebarCollapsed }: NavbarProps) {
  const { user, signOut, activeProfile, organizationProfiles, switchToProfile } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          <BrandLogo size="sm" className="hidden md:inline-flex" />
          {user && (
            <Badge variant="secondary" className="hidden md:inline-flex bg-blue-50 text-blue-700 border-blue-200 text-xs py-0">
              BETA
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <CurrencySwitcher compact />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-lg hover:bg-gray-100">
                <Avatar className="h-9 w-9 border-2 border-gray-200">
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
                    {user?.fullName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-lg border-gray-200" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Profile Switching */}
              {activeProfile && (
                <>
                  <DropdownMenuLabel className="text-xs text-gray-400 uppercase tracking-wider">
                    Switch Profile
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => switchToProfile('personal', user!._id || user!.id)}
                    className={`rounded-lg mx-1 ${activeProfile.type === 'personal' ? 'bg-blue-50 text-blue-700' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">{user?.fullName?.[0]}</span>
                      </div>
                      <span className="text-sm">Personal</span>
                    </div>
                  </DropdownMenuItem>
                  {organizationProfiles.map((org) => (
                    <DropdownMenuItem
                      key={org._id}
                      onClick={() => switchToProfile('organization', org._id)}
                      className={`rounded-lg mx-1 ${activeProfile.type === 'organization' && activeProfile.id === org._id ? 'bg-blue-50 text-blue-700' : ''}`}
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
                </>
              )}

              <DropdownMenuItem
                onClick={() => navigate('/settings')}
                className="rounded-lg mx-1"
              >
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="rounded-lg mx-1 text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
