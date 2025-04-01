import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateCode, correctCode } from "./openai";
import { executeCode } from "./codeExecution";
import { getAvailableAgents } from "./agents";
import { CodeGenerationRequest, CodeExecutionRequest, CodeCorrectionRequest } from "@shared/schema";
import { z } from "zod";

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

  // Preview endpoint for projects
  apiRouter.get("/projects/:projectId/preview", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get all files for the project
      const files = await storage.getFilesByProjectId(projectId);

      // Find the HTML file to use as entry point
      const htmlFile = files.find(file => file.type === 'html');
      if (!htmlFile) {
        return res.status(404).json({ message: "No HTML file found in project" });
      }

      // Get CSS and JS files
      const cssFiles = files.filter(file => file.type === 'css');
      const jsFiles = files.filter(file => file.type === 'javascript');

      // Prepare files for rendering
      const preparedFiles = [
        {
          name: htmlFile.name,
          content: htmlFile.content,
          type: 'html'
        },
        ...cssFiles.map(file => ({
          name: file.name,
          content: file.content,
          type: 'css'
        })),
        ...jsFiles.map(file => ({
          name: file.name,
          content: file.content,
          type: 'javascript'
        }))
      ];

      // Execute the code to generate the preview
      const executionResult = await executeCode({
        code: JSON.stringify({ files: preparedFiles }),
        language: 'html'
      });

      // Send the response
      if (executionResult.htmlContent) {
        res.setHeader('Content-Type', 'text/html');
        res.send(executionResult.htmlContent);
      } else {
        res.status(500).json({ message: "Failed to generate preview" });
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      res.status(500).json({ 
        message: "Error generating preview",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Register API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}