import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import Home from "@/pages/Home";
import Workspace from "@/pages/Workspace";
import Tutorials from "@/pages/Tutorials";
import DevelopmentPlanPage from "@/pages/DevelopmentPlanPage"; // Added import
import NotFound from "@/pages/not-found";

// Theme context for dark mode
interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setTheme: (theme: "light" | "dark") => void;
}

import { createContext } from "react";

export const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  setTheme: () => {},
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/workspace/:id" component={Workspace} />
      <Route path="/tutorials" component={Tutorials} />
      <Route path="/development-plan" component={DevelopmentPlanPage} /> {/* Added route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Dark mode implementation
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (storedTheme === "dark" || (!storedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const setTheme = (theme: "light" | "dark") => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDarkMode(false);
    }
  };

  const toggleDarkMode = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setTheme }}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
          <Router />
          <Toaster />
        </div>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}

export default App;