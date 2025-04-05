
import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Actualizar el estado inicialmente
    setMatches(media.matches);
    
    // Definir el callback para cambios
    const listener = () => setMatches(media.matches);
    
    // Añadir el listener
    media.addEventListener("change", listener);
    
    // Limpiar al desmontar
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
