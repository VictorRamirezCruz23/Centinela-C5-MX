// ==================== IMPORTS ====================
import { CuentaPM } from '/clases/cuentaPM.js';
import { UserManager } from '/clases/user.js';

// ==================== VARIABLES GLOBALES v2====================
let cuentaAppId = null;
let cuentaData = null;
let organizaciones = [];
let userManager = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    await initEnlaceForm();
});

async function initEnlaceForm() {
    // Obtener appId de la URL (puede venir como 'id' o 'appId')
    const urlParams = new URLSearchParams(window.location.search);
    cuentaAppId = urlParams.get('appId') || urlParams.get('id');
    
    console.log('🔍 App ID obtenido de URL:', cuentaAppId);
    
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
    
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    try {
        // Inicializar UserManager para obtener organizaciones
        userManager = new UserManager();
        
        // Cargar datos de la cuenta usando appId
        await cargarCuentaPorAppId();
        
        // Cargar organizaciones usando UserManager
        await cargarOrganizaciones();
        
        // Configurar eventos
        configurarEventos(elements);
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Error al cargar los datos',
            confirmButtonText: 'VOLVER'
        }).then(() => {
            window.location.href = '/usuarios/administrador/cuentasPM/cuentasPM.html';
        });
    }
}

function obtenerElementosDOM() {
    try {
        return {
            form: document.getElementById('enlaceForm'),
            selectOrganizacion: document.getElementById('organizacionSelect'),
            btnEnlazar: document.getElementById('btnEnlazar'),
            warningMessage: document.getElementById('warningMessage'),
            organizacionInfoGroup: document.getElementById('organizacionInfoGroup'),
            cuentaEmail: document.getElementById('cuentaEmail'),
            cuentaAppId: document.getElementById('cuentaAppId'),
            cuentaStatus: document.getElementById('cuentaStatus'),
            orgNombre: document.getElementById('orgNombre'),
            orgCamelCase: document.getElementById('orgCamelCase')
        };
    } catch (error) {
        console.error('❌ Error obteniendo elementos DOM:', error);
        return null;
    }
}

// ========== CARGAR DATOS DE LA CUENTA POR APP ID ==========
async function cargarCuentaPorAppId() {
    try {
        console.log('🔍 Buscando cuenta con App ID:', cuentaAppId);
        
        // Verificar que CuentaPM tiene el método obtenerPorAppId
        if (typeof CuentaPM.obtenerPorAppId !== 'function') {
            console.error('❌ CuentaPM.obtenerPorAppId no es una función');
            throw new Error('Método obtenerPorAppId no disponible');
        }
        
        // Buscar la cuenta por appId usando el método estático de CuentaPM
        const cuenta = await CuentaPM.obtenerPorAppId(cuentaAppId);
        
        if (!cuenta) {
            throw new Error(`Cuenta de monitoreo con App ID "${cuentaAppId}" no encontrada`);
        }
        
        cuentaData = cuenta.toJSON();
        
        // Mostrar información en el DOM
        const elements = obtenerElementosDOM();
        if (elements) {
            elements.cuentaEmail.textContent = cuentaData.email || 'No disponible';
            elements.cuentaAppId.textContent = cuentaData.appId || 'No disponible';
            
            // Mostrar estado con badge
            let statusClass = '';
            let statusText = '';
            switch(cuentaData.status) {
                case 'activa':
                    statusClass = 'activa';
                    statusText = 'Activa';
                    break;
                case 'pendiente':
                    statusClass = 'pendiente';
                    statusText = 'Pendiente';
                    break;
                case 'inactiva':
                    statusClass = 'inactiva';
                    statusText = 'Inactiva';
                    break;
                default:
                    statusClass = 'pendiente';
                    statusText = cuentaData.status || 'Pendiente';
            }
            elements.cuentaStatus.textContent = statusText;
            elements.cuentaStatus.className = `status-badge ${statusClass}`;
            
            // Verificar si ya tiene organización asignada
            if (cuentaData.organizacion && cuentaData.organizacionCamelCase) {
                elements.warningMessage.style.display = 'flex';
                console.log('⚠️ La cuenta ya tiene organización asignada:', cuentaData.organizacion);
            }
        }
        
        console.log('✅ Cuenta cargada exitosamente:', {
            email: cuentaData.email,
            appId: cuentaData.appId,
            status: cuentaData.status,
            organizacion: cuentaData.organizacion || 'No asignada'
        });
        
    } catch (error) {
        console.error('❌ Error cargando cuenta por App ID:', error);
        throw new Error(error.message || 'No se pudo cargar la información de la cuenta');
    }
}

