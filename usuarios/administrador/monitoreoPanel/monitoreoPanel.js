// ==================== IMPORTS ====================
import { CLOUD_FUNCTION_BASE_URL } from '/config/urlCloudFunction.js';

// ==================== CONSTANTES ====================
const POWER_MANAGE_FUNCTION = 'proxyPowerManage';
//*comentarios */
// ==================== VARIABLES GLOBALES ====================
let powerManageUserToken = null;
let cuentaAppId = null;
let paneles = []; // Array de paneles a monitorear
let autoRefreshInterval = null;
const AUTO_REFRESH_MS = 30000;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    await initMonitoreo();
    initTabs();
    initRefreshButtons();
});

async function initMonitoreo() {
    const urlParams = new URLSearchParams(window.location.search);
    cuentaAppId = urlParams.get('appId');
    
    console.log('🔍 Iniciando monitoreo multipanel. appId:', cuentaAppId);
    
    if (!cuentaAppId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se especificó la cuenta de monitoreo',
            confirmButtonText: 'VOLVER'
        }).then(() => {
            window.location.href = '../listarPaneles/listarPaneles.html';
        });
        return;
    }
    
    // Obtener token de Power Manage
    const powerManageStr = localStorage.getItem('powerManageToken');
    if (!powerManageStr) {
        redirectToLogin();
        return;
    }
    
    try {
        const powerManageData = JSON.parse(powerManageStr);
        powerManageUserToken = powerManageData.user_token;
        
        if (!powerManageUserToken) throw new Error('Token inválido');
        
        // Cargar paneles desde sessionStorage
        const panelesGuardados = sessionStorage.getItem('panelesMonitoreo');
        console.log('📦 Datos en sessionStorage:', panelesGuardados);
        
        if (!panelesGuardados) {
            console.error('❌ No hay panelesMonitoreo en sessionStorage');
            Swal.fire({
                icon: 'warning',
                title: 'Sin paneles',
                text: 'No hay paneles seleccionados para monitorear. Por favor, selecciona paneles desde la lista.',
                confirmButtonText: 'VOLVER'
            }).then(() => {
                window.location.href = '../listarPaneles/listarPaneles.html';
            });
            return;
        }
        
        paneles = JSON.parse(panelesGuardados);
        
        if (!paneles || paneles.length === 0) {
            throw new Error('No hay paneles');
        }
        
        console.log(`📊 ${paneles.length} panel(es) cargado(s) para monitoreo:`, paneles);
        
        // Actualizar header con los paneles
        const nombres = paneles.map(p => p.nombreMostrar).join(', ');
        document.getElementById('panelInfoHeader').innerHTML = `
            <i class="fas fa-layer-group"></i> Monitoreando ${paneles.length} panel(es): ${nombres}
        `;
        document.getElementById('totalPanelesCount').textContent = paneles.length;
        
        // Llenar selector de paneles (para filtrar por panel)
        llenarSelectorPaneles();
        
        // Cargar datos de todos los paneles
        await cargarEventosTodosPaneles();
        await cargarAlarmasTodosPaneles();
        await cargarAlertasTodosPaneles();
        await cargarTroublesTodosPaneles();
        await cargarDispositivosTodosPaneles();
        
        // Iniciar auto-refresh
        startAutoRefresh();
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        if (error.message === 'Wrong user token' || error.message.includes('token')) {
            redirectToLogin();
        } else {
            mostrarError(error.message);
        }
    }
}

function llenarSelectorPaneles() {
    const selectPanel = document.getElementById('activePanelSelect');
    const filterPanel = document.getElementById('devicePanelFilter');
    
    if (selectPanel) {
        selectPanel.innerHTML = '<option value="all">Todos los paneles</option>' +
            paneles.map(p => `<option value="${p.serial}">📡 ${p.nombreMostrar}</option>`).join('');
        
        selectPanel.addEventListener('change', (e) => {
            const selectedSerial = e.target.value;
            if (selectedSerial === 'all') {
                cargarEventosTodosPaneles();
                cargarAlarmasTodosPaneles();
                cargarAlertasTodosPaneles();
                cargarTroublesTodosPaneles();
            } else {
                cargarEventosPorPanel(selectedSerial);
                cargarAlarmasPorPanel(selectedSerial);
                cargarAlertasPorPanel(selectedSerial);
                cargarTroublesPorPanel(selectedSerial);
            }
        });
    }
    
    if (filterPanel) {
        filterPanel.innerHTML = '<option value="all">Todos los paneles</option>' +
            paneles.map(p => `<option value="${p.serial}">📡 ${p.nombreMostrar}</option>`).join('');
        
        filterPanel.addEventListener('change', () => {
            cargarDispositivosTodosPaneles();
        });
    }
}

