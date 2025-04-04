
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { PackageIcon, RefreshCwIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface Package {
  name: string;
  version: string;
  description?: string;
  isDevDependency?: boolean;
}

interface PackageExplorerProps {
  projectId: number;
}

function PackageExplorer({ projectId }: PackageExplorerProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadPackages = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", `/api/projects/${projectId}/packages`);
      
      if (!response.ok) {
        throw new Error("Error al cargar los paquetes");
      }
      
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      console.error("Error cargando paquetes:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los paquetes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadPackages();
    }
  }, [projectId]);

  const handleRefresh = async () => {
    await loadPackages();
    toast({
      title: "Actualizado",
      description: "Lista de paquetes actualizada",
    });
  };

  // Separar paquetes de producción y desarrollo
  const prodPackages = packages.filter(pkg => !pkg.isDevDependency);
  const devPackages = packages.filter(pkg => pkg.isDevDependency);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-2 border-b">
        <h3 className="text-sm font-medium">Paquetes Instalados</h3>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Actualizar">
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-auto p-1">
        <Tabs defaultValue="production" className="w-full">
          <TabsList className="w-full mb-2">
            <TabsTrigger value="production" className="flex-1">Producción ({prodPackages.length})</TabsTrigger>
            <TabsTrigger value="development" className="flex-1">Desarrollo ({devPackages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="production">
            {loading ? (
              <div className="py-2 text-center text-sm text-slate-500">Cargando paquetes...</div>
            ) : prodPackages.length === 0 ? (
              <div className="py-2 text-center text-sm text-slate-500">No hay paquetes de producción</div>
            ) : (
              <ul className="space-y-1">
                {prodPackages.map((pkg) => (
                  <li key={pkg.name} className="text-xs p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center">
                      <PackageIcon className="h-3 w-3 mr-2" />
                      <span className="font-medium">{pkg.name}</span>
                      <span className="ml-1 text-slate-500">v{pkg.version}</span>
                    </div>
                    {pkg.description && (
                      <div className="mt-1 text-slate-500 text-[10px] pl-5">{pkg.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="development">
            {loading ? (
              <div className="py-2 text-center text-sm text-slate-500">Cargando paquetes...</div>
            ) : devPackages.length === 0 ? (
              <div className="py-2 text-center text-sm text-slate-500">No hay paquetes de desarrollo</div>
            ) : (
              <ul className="space-y-1">
                {devPackages.map((pkg) => (
                  <li key={pkg.name} className="text-xs p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                    <div className="flex items-center">
                      <PackageIcon className="h-3 w-3 mr-2" />
                      <span className="font-medium">{pkg.name}</span>
                      <span className="ml-1 text-slate-500">v{pkg.version}</span>
                    </div>
                    {pkg.description && (
                      <div className="mt-1 text-slate-500 text-[10px] pl-5">{pkg.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default PackageExplorer;
