// ========== VARIABLES GLOBALES ==========
import { CuentaPM } from '/clases/cuentaPM.js';

// Configuración de paginación
const ITEMS_POR_PAGINA = 10;
let paginaActual = 1;
let terminoBusqueda = '';
let todasLasCuentas = []; // Almacena todas las cuentas para búsqueda
let cuentasFiltradas = []; // Cuentas filtradas para mostrar

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async function() {    
    try {
        await loadCuentasPM();
        configurarBusqueda();
        setupEvents();
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        showError(error.message || 'Error al cargar la página');
    }
});

// ========== CONFIGURAR BÚSQUEDA ==========
function configurarBusqueda() {
    const inputBuscar = document.getElementById('buscarCuenta');
    const btnBuscar = document.getElementById('btnBuscarCuenta');
    const btnLimpiar = document.getElementById('btnLimpiarBusqueda');

    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            terminoBusqueda = inputBuscar?.value.trim() || '';
            paginaActual = 1;
            filtrarYRenderizar();
        });
    }

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', () => {
            if (inputBuscar) inputBuscar.value = '';
            terminoBusqueda = '';
            paginaActual = 1;
            filtrarYRenderizar();
        });
    }

    // Búsqueda en tiempo real con debounce
    if (inputBuscar) {
        let timeoutId;
        inputBuscar.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                terminoBusqueda = e.target.value.trim();
                paginaActual = 1;
                filtrarYRenderizar();
            }, 300);
        });

        inputBuscar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                terminoBusqueda = e.target.value.trim();
                paginaActual = 1;
                filtrarYRenderizar();
            }
        });
    }
}

// ========== FUNCIÓN DE FILTRADO ==========
function filtrarYRenderizar() {
    if (!todasLasCuentas.length) {
        cuentasFiltradas = [];
    } else if (!terminoBusqueda || terminoBusqueda.length < 2) {
        cuentasFiltradas = [...todasLasCuentas];
    } else {
        const terminoLower = terminoBusqueda.toLowerCase();
        cuentasFiltradas = todasLasCuentas.filter(cuenta => 
            (cuenta.email && cuenta.email.toLowerCase().includes(terminoLower)) ||
            (cuenta.organizacion && cuenta.organizacion.toLowerCase().includes(terminoLower)) ||
            (cuenta.status && cuenta.status.toLowerCase().includes(terminoLower)) ||
            (cuenta.appId && cuenta.appId.toLowerCase().includes(terminoLower))
        );
    }

    renderizarConPaginacion();
}

// ========== FUNCIONES DE PAGINACIÓN ==========
function renderizarPaginacion(totalPaginas) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    if (totalPaginas <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = '';
    for (let i = 1; i <= totalPaginas; i++) {
        html += `
            <li class="page-item ${i === paginaActual ? 'active' : ''}">
                <button class="page-link" onclick="window.irPaginaCuentaPM(${i})">${i}</button>
            </li>
        `;
    }
    pagination.innerHTML = html;
}

