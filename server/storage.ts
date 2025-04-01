import { 
  users, type User, type InsertUser, 
  projects, type Project, type InsertProject,
  files, type File, type InsertFile,
  type Document, type InsertDocument
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFilesByProjectId(projectId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, content: string): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByProjectId(projectId: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private files: Map<number, File>;
  private documents: Map<number, Document>;
  private userId: number;
  private projectId: number;
  private fileId: number;
  private documentId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.files = new Map();
    this.documents = new Map();
    this.userId = 1;
    this.projectId = 1;
    this.fileId = 1;
    this.documentId = 1;
    
    // Create a demo user
    this.createUser({ username: "demo", password: "password" });
    
    // Create some initial projects
    const demoProject = this.createProject({ 
      userId: 1, 
      name: "Mi primer proyecto", 
      description: "Una aplicación web simple" 
    });
    
    // Add some initial files
    this.createFile({
      projectId: demoProject.id,
      name: "index.html",
      content: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mi Aplicación</title>
  <link rel="stylesheet" href="estilos.css">
</head>
<body>
  <div id="app">
    <h1>Bienvenido a mi aplicación</h1>
    <p>Esta es una aplicación web simple.</p>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      type: "html"
    });
    
    this.createFile({
      projectId: demoProject.id,
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
}`,
      type: "css"
    });
    
    this.createFile({
      projectId: demoProject.id,
      name: "app.js",
      content: `// App para gestionar tareas
document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM
  const taskForm = document.getElementById('task-form');
  const taskInput = document.getElementById('task-input');
  const taskList = document.getElementById('task-list');
  
  // Cargar tareas guardadas
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  
  // Renderizar las tareas existentes
  function renderTasks() {
    taskList.innerHTML = '';
    
    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      li.className = 'task-item';
      
      const taskText = document.createElement('span');
      taskText.textContent = task.text;
      taskText.className = task.completed ? 'completed' : '';
      
      const actions = document.createElement('div');
      actions.className = 'task-actions';
      
      // Crear botones de acción
      const toggleBtn = document.createElement('button');
      toggleBtn.innerHTML = '<i class="ri-check-line"></i>';
      toggleBtn.classList.add('toggle-btn');
      toggleBtn.addEventListener('click', () => toggleTask(index));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
      deleteBtn.classList.add('delete-btn');
      deleteBtn.addEventListener('click', () => deleteTask(index));
      
      actions.appendChild(toggleBtn);
      actions.appendChild(deleteBtn);
      
      li.appendChild(taskText);
      li.appendChild(actions);
      
      taskList.appendChild(li);
    });
  }
  
  // Inicializar la aplicación
  renderTasks();
});`,
      type: "javascript"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { ...insertUser, id };
    this.users.set(id, newUser);
    return newUser;
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      (project) => project.userId === userId,
    );
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const now = new Date();
    const newProject: Project = { 
      ...insertProject, 
      id,
      createdAt: now,
      lastModified: now
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject: Project = { 
      ...project, 
      ...projectUpdate,
      lastModified: new Date()
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const deleted = this.projects.delete(id);
    if (deleted) {
      // Delete all files associated with this project
      const projectFiles = await this.getFilesByProjectId(id);
      for (const file of projectFiles) {
        this.files.delete(file.id);
      }
    }
    return deleted;
  }

  // File operations
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByProjectId(projectId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.projectId === projectId,
    );
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.fileId++;
    const now = new Date();
    const newFile: File = { 
      ...insertFile, 
      id,
      createdAt: now,
      lastModified: now
    };
    this.files.set(id, newFile);
    return newFile;
  }

  async updateFile(id: number, content: string): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;
    
    const updatedFile: File = { 
      ...file, 
      content,
      lastModified: new Date()
    };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }
  
  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocumentsByProjectId(projectId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (document) => document.projectId === projectId,
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    const now = new Date();
    const newDocument: Document = { 
      ...insertDocument, 
      id,
      createdAt: now
    };
    this.documents.set(id, newDocument);
    return newDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
}

export const storage = new MemStorage();
