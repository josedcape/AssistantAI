import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { File, Project, CodeGenerationResponse } from "@shared/schema";
import { getLanguageFromFileType } from "@/lib/types";
import Header from "@/components/Header";
import FileExplorer from "@/components/FileExplorer";
import CodeEditor from "@/components/CodeEditor";
import CodePreview from "@/components/CodePreview";
import ConsoleOutput from "@/components/ConsoleOutput";
import StatusBar from "@/components/StatusBar";
import DevelopmentPlan from "@/components/DevelopmentPlan";
import { useIsMobile } from "@/hooks/use-mobile";

const Workspace = () => {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [activeTab, setActiveTab] = useState("development");
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estado para el plan de desarrollo
  const [developmentPlan, setDevelopmentPlan] = useState<{
    plan?: string[];
    architecture?: string;
    components?: string[];
    requirements?: string[];
  } | null>(null);
  
  // Fetch project details
  const { data: project, isLoading: isLoadingProject, error: projectError } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !isNaN(projectId),
  });
  
  // Fetch project files
  const { 
    data: filesData, 
    isLoading: isLoadingFiles, 
    error: filesError,
    refetch: refetchFiles
  } = useQuery<File[]>({
    queryKey: [`/api/projects/${projectId}/files`],
    enabled: !isNaN(projectId),
  });
  
  // Set up files array once data is loaded
  useEffect(() => {
    if (filesData) {
      setFiles(filesData);
      
      // Set the first file as active if none is selected
      if (!activeFile && filesData.length > 0) {
        setActiveFile(filesData[0]);
      }
    }
  }, [filesData, activeFile]);
  
  // Handle back to home button
  const handleBackToHome = () => {
    navigate("/");
  };
  
  // Handle file selection
  const handleFileSelect = (file: File) => {
    setActiveFile(file);
    
    // On mobile, switch to development tab
    if (isMobile) {
      setActiveTab("development");
    }
  };
  
  // Generate code using AI
  const generateCode = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Error",
        description: "Por favor, describe lo que quieres crear",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      
      // Get the language from the active file if any
      const language = activeFile ? getLanguageFromFileType(activeFile.type) : undefined;
      
      const response = await apiRequest("POST", "/api/generate", {
        prompt: aiPrompt,
        language,
        projectId
      });
      
      const result: CodeGenerationResponse = await response.json();
      
      // Guardar el plan de desarrollo si existe
      if (result.plan || result.architecture || result.components || result.requirements) {
        setDevelopmentPlan({
          plan: result.plan,
          architecture: result.architecture,
          components: result.components,
          requirements: result.requirements
        });
        
        // Mostrar un toast con el plan de desarrollo
        toast({
          title: "Plan de desarrollo creado",
          description: "Se ha generado un plan de desarrollo para tu aplicación.",
          duration: 5000
        });
      }
      
      // If we have an active file, update it
      if (activeFile) {
        // Update the file
        const updateResponse = await apiRequest("PUT", `/api/files/${activeFile.id}`, {
          content: result.code
        });
        
        const updatedFile = await updateResponse.json();
        
        // Update the files array
        setFiles(files.map(file => file.id === activeFile.id ? updatedFile : file));
        setActiveFile(updatedFile);
      } else {
        // Create a new file
        const fileType = result.language === "html" ? "html" : 
                        result.language === "css" ? "css" : 
                        "javascript";
        
        const fileExtension = result.language === "html" ? ".html" : 
                              result.language === "css" ? ".css" : 
                              ".js";
        
        const fileName = `generado${fileExtension}`;
        
        const createResponse = await apiRequest("POST", `/api/projects/${projectId}/files`, {
          name: fileName,
          content: result.code,
          type: fileType
        });
        
        const newFile = await createResponse.json();
        
        // Update files and set as active
        await refetchFiles();
        setActiveFile(newFile);
      }
      
      toast({
        title: "Código generado",
        description: "El código se ha generado correctamente"
      });
      
      // Clear the prompt
      setAiPrompt("");
      
    } catch (error) {
      console.error("Error generating code:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el código. Intente de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle quick prompt selection
  const selectQuickPrompt = (prompt: string) => {
    setAiPrompt(prompt);
  };
  
  if (isLoadingProject || isLoadingFiles) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  if (projectError || filesError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-xl font-bold mb-4 text-red-500">Error</h2>
          <p className="mb-6">No se pudo cargar el proyecto o sus archivos.</p>
          <Button onClick={handleBackToHome}>
            <i className="ri-arrow-left-line mr-2"></i>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          {/* Mobile toolbar with back button */}
          {isMobile && (
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2">
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleBackToHome}
                  className="mr-2"
                >
                  <i className="ri-arrow-left-line mr-1"></i>
                  Volver
                </Button>
                <h1 className="text-sm font-medium truncate">
                  {project?.name || "Proyecto"}
                </h1>
              </div>
            </div>
          )}
          
          {/* Workspace Tabs */}
          <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14">
                <div className="flex overflow-x-auto scrollbar-hide space-x-1 sm:space-x-4">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList>
                      <TabsTrigger value="development">
                        Desarrollo
                      </TabsTrigger>
                      <TabsTrigger value="preview">
                        Vista Previa
                      </TabsTrigger>
                      <TabsTrigger value="console">
                        Consola
                      </TabsTrigger>
                      {!isMobile && (
                        <TabsTrigger value="resources">
                          Recursos
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>
                </div>
                
                <div className="flex">
                  {developmentPlan && (
                    <button 
                      className="p-2 text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none relative"
                      onClick={() => setDevelopmentPlan(null)}
                      title="Ver plan de desarrollo"
                    >
                      <i className="ri-file-list-line text-lg"></i>
                      <span className="absolute top-0 right-0 w-2 h-2 bg-primary-500 rounded-full"></span>
                    </button>
                  )}
                  <button className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none">
                    <i className="ri-play-circle-line text-lg"></i>
                  </button>
                  <button className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none">
                    <i className="ri-share-line text-lg"></i>
                  </button>
                  <button className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none">
                    <i className="ri-more-2-line text-lg"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Workspace Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - hidden on mobile */}
            <div className="hidden md:block bg-white dark:bg-slate-800 w-64 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
              <FileExplorer
                projectId={projectId}
                files={files}
                onFileSelect={handleFileSelect}
                onFilesUpdate={refetchFiles}
              />
            </div>

            {/* Editor and Preview */}
            <div className="flex-1 flex flex-col">
              {/* AI code generation prompt */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <div className="flex">
                    <div className="grow relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="ri-robot-line text-primary-400"></i>
                      </div>
                      <input
                        type="text"
                        className="block w-full pl-10 pr-12 py-2 border-0 rounded-l-lg bg-white dark:bg-slate-800 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Describe lo que quieres crear..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isGenerating) {
                            generateCode();
                          }
                        }}
                      />
                    </div>
                    <Button
                      onClick={generateCode}
                      disabled={isGenerating || !aiPrompt.trim()}
                      className="rounded-l-none"
                    >
                      {isGenerating ? (
                        <>
                          <i className="ri-loader-4-line animate-spin mr-2"></i>
                          Generando...
                        </>
                      ) : "Generar"}
                    </Button>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                        onClick={() => selectQuickPrompt("Crea una app web básica con HTML, CSS y JavaScript")}
                      >
                        App web básica
                      </button>
                      <button
                        className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                        onClick={() => selectQuickPrompt("Crea un formulario de contacto con validación")}
                      >
                        Formulario de contacto
                      </button>
                      <button
                        className="px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
                        onClick={() => selectQuickPrompt("Crea una calculadora simple")}
                      >
                        Calculadora
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tab Content */}
              <div className="flex-1 flex">
                {/* Development Tab - Code Editor */}
                {activeTab === "development" && activeFile && (
                  <CodeEditor 
                    file={activeFile}
                    onUpdate={(updatedFile) => {
                      setFiles(files.map(file => file.id === updatedFile.id ? updatedFile : file));
                      setActiveFile(updatedFile);
                    }} 
                  />
                )}
                
                {/* Preview Tab */}
                {activeTab === "preview" && activeFile && (
                  <CodePreview 
                    file={activeFile}
                    allFiles={files}
                  />
                )}
                
                {/* Console Tab */}
                {activeTab === "console" && (
                  <ConsoleOutput 
                    projectId={projectId}
                    activeFileId={activeFile?.id}
                  />
                )}
                
                {/* No file selected */}
                {!activeFile && (
                  <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                    <div className="text-center p-4">
                      <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <i className="ri-file-line text-3xl text-slate-400"></i>
                      </div>
                      <h3 className="text-lg font-medium mb-2">No hay archivos abiertos</h3>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Selecciona un archivo para comenzar a editar
                      </p>
                      {isMobile && (
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab("preview")}
                        >
                          Ver archivos del proyecto
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <StatusBar activeFile={activeFile || undefined} projectName={project?.name} />
        </div>
      </main>

      {/* Plan de desarrollo modal */}
      {developmentPlan && (
        <DevelopmentPlan
          plan={developmentPlan.plan}
          architecture={developmentPlan.architecture}
          components={developmentPlan.components}
          requirements={developmentPlan.requirements}
          onClose={() => setDevelopmentPlan(null)}
        />
      )}
      
      {/* Mobile actions */}
      {isMobile && (
        <div className="md:hidden fixed bottom-5 right-5 z-10">
          <div className="flex flex-col items-end space-y-2">
            {developmentPlan && (
              <button
                className="w-14 h-14 rounded-full shadow-lg bg-primary-500 text-white flex items-center justify-center focus:outline-none"
                onClick={() => setDevelopmentPlan(null)}
                title="Ver plan de desarrollo"
              >
                <i className="ri-file-list-line text-xl"></i>
              </button>
            )}
            <button
              className="w-14 h-14 rounded-full shadow-lg gradient-bg text-white flex items-center justify-center focus:outline-none"
              onClick={() => {
                // Toggle between editor and file explorer
                if (activeTab === "development") {
                  setActiveTab("preview");
                } else {
                  setActiveTab("development");
                }
              }}
            >
              <i className={`ri-${activeTab === "development" ? "eye-line" : "edit-line"} text-xl`}></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;
