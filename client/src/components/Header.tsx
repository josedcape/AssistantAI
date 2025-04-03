import { Link } from "wouter";
import ThemeToggle from "./ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { AlignJustify, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect } from "react";
import { sounds } from "@/lib/sounds";

const Header = () => {
  const isMobile = useIsMobile();
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());
  const [animationClass, setAnimationClass] = useState('');

  // Efecto para manejar animación al cargar
  useEffect(() => {
    setAnimationClass('animate-fade-slide-down');

    // Reproducir sonido de inicio al cargar el header
    if (soundEnabled) {
      setTimeout(() => sounds.play('notification', 0.2), 500);
    }

    return () => {
      setAnimationClass('');
    };
  }, []);

  const handleLinkHover = () => {
    if (soundEnabled) sounds.play('hover', 0.1);
  };

  const handleLinkClick = () => {
    if (soundEnabled) sounds.play('click', 0.3);
  };

  const toggleSound = () => {
    const isEnabled = sounds.toggle();
    setSoundEnabled(isEnabled);
    sounds.play(isEnabled ? 'success' : 'error', 0.3);
  };

  return (
    <header className={`sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border ${animationClass}`}>
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center" onClick={handleLinkClick}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2">
              <img src="/imagenes/botidinamix.jpg" alt="BOTIDINAMIX AI" className="w-8 h-8 object-contain rounded-lg" style={{display: 'block'}} />
            </div>
            <span className="font-bold text-lg hidden sm:block animate-typewriter">
              <span className="golden-text">BOTIDINAMIX AI</span>
              <span className="text-slate-400 mx-2">|</span>
              <span className="text-slate-500">CODESTORM</span>
            </span>
          </Link>
        </div>

        {isMobile ? (
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSound} 
              className="mr-2 hover-lift"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover-lift" onClick={() => sounds.play('click', 0.2)}>
                  <AlignJustify className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="animate-fade-slide-up futuristic-border">
                <DropdownMenuItem onMouseEnter={handleLinkHover}>
                  <Link href="/" onClick={handleLinkClick}>Inicio</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseEnter={handleLinkHover}>
                  <Link href="/workspace" onClick={handleLinkClick}>Workspace</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseEnter={handleLinkHover}>
                  <Link href="/tutorials" onClick={handleLinkClick}>Tutoriales</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex space-x-4 items-center">
            <nav className="flex items-center space-x-4 lg:space-x-6 mr-4">
              <Link 
                href="/" 
                className="text-sm font-medium transition-colors hover:text-primary hover-lift"
                onMouseEnter={handleLinkHover}
                onClick={handleLinkClick}
              >
                Inicio
              </Link>
              <Link 
                href="/workspace" 
                className="text-sm font-medium transition-colors hover:text-primary hover-lift"
                onMouseEnter={handleLinkHover}
                onClick={handleLinkClick}
              >
                Workspace
              </Link>
              <Link 
                href="/tutorials" 
                className="text-sm font-medium transition-colors hover:text-primary hover-lift"
                onMouseEnter={handleLinkHover}
                onClick={handleLinkClick}
              >
                Tutoriales
              </Link>
            </nav>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSound} 
              className="mr-2 hover-lift"
              onMouseEnter={handleLinkHover}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            <ThemeToggle onHover={handleLinkHover} onClick={handleLinkClick} />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;