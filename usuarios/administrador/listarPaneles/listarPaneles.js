// ==================== IMPORTS ====================
import { CuentaPM } from '/clases/cuentaPM.js';
import { CLOUD_FUNCTION_BASE_URL, ACTIONS } from '/config/urlCloudFunction.js';

// ==================== CONSTANTES ====================
const POWER_MANAGE_FUNCTION = 'proxyPowerManage';

// ==================== VARIABLES GLOBALES ====================
let cuentaAppId = null;
let cuentaData = null;
let powerManageUserToken = null;
let paneles = [];

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    await initListaPaneles();
});

async function initListaPaneles() {
    const urlParams = new URLSearchParams(window.location.search);
    cuentaAppId = urlParams.get('appId') || urlParams.get('id');
    
    if (!cuentaAppId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se especificó la cuenta de monitoreo',
            confirmButtonText: 'VOLVER'
        }).then(() => {
            window.location.href = '/usuarios/administrador/cuentasPM/cuentasPM.html';
        });
        return;
    }
    
    try {
        await cargarCuenta();
        
        const powerManageStr = localStorage.getItem('powerManageToken');
        
        if (!powerManageStr) {
            console.warn('⚠️ No hay token de Power Manage en localStorage');
            redirectToLogin('No hay sesión activa de Power Manage');
            return;
        }
        
        const powerManageData = JSON.parse(powerManageStr);
        powerManageUserToken = powerManageData.user_token;
        
        console.log('✅ Token Power Manage cargado');
        
        if (!powerManageUserToken || powerManageUserToken === 'undefined') {
            console.warn('⚠️ Token inválido');
            redirectToLogin('Token de autenticación inválido');
            return;
        }
        
        await cargarPanelesPowerManage();
        
        configurarEventos();
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        
        if (error.message === 'Wrong user token' || error.message.includes('401') || error.message.includes('token')) {
            redirectToLogin('La sesión de monitoreo ha expirado');
        } else {
            mostrarError(error.message);
        }
    }
}

function redirectToLogin(mensaje) {
    localStorage.removeItem('powerManageToken');
    
    Swal.fire({
        icon: 'warning',
        title: 'Sesión expirada',
        text: mensaje || 'Debes autenticarte nuevamente con tu cuenta de monitoreo',
        confirmButtonText: 'IR A AUTENTICACIÓN'
    }).then(() => {
        window.location.href = `/usuarios/administrador/loginMonitoreo/loginMonitoreo.html?redirect=listarPaneles&appId=${cuentaAppId}`;
    });
}

async function cargarCuenta() {
    const cuenta = await CuentaPM.obtenerPorAppId(cuentaAppId);
    if (!cuenta) throw new Error('Cuenta no encontrada');
    
    cuentaData = cuenta.toJSON();
    
    document.getElementById('cuentaEmail').textContent = cuentaData.email;
    document.getElementById('cuentaAppId').textContent = cuentaData.appId;
    document.getElementById('cuentaEmailInfo').textContent = cuentaData.email;
    document.getElementById('cuentaAppIdInfo').textContent = cuentaData.appId;
    document.getElementById('cuentaOrganizacion').textContent = cuentaData.organizacion || 'No asignada';
}

