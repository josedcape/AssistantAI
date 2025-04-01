
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

interface DevelopmentPlanData {
  plan?: string[];
  architecture?: string;
  components?: string[];
  requirements?: string[];
}

const DevelopmentPlanPage = () => {
  const { toast } = useToast();
  const [developmentPlan, setDevelopmentPlan] = useState<DevelopmentPlanData | null>(null);
  
  // Obtener los planes de desarrollo del usuario actual
  const { data: plansData, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['/api/development-plans'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/development-plans');
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  useEffect(() => {
    if (plansData && plansData.length > 0) {
      // Usar el plan más reciente por defecto
      setDevelopmentPlan(plansData[0]);
    }
  }, [plansData]);
  
  // Función para exportar el plan de desarrollo
  const exportPlan = () => {
    if (!developmentPlan) return;
    
    try {
      // Crear el contenido del archivo
      let content = "# PLAN DE DESARROLLO\n\n";
      
      if (developmentPlan.architecture) {
        content += "## ARQUITECTURA\n\n";
        content += developmentPlan.architecture + "\n\n";
      }
      
      if (developmentPlan.plan && developmentPlan.plan.length > 0) {
        content += "## PASOS DEL PLAN\n\n";
        developmentPlan.plan.forEach((step, index) => {
          content += `${index + 1}. ${step}\n`;
        });
        content += "\n";
      }
      
      if (developmentPlan.components && developmentPlan.components.length > 0) {
        content += "## COMPONENTES\n\n";
        developmentPlan.components.forEach(component => {
          content += `- ${component}\n`;
        });
        content += "\n";
      }
      
      if (developmentPlan.requirements && developmentPlan.requirements.length > 0) {
        content += "## REQUERIMIENTOS TÉCNICOS\n\n";
        developmentPlan.requirements.forEach(req => {
          content += `- ${req}\n`;
        });
      }
      
      // Crear blob y enlace de descarga
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plan_desarrollo.md";
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "Plan exportado",
        description: "El plan de desarrollo se ha descargado correctamente.",
      });
    } catch (error) {
      console.error("Error al exportar el plan:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar el plan de desarrollo.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Plan de Desarrollo</h1>
          
          {developmentPlan && (
            <Button onClick={exportPlan}>
              <i className="ri-download-line mr-2"></i>
              Exportar Plan
            </Button>
          )}
        </div>
        
        {!plansData || plansData.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <i className="ri-file-list-3-line text-slate-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-medium mb-2">No hay planes de desarrollo</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Para generar un plan de desarrollo, ve al espacio de trabajo y genera código con IA.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Plan actual</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Este es el plan de desarrollo más reciente generado por la IA.
                </p>
              </div>
              
              {developmentPlan && (
                <Accordion type="single" collapsible defaultValue="plan" className="space-y-4">
                  {developmentPlan.architecture && (
                    <AccordionItem value="architecture" className="border rounded-md">
                      <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-md">
                        <div className="flex items-center">
                          <i className="ri-building-line mr-2 text-primary-500"></i>
                          <span>Arquitectura</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-b-md">
                        <div className="pl-6 py-2 whitespace-pre-wrap">
                          {developmentPlan.architecture}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  {developmentPlan.plan && developmentPlan.plan.length > 0 && (
                    <AccordionItem value="plan" className="border rounded-md">
                      <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-md">
                        <div className="flex items-center">
                          <i className="ri-list-check mr-2 text-primary-500"></i>
                          <span>Pasos del Plan</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-b-md">
                        <ol className="space-y-3 list-decimal pl-10 py-1">
                          {developmentPlan.plan.map((step, idx) => (
                            <li key={idx} className="text-slate-700 dark:text-slate-300">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  {developmentPlan.components && developmentPlan.components.length > 0 && (
                    <AccordionItem value="components" className="border rounded-md">
                      <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-md">
                        <div className="flex items-center">
                          <i className="ri-shape-line mr-2 text-primary-500"></i>
                          <span>Componentes</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-b-md">
                        <ul className="space-y-2 list-disc pl-10 py-1">
                          {developmentPlan.components.map((component, idx) => (
                            <li key={idx} className="text-slate-700 dark:text-slate-300">
                              {component}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  {developmentPlan.requirements && developmentPlan.requirements.length > 0 && (
                    <AccordionItem value="requirements" className="border rounded-md">
                      <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-md">
                        <div className="flex items-center">
                          <i className="ri-file-list-3-line mr-2 text-primary-500"></i>
                          <span>Requerimientos Técnicos</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-b-md">
                        <ul className="space-y-2 list-disc pl-10 py-1">
                          {developmentPlan.requirements.map((req, idx) => (
                            <li key={idx} className="text-slate-700 dark:text-slate-300">
                              {req}
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DevelopmentPlanPage;
