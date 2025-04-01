
import { useState, useEffect } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ModelSelectorProps {
  onModelChange?: (modelId: string) => void;
}

export function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Record<string, string>>({});
  const [currentModel, setCurrentModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Modelos por defecto en caso de error
  const defaultModels = {
    "gpt-4o": "GPT-4O (OpenAI)",
    "gemini-2.5": "Gemini 2.5 (Google)",
    "claude-3.7": "Claude 3.7 (Anthropic)"
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('GET', '/api/models');
        if (!response.ok) {
          throw new Error(`Error de servidor: ${response.status}`);
        }
        const data = await response.json();
        
        // Verificar que los datos tengan la estructura esperada
        if (data && data.models && Object.keys(data.models).length > 0) {
          setModels(data.models);
          setCurrentModel(data.activeModel || Object.keys(data.models)[0]);
        } else {
          // Si no hay modelos, usar los predeterminados
          console.warn('No se encontraron modelos, usando predeterminados');
          setModels(defaultModels);
          setCurrentModel("gpt-4o");
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        // En caso de error, usar modelos predeterminados
        setModels(defaultModels);
        setCurrentModel("gpt-4o");
        
        toast({
          title: "Aviso",
          description: "Se están usando modelos predeterminados. Algunos pueden no estar disponibles.",
          variant: "default",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [toast]);

  const handleModelChange = async (value: string) => {
    try {
      const response = await apiRequest('POST', '/api/models/set', { modelId: value });
      if (response.ok) {
        setCurrentModel(value);
        toast({
          title: "Modelo cambiado",
          description: `Se ha cambiado al modelo: ${models[value]}`,
        });
        if (onModelChange) {
          onModelChange(value);
        }
      } else {
        throw new Error('Error al cambiar modelo');
      }
    } catch (error) {
      console.error('Error changing model:', error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el modelo de IA",
        variant: "destructive",
      });
    }
  };

  // Agrupar modelos por proveedor
  const groupedModels: Record<string, Record<string, string>> = {};
  
  Object.entries(models).forEach(([id, name]) => {
    let provider = "Otro";
    
    if (id.includes('gpt')) {
      provider = "OpenAI";
    } else if (id.includes('gemini')) {
      provider = "Google";
    } else if (id.includes('claude')) {
      provider = "Anthropic";
    } else if (id.includes('qwen')) {
      provider = "Alibaba";
    }
    
    groupedModels[provider] = groupedModels[provider] || {};
    groupedModels[provider][id] = name;
  });

  return (
    <Select 
      disabled={loading} 
      value={currentModel} 
      onValueChange={handleModelChange}
    >
      <SelectTrigger className="w-full md:w-[300px]">
        <SelectValue placeholder="Selecciona un modelo de IA" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupedModels).map(([provider, providerModels]) => (
          <SelectGroup key={provider}>
            <SelectLabel>{provider}</SelectLabel>
            {Object.entries(providerModels).map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
