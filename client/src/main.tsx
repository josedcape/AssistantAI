import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Cargar fuente JetBrains Mono para código
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap';
document.head.appendChild(fontLink);

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
  
  /* Mejora visual para los bloques de código */
  .code-block {
    border-radius: 6px;
    background-color: #1e1e2e;
    border: 1px solid #313244;
    overflow: hidden;
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
  }
  
  .code-block-footer {
    background-color: #181825;
    border-top: 1px solid #313244;
    padding: 6px 12px;
    font-size: 12px;
    color: #6c7086;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);
