
import React, { useContext } from "react";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";

interface ThemeToggleProps {
  variant?: "icon" | "text" | "full";
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  variant = "icon",
  className = "" 
}) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);

  if (variant === "full") {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <span className="text-sm text-slate-500 dark:text-slate-400">Tema</span>
        <button
          onClick={toggleDarkMode}
          className="flex items-center text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700"
        >
          {isDarkMode ? (
            <>
              <i className="ri-sun-line mr-1.5"></i>
              <span>Claro</span>
            </>
          ) : (
            <>
              <i className="ri-moon-line mr-1.5"></i>
              <span>Oscuro</span>
            </>
          )}
        </button>
      </div>
    );
  }

  if (variant === "text") {
    return (
      <Button 
        onClick={toggleDarkMode} 
        variant="ghost" 
        className={className}
      >
        {isDarkMode ? (
          <>
            <i className="ri-sun-line mr-1.5"></i>
            <span>Cambiar a tema claro</span>
          </>
        ) : (
          <>
            <i className="ri-moon-line mr-1.5"></i>
            <span>Cambiar a tema oscuro</span>
          </>
        )}
      </Button>
    );
  }

  // Default icon variant
  return (
    <button 
      className={`text-slate-600 dark:text-slate-300 rounded-full p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}
      onClick={toggleDarkMode}
      aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <i className={`${isDarkMode ? "ri-sun-line" : "ri-moon-line"} text-lg`}></i>
    </button>
  );
};

export default ThemeToggle;
