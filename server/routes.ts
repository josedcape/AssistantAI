import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateCode } from "./openai";
import { executeCode } from "./codeExecution";
import { CodeGenerationRequest, CodeExecutionRequest } from "@shared/schema";
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
        projectId: z.number().optional(),
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
  
  // Register API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
