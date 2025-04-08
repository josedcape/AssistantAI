
import { ProjectTemplate, ProjectFeature } from "../shared/schema";

export interface ProjectFile {
  name: string;
  content: string;
  type: string;
}

export interface ProjectAgentResult {
  files: ProjectFile[];
  directories?: string[];
}

// Interfaz para agentes de proyecto especializados
export interface ProjectAgent {
  name: string;
  description: string;
  getFiles(projectName: string, description: string, features: string[]): ProjectAgentResult;
}

// Agente especializado en proyectos HTML/CSS/JS
export const htmlCssJsAgent: ProjectAgent = {
  name: "html_css_js_agent",
  description: "Genera archivos para proyectos HTML/CSS/JS básicos",
  getFiles(projectName: string, description: string, features: string[]): ProjectAgentResult {
    const hasResponsive = features.includes('responsive');
    const hasDarkMode = features.includes('dark-mode');
    const hasAnimations = features.includes('animations');

    // Contenido HTML
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

${hasResponsive ? `/* Diseño responsive */
@media (max-width: 768px) {
  #app {
    padding: 15px;
  }

  h1 {
    font-size: 1.5rem;
  }
}` : ''}

${hasDarkMode ? `/* Modo oscuro */
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

  ${hasResponsive ? `
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    console.log('Versión móvil cargada');
  }` : ''}

  ${hasAnimations ? `
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

${features.map(feature => featureToLabel(feature)).filter(Boolean).join('\n')}

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

    return {
      files: [
        { name: "index.html", content: htmlContent, type: "html" },
        { name: "styles.css", content: cssContent, type: "css" },
        { name: "app.js", content: jsContent, type: "javascript" },
        { name: "README.md", content: readmeContent, type: "markdown" },
        { name: ".gitignore", content: gitignoreContent, type: "text" }
      ]
    };
  }
};

