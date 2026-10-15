import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Project } from '../types';

interface ProjectContextType {
  currentProject: Project | null;
  projectId: string | null;
  setProject: (project: Project) => void;
  clearProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // On mount load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('infrasoko_active_project');
      if (stored) {
        const parsed: Project = JSON.parse(stored);
        setCurrentProject(parsed);
      }
    } catch (err) {
      // ignore corrupt data
      console.error('Failed to parse active project from storage', err);
    }
  }, []);

  const setProject = (project: Project) => {
    setCurrentProject(project);
    localStorage.setItem('infrasoko_active_project', JSON.stringify(project));
  };

  const clearProject = () => {
    setCurrentProject(null);
    localStorage.removeItem('infrasoko_active_project');
  };

  return (
    <ProjectContext.Provider value={{ currentProject, projectId: currentProject?._id || null, setProject, clearProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};

export const useProjectId = () => {
  const { projectId } = useProject();
  return projectId;
}; 
