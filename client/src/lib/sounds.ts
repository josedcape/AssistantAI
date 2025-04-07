
// Sistema de efectos de sonido para la aplicación
class SoundSystem {
  private sounds: Record<string, HTMLAudioElement> = {};
  private enabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    // Solo ejecutar en el navegador
    if (typeof window !== 'undefined') {
      try {
        // Recuperar preferencia de sonido del usuario
        const soundEnabled = localStorage.getItem('sound-enabled');
        this.enabled = soundEnabled === null ? true : soundEnabled === 'true';
        
        // Inicializar sonidos cuando el DOM esté listo
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          this.preloadSounds();
        } else {
          document.addEventListener('DOMContentLoaded', () => this.preloadSounds());
        }
      } catch (error) {
        // Capturar errores de acceso a localStorage
        console.debug('No se pudo acceder a localStorage:', error);
        this.enabled = true;
      }
    }
  }
  
  private preloadSounds(): void {
    // Sólo cargar los sonidos si estamos en el navegador
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    
    try {
      const soundSources = {
        click: '/sounds/click.mp3',
        hover: '/sounds/hover.mp3',
        success: '/sounds/success.mp3',
        error: '/sounds/error.mp3',
        notification: '/sounds/notification.mp3',
        save: '/sounds/save.mp3',
        deploy: '/sounds/deploy.mp3',
      };
      
      // Precargar los sonidos
      Object.entries(soundSources).forEach(([name, path]) => {
        try {
          const audio = new Audio(path);
          audio.preload = 'auto';
          this.sounds[name] = audio;
        } catch (e) {
          console.debug(`No se pudo cargar el sonido: ${name}`, e);
        }
      });
      
      this.initialized = true;
    } catch (e) {
      console.debug('No se pudieron precargar los sonidos', e);
    }
  }
  
  play(name: string, volume: number = 0.4): void {
    if (!this.enabled || !this.initialized || typeof window === 'undefined') return;
    
    try {
      const sound = this.sounds[name];
      if (sound) {
        // Crear una nueva instancia para permitir sonidos superpuestos
        const soundClone = sound.cloneNode() as HTMLAudioElement;
        soundClone.volume = Math.min(Math.max(volume, 0), 1); // Limitar entre 0 y 1
        
        soundClone.play().catch(err => {
          // Ignorar errores de reproducción silenciosamente
          // Estos pueden ocurrir debido a restricciones del navegador
        });
      }
    } catch (e) {
      // Silenciar errores de reproducción
    }
  }
  
  toggle(): boolean {
    if (typeof window === 'undefined') return this.enabled;
    
    try {
      this.enabled = !this.enabled;
      localStorage.setItem('sound-enabled', this.enabled.toString());
    } catch (error) {
      // Silenciar errores de localStorage
    }
    return this.enabled;
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Exportamos una instancia única
export const sounds = new SoundSystem();

// Función segura para reproducir sonidos desde cualquier parte
export const play = async (soundName: string, volume = 0.4): Promise<void> => {
  try {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
    
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = volume;
    await audio.play().catch(() => {
      // Ignorar errores de reproducción silenciosamente
    });
  } catch (error) {
    // No mostrar errores en consola para evitar spam
  }
};
