import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Loader2, Package, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface PackageInfo {
  name: string;
  version: string;
  isDevDependency: boolean;
  description?: string;
  category?: string;
}

export function PackageExplorer() {
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<PackageInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { id } = useParams();

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", `/api/projects/${id}/packages`, undefined);

      // Verificar el tipo de contenido antes de intentar parsear como JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Respuesta no JSON:", text);
        throw new Error("La respuesta del servidor no es JSON válido");
      }

      const data = await response.json();
      setPackages(data);
      setFilteredPackages(data);
    } catch (error) {
      console.error("Error al cargar paquetes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Estado para almacenar descripciones de paquetes instalados (persistencia local)
  const [packageDescriptions, setPackageDescriptions] = useState<Record<string, string>>(() => {
    const savedDescriptions = localStorage.getItem('package-descriptions');
    return savedDescriptions ? JSON.parse(savedDescriptions) : {};
  });

  // Guardar descripciones en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('package-descriptions', JSON.stringify(packageDescriptions));
  }, [packageDescriptions]);

  // Cargar paquetes al iniciar y cuando se instale un nuevo paquete
  useEffect(() => {
    fetchPackages();

    // Escuchar evento de instalación de paquete
    const handlePackageInstalled = (event: CustomEvent) => {
      console.log("📦 Detectada instalación de paquete, actualizando lista...", event.detail);
      
      // Guardar descripción del paquete si está disponible
      if (event.detail && event.detail.name) {
        const packageName = event.detail.name;
        const packageDescription = event.detail.description || "Instalado por el asistente";
        const packageCategory = event.detail.category;

        setPackageDescriptions(prev => ({
          ...prev,
          [packageName]: packageDescription
        }));
        
        // Si hay una categoría específica, podríamos guardarla en otro estado
        // Implementación futura
      }
      
      fetchPackages(); // Llamar a la función que carga los paquetes
    };

    window.addEventListener('package-installed', handlePackageInstalled as EventListener);

    return () => {
      window.removeEventListener('package-installed', handlePackageInstalled as EventListener);
    };
  }, []);

  // Filtrar paquetes cuando cambie el término de búsqueda y aplicar descripciones guardadas
  useEffect(() => {
    // Primero, enriquecer los paquetes con descripciones guardadas
    const packagesWithDescriptions = packages.map(pkg => ({
      ...pkg,
      description: packageDescriptions[pkg.name] || "Sin descripción"
    }));
    
    // Luego aplicar el filtro de búsqueda
    if (searchTerm.trim() === "") {
      setFilteredPackages(packagesWithDescriptions);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = packagesWithDescriptions.filter(pkg => 
        pkg.name.toLowerCase().includes(lowercaseSearch) || 
        (pkg.description && pkg.description.toLowerCase().includes(lowercaseSearch))
      );
      setFilteredPackages(filtered);
    }
    
    // Guardar historial de búsquedas recientes en localStorage
    if (searchTerm.trim() !== "") {
      const recentSearches = JSON.parse(localStorage.getItem('package-searches') || '[]');
      if (!recentSearches.includes(searchTerm.trim()) && searchTerm.length > 2) {
        recentSearches.unshift(searchTerm.trim());
        // Limitar a 5 búsquedas recientes
        localStorage.setItem('package-searches', JSON.stringify(recentSearches.slice(0, 5)));
      }
    }
  }, [searchTerm, packages, packageDescriptions]);

  // Función para organizar los paquetes por categorías
  const categorizarPaquetes = (paquetes: PackageInfo[]) => {
    const categoriasConocidas: Record<string, string[]> = {
      "UI/Componentes": ["react", "react-dom", "tailwindcss", "shadcn", "bootstrap", "mui", "chakra", "styled-components", "emotion"],
      "Backend/API": ["express", "axios", "node-fetch", "cors", "body-parser", "jwt", "passport", "mongoose", "sequelize", "prisma"],
      "Testing": ["jest", "mocha", "chai", "cypress", "testing-library", "vitest", "playwright"],
      "Utilidades": ["lodash", "moment", "luxon", "date-fns", "uuid", "nanoid", "js-cookie", "zod", "yup"],
      "Estado/Datos": ["redux", "mobx", "zustand", "recoil", "swr", "react-query", "graphql", "apollo"],
      "Desarrollo": ["eslint", "prettier", "typescript", "babel", "webpack", "vite", "rollup", "esbuild"],
      "Multimedia": ["sharp", "jimp", "canvas", "pdf-lib", "ffmpeg", "tone"]
    };

    return paquetes.map(pkg => {
      // Intentar asignar una categoría basada en el nombre del paquete
      let foundCategory = "Otros";
      
      for (const [category, keywords] of Object.entries(categoriasConocidas)) {
        if (keywords.some(keyword => pkg.name.toLowerCase().includes(keyword.toLowerCase()))) {
          foundCategory = category;
          break;
        }
      }
      
      return {
        ...pkg,
        category: pkg.category || foundCategory,
        description: pkg.description || "Paquete instalado por el proyecto"
      };
    });
  };

  // Agrupar paquetes por categoría
  const agruparPorCategoria = (paquetes: PackageInfo[]) => {
    const paquetesCategorizados = categorizarPaquetes(paquetes);
    const grupos: Record<string, PackageInfo[]> = {};
    
    paquetesCategorizados.forEach(pkg => {
      if (!grupos[pkg.category || "Otros"]) {
        grupos[pkg.category || "Otros"] = [];
      }
      grupos[pkg.category || "Otros"].push(pkg);
    });
    
    return grupos;
  };

  // Obtener paquetes agrupados
  const paquetesPorCategoria = agruparPorCategoria(filteredPackages);
  const categorias = Object.keys(paquetesPorCategoria).sort();

  return (
    <Card className="w-full" data-component="package-explorer">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package size={18} />
          Paquetes Instalados
          <div className="ml-auto flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button 
                        className="p-1 rounded-md hover:bg-secondary/50 text-muted-foreground"
                        title="Sugerir paquetes"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4"/>
                          <path d="M12 8h.01"/>
                        </svg>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Paquetes Populares</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 pt-4">
                        <h4 className="text-sm font-medium mb-1">Componentes UI</h4>
                        <div className="flex flex-wrap gap-2">
                          {["react", "react-dom", "tailwindcss", "@chakra-ui/react", "styled-components"].map(pkg => (
                            <Badge key={pkg} variant="outline" className="cursor-pointer" onClick={() => setSearchTerm(pkg)}>
                              {pkg}
                            </Badge>
                          ))}
                        </div>
                        <h4 className="text-sm font-medium mb-1">Backend</h4>
                        <div className="flex flex-wrap gap-2">
                          {["express", "axios", "mongoose", "prisma", "cors"].map(pkg => (
                            <Badge key={pkg} variant="outline" className="cursor-pointer" onClick={() => setSearchTerm(pkg)}>
                              {pkg}
                            </Badge>
                          ))}
                        </div>
                        <h4 className="text-sm font-medium mb-1">Desarrollo</h4>
                        <div className="flex flex-wrap gap-2">
                          {["typescript", "eslint", "prettier", "jest", "vitest"].map(pkg => (
                            <Badge key={pkg} variant="outline" className="cursor-pointer" onClick={() => setSearchTerm(pkg)}>
                              {pkg}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Paquetes populares</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={fetchPackages} 
                    className="p-1 rounded-md hover:bg-secondary/50 text-muted-foreground"
                    title="Actualizar lista de paquetes"
                    aria-label="Refrescar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                      <path d="M3 3v5h5"/>
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                      <path d="M16 21h5v-5"/>
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualizar lista</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
        <div className="relative mt-2">
          <Input
            type="search"
            placeholder="Buscar paquetes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-8"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setSearchTerm('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchTerm.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {JSON.parse(localStorage.getItem('package-searches') || '[]').slice(0, 3).map((term: string) => (
              <Badge 
                key={term} 
                variant="outline" 
                className="cursor-pointer text-xs bg-slate-50 hover:bg-slate-100"
                onClick={() => setSearchTerm(term)}
              >
                {term}
              </Badge>
            ))}
          </div>
        )}
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
            <AccordionItem value="byCategory" className="border-b">
              <AccordionTrigger className="py-2">
                Por Categoría
              </AccordionTrigger>
              <AccordionContent>
                <Accordion type="multiple" className="w-full">
                  {categorias.map(categoria => (
                    <AccordionItem key={categoria} value={`cat-${categoria}`}>
                      <AccordionTrigger className="py-1.5 text-sm">
                        {categoria} ({paquetesPorCategoria[categoria].length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1.5 mt-1 pl-2">
                          {paquetesPorCategoria[categoria].map(pkg => (
                            <div key={pkg.name} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary/30">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm">{pkg.name}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info size={14} className="text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{pkg.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <Badge variant="outline" className={`text-xs ${pkg.isDevDependency ? 'bg-amber-100 dark:bg-amber-900/30' : ''}`}>
                                {pkg.version}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
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
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">{pkg.name}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info size={14} className="text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{pkg.description || "Sin descripción"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
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
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">{pkg.name}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info size={14} className="text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{pkg.description || "Sin descripción"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
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