async function cargarPanelesPowerManage() {
    const panelesGrid = document.getElementById('panelesGrid');
    
    panelesGrid.innerHTML = `
        <div class="loading-paneles">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Cargando paneles...</span>
        </div>
    `;
    
    try {
        const url = `${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'listarPaneles',
                user_token: powerManageUserToken
            })
        });
        
        if (response.status === 401) {
            throw new Error('Wrong user token');
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_message || 'Error al obtener paneles');
        }
        
        paneles = await response.json();
        
        console.log('📊 Paneles obtenidos:', paneles.length);
        
        document.getElementById('totalPaneles').textContent = paneles.length;
        
        // Renderizar los paneles con los botones
        renderizarListaPaneles();
        
    } catch (error) {
        console.error('❌ Error cargando paneles:', error);
        
        if (error.message === 'Wrong user token') {
            redirectToLogin('La sesión de monitoreo ha expirado');
            return;
        }
        
        panelesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar paneles</p>
                <small>${error.message}</small>
                <button class="btn-refresh" id="btnRetry" style="margin-top: 1rem;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
        
        const btnRetry = document.getElementById('btnRetry');
        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                cargarPanelesPowerManage();
            });
        }
    }
}

function renderizarListaPaneles() {
    const panelesGrid = document.getElementById('panelesGrid');
    
    if (!paneles || paneles.length === 0) {
        panelesGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tachometer-alt"></i>
                <p>No hay paneles vinculados en Power Manage</p>
                <small>Usa el botón "Vincular Nuevo Panel" para agregar uno</small>
            </div>
        `;
        return;
    }
    
    // Renderizar cada panel con sus botones
    panelesGrid.innerHTML = paneles.map(panel => {
        // Determinar el nombre a mostrar
        let nombreMostrar = panel.alias;
        if (!nombreMostrar || nombreMostrar === '') {
            nombreMostrar = panel.panel_model || panel.type || `Panel ${panel.panel_serial.substring(0, 8)}`;
        }
        
        return `
            <div class="panel-card">
                <div class="panel-card-header">
                    <i class="fas fa-microchip"></i>
                    <h4>${escapeHTML(nombreMostrar)}</h4>
                    <span class="status-badge">Activo</span>
                </div>
                <div class="panel-details">
                    <div class="panel-detail">
                        <span class="label">Serial:</span>
                        <span class="value">${escapeHTML(panel.panel_serial)}</span>
                    </div>
                    <div class="panel-detail">
                        <span class="label">Modelo:</span>
                        <span class="value">${escapeHTML(panel.panel_model || 'Desconocido')}</span>
                    </div>
                    <div class="panel-detail">
                        <span class="label">Tipo:</span>
                        <span class="value">${escapeHTML(panel.type || 'No especificado')}</span>
                    </div>
                    <div class="panel-detail">
                        <span class="label">Rol:</span>
                        <span class="value">${escapeHTML(panel.role || 'USER')}</span>
                    </div>
                </div>
                <div class="panel-actions">
                    <button class="btn-edit-alias" data-serial="${panel.panel_serial}" data-alias="${escapeHTML(panel.alias || '')}">
                        <i class="fas fa-edit"></i> Editar alias
                    </button>
                    <button class="btn-gestionar" data-serial="${panel.panel_serial}">
                        <i class="fas fa-chart-line"></i> Gestionar
                    </button>
                    <button class="btn-eliminar" data-serial="${panel.panel_serial}">
                        <i class="fas fa-trash"></i> Desvincular
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Agregar eventos a los botones
    document.querySelectorAll('.btn-edit-alias').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const serial = btn.getAttribute('data-serial');
            const alias = btn.getAttribute('data-alias');
            editarAliasPanel(serial, alias);
        });
    });
    
    document.querySelectorAll('.btn-gestionar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const serial = btn.getAttribute('data-serial');
            gestionarPanel(serial);
        });
    });
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const serial = btn.getAttribute('data-serial');
            eliminarPanel(serial);
        });
    });
}

// Función para editar el alias del panel
async function editarAliasPanel(serial, aliasActual) {
    const { value: nuevoAlias } = await Swal.fire({
        title: 'Editar alias del panel',
        html: `
            <div style="text-align: left;">
                <p><strong>Panel:</strong> ${escapeHTML(serial)}</p>
                <p>Ingresa un nombre descriptivo para identificar este panel:</p>
            </div>
        `,
        input: 'text',
        inputLabel: 'Alias',
        inputValue: aliasActual || '',
        inputPlaceholder: 'Ej: Casa Principal, Oficina, Sucursal Norte',
        showCancelButton: true,
        confirmButtonText: 'GUARDAR',
        cancelButtonText: 'CANCELAR',
        inputValidator: (value) => {
            if (!value || value.trim() === '') {
                return 'El alias no puede estar vacío';
            }
            if (value.length > 50) {
                return 'El alias no puede tener más de 50 caracteres';
            }
            return null;
        }
    });
    
    if (!nuevoAlias) return;
    
    mostrarProgreso('Guardando alias...', 30);
    
    try {
        const url = `${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'renamePanel',
                user_token: powerManageUserToken,
                panel_serial: serial,
                alias: nuevoAlias.trim()
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        
        mostrarProgreso('Procesando...', 70);
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error_message || 'Error al cambiar el alias');
        }
        
        ocultarProgreso();
        
        Swal.fire({
            icon: 'success',
            title: 'Alias actualizado',
            text: `El panel ahora se llama: ${nuevoAlias}`,
            timer: 2000,
            showConfirmButton: false
        });
        
        // Actualizar el panel en la lista local
        const panelIndex = paneles.findIndex(p => p.panel_serial === serial);
        if (panelIndex !== -1) {
            paneles[panelIndex].alias = nuevoAlias;
        }
        
        // Recargar la lista para mostrar el cambio
        renderizarListaPaneles();
        
    } catch (error) {
        console.error('❌ Error cambiando alias:', error);
        ocultarProgreso();
        
        if (error.message === 'Wrong user token') {
            redirectToLogin('La sesión de monitoreo ha expirado');
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo cambiar el alias del panel'
            });
        }
    }
}

