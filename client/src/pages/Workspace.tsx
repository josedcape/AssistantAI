import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { File, Project, CodeGenerationResponse, Agent } from "@shared/schema";
import { getLanguageFromFileType } from "@/lib/types";
import Header from "@/components/Header";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import CodePreview from "@/components/CodePreview";
import ConsoleOutput from "@/components/ConsoleOutput";
import StatusBar from "@/components/StatusBar";
import DevelopmentPlan from "@/components/DevelopmentPlan";
import { useIsMobile } from "@/hooks/use-mobile";
import AssistantChat from "@/components/AssistantChat";
import { DocumentUploader } from "@/components/DocumentUploader";
import ProjectDeployment from "@/components/ProjectDeployment";
import { sounds } from '@/lib/sounds';
import PackageExplorer from "@/components/PackageExplorer";
import { SidebarProvider, Sidebar, SidebarContent, SidebarTrigger } from "@/components/ui/sidebar";
import { 
  PanelLeft, 
  FolderOpen, 
  FileText, 
  GitBranch, 
  Save, 
  Plus, 
  Upload, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FolderPlus, 
  FilePlus,
  ChevronDown,
  FolderIcon,
  Menu,
  X,
  Settings,
  Play,
  Code,
  MoreVertical,
  Terminal,
  Globe,
  MessageSquare,
  BookOpen,
  Package,
  History
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Función auxiliar para determinar el tipo de archivo basado en la extensión
const getFileLanguage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js') return 'javascript';
  if (ext === 'ts' || ext === 'tsx') return 'typescript';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  return 'text';
};

// Definir el tipo para la estructura de carpetas
interface FolderStructure {
  id: string;
  name: string;
  path: string;
  files: File[];
  folders: FolderStructure[];
  isExpanded: boolean;
}

