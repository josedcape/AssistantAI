
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

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const response = await apiRequest('GET', '/api/models');
        const data = await response.json();
        setModels(data.models);
        setCurrentModel(data.activeModel);
      } catch (error) {
        console.error('Error fetching models:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los modelos de IA",
          variant: "destructive",
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