async function gestionarPanel(serial) {
    const panel = paneles.find(p => p.panel_serial === serial);
    
    if (!panel) {
        mostrarError('Panel no encontrado');
        return;
    }
    
    let nombreMostrar = panel.alias;
    if (!nombreMostrar || nombreMostrar === '') {
        nombreMostrar = panel.panel_model || panel.type || `Panel ${serial.substring(0, 8)}`;
    }
    
    const panelSeleccionado = {
        serial: panel.panel_serial,
        alias: panel.alias || '',
        modelo: panel.panel_model || 'Desconocido',
        tipo: panel.type || 'No especificado',
        role: panel.role || 'USER',
        nombreMostrar: nombreMostrar
    };
    
    localStorage.setItem('panelSeleccionado', JSON.stringify(panelSeleccionado));
    
    window.location.href = `../gestionarPanel/gestionarPanel.html?appId=${cuentaAppId}&panelSerial=${serial}`;
}

async function eliminarPanel(serial) {
    const confirm = await Swal.fire({
        title: '¿Desvincular panel?',
        text: `¿Estás seguro de que deseas desvincular el panel "${serial}" de tu cuenta Power Manage?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'SÍ, DESVINCULAR',
        cancelButtonText: 'CANCELAR'
    });
    
    if (!confirm.isConfirmed) return;
    
    mostrarProgreso('Desvinculando panel...', 30);
    
    try {
        const url = `${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'desvincularPanel',
                user_token: powerManageUserToken,
                panel_serial: serial
            })
        });
        
        if (response.status === 401) throw new Error('Wrong user token');
        
        mostrarProgreso('Procesando...', 70);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_message || 'Error al desvincular panel');
        }
        
        ocultarProgreso();
        
        Swal.fire({
            icon: 'success',
            title: 'Panel desvinculado',
            text: `El panel ${serial} ha sido desvinculado`,
            timer: 2000,
            showConfirmButton: false
        });
        
        await cargarPanelesPowerManage();
        
    } catch (error) {
        console.error('❌ Error eliminando panel:', error);
        ocultarProgreso();
        
        if (error.message === 'Wrong user token') {
            redirectToLogin('La sesión de monitoreo ha expirado');
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error al desvincular',
                text: error.message
            });
        }
    }
}

function configurarEventos() {
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            await cargarPanelesPowerManage();
        });
    }
    
    const btnVincularNuevo = document.getElementById('btnVincularNuevo');
    if (btnVincularNuevo) {
        btnVincularNuevo.addEventListener('click', () => {
            window.location.href = `enlaceCuentaPaneles.html?appId=${cuentaAppId}`;
        });
    }
}

function mostrarProgreso(mensaje, porcentaje) {
    let container = document.getElementById('progressContainer');
    if (!container) {
        const panelesSection = document.querySelector('.paneles-section');
        if (panelesSection) {
            const div = document.createElement('div');
            div.id = 'progressContainer';
            div.style.display = 'none';
            div.innerHTML = `
                <div class="progress-info">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span id="progressMessage">Procesando...</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar" style="width: 0%"></div>
                </div>
            `;
            panelesSection.insertAdjacentElement('afterend', div);
            container = document.getElementById('progressContainer');
        }
    }
    
    if (!container) return;
    
    const message = document.getElementById('progressMessage');
    const bar = document.getElementById('progressBar');
    
    container.style.display = 'block';
    if (message) message.textContent = mensaje;
    if (bar) bar.style.width = `${porcentaje}%`;
}

function ocultarProgreso() {
    const container = document.getElementById('progressContainer');
    const bar = document.getElementById('progressBar');
    
    if (!container) return;
    
    setTimeout(() => {
        container.style.display = 'none';
        if (bar) bar.style.width = '0%';
    }, 500);
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