import { useContext, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/App";
import NewProjectModal from "./NewProjectModal";

const Header = () => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isHome = location === "/";

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex items-center">
            <Link href="/">
              <a className="flex-shrink-0 flex items-center">
                <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center mr-2">
                  <i className="ri-code-box-line text-white text-xl"></i>
                </div>
                <span className="text-xl font-bold hidden sm:block">CodeCraft AI</span>
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
          <div className="flex items-center">
            <button 
              className="text-slate-600 dark:text-slate-300 rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-700 mr-2"
              onClick={toggleDarkMode}
            >
              <i className={`${isDarkMode ? "ri-sun-line" : "ri-moon-line"} text-lg`}></i>
            </button>
            
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="hidden md:flex items-center"
            >
              <i className="ri-add-line mr-1"></i> Nuevo Proyecto
            </Button>
            
            <div className="ml-3 relative">
              <div>
                <button className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  <img 
                    className="h-8 w-8 rounded-full" 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                    alt="User profile"
                  />
                </button>
              </div>
            </div>
            
            {/* Mobile menu button */}
            <div className="ml-2 -mr-2 flex items-center md:hidden">
              <button 
                type="button" 
                className="bg-white dark:bg-slate-800 p-2 inline-flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                onClick={toggleMenu}
              >
                <i className="ri-menu-line text-xl"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link href="/">
            <a className={`block px-3 py-2 rounded-md text-base font-medium ${
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
            <a className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 block px-3 py-2 rounded-md text-base font-medium">
              <div className="flex items-center">
                <i className="ri-folder-line mr-3 text-slate-500"></i>
                <span>Mis Proyectos</span>
              </div>
            </a>
          </Link>
          <Link href="/tutorials">
            <a className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 block px-3 py-2 rounded-md text-base font-medium">
              <div className="flex items-center">
                <i className="ri-book-open-line mr-3 text-slate-500"></i>
                <span>Tutoriales</span>
              </div>
            </a>
          </Link>
          <Link href="/docs">
            <a className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 block px-3 py-2 rounded-md text-base font-medium">
              <div className="flex items-center">
                <i className="ri-file-list-line mr-3 text-slate-500"></i>
                <span>Documentación</span>
              </div>
            </a>
          </Link>
          <div className="pt-4">
            <Button
              onClick={() => {
                setIsModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-center"
            >
              <i className="ri-add-line mr-2"></i> Nuevo Proyecto
            </Button>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {isModalOpen && <NewProjectModal onClose={() => setIsModalOpen(false)} />}
    </header>
  );
};

export default Header;
