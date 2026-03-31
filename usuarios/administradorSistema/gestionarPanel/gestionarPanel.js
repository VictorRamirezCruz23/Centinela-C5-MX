// ==================== IMPORTS ====================
import { CuentaPM } from '/clases/cuentaPM.js';
import { CLOUD_FUNCTION_BASE_URL } from '/config/urlCloudFunction.js';

// ==================== VARIABLES GLOBALES ====================
let cuentaAppId = null;
let panelData = null;
let powerManageUserToken = null;
let sessionToken = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    cuentaAppId = urlParams.get('appId');
    const panelSerial = urlParams.get('panelSerial');
    
    if (!cuentaAppId || !panelSerial) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se especificó la cuenta o el panel'
        }).then(() => {
            window.location.href = '/usuarios/administrador/cuentasPM/cuentasPM.html';
        });
        return;
    }
    
    await cargarDatos(cuentaAppId, panelSerial);
});

async function cargarDatos(appId, serial) {
    try {
        // Cargar cuenta de monitoreo
        const cuenta = await CuentaPM.obtenerPorAppId(appId);
        if (!cuenta) throw new Error('Cuenta no encontrada');
        
        const cuentaData = cuenta.toJSON();
        
        // Buscar el panel en la cuenta
        const paneles = cuentaData.paneles || [];
        panelData = paneles.find(p => p.serial === serial);
        
        if (!panelData) {
            throw new Error('Panel no encontrado en esta cuenta');
        }
        
        // Mostrar información básica
        document.getElementById('panelAlias').textContent = panelData.alias;
        document.getElementById('panelSerial').textContent = panelData.serial;
        document.getElementById('panelModelo').textContent = panelData.modelo || 'Desconocido';
        
        // Solicitar credenciales de Power Manage para operar
        await solicitarCredenciales();
        
        // Cargar datos del panel
        await cargarEstadoPanel();
        await cargarZonas();
        await cargarEventos();
        await cargarDispositivos();
        
        // Configurar eventos
        configurarEventos();
        configurarTabs();
        
    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        }).then(() => {
            window.location.href = '/usuarios/administrador/cuentasPM/cuentasPM.html';
        });
    }
}

async function solicitarCredenciales() {
    const { value: password } = await Swal.fire({
        title: 'Autenticación Power Manage',
        text: `Ingresa la contraseña de Power Manage para la cuenta ${panelData.email || 'asociada'}`,
        input: 'password',
        inputLabel: 'Contraseña',
        inputPlaceholder: '********',
        showCancelButton: true,
        confirmButtonText: 'AUTENTICAR',
        cancelButtonText: 'CANCELAR'
    });
    
    if (!password) {
        throw new Error('Autenticación cancelada');
    }
    
    mostrarProgreso('Autenticando...', 30);
    
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'autenticar',
                email: panelData.email || cuentaData.email,
                password: password,
                app_id: cuentaAppId
            })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error_message);
        
        powerManageUserToken = result.user_token;
        
        // Obtener session_token para el panel
        const sessionResponse = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'loginPanel',
                user_token: powerManageUserToken,
                panel_data: {
                    panel_serial: panelData.serial,
                    user_code: '1234', // Código de usuario (ajustar según el panel)
                    app_id: cuentaAppId,
                    app_type: 'com.visonic.neogo'
                }
            })
        });
        
        const sessionResult = await sessionResponse.json();
        if (sessionResponse.ok) {
            sessionToken = sessionResult.session_token;
        }
        
        ocultarProgreso();
        
    } catch (error) {
        ocultarProgreso();
        throw new Error('No se pudo autenticar en Power Manage');
    }
}

