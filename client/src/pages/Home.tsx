import Header from "@/components/Header";
import ProjectList from "@/components/ProjectList";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero section */}
        <section className="py-12 md:py-20 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                <span className="gradient-bg text-transparent bg-clip-text">CodeCraft AI</span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-6 max-w-3xl mx-auto">
                Genera código de calidad a partir de descripciones en lenguaje natural con la ayuda de la IA
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="text-base">
                  <i className="ri-rocket-line mr-2"></i> Empezar ahora
                </Button>
                <Button variant="outline" size="lg" className="text-base">
                  <i className="ri-book-open-line mr-2"></i> Ver tutorial
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features section */}
        <section className="py-12 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
              Todo lo que necesitas para desarrollar más rápido
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center mb-4">
                  <i className="ri-magic-line text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">Generación con IA</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Convierte tus ideas en código funcional con una simple descripción en lenguaje natural.
                </p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center mb-4">
                  <i className="ri-code-box-line text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">Editor inteligente</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Edita y mejora el código generado con un potente editor integrado.
                </p>
              </div>
              
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                <div className="w-12 h-12 rounded-lg gradient-bg flex items-center justify-center mb-4">
                  <i className="ri-play-circle-line text-white text-xl"></i>
                </div>
                <h3 className="text-xl font-semibold mb-2">Ejecución en tiempo real</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Ejecuta y visualiza los resultados de tu código instantáneamente para un desarrollo fluido.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Projects section */}
        <section className="py-12 bg-white dark:bg-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProjectList />
          </div>
        </section>
        
        {/* CTA section */}
        <section className="py-12 md:py-20 gradient-bg text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              ¿Listo para transformar tus ideas en código?
            </h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Comienza a utilizar el poder de la IA para crear aplicaciones más rápido que nunca.
            </p>
            <Link href="/workspace/1">
              <a>
                <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-primary-500">
                  <i className="ri-code-line mr-2"></i> Crear un proyecto
                </Button>
              </a>
            </Link>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center mr-2">
                <i className="ri-code-box-line text-white text-sm"></i>
              </div>
              <span className="text-lg font-bold text-white">CodeCraft AI</span>
            </div>
            <div className="flex space-x-8">
              <a href="#" className="hover:text-white">Términos</a>
              <a href="#" className="hover:text-white">Privacidad</a>
              <a href="#" className="hover:text-white">Ayuda</a>
            </div>
          </div>
          <div className="mt-8 text-center text-sm">
            &copy; {new Date().getFullYear()} CodeCraft AI. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