// Agente especializado en proyectos React
export const reactAgent: ProjectAgent = {
  name: "react_agent",
  description: "Genera archivos para proyectos React",
  getFiles(projectName: string, description: string, features: string[]): ProjectAgentResult {
    const hasRouting = features.includes('routing');
    const hasStateManagement = features.includes('state-management');
    const hasApiIntegration = features.includes('api-integration');
    const hasDarkMode = features.includes('dark-mode');

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

    // Contenido package.json
    const packageJsonContent = `{
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
    "react-dom": "^18.2.0"${hasRouting ? ',\n    "react-router-dom": "^6.10.0"' : ''}${hasStateManagement ? ',\n    "zustand": "^4.3.7"' : ''}${hasApiIntegration ? ',\n    "axios": "^1.3.5"' : ''}
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^3.1.0",
    "typescript": "^5.0.2",
    "vite": "^4.2.1"${hasDarkMode ? ',\n    "autoprefixer": "^10.4.14",\n    "postcss": "^8.4.21",\n    "tailwindcss": "^3.3.1"' : ''}
  }
}`;

    // Contenido README
    const readmeContent = `# ${projectName}

${description || `Una aplicación React.`}

## Características

${features.map(feature => featureToLabel(feature)).filter(Boolean).join('\n')}

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

    // Contenido HTML
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

    // Contenido index.tsx
    const indexContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

    // Contenido App.tsx
    const appContent = `import React, { useState } from 'react';
import './App.css';
${hasRouting ? "import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';" : ""}

function App() {
  ${hasStateManagement ? "const [count, setCount] = useState(0);" : ""}

  return (
    ${hasRouting ? 
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
                ${hasStateManagement ? 
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
        ${hasStateManagement ? 
        `<div className="counter">
          <p>Contador: {count}</p>
          <button onClick={() => setCount(count + 1)}>Incrementar</button>
        </div>` : ''}
      </main>
    </div>`}
  );
}

export default App;`;

    // Contenido App.css
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

${hasRouting ? 
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

    // Contenido index.css
    const indexCssContent = `body {
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

* {
  box-sizing: border-box;
}`;

    return {
      files: [
        { name: "vite.config.js", content: viteConfigContent, type: "javascript" },
        { name: "package.json", content: packageJsonContent, type: "json" },
        { name: "README.md", content: readmeContent, type: "markdown" },
        { name: ".gitignore", content: gitignoreContent, type: "text" },
        { name: "index.html", content: htmlContent, type: "html" },
        { name: "src/index.tsx", content: indexContent, type: "typescript" },
        { name: "src/App.tsx", content: appContent, type: "typescript" },
        { name: "src/App.css", content: appCssContent, type: "css" },
        { name: "src/index.css", content: indexCssContent, type: "css" }
      ],
      directories: ["src", "src/components", "public"]
    };
  }
};

// Agente especializado en proyectos Vue
export const vueAgent: ProjectAgent = {
  name: "vue_agent",
  description: "Genera archivos para proyectos Vue.js",
  getFiles(projectName: string, description: string, features: string[]): ProjectAgentResult {
    const hasRouting = features.includes('routing');
    const hasStateManagement = features.includes('state-management');
    const hasApiIntegration = features.includes('api-integration');
    const hasDarkMode = features.includes('dark-mode');

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

    // Contenido package.json
    const packageJsonContent = `{
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
    "vue": "^3.2.47"${hasRouting ? ',\n    "vue-router": "^4.1.6"' : ''}${hasStateManagement ? ',\n    "pinia": "^2.0.34"' : ''}${hasApiIntegration ? ',\n    "axios": "^1.3.5"' : ''}
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.1.0",
    "typescript": "^5.0.2",
    "vite": "^4.2.1",
    "vue-tsc": "^1.2.0"${hasDarkMode ? ',\n    "autoprefixer": "^10.4.14",\n    "postcss": "^8.4.21",\n    "tailwindcss": "^3.3.1"' : ''}
  }
}`;

    // Contenido README
    const readmeContent = `# ${projectName}

${description || `Una aplicación Vue.js.`}

## Características

${features.map(feature => featureToLabel(feature)).filter(Boolean).join('\n')}

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

    // Contenido index.html
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

    // main.js file
    const mainJsContent = `import { createApp } from 'vue'
import App from './App.vue'
${hasRouting ? "import router from './router'" : ""}
${hasStateManagement ? "import { createPinia } from 'pinia'\nconst pinia = createPinia()" : ""}
import './assets/main.css'

const app = createApp(App)
${hasRouting ? "app.use(router)" : ""}
${hasStateManagement ? "app.use(pinia)" : ""}
app.mount('#app')`;

    // App.vue file
    const appVueContent = `<template>
  <div class="app">
    <header>
      <h1>${projectName}</h1>
      ${hasRouting ? 
      `<nav>
        <router-link to="/">Inicio</router-link> | 
        <router-link to="/about">Acerca de</router-link>
      </nav>` : ''}
    </header>

    ${hasRouting ? `<router-view/>` : 
    `<main>
      <p>${description || 'Bienvenido a mi aplicación Vue'}</p>
      ${hasStateManagement ? 
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
  ${hasStateManagement && !hasRouting ? 
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

${hasRouting ? 
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
</style>`;

    // CSS principal
    const mainCssContent = `body {
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

* {
  box-sizing: border-box;
}`;

    // Preparar los archivos necesarios
    const files: ProjectFile[] = [
      { name: "vite.config.js", content: viteConfigContent, type: "javascript" },
      { name: "package.json", content: packageJsonContent, type: "json" },
      { name: "README.md", content: readmeContent, type: "markdown" },
      { name: ".gitignore", content: gitignoreContent, type: "text" },
      { name: "index.html", content: htmlContent, type: "html" },
      { name: "src/main.js", content: mainJsContent, type: "javascript" },
      { name: "src/App.vue", content: appVueContent, type: "vue" },
      { name: "src/assets/main.css", content: mainCssContent, type: "css" }
    ];

    // Si incluye routing, crear los componentes de página
    if (hasRouting) {
      const homeVueContent = `<template>
  <div>
    <h2>Página de inicio</h2>
    <p>${description || 'Bienvenido a mi aplicación Vue'}</p>
    ${hasStateManagement ? 
    `<div class="counter">
      <p>Contador: {{ counter }}</p>
      <button @click="increment">Incrementar</button>
    </div>` : ''}
  </div>
</template>

<script>
${hasStateManagement ? 
`import { defineStore } from 'pinia'

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++
    }
  }
})

export default {
  name: 'HomePage',
  computed: {
    counter() {
      return useCounterStore().count
    }
  },
  methods: {
    increment() {
      useCounterStore().increment()
    }
  }
}` : 
`export default {
  name: 'HomePage'
}`}
</script>`;

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

      files.push({ name: "src/components/Home.vue", content: homeVueContent, type: "vue" });
      files.push({ name: "src/components/About.vue", content: aboutVueContent, type: "vue" });
      files.push({ name: "src/router/index.js", content: routerJsContent, type: "javascript" });
    }

    return {
      files,
      directories: ["src", "src/components", "src/assets", "src/router", "public"]
    };
  }
};

// Agente especializado en proyectos Node.js
export const nodeAgent: ProjectAgent = {
  name: "node_agent",
  description: "Genera archivos para proyectos Node.js con Express",
  getFiles(projectName: string, description: string, features: string[]): ProjectAgentResult {
    const hasDatabase = features.includes('database');
    const hasAuthentication = features.includes('authentication');
    const hasApiEndpoints = features.includes('api-endpoints');

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
    "express": "^4.18.2"${hasDatabase ? ',\n    "mongoose": "^7.0.3"' : ''}${hasAuthentication ? ',\n    "jsonwebtoken": "^9.0.0",\n    "bcrypt": "^5.1.0"' : ''}
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}`;

    // Contenido README para Node.js
    const readmeContent = `# ${projectName}

${description || "Una aplicación de servidor Node.js con Express."}

## Características

${features.map(feature => featureToLabel(feature)).filter(Boolean).join('\n')}

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

${hasDatabase ? '## Base de datos\n\nEsta aplicación utiliza MongoDB. Asegúrate de tener MongoDB instalado o configura la variable de entorno `MONGODB_URI` para conectarte a una instancia remota.' : ''}
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
${hasDatabase ? 'MONGODB_URI=mongodb://localhost:27017/' + projectName.toLowerCase().replace(/\s+/g, '_') : ''}
${hasAuthentication ? 'JWT_SECRET=your_jwt_secret_key\nTOKEN_EXPIRY=1h' : ''}
`;

    // Contenido para index.js (archivo principal)
    const indexJsContent = `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
${hasDatabase ? "const mongoose = require('mongoose');" : ""}
${hasAuthentication ? "const jwt = require('jsonwebtoken');" : ""}

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
${hasAuthentication ? 
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

${hasDatabase ? 
`
// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/${projectName.toLowerCase().replace(/\s+/g, '_')}')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error de conexión a MongoDB:', err));` : ''}

// Rutas
${hasApiEndpoints ? 
`app.use('/api', require('./src/routes/api'));` : 
`app.get('/', (req, res) => {
  res.send('¡Bienvenido a ${projectName}!');
});`}

// Iniciar servidor
app.listen(port, () => {
  console.log(\`Servidor corriendo en http://localhost:\${port}\`);
});`;

    // Preparar los archivos
    const files: ProjectFile[] = [
      { name: "package.json", content: packageJsonContent, type: "json" },
      { name: "README.md", content: readmeContent, type: "markdown" },
      { name: ".gitignore", content: gitignoreContent, type: "text" },
      { name: ".env.example", content: envExampleContent, type: "text" },
      { name: "index.js", content: indexJsContent, type: "javascript" }
    ];

    // Si incluye API endpoints, crear archivos relacionados
    if (hasApiEndpoints) {
      const apiRoutesContent = `const express = require('express');
const router = express.Router();
const ${hasAuthentication ? 'authMiddleware = require(\'../middlewares/auth\'),' : ''} ${hasDatabase ? 'itemController = require(\'../controllers/item\')' : 'demoController = require(\'../controllers/demo\')'};

// Rutas públicas
router.get('/', (req, res) => {
  res.json({ message: 'API de ${projectName}' });
});

${hasAuthentication ? 
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

${hasDatabase ? 
`// Rutas de items
router.get('/items', ${hasAuthentication ? 'authMiddleware, ' : ''}itemController.getAll);
router.get('/items/:id', ${hasAuthentication ? 'authMiddleware, ' : ''}itemController.getById);
router.post('/items', ${hasAuthentication ? 'authMiddleware, ' : ''}itemController.create);
router.put('/items/:id', ${hasAuthentication ? 'authMiddleware, ' : ''}itemController.update);
router.delete('/items/:id', ${hasAuthentication ? 'authMiddleware, ' : ''}itemController.delete);` : 
`// Rutas de demo
router.get('/demo', demoController.getInfo);`}

module.exports = router;`;

      files.push({ name: "src/routes/api.js", content: apiRoutesContent, type: "javascript" });

      // Controlador
      if (hasDatabase) {
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

        files.push({ name: "src/controllers/item.js", content: itemControllerContent, type: "javascript" });

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

        files.push({ name: "src/models/item.js", content: itemModelContent, type: "javascript" });
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

        files.push({ name: "src/controllers/demo.js", content: demoControllerContent, type: "javascript" });
      }

      // Middleware de autenticación
      if (hasAuthentication) {
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

        files.push({ name: "src/middlewares/auth.js", content: authMiddlewareContent, type: "javascript" });
      }
    }

    return {
      files,
      directories: ["src", "src/routes", "src/controllers", "src/models", "src/middlewares"]
    };
  }
};

// Agente especializado en proyectos Python
export const pythonAgent: ProjectAgent = {
  name: "python_agent",
  description: "Genera archivos para proyectos Python con Flask",
  getFiles(projectName: string, description: string, features: string[]): ProjectAgentResult {
    const hasDatabase = features.includes('database');
    const hasAuthentication = features.includes('authentication');
    const hasApiEndpoints = features.includes('api-endpoints');

    // Contenido para main.py Python/Flask
    const mainPyContent = `from flask import Flask, jsonify, request
${hasDatabase ? "from flask_sqlalchemy import SQLAlchemy\nfrom flask_migrate import Migrate" : ""}
${hasAuthentication ? "from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity" : ""}
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_key')
${hasDatabase ? "app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')\napp.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False\n\ndb = SQLAlchemy(app)\nMigrate(app, db)" : ""}
${hasAuthentication ? "app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt_dev_key')\njwt = JWTManager(app)" : ""}

${hasDatabase ? `
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

${hasAuthentication && hasDatabase ? `
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

${hasApiEndpoints ? `
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

${hasAuthentication ? `
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

${hasDatabase && hasApiEndpoints ? `
@app.route('/api/items', methods=['GET'])
${hasAuthentication ? "@jwt_required()" : ""}
def get_items():
    items = Item.query.all()
    return jsonify([item.to_dict() for item in items])

@app.route('/api/items/<int:item_id>', methods=['GET'])
${hasAuthentication ? "@jwt_required()" : ""}
def get_item(item_id):
    item = Item.query.get_or_404(item_id)
    return jsonify(item.to_dict())

@app.route('/api/items', methods=['POST'])
${hasAuthentication ? "@jwt_required()" : ""}
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
${hasAuthentication ? "@jwt_required()" : ""}
def update_item(item_id):
    item = Item.query.get_or_404(item_id)
    data = request.get_json()

    item.name = data.get('name', item.name)
    item.description = data.get('description', item.description)
    item.price = data.get('price', item.price)

    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/items/<int:item_id>', methods=['DELETE'])
${hasAuthentication ? "@jwt_required()" : ""}
def delete_item(item_id):
    item = Item.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Item eliminado correctamente'}), 200
` : ""}

if __name__ == '__main__':
    ${hasDatabase ? "with app.app_context():\n        db.create_all()" : ""}
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))`;

    // Contenido para requirements.txt
    const requirementsTxtContent = `flask==2.3.2
${hasDatabase ? `flask-sqlalchemy==3.0.5\nflask-migrate==4.0.4${hasAuthentication ? "\nflask-jwt-extended==4.5.2" : ""}` : ""}
${hasAuthentication && !hasDatabase ? "flask-jwt-extended==4.5.2" : ""}
gunicorn==20.1.0`;

    // Contenido README para Python
    const readmeContent = `# ${projectName}

${description || "Una aplicación Python con Flask."}

## Características

${features.map(feature => featureToLabel(feature)).filter(Boolean).join('\n')}

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

${hasDatabase ? '## Base de datos\n\nEsta aplicación utiliza SQLAlchemy. Configura la variable de entorno `DATABASE_URL` para conectarte a tu base de datos.' : ''}
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

    return {
      files: [
        { name: "app.py", content: mainPyContent, type: "python" },
        { name: "requirements.txt", content: requirementsTxtContent, type: "text" },
        { name: "README.md", content: readmeContent, type: "markdown" },
        { name: ".gitignore", content: gitignoreContent, type: "text" }
      ]
    };
  }
};

// Función para convertir ID de características a etiquetas legibles
export function featureToLabel(feature: string): string {
  const labels: Record<string, string> = {
    "responsive": "- Diseño Responsive",
    "dark-mode": "- Modo Oscuro",
    "animations": "- Animaciones CSS",
    "routing": "- Enrutamiento",
    "state-management": "- Gestión de Estado",
    "api-integration": "- Integración de API",
    "authentication": "- Autenticación",
    "database": "- Base de Datos",
    "api-endpoints": "- Endpoints API"
  };
  
  return labels[feature] || "";
}

// Función para obtener el agente apropiado según la plantilla
export function getAgentByTemplate(template: string): ProjectAgent {
  switch (template) {
    case "html-css-js":
      return htmlCssJsAgent;
    case "react":
      return reactAgent;
    case "vue":
      return vueAgent;
    case "node":
      return nodeAgent;
    case "python":
      return pythonAgent;
    default:
      return htmlCssJsAgent; // Valor predeterminado
  }
}

// Función para coordinar la creación de archivos por agentes múltiples
export function orchestrateAgents(projectName: string, description: string, template: string, features: string[]): ProjectAgentResult {
  // Obtener el agente principal según la plantilla
  const mainAgent = getAgentByTemplate(template);
  
  // Generar archivos con el agente apropiado
  return mainAgent.getFiles(projectName, description, features);
}

// Exportar todos los agentes
export const projectAgents: ProjectAgent[] = [
  htmlCssJsAgent,
  reactAgent, 
  vueAgent,
  nodeAgent,
  pythonAgent
];
