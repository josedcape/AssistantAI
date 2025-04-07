
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  // Template definitions with features
  const templates = [
    {
      id: "html-css-js",
      name: "HTML/CSS/JS Básico",
      description: "Sitio web simple con HTML, CSS y JavaScript",
      icon: "ri-html5-line",
      iconColor: "text-orange-500",
      features: ["responsive", "dark-mode", "animations"]
    },
    {
      id: "react",
      name: "React",
      description: "Aplicación React con componentes básicos",
      icon: "ri-reactjs-line",
      iconColor: "text-blue-400",
      features: ["routing", "state-management", "api-integration", "authentication"]
    },
    {
      id: "vue",
      name: "Vue",
      description: "Aplicación Vue.js con componentes básicos",
      icon: "ri-vuejs-line",
      iconColor: "text-green-500",
      features: ["routing", "state-management", "api-integration"]
    },
    {
      id: "node",
      name: "Node.js",
      description: "Servidor Node.js con Express",
      icon: "ri-nodejs-line",
      iconColor: "text-green-600",
      features: ["database", "authentication", "api-endpoints"]
    },
    {
      id: "python",
      name: "Python",
      description: "Aplicación Python con Flask",
      icon: "ri-python-line",
      iconColor: "text-blue-500",
      features: ["database", "authentication", "api-endpoints"]
    }
  ];

  // Available features for each template
  const featureLabels: Record<string, string> = {
    "responsive": "Diseño Responsive",
    "dark-mode": "Modo Oscuro",
    "animations": "Animaciones CSS",
    "routing": "Enrutamiento",
    "state-management": "Gestión de Estado",
    "api-integration": "Integración de API",
    "authentication": "Autenticación",
    "database": "Base de Datos",
    "api-endpoints": "Endpoints API"
  };

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

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const getCurrentTemplateFeatures = () => {
    const currentTemplate = templates.find(t => t.id === template);
    return currentTemplate?.features || [];
  };

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

      // Mostrar un toast de creación en proceso con una duración más larga
      toast({
        title: "Creando proyecto",
        description: "Configurando plantilla y archivos iniciales...",
        duration: 6000
      });

      const response = await apiRequest("POST", "/api/projects", {
        name: projectName,
        description,
        template,
        features: selectedFeatures
      });

      const newProject = await response.json();

      // Crear directorios para estructuras más complejas
      if (template === "react" || template === "vue" || template === "node") {
        await apiRequest("POST", "/api/directories/create", {
          path: `src`
        });
        
        if (template === "react" || template === "vue") {
          await apiRequest("POST", "/api/directories/create", {
            path: `src/components`
          });
          
          await apiRequest("POST", "/api/directories/create", {
            path: `public`
          });
        }
        
        if (template === "node") {
          await apiRequest("POST", "/api/directories/create", {
            path: `src/routes`
          });
          
          await apiRequest("POST", "/api/directories/create", {
            path: `src/controllers`
          });
        }
      }

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
  <link rel="stylesheet" href="styles.css">
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
          name: "styles.css",
          content: `/* Estilos para ${projectName} */
body {
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

${selectedFeatures.includes('responsive') ? `
/* Diseño responsive */
@media (max-width: 768px) {
  #app {
    padding: 15px;
  }

  h1 {
    font-size: 1.5rem;
  }
}` : ''}

${selectedFeatures.includes('dark-mode') ? `
/* Modo oscuro */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #fff;
  }

  #app {
    background-color: #2d2d2d;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  h1 {
    color: #fff;
  }
}` : ''}`,
          type: "css"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "app.js",
          content: `// Código JavaScript para ${projectName}
document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplicación iniciada');

  ${selectedFeatures.includes('responsive') ? `
  // Detectar si es un dispositivo móvil
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    console.log('Versión móvil cargada');
  }` : ''}

  ${selectedFeatures.includes('animations') ? `
  // Agregar animaciones
  const title = document.querySelector('h1');
  title.style.opacity = '0';
  title.style.transition = 'opacity 0.5s ease-in-out';
  
  requestAnimationFrame(() => {
    title.style.opacity = '1';
  });` : ''}
});`,
          type: "javascript"
        });
      }

      // Invalidate projects cache
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      // Disparar evento de actualización de archivos para que el explorador se actualice
      toast({
        title: "Actualizando archivos",
        description: "Preparando archivos del proyecto...",
        duration: 3000
      });

      // Preparar los archivos creados para enviarlos al explorador
      const createdFiles = [
        { 
          name: "index.html", 
          content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="app">
    <h1>Bienvenido a ${projectName}</h1>
    <p>${description || "Mi nuevo proyecto"}</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
          extension: "html"
        },
        { 
          name: "styles.css", 
          content: `/* Estilos para ${projectName} */
body {
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

${selectedFeatures.includes('responsive') ? `
/* Diseño responsive */
@media (max-width: 768px) {
  #app {
    padding: 15px;
  }

  h1 {
    font-size: 1.5rem;
  }
}` : ''}

${selectedFeatures.includes('dark-mode') ? `
/* Modo oscuro */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #fff;
  }

  #app {
    background-color: #2d2d2d;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  h1 {
    color: #fff;
  }
}` : ''}`,
          extension: "css"
        },
        { 
          name: "app.js", 
          content: `// Código JavaScript para ${projectName}
document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplicación iniciada');

  ${selectedFeatures.includes('responsive') ? `
  // Detectar si es un dispositivo móvil
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    console.log('Versión móvil cargada');
  }` : ''}

  ${selectedFeatures.includes('animations') ? `
  // Agregar animaciones
  const title = document.querySelector('h1');
  title.style.opacity = '0';
  title.style.transition = 'opacity 0.5s ease-in-out';
  
  requestAnimationFrame(() => {
    title.style.opacity = '1';
  });` : ''}
});`,
          extension: "js"
        }
      ];

      // Enviar archivos al panel de archivos generados
      const sendFilesToExplorer = new CustomEvent('send-files-to-explorer', {
        detail: {
          files: createdFiles,
          projectId: newProject.id,
          fromTemplate: true
        }
      });
      window.dispatchEvent(sendFilesToExplorer);
      
      // Activar la pestaña de archivos generados después de un breve retraso
      setTimeout(() => {
        const activateGeneratedEvent = new CustomEvent('activate-generated-tab', {
          detail: { projectId: newProject.id }
        });
        window.dispatchEvent(activateGeneratedEvent);
      }, 500);
      
      // Luego refrescar archivos después de un breve retraso
      setTimeout(() => {
        const refreshEvent = new CustomEvent('refresh-files', {
          detail: { projectId: newProject.id, forceRefresh: true }
        });
        window.dispatchEvent(refreshEvent);

        // Activar la pestaña de archivos
        const activateFilesEvent = new CustomEvent('activate-files-tab');
        window.dispatchEvent(activateFilesEvent);
      }, 800);

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
        style={{ maxWidth: isMobile ? '100%' : '500px' }}
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

        <form onSubmit={handleSubmit} className="p-4">
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
                onValueChange={(value) => {
                  setTemplate(value);
                  setSelectedFeatures([]);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="template" className="mt-1.5">
                  <SelectValue placeholder="Selecciona una plantilla" />
                </SelectTrigger>
                <SelectContent position={isMobile ? "popper" : "item-aligned"}>
                  <div className={isMobile ? "max-h-[300px] overflow-y-auto" : ""}>
                    {templates.map(tmpl => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        <div className="flex items-start gap-2">
                          <i className={`${tmpl.icon} ${tmpl.iconColor} mt-0.5`}></i>
                          <div>
                            <div>{tmpl.name}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {tmpl.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Características adicionales
              </Label>
              <div className="mt-2 space-y-2">
                {getCurrentTemplateFeatures().map(feature => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      id={`feature-${feature}`}
                      checked={selectedFeatures.includes(feature)}
                      onCheckedChange={() => handleFeatureToggle(feature)}
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor={`feature-${feature}`}
                      className="text-sm text-slate-700 dark:text-slate-300"
                    >
                      {featureLabels[feature]}
                    </label>
                  </div>
                ))}
              </div>
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
  );
};

export default NewProjectModal;
