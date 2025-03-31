// Simple Chatbot Implementation
const responses = {
  "hola": "¡Hola! ¿En qué puedo ayudarte hoy?",
  "como estas": "Estoy muy bien, gracias por preguntar. ¿Y tú?",
  "quien eres": "Soy un chatbot de demostración para probar la funcionalidad de vista previa interactiva.",
  "que haces": "Estoy aquí para ayudarte con información y responder preguntas sencillas.",
  "adios": "¡Hasta luego! Ha sido un placer charlar contigo.",
  "gracias": "¡De nada! Estoy aquí para ayudar."
};

// Función principal para manejar la entrada del usuario
function handleUserInput(message) {
  console.log("Recibido mensaje: " + message);
  
  // Convertir el mensaje a minúsculas para hacer coincidencias insensibles a mayúsculas/minúsculas
  const normalizedMessage = message.toLowerCase();
  
  // Buscar coincidencias en nuestras respuestas predefinidas
  for (const key in responses) {
    if (normalizedMessage.includes(key)) {
      return responses[key];
    }
  }
  
  // Respuesta predeterminada si no hay coincidencias
  return "Lo siento, no entendí eso. ¿Puedes reformular tu pregunta?";
}

// Inicialización - esto se ejecutará cuando la página cargue
function init() {
  console.log("Chatbot inicializado y listo para responder");
  
  // Agregar un mensaje de bienvenida
  sendResponse("Hola, soy un chatbot de demostración. Puedes preguntarme cómo estoy, quién soy, o qué hago. ¡Comienza escribiendo algo!");
}

// Llamar a init cuando se cargue la página
window.addEventListener('DOMContentLoaded', init);

// Exportar la función para que pueda ser utilizada por otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleUserInput };
}