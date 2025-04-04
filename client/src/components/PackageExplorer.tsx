import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Loader2, Package } from "lucide-react";

interface PackageInfo {
  name: string;
  version: string;
  isDevDependency: boolean;
}

export function PackageExplorer() {
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<PackageInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { id } = useParams();

  useEffect(() => {
    async function fetchPackages() {
      try {
        setLoading(true);
        const response = await apiRequest("GET", `/api/projects/${id}/packages`, undefined);
        const data = await response.json();
        setPackages(data);
        setFilteredPackages(data);
      } catch (error) {
        console.error("Error al cargar paquetes:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPackages();
  }, [id]);

  // Filtrar paquetes cuando cambie el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPackages(packages);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = packages.filter(pkg => 
        pkg.name.toLowerCase().includes(lowercaseSearch)
      );
      setFilteredPackages(filtered);
    }
  }, [searchTerm, packages]);

  return (
    <Card className="w-full h-full overflow-hidden flex flex-col">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package size={18} />
          Paquetes Instalados
        </CardTitle>
        <Input
          type="search"
          placeholder="Buscar paquetes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-2"
        />
      </CardHeader>
      <CardContent className="flex-1 overflow-auto px-4 pb-4 pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No se encontraron paquetes con ese nombre' : 'No hay paquetes instalados'}
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="dependencies" className="border-b">
              <AccordionTrigger className="py-2">
                Dependencias ({filteredPackages.filter(p => !p.isDevDependency).length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1.5 mt-1">
                  {filteredPackages
                    .filter(pkg => !pkg.isDevDependency)
                    .map(pkg => (
                      <div key={pkg.name} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30">
                        <span className="font-mono text-sm">{pkg.name}</span>
                        <Badge variant="outline" className="text-xs">{pkg.version}</Badge>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="devDependencies">
              <AccordionTrigger className="py-2">
                Dev Dependencies ({filteredPackages.filter(p => p.isDevDependency).length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1.5 mt-1">
                  {filteredPackages
                    .filter(pkg => pkg.isDevDependency)
                    .map(pkg => (
                      <div key={pkg.name} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30">
                        <span className="font-mono text-sm">{pkg.name}</span>
                        <Badge variant="outline" className="text-xs">{pkg.version}</Badge>
                      </div>
                    ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

export default PackageExplorer;