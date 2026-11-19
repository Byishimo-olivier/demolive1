import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { DemoBanner } from './DemoBanner';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Layout() {
  const { user, loading } = useAuth();
  const { currentProject } = useProject();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Nothing is protected: the demo workspace opens by itself (see AuthContext).
  // Only if that failed (e.g. browser storage blocked) is there nothing to show.
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center">
        <p className="text-gray-700">The demo could not open in this browser.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  const projectRoutes = ['/procurement', '/finance', '/contracts', '/reports', '/timeline', '/inventory'];
  const isProjectRoute = projectRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className="min-h-screen app-canvas flex flex-col">
      <Navbar onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)} isSidebarCollapsed={isSidebarCollapsed} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isCollapsed={isSidebarCollapsed} />

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            // Sidebar width + the gaps around it
            isSidebarCollapsed ? "ml-[92px]" : "ml-[264px]"
          )}
        >
          <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-8">
            <DemoBanner />
            {isProjectRoute && currentProject && (
              <Button
                variant="ghost"
                onClick={() => navigate(`/projects/${currentProject._id}`)}
                className="mb-4 -ml-2 text-gray-500 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to {currentProject.name}
              </Button>
            )}
            <Outlet />
          </div>
        </motion.main>
      </div>
    </div>
  );
}
