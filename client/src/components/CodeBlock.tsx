
import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  className?: string;
  fileName?: string;
}

export const CodeBlock = ({ 
  code, 
  language, 
  showLineNumbers = true,
  className,
  fileName 
}: CodeBlockProps) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  return (
    <div className={cn("rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-lg animate-magic-reveal", className)}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center">
          {language && (
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
              {language}
            </span>
          )}
        </div>
        <div className="flex space-x-1">
          <div className="flex space-x-2">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(code);
              }}
              className="text-xs h-6 px-2 flex items-center text-slate-300 hover:bg-slate-700 hover:text-slate-100 rounded"
              title="Copiar código"
            >
              <i className="ri-clipboard-line mr-1"></i>
              Copiar
            </button>
            <button
              onClick={() => {
                const blob = new Blob([code], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName || `code.${language || 'txt'}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              }}
              className="text-xs h-6 px-2 flex items-center text-slate-300 hover:bg-slate-700 hover:text-slate-100 rounded"
              title="Descargar código"
            >
              <i className="ri-download-line mr-1"></i>
              Descargar
            </button>
          </div>
        </div>
      </div>
      <div className="relative">
        {showLineNumbers && (
          <div className="absolute top-0 left-0 bottom-0 w-10 bg-slate-800 border-r border-slate-700 flex flex-col items-end pt-4 pb-4 text-xs text-slate-500">
            {code.split("\n").map((_, i) => (
              <div key={i} className="pr-2 leading-relaxed">
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <pre className={cn("p-4 overflow-x-auto text-sm", showLineNumbers && "pl-12")}>
          <code ref={codeRef} className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
