import Header from "@/components/Header";
import ProjectList from "@/components/ProjectList";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

const Home = () => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header />
      <main className="flex-1">
        <div className="container relative">
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 shadow-lg transform hover:scale-105 transition-transform duration-300" style={{background: 'radial-gradient(circle, rgba(162,160,226,1) 9%, rgba(32,35,217,1) 78%)'}}>
              <img 
                src="/imagenes/botidinamix.jpg" 
                alt="BOTIDINAMIX AI" 
                className="w-full h-full object-cover"
                style={{
                  filter: 'contrast(1.1) brightness(1.1)',
                  mixBlendMode: 'luminosity'
                }}
              />
            </div>
          </div>
          {/* Hero section */}
          <section className="py-10 sm:py-12 md:py-20 bg-white dark:bg-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <div className="relative">
                  {/* Background decorations - visible on desktop only */}
                  <div className="hidden md:block absolute -top-10 -left-10 w-40 h-40 bg-primary-100 dark:bg-primary-900/20 rounded-full blur-3xl opacity-70"></div>
                  <div className="hidden md:block absolute -bottom-10 -right-10 w-40 h-40 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl opacity-70"></div>

                  {/* Main title with gradient - responsive sizes */}
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 sm:mb-4 relative z-10">
                    <span className="gradient-bg text-transparent bg-clip-text" style={{color: 'gold'}}>CODESTORM AI</span>
                  </h1>
                </div>

                <p className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-6 max-w-3xl mx-auto px-1">
                  Genera código de calidad a partir de descripciones en lenguaje natural con la ayuda de la IA
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Link href="/workspace/new">
                    <a>
                      <Button size={isMobile ? "default" : "lg"} className="text-base">
                        <i className="ri-rocket-line mr-2"></i> Empezar ahora
                      </Button>
                    </a>
                  </Link>
                  <Link href="/tutorials">
                    <a>
                      <Button variant="outline" size={isMobile ? "default" : "lg"} className="text-base">
                        <i className="ri-book-open-line mr-2"></i> Ver tutorial
                      </Button>
                    </a>
                  </Link>
                </div>

                {/* Mobile app demo preview - visible only on larger screens */}
                <div className="hidden md:block relative mt-12 max-w-3xl mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/10 to-transparent rounded-xl blur-xl"></div>
                  <div className="relative overflow-hidden rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
                    <div className="bg-slate-800 h-8 flex items-center px-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-900 p-4">
                      <div className="flex">
                        <div className="w-40 bg-white dark:bg-slate-800 rounded p-2 text-xs">
                          <div className="font-bold mb-2">Archivos</div>
                          <div className="text-blue-500">index.html</div>
                          <div>style.css</div>
                          <div>script.js</div>
                        </div>
                        <div className="flex-1 ml-2 bg-white dark:bg-slate-800 rounded p-2 text-xs font-mono overflow-hidden">
                          <div className="text-slate-500">/* Código generado por IA */</div>
                          <div>
                            <span className="text-blue-600">function</span>
                            <span className="text-green-600"> calcularTotal</span>() {'{'}
                          </div>
                          <div>
                            &nbsp;&nbsp;<span className="text-purple-600">const</span> items = 
                            document.<span className="text-teal-600">querySelectorAll</span>
                            (<span className="text-orange-500">'.item'</span>);
                          </div>
                          <div>
                            &nbsp;&nbsp;<span className="text-purple-600">let</span> total = 
                            <span className="text-amber-600"> 0</span>;
                          </div>
                          <div>
                            &nbsp;&nbsp;items.<span className="text-teal-600">forEach</span>
                            (item =&gt; {'{'}
                          </div>
                          <div>
                            &nbsp;&nbsp;&nbsp;&nbsp;total += 
                            <span className="text-amber-600">parseFloat</span>
                            (item.dataset.price);
                          </div>
                          <div>
                            &nbsp;&nbsp;{'}'});
                          </div>
                          <div>
                            &nbsp;&nbsp;<span className="text-purple-600">return</span> total;
                          </div>
                          <div>
                            {'}'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features section */}
          <section className="py-10 sm:py-12 bg-slate-50 dark:bg-slate-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-10">
                Todo lo que necesitas para desarrollar más rápido
              </h2>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg gradient-bg flex items-center justify-center mb-4">
                    <i className="ri-magic-line text-white text-lg sm:text-xl"></i>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Generación con IA</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                    Crea aplicaciones y todo lo que quieras crear el limite es tu mente!!.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg gradient-bg flex items-center justify-center mb-4">
                    <i className="ri-code-box-line text-white text-lg sm:text-xl"></i>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Editor inteligente</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                    Edita y mejora el código generado con un potente editor integrado y optimizado para móviles.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:shadow-md sm:col-span-2 md:col-span-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg gradient-bg flex items-center justify-center mb-4">
                    <i className="ri-play-circle-line text-white text-lg sm:text-xl"></i>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">Ejecución en tiempo real</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                    Ejecuta y visualiza los resultados de tu código instantáneamente para un desarrollo fluido en cualquier dispositivo.
                  </p>
                </div>
              </div>

              {/* Responsive design callout - new section */}
              <div className="mt-10 bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-8 border border-primary-100 dark:border-primary-900/30 shadow-sm">
                <div className="flex flex-col md:flex-row items-center">
                  <div className="md:w-1/2 mb-6 md:mb-0 md:pr-8">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center mr-2">
                        <i className="ri-smartphone-line text-white"></i>
                      </div>
                      <h3 className="text-lg font-semibold">Diseño adaptable</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                      Nuestra plataforma está optimizada para funcionar perfectamente en todos tus dispositivos, desde smartphones hasta pantallas de escritorio.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <i className="ri-check-line text-green-500 mt-0.5 mr-2"></i>
                        <span className="text-sm">Interfaz adaptable que se ajusta a cualquier tamaño de pantalla</span>
                      </li>
                      <li className="flex items-start">
                        <i className="ri-check-line text-green-500 mt-0.5 mr-2"></i>
                        <span className="text-sm">Gestos táctiles optimizados para dispositivos móviles</span>
                      </li>
                      <li className="flex items-start">
                        <i className="ri-check-line text-green-500 mt-0.5 mr-2"></i>
                        <span className="text-sm">Experiencia de codificación fluida en cualquier lugar</span>
                      </li>
                    </ul>
                  </div>
                  <div className="md:w-1/2 flex justify-center">
                    <div className="relative">
                      {/* Desktop device mockup */}
                      <div className="hidden md:block bg-slate-900 rounded-lg w-64 h-40 p-2 shadow-md">
                        <div className="bg-slate-800 h-4 w-full rounded flex items-center px-1 mb-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                        <div className="bg-slate-200 dark:bg-slate-700 h-32 rounded animate-pulse"></div>
                      </div>

                      {/* Mobile device mockup */}
                      <div className="bg-slate-900 rounded-2xl w-28 h-56 p-2 shadow-lg -ml-10 mt-10 absolute top-0 left-0 transform -rotate-6">
                        <div className="bg-slate-200 dark:bg-slate-700 h-full rounded-xl animate-pulse relative overflow-hidden">
                          <div className="absolute top-2 left-2 right-2 h-8 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
                          <div className="absolute top-12 left-2 w-10 h-32 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
                          <div className="absolute top-12 right-2 w-12 h-32 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
                        </div>
                      </div>

                      {/* Tablet device mockup */}
                      <div className="bg-slate-900 rounded-xl w-40 h-48 p-2 shadow-md ml-14 transform rotate-6">
                        <div className="bg-slate-200 dark:bg-slate-700 h-full rounded-lg animate-pulse relative overflow-hidden">
                          <div className="absolute top-2 left-2 right-2 h-6 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
                          <div className="absolute top-10 left-2 w-8 h-32 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
                          <div className="absolute top-10 left-12 right-2 h-32 bg-slate-300 dark:bg-slate-600 rounded-md"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Projects section */}
          <section className="py-10 sm:py-12 bg-white dark:bg-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ProjectList />
            </div>
          </section>

          {/* CTA section */}
          <section className="py-10 sm:py-12 md:py-20 gradient-bg text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
                ¿Listo para transformar tus ideas en código?
              </h2>
              <p className="text-lg sm:text-xl mb-6 sm:mb-8 max-w-3xl mx-auto">
                Comienza a utilizar el poder de la IA para crear aplicaciones más rápido que nunca.
              </p>
              <Link href="/workspace/1">
                <a>
                  <Button 
                    size={isMobile ? "default" : "lg"} 
                    variant="outline" 
                    className="text-white border-white hover:bg-white hover:text-primary-500 w-full sm:w-auto"
                  >
                    <i className="ri-code-line mr-2"></i> Crear un proyecto
                  </Button>
                </a>
              </Link>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-400 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center mr-2">
                  <i className="ri-code-box-line text-white text-sm"></i>
                </div>
                <span className="text-lg font-bold" style={{color: 'gold'}}>CODESTORM AI</span>
              </div>
              <div className="flex space-x-4 sm:space-x-8">
                <a href="#" className="hover:text-white text-sm sm:text-base">Términos</a>
                <a href="#" className="hover:text-white text-sm sm:text-base">Privacidad</a>
                <a href="#" className="hover:text-white text-sm sm:text-base">Ayuda</a>
              </div>
            </div>
            <div className="mt-4 sm:mt-8 text-center text-xs sm:text-sm">
              &copy; {new Date().getFullYear()} CODESTORM AI. Todos los derechos reservados.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Home;