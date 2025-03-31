import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";

interface NewProjectModalProps {
  onClose: () => void;
}

const NewProjectModal = ({ onClose }: NewProjectModalProps) => {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("html-css-js");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  // Focus on project name input when modal opens
  useEffect(() => {
    const timer = setTimeout(() => {
      const input = document.getElementById("projectName");
      if (input) input.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Close modal on escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para el proyecto",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await apiRequest("POST", "/api/projects", {
        name: projectName,
        description
      });
      
      const newProject = await response.json();
      
      // Create initial files based on template
      if (template === "html-css-js") {
        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "index.html",
          content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="estilos.css">
</head>
<body>
  <div id="app">
    <h1>Bienvenido a ${projectName}</h1>
    <p>${description || "Mi nuevo proyecto"}</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
          type: "html"
        });
        
        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "estilos.css",
          content: `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
}

#app {
  max-width: 800px;
  margin: 0 auto;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h1 {
  color: #333;
}

/* Hacemos el diseño responsive */
@media (max-width: 768px) {
  #app {
    padding: 15px;
  }
  
  h1 {
    font-size: 1.5rem;
  }
}`,
          type: "css"
        });
        
        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "app.js",
          content: `// Código JavaScript para ${projectName}
document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplicación iniciada');
  
  // Detectar si es un dispositivo móvil
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    console.log('Versión móvil cargada');
  }
});`,
          type: "javascript"
        });
      }
      
      // Invalidate projects cache
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: "Proyecto creado",
        description: `${projectName} ha sido creado exitosamente`
      });
      
      // Navigate to the workspace
      navigate(`/workspace/${newProject.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  // Function to prevent interaction with the background while modal is open
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full ${isMobile ? 'max-h-[90vh] overflow-y-auto' : ''}`}
        style={{ maxWidth: isMobile ? '100%' : '450px' }}
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-medium">Crear nuevo proyecto</h3>
          <button 
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>
        
        <div className="p-4">
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectName" className="text-sm font-medium">
                  Nombre del proyecto
                </Label>
                <Input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1.5"
                  placeholder="Mi aplicación"
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Descripción (opcional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 h-20"
                  placeholder="Breve descripción del proyecto"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <Label htmlFor="template" className="text-sm font-medium">
                  Plantilla
                </Label>
                <Select 
                  value={template} 
                  onValueChange={setTemplate}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="template" className="mt-1.5">
                    <SelectValue placeholder="Selecciona una plantilla" />
                  </SelectTrigger>
                  <SelectContent position={isMobile ? "popper" : "item-aligned"}>
                    <div className={isMobile ? "max-h-[200px] overflow-y-auto" : ""}>
                      <SelectItem value="html-css-js">
                        <div className="flex items-start gap-2">
                          <i className="ri-html5-line text-orange-500 mt-0.5"></i>
                          <div>
                            <div>HTML/CSS/JS Básico</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Sitio web simple con HTML, CSS y JavaScript
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="react">
                        <div className="flex items-start gap-2">
                          <i className="ri-reactjs-line text-blue-400 mt-0.5"></i>
                          <div>
                            <div>React</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Aplicación React con componentes básicos
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="vue">
                        <div className="flex items-start gap-2">
                          <i className="ri-vuejs-line text-green-500 mt-0.5"></i>
                          <div>
                            <div>Vue</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Aplicación Vue.js con componentes básicos
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="node">
                        <div className="flex items-start gap-2">
                          <i className="ri-nodejs-line text-green-600 mt-0.5"></i>
                          <div>
                            <div>Node.js</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Servidor Node.js con Express
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="python">
                        <div className="flex items-start gap-2">
                          <i className="ri-python-line text-blue-500 mt-0.5"></i>
                          <div>
                            <div>Python</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              Aplicación Python con Flask
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Creando...
                  </>
                ) : "Crear proyecto"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewProjectModal;