function redirectToLogin() {
    localStorage.removeItem('powerManageToken');
    sessionStorage.removeItem('panelesMonitoreo');
    
    Swal.fire({
        icon: 'warning',
        title: 'Sesión expirada',
        text: 'Debes autenticarte nuevamente con tu cuenta de monitoreo',
        confirmButtonText: 'IR A AUTENTICACIÓN'
    }).then(() => {
        window.location.href = '../loginMonitoreo/loginMonitoreo.html';
    });
}

// ==================== FUNCIONES PARA TODOS LOS PANELES ====================

async function fetchFromPanel(panel, action, additionalData = {}) {
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: action,
                user_token: powerManageUserToken,
                session_token: panel.session_token,
                ...additionalData
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        if (!response.ok) return [];
        
        return await response.json();
    } catch (error) {
        console.error(`❌ Error en ${action} para panel ${panel.serial}:`, error);
        return [];
    }
}

// ==================== EVENTOS ====================

async function cargarEventosTodosPaneles() {
    const container = document.getElementById('eventsList');
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando eventos de todos los paneles...</span></div>';
    
    try {
        const todosEventos = [];
        
        for (const panel of paneles) {
            const events = await fetchFromPanel(panel, 'listarEventos');
            if (events && events.length > 0) {
                events.forEach(event => {
                    event._panelNombre = panel.nombreMostrar;
                    event._panelSerial = panel.serial;
                });
                todosEventos.push(...events);
            }
        }
        
        // Ordenar por fecha (más reciente primero)
        todosEventos.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        
        if (todosEventos.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-inbox"></i><span>No hay eventos registrados en ningún panel</span></div>';
            return;
        }
        
        container.innerHTML = todosEventos.map(event => {
            let typeClass = 'default';
            let typeText = event.label || 'Evento';
            
            if (event.label === 'ARM') typeClass = 'arm';
            else if (event.label === 'DISARM') typeClass = 'disarm';
            else if (event.label === 'BURGLER' || event.label === 'PANEL_ALARM') typeClass = 'alarm';
            else if (event.label === 'ONLINE' || event.label === 'OFFLINE') typeClass = 'trouble';
            
            return `
                <div class="event-card">
                    <div class="event-header">
                        <div>
                            <span class="panel-badge">📡 ${escapeHTML(event._panelNombre)}</span>
                            <span class="event-type ${typeClass}">${escapeHTML(typeText)}</span>
                        </div>
                        <span class="event-date">${escapeHTML(event.datetime || 'Fecha no disponible')}</span>
                    </div>
                    <div class="event-description">${escapeHTML(event.description || 'Sin descripción')}</div>
                    ${event.appointment ? `<div class="event-detail"><i class="fas fa-user"></i> ${escapeHTML(event.appointment)}</div>` : ''}
                    ${event.zone ? `<div class="event-detail"><i class="fas fa-map-marker-alt"></i> Zona: ${event.zone}</div>` : ''}
                    ${event.name ? `<div class="event-detail"><i class="fas fa-tag"></i> ${escapeHTML(event.name)}</div>` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        container.innerHTML = `<div class="empty-data"><i class="fas fa-exclamation-triangle"></i><span>Error: ${error.message}</span></div>`;
    }
}

async function cargarEventosPorPanel(serial) {
    const container = document.getElementById('eventsList');
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando eventos...</span></div>';
    
    try {
        const panel = paneles.find(p => p.serial === serial);
        if (!panel) throw new Error('Panel no encontrado');
        
        const events = await fetchFromPanel(panel, 'listarEventos');
        
        if (!events || events.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-inbox"></i><span>No hay eventos registrados</span></div>';
            return;
        }
        
        events.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
        
        container.innerHTML = events.map(event => {
            let typeClass = 'default';
            let typeText = event.label || 'Evento';
            
            if (event.label === 'ARM') typeClass = 'arm';
            else if (event.label === 'DISARM') typeClass = 'disarm';
            else if (event.label === 'BURGLER' || event.label === 'PANEL_ALARM') typeClass = 'alarm';
            else if (event.label === 'ONLINE' || event.label === 'OFFLINE') typeClass = 'trouble';
            
            return `
                <div class="event-card">
                    <div class="event-header">
                        <div>
                            <span class="panel-badge">📡 ${escapeHTML(panel.nombreMostrar)}</span>
                            <span class="event-type ${typeClass}">${escapeHTML(typeText)}</span>
                        </div>
                        <span class="event-date">${escapeHTML(event.datetime || 'Fecha no disponible')}</span>
                    </div>
                    <div class="event-description">${escapeHTML(event.description || 'Sin descripción')}</div>
                    ${event.appointment ? `<div class="event-detail"><i class="fas fa-user"></i> ${escapeHTML(event.appointment)}</div>` : ''}
                    ${event.zone ? `<div class="event-detail"><i class="fas fa-map-marker-alt"></i> Zona: ${event.zone}</div>` : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = `<div class="empty-data"><i class="fas fa-exclamation-triangle"></i><span>Error: ${error.message}</span></div>`;
    }
}

// ==================== ALARMAS ====================

async function cargarAlarmasTodosPaneles() {
    const container = document.getElementById('alarmsList');
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando alarmas de todos los paneles...</span></div>';
    
    try {
        const todasAlarmas = [];
        
        for (const panel of paneles) {
            const alarms = await fetchFromPanel(panel, 'listarAlarmas');
            if (alarms && alarms.length > 0) {
                alarms.forEach(alarm => {
                    alarm._panelNombre = panel.nombreMostrar;
                    alarm._panelSerial = panel.serial;
                });
                todasAlarmas.push(...alarms);
            }
        }
        
        if (todasAlarmas.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-check-circle"></i><span>No hay alarmas activas</span></div>';
            return;
        }
        
        container.innerHTML = todasAlarmas.map(alarm => `
            <div class="alarm-card">
                <div class="event-header">
                    <div>
                        <span class="panel-badge">📡 ${escapeHTML(alarm._panelNombre)}</span>
                        <span class="event-type alarm">${escapeHTML(alarm.alarm_type || 'Alarma')}</span>
                    </div>
                    <span class="event-date">${escapeHTML(alarm.datetime || 'Fecha no disponible')}</span>
                </div>
                <div class="event-description">
                    ${alarm.zone ? `Zona ${alarm.zone}` : 'Panel Principal'}
                    ${alarm.location ? ` - ${alarm.location}` : ''}
                </div>
                ${alarm.zone_name ? `<div class="event-detail"><i class="fas fa-tag"></i> ${escapeHTML(alarm.zone_name)}</div>` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error cargando alarmas:', error);
        container.innerHTML = '<div class="empty-data"><i class="fas fa-info-circle"></i><span>No se pudieron cargar las alarmas</span></div>';
    }
}

async function cargarAlarmasPorPanel(serial) {
    const container = document.getElementById('alarmsList');
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando alarmas...</span></div>';
    
    try {
        const panel = paneles.find(p => p.serial === serial);
        if (!panel) throw new Error('Panel no encontrado');
        
        const alarms = await fetchFromPanel(panel, 'listarAlarmas');
        
        if (!alarms || alarms.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-check-circle"></i><span>No hay alarmas activas</span></div>';
            return;
        }
        
        container.innerHTML = alarms.map(alarm => `
            <div class="alarm-card">
                <div class="event-header">
                    <div>
                        <span class="panel-badge">📡 ${escapeHTML(panel.nombreMostrar)}</span>
                        <span class="event-type alarm">${escapeHTML(alarm.alarm_type || 'Alarma')}</span>
                    </div>
                    <span class="event-date">${escapeHTML(alarm.datetime || 'Fecha no disponible')}</span>
                </div>
                <div class="event-description">
                    ${alarm.zone ? `Zona ${alarm.zone}` : 'Panel Principal'}
                    ${alarm.location ? ` - ${alarm.location}` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = `<div class="empty-data"><i class="fas fa-exclamation-triangle"></i><span>Error: ${error.message}</span></div>`;
    }
}

// ==================== ALERTAS ====================

async function cargarAlertasTodosPaneles() {
    const container = document.getElementById('alertsList');
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando alertas de todos los paneles...</span></div>';
    
    try {
        const todasAlertas = [];
        
        for (const panel of paneles) {
            const alerts = await fetchFromPanel(panel, 'listarAlertas');
            if (alerts && alerts.length > 0) {
                alerts.forEach(alert => {
                    alert._panelNombre = panel.nombreMostrar;
                    alert._panelSerial = panel.serial;
                });
                todasAlertas.push(...alerts);
            }
        }
        
        if (todasAlertas.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-check-circle"></i><span>No hay alertas activas</span></div>';
            return;
        }
        
        container.innerHTML = todasAlertas.map(alert => `
            <div class="alert-card">
                <div class="event-header">
                    <div>
                        <span class="panel-badge">📡 ${escapeHTML(alert._panelNombre)}</span>
                        <span class="event-type alert">${escapeHTML(alert.alert_type || 'Alerta')}</span>
                    </div>
                    <span class="event-date">${escapeHTML(alert.datetime || 'Fecha no disponible')}</span>
                </div>
                <div class="event-description">
                    ${alert.zone ? `Zona ${alert.zone}` : 'Sistema'}
                    ${alert.location ? ` - ${alert.location}` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error cargando alertas:', error);
        container.innerHTML = '<div class="empty-data"><i class="fas fa-info-circle"></i><span>No se pudieron cargar las alertas</span></div>';
    }
}

async function cargarAlertasPorPanel(serial) {
    const container = document.getElementById('alertsList');
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando alertas...</span></div>';
    
    try {
        const panel = paneles.find(p => p.serial === serial);
        if (!panel) throw new Error('Panel no encontrado');
        
        const alerts = await fetchFromPanel(panel, 'listarAlertas');
        
        if (!alerts || alerts.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-check-circle"></i><span>No hay alertas activas</span></div>';
            return;
        }
        
        container.innerHTML = alerts.map(alert => `
            <div class="alert-card">
                <div class="event-header">
                    <div>
                        <span class="panel-badge">📡 ${escapeHTML(panel.nombreMostrar)}</span>
                        <span class="event-type alert">${escapeHTML(alert.alert_type || 'Alerta')}</span>
                    </div>
                    <span class="event-date">${escapeHTML(alert.datetime || 'Fecha no disponible')}</span>
                </div>
                <div class="event-description">
                    ${alert.zone ? `Zona ${alert.zone}` : 'Sistema'}
                    ${alert.location ? ` - ${alert.location}` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = `<div class="empty-data"><i class="fas fa-exclamation-triangle"></i><span>Error: ${error.message}</span></div>`;
    }
}

// ==================== TROUBLES (PROBLEMAS) ====================

async function cargarTroublesTodosPaneles() {
    const container = document.getElementById('troublesList');
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando problemas de todos los paneles...</span></div>';
    
    try {
        const todosTroubles = [];
        
        for (const panel of paneles) {
            const troubles = await fetchFromPanel(panel, 'listarTroubles');
            if (troubles && troubles.length > 0) {
                troubles.forEach(trouble => {
                    trouble._panelNombre = panel.nombreMostrar;
                    trouble._panelSerial = panel.serial;
                });
                todosTroubles.push(...troubles);
            }
        }
        
        if (todosTroubles.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-check-circle"></i><span>No hay problemas reportados</span></div>';
            return;
        }
        
        container.innerHTML = todosTroubles.map(trouble => `
            <div class="trouble-card">
                <div class="event-header">
                    <div>
                        <span class="panel-badge">📡 ${escapeHTML(trouble._panelNombre)}</span>
                        <span class="event-type trouble">${escapeHTML(trouble.trouble_type || 'Problema')}</span>
                    </div>
                    <span class="event-date">${escapeHTML(trouble.datetime || 'Fecha no disponible')}</span>
                </div>
                <div class="event-description">
                    ${trouble.zone ? `Zona ${trouble.zone}` : 'Sistema'}
                    ${trouble.location ? ` - ${trouble.location}` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error cargando troubles:', error);
        container.innerHTML = '<div class="empty-data"><i class="fas fa-info-circle"></i><span>No se pudieron cargar los problemas</span></div>';
    }
}

async function cargarTroublesPorPanel(serial) {
    const container = document.getElementById('troublesList');
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando problemas...</span></div>';
    
    try {
        const panel = paneles.find(p => p.serial === serial);
        if (!panel) throw new Error('Panel no encontrado');
        
        const troubles = await fetchFromPanel(panel, 'listarTroubles');
        
        if (!troubles || troubles.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-check-circle"></i><span>No hay problemas reportados</span></div>';
            return;
        }
        
        container.innerHTML = troubles.map(trouble => `
            <div class="trouble-card">
                <div class="event-header">
                    <div>
                        <span class="panel-badge">📡 ${escapeHTML(panel.nombreMostrar)}</span>
                        <span class="event-type trouble">${escapeHTML(trouble.trouble_type || 'Problema')}</span>
                    </div>
                    <span class="event-date">${escapeHTML(trouble.datetime || 'Fecha no disponible')}</span>
                </div>
                <div class="event-description">
                    ${trouble.zone ? `Zona ${trouble.zone}` : 'Sistema'}
                    ${trouble.location ? ` - ${trouble.location}` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = `<div class="empty-data"><i class="fas fa-exclamation-triangle"></i><span>Error: ${error.message}</span></div>`;
    }
}

// ==================== DISPOSITIVOS ====================

async function cargarDispositivosTodosPaneles() {
    const container = document.getElementById('devicesList');
    const filterValue = document.getElementById('devicePanelFilter')?.value || 'all';
    
    container.innerHTML = '<div class="loading-data"><i class="fas fa-spinner fa-spin"></i><span>Cargando dispositivos...</span></div>';
    
    try {
        let dispositivosFiltrados = [];
        
        if (filterValue === 'all') {
            for (const panel of paneles) {
                const devices = await fetchFromPanel(panel, 'listarDispositivos');
                if (devices && devices.length > 0) {
                    devices.forEach(device => {
                        device._panelNombre = panel.nombreMostrar;
                        device._panelSerial = panel.serial;
                    });
                    dispositivosFiltrados.push(...devices);
                }
            }
        } else {
            const panel = paneles.find(p => p.serial === filterValue);
            if (panel) {
                const devices = await fetchFromPanel(panel, 'listarDispositivos');
                if (devices && devices.length > 0) {
                    devices.forEach(device => {
                        device._panelNombre = panel.nombreMostrar;
                        device._panelSerial = panel.serial;
                    });
                    dispositivosFiltrados = devices;
                }
            }
        }
        
        const zonas = dispositivosFiltrados.filter(d => d.device_type === 'ZONE');
        const otros = dispositivosFiltrados.filter(d => d.device_type !== 'ZONE');
        
        if (dispositivosFiltrados.length === 0) {
            container.innerHTML = '<div class="empty-data"><i class="fas fa-inbox"></i><span>No hay dispositivos registrados</span></div>';
            return;
        }
        
        let html = '';
        
        if (zonas.length > 0) {
            html += `<h4 style="color:#00ffff; margin: 1rem 0 0.5rem;"><i class="fas fa-shield-alt"></i> Zonas (${zonas.length})</h4>`;
            html += zonas.map(device => `
                <div class="device-card">
                    <div class="event-header">
                        <div>
                            <span class="panel-badge">📡 ${escapeHTML(device._panelNombre)}</span>
                            <span class="badge ${device.warnings?.length ? 'warning' : 'online'}">
                                ${device.warnings?.length ? '⚠️ Alerta' : '✅ Normal'}
                            </span>
                        </div>
                        <span class="event-date">ID: ${device.id}</span>
                    </div>
                    <div class="event-description">
                        <strong>${escapeHTML(device.name || `Zona ${device.device_number || device.id}`)}</strong>
                    </div>
                    ${device.location?.name ? `<div class="event-detail"><i class="fas fa-map-marker-alt"></i> ${escapeHTML(device.location.name)}</div>` : ''}
                    ${device.zone_type ? `<div class="event-detail"><i class="fas fa-tag"></i> Tipo: ${escapeHTML(device.zone_type)}</div>` : ''}
                    ${device.subtype ? `<div class="event-detail"><i class="fas fa-microchip"></i> Subtipo: ${escapeHTML(device.subtype)}</div>` : ''}
                </div>
            `).join('');
        }
        
        if (otros.length > 0) {
            html += `<h4 style="color:#00ffff; margin: 1rem 0 0.5rem;"><i class="fas fa-microchip"></i> Otros dispositivos (${otros.length})</h4>`;
            html += otros.map(device => `
                <div class="device-card">
                    <div class="event-header">
                        <div>
                            <span class="panel-badge">📡 ${escapeHTML(device._panelNombre)}</span>
                            <span class="badge online">${escapeHTML(device.device_type || 'Dispositivo')}</span>
                        </div>
                        <span class="event-date">ID: ${device.id}</span>
                    </div>
                    <div class="event-description">
                        <strong>${escapeHTML(device.name || `Dispositivo ${device.device_number || device.id}`)}</strong>
                    </div>
                    ${device.subtype ? `<div class="event-detail">Subtipo: ${escapeHTML(device.subtype)}</div>` : ''}
                </div>
            `).join('');
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error cargando dispositivos:', error);
        container.innerHTML = '<div class="empty-data"><i class="fas fa-exclamation-triangle"></i><span>Error cargando dispositivos</span></div>';
    }
}

// ==================== FUNCIONES UTILITARIAS ====================

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const activeTab = document.getElementById(`tab-${tabId}`);
            if (activeTab) activeTab.classList.add('active');
        });
    });
}

function initRefreshButtons() {
    const refreshAll = document.getElementById('btnRefreshAll');
    if (refreshAll) {
        refreshAll.addEventListener('click', async () => {
            const selectedSerial = document.getElementById('activePanelSelect')?.value || 'all';
            
            if (selectedSerial === 'all') {
                await cargarEventosTodosPaneles();
                await cargarAlarmasTodosPaneles();
                await cargarAlertasTodosPaneles();
                await cargarTroublesTodosPaneles();
            } else {
                await cargarEventosPorPanel(selectedSerial);
                await cargarAlarmasPorPanel(selectedSerial);
                await cargarAlertasPorPanel(selectedSerial);
                await cargarTroublesPorPanel(selectedSerial);
            }
            await cargarDispositivosTodosPaneles();
            
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
            
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Todos los datos han sido actualizados',
                timer: 1500,
                showConfirmButton: false
            });
        });
    }
    
    const refreshTabButtons = document.querySelectorAll('.btn-refresh-tab');
    refreshTabButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const tab = btn.getAttribute('data-tab');
            const selectedSerial = document.getElementById('activePanelSelect')?.value || 'all';
            
            switch(tab) {
                case 'events':
                    if (selectedSerial === 'all') await cargarEventosTodosPaneles();
                    else await cargarEventosPorPanel(selectedSerial);
                    break;
                case 'alarms':
                    if (selectedSerial === 'all') await cargarAlarmasTodosPaneles();
                    else await cargarAlarmasPorPanel(selectedSerial);
                    break;
                case 'alerts':
                    if (selectedSerial === 'all') await cargarAlertasTodosPaneles();
                    else await cargarAlertasPorPanel(selectedSerial);
                    break;
                case 'troubles':
                    if (selectedSerial === 'all') await cargarTroublesTodosPaneles();
                    else await cargarTroublesPorPanel(selectedSerial);
                    break;
                case 'devices':
                    await cargarDispositivosTodosPaneles();
                    break;
            }
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
        });
    });
}

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(async () => {
        const selectedSerial = document.getElementById('activePanelSelect')?.value || 'all';
        
        if (selectedSerial === 'all') {
            await cargarEventosTodosPaneles();
            await cargarAlarmasTodosPaneles();
            await cargarAlertasTodosPaneles();
            await cargarTroublesTodosPaneles();
        } else {
            await cargarEventosPorPanel(selectedSerial);
            await cargarAlarmasPorPanel(selectedSerial);
            await cargarAlertasPorPanel(selectedSerial);
            await cargarTroublesPorPanel(selectedSerial);
        }
        await cargarDispositivosTodosPaneles();
        
        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    }, AUTO_REFRESH_MS);
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje
    });
}

function escapeHTML(text) {
    if (!text) return '';
    return String(text).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}