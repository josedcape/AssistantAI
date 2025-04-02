
// Utilidad para resaltar sintaxis de código con colores vibrantes
// Simula el estilo de la imagen de referencia

export function highlightCode(code: string, language: string = 'jsx'): string {
  if (!code) return '';
  
  // Patrones para identificar diferentes partes del código
  const patterns = {
    tag: /<\/?([a-zA-Z][a-zA-Z0-9]*)/g,
    attribute: /\s([a-zA-Z][a-zA-Z0-9]*)(=)/g,
    string: /"([^"]*)"/g,
    jsxExpression: /\{([^}]*)\}/g,
    comment: /\/\/(.*)|\/\*[\s\S]*?\*\//g,
    keyword: /\b(const|let|var|function|return|import|export|from|as|if|else|for|while|class|extends|this|async|await|try|catch)\b/g,
    component: /\b([A-Z][a-zA-Z0-9]*)\b/g,
    number: /\b(\d+)\b/g,
    cssClass: /className="([^"]*)"/g,
    keys: /\bkey=\{([^}]*)\}/g,
    redText: /\b(red|error|delete|remove)\b/g
  };
  
  // Reemplazar cada patrón con su versión coloreada
  let highlightedCode = code
    // Primero escapamos HTML para evitar problemas
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Luego aplicamos colores
    .replace(patterns.comment, '<span style="color:#6a9955">$&</span>')
    .replace(patterns.keyword, '<span style="color:#569cd6">$&</span>')
    .replace(patterns.tag, (match, p1) => {
      return match.replace(p1, `<span style="color:#3c9dd0">${p1}</span>`);
    })
    .replace(patterns.attribute, (match, p1, p2) => {
      return match.replace(p1, `<span style="color:#9cdcfe">${p1}</span>`);
    })
    .replace(patterns.string, '<span style="color:#ce9178">$&</span>')
    .replace(patterns.component, '<span style="color:#4ec9b0">$&</span>')
    .replace(patterns.number, '<span style="color:#b5cea8">$&</span>')
    .replace(patterns.cssClass, (match, p1) => {
      return match.replace(p1, `<span style="color:#9cdcfe">${p1}</span>`);
    })
    .replace(patterns.keys, (match, p1) => {
      return match.replace(p1, `<span style="color:#9cdcfe">${p1}</span>`);
    })
    .replace(patterns.redText, '<span style="color:#f14c4c">$&</span>');
  
  // Destacar específicamente para acordeones como en la imagen
  if (language === 'jsx' || language === 'tsx') {
    highlightedCode = highlightedCode
      .replace(/(&lt;AccordionTrigger)/g, '<span style="color:#3c9dd0">$1</span>')
      .replace(/(&lt;AccordionContent)/g, '<span style="color:#3c9dd0">$1</span>')
      .replace(/(&lt;AccordionItem)/g, '<span style="color:#3c9dd0">$1</span>')
      .replace(/(&lt;div)/g, '<span style="color:#3c9dd0">$1</span>')
      .replace(/(&lt;span)/g, '<span style="color:#3c9dd0">$1</span>')
      .replace(/(&lt;ul)/g, '<span style="color:#3c9dd0">$1</span>')
      .replace(/(&lt;li)/g, '<span style="color:#3c9dd0">$1</span>')
      .replace(/(&lt;\/[a-zA-Z][a-zA-Z0-9]*&gt;)/g, '<span style="color:#3c9dd0">$1</span>');
  }
  
  return highlightedCode;
}

// Función para colorear texto de código en el chat o previsualizaciones
export function formatCodeForDisplay(code: string, language: string = 'jsx'): string {
  const highlightedCode = highlightCode(code, language);
  
  // Agregar números de línea
  const lines = highlightedCode.split('\n');
  const numberedLines = lines.map((line, index) => {
    return `<div class="token-line"><span class="token-line-number">${index + 1}</span>${line}</div>`;
  });
  
  return numberedLines.join('\n');
}