window.irPaginaCuentaPM = function(pagina) {
    paginaActual = pagina;
    renderizarConPaginacion();
    document.querySelector('.card-body')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ========== RENDERIZAR CON PAGINACIÓN ==========
function renderizarConPaginacion() {
    const tbody = document.getElementById('cuentasTableBody');
    if (!tbody) return;

    const totalItems = cuentasFiltradas.length;
    const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
    
    if (paginaActual > totalPaginas && totalPaginas > 0) {
        paginaActual = totalPaginas;
    }
    
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = Math.min(inicio + ITEMS_POR_PAGINA, totalItems);
    const cuentasPagina = cuentasFiltradas.slice(inicio, fin);

    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = totalItems === 0 
            ? 'No se encontraron cuentas' 
            : `Mostrando ${inicio + 1}-${fin} de ${totalItems} cuentas`;
    }

    const paginacionContainer = document.querySelector('.pagination-container');
    if (paginacionContainer) {
        paginacionContainer.style.display = totalItems > ITEMS_POR_PAGINA ? 'flex' : 'none';
    }

    if (totalItems === 0) {
        if (!todasLasCuentas.length) {
            showEmptyState();
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-state-content">
                            <i class="fas fa-search" style="font-size: 48px; color: rgba(255,255,255,0.3); margin-bottom: 16px;"></i>
                            <h3>No se encontraron cuentas</h3>
                            <p>${terminoBusqueda ? `No hay resultados para "${terminoBusqueda}"` : ''}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
        renderizarPaginacion(0);
        return;
    }

    renderCuentasTable(cuentasPagina);
    renderizarPaginacion(totalPaginas);
}

// ========== CARGAR CUENTAS ==========
async function loadCuentasPM() {
    try {
        showLoadingState();
        
        // Usar el método estático de la clase
        todasLasCuentas = await CuentaPM.obtenerTodas();
        
        // Convertir a objetos planos para fácil manejo
        todasLasCuentas = todasLasCuentas.map(cuenta => cuenta.toJSON());
        
        cuentasFiltradas = [...todasLasCuentas];
        renderizarConPaginacion();
        
    } catch (error) {
        console.error('❌ Error cargando cuentas:', error);
        showError(error.message);
    }
}

// ========== RENDERIZAR TABLA ==========
function renderCuentasTable(cuentas) {
    const tbody = document.getElementById('cuentasTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    cuentas.forEach(cuenta => {
        const row = document.createElement('tr');
        
        let statusClass = '';
        let statusIcon = '';
        let statusText = '';
        
        switch(cuenta.status) {
            case 'activa':
                statusClass = 'activa';
                statusIcon = 'fa-check-circle';
                statusText = 'Activa';
                break;
            case 'pendiente':
                statusClass = 'pendiente';
                statusIcon = 'fa-clock';
                statusText = 'Pendiente';
                break;
            case 'inactiva':
                statusClass = 'inactiva';
                statusIcon = 'fa-ban';
                statusText = 'Inactiva';
                break;
            default:
                statusClass = 'pendiente';
                statusIcon = 'fa-clock';
                statusText = cuenta.status || 'Pendiente';
        }
        
        const isActive = cuenta.status === 'activa';
        
        row.innerHTML = `
            <td data-label="EMAIL">${escapeHTML(cuenta.email || 'No disponible')}</td>
            <td data-label="ORGANIZACIÓN">${escapeHTML(cuenta.organizacion || 'No asignada')}</td>
            <td data-label="APP ID"><code>${escapeHTML(cuenta.appId || 'No disponible')}</code></td>
            <td data-label="ESTADO">
                <span class="status-badge ${statusClass}">
                    <i class="fas ${statusIcon}"></i> ${statusText}
                </span>
            </td>
            <td data-label="ACCIONES">
                <div class="btn-group">
                    <button type="button" class="btn btn-view" 
                            data-action="view" data-id="${cuenta.id}" data-email="${escapeHTML(cuenta.email)}" 
                            title="Ver detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn ${isActive ? 'btn-disable' : 'btn-enable'}" 
                            data-action="toggle" data-id="${cuenta.id}" data-email="${escapeHTML(cuenta.email)}" 
                            data-status="${isActive}" title="${isActive ? 'Inhabilitar' : 'Habilitar'}">
                        <i class="fas ${isActive ? 'fa-user-slash' : 'fa-user-check'}"></i>
                    </button>
                    <button type="button" class="btn btn-assign" 
                            data-action="assign" 
                            data-id="${cuenta.id}" 
                            data-appid="${escapeHTML(cuenta.appId)}" 
                            data-email="${escapeHTML(cuenta.email)}" 
                            title="Asignar a organización">
                        <i class="fas fa-building"></i>
                    </button>
                    <button type="button" class="btn btn-assign" 
                            data-action="assignPanel" 
                            data-id="${cuenta.id}" 
                            data-appid="${escapeHTML(cuenta.appId)}" 
                            data-email="${escapeHTML(cuenta.email)}" 
                            title="Asignar paneles">
                        <i class="fas fa-user-shield"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ========== CONFIGURAR EVENTOS ==========
function setupEvents() {
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            window.location.href = '../registroPM/registroPM.html';
        });
    }
    
    const tbody = document.getElementById('cuentasTableBody');
    if (tbody) {
        tbody.addEventListener('click', async (e) => {
            const button = e.target.closest('.btn');
            if (!button) return;
            
            const action = button.getAttribute('data-action');
            const cuentaId = button.getAttribute('data-id');
            const cuentaEmail = button.getAttribute('data-email');
            const currentStatus = button.getAttribute('data-status') === 'true';
            
            if (action === 'view') {
                await viewCuentaDetails(cuentaId);
            } 
            else if (action === 'toggle') {
                await toggleCuentaStatus(cuentaId, cuentaEmail, !currentStatus);
            } 
            else if (action === 'assign') {
                // Redirigir a la página de enlace con el appId como parámetro
                const appId = button.getAttribute('data-appid');
                window.location.href = `../enlaceCuentaMonitoreo/enlaceCuentaMonitoreo.html?id=${encodeURIComponent(appId)}`;
            }
            else if (action === 'assignPanel') {
                // Redirigir a la página de enlace con el appId como parámetro
                const appId = button.getAttribute('data-appid');
                window.location.href = `../enlaceCuentaPaneles/enlaceCuentaPaneles.html?id=${encodeURIComponent(appId)}`;
            }
        });
    }
}

// ========== VER DETALLES ==========
async function viewCuentaDetails(cuentaId) {
    try {
        const cuenta = await CuentaPM.obtenerPorId(cuentaId);
        if (!cuenta) throw new Error('Cuenta no encontrada');
        
        const data = cuenta.toJSON();
        
        let statusClass = '';
        let statusIcon = '';
        let statusText = '';
        
        switch(data.status) {
            case 'activa':
                statusClass = 'activa';
                statusIcon = 'fa-check-circle';
                statusText = 'Activa';
                break;
            case 'pendiente':
                statusClass = 'pendiente';
                statusIcon = 'fa-clock';
                statusText = 'Pendiente';
                break;
            case 'inactiva':
                statusClass = 'inactiva';
                statusIcon = 'fa-ban';
                statusText = 'Inactiva';
                break;
            default:
                statusClass = 'pendiente';
                statusIcon = 'fa-clock';
                statusText = data.status || 'Pendiente';
        }
        
        Swal.fire({
            title: 'Detalles de cuenta',
            html: `
                <div class="swal-details-container">
                    <div class="swal-detail-card">
                        <p><strong>Email</strong> <span>${escapeHTML(data.email)}</span></p>
                        <p><strong>Estado</strong> 
                            <span class="status-badge ${statusClass}" style="display: inline-block; margin-left: 0;">
                                <i class="fas ${statusIcon}"></i> ${statusText}
                            </span>
                        </p>
                        <p><strong>App ID</strong> <span><code>${escapeHTML(data.appId)}</code></span></p>
                    </div>
                    
                    <div class="swal-detail-card">
                        <p><strong>Organización</strong> <span>${escapeHTML(data.organizacion || 'No asignada')}</span></p>
                        <p><strong>Identificador</strong> <span>${escapeHTML(data.organizacionCamelCase || 'No asignada')}</span></p>
                    </div>
                    
                    <div class="swal-detail-card">
                        <p><strong>Token</strong></p>
                        <div class="token-display">${escapeHTML(data.userToken || 'No generado')}</div>
                    </div>
                </div>
            `,
            width: 600,
            showCloseButton: true,
            showConfirmButton: false
        });
        
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudieron obtener los detalles', 'error');
    }
}

// ========== CAMBIAR ESTADO ==========
async function toggleCuentaStatus(cuentaId, cuentaEmail, enable) {
    try {
        const actionText = enable ? 'Habilitar' : 'Inhabilitar';
        const statusText = enable ? 'habilitada' : 'inhabilitada';
        const newStatus = enable ? 'activa' : 'inactiva';
        
        const result = await Swal.fire({
            title: `${actionText} cuenta`,
            html: `<p><strong>${escapeHTML(cuentaEmail)}</strong></p><p>¿Estás seguro?</p>`,
            icon: enable ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonText: `Sí, ${statusText}`
        });
        
        if (!result.isConfirmed) return;
        
        Swal.fire({ title: `${actionText}...`, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        const cuenta = await CuentaPM.obtenerPorId(cuentaId);
        await cuenta.cambiarEstado(newStatus);
        
        Swal.close();
        await loadCuentasPM();
        
        Swal.fire({
            icon: 'success',
            title: '¡Estado cambiado!',
            text: `${cuentaEmail} ha sido ${statusText}`,
            timer: 2000,
            showConfirmButton: false
        });
        
    } catch (error) {
        Swal.close();
        Swal.fire('Error', error.message, 'error');
    }
}

// ========== FUNCIONES AUXILIARES ==========
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showLoadingState() {
    const tbody = document.getElementById('cuentasTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr><td colspan="5" class="loading-state">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h3>Cargando cuentas...</h3>
            </div>
        </td></tr>
    `;
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

function showEmptyState() {
    const tbody = document.getElementById('cuentasTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr><td colspan="5" class="empty-state">
            <div class="empty-state-content">
                <i class="fas fa-network-wired"></i>
                <h3>No hay cuentas</h3>
                <p>Agrega tu primera cuenta</p>
                <button class="btn-nueva-cuenta" id="addFirstCuenta" style="margin-top: 16px;">
                    <i class="fas fa-plus"></i> Agregar Cuenta
                </button>
            </div>
        </td></tr>
    `;
    document.getElementById('addFirstCuenta')?.addEventListener('click', () => {
        window.location.href = '../registroPM/registroPM.html';
    });
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

function showError(message) {
    const tbody = document.getElementById('cuentasTableBody');
    if (!tbody) return;
    tbody.innerHTML = `
        <tr><td colspan="5" class="error-state">
            <div class="error-content">
                <i class="fas fa-exclamation-circle"></i>
                <h3>${escapeHTML(message)}</h3>
                <button onclick="window.location.reload()" class="reload-btn">Reintentar</button>
            </div>
        </td></tr>
    `;
    const paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

export { loadCuentasPM };