// ========== CARGAR ORGANIZACIONES USANDO USERMANAGER ==========
async function cargarOrganizaciones() {
    try {
        console.log('🔍 Cargando organizaciones...');
        
        // Usar el método getAdministradores de UserManager
        const administradores = await userManager.getAdministradores(true);
        
        organizaciones = administradores
            .filter(admin => admin.organizacion && admin.organizacionCamelCase)
            .map(admin => ({
                id: admin.id,
                nombre: admin.organizacion,
                camelCase: admin.organizacionCamelCase,
                fotoOrganizacion: admin.fotoOrganizacion || null
            }));
        
        // Ordenar por nombre
        organizaciones.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        // Llenar el select
        const elements = obtenerElementosDOM();
        if (elements && elements.selectOrganizacion) {
            elements.selectOrganizacion.innerHTML = '<option value="">Selecciona una organización...</option>';
            
            organizaciones.forEach(org => {
                const option = document.createElement('option');
                option.value = org.camelCase;
                option.setAttribute('data-id', org.id);
                option.setAttribute('data-nombre', org.nombre);
                option.textContent = org.nombre;
                elements.selectOrganizacion.appendChild(option);
            });
        }
        
        console.log(`✅ ${organizaciones.length} organizaciones cargadas`);
        
    } catch (error) {
        console.error('❌ Error cargando organizaciones:', error);
        throw new Error('No se pudieron cargar las organizaciones');
    }
}

// ========== CONFIGURAR EVENTOS ==========
function configurarEventos(elements) {
    if (!elements) return;
    
    // Evento al seleccionar organización
    elements.selectOrganizacion.addEventListener('change', async (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const orgId = selectedOption.getAttribute('data-id');
            const orgNombre = selectedOption.getAttribute('data-nombre');
            
            // Mostrar información de la organización
            elements.orgNombre.textContent = orgNombre;
            elements.orgCamelCase.textContent = selectedValue;
            elements.organizacionInfoGroup.style.display = 'block';
        } else {
            elements.organizacionInfoGroup.style.display = 'none';
        }
    });
    
    // Evento submit del formulario
    elements.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await enlazarOrganizacion(elements);
    });
}

// ========== ENLAZAR CON ORGANIZACIÓN ==========
async function enlazarOrganizacion(elements) {
    const selectedValue = elements.selectOrganizacion.value;
    
    if (!selectedValue) {
        Swal.fire({
            icon: 'warning',
            title: 'Selecciona una organización',
            text: 'Debes seleccionar una organización para enlazar la cuenta',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    const selectedOption = elements.selectOrganizacion.options[elements.selectOrganizacion.selectedIndex];
    const orgNombre = selectedOption.getAttribute('data-nombre');
    const orgCamelCase = selectedValue;
    
    // Confirmar acción
    const confirmText = cuentaData.organizacion 
        ? `¿Estás seguro de que deseas reasignar esta cuenta a "${orgNombre}"?\n\nLa asignación actual a "${cuentaData.organizacion}" será reemplazada.`
        : `¿Estás seguro de que deseas asignar esta cuenta a "${orgNombre}"?`;
    
    const result = await Swal.fire({
        title: 'Confirmar asignación',
        text: confirmText,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'SÍ, ENLAZAR',
        cancelButtonText: 'CANCELAR'
    });
    
    if (!result.isConfirmed) return;
    
    // Mostrar loading
    Swal.fire({
        title: 'Enlazando cuenta...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        // Obtener la cuenta por appId y asignar organización usando el método de la clase
        const cuenta = await CuentaPM.obtenerPorAppId(cuentaAppId);
        
        if (!cuenta) {
            throw new Error(`Cuenta con App ID "${cuentaAppId}" no encontrada`);
        }
        
        // Usar el método asignarOrganizacion de la clase CuentaPM
        await cuenta.asignarOrganizacion(orgNombre, orgCamelCase);
        
        Swal.close();
        
        await Swal.fire({
            icon: 'success',
            title: '¡Enlace exitoso!',
            html: `
                <div style="text-align: center;">
                    <p>La cuenta ha sido asignada correctamente a:</p>
                    <p><strong>${escapeHTML(orgNombre)}</strong></p>
                    <p style="margin-top: 10px; font-size: 0.85rem; color: var(--color-text-secondary);">
                        App ID: ${escapeHTML(cuentaAppId)}<br>
                        Identificador: ${escapeHTML(orgCamelCase)}
                    </p>
                </div>
            `,
            confirmButtonText: 'VOLVER A GESTIÓN'
        });
        
        window.location.href = '../cuentasPM/cuentasPM.html';
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error enlazando organización:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error de enlace',
            text: error.message || 'No se pudo completar la asignación',
            confirmButtonText: 'REINTENTAR'
        });
    }
}

// ========== FUNCIÓN AUXILIAR ==========
function escapeHTML(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}