import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

const Tutorials = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Tutoriales</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Aprende a utilizar todas las funcionalidades de <span className="golden-text">CODESTORM AI</span> con nuestras guías detalladas.
          </p>
        </div>

        <Tabs defaultValue="chatbot" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="chatbot">Chatbot</TabsTrigger>
            <TabsTrigger value="web-app">Aplicación Web</TabsTrigger>
            <TabsTrigger value="api">API REST</TabsTrigger>
          </TabsList>

          {/* Tutorial de Chatbot */}
          <TabsContent value="chatbot" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Tutorial: Creación de un Chatbot con IA</CardTitle>
                <CardDescription>
                  Guía completa para generar un chatbot inteligente utilizando nuestra plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="relative rounded-lg overflow-hidden aspect-video w-full bg-slate-900">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-black/60 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-2 border-white flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <img 
                    src="https://images.unsplash.com/photo-1531746790731-6c087fecd65a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1600&h=900&q=80" 
                    alt="Thumbnail del tutorial de chatbot" 
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3">¿Qué es un Chatbot?</h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    Un chatbot es una aplicación de software que simula mantener una conversación con un usuario en lenguaje natural, ya sea por texto o por voz. 
                    Los chatbots están diseñados para interactuar con humanos de manera autónoma y pueden ser programados para responder preguntas, proporcionar información,
                    realizar tareas específicas o facilitar servicios.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">Paso 1: Crear un Nuevo Proyecto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-700 dark:text-slate-300 mb-4">
                        Para comenzar a crear un chatbot, primero necesitas iniciar un nuevo proyecto en la plataforma <span className="golden-text">CODESTORM AI</span>:
                      </p>
                      <ol className="list-decimal pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                        <li>Haz clic en el botón <span className="font-semibold">"Empezar ahora"</span> en la página principal</li>
                        <li>Selecciona <span className="font-semibold">"Crear un proyecto"</span> en el panel de proyectos</li>
                        <li>Asigna un nombre descriptivo a tu proyecto, por ejemplo: "Mi Chatbot Asistente"</li>
                        <li>Haz clic en <span className="font-semibold">"Crear"</span> para iniciar el proyecto</li>
                      </ol>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="text-sm font-semibold mb-2">Consejo Pro:</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Organiza tus proyectos con nombres descriptivos que indiquen claramente su propósito. 
                        Esto te ayudará a encontrarlos fácilmente cuando tu biblioteca de proyectos crezca.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">Paso 2: Describir tu Chatbot</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-700 dark:text-slate-300 mb-4">
                        En el espacio de trabajo, encontrarás un campo de texto para introducir una descripción de lo que quieres crear. Aquí debes ser lo más específico posible sobre las funcionalidades de tu chatbot:
                      </p>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
                        <div className="text-sm font-mono">
                          "Crear un chatbot simple que responda preguntas sobre programación. El chatbot debe tener una interfaz con un campo de entrada y un botón de enviar. Debe almacenar un historial de mensajes y tener respuestas predefinidas para preguntas comunes sobre JavaScript, Python y React."
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">
                        Elementos clave a incluir en tu descripción:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                        <li>Propósito del chatbot (educativo, servicio al cliente, entretenimiento)</li>
                        <li>Temas sobre los que debe responder</li>
                        <li>Características de la interfaz de usuario</li>
                        <li>Cualquier funcionalidad específica (historial, almacenamiento, etc.)</li>
                      </ul>
                    </div>
                    <div>
                      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="bg-slate-800 h-8 flex items-center px-4">
                          <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="font-semibold text-sm mb-2">Descripción del proyecto:</div>
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-md text-xs mb-4 font-mono">
                            Crear un chatbot simple que responda preguntas sobre programación. El chatbot debe tener una interfaz con un campo de entrada y un botón de enviar. Debe almacenar un historial de mensajes y tener respuestas predefinidas para preguntas comunes sobre JavaScript, Python y React.
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex space-x-2">
                              <div className="p-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded text-xs">JavaScript</div>
                              <div className="p-1 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 rounded text-xs">React</div>
                            </div>
                            <button className="bg-primary-500 text-white text-xs py-1 px-3 rounded">Generar</button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <div className="text-sm font-semibold mb-2">Consejo Pro:</div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Cuanto más específica sea tu descripción, mejores serán los resultados. Incluye detalles sobre el estilo visual, comportamiento y conocimiento que debe tener tu chatbot.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">Paso 3: Seleccionar Agentes y Generar Código</h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    <span className="golden-text">CODESTORM AI</span> utiliza un sistema de agentes especializados para generar diferentes tipos de código. Para un chatbot, recomendamos seleccionar:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold flex items-center">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mr-2">
                          <i className="ri-layout-2-line text-blue-700 dark:text-blue-400 text-xs"></i>
                        </div>
                        frontend_designer
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Crea la interfaz visual del chatbot y los elementos interactivos.
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold flex items-center">
                        <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center mr-2">
                          <i className="ri-javascript-line text-yellow-700 dark:text-yellow-400 text-xs"></i>
                        </div>
                        js_specialist
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Desarrolla la lógica del chatbot y el manejo de respuestas.
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold flex items-center">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mr-2">
                          <i className="ri-braces-line text-purple-700 dark:text-purple-400 text-xs"></i>
                        </div>
                        project_architect
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Planifica la estructura general del proyecto y sus componentes.
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    Una vez seleccionados los agentes, haz clic en el botón <span className="font-semibold">"Generar código"</span>. El sistema procesará tu descripción y creará automáticamente todos los archivos necesarios para tu chatbot.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">Paso 4: Revisar y Personalizar el Código</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-slate-700 dark:text-slate-300 mb-4">
                        Después de generar el código, podrás ver los archivos creados en el panel lateral. Para un chatbot típico, obtendrás:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300 mb-4">
                        <li><span className="font-mono text-sm">index.html</span> - La estructura HTML del chatbot</li>
                        <li><span className="font-mono text-sm">style.css</span> - Estilos para la interfaz del chatbot</li>
                        <li><span className="font-mono text-sm">script.js</span> - La lógica y funcionamiento del chatbot</li>
                        <li><span className="font-mono text-sm">data.js</span> - Base de conocimiento con respuestas predefinidas</li>
                      </ul>
                      <p className="text-slate-700 dark:text-slate-300">
                        Revisa cada archivo para entender cómo funciona el chatbot y realiza cualquier personalización necesaria. Puedes modificar:
                      </p>
                      <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                        <li>Estilos visuales (colores, tamaños, fuentes)</li>
                        <li>Mensajes de bienvenida y despedida</li>
                        <li>Base de conocimiento y respuestas predefinidas</li>
                        <li>Comportamiento de la interfaz de usuario</li>
                      </ul>
                    </div>
                    <div>
                      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4">
                          <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1 bg-slate-100 dark:bg-slate-900 p-2 rounded-md">
                              <div className="text-xs font-semibold mb-2">Archivos</div>
                              <div className="space-y-1">
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">index.html</div>
                                <div className="text-xs font-mono">style.css</div>
                                <div className="text-xs font-mono">script.js</div>
                                <div className="text-xs font-mono">data.js</div>
                              </div>
                            </div>
                            <div className="col-span-3 bg-slate-100 dark:bg-slate-900 p-2 rounded-md">
                              <div className="text-xs font-mono text-slate-800 dark:text-slate-300 space-y-1">
                                <div className="text-slate-500">// Base de conocimiento para el chatbot</div>
                                <div className="text-purple-600">const</div>
                                <div className="ml-2">chatbotResponses = {`{`}</div>
                                <div className="ml-4">javascript: {`{`}</div>
                                <div className="ml-6">
                                  <span className="text-green-600">"¿Qué es JavaScript?"</span>: 
                                  <span className="text-green-600">"JavaScript es un lenguaje de programación..."</span>,
                                </div>
                                <div className="ml-6">
                                  <span className="text-green-600">"¿Cómo declaro variables?"</span>: 
                                  <span className="text-green-600">"Puedes usar let, const o var..."</span>,
                                </div>
                                <div className="ml-4">{`}`},</div>
                                <div className="ml-4">python: {`{`}</div>
                                <div className="ml-6">
                                  <span className="text-green-600">"¿Qué es Python?"</span>: 
                                  <span className="text-green-600">"Python es un lenguaje de alto nivel..."</span>,
                                </div>
                                <div className="ml-4">{`}`},</div>
                                <div className="ml-2">{`}`};</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <div className="text-sm font-semibold mb-2">Consejo Pro:</div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Centra tus personalizaciones en el archivo <span className="font-mono">data.js</span> para mejorar la base de conocimiento sin tener que modificar la lógica principal del chatbot.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">Paso 5: Probar el Chatbot</h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    Una vez que hayas revisado y personalizado tu chatbot, es hora de probarlo:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <ol className="list-decimal pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                        <li>Haz clic en la pestaña <span className="font-semibold">"Vista previa"</span> en la parte superior del editor</li>
                        <li>Interactúa con tu chatbot escribiendo preguntas en el campo de entrada</li>
                        <li>Prueba diferentes tipos de preguntas para ver cómo responde</li>
                        <li>Verifica que el historial de mensajes se muestre correctamente</li>
                        <li>Comprueba que la interfaz sea agradable y funcional</li>
                      </ol>
                      <div className="mt-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <div className="text-sm font-semibold mb-2">Depuración:</div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Si encuentras algún error o comportamiento inesperado, puedes utilizar la consola del navegador para depurar problemas en el código JavaScript.
                        </p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm font-semibold">
                        Vista previa
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 max-h-56 overflow-y-auto">
                          <div className="flex flex-col space-y-3">
                            <div className="ml-auto bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 p-2 rounded-lg max-w-[80%] text-sm">
                              ¿Qué es JavaScript?
                            </div>
                            <div className="mr-auto bg-slate-200 dark:bg-slate-700 p-2 rounded-lg max-w-[80%] text-sm">
                              JavaScript es un lenguaje de programación interpretado, dialecto del estándar ECMAScript. Se define como orientado a objetos, basado en prototipos, imperativo, débilmente tipado y dinámico.
                            </div>
                            <div className="ml-auto bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 p-2 rounded-lg max-w-[80%] text-sm">
                              ¿Cómo creo una función en Python?
                            </div>
                            <div className="mr-auto bg-slate-200 dark:bg-slate-700 p-2 rounded-lg max-w-[80%] text-sm">
                              En Python, puedes crear una función utilizando la palabra clave 'def', seguida del nombre de la función y paréntesis. Por ejemplo: def mi_funcion(): pass
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Escribe tu pregunta aquí..." 
                            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                          />
                          <button className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg">
                            Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">Paso 6: Ampliar Funcionalidades (Avanzado)</h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    Una vez que tengas un chatbot básico funcionando, puedes mejorar sus capacidades con estas funcionalidades avanzadas:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold mb-2">Integración con OpenAI</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Conecta tu chatbot con la API de OpenAI para generar respuestas dinámicas utilizando modelos de lenguaje avanzados como GPT-4o.
                      </p>
                      <div className="mt-3">
                        <Link href="/tutorials/chatbot-openai">
                          <a className="text-primary-600 dark:text-primary-400 text-sm">Ver guía →</a>
                        </Link>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold mb-2">Persistencia de datos</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Implementa almacenamiento local o en la nube para guardar conversaciones entre sesiones y mejorar el aprendizaje.
                      </p>
                      <div className="mt-3">
                        <Link href="/tutorials/chatbot-storage">
                          <a className="text-primary-600 dark:text-primary-400 text-sm">Ver guía →</a>
                        </Link>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold mb-2">Personalización avanzada</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Añade avatares, indicadores de escritura, opciones de voz y temas personalizables para mejorar la experiencia.
                      </p>
                      <div className="mt-3">
                        <Link href="/tutorials/chatbot-ui">
                          <a className="text-primary-600 dark:text-primary-400 text-sm">Ver guía →</a>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">Paso 5: Probar el Chatbot</h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    Una vez que hayas revisado y personalizado tu chatbot, es hora de probarlo:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <ol className="list-decimal pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                        <li>Haz clic en la pestaña <span className="font-semibold">"Vista previa"</span> en la parte superior del editor</li>
                        <li>Interactúa con tu chatbot escribiendo preguntas en el campo de entrada</li>
                        <li>Prueba diferentes tipos de preguntas para ver cómo responde</li>
                        <li>Verifica que el historial de mensajes se muestre correctamente</li>
                        <li>Comprueba que la interfaz sea agradable y funcional</li>
                      </ol>
                      <div className="mt-4 bg-slate-100 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                        <div className="text-sm font-semibold mb-2">Depuración:</div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          Si encuentras algún error o comportamiento inesperado, puedes utilizar la consola del navegador para depurar problemas en el código JavaScript.
                        </p>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <div className="bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm font-semibold">
                        Vista previa
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 max-h-56 overflow-y-auto">
                          <div className="flex flex-col space-y-3">
                            <div className="ml-auto bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 p-2 rounded-lg max-w-[80%] text-sm">
                              ¿Qué es JavaScript?
                            </div>
                            <div className="mr-auto bg-slate-200 dark:bg-slate-700 p-2 rounded-lg max-w-[80%] text-sm">
                              JavaScript es un lenguaje de programación interpretado, dialecto del estándar ECMAScript. Se define como orientado a objetos, basado en prototipos, imperativo, débilmente tipado y dinámico.
                            </div>
                            <div className="ml-auto bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 p-2 rounded-lg max-w-[80%] text-sm">
                              ¿Cómo creo una función en Python?
                            </div>
                            <div className="mr-auto bg-slate-200 dark:bg-slate-700 p-2 rounded-lg max-w-[80%] text-sm">
                              En Python, puedes crear una función utilizando la palabra clave 'def', seguida del nombre de la función y paréntesis. Por ejemplo: def mi_funcion(): pass
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Escribe tu pregunta aquí..." 
                            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                          />
                          <button className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg">
                            Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-xl font-semibold mb-3">Paso 6: Ampliar Funcionalidades (Avanzado)</h3>
                  <p className="text-slate-700 dark:text-slate-300 mb-4">
                    Una vez que tengas un chatbot básico funcionando, puedes mejorar sus capacidades con estas funcionalidades avanzadas:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold mb-2">Integración con OpenAI</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Conecta tu chatbot con la API de OpenAI para generar respuestas dinámicas utilizando modelos de lenguaje avanzados como GPT-4o.
                      </p>
                      <div className="mt-3">
                        <Link href="/tutorials/chatbot-openai">
                          <a className="text-primary-600 dark:text-primary-400 text-sm">Ver guía →</a>
                        </Link>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold mb-2">Persistencia de datos</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Implementa almacenamiento local o en la nube para guardar conversaciones entre sesiones y mejorar el aprendizaje.
                      </p>
                      <div className="mt-3">
                        <Link href="/tutorials/chatbot-storage">
                          <a className="text-primary-600 dark:text-primary-400 text-sm">Ver guía →</a>
                        </Link>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="font-semibold mb-2">Personalización avanzada</div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Añade avatares, indicadores de escritura, opciones de voz y temas personalizables para mejorar la experiencia.
                      </p>
                      <div className="mt-3">
                        <Link href="/tutorials/chatbot-ui">
                          <a className="text-primary-600 dark:text-primary-400 text-sm">Ver guía →</a>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center mt-8">
                  <Link href="/workspace/new?template=chatbot">
                    <a>
                      <Button size={isMobile ? "default" : "lg"} className="text-base">
                        <i className="ri-chat-3-line mr-2"></i> Crear mi chatbot ahora
                      </Button>
                    </a>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutorial de Aplicación Web */}
          <TabsContent value="web-app" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Tutorial: Creación de Aplicaciones Web</CardTitle>
                <CardDescription>
                  Aprende a generar aplicaciones web completas con frontend y backend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <i className="ri-tools-line text-6xl text-slate-400 dark:text-slate-600 mb-4"></i>
                  <p className="text-slate-600 dark:text-slate-400">
                    Este tutorial estará disponible próximamente. ¡Estamos trabajando en ello!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutorial de API REST */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Tutorial: Desarrollo de APIs REST</CardTitle>
                <CardDescription>
                  Guía para crear APIs RESTful utilizando nuestra plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8">
                  <i className="ri-tools-line text-6xl text-slate-400 dark:text-slate-600 mb-4"></i>
                  <p className="text-slate-600 dark:text-slate-400">
                    Este tutorial estará disponible próximamente. ¡Estamos trabajando en ello!
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center mb-4 sm:mb-0">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center mr-2">
                <i className="ri-code-box-line text-white text-sm"></i>
              </div>
              <span className="text-lg font-bold text-white"><span className="golden-text">CODESTORM AI</span></span>
            </div>
            <div className="flex space-x-4 sm:space-x-8">
              <a href="#" className="hover:text-white text-sm sm:text-base">Términos</a>
              <a href="#" className="hover:text-white text-sm sm:text-base">Privacidad</a>
              <a href="#" className="hover:text-white text-sm sm:text-base">Ayuda</a>
            </div>
          </div>
          <div className="mt-4 sm:mt-8 text-center text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} <span className="golden-text">CODESTORM AI</span>. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Tutorials;