async function cargarEstadoPanel() {
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'obtenerEstadoPanel',
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelData.serial
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.partitions) {
            const partition = result.partitions[0];
            const estado = partition?.state || 'UNKNOWN';
            
            // Actualizar UI según estado
            const statusIcon = document.getElementById('statusIcon');
            const statusTexto = document.getElementById('statusTexto');
            const btnDisarm = document.getElementById('btnDisarm');
            const btnHome = document.getElementById('btnHome');
            const btnAway = document.getElementById('btnAway');
            
            switch(estado) {
                case 'DISARM':
                    statusIcon.className = 'fas fa-circle';
                    statusIcon.style.color = '#28a745';
                    statusTexto.textContent = 'Desarmado';
                    btnDisarm.classList.add('active');
                    btnHome.classList.remove('active');
                    btnAway.classList.remove('active');
                    break;
                case 'HOME':
                    statusIcon.className = 'fas fa-circle';
                    statusIcon.style.color = '#ffc107';
                    statusTexto.textContent = 'Modo Casa';
                    btnHome.classList.add('active');
                    btnDisarm.classList.remove('active');
                    btnAway.classList.remove('active');
                    break;
                case 'AWAY':
                    statusIcon.className = 'fas fa-circle';
                    statusIcon.style.color = '#dc3545';
                    statusTexto.textContent = 'Modo Ausente';
                    btnAway.classList.add('active');
                    btnDisarm.classList.remove('active');
                    btnHome.classList.remove('active');
                    break;
                default:
                    statusIcon.className = 'fas fa-question-circle';
                    statusIcon.style.color = '#6c757d';
                    statusTexto.textContent = 'Desconocido';
            }
            
            // Actualizar información adicional
            document.getElementById('ultimaConexion').textContent = new Date().toLocaleString();
            document.getElementById('bateria').textContent = result.bateria || 'Normal';
            document.getElementById('senal').textContent = result.rssi?.level || 'Buena';
        }
        
    } catch (error) {
        console.error('Error cargando estado:', error);
    }
}

async function cargarZonas() {
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'listarZonas',
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelData.serial
            })
        });
        
        const result = await response.json();
        
        const zonasGrid = document.getElementById('zonasGrid');
        
        if (!response.ok || !result || result.length === 0) {
            zonasGrid.innerHTML = '<div class="empty-state">No hay zonas configuradas</div>';
            return;
        }
        
        zonasGrid.innerHTML = result.map(zona => `
            <div class="zona-card ${zona.estado === 'abierta' ? 'zona-abierta' : 'zona-cerrada'}">
                <div class="zona-header">
                    <i class="fas ${zona.tipo === 'puerta' ? 'fa-door-open' : 'fa-thermometer-half'}"></i>
                    <strong>Zona ${zona.numero}</strong>
                    <span class="zona-estado">${zona.estado === 'abierta' ? 'Abierta' : 'Cerrada'}</span>
                </div>
                <div class="zona-info">
                    <span>${zona.nombre || 'Sin nombre'}</span>
                    <small>Tipo: ${zona.tipo || 'Desconocido'}</small>
                </div>
                <div class="zona-bateria">
                    <i class="fas fa-battery-${zona.bateria === 'baja' ? 'quarter' : 'full'}"></i>
                    Batería: ${zona.bateria || 'Normal'}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando zonas:', error);
        document.getElementById('zonasGrid').innerHTML = '<div class="error-state">Error cargando zonas</div>';
    }
}

async function cargarEventos() {
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'listarEventos',
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelData.serial,
                limit: 50
            })
        });
        
        const result = await response.json();
        
        const eventosList = document.getElementById('eventosList');
        
        if (!response.ok || !result || result.length === 0) {
            eventosList.innerHTML = '<div class="empty-state">No hay eventos recientes</div>';
            return;
        }
        
        eventosList.innerHTML = result.map(evento => `
            <div class="evento-card">
                <div class="evento-fecha">${new Date(evento.datetime).toLocaleString()}</div>
                <div class="evento-tipo ${evento.label.toLowerCase()}">
                    <i class="fas ${getEventoIcon(evento.label)}"></i>
                    ${evento.description}
                </div>
                <div class="evento-detalle">
                    ${evento.appointment ? `Usuario: ${evento.appointment}` : ''}
                    ${evento.zone ? `Zona: ${evento.zone}` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando eventos:', error);
        document.getElementById('eventosList').innerHTML = '<div class="error-state">Error cargando eventos</div>';
    }
}

async function cargarDispositivos() {
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'listarDispositivos',
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelData.serial
            })
        });
        
        const result = await response.json();
        
        const dispositivosList = document.getElementById('dispositivosList');
        
        if (!response.ok || !result || result.length === 0) {
            dispositivosList.innerHTML = '<div class="empty-state">No hay dispositivos adicionales</div>';
            return;
        }
        
        dispositivosList.innerHTML = result.map(disp => `
            <div class="dispositivo-card">
                <div class="dispositivo-header">
                    <i class="fas ${disp.device_type === 'KEYFOB' ? 'fa-key' : 'fa-microchip'}"></i>
                    <strong>${disp.name || disp.device_type}</strong>
                    <span class="dispositivo-id">ID: ${disp.device_number}</span>
                </div>
                <div class="dispositivo-info">
                    <span>Tipo: ${disp.device_type}</span>
                    ${disp.subtype ? `<span>Subtipo: ${disp.subtype}</span>` : ''}
                </div>
                <div class="dispositivo-bateria">
                    <i class="fas fa-battery-${disp.battery?.status === 'low' ? 'quarter' : 'full'}"></i>
                    Batería: ${disp.battery?.level || 'Normal'}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando dispositivos:', error);
        document.getElementById('dispositivosList').innerHTML = '<div class="error-state">Error cargando dispositivos</div>';
    }
}

async function cambiarEstadoPanel(estado) {
    mostrarProgreso(`Cambiando a ${estado}...`, 50);
    
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'setEstadoPanel',
                user_token: powerManageUserToken,
                session_token: sessionToken,
                panel_serial: panelData.serial,
                state: estado,
                partition: 1
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_message);
        }
        
        ocultarProgreso();
        
        Swal.fire({
            icon: 'success',
            title: 'Comando enviado',
            text: `El panel está cambiando a modo ${estado}`,
            timer: 2000,
            showConfirmButton: false
        });
        
        // Recargar estado después de 2 segundos
        setTimeout(() => {
            cargarEstadoPanel();
            cargarEventos(); // Recargar eventos para ver el cambio
        }, 2000);
        
    } catch (error) {
        ocultarProgreso();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    }
}

function getEventoIcon(label) {
    const icons = {
        'ARM': 'fa-shield-alt',
        'DISARM': 'fa-shield-alt',
        'BURGLER': 'fa-bell',
        'FIRE': 'fa-fire',
        'PANIC': 'fa-exclamation-triangle',
        'ONLINE': 'fa-wifi',
        'OFFLINE': 'fa-plug',
        'BATTERY': 'fa-battery-quarter',
        'TAMPER': 'fa-tools'
    };
    return icons[label] || 'fa-info-circle';
}

function configurarEventos() {
    document.getElementById('btnDisarm').addEventListener('click', () => cambiarEstadoPanel('DISARM'));
    document.getElementById('btnHome').addEventListener('click', () => cambiarEstadoPanel('HOME'));
    document.getElementById('btnAway').addEventListener('click', () => cambiarEstadoPanel('AWAY'));
}

function configurarTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}

function mostrarProgreso(mensaje, porcentaje) {
    const container = document.getElementById('progressContainer');
    const message = document.getElementById('progressMessage');
    const bar = document.getElementById('progressBar');
    
    container.style.display = 'block';
    message.textContent = mensaje;
    bar.style.width = `${porcentaje}%`;
}

function ocultarProgreso() {
    setTimeout(() => {
        const container = document.getElementById('progressContainer');
        container.style.display = 'none';
        document.getElementById('progressBar').style.width = '0%';
    }, 500);
}