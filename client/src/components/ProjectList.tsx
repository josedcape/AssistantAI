import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import NewProjectModal from "./NewProjectModal";

const ProjectList = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="mt-4">
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
        <CardContent className="pt-6">
          <p className="text-red-600 dark:text-red-400">Error al cargar proyectos: {(error as Error).message}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            <i className="ri-refresh-line mr-2"></i>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mis Proyectos</h2>
        <Button onClick={() => setIsModalOpen(true)}>
          <i className="ri-add-line mr-2"></i>
          Nuevo Proyecto
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/workspace/${project.id}`}>
              <a className="block">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle>{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                      {project.description || "Sin descripción"}
                    </p>
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        <i className="ri-time-line mr-1"></i>
                        {new Date(project.lastModified).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <i className="ri-code-line mr-1"></i>
                        HTML/CSS/JS
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <i className="ri-folder-add-line text-3xl text-slate-400"></i>
            </div>
            <h3 className="text-lg font-medium mb-2">No tienes proyectos aún</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Comienza creando tu primer proyecto con CodeCraft AI
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              <i className="ri-add-line mr-2"></i>
              Crear un Proyecto
            </Button>
          </CardContent>
        </Card>
      )}

      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
};

export default ProjectList;
