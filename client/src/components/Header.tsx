import { useContext, useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";
import NewProjectModal from "./NewProjectModal";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMobile = useIsMobile();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Close mobile menu when clicking outside of it
  useEffect(() => {
    if (!isMenuOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#mobile-menu') && !target.closest('#mobile-menu-button')) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isHome = location === "/";

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo and main nav */}
          <div className="flex items-center">
            <Link href="/">
              <a className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg gradient-bg flex items-center justify-center mr-2">
                  <i className="ri-code-box-line text-white text-base sm:text-xl"></i>
                </div>
                <span className="text-lg sm:text-xl font-bold golden-text">CODESTORM</span>
              </a>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:ml-6 md:flex md:space-x-4">
              <Link href="/">
                <a className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isHome 
                    ? "bg-slate-100 dark:bg-slate-700" 
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}>
                  Inicio
                </a>
              </Link>
              <Link href="/projects">
                <a className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 px-3 py-2 rounded-md text-sm font-medium">
                  Mis Proyectos
                </a>
              </Link>
              <Link href="/tutorials">
                <a className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 px-3 py-2 rounded-md text-sm font-medium">
                  Tutoriales
                </a>
              </Link>
              <Link href="/docs">
                <a className="text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 px-3 py-2 rounded-md text-sm font-medium">
                  Documentación
                </a>
              </Link>
            </nav>
          </div>

          {/* Account nav and buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button 
              className="text-slate-600 dark:text-slate-300 rounded-full p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
              onClick={toggleDarkMode}
              aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              <i className={`${isDarkMode ? "ri-sun-line" : "ri-moon-line"} text-lg`}></i>
            </button>
            
            {/* New Project button - desktop */}
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:flex items-center text-sm"
              size={isMobile ? "sm" : "default"}
            >
              <i className="ri-add-line mr-1"></i> Nuevo
            </Button>
            
            {/* New Project button - mobile */}
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="sm:hidden flex items-center" 
              size="icon"
              variant="ghost"
            >
              <i className="ri-add-line text-lg"></i>
            </Button>
            
            <div className="relative">
              <button className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                <img 
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full" 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                  alt="User profile"
                />
              </button>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button 
                id="mobile-menu-button"
                type="button" 
                className="p-1.5 inline-flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
                onClick={toggleMenu}
                aria-expanded={isMenuOpen}
                aria-label="Menú principal"
              >
                <i className={`${isMenuOpen ? 'ri-close-line' : 'ri-menu-line'} text-xl`}></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu - with slide animation */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-50 bg-slate-900/50 md:hidden transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIsMenuOpen(false);
        }}
      >
        <div className="absolute right-0 top-0 h-full w-64 bg-white dark:bg-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out">
          <div className="p-5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center mr-2">
                  <i className="ri-code-box-line text-white text-base"></i>
                </div>
                <span className="font-bold">CodeCraft AI</span>
              </div>
              <button 
                className="p-1.5 text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
                onClick={() => setIsMenuOpen(false)}
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-1">
              <Link href="/">
                <a className={`block px-3 py-2.5 rounded-md text-base font-medium ${
                  isHome 
                    ? "bg-slate-100 dark:bg-slate-700" 
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}>
                  <div className="flex items-center">
                    <i className="ri-home-line mr-3 text-primary-500"></i>
                    <span>Inicio</span>
                  </div>
                </a>
              </Link>
              <Link href="/projects">
                <a className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 block px-3 py-2.5 rounded-md text-base font-medium">
                  <div className="flex items-center">
                    <i className="ri-folder-line mr-3 text-slate-500"></i>
                    <span>Mis Proyectos</span>
                  </div>
                </a>
              </Link>
              <Link href="/tutorials">
                <a className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 block px-3 py-2.5 rounded-md text-base font-medium">
                  <div className="flex items-center">
                    <i className="ri-book-open-line mr-3 text-slate-500"></i>
                    <span>Tutoriales</span>
                  </div>
                </a>
              </Link>
              <Link href="/docs">
                <a className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 block px-3 py-2.5 rounded-md text-base font-medium">
                  <div className="flex items-center">
                    <i className="ri-file-list-line mr-3 text-slate-500"></i>
                    <span>Documentación</span>
                  </div>
                </a>
              </Link>
            </div>
            
            <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-700">
              <Button
                onClick={() => {
                  setIsModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center justify-center"
              >
                <img src="/attached_assets/robot-logo.jpg" alt="Robot Logo" className="w-6 h-6 mr-2 rounded-full" /> Nuevo Proyecto
              </Button>
              
              <div className="mt-4 flex items-center justify-between">
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
            </div>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
    </header>
  );
};

export default Header;
