import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateCode, correctCode } from "./openai";
import { executeCode } from "./codeExecution";
import { getAvailableAgents } from "./agents";
import { processAssistantChat } from "./assistantChat";
import { CodeGenerationRequest, CodeExecutionRequest, CodeCorrectionRequest } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import { downloadFromUrl, processUploadedFile, searchInDocuments, getDocumentContent } from "./documents";


const upload = multer();

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = express.Router();

  // Projects routes
  apiRouter.get("/projects", async (req: Request, res: Response) => {
    try {
      // For demo purposes, we'll use user ID 1
      const userId = 1;
      const projects = await storage.getProjectsByUserId(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Error fetching projects" });
    }
  });

  apiRouter.get("/projects/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Error fetching project" });
    }
  });

  apiRouter.post("/projects", async (req: Request, res: Response) => {
    try {
      const projectSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      });

      const validatedData = projectSchema.parse(req.body);
      // For demo purposes, we'll use user ID 1
      const userId = 1;

      const newProject = await storage.createProject({
        userId,
        name: validatedData.name,
        description: validatedData.description || "",
      });

      res.status(201).json(newProject);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid project data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating project" });
    }
  });

  // Files routes
  apiRouter.get("/projects/:projectId/files", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const files = await storage.getFilesByProjectId(projectId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Error fetching files" });
    }
  });

  apiRouter.get("/files/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      const file = await storage.getFile(id);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    } catch (error) {
      console.error("Error fetching file:", error);
      res.status(500).json({ message: "Error fetching file" });
    }
  });

  apiRouter.post("/projects/:projectId/files", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const fileSchema = z.object({
        name: z.string().min(1),
        content: z.string(),
        type: z.string().min(1),
      });

      const validatedData = fileSchema.parse(req.body);

      const newFile = await storage.createFile({
        projectId,
        name: validatedData.name,
        content: validatedData.content,
        type: validatedData.type,
      });

      res.status(201).json(newFile);
    } catch (error) {
      console.error("Error creating file:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid file data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating file" });
    }
  });

  apiRouter.put("/files/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      const fileSchema = z.object({
        content: z.string(),
      });

      const validatedData = fileSchema.parse(req.body);

      const updatedFile = await storage.updateFile(id, validatedData.content);
      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(updatedFile);
    } catch (error) {
      console.error("Error updating file:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid file data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating file" });
    }
  });

  apiRouter.delete("/files/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      const deleted = await storage.deleteFile(id);
      if (!deleted) {
        return res.status(404).json({ message: "File not found" });
      }

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Error deleting file" });
    }
  });

  // Code generation and execution routes
  apiRouter.post("/generate", async (req: Request, res: Response) => {
    try {
      const requestSchema = z.object({
        prompt: z.string().min(1),
        language: z.string().optional(),
        projectId: z.number().nullable().optional(),
        agents: z.array(z.string()).optional(),
      });

      const validatedData = requestSchema.parse(req.body) as CodeGenerationRequest;

      const generatedCode = await generateCode(validatedData);
      res.json(generatedCode);
    } catch (error) {
      console.error("Error generating code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Error generating code",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Endpoints específicos para el sistema de agentes
  apiRouter.get("/agents", async (req: Request, res: Response) => {
    try {
      const agents = getAvailableAgents();
      res.json(agents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ 
        message: "Error fetching agents",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Almacenamiento temporal de planes de desarrollo
  const developmentPlans: any[] = [
    {
      id: 1,
      plan: [
        "Crear estructura HTML básica con formulario de entrada",
        "Diseñar interfaz de usuario con CSS",
        "Implementar lógica JavaScript para procesar datos",
        "Agregar validaciones y manejo de errores",
        "Implementar funcionalidades adicionales solicitadas",
        "Probar el funcionamiento completo de la aplicación"
      ],
      architecture: "Arquitectura MVC simple para una aplicación web. Separación de la interfaz de usuario (HTML/CSS), la lógica de negocio (JavaScript) y los datos manipulados.",
      components: [
        "Interfaz de usuario (HTML/CSS)",
        "Controlador de eventos (JavaScript)",
        "Módulo de validación",
        "Procesamiento de datos"
      ],
      requirements: [
        "HTML5",
        "CSS3",
        "JavaScript ES6+",
        "Sin dependencias externas"
      ],
      projectId: null,
      date: new Date().toISOString()
    }
  ];

  // Endpoint para obtener planes de desarrollo
  apiRouter.get("/development-plans", async (req: Request, res: Response) => {
    try {
      // Opcionalmente filtrar por projectId si se proporciona
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : null;

      let plans = developmentPlans;
      if (projectId && !isNaN(projectId)) {
        plans = plans.filter(plan => plan.projectId === projectId || plan.projectId === null);
      }

      res.json(plans);
    } catch (error) {
      console.error("Error fetching development plans:", error);
      res.status(500).json({ 
        message: "Error fetching development plans",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Endpoint para crear un nuevo plan de desarrollo
  apiRouter.post("/development-plans", async (req: Request, res: Response) => {
    try {
      const planSchema = z.object({
        plan: z.array(z.string()).optional(),
        architecture: z.string().optional(),
        components: z.array(z.string()).optional(),
        requirements: z.array(z.string()).optional(),
        projectId: z.number().optional(),
      });

      const validatedData = planSchema.parse(req.body);

      const newPlan = {
        id: developmentPlans.length > 0 ? Math.max(...developmentPlans.map(p => p.id)) + 1 : 1,
        plan: validatedData.plan || [],
        architecture: validatedData.architecture || "",
        components: validatedData.components || [],
        requirements: validatedData.requirements || [],
        projectId: validatedData.projectId || null,
        date: new Date().toISOString()
      };

      developmentPlans.push(newPlan);

      res.status(201).json(newPlan);
    } catch (error) {
      console.error("Error creating development plan:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid plan data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Error creating development plan",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  apiRouter.post("/execute", async (req: Request, res: Response) => {
    try {
      const requestSchema = z.object({
        code: z.string().min(1),
        language: z.string().min(1),
      });

      const validatedData = requestSchema.parse(req.body) as CodeExecutionRequest;

      const executionResult = await executeCode(validatedData);
      res.json(executionResult);
    } catch (error) {
      console.error("Error executing code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Error executing code",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Endpoint para la corrección de código
  apiRouter.post("/correct", async (req: Request, res: Response) => {
    try {
      const requestSchema = z.object({
        fileId: z.number(),
        content: z.string().min(1),
        instructions: z.string().min(1),
        language: z.string().optional(),
        projectId: z.number().optional()
      });

      const validatedData = requestSchema.parse(req.body) as CodeCorrectionRequest;

      const correctionResult = await correctCode(validatedData);
      res.json(correctionResult);
    } catch (error) {
      console.error("Error correcting code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Error correcting code",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Endpoint para el chat con el asistente
  apiRouter.post("/assistant-chat", async (req: Request, res: Response) => {
    try {
      const requestSchema = z.object({
        message: z.string().min(1),
        projectId: z.number().nullable(),
        history: z.array(z.object({
          role: z.string(),
          content: z.string()
        })).optional()
      });

      const validatedData = requestSchema.parse(req.body);

      const result = await processAssistantChat({
        message: validatedData.message,
        projectId: validatedData.projectId,
        history: validatedData.history || []
      });

      res.json(result);
    } catch (error) {
      console.error("Error processing assistant chat:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Error processing assistant chat",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Endpoints para documentos
  apiRouter.get("/projects/:projectId/documents", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const documents = await storage.getDocumentsByProjectId(projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Error fetching documents" });
    }
  });

  apiRouter.post("/projects/:projectId/documents/upload", upload.array("files", 10), async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const processedFiles = await Promise.all(
        files.map(file => processUploadedFile(file, projectId))
      );

      const processedCount = processedFiles.filter(Boolean).length;

      res.json({
        message: `${processedCount} of ${files.length} files uploaded successfully`,
        processed: processedCount,
        total: files.length
      });
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ 
        message: "Error uploading documents",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  apiRouter.post("/projects/:projectId/documents/url", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const urlSchema = z.object({
        url: z.string().url(),
      });

      const validatedData = urlSchema.parse(req.body);

      const processedCount = await downloadFromUrl(validatedData.url, projectId);

      res.json({
        message: `Downloaded and processed ${processedCount} files from URL`,
        processed: processedCount
      });
    } catch (error) {
      console.error("Error processing URL:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid URL", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Error processing URL",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  apiRouter.get("/projects/:projectId/documents/search", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const results = await searchInDocuments(projectId, query);
      res.json(results);
    } catch (error) {
      console.error("Error searching documents:", error);
      res.status(500).json({ 
        message: "Error searching documents",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  apiRouter.delete("/documents/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Error deleting document" });
    }
  });

  // Preview endpoint for projects
  apiRouter.get("/projects/:projectId/preview", async (req: Request, res: Response) => {
    try {
      // Parsear el ID y verificar que sea válido de forma estricta
      const rawProjectId = req.params.projectId;
      // Asegurarse de que sea un número válido y mayor a 0
      const projectId = /^\d+$/.test(rawProjectId) ? parseInt(rawProjectId) : NaN;

      if (isNaN(projectId) || projectId <= 0) {
        console.error(`Invalid project ID: ${req.params.projectId}`);
        // En lugar de devolver un JSON, devolvemos un HTML de error para mostrar en el iframe
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Error en Vista Previa</title>
              <style>
                body { font-family: sans-serif; text-align: center; margin-top: 50px; }
                .error { color: #e74c3c; }
                .error-box { background-color: #fdf2f2; border: 1px solid #fecaca; 
                           border-radius: 8px; padding: 20px; max-width: 500px; 
                           margin: 0 auto; }
              </style>
            </head>
            <body>
              <div class="error-box">
                <h1 class="error">ID de proyecto inválido</h1>
                <p>No se puede cargar la vista previa porque el ID del proyecto no es válido.</p>
                <p>ID recibido: "${req.params.projectId}"</p>
              </div>
            </body>
          </html>
        `);
      }

      // Get all files for the project
      const files = await storage.getFilesByProjectId(projectId);

      if (!files || files.length === 0) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Error en Vista Previa</title>
              <style>
                body { font-family: sans-serif; text-align: center; margin-top: 50px; }
                .error { color: #e74c3c; }
              </style>
            </head>
            <body>
              <h1 class="error">No se encontraron archivos</h1>
              <p>No hay archivos en este proyecto para mostrar.</p>
            </body>
          </html>
        `);
      }

      // Find the HTML file to use as entry point
      const htmlFile = files.find(file => file.type === 'html' || file.name.toLowerCase().endsWith('.html'));
      if (!htmlFile) {
        // Si no hay archivo HTML, creamos uno simple con los archivos disponibles
        return res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Vista Previa</title>
              <style>
                body { font-family: sans-serif; padding: 20px; }
                h1 { color: #3498db; }
                .file-list { margin: 20px 0; }
                .file { padding: 10px; border: 1px solid #eee; margin: 5px 0; }
                pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow: auto; }
              </style>
            </head>
            <body>
              <h1>No se encontró archivo HTML principal</h1>
              <p>Los siguientes archivos están disponibles en el proyecto:</p>
              <div class="file-list">
                ${files.map(f => `
                  <div class="file">
                    <strong>${f.name}</strong> (${f.type})
                    <pre>${f.content.substring(0, 100)}${f.content.length > 100 ? '...' : ''}</pre>
                  </div>
                `).join('')}
              </div>
              <p>Para visualizar un proyecto, necesitas un archivo HTML principal.</p>
            </body>
          </html>
        `);
      }

      // Get CSS and JS files
      const cssFiles = files.filter(file => file.type === 'css' || file.name.toLowerCase().endsWith('.css'));
      const jsFiles = files.filter(file => file.type === 'javascript' || file.name.toLowerCase().endsWith('.js'));

      console.log(`Preview for project ${projectId}: Found ${cssFiles.length} CSS files and ${jsFiles.length} JS files`);

      // Determinar si hay archivos específicos
      const mainHtml = htmlFile.name;
      const mainCss = cssFiles.length > 0 ? cssFiles[0].name : null;
      const mainJs = jsFiles.length > 0 ? jsFiles[0].name : null;

      console.log(`Ejecutando múltiples archivos: { html: '${mainHtml}', css: '${mainCss}', js: '${mainJs}' }`);

      // Procesar contenido HTML para integrar CSS y JavaScript
      let htmlContent = htmlFile.content;

      // Asegurarse de que sea un documento HTML completo
      if (!htmlContent.includes('<!DOCTYPE html>') && !htmlContent.includes('<html')) {
        htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vista Previa</title>
  ${cssFiles.map(css => `<style id="style-${css.name.replace(/\./g, '-')}">${css.content}</style>`).join('\n')}
</head>
<body>
  ${htmlContent}

  ${jsFiles.map(js => `<script id="script-${js.name.replace(/\./g, '-')}">${js.content}</script>`).join('\n')}

  <script>
    // Script para comunicación con el iframe padre y manipulación DOM en tiempo real
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'refreshContent') {
        // Actualizar estilos si se proporcionan
        if (event.data.css) {
          const cssMap = event.data.css; // { filename: content }
          for (const [filename, content] of Object.entries(cssMap)) {
            const styleId = 'style-' + filename.replace(/\./g, '-');
            let styleEl = document.getElementById(styleId);

            if (!styleEl) {
              // Crear nuevo elemento style si no existe
              styleEl = document.createElement('style');
              styleEl.id = styleId;
              document.head.appendChild(styleEl);
            }

            styleEl.textContent = content;
          }
        }

        // Actualizar scripts si se proporcionan
        if (event.data.js) {
          const jsMap = event.data.js; // { filename: content }
          for (const [filename, content] of Object.entries(jsMap)) {
            try {
              // Crear un nuevo script con el contenido actualizado
              const newScript = document.createElement('script');
              newScript.textContent = content;
              document.body.appendChild(newScript);

              // Registrar en la consola
              console.log('Script actualizado:', filename);
            } catch (error) {
              console.error('Error al actualizar script:', filename, error);
            }
          }
        }

        // Actualizar HTML si se proporciona
        if (event.data.html) {
          // Actualizar solo el contenido del body preservando scripts y estilos
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = event.data.html;

          // Extraer solo los elementos del body
          const bodyContent = Array.from(tempDiv.querySelectorAll('body > *'));

          // Preservar los scripts existentes
          const existingScripts = Array.from(document.body.querySelectorAll('script[id^="script-"]'));

          // Limpiar el body actual
          document.body.innerHTML = '';

          // Añadir el nuevo contenido
          bodyContent.forEach(el => document.body.appendChild(el));

          // Restaurar los scripts
          existingScripts.forEach(script => document.body.appendChild(script));
        }
      }
    });

    // Notificar que la vista previa está lista
    window.parent.postMessage({ type: 'previewReady', projectId: ${projectId} }, '*');

    // Registrar en la consola
    console.log("Vista previa DOM interactiva cargada correctamente");
  </script>
</body>
</html>`;
      } else {
        // Si ya es un documento HTML completo, asegurarse de que tenga los scripts y estilos
        if (cssFiles.length > 0) {
          // Agregar estilos al head si no están ya
          const headEndPos = htmlContent.indexOf('</head>');
          if (headEndPos !== -1) {
            const stylesBlock = cssFiles.map(css => 
              `<style id="style-${css.name.replace(/\./g, '-')}">${css.content}</style>`
            ).join('\n');

            htmlContent = htmlContent.substring(0, headEndPos) + 
                         stylesBlock + 
                         htmlContent.substring(headEndPos);
          }
        }

        if (jsFiles.length > 0) {
          // Agregar scripts antes del cierre del body si no están ya
          const bodyEndPos = htmlContent.indexOf('</body>');
          if (bodyEndPos !== -1) {
            const scriptsBlock = jsFiles.map(js => 
              `<script id="script-${js.name.replace(/\./g, '-')}">${js.content}</script>`
            ).join('\n');

            // Agregar también el script de comunicación DOM
            const communicationScript = `
  <script>
    // Script para comunicación con el iframe padre y manipulación DOM en tiempo real
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'refreshContent') {
        // Actualizar estilos si se proporcionan
        if (event.data.css) {
          const cssMap = event.data.css; // { filename: content }
          for (const [filename, content] of Object.entries(cssMap)) {
            const styleId = 'style-' + filename.replace(/\./g, '-');
            let styleEl = document.getElementById(styleId);

            if (!styleEl) {
              // Crear nuevo elemento style si no existe
              styleEl = document.createElement('style');
              styleEl.id = styleId;
              document.head.appendChild(styleEl);
            }

            styleEl.textContent = content;
          }
        }

        // Actualizar scripts si se proporcionan
        if (event.data.js) {
          const jsMap = event.data.js; // { filename: content }
          for (const [filename, content] of Object.entries(jsMap)) {
            try {
              // Crear un nuevo script con el contenido actualizado
              const newScript = document.createElement('script');
              newScript.textContent = content;
              document.body.appendChild(newScript);

              // Registrar en la consola
              console.log('Script actualizado:', filename);
            } catch (error) {
              console.error('Error al actualizar script:', filename, error);
            }
          }
        }

        // Actualizar HTML si se proporciona
        if (event.data.html) {
          // Actualizar solo el contenido del body preservando scripts y estilos
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = event.data.html;

          // Extraer solo los elementos del body
          const bodyContent = Array.from(tempDiv.querySelectorAll('body > *'));

          // Preservar los scripts existentes
          const existingScripts = Array.from(document.body.querySelectorAll('script[id^="script-"]'));

          // Limpiar el body actual
          document.body.innerHTML = '';

          // Añadir el nuevo contenido
          bodyContent.forEach(el => document.body.appendChild(el));

          // Restaurar los scripts
          existingScripts.forEach(script => document.body.appendChild(script));
        }
      }
    });

    // Notificar que la vista previa está lista
    window.parent.postMessage({ type: 'previewReady', projectId: ${projectId} }, '*');

    // Registrar en la consola
    console.log("Vista previa DOM interactiva cargada correctamente");
  </script>`;

            htmlContent = htmlContent.substring(0, bodyEndPos) + 
                         scriptsBlock + 
                         communicationScript + 
                         htmlContent.substring(bodyEndPos);
          }
        }
      }

      // Establecer encabezados para evitar problemas de caché
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Enviar el contenido HTML procesado
      res.send(htmlContent);
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error en Vista Previa</title>
            <style>
              body { font-family: sans-serif; padding: 20px; }
              .error { color: #e74c3c; background: #ffebee; padding: 15px; border-radius: 5px; }
              pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow: auto; }
            </style>
          </head<body>
            <div class="error">
              <h2>Error al generar la vista previa</h2>
              <p>${error instanceof Error ? error.message : "Error desconocido"}</p</div>
          </body>
        </html>
      `);
    }
  });

  // Register API routes
  app.use("/api", apiRouter);

  // Endpoint para obtener el contenido de un documento
  apiRouter.get("/documents/:documentId/content", async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.documentId);

      if (isNaN(documentId)) {
        return res.status(400).json({ error: "ID de documento inválido" });
      }

      // Obtener primero el documento para verificar
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Documento no encontrado" });
      }
      
      if (!document.path) {
        return res.status(404).json({ error: "El documento no tiene una ruta de archivo válida" });
      }

      const content = await getDocumentContent(documentId);

      if (content === null) {
        return res.status(404).json({ error: "No se pudo leer el contenido del documento" });
      }

      const fileName = document.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (fileName.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
      } else if (fileName.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (fileName.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (fileName.endsWith('.py')) {
        res.setHeader('Content-Type', 'text/plain');
      } else {
        res.setHeader('Content-Type', 'text/plain');
      }

      res.send(content);
    } catch (error) {
      console.error("Error obteniendo contenido del documento:", error);
      res.status(500).json({ error: "Error al obtener el contenido del documento" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}