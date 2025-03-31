import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")!).render(<App />);
