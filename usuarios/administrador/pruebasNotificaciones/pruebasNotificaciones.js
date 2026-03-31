// /usuarios/administrador/pruebasNotificaciones/pruebasNotificaciones.js
import { UserManager } from '/clases/user.js';
import { fcmInitializer } from '/components/fcm-initializer.js';
import { notificationSound } from '/clases/notificationSound.js';

const userManager = new UserManager();

// Estado de la aplicación
const AppState = {
    currentUser: null,
    userData: null,
    fcmToken: null,
    isProcessing: false,
    soundEnabled: true,
    selectedSound: null, // Se cargará dinámicamente
    soundVolume: 0.7,
    audioInitialized: false,
    availableSounds: [] // Lista de sonidos disponibles
};

// Función para inicializar audio
async function initAudioSystem() {
    if (AppState.audioInitialized) return true;
    
    try {
        await notificationSound.initialize();
        await notificationSound.requestAudioPermission();
        
        // Obtener sonidos disponibles dinámicamente
        AppState.availableSounds = notificationSound.getAvailableSounds();
        
        // Si hay sonidos disponibles, seleccionar el primero como predeterminado
        if (AppState.availableSounds.length > 0 && !AppState.selectedSound) {
            // Buscar ding-moderno si existe, sino el primero
            const dingSound = AppState.availableSounds.find(s => s.id === 'ding-moderno');
            AppState.selectedSound = dingSound ? dingSound.id : AppState.availableSounds[0].id;
        }
        
        AppState.audioInitialized = true;
        AppState.soundEnabled = true;
        console.log('🔊 Sistema de audio inicializado correctamente');
        console.log(`📋 Sonidos disponibles: ${AppState.availableSounds.length}`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error inicializando audio:', error);
        return false;
    }
}

// Función para actualizar el selector de sonidos dinámicamente
function actualizarSelectorSonidos() {
    const soundTypeSelect = document.getElementById('soundType');
    if (!soundTypeSelect) return;
    
    // Limpiar opciones existentes (excepto la primera)
    while (soundTypeSelect.options.length > 1) {
        soundTypeSelect.remove(1);
    }
    
    // Agregar sonidos disponibles
    AppState.availableSounds.forEach(sound => {
        const option = document.createElement('option');
        option.value = sound.id;
        
        // Mapear tipos de sonido para mostrar nombre amigable
        const typeMap = {
            'alarma-robo': '🚨 Alarma de Robo',
            'alerta-critica': '⚠️ Alerta Crítica',
            'alerta-urgente': '🔴 Alerta Urgente',
            'notificacion-pendiente': '⏰ Notificación Pendiente',
            'mensaje-recibido': '💬 Mensaje Recibido',
            'campana-suave': '🔔 Campana Suave',
            'ding-moderno': '✨ Ding Moderno',
            'timbre-oficina': '🏢 Timbre Oficina',
            'notificacion-movil': '📱 Notificación Móvil',
            'sintetizador-alerta': '🎵 Alerta Sintetizada'
        };
        
        option.textContent = typeMap[sound.id] || sound.name;
        soundTypeSelect.appendChild(option);
    });
    
    // Seleccionar el sonido actual si existe
    if (AppState.selectedSound && AppState.availableSounds.some(s => s.id === AppState.selectedSound)) {
        soundTypeSelect.value = AppState.selectedSound;
    } else if (AppState.availableSounds.length > 0) {
        soundTypeSelect.value = AppState.availableSounds[0].id;
    }
}

// Función para reproducir sonido de notificación
async function reproducirSonidoNotificacion(tipo = 'normal') {
    if (!AppState.soundEnabled) {
        console.log('🔇 Sonidos desactivados');
        return;
    }
    
    if (!AppState.audioInitialized) {
        await initAudioSystem();
        if (!AppState.audioInitialized) {
            console.log('🔇 No se pudo inicializar audio');
            return;
        }
    }
    
    // Mapear tipo de notificación a sonido (usando solo los disponibles)
    const soundMap = {
        'critico': 'alarma-robo',
        'urgente': 'alerta-urgente',
        'alerta': 'alerta-critica',
        'pendiente': 'notificacion-pendiente',
        'mensaje': 'mensaje-recibido',
        'normal': 'ding-moderno',
        'campana': 'campana-suave',
        'oficina': 'timbre-oficina',
        'movil': 'notificacion-movil',
        'sintetizador': 'sintetizador-alerta'
    };
    
    let soundName = soundMap[tipo] || AppState.selectedSound;
    
    // Verificar si el sonido está disponible
    if (!AppState.availableSounds.some(s => s.id === soundName)) {
        // Si no está disponible, usar el primer sonido disponible
        soundName = AppState.availableSounds.length > 0 ? AppState.availableSounds[0].id : null;
        if (!soundName) return;
    }
    
    try {
        await notificationSound.play(soundName, AppState.soundVolume);
        console.log(`🔊 Sonido reproducido: ${soundName}`);
    } catch (error) {
        console.debug('Error reproduciendo sonido:', error);
    }
}

// Función para solicitar activación de sonidos
async function solicitarPermisoAudio() {
    try {
        const initSuccess = await initAudioSystem();
        
        if (initSuccess && AppState.availableSounds.length > 0) {
            await Swal.fire({
                icon: 'success',
                title: '✅ Sonidos activados',
                html: `Se encontraron ${AppState.availableSounds.length} sonidos disponibles.<br>Las notificaciones reproducirán sonidos automáticamente.`,
                timer: 3000,
                showConfirmButton: false
            });
            actualizarUI();
            actualizarSelectorSonidos();
        } else if (initSuccess && AppState.availableSounds.length === 0) {
            await Swal.fire({
                icon: 'warning',
                title: '⚠️ No hay sonidos',
                text: 'No se encontraron archivos de sonido. Sube archivos MP3 a audios/notificaciones/ en Firebase Storage.',
                timer: 4000,
                showConfirmButton: false
            });
        } else {
            await Swal.fire({
                icon: 'error',
                title: '❌ Error',
                text: 'No se pudieron cargar los sonidos. Verifica tu conexión.',
                timer: 3000,
                showConfirmButton: false
            });
        }
        
        return AppState.soundEnabled;
        
    } catch (error) {
        console.error('Error activando sonidos:', error);
        return false;
    }
}

// Función para probar sonidos disponibles
async function probarSonidos() {
    if (!AppState.audioInitialized) {
        await initAudioSystem();
    }
    
    if (AppState.availableSounds.length === 0) {
        await Swal.fire({
            icon: 'warning',
            title: 'No hay sonidos disponibles',
            text: 'Sube archivos MP3 a la carpeta "audios/notificaciones/" en Firebase Storage',
            confirmButtonText: 'Entendido'
        });
        return;
    }
    
    const sounds = AppState.availableSounds;
    
    const buttonsHtml = sounds.map(sound => {
        const typeMap = {
            'alarma-robo': '🚨',
            'alerta-critica': '⚠️',
            'alerta-urgente': '🔴',
            'notificacion-pendiente': '⏰',
            'mensaje-recibido': '💬',
            'campana-suave': '🔔',
            'ding-moderno': '✨',
            'timbre-oficina': '🏢',
            'notificacion-movil': '📱',
            'sintetizador-alerta': '🎵'
        };
        const icon = typeMap[sound.id] || '🎵';
        
        return `
            <button class="sound-test-btn" data-sound="${sound.id}" style="
                margin: 5px;
                padding: 10px 15px;
                background: var(--color-bg-secondary, #1a1a1a);
                border: 1px solid var(--color-border-light, #333);
                border-radius: 8px;
                cursor: pointer;
                color: var(--color-text-primary, #fff);
                transition: all 0.3s ease;
            ">
                ${icon} ${sound.name}
            </button>
        `;
    }).join('');
    
    await Swal.fire({
        title: '🎵 Probar Sonidos',
        html: `
            <div style="max-height: 450px; overflow-y: auto; padding: 10px;">
                <p style="margin-bottom: 15px; text-align: center;">
                    <i class="fas fa-info-circle"></i> 
                    Sonidos encontrados: ${sounds.length}
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
                    ${buttonsHtml}
                </div>
                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #333;">
                    <label style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fas fa-volume-down"></i>
                        <input type="range" id="testVolumeSlider" min="0" max="100" value="${AppState.soundVolume * 100}" style="width: 200px;">
                        <span id="testVolumeValue">${Math.round(AppState.soundVolume * 100)}%</span>
                        <i class="fas fa-volume-up"></i>
                    </label>
                </div>
                <div style="margin-top: 15px;">
                    <label style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <input type="checkbox" id="testLoopCheckbox">
                        <span>Repetir en bucle</span>
                    </label>
                </div>
                <div style="margin-top: 15px; font-size: 11px; color: #888; text-align: center;">
                    <i class="fas fa-cloud-upload-alt"></i> 
                    Los sonidos se cargan desde Firebase Storage
                </div>
            </div>
        `,
        width: '600px',
        showConfirmButton: true,
        confirmButtonText: 'Cerrar',
        didOpen: () => {
            document.querySelectorAll('.sound-test-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const soundId = btn.dataset.sound;
                    const volume = document.getElementById('testVolumeSlider').value / 100;
                    const loop = document.getElementById('testLoopCheckbox').checked;
                    
                    if (loop) {
                        notificationSound.stopAll();
                    }
                    
                    await notificationSound.play(soundId, volume, loop);
                });
            });
            
            const volumeSlider = document.getElementById('testVolumeSlider');
            const volumeValue = document.getElementById('testVolumeValue');
            
            volumeSlider.addEventListener('input', (e) => {
                const vol = e.target.value;
                volumeValue.textContent = `${vol}%`;
            });
        }
    });
}

