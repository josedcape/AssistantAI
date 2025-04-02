// sounds.js
export const sounds = {
  deploy: new Audio('/sounds/deploy.mp3'), // Replace with actual sound file paths
  success: new Audio('/sounds/success.mp3'),
  error: new Audio('/sounds/error.mp3'),
  click: new Audio('/sounds/click.mp3'),
  hover: new Audio('/sounds/hover.mp3'),
  play: (soundName, volume) => {
    const sound = sounds[soundName];
    if (sound) {
      sound.volume = volume;
      sound.play();
    }
  }
};


// styles.css
.futuristic-border {
  border: 2px solid rgba(0, 255, 255, 0.2); /* Example futuristic border */
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.1);
  border-radius: 10px;
}

.animate-fade-slide-up {
  animation: fade-slide-up 0.5s ease-in-out;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-in-out;
}

.animate-pulse-glow {
  animation: pulse-glow 1s ease-in-out infinite;
}

.scanline-effect {
  background-image: linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px);
  background-size: 2px 100%;
}

.hover-lift {
  transition: transform 0.2s ease-in-out;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

@keyframes fade-slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes pulse-glow {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.5);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(0, 255, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(0, 255, 255, 0);
  }
}


.animate-float {
  animation: float 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Rocket, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { sounds } from "@/lib/sounds";

interface ProjectDeploymentProps {
  projectId: string;
  projectName: string;
}

const ProjectDeployment = ({ projectId, projectName }: ProjectDeploymentProps) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<"idle" | "deploying" | "deployed" | "failed">("idle");
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    // Añadir animación cuando el componente se monta
    setAnimationClass('animate-fade-slide-up');

    return () => {
      setAnimationClass('');
    };
  }, []);

  useEffect(() => {
    // Simular progreso de despliegue
    let interval: ReturnType<typeof setInterval>;

    if (isDeploying) {
      interval = setInterval(() => {
        setDeploymentProgress(prev => {
          const newProgress = prev + (Math.random() * 15);
          return newProgress > 95 ? 95 : newProgress;
        });
      }, 500);
    } else if (deploymentStatus === "deployed") {
      setDeploymentProgress(100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDeploying, deploymentStatus]);

  const deployProject = async () => {
    setIsDeploying(true);
    setDeploymentStatus("deploying");
    setDeploymentProgress(0);

    // Reproducir sonido al iniciar despliegue
    sounds.play('deploy', 0.4);

    try {
      // Simular tiempo de despliegue
      await new Promise(resolve => setTimeout(resolve, 3500));

      const response = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Error al desplegar el proyecto");
      }

      const data = await response.json();
      setDeploymentUrl(data.deploymentUrl || `https://${projectName.toLowerCase().replace(/\s+/g, '-')}.codestorm-app.com`);
      setDeploymentStatus("deployed");

      // Reproducir sonido de éxito
      sounds.play('success', 0.4);

      toast({
        title: "¡Proyecto desplegado!",
        description: "Tu proyecto ha sido desplegado exitosamente.",
      });
    } catch (error) {
      console.error("Error desplegando el proyecto:", error);
      setDeploymentStatus("failed");

      // Reproducir sonido de error
      sounds.play('error', 0.4);

      toast({
        title: "Error al desplegar",
        description: "No se pudo desplegar el proyecto. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const copyToClipboard = () => {
    if (deploymentUrl) {
      navigator.clipboard.writeText(deploymentUrl);

      // Reproducir sonido al copiar
      sounds.play('click', 0.3);

      toast({
        title: "¡URL copiada!",
        description: "URL de despliegue copiada al portapapeles.",
      });
    }
  };

  const handleButtonHover = () => {
    sounds.play('hover', 0.1);
  };

  return (
    <Card className={`w-full futuristic-border ${animationClass}`}>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center">
          <Rocket className="mr-2 h-5 w-5 animate-float" /> Despliegue de Proyecto
        </CardTitle>
        <CardDescription>
          Despliega tu proyecto para compartirlo con otros
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {deploymentStatus === "deployed" ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500 animate-pulse-glow" />
                <span className="text-sm font-medium">Proyecto desplegado exitosamente</span>
              </div>

              {/* Barra de progreso completa */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                <div 
                  className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out animate-pulse-glow" 
                  style={{ width: '100%' }}
                ></div>
              </div>

              <div className="flex items-center mt-4">
                <Input 
                  value={deploymentUrl || ""} 
                  readOnly 
                  className="flex-1 mr-2 animate-fade-slide-up"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={copyToClipboard} 
                  title="Copiar URL"
                  className="hover-lift"
                  onMouseEnter={handleButtonHover}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="ml-2 hover-lift" 
                  onClick={() => {
                    if (deploymentUrl) {
                      sounds.play('click', 0.3);
                      window.open(deploymentUrl, '_blank');
                    }
                  }}
                  title="Abrir en nueva pestaña"
                  onMouseEnter={handleButtonHover}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isDeploying && (
                <>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span>Desplegando...</span>
                    <span>{Math.round(deploymentProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden mb-4">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-out scanline-effect" 
                      style={{ width: `${deploymentProgress}%` }}
                    ></div>
                  </div>
                </>
              )}

              <Button 
                onClick={deployProject} 
                disabled={isDeploying} 
                className="w-full hover-lift animate-pulse-glow"
                onMouseEnter={handleButtonHover}
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desplegando proyecto...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" /> Desplegar Proyecto
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectDeployment;