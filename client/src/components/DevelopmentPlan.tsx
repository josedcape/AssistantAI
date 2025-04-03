import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

interface DevelopmentPlanProps {
  plan?: string[];
  architecture?: string;
  components?: string[];
  requirements?: string[];
  onClose: () => void;
}

const DevelopmentPlan = ({ 
  plan, 
  architecture, 
  components, 
  requirements,
  onClose
}: DevelopmentPlanProps) => {
  const [expandedSection, setExpandedSection] = useState<string>("plan");
  const { toast } = useToast();

  if (!plan && !architecture && !components && !requirements) {
    return null;
  }

  // Función para exportar el plan de desarrollo
  const exportPlan = () => {
    try {
      // Crear el contenido del archivo
      let content = "# PLAN DE DESARROLLO\n\n";

      if (architecture) {
        content += "## ARQUITECTURA\n\n";
        content += architecture + "\n\n";
      }

      if (plan && plan.length > 0) {
        content += "## PASOS DEL PLAN\n\n";
        plan.forEach((step, index) => {
          content += `${index + 1}. ${step}\n`;
        });
        content += "\n";
      }

      if (components && components.length > 0) {
        content += "## COMPONENTES\n\n";
        components.forEach(component => {
          content += `- ${component}\n`;
        });
        content += "\n";
      }

      if (requirements && requirements.length > 0) {
        content += "## REQUERIMIENTOS TÉCNICOS\n\n";
        requirements.forEach(req => {
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Plan de Desarrollo</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <i className="ri-close-line text-lg"></i>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Accordion type="single" collapsible defaultValue="plan">
            {architecture && (
              <AccordionItem value="architecture">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center">
                    <i className="ri-building-line mr-2 text-primary-500"></i>
                    <span>Arquitectura</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-6 py-2 bg-slate-50 dark:bg-slate-900 rounded-md">
                    {architecture}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {plan && plan.length > 0 && (
              <AccordionItem value="plan">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center">
                    <i className="ri-list-check mr-2 text-primary-500"></i>
                    <span>Pasos del Plan</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ol className="space-y-2 list-decimal pl-10 py-1">
                    {plan.map((step, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300">
                        {step}
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            )}

            {components && components.length > 0 && (
              <AccordionItem value="components">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center">
                    <i className="ri-shape-line mr-2 text-primary-500"></i>
                    <span>Componentes</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 list-disc pl-10 py-1">
                    {components.map((component, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300">
                        {component}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}

            {requirements && requirements.length > 0 && (
              <AccordionItem value="requirements">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center">
                    <i className="ri-file-list-3-line mr-2 text-primary-500"></i>
                    <span>Requerimientos Técnicos</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 list-disc pl-10 py-1">
                    {requirements.map((req, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300">
                        {req}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <Button variant="outline" onClick={onClose} className="mr-2">
            Cerrar
          </Button>
          <Button onClick={exportPlan}>
            <i className="ri-download-line mr-2"></i>
            Exportar Plan
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DevelopmentPlan;