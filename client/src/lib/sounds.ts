// Sistema de efectos de sonido para la aplicación
class SoundSystem {
  private sounds: Record<string, HTMLAudioElement> = {};
  private enabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    // Recuperar preferencia de sonido del usuario
    const soundEnabled = localStorage.getItem('sound-enabled');
    this.enabled = soundEnabled === null ? true : soundEnabled === 'true';

    // Inicializar sonidos bajo demanda
    if (typeof window !== 'undefined') {
      window.addEventListener('click', () => {
        // Inicializar sonidos la primera vez que el usuario interactúa
        if (!this.initialized) {
          this.initialize();
        }
      }, { once: true });
    }
  }

  private initialize(): void {
    // Precarga los efectos de sonido comunes
    this.preloadSounds({
      click: '/sounds/click.mp3',
      notification: '/sounds/notification.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      hover: '/sounds/hover.mp3',
      save: '/sounds/save.mp3',
    });
    this.initialized = true;
  }

  private preloadSounds(sources: Record<string, string>): void {
    // Solo cargamos los sonidos si el navegador soporta Audio
    if (typeof Audio !== 'undefined') {
      Object.entries(sources).forEach(([name, path]) => {
        try {
          const audio = new Audio(path);
          audio.load();
          this.sounds[name] = audio;
        } catch (err) {
          console.debug(`No se pudo cargar el sonido: ${path}`);
        }
      });
    }
  }

  play(name: string, volume: number = 0.4): void {
    if (!this.enabled || !this.initialized) return;

    const sound = this.sounds[name];
    if (sound) {
      // Crear una nueva instancia para permitir sonidos superpuestos
      try {
        const newSound = sound.cloneNode() as HTMLAudioElement;
        newSound.volume = volume;
        const playPromise = newSound.play();

        // Solo manejamos la promesa si existe
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Silenciar errores en consola
          });
        }
      } catch (err) {
        // Silenciar errores de reproducción
      }
    }
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    localStorage.setItem('sound-enabled', this.enabled.toString());
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Exportamos una instancia única
export const sounds = new SoundSystem();

// Función auxiliar para reproducir sonidos sin depender del sistema principal
export const play = async (soundName: string, volume = 0.4): Promise<void> => {
  try {
    if (typeof Audio === 'undefined') return;

    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = volume;
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Silenciar errores
      });
    }
  } catch (error) {
    // Silenciar errores
  }
};