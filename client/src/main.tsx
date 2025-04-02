import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./animations.css";
import 'highlight.js/styles/github-dark.css'

// Cargar fuentes
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontLink);

// Crear directorio de sonidos si es necesario
const createAudioDirectoryIfNeeded = async () => {
  try {
    // Esta función se ejecutará cuando el usuario interactúe con la página
    const setupSounds = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Esto inicializa el contexto de audio que usarán los efectos de sonido
        document.removeEventListener('click', setupSounds);
      } catch (err) {
        console.warn('Audio context could not be initialized:', err);
      }
    };
    document.addEventListener('click', setupSounds);
  } catch (e) {
    console.warn('Audio context not supported in this browser');
  }
};

// Inicializar sistema de audio cuando se cargue el documento
document.addEventListener('DOMContentLoaded', createAudioDirectoryIfNeeded);

// Add custom CSS for code styling and other specific styles
const style = document.createElement('style');
style.textContent = `
  .code-font {
    font-family: 'JetBrains Mono', monospace;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .gradient-bg {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  }

  /* Mejoras para el resaltado de sintaxis */
  pre code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    line-height: 1.6;
  }

  /* Mejora visual para los bloques de código - estilo similar a la imagen */
  .code-block {
    border-radius: 6px;
    background-color: #1e1e2e;
    border: 1px solid #313244;
    overflow: hidden;
    font-size: 14px;
  }

  .code-block-header {
    background-color: #181825;
    border-bottom: 1px solid #313244;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .code-block-content {
    padding: 12px;
    overflow-x: auto;
    background-color: #1e1e2e;
    color: #d4d4d4;
  }

  .code-block-footer {
    background-color: #181825;
    border-top: 1px solid #313244;
    padding: 6px 12px;
    font-size: 12px;
    color: #6c7086;
  }

  /* Estilos para destacar elementos específicos en el código como en la imagen */
  .accordion-tag { color: #3c9dd0; }
  .component-name { color: #4ec9b0; }
  .jsx-brackets { color: #d4d4d4; }
  .px-class { color: #9cdcfe; }
  .list-class { color: #9cdcfe; }
  .string-value { color: #ce9178; }
  .key-value { color: #9cdcfe; }
  .red-text { color: #f14c4c; }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);