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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

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