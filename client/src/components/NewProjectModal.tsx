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
import { sounds } from "@/lib/sounds";

interface NewProjectModalProps {
  onClose: () => void;
}

const NewProjectModal = ({ onClose }: NewProjectModalProps) => {
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("html-css-js");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usingGptAssistant, setUsingGptAssistant] = useState(false);
  const [isGeneratingFiles, setIsGeneratingFiles] = useState(false);
  const [showGeneratedFiles, setShowGeneratedFiles] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState([{ name: '', content: '', extension: '', selected: false }]);
  const [availableAgents, setAvailableAgents] = useState<string[]>([]);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  // Función para obtener la descripción de un agente por su nombre
  const getAgentDescription = (agentName: string): string => {
    const descriptions: Record<string, string> = {
      "project_architect": "Diseña la estructura general del proyecto",
      "frontend_designer": "Especialista en interfaces de usuario",
      "backend_developer": "Desarrolla lógica de servidor y APIs",
      "database_specialist": "Experto en modelos de datos y consultas",
      "security_expert": "Implementa medidas de seguridad",
      "devops_engineer": "Optimiza despliegue y configuración"
    };

    return descriptions[agentName] || `Agente de desarrollo`;
  };

  // Obtener agentes disponibles al montar el componente
  useEffect(() => {
    const fetchAvailableAgents = async () => {
      try {
        const response = await apiRequest("GET", "/api/agents");
        const agents = await response.json();
        setAvailableAgents(agents.map((agent: any) => agent.name));
      } catch (error) {
        console.error("Error obteniendo agentes disponibles:", error);
        // Por defecto, usar estos agentes que sabemos que existen
        setAvailableAgents(["project_architect", "frontend_designer", "backend_developer"]);
      }
    };

    fetchAvailableAgents();
  }, []);

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
      if (e.key === 'Escape' && !isSubmitting && !isGeneratingFiles) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isSubmitting, isGeneratingFiles, onClose]);

  // Función para generar archivos utilizando el asistente GPT
  const generateFilesWithGPT = async () => {
    if (!projectName.trim() || !template) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para el proyecto y selecciona una plantilla",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGeneratingFiles(true);
      setGeneratedFiles([{ name: '', content: '', extension: '', selected: false }]); // Clear generated files

      toast({
        title: "Generando archivos",
        description: "El asistente está generando los archivos para tu proyecto...",
        duration: 5000
      });

      // Construcción del prompt específico según el tipo de proyecto
      let prompt = `Genera los archivos iniciales para un proyecto de ${getTemplateDisplayName(template)} llamado "${projectName}". 
      La descripción del proyecto es: "${description || 'Sin descripción'}". 
      Las características seleccionadas son: ${selectedFeatures.join(", ") || 'ninguna'}.`;

      // Añadir instrucciones específicas según el tipo de proyecto
      if (template === "node") {
        prompt += `
        Necesito los siguientes archivos de configuración importantes:
        1. Un package.json completo con las dependencias necesarias.
        2. Un servidor principal (index.js o app.js).
        3. Un archivo README.md que explique la estructura y cómo ejecutar el proyecto.
        4. Un archivo .gitignore apropiado para Node.js.
        5. Archivos de configuración adicionales como .env.example si es necesario.`;
      } else if (template === "python") {
        prompt += `
        Necesito los siguientes archivos de configuración importantes:
        1. Un archivo app.py o main.py principal.
        2. Un requirements.txt con las dependencias necesarias.
        3. Un archivo README.md que explique la estructura y cómo ejecutar el proyecto.
        4. Un archivo .gitignore apropiado para Python.
        5. Archivos de configuración adicionales como .env.example si es necesario.`;
      } else if (template === "react" || template === "vue") {
        prompt += `
        Necesito los siguientes archivos de configuración importantes:
        1. Un package.json completo con las dependencias necesarias.
        2. Archivos de entrada principales (main.js, App.vue/App.jsx, etc.).
        3. Un archivo README.md que explique la estructura y cómo ejecutar el proyecto.
        4. Un archivo .gitignore apropiado para ${template === "react" ? "React" : "Vue.js"}.
        5. Archivos de configuración como vite.config.js o similar si es apropiado.`;
      } else if (template === "html-css-js") {
        prompt += `
        Necesito los siguientes archivos esenciales:
        1. Un index.html bien estructurado.
        2. Archivos CSS para estilos.
        3. Un script JavaScript principal.
        4. Un archivo README.md que explique el proyecto.`;
      }

      prompt += `
      Genera archivos completos y funcionales siguiendo las mejores prácticas actuales del framework o lenguaje seleccionado. Asegúrate de que los archivos estén bien estructurados y comentados para facilitar su comprensión.`;

      // Función auxiliar para obtener el nombre descriptivo de la plantilla
      function getTemplateDisplayName(templateId: string): string {
        const templateMap: Record<string, string> = {
          "html-css-js": "HTML/CSS/JS básico",
          "react": "React",
          "vue": "Vue.js",
          "node": "Node.js con Express",
          "python": "Python con Flask"
        };
        return templateMap[templateId] || templateId;
      }

      // Seleccionar los agentes adecuados según la plantilla
      let selectedAgents = [];
      if (availableAgents.includes("project_architect")) {
        selectedAgents.push("project_architect");
      }

      if (template === "html-css-js" && availableAgents.includes("frontend_designer")) {
        selectedAgents.push("frontend_designer");
      } else if ((template === "react" || template === "vue") && availableAgents.includes("frontend_designer")) {
        selectedAgents.push("frontend_designer");
      } else if ((template === "node" || template === "python") && availableAgents.includes("backend_developer")) {
        selectedAgents.push("backend_developer");
      }

      // Si no hay agentes disponibles, no enviar el parámetro
      const agentsParam = selectedAgents.length > 0 ? { agents: selectedAgents } : {};

      console.log("Usando agentes:", selectedAgents);

      // Llamada a la API para generar los archivos
      const response = await apiRequest("POST", "/api/generate-code", {
        prompt: prompt,
        language: template,
        ...agentsParam
      });

      if (!response.ok) {
        // Intentar obtener mensaje de error si existe
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error al generar los archivos");
        } catch (parseError) {
          // Si no puede parsear la respuesta como JSON
          const text = await response.text();
          console.error("Respuesta no válida:", text.substring(0, 150) + "...");
          throw new Error("Error al generar los archivos. La respuesta no es válida.");
        }
      }

      // Procesar respuesta exitosa
      const data = await response.json();

      // Procesar y enviar los archivos generados al panel de archivos generados
      if (data.files && data.files.length > 0) {
        // Procesar los archivos generados
        const newGeneratedFiles = data.files.map(file => {
          // Detectar si es un archivo de configuración especial
          const isConfigFile = 
            file.name === 'package.json' || 
            file.name === 'README.md' || 
            file.name === '.gitignore' || 
            file.name === 'requirements.txt' ||
            file.name === '.env.example' ||
            file.name === 'vite.config.js' ||
            file.name === 'tsconfig.json';

          // Determinar si se debe preseleccionar el archivo (para los archivos de configuración)
          const shouldPreselect = isConfigFile;

          return {
            name: file.name.replace(/\.[^/.]+$/, ""), // Nombre sin extensión
            content: file.content,
            extension: `.${file.language || getExtensionFromType(file.type)}`,
            selected: shouldPreselect
          };
        });

        setGeneratedFiles(newGeneratedFiles);
        setShowGeneratedFiles(true);

        toast({
          title: "Archivos generados",
          description: `Se han generado ${data.files.length} archivos para tu proyecto`,
          duration: 5000
        });
        sounds.play('success', 0.4);

        // Enviar archivos de configuración importantes automáticamente al panel de archivos generados
        setTimeout(() => {
          newGeneratedFiles.forEach(file => {
            if (file.selected) {
              const fileEvent = new CustomEvent('add-generated-file', {
                detail: {
                  file: {
                    name: file.name,
                    content: file.content,
                    extension: file.extension
                  }
                }
              });
              window.dispatchEvent(fileEvent);
              console.log(`Archivo de configuración enviado automáticamente: ${file.name}${file.extension}`);
            }
          });

          // Refrescar el panel de archivos generados
          const refreshEvent = new CustomEvent('refresh-generated-files');
          window.dispatchEvent(refreshEvent);
        }, 1000);
      } else {
        throw new Error("No se generaron archivos");
      }
    } catch (error) {
      console.error("Error generando archivos con GPT:", error);

      // Intentar extraer mensaje de error más específico
      let errorMessage = "No se pudieron generar los archivos. Inténtalo de nuevo.";

      if (error instanceof Error) {
        if (error.message.includes("architect")) {
          errorMessage = "Error con los agentes de generación. Usando configuración alternativa.";
          // Intentar nuevamente sin especificar agentes
          try {
            toast({
              title: "Reintentando",
              description: "Generando archivos con configuración alternativa...",
              duration: 3000
            });

            const fallbackResponse = await apiRequest("POST", "/api/generate-code", {
              prompt: prompt,
              language: template
            });

            if (!fallbackResponse.ok) {
              throw new Error("Error en la generación alternativa");
            }

            const fallbackData = await fallbackResponse.json();

            if (fallbackData.files && fallbackData.files.length > 0) {
              const newGeneratedFiles = fallbackData.files.map((file: any) => ({
                name: file.name.replace(/\.[^/.]+$/, ""), // Nombre sin extensión
                content: file.content,
                extension: `.${file.language || getExtensionFromType(file.type)}`,
                selected: false
              }));
              setGeneratedFiles(newGeneratedFiles);
              setShowGeneratedFiles(true);

              toast({
                title: "Archivos generados",
                description: `Se han generado ${fallbackData.files.length} archivos para tu proyecto`,
                duration: 5000
              });
              sounds.play('success', 0.4);
              setIsGeneratingFiles(false);
              return;
            }
          } catch (fallbackError) {
            console.error("Error en reintento de generación:", fallbackError);
            errorMessage = "No se pudieron generar los archivos. Por favor, inténtalo de nuevo más tarde.";
          }
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
      sounds.play('error', 0.3);
    } finally {
      setIsGeneratingFiles(false);
    }
  };

  // Función auxiliar para obtener la extensión desde el tipo
  const getExtensionFromType = (type: string) => {
    switch (type) {
      case 'javascript':
        return 'js';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'typescript':
        return 'ts';
      case 'python':
        return 'py';
      case 'json':
        return 'json';
      default:
        return type;
    }
  };

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

      // Crear archivos iniciales basados en la plantilla
      if (template === "html-css-js") {
        // Contenido para HTML básico
        const htmlContent = `<!DOCTYPE html>
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
</html>`;

        // Contenido CSS
        const cssContent = `/* Estilos para ${projectName} */
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

${selectedFeatures.includes('responsive') ? `/* Diseño responsive */
@media (max-width: 768px) {
  #app {
    padding: 15px;
  }

  h1 {
    font-size: 1.5rem;
  }
}` : ''}

${selectedFeatures.includes('dark-mode') ? `/* Modo oscuro */
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
}` : ''}`;

        // Contenido JS
        const jsContent = `// Código JavaScript para ${projectName}
document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplicación iniciada');

  ${selectedFeatures.includes('responsive') ? `
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    console.log('Versión móvil cargada');
  }` : ''}

  ${selectedFeatures.includes('animations') ? `
  const title = document.querySelector('h1');
  title.style.opacity = '0';
  title.style.transition = 'opacity 0.5s ease-in-out';

  requestAnimationFrame(() => {
    title.style.opacity = '1';
  });` : ''}
});`;

        // Contenido README
        const readmeContent = `# ${projectName}

${description || "Una aplicación web simple usando HTML, CSS y JavaScript."}

## Características

${selectedFeatures.map(feature => `- ${featureLabels[feature]}`).join('\n')}

## Cómo usar

1. Abre el archivo \`index.html\` en tu navegador
2. Para desarrollo, puedes usar la extensión Live Server en VSCode o similar
`;

        // Contenido .gitignore
        const gitignoreContent = `# Archivos del sistema
.DS_Store
Thumbs.db

# Dependencias
node_modules/

# Archivos de entorno
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Archivos de log
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Directorios de compilación
dist/
build/

# IDE y editores
.idea/
.vscode/
*.swp
*.swo
`;

        // Crear los archivos
        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "index.html",
          content: htmlContent,
          type: "html"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "styles.css",
          content: cssContent,
          type: "css"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "app.js",
          content: jsContent,
          type: "javascript"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "README.md",
          content: readmeContent,
          type: "markdown"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: ".gitignore",
          content: gitignoreContent,
          type: "text"
        });

        // Enviar estos archivos al panel de archivos generados
        sendFileToExplorer("index", htmlContent, ".html", 0);
        sendFileToExplorer("styles", cssContent, ".css", 500);
        sendFileToExplorer("app", jsContent, ".js", 1000);
        sendFileToExplorer("README", readmeContent, ".md", 1500);
        sendFileToExplorer(".gitignore", gitignoreContent, "", 2000);
      } else if (template === "react" || template === "vue") {
        // Crear archivos comunes para React/Vue
        // Contenido README para React/Vue
        const readmeContent = `# ${projectName}

${description || `Una aplicación ${template === "react" ? "React" : "Vue.js"}.`}

## Características

${selectedFeatures.map(feature => `- ${featureLabels[feature]}`).join('\n')}

## Instalación

\`\`\`bash
npm install
\`\`\`

## Desarrollo

\`\`\`bash
npm run dev
\`\`\`

## Construcción para producción

\`\`\`bash
npm run build
\`\`\`
`;

        // Contenido .gitignore
        const gitignoreContent = `# Dependencias
/node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Producción
/dist
/build

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Editor
.vscode/*
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
`;

        // Contenido package.json específico para cada plantilla
        let packageJsonContent = "";

        if (template === "react") {
          packageJsonContent = `{
  "name": "${projectName.toLowerCase().replace(/\s+/g, '-')}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"${selectedFeatures.includes('routing') ? ',\n    "react-router-dom": "^6.10.0"' : ''}${selectedFeatures.includes('state-management') ? ',\n    "zustand": "^4.3.7"' : ''}${selectedFeatures.includes('api-integration') ? ',\n    "axios": "^1.3.5"' : ''}
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^3.1.0",
    "typescript": "^5.0.2",
    "vite": "^4.2.1"${selectedFeatures.includes('dark-mode') ? ',\n    "autoprefixer": "^10.4.14",\n    "postcss": "^8.4.21",\n    "tailwindcss": "^3.3.1"' : ''}
  }
}`;

          // Crear vite.config.js para React
          const viteConfigContent = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5001
  }
})`;

          await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
            name: "vite.config.js",
            content: viteConfigContent,
            type: "javascript"
          });

          sendFileToExplorer("vite.config", viteConfigContent, ".js", 3000);
        } else if (template === "vue") {
          packageJsonContent = `{
  "name": "${projectName.toLowerCase().replace(/\s+/g, '-')}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.2.47"${selectedFeatures.includes('routing') ? ',\n    "vue-router": "^4.1.6"' : ''}${selectedFeatures.includes('state-management') ? ',\n    "pinia": "^2.0.34"' : ''}${selectedFeatures.includes('api-integration') ? ',\n    "axios": "^1.3.5"' : ''}
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.1.0",
    "typescript": "^5.0.2",
    "vite": "^4.2.1",
    "vue-tsc": "^1.2.0"${selectedFeatures.includes('dark-mode') ? ',\n    "autoprefixer": "^10.4.14",\n    "postcss": "^8.4.21",\n    "tailwindcss": "^3.3.1"' : ''}
  }
}`;

          // Crear vite.config.js para Vue
          const viteConfigContent = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5001
  }
})`;

          await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
            name: "vite.config.js",
            content: viteConfigContent,
            type: "javascript"
          });

          sendFileToExplorer("vite.config", viteConfigContent, ".js", 3000);
        }

        // Crear archivos comunes para ambos frameworks
        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "package.json",
          content: packageJsonContent,
          type: "json"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "README.md",
          content: readmeContent,
          type: "markdown"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: ".gitignore",
          content: gitignoreContent,
          type: "text"
        });

        // Enviar estos archivos al panel de archivos generados
        sendFileToExplorer("package", packageJsonContent, ".json", 2500);
        sendFileToExplorer("README", readmeContent, ".md", 1500);
        sendFileToExplorer(".gitignore", gitignoreContent, "", 2000);

      } else if (template === "node") {
        // Contenido para package.json Node.js
        const packageJsonContent = `{
  "name": "${projectName.toLowerCase().replace(/\s+/g, '-')}",
  "version": "1.0.0",
  "description": "${description || 'Aplicación Node.js con Express'}",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2"${selectedFeatures.includes('database') ? ',\n    "mongoose": "^7.0.3"' : ''}${selectedFeatures.includes('authentication') ? ',\n    "jsonwebtoken": "^9.0.0",\n    "bcrypt": "^5.1.0"' : ''}
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}`;

        // Contenido README para Node.js
        const readmeContent = `# ${projectName}

${description || "Una aplicación de servidor Node.js con Express."}

## Características

${selectedFeatures.map(feature => `- ${featureLabels[feature]}`).join('\n')}

## Instalación

\`\`\`bash
npm install
\`\`\`

## Desarrollo

\`\`\`bash
npm run dev
\`\`\`

## Producción

\`\`\`bash
npm start
\`\`\`

${selectedFeatures.includes('database') ? '## Base de datos\n\nEsta aplicación utiliza MongoDB. Asegúrate de tener MongoDB instalado o configura la variable de entorno `MONGODB_URI` para conectarte a una instancia remota.' : ''}
`;

        // Contenido .gitignore
        const gitignoreContent = `# Dependencias
/node_modules

# Logs
logs
*.log
npm-debug.log*

# Directorio de compilación
/dist
/build

# Archivos de entorno
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Archivos del sistema
.DS_Store
Thumbs.db

# Directorio de cobertura
/coverage

# Editor
.idea/
.vscode/
*.swp
*.swo
`;

        // Contenido para .env.example
        const envExampleContent = `PORT=5001
NODE_ENV=development
${selectedFeatures.includes('database') ? 'MONGODB_URI=mongodb://localhost:27017/' + projectName.toLowerCase().replace(/\s+/g, '_') : ''}
${selectedFeatures.includes('authentication') ? 'JWT_SECRET=your_jwt_secret_key\nTOKEN_EXPIRY=1h' : ''}
`;

        // Crear archivos
        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "package.json",
          content: packageJsonContent,
          type: "json"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "README.md",
          content: readmeContent,
          type: "markdown"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: ".gitignore",
          content: gitignoreContent,
          type: "text"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: ".env.example",
          content: envExampleContent,
          type: "text"
        });

        // Enviar estos archivos al panel de archivos generados
        sendFileToExplorer("package", packageJsonContent, ".json", 1000);
        sendFileToExplorer("README", readmeContent, ".md", 1500);
        sendFileToExplorer(".gitignore", gitignoreContent, "", 2000);
        sendFileToExplorer(".env.example", envExampleContent, "", 2500);

      } else if (template === "python") {
        // Contenido para main.py Python/Flask
        const mainPyContent = `from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/')
def home():
    return jsonify({
        'message': '¡Bienvenido a ${projectName}!',
        'description': '${description || "Una aplicación Flask"}'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
`;

        // Contenido para requirements.txt
        const requirementsTxtContent = `flask==2.2.3
${selectedFeatures.includes('database') ? 'flask-sqlalchemy==3.0.3\nflask-migrate==4.0.4' : ''}
${selectedFeatures.includes('authentication') ? 'flask-jwt-extended==4.4.4' : ''}
gunicorn==20.1.0
`;

        // Contenido README para Python
        const readmeContent = `# ${projectName}

${description || "Una aplicación Python con Flask."}

## Características

${selectedFeatures.map(feature => `- ${featureLabels[feature]}`).join('\n')}

## Instalación

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Desarrollo

\`\`\`bash
python app.py
\`\`\`

## Producción

\`\`\`bash
gunicorn app:app
\`\`\`

${selectedFeatures.includes('database') ? '## Base de datos\n\nEsta aplicación utiliza SQLAlchemy. Configura la variable de entorno `DATABASE_URL` para conectarte a tu base de datos.' : ''}
`;

        // Contenido .gitignore
        const gitignoreContent = `# Byte-compiled / optimized / DLL files
__pycache__/
*.py[cod]
*$py.class

# Entornos virtuales
venv/
env/
ENV/

# Distribución / packaging
dist/
build/
*.egg-info/

# Archivos de entorno
.env
.env.local
.flaskenv

# Logs
*.log

# Archivos del sistema
.DS_Store
Thumbs.db

# Editor
.idea/
.vscode/
*.swp
*.swo

# Tests
.coverage
htmlcov/
.pytest_cache/
`;

        // Crear archivos
        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "app.py",
          content: mainPyContent,
          type: "python"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "requirements.txt",
          content: requirementsTxtContent,
          type: "text"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "README.md",
          content: readmeContent,
          type: "markdown"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: ".gitignore",
          content: gitignoreContent,
          type: "text"
        });

        // Enviar estos archivos al panel de archivos generados
        sendFileToExplorer("app", mainPyContent, ".py", 1000);
        sendFileToExplorer("requirements", requirementsTxtContent, ".txt", 1500);
        sendFileToExplorer("README", readmeContent, ".md", 2000);
        sendFileToExplorer(".gitignore", gitignoreContent, "", 2500);
      }
      // Invalidar caché de proyectos y actualizar los archivos en el explorador
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });

      // Crear una función para enviar archivos generados al explorador
      const sendFileToExplorer = (name, content, extension, delay = 0) => {
        setTimeout(() => {
          const fileEvent = new CustomEvent('add-generated-file', {
            detail: {
              file: {
                name: name,
                content: content,
                extension: extension
              }
            }
          });
          window.dispatchEvent(fileEvent);
          console.log(`Archivo generado enviado al explorador: ${name}${extension}`);
        }, delay);
      };

      // Enviar archivos para el template HTML-CSS-JS
      if (template === "html-css-js") {
        // HTML file
        const htmlContent = `<!DOCTYPE html>
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
</html>`;
        sendFileToExplorer("index", htmlContent, ".html", 0);

        // CSS file
        const cssContent = `/* Estilos para ${projectName} */
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

${selectedFeatures.includes('responsive') ? `/* Diseño responsive */
@media (max-width: 768px) {
  #app {
    padding: 15px;
  }

  h1 {
    font-size: 1.5rem;
  }
}` : ''}

${selectedFeatures.includes('dark-mode') ? `/* Modo oscuro */
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
}` : ''}`;
        sendFileToExplorer("styles", cssContent, ".css", 1000);

        // JS file
        const jsContent = `// Código JavaScript para ${projectName}
document.addEventListener('DOMContentLoaded', () => {
  console.log('Aplicación iniciada');

  ${selectedFeatures.includes('responsive') ? `
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    console.log('Versión móvil cargada');
  }` : ''}

  ${selectedFeatures.includes('animations') ? `
  const title = document.querySelector('h1');
  title.style.opacity = '0';
  title.style.transition = 'opacity 0.5s ease-in-out';

  requestAnimationFrame(() => {
    title.style.opacity = '1';
  });` : ''}
});`;
        sendFileToExplorer("app", jsContent, ".js", 2000);
      }

      // Enviar archivos para el template React
      else if (template === "react") {
        // index.html file
        const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.tsx"></script>
</body>
</html>`;
        sendFileToExplorer("index", htmlContent, ".html", 0);

        // index.tsx file
        const indexContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
        sendFileToExplorer("src/index", indexContent, ".tsx", 500);

        // App.tsx file
        const appContent = `import React, { useState } from 'react';
import './App.css';
${selectedFeatures.includes('routing') ? "import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';" : ""}

function App() {
  ${selectedFeatures.includes('state-management') ? "const [count, setCount] = useState(0);" : ""}

  return (
    ${selectedFeatures.includes('routing') ? 
     `<Router>
      <div className="app">
        <header>
          <h1>${projectName}</h1>
          <nav>
            <Link to="/">Inicio</Link>
            <Link to="/about">Acerca de</Link>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={
              <div>
                <h2>Página de inicio</h2>
                <p>${description || 'Bienvenido a mi aplicación React'}</p>
                ${selectedFeatures.includes('state-management') ? 
                `<div className="counter">
                  <p>Contador: {count}</p>
                  <button onClick={() => setCount(count + 1)}>Incrementar</button>
                </div>` : ''}
              </div>
            } />
            <Route path="/about" element={
              <div>
                <h2>Acerca de</h2>
                <p>Esta es una aplicación React creada con ${projectName}.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>` : 
    `<div className="app">
      <header>
        <h1>${projectName}</h1>
      </header>
      <main>
        <p>${description || 'Bienvenido a mi aplicación React'}</p>
        ${selectedFeatures.includes('state-management') ? 
        `<div className="counter">
          <p>Contador: {count}</p>
          <button onClick={() => setCount(count + 1)}>Incrementar</button>
        </div>` : ''}
      </main>
    </div>`}
  );
}

export default App;`;
        sendFileToExplorer("src/App", appContent, ".tsx", 1000);

        // App.css file
        const appCssContent = `.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

header {
  margin-bottom: 20px;
}

h1 {
  color: #333;
}

${selectedFeatures.includes('routing') ? 
`nav {
  margin-top: 10px;
}

nav a {
  margin-right: 15px;
  color: #0066cc;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}` : ''}

.counter {
  margin-top: 20px;
}

button {
  background-color: #0066cc;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #0055aa;
}`;
        sendFileToExplorer("src/App", appCssContent, ".css", 1500);

        // index.css file
        const indexCssContent = `body {
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

* {
  box-sizing: border-box;
}`;
        sendFileToExplorer("src/index", indexCssContent, ".css", 2000);
      }

      // Enviar archivos para el template Vue
      else if (template === "vue") {
        // index.html file
        const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`;
        sendFileToExplorer("index", htmlContent, ".html", 0);

        // main.js file
        const mainJsContent = `import { createApp } from 'vue'
import App from './App.vue'
${selectedFeatures.includes('routing') ? "import router from './router'" : ""}
${selectedFeatures.includes('state-management') ? "import store from './store'" : ""}
import './assets/main.css'

const app = createApp(App)
${selectedFeatures.includes('routing') ? "app.use(router)" : ""}
${selectedFeatures.includes('state-management') ? "app.use(store)" : ""}
app.mount('#app')`;
        sendFileToExplorer("src/main", mainJsContent, ".js", 500);

        // App.vue file
        const appVueContent = `<template>
  <div class="app">
    <header>
      <h1>${projectName}</h1>
      ${selectedFeatures.includes('routing') ? 
      `<nav>
        <router-link to="/">Inicio</router-link> | 
        <router-link to="/about">Acerca de</router-link>
      </nav>` : ''}
    </header>

    ${selectedFeatures.includes('routing') ? `<router-view/>` : 
    `<main>
      <p>${description || 'Bienvenido a mi aplicación Vue'}</p>
      ${selectedFeatures.includes('state-management') ? 
      `<div class="counter">
        <p>Contador: {{ count }}</p>
        <button @click="increment">Incrementar</button>
      </div>` : ''}
    </main>`}
  </div>
</template>

<script>
export default {
  name: 'App',
  ${selectedFeatures.includes('state-management') && !selectedFeatures.includes('routing') ? 
  `data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }` : ''}
}
</script>

<style scoped>
${selectedFeatures.includes('routing') ? 
`nav {
  margin: 20px 0;
}

a {
  color: #42b983;
  text-decoration: none;
  margin: 0 10px;
}` : ''}

.counter {
  margin-top: 20px;
}

button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
</template>`;
        sendFileToExplorer("src/App", appVueContent, ".vue", 1000);

        // Si incluye routing, crear los componentes de página
        if (selectedFeatures.includes('routing')) {
          // Home.vue
          const homeVueContent = `<template>
  <div>
    <h2>Página de inicio</h2>
    <p>${description || 'Bienvenido a mi aplicación Vue'}</p>
    ${selectedFeatures.includes('state-management') ? 
    `<div class="counter">
      <p>Contador: {{ $store.state.count }}</p>
      <button @click="$store.commit('increment')">Incrementar</button>
    </div>` : ''}
  </div>
</template>

<script>
export default {
  name: 'HomePage'
}
</script>`;
          sendFileToExplorer("src/components/Home", homeVueContent, ".vue", 1500);

          // About.vue
          const aboutVueContent = `<template>
  <div>
    <h2>Acerca de</h2>
    <p>Esta es una aplicación Vue creada con ${projectName}.</p>
  </div>
</template>

<script>
export default {
  name: 'AboutPage'
}
</script>`;
          sendFileToExplorer("src/components/About", aboutVueContent, ".vue", 2000);

          // router.js
          const routerJsContent = `import { createRouter, createWebHistory } from 'vue-router'
import Home from './components/Home.vue'
import About from './components/About.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    component: About
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router`;
          sendFileToExplorer("src/router", routerJsContent, ".js", 2500);
        }

        // Si incluye state management, crear store
        if (selectedFeatures.includes('state-management')) {
          const storeJsContent = `import { createStore } from 'vuex'

export default createStore({
  state() {
    return {
      count: 0
    }
  },
  mutations: {
    increment(state) {
      state.count++
    }
  },
  actions: {
    incrementAsync({ commit }) {
      setTimeout(() => {
        commit('increment')
      }, 1000)
    }
  }
})`;
          sendFileToExplorer("src/store", storeJsContent, ".js", 3000);
        }

        // CSS principal
        const mainCssContent = `body {
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

* {
  box-sizing: border-box;
}`;
        sendFileToExplorer("src/assets/main", mainCssContent, ".css", 3500);
      }

      // Enviar archivos para el template Node.js
      else if (template === "node") {
        // index.js file
        const indexJsContent = `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
${selectedFeatures.includes('database') ? "const mongoose = require('mongoose');" : ""}
${selectedFeatures.includes('authentication') ? "const jwt = require('jsonwebtoken');" : ""}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
${selectedFeatures.includes('authentication') ? 
`
// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Acceso denegado' });

  jwt.verify(token, process.env.TOKEN_SECRET || 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};` : ''}

${selectedFeatures.includes('database') ? 
`
// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/${projectName.toLowerCase().replace(/\s+/g, '_')}')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));` : ''}

// Rutas
${selectedFeatures.includes('api-endpoints') ? 
`app.use('/api', require('./src/routes/api'));` : 
`app.get('/', (req, res) => {
  res.send('¡Bienvenido a ${projectName}!');
});`}

// Iniciar servidor
app.listen(port, () => {
  console.log(\`Servidor corriendo en http://localhost:\${port}\`);
});`;
        sendFileToExplorer("index", indexJsContent, ".js", 0);

        // Si incluye API endpoints, crear rutas
        if (selectedFeatures.includes('api-endpoints')) {
          const apiRoutesContent = `const express = require('express');
const router = express.Router();
const ${selectedFeatures.includes('authentication') ? 'authMiddleware = require(\'../middlewares/auth\'),' : ''} ${selectedFeatures.includes('database') ? 'itemController = require(\'../controllers/item\')' : 'demoController = require(\'../controllers/demo\')'};

// Rutas públicas
router.get('/', (req, res) => {
  res.json({ message: 'API de ${projectName}' });
});

${selectedFeatures.includes('authentication') ? 
`// Rutas de autenticación
router.post('/auth/register', (req, res) => {
  // Implementar registro
  res.json({ message: 'Usuario registrado' });
});

router.post('/auth/login', (req, res) => {
  // Implementar login
  const token = jwt.sign({ id: 1 }, process.env.TOKEN_SECRET || 'secret_key', { expiresIn: '1h' });
  res.json({ token });
});` : ''}

${selectedFeatures.includes('database') ? 
`// Rutas de items
router.get('/items', ${selectedFeatures.includes('authentication') ? 'authMiddleware, ' : ''}itemController.getAll);
router.get('/items/:id', ${selectedFeatures.includes('authentication') ? 'authMiddleware, ' : ''}itemController.getById);
router.post('/items', ${selectedFeatures.includes('authentication') ? 'authMiddleware, ' : ''}itemController.create);
router.put('/items/:id', ${selectedFeatures.includes('authentication') ? 'authMiddleware, ' : ''}itemController.update);
router.delete('/items/:id', ${selectedFeatures.includes('authentication') ? 'authMiddleware, ' : ''}itemController.delete);` : 
`// Rutas de demo
router.get('/demo', demoController.getInfo);`}

module.exports = router;`;
          sendFileToExplorer("src/routes/api", apiRoutesContent, ".js", 500);

          // Controlador
          if (selectedFeatures.includes('database')) {
            const itemControllerContent = `const Item = require('../models/item');

// Controlador de items
exports.getAll = async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item no encontrado' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const item = new Item(req.body);
    const savedItem = await item.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Item no encontrado' });
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item no encontrado' });
    res.json({ message: 'Item eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};`;
            sendFileToExplorer("src/controllers/item", itemControllerContent, ".js", 1000);

            // Modelo
            const itemModelContent = `const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Item', itemSchema);`;
            sendFileToExplorer("src/models/item", itemModelContent, ".js", 1500);
          } else {
            const demoControllerContent = `// Controlador de demo
exports.getInfo = (req, res) => {
  res.json({
    appName: '${projectName}',
    description: '${description || "Una API Node.js"}',
    version: '1.0.0',
    endpoints: [
      { method: 'GET', path: '/api', description: 'Información de la API' },
      { method: 'GET', path: '/api/demo', description: 'Información de demostración' }
    ]
  });
};`;
            sendFileToExplorer("src/controllers/demo", demoControllerContent, ".js", 1000);
          }

          // Middleware de autenticación
          if (selectedFeatures.includes('authentication')) {
            const authMiddlewareContent = `const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Acceso denegado' });

  jwt.verify(token, process.env.TOKEN_SECRET || 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};`;
            sendFileToExplorer("src/middlewares/auth", authMiddlewareContent, ".js", 2000);
          }
        }

        // package.json
        const packageJsonContent = `{
  "name": "${projectName.toLowerCase().replace(/\s+/g, '-')}",
  "version": "1.0.0",
  "description": "${description || 'Aplicación Node.js'}",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "keywords": [],
  "author":"",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2"${selectedFeatures.includes('database') ? ',\n    "mongoose": "^7.0.0"' : ''}${selectedFeatures.includes('authentication') ? ',\n    "jsonwebtoken": "^9.0.0",\n    "bcrypt": "^5.1.0"' : ''}
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}`;
        sendFileToExplorer("package", packageJsonContent, ".json", 2500);
      }

      // Enviar archivos para el template Python
      else if (template === "python") {
        // app.py file
        const appPyContent = `from flask import Flask, jsonify, request
${selectedFeatures.includes('database') ? "from flask_sqlalchemy import SQLAlchemy\nfrom flask_migrate import Migrate" : ""}
${selectedFeatures.includes('authentication') ? "from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity" : ""}
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_key')
${selectedFeatures.includes('database') ? "app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')\napp.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False\n\ndb = SQLAlchemy(app)\nMigrate(app, db)" : ""}
${selectedFeatures.includes('authentication') ? "app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt_dev_key')\njwt = JWTManager(app)" : ""}

${selectedFeatures.includes('database') ? `
# Modelos
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, default=0.0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.price
        }
` : ""}

${selectedFeatures.includes('authentication') ? `
# Modelo de usuario
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username
        }
` : ""}

@app.route('/')
def home():
    return jsonify({
        'message': '¡Bienvenido a ${projectName}!',
        'description': '${description || "Una aplicación Flask"}'
    })

${selectedFeatures.includes('api-endpoints') ? `
@app.route('/api/info')
def info():
    return jsonify({
        'app_name': '${projectName}',
        'version': '1.0.0',
        'endpoints': [
            {'method': 'GET', 'path': '/', 'description': 'Página principal'},
            {'method': 'GET', 'path': '/api/info', 'description': 'Información de la API'}
        ]
    })
` : ""}

${selectedFeatures.includes('authentication') ? `
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username y password son requeridos'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'El usuario ya existe'}), 400

    user = User(username=username, password_hash=password)  # En un caso real, hash la contraseña
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Usuario registrado correctamente'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username y password son requeridos'}), 400

    user = User.query.filter_by(username=username).first()
    if not user or user.password_hash != password:  # En un caso real, verificar hash
        return jsonify({'error': 'Credenciales inválidas'}), 401

    access_token = create_access_token(identity=user.id)
    return jsonify({'access_token': access_token}), 200
