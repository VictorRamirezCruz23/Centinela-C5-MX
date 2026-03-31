// /clases/sonidoNotificacion.js
// Sistema de sonidos que detecta dinámicamente los archivos disponibles en Firebase Storage

import { storage } from '/config/firebase-config.js';
import { ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js";

export class SonidoNotificacion {
    constructor() {
        this.audioElements = new Map();
        this.soundUrls = new Map();
        this.soundConfigs = new Map();
        this.initialized = false;
        this.activeSources = new Map();
        this.defaultVolume = 0.7;
        this.availableSounds = [];
        
        // Configuración base de volúmenes
        this.volumeConfig = {
            'alarma-robo': 0.9,
            'alerta-critica': 0.85,
            'alerta-urgente': 0.8,
            'notificacion-pendiente': 0.6,
            'mensaje-recibido': 0.5,
            'campana-suave': 0.5,
            'ding-moderno': 0.55,
            'timbre-oficina': 0.6,
            'notificacion-movil': 0.5,
            'sintetizador-alerta': 0.7,
            'incidencia': 0.7,        // Sonido para incidencias
            'actualizacion': 0.6,      // Sonido para seguimientos/actualizaciones
            'canalizacion': 0.65,      // Sonido para canalizaciones
            'comentario': 0.55         // Sonido para comentarios
        };
        
        this.loopableConfig = {
            'alarma-robo': true,
            'alerta-critica': true,
            'alerta-urgente': true,
            'incidencia': false,
            'actualizacion': false,
            'canalizacion': false,
            'comentario': false
        };
        
        this.namesConfig = {
            'alarma-robo': 'Alarma de Robo',
            'alerta-critica': 'Alerta Crítica',
            'alerta-urgente': 'Alerta Urgente',
            'notificacion-pendiente': 'Notificación Pendiente',
            'mensaje-recibido': 'Mensaje Recibido',
            'campana-suave': 'Campana Suave',
            'ding-moderno': 'Ding Moderno',
            'timbre-oficina': 'Timbre Oficina',
            'notificacion-movil': 'Notificación Móvil',
            'sintetizador-alerta': 'Alerta Sintetizada',
            'incidencia': 'Notificación de Incidencia',
            'actualizacion': 'Notificación de Actualización',
            'canalizacion': 'Notificación de Canalización',
            'comentario': 'Notificación de Comentario'
        };
        
        this.init();
    }

    async init() {
        if (this.initialized) return;
        
        await this.scanAvailableSounds();
        
        this.initialized = true;
    }

    async scanAvailableSounds() {
        try {
            const folderRef = ref(storage, 'audios/notificaciones/');
            const result = await listAll(folderRef);
            
            for (const itemRef of result.items) {
                const fullPath = itemRef.fullPath;
                const fileName = fullPath.split('/').pop();
                const soundName = fileName.replace('.mp3', '').replace('.wav', '').replace('.ogg', '');
                
                const url = await getDownloadURL(itemRef);
                this.soundUrls.set(soundName, url);
                
                const audio = new Audio();
                audio.preload = 'auto';
                audio.src = url;
                
                const volume = this.volumeConfig[soundName] || 0.6;
                audio.volume = volume;
                audio.load();
                
                this.audioElements.set(soundName, audio);
                
                this.soundConfigs.set(soundName, {
                    name: this.namesConfig[soundName] || this.formatSoundName(soundName),
                    path: fullPath,
                    volume: volume,
                    loopable: this.loopableConfig[soundName] || false,
                    url: url
                });
                
                this.availableSounds.push(soundName);
            }
            
            if (this.availableSounds.length === 0) {
                console.warn('⚠️ No se encontraron archivos de sonido en audios/notificaciones/');
                console.warn('💡 Sube archivos MP3 a Firebase Storage en la carpeta: audios/notificaciones/');
                console.warn('💡 Archivos esperados: incidencia.mp3, actualizacion.mp3, canalizacion.mp3, comentario.mp3');
            }
            
        } catch (error) {
            console.error('❌ Error escaneando sonidos:', error);
        }
    }

    formatSoundName(soundName) {
        return soundName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async initialize() {
        await this.init();
        return true;
    }

    async requestAudioPermission() {
        try {
            const testAudio = new Audio();
            testAudio.volume = 0;
            const playPromise = testAudio.play();
            if (playPromise !== undefined) {
                await playPromise;
                testAudio.pause();
            }
            return true;
        } catch (error) {
            return true;
        }
    }

    isReady() {
        return this.initialized;
    }

    /**
     * Reproducir un sonido específico
     * @param {string} soundName - Nombre del sonido (incidencia, actualizacion, etc.)
     * @param {number} volume - Volumen (0-1)
     * @param {boolean} loop - Si debe repetirse
     */
    async play(soundName, volume = null, loop = false) {
        if (!this.initialized) {
            await this.init();
        }
        
        let audio = this.audioElements.get(soundName);
        
        if (!audio && !this.availableSounds.includes(soundName)) {
            console.warn(`🔇 Sonido no disponible: ${soundName}`);
            return null;
        }
        
        if (!audio) {
            console.debug(`🔇 Sonido no cargado: ${soundName}`);
            return null;
        }
        
        try {
            const config = this.soundConfigs.get(soundName);
            const targetVolume = volume !== null ? volume : (config?.volume || this.defaultVolume);
            audio.volume = Math.min(1, Math.max(0, targetVolume));
            audio.loop = loop;
            audio.currentTime = 0;
            
            const soundId = `${soundName}_${Date.now()}`;
            
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.activeSources.set(soundId, audio);
                        const soundConfig = this.soundConfigs.get(soundName);
                    })
                    .catch(error => {
                        console.debug('Error reproduciendo sonido:', error.message);
                    });
            }
            
            audio.onended = () => {
                if (this.activeSources.get(soundId) === audio) {
                    this.activeSources.delete(soundId);
                }
            };
            
            return soundId;
            
        } catch (error) {
            console.debug('Error reproduciendo sonido:', error);
            return null;
        }
    }

    stop(soundId) {
        const audio = this.activeSources.get(soundId);
        if (audio) {
            try {
                audio.pause();
                audio.currentTime = 0;
                this.activeSources.delete(soundId);
            } catch (e) {
                console.debug('Error deteniendo sonido:', e);
            }
        }
    }

    stopAll() {
        this.activeSources.forEach((audio, id) => {
            try {
                audio.pause();
                audio.currentTime = 0;
            } catch (e) {}
            this.activeSources.delete(id);
        });
    }

    setGlobalVolume(volume) {
        this.defaultVolume = Math.max(0, Math.min(1, volume));
        this.audioElements.forEach(audio => {
            audio.volume = this.defaultVolume;
        });
    }
    
    setEnabled(enabled) {
        if (!enabled) {
            this.stopAll();
        }
    }

    isAvailable() {
        return this.initialized;
    }

    getAvailableSounds() {
        return this.availableSounds.map(soundName => {
            const config = this.soundConfigs.get(soundName);
            return {
                id: soundName,
                name: config?.name || this.formatSoundName(soundName),
                volume: config?.volume || 0.6,
                loopable: config?.loopable || false,
                exists: true
            };
        });
    }

    hasSound(soundName) {
        return this.availableSounds.includes(soundName);
    }

    getFirstAvailableSound() {
        return this.availableSounds.length > 0 ? this.availableSounds[0] : null;
    }
}

// Exportar instancia única
export const sonidoNotificacion = new SonidoNotificacion();