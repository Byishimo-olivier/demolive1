import { useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export function Layout() {
  const { user, loading, activeProfile } = useAuth();
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // No company yet: register one first (settings and payment pages stay open)
  const openWithoutCompany = ['/register-company', '/settings', '/payment/result'];
  if (!activeProfile && !openWithoutCompany.some((path) => location.pathname.startsWith(path))) {
    return <Navigate to="/register-company" replace />;
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