` : ""}

${selectedFeatures.includes('database') && selectedFeatures.includes('api-endpoints') ? `
@app.route('/api/items', methods=['GET'])
${selectedFeatures.includes('authentication') ? "@jwt_required()" : ""}
def get_items():
    items = Item.query.all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/items/<int:item_id>', methods=['GET'])
${selectedFeatures.includes('authentication') ? "@jwt_required()" : ""}
def get_item(item_id):
    item = Item.query.get_or_404(item_id)
    return jsonify(item.to_dict())

@app.route('/api/items', methods=['POST'])
${selectedFeatures.includes('authentication') ? "@jwt_required()" : ""}
def create_item():
    data = request.get_json()
    item = Item(
        name=data.get('name'),
        description=data.get('description'),
        price=data.get('price', 0.0)
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/items/<int:item_id>', methods=['PUT'])
${selectedFeatures.includes('authentication') ? "@jwt_required()" : ""}
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    data = request.get_json()

    item.name = data.get('name', item.name)
    item.description = data.get('description', item.description)
    item.price = data.get('price', item.price)

    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
${selectedFeatures.includes('authentication') ? "@jwt_required()" : ""}
def delete_item(item_id):
    item = Item.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item eliminado correctamente'}), 200
` : ""}

if __name__ == '__main__':
    ${selectedFeatures.includes('database') ? "with app.app_context():\n        db.create_all()" : ""}
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))`;
        sendFileToExplorer("app", appPyContent, ".py", 0);

        // requirements.txt
        const requirementsTxtContent = `flask==2.3.2
${selectedFeatures.includes('database') ? `flask-sqlalchemy==3.0.5\nflask-migrate==4.0.4${selectedFeatures.includes('authentication') ? "\nflask-jwt-extended==4.5.2" : ""}` : ""}
${selectedFeatures.includes('authentication') && !selectedFeatures.includes('database') ? "flask-jwt-extended==4.5.2" : ""}
gunicorn==20.1.0`;
        sendFileToExplorer("requirements", requirementsTxtContent, ".txt", 1000);
      }

      // Enviar evento general para actualizar explorador de archivos
      setTimeout(() => {
        const refreshEvent = new CustomEvent('refresh-files', {
          detail: { 
            projectId: newProject.id,
            forceRefresh: true
          }
        });
        window.dispatchEvent(refreshEvent);

        console.log("Enviado evento de actualización de archivos");
      }, 4000);

      // Emitir evento para refrescar archivos en el explorador
      const refreshEvent = new CustomEvent('refresh-files', {
        detail: {
          projectId: newProject.id,
          forceRefresh: true
        }
      });
      window.dispatchEvent(refreshEvent);

      toast({
        title: "Proyecto creado",
        description: `${projectName} ha sido creado exitosamente`
      });

      // Navegar a la página del proyecto
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
      onClose();  // Cierra el modal cuando se hace clic fuera de él
    }
  };

  const toggleFileSelection = (index: number) => {
    setGeneratedFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      updatedFiles[index].selected = !updatedFiles[index].selected;
      return updatedFiles;
    });
  };

  const addSelectedFilesToExplorer = () => {
    const selectedFiles = generatedFiles.filter(file => file.selected);
    if (selectedFiles.length > 0) {
      selectedFiles.forEach(file => {
        const fileEvent = new CustomEvent('add-generated-file', {
          detail: {
            file: {
              name: file.name,
              content: file.content,
              extension: file.extension
            }
          }
        });
        window.dispatchEvent(fileEvent);
      });
      setShowGeneratedFiles(false);
      toast({
        title: 'Archivos añadidos',
        description: `${selectedFiles.length} archivo(s) añadido(s) al explorador`
      });
    }
  };

  const getLanguageIcon = (language: string): string => {
    switch (language) {
      case 'html': return 'html5';
      case 'js': return 'javascript';
      case 'css': return 'css3';
      case 'ts': return 'typescript';
      case 'py': return 'python';
      case 'json': return 'json';
      default: return 'file-code'; // Icono por defecto
    }
  };

  const previewFileContent = (file: { name: string; content: string; extension: string }) => {
    // Implementa aquí la lógica para mostrar el contenido del archivo en un diálogo o modal
    const content = file.content;
    alert(`Contenido de ${file.name}${file.extension}:\n\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={handleBackdropClick}>
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full ${isMobile ? 'max-h-[90vh] overflow-y-auto' : ''}`} style={{ maxWidth: isMobile ? '100%' : '500px' }}>
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-medium">Crear nuevo proyecto</h3>
          <button className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" onClick={onClose} disabled={isSubmitting} aria-label="Cerrar">
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectName" className="text-sm font-medium">Nombre del proyecto</Label>
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
              <Label htmlFor="description" className="text-sm font-medium">Descripción (opcional)</Label>
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
              <Label htmlFor="template" className="text-sm font-medium">Plantilla</Label>
              <Select value={template} onValueChange={(value) => { setTemplate(value); setSelectedFeatures([]); }} disabled={isSubmitting}>
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
                            <div className="text-xs text-slate-500 dark:text-slate-400">{tmpl.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Características adicionales</Label>
              <div className="mt-2 space-y-2">
                {getCurrentTemplateFeatures().map(feature => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      id={`feature-${feature}`}
                      checked={selectedFeatures.includes(feature)}
                      onCheckedChange={() => handleFeatureToggle(feature)}
                      disabled={isSubmitting}
                    />
                    <label htmlFor={`feature-${feature}`} className="text-sm text-slate-700 dark:text-slate-300">
                      {featureLabels[feature]}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {template !== "" && (
              <div className="mt-4 space-y-2 border-t pt-3 dark:border-slate-700">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-gpt-assistant"
                    checked={usingGptAssistant}
                    onCheckedChange={(value) => setUsingGptAssistant(!!value)}
                    disabled={isSubmitting || isGeneratingFiles}
                  />
                  <label htmlFor="use-gpt-assistant" className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <i className="ri-robot-line"></i>
                    <span>Usar asistente GPT para generar archivos personalizados</span>
                  </label>
                </div>

                {usingGptAssistant && (
                  <div className="ml-6 border-l-2 pl-3 border-primary/30 dark:border-primary/20">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      El asistente generará archivos adaptados a las características seleccionadas y la descripción del proyecto que has proporcionado.
                    </p>
                    {!showGeneratedFiles ? (
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        className="mt-2 text-xs"
                        onClick={generateFilesWithGPT}
                        disabled={isSubmitting || isGeneratingFiles}
                      >
                        {isGeneratingFiles ? (
                          <>
                            <i className="ri-loader-4-line animate-spin mr-1"></i>
                            Generando archivos...
                          </>
                        ) : "Generar archivos ahora"}
                      </Button>
                    ) : (
                      <div className="mt-3 border rounded-md p-3 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium">Archivos generados</h4>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="text-xs"
                              onClick={addSelectedFilesToExplorer}
                              disabled={isGeneratingFiles || generatedFiles.filter(f => f.selected).length === 0}
                            >
                              <i className="ri-add-line mr-1"></i>
                              Añadir seleccionados
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => setShowGeneratedFiles(false)}
                              disabled={isGeneratingFiles}
                            >
                              <i className="ri-close-line mr-1"></i>
                              Cerrar
                            </Button>
                          </div>
                        </div>

                        {isGeneratingFiles ? (
                          <div className="flex flex-col items-center justify-center py-6">
                            <i className="ri-loader-4-line animate-spin text-3xl text-primary mb-2"></i>
                            <p className="text-sm text-center">Generando archivos para tu proyecto...</p>
                          </div>
                        ) : generatedFiles.length === 0 ? (
                          <p className="text-sm text-center py-4 text-slate-500">No se han generado archivos todavía</p>
                        ) : (
                          <div className="max-h-[300px] overflow-y-auto pr-2">
                            <ul className="space-y-1.5">
                              {generatedFiles.map((file, index) => (
                                <li key={index} className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                                  <Checkbox
                                    id={`file-${index}`}
                                    checked={file.selected}
                                    onCheckedChange={() => toggleFileSelection(index)}
                                  />
                                  <label 
                                    htmlFor={`file-${index}`} 
                                    className="flex items-center flex-1 cursor-pointer text-sm"
                                  >
                                    <i className={`ri-file-code-line text-${getLanguageIcon(file.extension.replace('.', ''))}-500 mr-2`}></i>
                                    <span className="truncate">
                                      {file.name}{file.extension}
                                    </span>
                                  </label>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    title="Ver contenido"
                                    onClick={() => previewFileContent(file)}
                                  >
                                    <i className="ri-eye-line text-blue-500"></i>
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="mt-3 text-xs text-slate-500">
                          {generatedFiles.length > 0 && (
                            <p>
                              {generatedFiles.filter(f => f.selected).length} de {generatedFiles.length} archivos seleccionados
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {projectName && (
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isGeneratingFiles} className="w-full sm:w-auto">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting || isGeneratingFiles} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2"></i>
                    Creando...
                  </>
                ) : "Crear proyecto"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal;