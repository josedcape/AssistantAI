import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { SidebarProvider } from "@/components/ui/sidebar";


const Workspace: React.FC = () => {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<"development" | "preview" | "console" | "deployment" | "assistant-chat" | "resources" | "packages">("development");
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [showAgentsSelector, setShowAgentsSelector] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);


  const [developmentPlan, setDevelopmentPlan] = useState<{
    plan?: string[];
    architecture?: string;
    components?: string[];
    requirements?: string[];
  } | null>(null);

  const { data: project, isLoading: isLoadingProject, error: projectError } = useQuery<Project>({
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
    data: agentsData,
    isLoading: isLoadingAgents,
    error: agentsError
  } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  useEffect(() => {
    if (agentsData) {
      setAvailableAgents(agentsData);
    }
  }, [agentsData]);

  useEffect(() => {
    if (filesData) {
      setFiles(filesData);
      if (!activeFile && filesData.length > 0) {
        setActiveFile(filesData[0]);
      }
    }
  }, [filesData, activeFile]);

  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const handleBackToHome = () => {
    navigate("/");
  };

  const handleFileSelect = (file: File) => {
    setActiveFile(file);
    if (isMobile) {
      setActiveTab("development");
    }
  };

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
      const language = activeFile ? getLanguageFromFileType(activeFile.type) : undefined;

      if (isNaN(projectId)) {
        toast({
          title: "Error",
          description: "ID de proyecto inválido. Por favor recarga la página.",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      const requestPayload: any = {
        prompt: aiPrompt,
        language,
        projectId: Number(projectId)
      };

      if (selectedAgents.length > 0) {
        requestPayload.agents = selectedAgents;
      }

      const response = await apiRequest("POST", "/api/generate", requestPayload);
      const result: CodeGenerationResponse = await response.json();

      if (result.plan || result.architecture || result.components || result.requirements) {
        const newPlan = {
          plan: result.plan || [],
          architecture: result.architecture || "",
          components: result.components || [],
          requirements: result.requirements || []
        };
        setDevelopmentPlan(newPlan);

        if (projectId && !isNaN(Number(projectId))) {
          try {
            await apiRequest("POST", "/api/development-plans", {
              ...newPlan,
              projectId: Number(projectId)
            }).catch(err => console.error("No se pudo guardar el plan:", err));
          } catch (error) {
            console.error("Error al guardar el plan de desarrollo:", error);
          }
        }

        toast({
          title: "Plan de desarrollo creado",
          description: "Se ha generado un plan de desarrollo para tu aplicación.",
          duration: 5000
        });
      }

      if (result.files && result.files.length > 0) {
        if (isNaN(projectId)) {
          toast({
            title: "Error",
            description: "ID de proyecto inválido. No se pueden crear archivos.",
            variant: "destructive"
          });
          setIsGenerating(false);
          return;
        }

        const validProjectId = Number(projectId);
        for (const file of result.files) {
          try {
            await apiRequest("POST", `/api/projects/${validProjectId}/files`, {
              name: file.name,
              content: file.content,
              type: file.type || getFileLanguage(file.name)
            });
          } catch (error) {
            console.error(`Error creating file ${file.name}:`, error);
            toast({
              title: `Error al crear ${file.name}`,
              description: "No se pudo crear el archivo. Inténtalo de nuevo.",
              variant: "destructive"
            });
          }
        }

        const filesResult = await refetchFiles();
        const updatedFiles = filesResult.data || [];
        const htmlFile = updatedFiles.find((f: File) => f.type === 'html');
        const jsFile = updatedFiles.find((f: File) => f.type === 'javascript');

        if (htmlFile) {
          setActiveFile(htmlFile);
        } else if (jsFile) {
          setActiveFile(jsFile);
        } else if (updatedFiles.length > 0) {
          setActiveFile(updatedFiles[0]);
        }
      } else if (activeFile && result.code) {
        const updateResponse = await apiRequest("PUT", `/api/files/${activeFile.id}`, {
          content: result.code
        });
        const updatedFile = await updateResponse.json();
        setFiles(files.map(file => file.id === activeFile.id ? updatedFile : file));
        setActiveFile(updatedFile);
      } else if (result.code) {
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
        await refetchFiles();
        setActiveFile(newFile);
      }

      setShowSuccessMessage(true);
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

  const selectQuickPrompt = (prompt: string) => {
    setAiPrompt(prompt);
  };

  useEffect(() => {
    sounds.play('laser', 0.4);
  }, []);

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
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex flex-col h-screen">
        <Header />
        <main className="flex-1 flex">
          <div className="flex-1 flex flex-col">
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (project && activeFile) {
                        toast({
                          title: "Proyecto guardado",
                          description: "Los cambios se han guardado localmente",
                        });
                      }
                    }}
                    className="ml-auto"
                  >
                    <i className="ri-save-line mr-1"></i>
                    Guardar
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">
                  <div className="flex overflow-x-auto scrollbar-hide space-x-1 sm:space-x-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList>
                        <TabsTrigger value="development" className="flex items-center gap-1.5">
                          <i className="ri-code-s-slash-line text-blue-500"></i>Desarrollo
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="flex items-center gap-1.5">
                          <i className="ri-eye-2-line text-green-500"></i>Vista Previa
                        </TabsTrigger>
                        <TabsTrigger value="console" className="flex items-center gap-1.5">
                          <i className="ri-terminal-box-line text-purple-500"></i>Consola
                        </TabsTrigger>
                        <TabsTrigger value="deployment" className="flex items-center gap-1.5">
                          <i className="ri-rocket-line text-red-500"></i>Despliegue
                        </TabsTrigger>
                        <TabsTrigger value="assistant-chat" className="flex items-center gap-1.5">
                          <i className="ri-robot-line text-amber-500"></i>Asistente
                        </TabsTrigger>
                        {!isMobile && (
                          <TabsTrigger value="resources" className="flex items-center gap-1.5">
                            <i className="ri-stack-line text-teal-500"></i>Recursos
                          </TabsTrigger>
                        )}
                        {!isMobile && (
                          <TabsTrigger value="packages" className="flex items-center gap-1.5">
                            <i className="ri-package-line text-indigo-500"></i>Paquetes
                          </TabsTrigger>
                        )}
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="flex">
                    {developmentPlan && (
                      <div className="flex items-center">
                        <button 
                          className="p-2 text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none relative"
                          onClick={() => setDevelopmentPlan(null)}
                          title="Ver plan de desarrollo"
                        >
                          <i className="ri-file-list-line text-lg"></i>
                          <span className="absolute top-0 right-0 w-2 h-2 bg-primary-500 rounded-full"></span>
                        </button>
                        <a
                          href="/development-plan"
                          className="p-2 text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none"
                          title="Ver todos los planes de desarrollo"
                        >
                          <i className="ri-folder-chart-line text-lg"></i>
                        </a>
                      </div>
                    )}
                    <button 
                      className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none"
                      onClick={() => {
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

                                const cssMap = {};
                                cssFiles.forEach(f => { cssMap[f.name] = f.content; });

                                const jsMap = {};
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
                      }}
                      title="Ver aplicación"
                    >
                      <i className="ri-play-circle-line text-lg"></i>
                    </button>
                    <a 
                      href={isNaN(projectId) || projectId <= 0 ? "#" : `/api/projects/${Number(projectId)}/preview`}
                      target="_blank"
                      className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none"
                      title="Abrir en nueva pestaña"
                      onClick={(e) => {
                        if (isNaN(projectId) || projectId <= 0) {
                          e.preventDefault();
                          toast({
                            title: "Error",
                            description: "ID de proyecto inválido. No se puede abrir la vista previa.",
                            variant: "destructive"
                          });
                        } else {
                          console.log("Abriendo vista previa para el proyecto:", projectId);
                        }
                      }}
                    >
                      <i className="ri-share-line text-lg"></i>
                    </a>
                    <button className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none">
                      <i className="ri-more-2-line text-lg"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden">
                <div className={`${(!isMobile || (isMobile && activeTab === "files")) ? 'block' : 'hidden'} bg-white dark:bg-slate-800 w-64 border-r border-slate-200 dark:border-slate-700 overflow-y-auto shadow-md`}>
                  <div className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-2 px-3 z-10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Explorador</h3>
                      {isMobile && (
                        <button 
                          onClick={() => setActiveTab("development")}
                          className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                        >
                          <i className="ri-arrow-left-line"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {activeTab === "files" && (
                    <div className="h-full">
                      <FileExplorer
                        projectId={projectId}
                        files={files}
                        onFileSelect={handleFileSelect}
                        onFilesUpdate={refetchFiles}
                      />
                    </div>
                  )}
                  {activeTab === "packages" && (
                    <div className="h-full">
                      <PackageExplorer projectId={projectId} />
                    </div>
                  )}
                  {activeTab === "assistant-chat" && (
                    <div className="h-full">
                      {/* Placeholder for assistant chat content */}
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
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
                          className="rounded-l-none bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-300"
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
                        <div className="flex justify-between">
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

                          <button
                            className="px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800 flex items-center text-xs"
                            onClick={() => setShowAgentsSelector(!showAgentsSelector)}
                          >
                            <i className="ri-robot-line mr-1"></i>
                            {selectedAgents.length > 0 ? `${selectedAgents.length} agentes` : "Agentes"}
                            <i className={`ri-arrow-${showAgentsSelector ? 'up' : 'down'}-s-line ml-1`}></i>
                          </button>
                        </div>

                        {showAgentsSelector && (
                          <div className="mt-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-md">
                            <h4 className="text-sm font-medium mb-2">Selecciona agentes especializados</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                              Los agentes se encargarán de generar componentes específicos de tu aplicación.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                              {availableAgents.map((agent) => (
                                <div 
                                  key={agent.name}
                                  className="flex items-start"
                                >
                                  <input
                                    type="checkbox"
                                    id={`agent-${agent.name}`}
                                    checked={selectedAgents.includes(agent.name)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedAgents(prevAgents => [...prevAgents, agent.name]);
                                      } else {
                                        setSelectedAgents(prevAgents => prevAgents.filter(name => name !== agent.name));
                                      }
                                    }}
                                    className="mr-2 mt-1"
                                  />
                                  <div>
                                    <label 
                                      htmlFor={`agent-${agent.name}`}
                                      className="text-sm font-medium cursor-pointer"
                                    >
                                      {agent.description}
                                    </label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      {agent.functions.length} funciones
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {selectedAgents.length > 0 && (
                              <div className="mt-3 flex justify-end">
                                <button
                                  className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                                  onClick={() => setSelectedAgents([])}
                                >
                                  Limpiar selección
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex">
                    {activeTab === "development" && activeFile && (
                      <CodeEditor 
                        file={activeFile}
                        onUpdate={(updatedFile) => {
                          setFiles(files.map(file => file.id === updatedFile.id ? updatedFile : file));
                          setActiveFile(updatedFile);
                        }} 
                      />
                    )}

                    {activeTab === "preview" && activeFile && (
                      <CodePreview 
                        file={activeFile}
                        allFiles={files}
                      />
                    )}

                    {activeTab === "console" && (
                      <ConsoleOutput 
                        projectId={projectId}
                        activeFileId={activeFile?.id}
                      />
                    )}

                    {activeTab === "deployment" && (
                      <div className="flex-1 flex flex-col">
                        <ProjectDeployment 
                          projectId={projectId} 
                          files={files} 
                          refreshFiles={refetchFiles}
                        />
                      </div>
                    )}

                    {activeTab === "assistant-chat" && (
                      <div className="flex-1 flex flex-col">
                        <AssistantChat
                          projectId={projectId}
                          onApplyChanges={(fileUpdates) => {
                            fileUpdates.forEach(async (update) => {
                              const existingFile = files.find(f => f.name === update.file);
                              if (existingFile) {
                                try {
                                  const response = await apiRequest("PUT", `/api/files/${existingFile.id}`, { content: update.content });
                                  const updatedFile = await response.json();
                                  setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
                                  if (activeFile && activeFile.id === updatedFile.id) {
                                    setActiveFile(updatedFile);
                                  }
                                  toast({ title: "Archivo actualizado", description: `${update.file} ha sido actualizado` });
                                } catch (error) {
                                  console.error("Error updating file:", error);
                                  toast({ title: "Error", description: "No se pudo actualizar el archivo", variant: "destructive" });
                                }
                              } else {
                                try {
                                  const extension = update.file.split('.').pop()?.toLowerCase();
                                  let fileType = "text";
                                  if (extension === "js") fileType = "javascript";
                                  else if (extension === "html") fileType = "html";
                                  else if (extension === "css") fileType = "css";
                                  else if (extension === "json") fileType = "json";
                                  else if (extension === "md") fileType = "markdown";
                                  else if (extension === "ts" || extension === "tsx") fileType = "typescript";
                                  const response = await apiRequest("POST", `/api/projects/${projectId}/files`, { name: update.file, content: update.content, type: fileType });
                                  const newFile = await response.json();
                                  setFiles(prev => [...prev, newFile]);
                                  toast({ title: "Archivo creado", description: `${update.file} ha sido creado` });
                                } catch (error) {
                                  console.error("Error creating file:", error);
                                  toast({ title: "Error", description: "No se pudo crear el archivo", variant: "destructive" });
                                }
                              }
                            });
                          }}
                        />
                      </div>
                    )}


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
                  <StatusBar activeFile={activeFile || undefined} projectName={project?.name} />
                </div>
              </div>
            </main>
            {showSuccessMessage && developmentPlan && (
              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 shadow-lg rounded-lg px-6 py-4 flex items-center z-50 border border-green-200 dark:border-green-900">
                <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-full p-2 mr-4">
                  <i className="ri-check-line text-green-600 dark:text-green-300 text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">¡Código generado con éxito!</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Se ha creado un plan para la construcción de tu aplicación.</p>
                </div>
                <div className="ml-4">
                  <Button
                    onClick={() => {
                      setShowSuccessMessage(false);
                      setDevelopmentPlan(developmentPlan);
                    }}
                  >
                    <i className="ri-eye-line mr-2"></i>
                    Ver plan
                  </Button>
                  <button 
                    className="ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                    onClick={() => setShowSuccessMessage(false)}
                    aria-label="Cerrar"
                  >
                    <i className="ri-close-line text-lg"></i>
                  </button>
                </div>
              </div>
            )}

            {developmentPlan && !showSuccessMessage && (
              <DevelopmentPlan
                plan={developmentPlan.plan}
                architecture={developmentPlan.architecture}
                components={developmentPlan.components}
                requirements={developmentPlan.requirements}
                onClose={() => setDevelopmentPlan(null)}
              />
            )}

            {isMobile && (
              <div className="md:hidden fixed bottom-5 right-5 z-50">
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
                  <div className="relative">
                    <button
                      className="w-14 h-14 rounded-full shadow-lg bg-primary-500 text-white flex items-center justify-center focus:outline-none"
                      onClick={() => setShowSidebar(!showSidebar)}
                      title="Menú de navegación"
                    >
                      <i className="ri-menu-line text-xl"></i>
                    </button>
                    {showSidebar && (
                      <div className="absolute bottom-16 right-0 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="py-1">
                          <button
                            onClick={() => {setActiveTab("development"); setShowSidebar(false);}}
                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                          >
                            <i className="ri-code-s-slash-line text-blue-500 mr-2"></i>
                            Desarrollo
                          </button>
                          <button 
                            onClick={() => {setActiveTab("preview"); setShowSidebar(false);}}
                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                          >
                            <i className="ri-eye-2-line text-green-500 mr-2"></i>
                            Vista Previa
                          </button>
                          <button
                            onClick={() => {setActiveTab("console"); setShowSidebar(false);}}
                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                          >
                            <i className="ri-terminal-box-line text-purple-500 mr-2"></i>
                            Consola
                          </button>
                          <button
                            onClick={() => {setActiveTab("deployment"); setShowSidebar(false);}}
                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                          >
                            <i className="ri-rocket-line text-red-500 mr-2"></i>
                            Despliegue
                          </button>
                          <button
                            onClick={() => {setActiveTab("assistant-chat"); setShowSidebar(false);}}
                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                          >
                            <i className="ri-robot-line text-amber-500 mr-2"></i>
                            Asistente
                          </button>
                          <button
                            onClick={() => {setActiveTab("packages"); setShowSidebar(false);}}
                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center"
                          >
                            <i className="ri-package-line mr-2"></i>
                            Paquetes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    className="w-14 h-14 rounded-full shadow-lg bg-blue-500 text-white flex items-center justify-center focus:outline-none"
                    onClick={() => setShowFileExplorer(!showFileExplorer)}
                    title="Mostrar/Ocultar explorador de archivos"
                  >
                    <i className="ri-file-list-3-line text-xl"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarProvider>
    );
  };

  export default Workspace;