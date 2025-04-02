
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Project } from "@shared/schema";

interface ProjectDeploymentProps {
  projectId: number;
  files: any[];
  refreshFiles: () => void;
}

export function ProjectDeployment({ projectId, files, refreshFiles }: ProjectDeploymentProps) {
  const { toast } = useToast();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'deployed' | 'error'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("preview");
  
  // Verificar si hay un despliegue activo al cargar el componente
  useEffect(() => {
    checkDeploymentStatus();
  }, [projectId]);

  // Función para verificar el estado del despliegue
  const checkDeploymentStatus = async () => {
    try {
      const response = await apiRequest("GET", `/api/projects/${projectId}/preview?status=true`);
      const data = await response.json();
      
      if (data.deployed) {
        setDeploymentStatus('deployed');
        setDeploymentUrl(`/api/projects/${projectId}/preview`);
      }
    } catch (error) {
      console.error("Error checking deployment status:", error);
    }
  };

  // Función para desplegar el proyecto
  const deployProject = async () => {
    if (!files || files.length === 0) {
      toast({
        title: "Error",
        description: "El proyecto no tiene archivos para desplegar",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsDeploying(true);
      setDeploymentStatus('deploying');
      setLogs(prev => [...prev, "Iniciando despliegue del proyecto..."]);

      // Verificar si hay archivos HTML en el proyecto
      const hasHtmlFile = files.some(file => file.type === 'html' || file.name.toLowerCase().endsWith('.html'));
      
      if (!hasHtmlFile) {
        setLogs(prev => [...prev, "⚠️ Advertencia: No se encontraron archivos HTML en el proyecto"]);
      }

      // Solicitar el despliegue al servidor
      const response = await apiRequest("POST", `/api/projects/${projectId}/deploy`, {
        forceRebuild: true
      });

      const result = await response.json();
      
      if (result.success) {
        setDeploymentStatus('deployed');
        setDeploymentUrl(`/api/projects/${projectId}/preview`);
        setLogs(prev => [...prev, "✅ Proyecto desplegado correctamente"]);
        
        toast({
          title: "Despliegue exitoso",
          description: "El proyecto ha sido desplegado y está listo para visualizarse",
        });
      } else {
        throw new Error(result.message || "Error en el despliegue");
      }
    } catch (error) {
      console.error("Error deploying project:", error);
      setDeploymentStatus('error');
      setLogs(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : "Error desconocido"}`]);
      
      toast({
        title: "Error de despliegue",
        description: "No se pudo desplegar el proyecto. Intente nuevamente.",
        variant: "destructive"
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Despliegue del Proyecto</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              deploymentStatus === 'idle' ? 'bg-slate-400' : 
              deploymentStatus === 'deploying' ? 'bg-yellow-400 animate-pulse' : 
              deploymentStatus === 'deployed' ? 'bg-green-500' : 
              'bg-red-500'
            }`}></div>
            <span className="text-sm">
              {deploymentStatus === 'idle' ? 'No desplegado' : 
               deploymentStatus === 'deploying' ? 'Desplegando...' : 
               deploymentStatus === 'deployed' ? 'Desplegado' : 
               'Error'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={deployProject}
            disabled={isDeploying}
            className="flex items-center gap-2"
          >
            {isDeploying ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                Desplegando...
              </>
            ) : (
              <>
                <i className="ri-rocket-line"></i>
                Desplegar Proyecto
              </>
            )}
          </Button>
          {deploymentUrl && (
            <Button 
              variant="outline"
              onClick={() => window.open(deploymentUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <i className="ri-external-link-line"></i>
              Abrir en Nueva Pestaña
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={refreshFiles}
            className="flex items-center gap-2"
          >
            <i className="ri-refresh-line"></i>
            Actualizar Archivos
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <TabsList className="px-4">
            <TabsTrigger value="preview" className="flex items-center gap-1.5">
              <i className="ri-eye-line text-green-500"></i>Vista Previa
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5">
              <i className="ri-terminal-line text-purple-500"></i>Logs
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-1.5">
              <i className="ri-settings-line text-blue-500"></i>Configuración
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="flex-1 p-0 m-0">
          {deploymentUrl ? (
            <iframe 
              src={deploymentUrl}
              className="w-full h-full border-0"
              title="Vista previa del proyecto"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900">
              <div className="text-center max-w-md p-6">
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-rocket-line text-2xl text-slate-500 dark:text-slate-400"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No hay despliegue activo</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Haz clic en "Desplegar Proyecto" para ver una vista previa en tiempo real de tu proyecto.
                </p>
                <Button onClick={deployProject} disabled={isDeploying}>
                  {isDeploying ? 'Desplegando...' : 'Desplegar Ahora'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="flex-1 p-0 m-0">
          <div className="bg-slate-900 text-slate-100 p-4 h-full overflow-auto font-mono text-sm">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> {log}
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic">No hay logs disponibles</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="config" className="flex-1 p-4 m-0 overflow-auto">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Configuración de Despliegue</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Tipo de Proyecto</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  El sistema detecta automáticamente el tipo de proyecto basado en los archivos disponibles.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                        <i className="ri-html5-line text-blue-600 dark:text-blue-400"></i>
                      </div>
                      <div>
                        <h5 className="font-medium">HTML/CSS/JS</h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Aplicaciones web estáticas
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                        <i className="ri-nodejs-line text-green-600 dark:text-green-400"></i>
                      </div>
                      <div>
                        <h5 className="font-medium">Node.js/Express</h5>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Aplicaciones web dinámicas
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Opciones de Despliegue</h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="auto-deploy" 
                      className="mr-2" 
                      checked={true}
                      onChange={() => {}}
                    />
                    <label htmlFor="auto-deploy" className="text-sm">
                      Desplegar automáticamente al guardar cambios
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="enable-logs" 
                      className="mr-2" 
                      checked={true}
                      onChange={() => {}}
                    />
                    <label htmlFor="enable-logs" className="text-sm">
                      Habilitar logs detallados
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Información sobre el Despliegue</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  El proyecto se despliega en un entorno aislado dentro de la plataforma, permitiendo
                  la ejecución del código en un entorno controlado. Los cambios en los archivos se 
                  reflejarán automáticamente en la vista previa después de cada despliegue.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProjectDeployment;
