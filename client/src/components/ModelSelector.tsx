import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelSelectorProps {
  modelId?: string;
  onModelChange?: (modelId: string) => void;
}

function ModelSelector({ onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<Record<string, string>>({});
  const [currentModel, setCurrentModel] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/models");
        if (response.ok) {
          const data = await response.json();
          setModels(data.models || {
            "gpt-3.5-turbo": "GPT-3.5",
            "gpt-4": "GPT-4",
          });
          setCurrentModel(Object.keys(data.models || { "gpt-3.5-turbo": "GPT-3.5" })[0]);
        } else {
          // Fallback para desarrollo local
          setModels({
            "gpt-3.5-turbo": "GPT-3.5",
            "gpt-4": "GPT-4",
          });
          setCurrentModel("gpt-3.5-turbo");
        }
      } catch (error) {
        console.error("Error fetching models:", error);
        // Fallback para desarrollo local
        setModels({
          "gpt-3.5-turbo": "GPT-3.5",
          "gpt-4": "GPT-4",
        });
        setCurrentModel("gpt-3.5-turbo");
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const handleValueChange = (value: string) => {
    setCurrentModel(value);
    if (onModelChange) {
      onModelChange(value);
    }
  };

  return (
    <Select
      disabled={loading}
      value={currentModel}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder="Selecciona modelo" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {Object.entries(models).map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default ModelSelector;