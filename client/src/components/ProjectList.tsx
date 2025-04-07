import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import NewProjectModal from "./NewProjectModal";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { sounds } from "@/lib/sounds";

const ProjectList = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

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

  // Función para eliminar un proyecto
  const handleDeleteProject = async (projectId: number) => {
    if (!projectId) return;
    
    setIsDeleting(true);
    
    try {
      // Realizar la solicitud para eliminar el proyecto
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error("Error al eliminar el proyecto");
      }
      
      // Reproducir sonido de éxito
      sounds.play('success', 0.4);
      
      // Actualizar la caché de proyectos
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Mostrar un toast de éxito
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado correctamente",
      });
      
      // Resetear el proyecto a eliminar
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error eliminando proyecto:", error);
      
      // Reproducir sonido de error
      sounds.play('error', 0.4);
      
      // Mostrar un toast de error
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
            <Card key={project.id} className="hover:shadow-md transition-shadow relative group">
              <Link href={`/workspace/${project.id}`}>
                <a className="block">
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
                </a>
              </Link>
              <CardFooter className="pt-0 pb-3 px-4 justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                    >
                      <i className="ri-delete-bin-line mr-1"></i>
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro de eliminar este proyecto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción eliminará permanentemente el proyecto "{project.name}" y todos sus archivos. 
                        Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-500 hover:bg-red-600"
                        onClick={async (e) => {
                          e.preventDefault();
                          await handleDeleteProject(project.id!);
                        }}
                      >
                        {isDeleting && project.id === projectToDelete?.id ? (
                          <>
                            <i className="ri-loader-4-line animate-spin mr-2"></i>
                            Eliminando...
                          </>
                        ) : "Eliminar"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
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
    if (!projectId) return;
    
    setIsDeleting(true);
    
    try {
      // Realizar la solicitud para eliminar el proyecto
      const response = await apiRequest("DELETE", `/api/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error("Error al eliminar el proyecto");
      }
      
      // Reproducir sonido de éxito
      sounds.play('success', 0.4);
      
      // Actualizar la caché de proyectos
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Mostrar un toast de éxito
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado correctamente",
      });
      
      // Resetear el proyecto a eliminar
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error eliminando proyecto:", error);
      
      // Reproducir sonido de error
      sounds.play('error', 0.4);
      
      // Mostrar un toast de error
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
};

export default ProjectList;
