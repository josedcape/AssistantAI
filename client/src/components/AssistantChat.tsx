// Componente principal AssistantChat
const AssistantChat = () => {
  // Estado y otras variables aquí...
  
// Guardar código de un mensaje y crear archivo automáticamente
  const handleSaveCode = async (content: string): Promise<void> => {
    const codeBlockRegex = /```(?:(\w+))?\s*\n([\s\S]*?)\n```/g;
    let match;
    let savedCount = 0;
    let firstSavedFilePath = "";
    let savedFiles: {name: string, content: string, extension: string}[] = [];

    // Extraer todos los bloques de código
    const codeBlocks: { language: string, code: string }[] = [];
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || "js";
      const codeContent = match[2];
      codeBlocks.push({ language, code: codeContent });
    }

    if (codeBlocks.length === 0) {
      console.warn("No se encontraron bloques de código para guardar");
      return;
    }

    // Preparar para guardar archivos
    try {
      for (const [index, codeBlock] of codeBlocks.entries()) {
        // Determinar la extensión del archivo basada en el lenguaje
        let fileExtension = ".js"; // Predeterminado a JavaScript

        switch (codeBlock.language.toLowerCase()) {
          case "javascript":
          case "js":
            fileExtension = ".js";
            break;
          case "typescript":
          case "ts":
            fileExtension = ".ts";
            break;
          case "html":
            fileExtension = ".html";
            break;
          case "css":
            fileExtension = ".css";
            break;
          case "json":
            fileExtension = ".json";
            break;
          case "jsx":
            fileExtension = ".jsx";
            break;
          case "tsx":
            fileExtension = ".tsx";
            break;
          case "python":
          case "py":
            fileExtension = ".py";
            break;
        }

        // Generar nombre de archivo único basado en el contenido o tipo de código
        let fileName = `generated_code_${index + 1}${fileExtension}`;

        // Intentar detectar un mejor nombre basado en patrones en el código
        if (codeBlock.code.includes("export default") && codeBlock.code.includes("function")) {
          const componentMatch = codeBlock.code.match(/export\s+default\s+function\s+(\w+)/);
          if (componentMatch && componentMatch[1]) {
            fileName = `${componentMatch[1]}${fileExtension}`;
          }
        } else if (codeBlock.code.includes("class") && codeBlock.code.includes("extends")) {
          const classMatch = codeBlock.code.match(/class\s+(\w+)\s+extends/);
          if (classMatch && classMatch[1]) {
            fileName = `${classMatch[1]}${fileExtension}`;
          }
        }

        // Enviar solicitud para crear el archivo
        const response = await fetch("/api/files/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName,
            content: codeBlock.code,
            path: "", // Guardar en la ruta actual
          }),
        });

        if (!response.ok) {
          throw new Error(`Error al guardar el archivo ${fileName}`);
        }

        savedCount++;
        if (savedCount === 1) {
          firstSavedFilePath = fileName;
        }

        // Guardar información del archivo para el botón de enviar a explorador
        savedFiles.push({
          name: fileName,
          content: codeBlock.code,
          extension: fileExtension.substring(1) // Sin el punto
        });
      }

      sounds.play("save");

      // Mensaje de éxito con información sobre los archivos guardados
      let successMessage = "";
      if (savedCount === 1) {
        successMessage = `## ✅ Código guardado exitosamente\n\n📝 Se ha creado el archivo **${firstSavedFilePath}** con el código proporcionado.\n\n🔄 El explorador de archivos se actualizará automáticamente para mostrar el nuevo archivo.`;
      } else {
        successMessage = `## ✅ Código guardado exitosamente\n\n📝 Se han creado **${savedCount} archivos** con el código proporcionado.\n\n🔄 El explorador de archivos se actualizará automáticamente para mostrar los nuevos archivos.`;
      }

      // Agregar botón para enviar al explorador/recursos
      successMessage += `\n\n<button id="send-to-explorer" data-files='${JSON.stringify(savedFiles)}' style="padding: 8px 16px; background-color: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 12px; display: flex; align-items: center; font-size: 14px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        Enviar al explorador de archivos
      </button>`;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: successMessage
        },
      ]);

      // Disparar evento para actualizar el explorador de archivos
      const fileEvent = new CustomEvent('files-updated', {
        detail: { forceRefresh: true }
      });
      window.dispatchEvent(fileEvent);

      // Buscar y actualizar el explorador de archivos si existe
      setTimeout(() => {
        const fileExplorer = document.querySelector('[data-component="file-explorer"]');
        if (fileExplorer) {
          const refreshButton = fileExplorer.querySelector('button[title="Actualizar"]');
          if (refreshButton) {
            (refreshButton as HTMLButtonElement).click();
          } else {
            // Alternativa para encontrar el botón de refrescar
            const allButtons = fileExplorer.querySelectorAll('button');
            for (const button of allButtons) {
              if (button.innerHTML.includes('RefreshCw') || 
                  button.title.toLowerCase().includes('refrescar') || 
                  button.title.toLowerCase().includes('actualizar')) {
                (button as HTMLButtonElement).click();
                break;
              }
            }
          }
        }

        // Forzar recarga de la lista de archivos directamente
        const refreshEvent = new CustomEvent('refresh-files', {
          detail: { force: true }
        });
        window.dispatchEvent(refreshEvent);

        // Agregar listener para el botón de enviar al explorador
        setTimeout(() => {
          const sendToExplorerButton = document.getElementById('send-to-explorer');
          if (sendToExplorerButton) {
            sendToExplorerButton.addEventListener('click', () => {
              try {
                const filesData = JSON.parse(sendToExplorerButton.getAttribute('data-files') || '[]');
                if (filesData && filesData.length > 0) {
                  // Emitir evento para que lo capture el explorador de archivos
                  const sendToExplorerEvent = new CustomEvent('send-files-to-explorer', {
                    detail: { files: filesData }
                  });
                  window.dispatchEvent(sendToExplorerEvent);

                  // Mostrar mensaje de éxito
                  toast({
                    title: "Archivos enviados",
                    description: `Se han enviado ${filesData.length} archivo(s) al explorador`,
                    duration: 3000
                  });
                  sounds.play("success", 0.3);

                  // Cambiar automáticamente a la pestaña de archivos
                  const filesTabEvent = new CustomEvent('activate-files-tab');
                  window.dispatchEvent(filesTabEvent);
                }
              } catch (e) {
                console.error("Error al procesar los archivos:", e);
                toast({
                  title: "Error",
                  description: "No se pudieron enviar los archivos al explorador",
                  variant: "destructive",
                  duration: 3000
                });
                sounds.play("error", 0.3);
              }
            });
          }
        }, 300);
      }, 1000);

    } catch (error) {
      console.error("Error al guardar archivos:", error);
      sounds.play("error");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `## ⚠️ Error al guardar el código\n\n❌ No se pudieron guardar los archivos debido a un error:\n\`\`\`\n${error instanceof Error ? error.message : "Error desconocido"}\n\`\`\`\n\n*Por favor, intenta nuevamente o crea los archivos manualmente.*`
        },
      ]);
    }
  };
  
  // Resto del componente y return...
  return (
    <div className="assistant-chat-container">
      {/* Contenido del componente */}
    </div>
  );
};

export default AssistantChat;