import { format } from 'date-fns';
import {
  Calendar,
  DollarSign,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  FolderKanban,
  Search,
  Filter,
  LayoutGrid,
  List,
  TrendingUp,
  Users,
  Clock,
  Building2,
  MoreVertical,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ProjectDialog } from '../components/ProjectDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useProjects } from '../hooks/useProjects';
import { useProject } from '../contexts/ProjectContext';
import { Can } from '../components/PermissionGate';
import { Permissions } from '../constants/permissions';
import type { Project } from '../types';
import { projectApi } from '../lib/project-api';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

export function Projects() {
  const { formatAmount } = useCurrency();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { setProject: ctxSetProject } = useProject();
  
  const { projects, isLoading, refetch } = useProjects();

  const handleDelete = async (project: Project) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectApi.deleteProject(project._id);
        toast.success('Project deleted successfully');
        refetch();
      } catch (error) {
        console.error('Error deleting project:', error);
        toast.error('Failed to delete project');
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
      'In Progress': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
      'On Hold': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
      'Completed': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
      'Planning': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
      'Cancelled': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
    };
    return colors[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
  };

  const getTypeColor = (type: string) => {
    return type === 'Capital' 
      ? 'bg-blue-600' 
      : 'bg-emerald-600';
  };

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.projectDescription?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'In Progress').length,
    completed: projects.filter(p => p.status === 'Completed').length,
    totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-gray-600 animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Loading projects...</p>
        </motion.div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">Projects</h1>
            <p className="text-gray-500 mt-1">Manage and track your infrastructure projects</p>
          </div>
          <Can permission={Permissions.CREATE_PROJECT}>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="h-10 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Can>
        </motion.div>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-gray-200 rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <FolderKanban className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No projects yet</h3>
          <p className="text-gray-500 text-center max-w-sm mb-6">
            Create your first project to start managing your infrastructure work
          </p>
          <Can permission={Permissions.CREATE_PROJECT}>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="h-10 px-6 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Project
            </Button>
          </Can>
        </motion.div>

        <ProjectDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          project={selectedProject}
          onSuccess={() => {
            refetch();
            setSelectedProject(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-heading">Projects</h1>
            <p className="text-gray-500 mt-1">Manage and track your infrastructure projects</p>
          </div>
          <Can permission={Permissions.CREATE_PROJECT}>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="h-10 px-4 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Can>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Projects', value: stats.total, icon: FolderKanban },
            { label: 'In Progress', value: stats.inProgress, icon: Clock },
            { label: 'Completed', value: stats.completed, icon: TrendingUp },
            { label: 'Total Budget', value: formatAmount(stats.totalBudget), icon: DollarSign },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filters & Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
      >
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-white border-gray-200 rounded-lg"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 border-gray-200 rounded-lg">
                <Filter className="h-4 w-4" />
                {statusFilter === 'all' ? 'All Status' : statusFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'].map(status => (
                <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                  <div className={cn("w-2 h-2 rounded-full mr-2", getStatusColor(status).dot)} />
                  {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={cn(
              "h-8 w-8 p-0 rounded-md",
              viewMode === 'grid' && "bg-white shadow-sm"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('list')}
            className={cn(
              "h-8 w-8 p-0 rounded-md",
              viewMode === 'list' && "bg-white shadow-sm"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Projects Grid/List */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProjects.map((project, index) => {
              const statusColors = getStatusColor(project.status);
              return (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group"
                >
                  <Card
                    className="relative overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer bg-white"
                    onClick={() => {
                      ctxSetProject(project);
                      navigate(`/projects/${project._id}`);
                    }}
                  >
                    {/* Top accent bar */}
                    <div className={cn("h-1", getTypeColor(project.type))} />

                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            getTypeColor(project.type)
                          )}>
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors truncate">
                              {project.name}
                            </h3>
                            <p className="text-xs text-gray-500">{project.projectCode}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              ctxSetProject(project);
                              navigate(`/projects/${project._id}`);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <Can permission={Permissions.UPDATE_PROJECT}>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(project);
                                setIsDialogOpen(true);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </Can>
                            <DropdownMenuSeparator />
                            <Can permission={Permissions.DELETE_PROJECT}>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(project);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </Can>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4 min-h-[40px]">
                        {project.projectDescription || 'No description provided'}
                      </p>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-gray-500">Progress</span>
                          <span className="text-xs font-medium text-gray-900">{project.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", getTypeColor(project.type))}
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{format(new Date(project.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>{project.team?.length || 0} members</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs border",
                              statusColors.bg,
                              statusColors.text,
                              statusColors.border
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusColors.dot)} />
                            {project.status}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatAmount(project.budget)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {filteredProjects.map((project, index) => {
              const statusColors = getStatusColor(project.status);
              return (
                <motion.div
                  key={project._id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card
                    className="group border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer bg-white"
                    onClick={() => {
                      ctxSetProject(project);
                      navigate(`/projects/${project._id}`);
                    }}
                  >
                    <div className="flex items-center p-4 gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        getTypeColor(project.type)
                      )}>
                        <Building2 className="h-5 w-5 text-white" />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {project.name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs border flex-shrink-0",
                              statusColors.bg,
                              statusColors.text,
                              statusColors.border
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full mr-1", statusColors.dot)} />
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {project.projectDescription || 'No description'}
                        </p>
                      </div>

                      {/* Progress */}
                      <div className="hidden md:block w-28 flex-shrink-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">Progress</span>
                          <span className="text-xs font-medium">{project.progress || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", getTypeColor(project.type))}
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="hidden lg:flex items-center gap-6 text-sm text-gray-500 flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{project.team?.length || 0}</span>
                        </div>
                        <span className="font-medium text-gray-900 min-w-[80px] text-right">
                          {formatAmount(project.budget)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Can permission={Permissions.UPDATE_PROJECT}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Can>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty search results */}
      {filteredProjects.length === 0 && projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No projects found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
        </motion.div>
      )}

      <ProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        project={selectedProject}
        onSuccess={() => {
          refetch();
          setSelectedProject(null);
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
