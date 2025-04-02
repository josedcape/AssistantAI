
// Sistema de efectos de sonido para la aplicación
class SoundSystem {
  private sounds: Record<string, HTMLAudioElement> = {};
  private enabled: boolean = true;
  
  constructor() {
    // Precarga los efectos de sonido comunes
    this.preloadSounds({
      click: '/sounds/click.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      notification: '/sounds/notification.mp3',
      typing: '/sounds/typing.mp3',
      deploy: '/sounds/deploy.mp3',
      save: '/sounds/save.mp3',
      hover: '/sounds/hover.mp3',
    });
    
    // Recuperar preferencia de sonido del usuario
    const soundEnabled = localStorage.getItem('sound-enabled');
    this.enabled = soundEnabled === null ? true : soundEnabled === 'true';
  }
  
  private preloadSounds(sources: Record<string, string>): void {
    // Solo cargamos los sonidos si el navegador soporta Audio
    if (typeof Audio !== 'undefined') {
      Object.entries(sources).forEach(([name, path]) => {
        try {
          const audio = new Audio();
          audio.volume = 0.4; // Volumen moderado por defecto
          audio.src = path;
          this.sounds[name] = audio;
        } catch (error) {
          console.warn(`No se pudo cargar el sonido: ${name}`);
        }
      });
    }
  }
  
  play(name: string, volume: number = 0.4): void {
    if (!this.enabled) return;
    
    const sound = this.sounds[name];
    if (sound) {
      // Crear una nueva instancia para permitir sonidos superpuestos
      const soundClone = sound.cloneNode() as HTMLAudioElement;
      soundClone.volume = volume;
      soundClone.play().catch(err => {
        console.warn(`Error reproduciendo sonido ${name}:`, err);
      });
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