// Función para configurar selector de sonido predeterminado
async function configurarSonidoPredeterminado() {
    if (!AppState.audioInitialized) {
        await initAudioSystem();
    }
    
    if (AppState.availableSounds.length === 0) {
        await Swal.fire({
            icon: 'warning',
            title: 'No hay sonidos disponibles',
            text: 'Sube archivos MP3 a la carpeta "audios/notificaciones/" en Firebase Storage',
            confirmButtonText: 'Entendido'
        });
        return;
    }
    
    const sounds = AppState.availableSounds;
    
    const inputOptions = {};
    sounds.forEach(sound => {
        const typeMap = {
            'alarma-robo': '🚨',
            'alerta-critica': '⚠️',
            'alerta-urgente': '🔴',
            'notificacion-pendiente': '⏰',
            'mensaje-recibido': '💬',
            'campana-suave': '🔔',
            'ding-moderno': '✨',
            'timbre-oficina': '🏢',
            'notificacion-movil': '📱',
            'sintetizador-alerta': '🎵'
        };
        const icon = typeMap[sound.id] || '🎵';
        inputOptions[sound.id] = `${icon} ${sound.name}`;
    });
    
    const { value: selectedSound } = await Swal.fire({
        title: '🎵 Sonido Predeterminado',
        text: 'Selecciona el sonido que se usará para las notificaciones',
        input: 'select',
        inputOptions: inputOptions,
        inputValue: AppState.selectedSound,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar'
    });
    
    if (selectedSound) {
        AppState.selectedSound = selectedSound;
        
        await notificationSound.play(selectedSound, AppState.soundVolume);
        
        const selectedSoundName = sounds.find(s => s.id === selectedSound)?.name || selectedSound;
        
        Swal.fire({
            icon: 'success',
            title: 'Sonido guardado',
            text: `Se usará "${selectedSoundName}" para las notificaciones`,
            timer: 2000,
            showConfirmButton: false
        });
        
        actualizarUI();
        
        if (AppState.currentUser && fcmInitializer.isEnabled && fcmInitializer.isEnabled()) {
            await guardarEstadoNotificaciones(true, fcmInitializer.getCurrentToken());
        }
    }
}

// Función para mostrar mensajes con SweetAlert
function mostrarMensaje(tipo, titulo, mensaje, timer = 3000) {
    Swal.fire({
        icon: tipo,
        title: titulo,
        text: mensaje,
        timer: timer,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
    });
    
    if (tipo === 'success') {
        reproducirSonidoNotificacion('normal');
    } else if (tipo === 'error') {
        reproducirSonidoNotificacion('alerta');
    } else if (tipo === 'warning') {
        reproducirSonidoNotificacion('pendiente');
    }
}

// Función para actualizar la UI con el estado actual
function actualizarUI() {
    const statusBadge = document.getElementById('deviceStatusBadge');
    const tokenSpan = document.getElementById('deviceToken');
    const enableBtn = document.getElementById('enableNotificationsBtn');
    const disableBtn = document.getElementById('disableNotificationsBtn');
    const entornoInfo = document.getElementById('entornoInfo');
    const soundStatus = document.getElementById('soundStatus');
    const selectedSoundSpan = document.getElementById('selectedSound');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    
    if (window.location.protocol === 'https:') {
        entornoInfo.innerHTML = '🌐 Entorno de PRODUCCIÓN - Notificaciones disponibles';
        entornoInfo.style.color = '#28a745';
    } else {
        entornoInfo.innerHTML = '💻 Entorno de DESARROLLO - Las notificaciones solo funcionarán después del deploy';
        entornoInfo.style.color = '#ffc107';
    }
    
    const fcmEnabled = fcmInitializer.isEnabled ? fcmInitializer.isEnabled() : false;
    if (fcmEnabled) {
        statusBadge.textContent = 'Activadas';
        statusBadge.className = 'badge-enabled';
        const token = fcmInitializer.getCurrentToken ? fcmInitializer.getCurrentToken() : null;
        tokenSpan.textContent = token ? token.substring(0, 30) + '...' : 'Token obtenido';
        if (enableBtn) enableBtn.disabled = true;
        if (disableBtn) disableBtn.disabled = false;
    } else {
        statusBadge.textContent = 'Desactivadas';
        statusBadge.className = 'badge-disabled';
        tokenSpan.textContent = 'No disponible';
        if (enableBtn) enableBtn.disabled = false;
        if (disableBtn) disableBtn.disabled = true;
    }
    
    if (soundStatus) {
        const hasSounds = AppState.availableSounds.length > 0;
        const soundIcon = AppState.soundEnabled && AppState.audioInitialized && hasSounds ? 'fa-volume-up' : 'fa-volume-mute';
        let statusText = '';
        if (!hasSounds) {
            statusText = '⚠️ Sin sonidos disponibles';
            soundStatus.style.color = '#ffc107';
        } else if (AppState.soundEnabled && AppState.audioInitialized) {
            statusText = '✅ Sonidos activados';
            soundStatus.style.color = '#28a745';
        } else {
            statusText = '🔇 Sonidos desactivados';
            soundStatus.style.color = '#ffc107';
        }
        soundStatus.innerHTML = `<i class="fas ${soundIcon}"></i> ${statusText}`;
    }
    
    if (selectedSoundSpan && AppState.selectedSound) {
        const sound = AppState.availableSounds.find(s => s.id === AppState.selectedSound);
        const typeMap = {
            'alarma-robo': '🚨',
            'alerta-critica': '⚠️',
            'alerta-urgente': '🔴',
            'notificacion-pendiente': '⏰',
            'mensaje-recibido': '💬',
            'campana-suave': '🔔',
            'ding-moderno': '✨',
            'timbre-oficina': '🏢',
            'notificacion-movil': '📱',
            'sintetizador-alerta': '🎵'
        };
        const icon = typeMap[AppState.selectedSound] || '🎵';
        selectedSoundSpan.textContent = `${icon} ${sound?.name || AppState.selectedSound}`;
    } else if (selectedSoundSpan) {
        selectedSoundSpan.textContent = '🎵 Sin sonidos';
    }
    
    if (volumeSlider && !volumeSlider.hasListener) {
        volumeSlider.value = AppState.soundVolume * 100;
        volumeSlider.hasListener = true;
    }
    if (volumeValue) {
        volumeValue.textContent = `${Math.round(AppState.soundVolume * 100)}%`;
    }
}

// Función para guardar el estado de notificaciones
async function guardarEstadoNotificaciones(habilitadas, token = null) {
    if (!AppState.currentUser) return false;
    
    try {
        console.log(`📋 Guardando estado de notificaciones: ${habilitadas ? 'HABILITADAS' : 'DESHABILITADAS'}`);
        
        if (habilitadas && token) {
            await userManager.guardarDispositivo({
                token: token,
                deviceId: fcmInitializer.deviceId,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                enabled: true,
                soundEnabled: AppState.soundEnabled,
                selectedSound: AppState.selectedSound,
                soundVolume: AppState.soundVolume
            });
            console.log('✅ Token guardado en el array dispositivos del usuario');
        } else {
            await userManager.eliminarDispositivo(fcmInitializer.deviceId);
            console.log('✅ Dispositivo eliminado del array dispositivos');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error al guardar estado de notificaciones:', error);
        return false;
    }
}

function manejarFinalizacion(exito = true, permisoDenegado = false) {
    if (exito) {
        console.log("✅ Proceso completado exitosamente");
        mostrarMensaje('success', '✅ Completado', 'Configuración de notificaciones finalizada');
    } else if (permisoDenegado) {
        console.log("⚠️ Permiso denegado");
        mostrarMensaje('warning', '⚠️ Permiso denegado', 'Las notificaciones han sido desactivadas');
    } else {
        console.log("⚠️ Proceso finalizado con error");
        mostrarMensaje('error', '❌ Error', 'No se pudo completar la configuración');
    }
    actualizarUI();
}

async function suscribirANotificaciones() {
    if (AppState.isProcessing) return;
    
    AppState.isProcessing = true;
    console.log("🚀 Iniciando proceso de suscripción a notificaciones...");
    
    try {
        const token = await fcmInitializer.enableNotifications();
        
        if (!token) {
            throw new Error('No se pudo obtener el token FCM');
        }
        
        AppState.fcmToken = token;
        
        let saved = false;
        for (let i = 1; i <= 3; i++) {
            try {
                await guardarEstadoNotificaciones(true, token);
                saved = true;
                break;
            } catch (writeError) {
                console.error(`❌ Error intento ${i}:`, writeError);
                if (i < 3) {
                    console.log(`⏳ Reintentando guardar (${i}/3)...`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
        
        if (!saved) {
            throw new Error('No se pudo guardar el token en el servidor');
        }
        
        console.log("🎉 ¡PROCESO COMPLETADO! Notificaciones configuradas correctamente");
        console.log("📱 Token FCM:", token);
        
        await initAudioSystem();
        
        await reproducirSonidoNotificacion('normal');
        
        manejarFinalizacion(true);
        
    } catch (error) {
        console.error("❌ Error crítico en el proceso:", error);
        
        await reproducirSonidoNotificacion('alerta');
        
        try {
            await guardarEstadoNotificaciones(false);
        } catch (saveError) {
            console.error("❌ No se pudo guardar el estado de error:", saveError);
        }
        
        manejarFinalizacion(false, error.message.includes('denegado'));
        
    } finally {
        AppState.isProcessing = false;
    }
}

async function preguntarPermisoNotificaciones() {
    const result = await Swal.fire({
        title: '🔔 ¿Activar notificaciones?',
        html: `
            <div style="text-align: left; color: var(--color-text-primary);">
                <p style="margin-bottom: 15px;">Las notificaciones te permitirán:</p>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-bell" style="color: var(--color-accent-primary); margin-right: 10px;"></i>
                        Recibir alertas de nuevas incidencias
                    </li>
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-clock" style="color: var(--color-accent-primary); margin-right: 10px;"></i>
                        Actualizaciones en tiempo real
                    </li>
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-exclamation-triangle" style="color: var(--color-accent-primary); margin-right: 10px;"></i>
                        Notificaciones importantes del sistema
                    </li>
                    <li style="margin-bottom: 10px;">
                        <i class="fas fa-volume-up" style="color: var(--color-accent-primary); margin-right: 10px;"></i>
                        Sonidos de alerta personalizables
                    </li>
                </ul>
                <p style="margin-top: 15px; font-size: 14px; color: var(--color-text-secondary);">
                    <i class="fas fa-info-circle" style="color: var(--color-accent-primary);"></i>
                    Puedes cambiar esta configuración en cualquier momento.
                </p>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, activar notificaciones',
        cancelButtonText: 'No, gracias',
        confirmButtonColor: 'var(--color-accent-primary)',
        cancelButtonColor: '#6c757d',
        reverseButtons: true,
        allowOutsideClick: false,
        background: 'var(--color-bg-secondary)',
        color: 'var(--color-text-primary)'
    });

    if (result.isConfirmed) {
        await initAudioSystem();
    }

    return result.isConfirmed;
}

async function verificarConfiguracionActual() {
    if (!AppState.currentUser) return;

    try {
        console.log("🔍 Verificando configuración actual de notificaciones...");
        
        const dispositivoActual = AppState.currentUser.dispositivos?.find(
            d => d.deviceId === fcmInitializer.deviceId
        );
        
        if (dispositivoActual && dispositivoActual.enabled !== false) {
            console.log("✅ Este dispositivo ya tiene notificaciones activas");
            AppState.fcmToken = dispositivoActual.token;
            if (fcmInitializer.notificationsEnabled !== undefined) {
                fcmInitializer.notificationsEnabled = true;
            }
            localStorage.setItem(`fcm_enabled_${fcmInitializer.deviceId}`, 'true');
            
            if (dispositivoActual.soundEnabled !== undefined) {
                AppState.soundEnabled = dispositivoActual.soundEnabled;
            }
            if (dispositivoActual.selectedSound) {
                AppState.selectedSound = dispositivoActual.selectedSound;
            }
            if (dispositivoActual.soundVolume) {
                AppState.soundVolume = dispositivoActual.soundVolume;
                notificationSound.setGlobalVolume(AppState.soundVolume);
            }
            
            await initAudioSystem();
        } else {
            console.log("ℹ️ Este dispositivo no tiene notificaciones configuradas");
            await initAudioSystem();
        }
        
        actualizarUI();
        actualizarSelectorSonidos();
        
    } catch (error) {
        console.error('Error al verificar configuración:', error);
    }
}

function setupPushListener() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', async (event) => {
            if (event.data && event.data.type === 'NOTIFICATION_RECEIVED') {
                const notification = event.data.notification;
                
                console.log('📨 Notificación push recibida:', notification);
                
                let soundType = 'normal';
                if (notification.nivelRiesgo === 'critico') {
                    soundType = 'critico';
                } else if (notification.nivelRiesgo === 'alto') {
                    soundType = 'urgente';
                } else if (notification.tipo === 'canalizacion') {
                    soundType = 'pendiente';
                } else if (notification.tipo === 'incidencia') {
                    soundType = 'campana';
                }
                
                await reproducirSonidoNotificacion(soundType);
                
                if (Notification.permission === 'granted') {
                    const systemNotif = new Notification(notification.titulo, {
                        body: notification.mensaje,
                        icon: '/assets/images/logo.png',
                        badge: '/assets/images/logo.png',
                        silent: false,
                        vibrate: [200, 100, 200]
                    });
                    
                    systemNotif.onclick = () => {
                        window.focus();
                        if (notification.url) {
                            window.location.href = notification.url;
                        }
                        systemNotif.close();
                    };
                }
            }
        });
    }
}

async function init() {
    try {
        console.log('🚀 Inicializando página de pruebas...');
        
        await initAudioSystem();
        actualizarSelectorSonidos();
        
        const checkUser = setInterval(async () => {
            if (userManager.currentUser) {
                clearInterval(checkUser);
                
                console.log('👤 Usuario:', userManager.currentUser.nombreCompleto);
                AppState.currentUser = userManager.currentUser;
                
                if (fcmInitializer.init) {
                    await fcmInitializer.init(userManager);
                }
                
                await verificarConfiguracionActual();
                
                const enableBtn = document.getElementById('enableNotificationsBtn');
                const disableBtn = document.getElementById('disableNotificationsBtn');
                
                if (enableBtn) {
                    enableBtn.addEventListener('click', async () => {
                        const quiereActivar = await preguntarPermisoNotificaciones();
                        if (quiereActivar) {
                            await suscribirANotificaciones();
                        }
                    });
                }

                if (disableBtn) {
                    disableBtn.addEventListener('click', async () => {
                        const result = await Swal.fire({
                            title: '¿Desactivar notificaciones?',
                            text: 'Dejarás de recibir notificaciones en este dispositivo.',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Sí, desactivar',
                            cancelButtonText: 'Cancelar',
                            confirmButtonColor: '#dc3545',
                            cancelButtonColor: '#6c757d'
                        });
                        
                        if (result.isConfirmed) {
                            if (fcmInitializer.disableNotifications) {
                                await fcmInitializer.disableNotifications();
                            }
                            await guardarEstadoNotificaciones(false);
                            manejarFinalizacion(true);
                        }
                    });
                }
                
                const toggleSoundBtn = document.getElementById('toggleSoundBtn');
                if (toggleSoundBtn) {
                    toggleSoundBtn.addEventListener('click', async () => {
                        if (AppState.soundEnabled) {
                            AppState.soundEnabled = false;
                            notificationSound.stopAll();
                            notificationSound.setEnabled(false);
                            Swal.fire({
                                icon: 'info',
                                title: 'Sonidos desactivados',
                                text: 'Ya no se reproducirán sonidos para las notificaciones',
                                timer: 2000,
                                showConfirmButton: false
                            });
                        } else {
                            AppState.soundEnabled = true;
                            notificationSound.setEnabled(true);
                            await reproducirSonidoNotificacion('normal');
                            Swal.fire({
                                icon: 'success',
                                title: 'Sonidos activados',
                                text: 'Las notificaciones ahora reproducirán sonidos',
                                timer: 2000,
                                showConfirmButton: false
                            });
                        }
                        actualizarUI();
                        
                        if (fcmInitializer.isEnabled && fcmInitializer.isEnabled()) {
                            await guardarEstadoNotificaciones(true, fcmInitializer.getCurrentToken());
                        }
                    });
                }
                
                const testSoundsBtn = document.getElementById('testSoundsBtn');
                if (testSoundsBtn) {
                    testSoundsBtn.addEventListener('click', async () => {
                        await probarSonidos();
                    });
                }
                
                const selectSoundBtn = document.getElementById('selectSoundBtn');
                if (selectSoundBtn) {
                    selectSoundBtn.addEventListener('click', async () => {
                        await configurarSonidoPredeterminado();
                        actualizarUI();
                        actualizarSelectorSonidos();
                        
                        if (fcmInitializer.isEnabled && fcmInitializer.isEnabled()) {
                            await guardarEstadoNotificaciones(true, fcmInitializer.getCurrentToken());
                        }
                    });
                }
                
                const volumeSlider = document.getElementById('volumeSlider');
                if (volumeSlider) {
                    volumeSlider.addEventListener('input', async (e) => {
                        AppState.soundVolume = e.target.value / 100;
                        notificationSound.setGlobalVolume(AppState.soundVolume);
                        const volumeValue = document.getElementById('volumeValue');
                        if (volumeValue) {
                            volumeValue.textContent = `${e.target.value}%`;
                        }
                        
                        if (fcmInitializer.isEnabled && fcmInitializer.isEnabled()) {
                            await guardarEstadoNotificaciones(true, fcmInitializer.getCurrentToken());
                        }
                    });
                }
                
                const notificationForm = document.getElementById('notificationForm');
                if (notificationForm) {
                    notificationForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const userId = document.getElementById('userId').value.trim();
                        const userType = document.getElementById('userType').value;
                        const title = document.getElementById('title').value.trim();
                        const body = document.getElementById('body').value.trim();
                        const url = document.getElementById('url').value.trim();
                        const soundType = document.getElementById('soundType')?.value || 'normal';
                        
                        if (!userId || !title || !body) {
                            mostrarMensaje('warning', 'Campos incompletos', 'Usuario, título y mensaje son obligatorios');
                            return;
                        }
                        
                        Swal.fire({
                            title: 'Enviando notificación...',
                            text: 'Por favor espera',
                            allowOutsideClick: false,
                            didOpen: () => Swal.showLoading()
                        });
                        
                        try {
                            const functionUrl = 'https://us-central1-centinela-mx.cloudfunctions.net/sendPushNotification';
                            
                            const response = await fetch(functionUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    userId: userId,
                                    userType: userType,
                                    organizacionCamelCase: userManager.currentUser?.organizacionCamelCase,
                                    title: title,
                                    body: body,
                                    url: url,
                                    senderToken: userManager.currentUser?.id,
                                    soundType: soundType
                                })
                            });
                            
                            const result = await response.json();
                            Swal.close();
                            
                            if (response.ok && result.success) {
                                if (soundType && soundType !== 'ninguno') {
                                    await reproducirSonidoNotificacion(soundType);
                                } else {
                                    await reproducirSonidoNotificacion('normal');
                                }
                                
                                Swal.fire({
                                    icon: 'success',
                                    title: '✅ Notificación enviada',
                                    html: `
                                        <p>${result.message || 'Notificación enviada correctamente'}</p>
                                        ${result.failures ? `<p>Fallos: ${result.failures}</p>` : ''}
                                        ${soundType !== 'ninguno' ? `<p>🔊 Sonido: ${soundType}</p>` : ''}
                                    `,
                                    timer: 3000,
                                    background: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-primary)'
                                });
                            } else {
                                throw new Error(result.error || 'Error al enviar la notificación');
                            }
                            
                        } catch (error) {
                            console.error('❌ Error:', error);
                            Swal.close();
                            Swal.fire({
                                icon: 'error',
                                title: '❌ Error',
                                text: error.message,
                                background: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)'
                            });
                        }
                    });
                }
                
                setupPushListener();
                actualizarUI();
                console.log('✅ Página de pruebas lista');
            }
        }, 500);

        setTimeout(() => {
            if (!userManager.currentUser) {
                console.error('⏰ Timeout: No hay usuario');
                mostrarMensaje('error', 'Error', 'No hay sesión activa');
            }
        }, 5000);

    } catch (error) {
        console.error('❌ Error fatal:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error Crítico',
            text: error.message
        });
    }
}

init();