const Workspace: React.FC = () => {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Estado principal
  const [activeTab, setActiveTab] = useState<"development" | "preview" | "console" | "deployment" | "assistant-chat" | "resources" | "packages" | "history">("development");
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [showAgentsSelector, setShowAgentsSelector] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFloatingActions, setShowFloatingActions] = useState(true);

  // Estados para la estructura de carpetas
  const [folderStructure, setFolderStructure] = useState<FolderStructure[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);

  // Nuevos estados para las funcionalidades adicionales
  const [sidebarTab, setSidebarTab] = useState<"files" | "documents" | "repository" | "projects">("files");
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<{name: string, type: string, size: number}[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [fileChangesHistory, setFileChangesHistory] = useState<{
    timestamp: Date;
    filename: string;
    description: string;
  }[]>([]);

  const [developmentPlan, setDevelopmentPlan] = useState<{
    plan?: string[];
    architecture?: string;
    components?: string[];
    requirements?: string[];
  } | null>(null);

  // Queries para cargar datos
  const { 
    data: project, 
    isLoading: isLoadingProject, 
    error: projectError 
  } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !isNaN(projectId),
  });

  const { 
    data: filesData, 
    isLoading: isLoadingFiles, 
    error: filesError,
    refetch: refetchFiles
  } = useQuery<File[]>({
    queryKey: [`/api/projects/${projectId}/files`],
    enabled: !isNaN(projectId),
  });

  const {
    data: agentsData
  } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    refetch: refetchProjects
  } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Efecto para organizar archivos en estructura de carpetas
  useEffect(() => {
    if (filesData) {
      const newFolderStructure: FolderStructure[] = [];
      const rootFiles: File[] = [];
      const folderMap: Record<string, FolderStructure> = {};

      // Primero crear todas las carpetas necesarias
      filesData.forEach(file => {
        if (file.path) {
          const pathParts = file.path.split('/').filter(Boolean);
          let currentPath = '';

          pathParts.forEach((part, index) => {
            const parentPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!folderMap[currentPath]) {
              const newFolder: FolderStructure = {
                id: `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                name: part,
                path: currentPath,
                files: [],
                folders: [],
                isExpanded: false
              };

              folderMap[currentPath] = newFolder;

              if (parentPath) {
                if (folderMap[parentPath]) {
                  folderMap[parentPath].folders.push(newFolder);
                }
              } else {
                newFolderStructure.push(newFolder);
              }
            }
          });

          // Añadir archivo a su carpeta correspondiente
          if (pathParts.length > 0) {
            const folderPath = pathParts.join('/');
            if (folderMap[folderPath]) {
              folderMap[folderPath].files.push(file);
            }
          }
        } else {
          // Archivos sin path van a la raíz
          rootFiles.push(file);
        }
      });

      // Añadir carpetas preexistentes
      const defaultFolders: FolderStructure[] = [
        {
          id: 'src',
          name: 'src',
          path: 'src',
          files: filesData.filter(f => !f.path && f.name.includes('.')).filter(f => !rootFiles.includes(f)),
          folders: [
            {
              id: 'components',
              name: 'components',
              path: 'src/components',
              files: [],
              folders: [],
              isExpanded: false
            },
            {
              id: 'lib',
              name: 'lib',
              path: 'src/lib',
              files: [],
              folders: [],
              isExpanded: false
            }
          ],
          isExpanded: true
        }
      ];

      // Combinar estructura predeterminada con la estructura generada
      const combinedStructure = [...newFolderStructure];
      defaultFolders.forEach(defaultFolder => {
        if (!combinedStructure.some(folder => folder.path === defaultFolder.path)) {
          combinedStructure.push(defaultFolder);
        }
      });

      setFolderStructure(combinedStructure);
      setFiles(filesData);
      if (!activeFile && filesData.length > 0) {
        setActiveFile(filesData[0]);
      }
    }
  }, [filesData, activeFile]);

  // Funciones para manejar la estructura de carpetas
  const toggleFolderExpand = useCallback((folderId: string) => {
    const updateFolderStructure = (folders: FolderStructure[]): FolderStructure[] => {
      return folders.map(folder => {
        if (folder.id === folderId) {
          return { ...folder, isExpanded: !folder.isExpanded };
        }
        if (folder.folders.length > 0) {
          return { ...folder, folders: updateFolderStructure(folder.folders) };
        }
        return folder;
      });
    };

    setFolderStructure(prevStructure => updateFolderStructure(prevStructure));
  }, []);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la carpeta no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    try {
      const parentPath = activeFolder || '';
      const newPath = parentPath ? `${parentPath}/${newFolderName}` : newFolderName;

      // Crear carpeta en el backend
      await apiRequest("POST", `/api/projects/${projectId}/folders`, {
        path: newPath
      });

      // Actualizar UI
      const newFolder: FolderStructure = {
        id: `folder-${Date.now()}`,
        name: newFolderName,
        path: newPath,
        files: [],
        folders: [],
        isExpanded: true
      };

      const updateFolderStructure = (folders: FolderStructure[], targetPath: string | null): FolderStructure[] => {
        if (!targetPath) {
          return [...folders, newFolder];
        }

        return folders.map(folder => {
          if (folder.path === targetPath) {
            return { ...folder, folders: [...folder.folders, newFolder], isExpanded: true };
          }
          if (folder.folders.length > 0) {
            return { ...folder, folders: updateFolderStructure(folder.folders, targetPath) };
          }
          return folder;
        });
      };

      setFolderStructure(prevStructure => updateFolderStructure(prevStructure, activeFolder));
      setNewFolderName("");
      setShowNewFolderDialog(false);

      // Añadir al historial
      setFileChangesHistory(prev => [...prev, {
        timestamp: new Date(),
        filename: newPath,
        description: "Carpeta creada"
      }]);

      toast({
        title: "Carpeta creada",
        description: `Se ha creado la carpeta ${newFolderName}`,
        duration: 3000
      });

      sounds.play('click', 0.3);
    } catch (error) {
      console.error("Error al crear carpeta:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la carpeta",
        variant: "destructive"
      });
    }
  }, [newFolderName, activeFolder, projectId, toast]);

  const handleCreateFile = useCallback(async () => {
    if (!newFileName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del archivo no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    try {
      const path = activeFolder || '';
      const fileType = getFileLanguage(newFileName);

      // Crear archivo en el backend
      const response = await apiRequest("POST", `/api/projects/${projectId}/files`, {
        name: newFileName,
        path: path,
        content: "",
        type: fileType
      });

      const newFile = await response.json();

      // Actualizar UI
      const updateFolderStructure = (folders: FolderStructure[], targetPath: string | null): FolderStructure[] => {
        if (!targetPath) {
          return folders.map(folder => folder);
        }

        return folders.map(folder => {
          if (folder.path === targetPath) {
            return { ...folder, files: [...folder.files, newFile] };
          }
          if (folder.folders.length > 0) {
            return { ...folder, folders: updateFolderStructure(folder.folders, targetPath) };
          }
          return folder;
        });
      };

      setFolderStructure(prevStructure => updateFolderStructure(prevStructure, activeFolder));
      setFiles(prevFiles => [...prevFiles, newFile]);
      setActiveFile(newFile);
      setNewFileName("");
      setShowNewFileDialog(false);

      // Añadir al historial
      setFileChangesHistory(prev => [...prev, {
        timestamp: new Date(),
        filename: path ? `${path}/${newFileName}` : newFileName,
        description: "Archivo creado"
      }]);

      toast({
        title: "Archivo creado",
        description: `Se ha creado el archivo ${newFileName}`,
        duration: 3000
      });

      sounds.play('click', 0.3);
    } catch (error) {
      console.error("Error al crear archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el archivo",
        variant: "destructive"
      });
    }
  }, [newFileName, activeFolder, projectId, toast, setActiveFile, setFiles]);

  // Effect hooks
  useEffect(() => {
    if (agentsData) {
      setAvailableAgents(agentsData);
    }
  }, [agentsData]);

  useEffect(() => {
    if (projectsData) {
      setUserProjects(projectsData);
    }
  }, [projectsData]);

  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  useEffect(() => {
    sounds.play('laser', 0.4);
  }, []);

  // Detectar scroll para ocultar/mostrar el botón flotante
  useEffect(() => {
    if (!isMobile) return;

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY + 10) {
        // Scrolling down - hide button
        setShowFloatingActions(false);
      } else if (currentScrollY < lastScrollY - 10) {
        // Scrolling up - show button
        setShowFloatingActions(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // Handler functions
  const handleBackToHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleFileSelect = useCallback((file: File) => {
    setActiveFile(file);
    if (isMobile) {
      setActiveTab("development");
      setIsSidebarCollapsed(true);
      setShowMobileMenu(false);
    }
  }, [isMobile]);

  const selectQuickPrompt = useCallback((prompt: string) => {
    setAiPrompt(prompt);
  }, []);

  const toggleAgentSelection = useCallback((agentName: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedAgents(prev => [...prev, agentName]);
    } else {
      setSelectedAgents(prev => prev.filter(name => name !== agentName));
    }
  }, []);

  const handleFolderSelect = useCallback((folderPath: string) => {
    setActiveFolder(folderPath);
  }, []);

  // Nuevos handlers para las funcionalidades adicionales
  const handleDocumentUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newDocuments = Array.from(files).map(file => ({
      name: file.name,
      type: file.type,
      size: file.size
    }));

    setUploadedDocuments(prev => [...prev, ...newDocuments]);

    toast({
      title: "Documentos cargados",
      description: `Se ${files.length === 1 ? 'ha cargado 1 documento' : `han cargado ${files.length} documentos`}`,
      duration: 3000
    });

    // Añadir al historial
    setFileChangesHistory(prev => [...prev, {
      timestamp: new Date(),
      filename: files.length === 1 ? files[0].name : `${files.length} documentos`,
      description: "Documentos cargados"
    }]);

    // Aquí iría la lógica para subir los documentos al servidor
    // Por simplicidad, simulamos una subida exitosa
  }, [toast]);

  const handleImportFromRepo = useCallback(async () => {
    if (!repoUrl) {
      toast({
        title: "URL requerida",
        description: "Por favor ingresa la URL del repositorio",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingRepo(true);

    try {
      // Simulamos la llamada a la API para importar desde el repositorio
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Repositorio importado",
        description: "Los archivos se han importado correctamente",
        duration: 3000
      });

      // Añadir al historial
      setFileChangesHistory(prev => [...prev, {
        timestamp: new Date(),
        filename: repoUrl,
        description: "Repositorio importado"
      }]);

      setRepoUrl("");
      // Refrescar la lista de archivos
      await refetchFiles();
    } catch (error) {
      console.error("Error al importar repositorio:", error);
      toast({
        title: "Error",
        description: "No se pudo importar el repositorio",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRepo(false);
    }
  }, [repoUrl, toast, refetchFiles]);

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa un nombre para el proyecto",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/projects", {
        name: newProjectName.trim(),
        description: "Proyecto creado desde el workspace"
      });

      const newProject = await response.json();

      toast({
        title: "Proyecto creado",
        description: `El proyecto ${newProjectName} se ha creado correctamente`,
        duration: 3000
      });

      setNewProjectName("");

      // Refrescar la lista de proyectos
      await refetchProjects();

      // Opcional: Navegar al nuevo proyecto
      navigate(`/workspace/${newProject.id}`);
    } catch (error) {
      console.error("Error al crear proyecto:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto",
        variant: "destructive"
      });
    }
  }, [newProjectName, toast, refetchProjects, navigate]);

  const handleSwitchProject = useCallback((projectId: number) => {
    navigate(`/workspace/${projectId}`);
  }, [navigate]);

  const toggleSidebar = useCallback(() => {
    // Asegurarse de que la barra lateral se muestre primero si está colapsada
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
    } else {
      setIsSidebarCollapsed(true);
    }

    if (isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile, isSidebarCollapsed]);

  const showSidebar = useCallback(() => {
    // Función específica para mostrar la barra lateral
    setIsSidebarCollapsed(false);
    if (isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile]);

  const toggleMobileMenu = useCallback(() => {
    setShowMobileMenu(prev => !prev);
  }, []);

  const updatePreview = useCallback(() => {
    if (isNaN(projectId) || projectId <= 0) {
      toast({
        title: "Error",
        description: "ID de proyecto inválido. No se puede mostrar la vista previa.",
        variant: "destructive"
      });
      return;
    }

    const htmlFile = files.find(f => f.type === 'html');
    if (htmlFile) {
      setActiveFile(htmlFile);
      setActiveTab("preview");

      setTimeout(() => {
        const previewIframe = document.querySelector('iframe');
        if (previewIframe && previewIframe.contentWindow) {
          try {
            const cssFiles = files.filter(f => f.type === 'css');
            const jsFiles = files.filter(f => f.type === 'javascript');

            const cssMap: Record<string, string> = {};
            cssFiles.forEach(f => { cssMap[f.name] = f.content; });

            const jsMap: Record<string, string> = {};
            jsFiles.forEach(f => { jsMap[f.name] = f.content; });

            previewIframe.contentWindow.postMessage({
              type: 'refreshContent',
              html: htmlFile.content,
              css: cssMap,
              js: jsMap
            }, '*');

            toast({
              title: "Vista previa actualizada",
              description: "Se ha actualizado la vista previa con los cambios más recientes.",
              duration: 3000
            });
          } catch (e) {
            console.error("Error al comunicarse con la vista previa:", e);
          }
        }
      }, 500);
    } else {
      toast({
        title: "No hay archivo HTML",
        description: "No se encontró un archivo HTML para mostrar la aplicación",
        variant: "destructive"
      });
    }
  }, [files, projectId, toast]);

  const handleApplyChanges = useCallback(async (fileUpdates: { file: string, content: string }[]) => {
    for (const update of fileUpdates) {
      const existingFile = files.find(f => f.name === update.file);

      try {
        if (existingFile) {
          // Actualizar archivo existente
          const response = await apiRequest("PUT", `/api/files/${existingFile.id}`, { content: update.content });
          const updatedFile = await response.json();
          setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));

          if (activeFile && activeFile.id === updatedFile.id) {
            setActiveFile(updatedFile);
          }

          // Añadir al historial
          setFileChangesHistory(prev => [...prev, {
            timestamp: new Date(),
            filename: update.file,
            description: "Archivo actualizado"
          }]);
        } else {
          // Crear nuevo archivo
          const fileType = getFileLanguage(update.file);
          const response = await apiRequest("POST", `/api/projects/${projectId}/files`, {
            name: update.file,
            content: update.content,
            type: fileType
          });
          const newFile = await response.json();
          setFiles(prev => [...prev, newFile]);

          // Añadir al historial
          setFileChangesHistory(prev => [...prev, {
            timestamp: new Date(),
            filename: update.file,
            description: "Archivo creado"
          }]);
        }
      } catch (error) {
        console.error(`Error al actualizar/crear archivo ${update.file}:`, error);
        toast({
          title: "Error",
          description: `No se pudo actualizar/crear el archivo ${update.file}`,
          variant: "destructive"
        });
      }
    }

    toast({
      title: "Cambios aplicados",
      description: "Se han aplicado los cambios a los archivos",
      duration: 3000
    });

    sounds.play('success', 0.4);
    setShowSuccessMessage(true);
  }, [files, activeFile, projectId, toast]);

  // Renderizado de la estructura de carpetas
  const renderFolderStructure = useCallback((folders: FolderStructure[]) => {
    return folders.map(folder => (
      <li key={folder.id} className="mb-1">
        <div 
          className={`flex items-center py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer ${activeFolder === folder.path ? 'bg-slate-200 dark:bg-slate-600' : ''}`}
          onClick={() => handleFolderSelect(folder.path)}
        >
          <button 
            className="w-5 h-5 flex items-center justify-center mr-1 text-slate-500"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolderExpand(folder.id);
            }}
          >
            {folder.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          <FolderIcon className={`w-4 h-4 mr-2 ${folder.isExpanded ? 'text-blue-500' : 'text-slate-400'}`} />
          <span className="text-sm truncate">{folder.name}</span>
        </div>

        {folder.isExpanded && (
          <div className="ml-4">
            {folder.files.length > 0 && (
              <ul className="mt-1 space-y-1">
                {folder.files.map(file => (
                  <li 
                    key={file.id} 
                    className={`flex items-center py-1 px-2 rounded text-sm cursor-pointer ${activeFile?.id === file.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    onClick={() => handleFileSelect(file)}
                  >
                    <div className="w-5 h-5 mr-1"></div>
                    <FileText className="w-4 h-4 mr-2 text-slate-400" />
                    <span className="truncate">{file.name}</span>
                  </li>
                ))}
              </ul>
            )}

            {folder.folders.length > 0 && (
              <ul className="mt-1">
                {renderFolderStructure(folder.folders)}
              </ul>
            )}
          </div>
        )}
      </li>
    ));
  }, [activeFile, activeFolder, handleFileSelect, handleFolderSelect, toggleFolderExpand]);

  // Componente de historial de cambios
  const HistoryComponent = () => (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <History className="w-5 h-5 mr-2" />
        Historial de cambios
      </h2>

      {fileChangesHistory.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border rounded-lg p-6 bg-slate-50 dark:bg-slate-800">
          <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg mb-1">Sin historial</p>
          <p className="text-sm">Aún no hay cambios registrados en este proyecto.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fileChangesHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).map((change, index) => (
            <div key={index} className="border rounded-md p-3 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex items-start">
                  {change.description.includes("creado") ? (
                    <Plus className="w-4 h-4 mr-2 mt-0.5 text-green-500" />
                  ) : change.description.includes("actualizado") ? (
                    <Save className="w-4 h-4 mr-2 mt-0.5 text-blue-500" />
                  ) : change.description.includes("importado") ? (
                    <GitBranch className="w-4 h-4 mr-2 mt-0.5 text-purple-500" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2 mt-0.5 text-amber-500" />
                  )}
                  <div>
                    <div className="font-medium">{change.description}</div>
                    <div className="text-sm text-slate-500">{change.filename}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {change.timestamp.toLocaleTimeString()} - {change.timestamp.toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Componentes para la barra lateral
  const SidebarFiles = () => (
    <div className="h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-2 p-2">
        <h3 className="text-sm font-medium">Archivos</h3>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            title="Nueva carpeta"
            onClick={() => setShowNewFolderDialog(true)}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            title="Nuevo archivo"
            onClick={() => setShowNewFileDialog(true)}
          >
            <FilePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoadingFiles ? (
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <ul className="space-y-1 p-2">
          {renderFolderStructure(folderStructure)}
        </ul>
      )}

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva carpeta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="folderName"
                placeholder="Nombre de la carpeta"
                className="col-span-4"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateFolder}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo archivo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Input
                id="fileName"
                placeholder="Nombre del archivo (con extensión)"
                className="col-span-4"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateFile}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const SidebarDocuments = () => (
    <div className="h-full overflow-y-auto p-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Documentos</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8" 
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Subir
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={(e) => handleDocumentUpload(e.target.files)}
        />
      </div>

      {uploadedDocuments.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay documentos cargados</p>
          <p className="text-xs mt-1">Sube documentos para usarlos con el asistente</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {uploadedDocuments.map((doc, index) => (
            <li key={index} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-500" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[180px]">{doc.name}</p>
                  <p className="text-xs text-slate-500">{(doc.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const SidebarRepository = () => (
    <div className="h-full overflow-y-auto p-2">
      <h3 className="text-sm font-medium mb-4">Importar Repositorio</h3>

      <div className="space-y-4">
        <div>
          <label htmlFor="repoUrl" className="block text-sm mb-1">URL del Repositorio</label>
          <Input
            id="repoUrl"
            placeholder="https://github.com/usuario/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </div>

        <Button 
          className="w-full" 
          onClick={handleImportFromRepo}
          disabled={isLoadingRepo}
        >
          {isLoadingRepo ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Importando...
            </>
          ) : (
            <>
              <GitBranch className="h-4 w-4 mr-2" />
              Importar Repositorio
            </>
          )}
        </Button>

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-2">Repositorios Recientes</h4>
          <ul className="space-y-2">
            <li className="text-sm text-slate-500">No hay repositorios recientes</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const SidebarProjects = () => (
    <div className="h-full overflow-y-auto p-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Proyectos</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8" 
          onClick={() => setNewProjectName(project?.name ? `Copia de ${project.name}` : "Nuevo Proyecto")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo
        </Button>
      </div>

      {newProjectName && (
        <div className="mb-4 p-3 border rounded-md bg-slate-50 dark:bg-slate-800">
          <Input
            placeholder="Nombre del proyecto"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="mb-2"
          />
          <div className="flex justify-end space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setNewProjectName("")}
            >
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleCreateProject}
            >
              Crear
            </Button>
          </div>
        </div>
      )}

      {isLoadingProjects ? (
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : userProjects.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay proyectos</p>
          <p className="text-xs mt-1">Crea un nuevo proyecto para comenzar</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {userProjects.map(proj => (
            <li 
              key={proj.id} 
              className={`p-2 rounded cursor-pointer ${proj.id === projectId ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              onClick={() => handleSwitchProject(proj.id!)}
            >
              <div className="flex items-center">
                <FolderOpen className={`h-4 w-4 mr-2 ${proj.id === projectId ? 'text-blue-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-sm font-medium">{proj.name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(proj.createdAt!).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // Componente para la navegación de la barra lateral
  const SidebarNavigation = () => (
    <div className="border-b dark:border-slate-700 mb-2">
      <Tabs 
        value={sidebarTab} 
        onValueChange={(value) => setSidebarTab(value as any)}
        className="w-full"
      >
        <TabsList className="w-full grid grid-cols-4 h-10">
          <TabsTrigger 
            value="files" 
            className="text-xs px-1 py-1 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700"
            title="Archivos"
          >
            <FileText className="h-4 w-4" />
            {!isMobile && <span className="ml-1">Archivos</span>}
          </TabsTrigger>
          <TabsTrigger 
            value="documents" 
            className="text-xs px-1 py-1 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700"
            title="Documentos"
          >
            <Upload className="h-4 w-4" />
            {!isMobile && <span className="ml-1">Docs</span>}
          </TabsTrigger>
          <TabsTrigger 
            value="repository" 
            className="text-xs px-1 py-1 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700"
            title="Repositorio"
          >
            <GitBranch className="h-4 w-4" />
            {!isMobile && <span className="ml-1">Repo</span>}
          </TabsTrigger>
          <TabsTrigger 
            value="projects" 
            className="text-xs px-1 py-1 data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-700"
            title="Proyectos"
          >
            <FolderOpen className="h-4 w-4" />
            {!isMobile && <span className="ml-1">Proyectos</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );

  // Floating Action Button para móviles
  const FloatingActionButton = () => {
    if (!isMobile || !showFloatingActions) return null;

    return (
      <>
        {/* Botón principal */}
        <button
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${showMobileMenu ? 'rotate-45' : ''}`}
          onClick={toggleMobileMenu}
        >
          {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* Menú flotante */}
        {showMobileMenu && (
          <div className="fixed bottom-24 right-6 z-50 flex flex-col space-y-3 items-end">
            {/* Botón para mostrar/ocultar sidebar */}
            <div className="flex items-center">
              <span className="bg-slate-800 text-white text-sm py-1 px-3 rounded-l-md shadow-md">
                Explorador
              </span>
              <button
                className="w-10 h-10 rounded-full bg-slate-800 text-white shadow-md flex items-center justify-center"
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  setShowMobileMenu(false);
                }}
              >
                <PanelLeft className="h-5 w-5" />
              </button>
              </button>
            </div>

            {/* Botón para vista previa */}
            <div className="flex items-center">
              <span className="bg-slate-800 text-white text-sm py-1 px-3 rounded-l-md shadow-md">
                Vista previa
              </span>
              <button
                className="w-10 h-10 rounded-full bg-slate-800 text-white shadow-md flex items-center justify-center"
                onClick={() => {
                  setActiveTab("preview");
                  setShowMobileMenu(false);
                }}
              >
                <Play className="h-5 w-5" />
              </button>
            </div>

            {/* Botón para asistente */}
            <div className="flex items-center">
              <span className="bg-slate-800 text-white text-sm py-1 px-3 rounded-l-md shadow-md">
                Asistente
              </span>
              <button
                className="w-10 h-10 rounded-full bg-slate-800 text-white shadow-md flex items-center justify-center"
                onClick={() => {
                  setActiveTab("assistant-chat");
                  setShowMobileMenu(false);
                }}
              >
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>

            {/* Botón para configuración */}
            <div className="flex items-center">
              <span className="bg-slate-800 text-white text-sm py-1 px-3 rounded-l-md shadow-md">
                Opciones
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-10 h-10 rounded-full bg-slate-800 text-white shadow-md flex items-center justify-center"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setActiveTab("development")}>
                    Desarrollo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("console")}>
                    Consola
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("deployment")}>
                    Despliegue
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("resources")}>
                    Recursos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("packages")}>
                    Paquetes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("history")}>
                    Historial
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </>
    );
  };

  // Renderizado principal
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      <Header 
        title={project?.name || "Cargando..."}
        onBackClick={handleBackToHome}
        loading={isLoadingProject}
      />

      <SidebarProvider>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            className={`border-r dark:border-slate-700 ${isSidebarCollapsed ? 'w-0 md:w-12' : 'w-full md:w-64'} transition-all duration-300 ${isMobile ? 'absolute z-40 h-[calc(100%-4rem)] bg-white dark:bg-slate-900' : ''}`}
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center p-2">
                <h2 className={`text-sm font-semibold ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                  Explorador
                </h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7" 
                  onClick={toggleSidebar}
                  title={isSidebarCollapsed ? "Expandir" : "Colapsar"}
                >
                  {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>

              {!isSidebarCollapsed && (
                <>
                  <SidebarNavigation />

                  <div className="flex-1 overflow-hidden">
                    {sidebarTab === "files" && <SidebarFiles />}
                    {sidebarTab === "documents" && <SidebarDocuments />}
                    {sidebarTab === "repository" && <SidebarRepository />}
                    {sidebarTab === "projects" && <SidebarProjects />}
                  </div>
                </>
              )}
            </div>
          </Sidebar>

          <SidebarContent className="flex-1 overflow-hidden">
            <div className="flex flex-col h-full">
              <div className="border-b dark:border-slate-700">
                <Tabs 
                  value={activeTab} 
                  onValueChange={(value) => setActiveTab(value as any)}
                  className="w-full"
                >
                  <TabsList className="h-10 w-full justify-start overflow-x-auto">
                    <TabsTrigger value="development" className="text-xs flex items-center">
                      <Code className="h-4 w-4 mr-1.5 text-blue-500" />
                      Desarrollo
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="text-xs flex items-center">
                      <Play className="h-4 w-4 mr-1.5 text-green-500" />
                      Vista Previa
                    </TabsTrigger>
                    <TabsTrigger value="console" className="text-xs flex items-center">
                      <Terminal className="h-4 w-4 mr-1.5 text-amber-500" />
                      Consola
                    </TabsTrigger>
                    <TabsTrigger value="deployment" className="text-xs flex items-center">
                      <Globe className="h-4 w-4 mr-1.5 text-cyan-500" />
                      Despliegue
                    </TabsTrigger>
                    <TabsTrigger value="assistant-chat" className="text-xs flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1.5 text-purple-500" />
                      Asistente
                    </TabsTrigger>
                    <TabsTrigger value="resources" className="text-xs flex items-center">
                      <BookOpen className="h-4 w-4 mr-1.5 text-orange-500" />
                      Recursos
                    </TabsTrigger>
                    <TabsTrigger value="packages" className="text-xs flex items-center">
                      <Package className="h-4 w-4 mr-1.5 text-indigo-500" />
                      Paquetes
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs flex items-center">
                      <History className="h-4 w-4 mr-1.5 text-teal-500" />
                      Historial
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex-1 overflow-hidden">
                {activeTab === "development" && (
                  <div className="h-full flex flex-col">
                    {activeFile ? (
                      <CodeEditor 
                        file={activeFile} 
                        onSave={(updatedFile) => {
                          setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
                          setActiveFile(updatedFile);

                          // Añadir al historial
                          setFileChangesHistory(prev => [...prev, {
                            timestamp: new Date(),
                            filename: updatedFile.name,
                            description: "Archivo actualizado manualmente"
                          }]);
                        }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                          <h3 className="text-lg font-medium mb-2">No hay archivo seleccionado</h3>
                          <p className="text-sm text-slate-500 max-w-md">
                            Selecciona un archivo del explorador o crea uno nuevo para comenzar a editar.
                          </p>
                          <Button 
                            className="mt-4" 
                            onClick={() => setShowNewFileDialog(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Crear archivo
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "preview" && (
                  <CodePreview 
                    projectId={projectId} 
                    files={files}
                  />
                )}

                {activeTab === "console" && (
                  <ConsoleOutput projectId={projectId} />
                )}

                {activeTab === "deployment" && (
                  <ProjectDeployment 
                    projectId={projectId} 
                    files={files}
                  />
                )}

                {activeTab === "assistant-chat" && (
                  <AssistantChat 
                    projectId={projectId}
                    files={files}
                    onApplyChanges={handleApplyChanges}
                    showSuccessMessage={showSuccessMessage}
                  />
                )}

                {activeTab === "resources" && (
                  <DevelopmentPlan 
                    projectId={projectId}
                    plan={developmentPlan}
                    onPlanChange={setDevelopmentPlan}
                  />
                )}

                {activeTab === "packages" && (
                  <PackageExplorer 
                    projectId={projectId}
                  />
                )}

                {activeTab === "history" && <HistoryComponent />}
              </div>
            </div>
          </SidebarContent>
        </div>
      </SidebarProvider>

      <StatusBar 
        projectId={projectId} 
        fileName={activeFile?.name} 
        fileType={activeFile?.type}
        onUpdatePreview={updatePreview}
      />

      {/* Botón flotante para móviles */}
      <FloatingActionButton />
    </div>
  );
};

export default Workspace;
