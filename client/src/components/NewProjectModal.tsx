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
      
      toast({
        title: "Generando archivos",
        description: "El asistente está generando los archivos para tu proyecto...",
        duration: 5000
      });
      
      // Construcción del prompt para GPT
      const prompt = `Genera los archivos iniciales para un proyecto de plantilla ${template} llamado "${projectName}". 
      La descripción del proyecto es: "${description || 'Sin descripción'}". 
      Las características seleccionadas son: ${selectedFeatures.join(", ") || 'ninguna'}. 
      Basado en esta información, genera los archivos necesarios para el proyecto siguiendo las mejores prácticas del framework o lenguaje seleccionado.`;
      
      // Llamada a la API para generar los archivos
      try {
        const response = await apiRequest("POST", "/api/generate-code", {
          prompt: prompt,
          language: template,
          agents: ["architect", "coder"] // Utilizamos agentes especializados
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
        data.files.forEach((file, index) => {
          // Enviar cada archivo al panel de archivos generados con un retraso escalonado
          setTimeout(() => {
            const fileEvent = new CustomEvent('add-generated-file', {
              detail: {
                file: {
                  name: file.name.replace(/\.[^/.]+$/, ""), // Nombre sin extensión
                  content: file.content,
                  extension: `.${file.language || getExtensionFromType(file.type)}`
                }
              }
            });
            window.dispatchEvent(fileEvent);
            console.log(`Archivo generado por GPT enviado al explorador: ${file.name}`);
          }, index * 300); // Retraso escalonado para cada archivo
        });
        
        toast({
          title: "Archivos generados",
          description: `Se han generado ${data.files.length} archivos para tu proyecto`,
          duration: 5000
        });
        sounds.play('success', 0.4);
        
        // Refrescar el panel de archivos generados
        setTimeout(() => {
          const refreshEvent = new CustomEvent('refresh-generated-files');
          window.dispatchEvent(refreshEvent);
        }, data.files.length * 300 + 500);
      } else {
        throw new Error("No se generaron archivos");
      }
    } catch (error) {
      console.error("Error generando archivos con GPT:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron generar los archivos. Inténtalo de nuevo.",
        variant: "destructive",
        duration: 5000
      });
      sounds.play('error', 0.3);
    } finally {
      setIsGeneratingFiles(false);
    }
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
}` : ''}`,
          type: "css"
        });

        await apiRequest("POST", `/api/projects/${newProject.id}/files`, {
          name: "app.js",
          content: `// Código JavaScript para ${projectName}
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
});`,
          type: "javascript"
        });
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

<style>
.app {
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
  color: #42b983;
  text-decoration: none;
}

nav a.router-link-active {
  font-weight: bold;
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

button:hover {
  background-color: #3aa876;
}
</style>`;
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