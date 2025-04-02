import React, { useContext, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";
import { sounds } from "@/lib/sounds"; // Import sound effects


interface ThemeToggleProps {
  variant?: "icon" | "text" | "full";
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "icon",
  className = "",
}) => {
  const { isDarkMode, toggleDarkMode, setTheme } = useContext(ThemeContext);
  const [isAnimating, setIsAnimating] = useState(false); // Add animation state

  useEffect(() => {
    // Add an effect to play a sound on mount?  This is speculative based on the instructions.
    sounds.play('mount', 0.2); //Requires a 'mount' sound in sounds.js
  }, []);

  const handleToggle = () => {
    toggleDarkMode();
    setIsAnimating(true);
    sounds.play("click", 0.3); // Play sound effect
    setTimeout(() => setIsAnimating(false), 700); // Animation duration
  };

  if (variant === "full") {
    return (
      <div className={`flex items-center justify-between ${className}`}>
        <span className="text-sm text-slate-500 dark:text-slate-400">Tema</span>
        <button
          onClick={handleToggle}
          className={`flex items-center text-sm px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 ${isAnimating ? 'animate-pulse' : ''}`} // Add animation class
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
        onClick={handleToggle}
        variant="ghost"
        className={`${className} ${isAnimating ? 'animate-pulse' : ''}`} // Add animation class
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
      className={`text-slate-600 dark:text-slate-300 rounded-full p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700 ${className} ${isAnimating ? 'animate-bounce' : ''}`} // Add animation class
      onClick={handleToggle}
      aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <i className={`${isDarkMode ? "ri-sun-line" : "ri-moon-line"} text-lg`}></i>
    </button>
  );
};

export default ThemeToggle;