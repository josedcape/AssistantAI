import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastModified: timestamp("last_modified").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastModified: timestamp("last_modified").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull(), // 'file', 'url', 'repository'
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  userId: true,
  name: true,
  description: true,
});

export const insertFileSchema = createInsertSchema(files).pick({
  projectId: true,
  name: true,
  content: true,
  type: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  projectId: true,
  name: true,
  path: true,
  type: true,
  size: true,
});


// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Types for code generation and execution
export type AgentFunctionCall = {
  name: string;
  arguments: any;
};

export type Agent = {
  name: string;
  description: string;
  functions: string[];
};

export interface CodeGenerationRequest {
  prompt: string;
  language?: string;
  projectId?: number | null;
  agents?: string[];
}

export type GeneratedFile = {
  name: string;
  content: string;
  language: string;
  type: string;
};

export type CodeGenerationResponse = {
  files: GeneratedFile[];
  suggestions?: Array<string>;
  plan?: Array<string>;
  architecture?: string;
  components?: Array<string>;
  requirements?: Array<string>;
  agentName?: string;
  functionCall?: {
    name: string;
    arguments: any;
  };
  // Campos de compatibilidad anterior
  code?: string;
  language?: string;
};

export type CodeExecutionRequest = {
  code: string;
  language: string;
};

export type CodeExecutionResponse = {
  output: string;
  error?: string;
  success: boolean;
  visualOutput?: boolean; // Indica si la salida debe mostrarse como contenido visual (HTML/CSS)
  htmlContent?: string; // Contenido HTML para renderizar cuando visualOutput es true
};

// Types para la corrección de código
export type CodeCorrectionRequest = {
  fileId: number;
  content: string;
  instructions: string;
  language?: string;
  projectId?: number;
};

export type CodeCorrectionResponse = {
  correctedCode: string;
  changes: Array<{
    description: string;
    lineNumbers?: number[];
  }>;
  explanation?: string;
};

import { z } from "zod";

// User schema
export const UserSchema = z.object({
  id: z.number().optional(),
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

export type User = z.infer<typeof UserSchema>;
export type InsertUser = Omit<User, "id">;

// Project schema
export const ProjectSchema = z.object({
  id: z.number().optional(),
  userId: z.number(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Project = z.infer<typeof ProjectSchema>;
export type InsertProject = Omit<Project, "id" | "createdAt" | "updatedAt">;

// File schema
export const FileSchema = z.object({
  id: z.number().optional(),
  projectId: z.number(),
  name: z.string().min(1).max(100),
  content: z.string(),
  type: z.string().min(1).max(50),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type File = z.infer<typeof FileSchema>;
export type InsertFile = Omit<File, "id" | "createdAt" | "updatedAt">;

// Document schema
export const DocumentSchema = z.object({
  id: z.number().optional(),
  projectId: z.number(),
  name: z.string().min(1).max(255),
  path: z.string(),
  type: z.string(),
  size: z.number(),
  createdAt: z.date().optional(),
});

export type Document = z.infer<typeof DocumentSchema>;
export type InsertDocument = Omit<Document, "id" | "createdAt">;