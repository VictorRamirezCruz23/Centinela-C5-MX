// crearPlan.js - Lógica para gestión de planes simplificada
// CONECTADO CON LA CLASE PlanPersonalizado

import { PlanPersonalizadoManager } from '/clases/plan.js';

// =============================================
// CONFIGURACIÓN INICIAL
// =============================================

// Instancia del manager
let planManager = null;
let planesExistentes = [];

// =============================================
// FUNCIONES PRINCIPALES
// =============================================

async function inicializarManager() {
    if (!planManager) {
        planManager = new PlanPersonalizadoManager();
    }
    return planManager;
}

async function cargarPlanes() {
    try {
        const manager = await inicializarManager();
        const planes = await manager.obtenerTodos();
        planesExistentes = planes.map(plan => plan.toUI());
        actualizarListadoPlanes();
        return planesExistentes;
    } catch (error) {
        console.error('Error cargando planes:', error);
        const stored = localStorage.getItem('sistema_planes_backup');
        if (stored) {
            try {
                planesExistentes = JSON.parse(stored);
                actualizarListadoPlanes();
            } catch (e) {
                planesExistentes = [];
            }
        }
        return planesExistentes;
    }
}

function guardarPlanesBackup() {
    localStorage.setItem('sistema_planes_backup', JSON.stringify(planesExistentes));
}

function actualizarListadoPlanes() {
    const container = document.getElementById('planesContainer');
    const countSpan = document.getElementById('planesCount');
    
    if (!container) return;
    
    const count = planesExistentes.length;
    if (countSpan) countSpan.textContent = `(${count})`;
    
    if (count === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>No hay planes creados aún. Crea tu primer plan.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = planesExistentes.map((plan) => {
        const mapasActivos = [];
        if (plan.mapasActivos?.incidencias) mapasActivos.push('Incidencias');
        if (plan.mapasActivos?.alertas) mapasActivos.push('Alertas');
        
        const mapasTexto = mapasActivos.length > 0 ? mapasActivos.join(' + ') : 'Ninguno';
        
        let totalPermisos = 0;
        if (plan.mapasActivos?.incidencias) totalPermisos += 3;
        if (plan.mapasActivos?.alertas) totalPermisos += 1;
        
        return `
            <div class="plan-card" style="--plan-color: ${plan.color}">
                <div class="plan-header">
                    <i class="fas ${plan.icono}" style="color: ${plan.color}"></i>
                    <h4>${escapeHtml(plan.nombre)}</h4>
                </div>
                <div class="plan-price">
                    ${plan.precioFormateado}
                </div>
                <div class="plan-modules-badge">
                    <i class="fas fa-layer-group"></i> ${mapasTexto}
                </div>
                <div class="plan-stats">
                    <span class="badge-permisos">
                        <i class="fas fa-key"></i> ${totalPermisos} permisos
                    </span>
                </div>
                <div class="plan-desc">${escapeHtml(plan.descripcion || 'Sin descripción')}</div>
                <div class="plan-actions">
                    <button class="btn-edit" data-id="${plan.id}" title="Editar plan">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-delete" data-id="${plan.id}" title="Eliminar plan">
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const planId = btn.getAttribute('data-id');
            if (planId) editarPlan(planId);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const planId = btn.getAttribute('data-id');
            if (planId) eliminarPlan(planId);
        });
    });
}

async function editarPlan(planId) {
    const plan = planesExistentes.find(p => p.id === planId);
    if (!plan) return;
    
    document.getElementById('planNombre').value = plan.nombre;
    document.getElementById('planDescripcion').value = plan.descripcion || '';
    document.getElementById('planPrecio').value = plan.precio;
    document.getElementById('planColor').value = plan.color;
    document.getElementById('colorValue').textContent = plan.color;
    
    const incidenciasCheck = document.getElementById('mapaIncidencias');
    const alertasCheck = document.getElementById('mapaAlertas');
    
    if (incidenciasCheck) incidenciasCheck.checked = plan.mapasActivos?.incidencias || false;
    if (alertasCheck) alertasCheck.checked = plan.mapasActivos?.alertas || false;
    
    const submitBtn = document.querySelector('#formCrearPlan button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Actualizar Plan';
        submitBtn.setAttribute('data-edit-id', planId);
    }
    
    document.getElementById('formCrearPlan').scrollIntoView({ behavior: 'smooth' });
}

async function eliminarPlan(planId) {
    const plan = planesExistentes.find(p => p.id === planId);
    if (!plan) return;
    
    const result = await Swal.fire({
        title: '¿Eliminar plan?',
        text: `¿Estás seguro de eliminar "${plan.nombre}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        try {
            const manager = await inicializarManager();
            await manager.eliminarPlan(planId);
            await cargarPlanes();
            guardarPlanesBackup();
            
            Swal.fire({
                title: 'Eliminado',
                text: 'El plan ha sido eliminado correctamente.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error eliminando plan:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo eliminar el plan.',
                icon: 'error'
            });
        }
    }
}

async function guardarPlan(event) {
    event.preventDefault();
    
    const nombre = document.getElementById('planNombre').value.trim();
    const descripcion = document.getElementById('planDescripcion').value.trim();
    const precio = parseFloat(document.getElementById('planPrecio').value);
    const color = document.getElementById('planColor').value;
    const icono = 'fa-cube'; // Ícono por defecto
    
    const incidenciasCheck = document.getElementById('mapaIncidencias');
    const alertasCheck = document.getElementById('mapaAlertas');
    
    if (!incidenciasCheck || !alertasCheck) {
        Swal.fire({
            title: 'Error',
            text: 'Error en el formulario. Recarga la página.',
            icon: 'error'
        });
        return;
    }
    
    const mapasActivos = {
        incidencias: incidenciasCheck.checked,
        alertas: alertasCheck.checked
    };
    
    if (!nombre) {
        Swal.fire({ title: 'Error', text: 'Ingresa un nombre para el plan.', icon: 'error' });
        return;
    }
    
    if (isNaN(precio) || precio < 0) {
        Swal.fire({ title: 'Error', text: 'Ingresa un precio válido.', icon: 'error' });
        return;
    }
    
    if (!mapasActivos.incidencias && !mapasActivos.alertas) {
        Swal.fire({
            title: 'Error',
            text: 'Debes seleccionar al menos un mapa (Incidencias o Alertas).',
            icon: 'error'
        });
        return;
    }
    
    Swal.fire({
        title: 'Guardando...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const manager = await inicializarManager();
        const submitBtn = document.querySelector('#formCrearPlan button[type="submit"]');
        const isEditing = submitBtn?.getAttribute('data-edit-id');
        
        if (isEditing) {
            await manager.actualizarPlan(isEditing, {
                nombre, descripcion, precio, color, icono, mapasActivos
            });
            Swal.fire({ title: '¡Plan actualizado!', icon: 'success', timer: 2000, showConfirmButton: false });
        } else {
            await manager.crearPlan({
                nombre, descripcion, precio, color, icono, mapasActivos
            });
            Swal.fire({ title: '¡Plan creado!', icon: 'success', timer: 2000, showConfirmButton: false });
        }
        
        await cargarPlanes();
        guardarPlanesBackup();
        limpiarFormulario();
        
    } catch (error) {
        console.error('Error:', error);
        Swal.close();
        Swal.fire({ title: 'Error', text: error.message || 'No se pudo guardar.', icon: 'error' });
    }
}

function limpiarFormulario() {
    document.getElementById('planNombre').value = '';
    document.getElementById('planDescripcion').value = '';
    document.getElementById('planPrecio').value = '';
    document.getElementById('planColor').value = '#0dcaf0';
    document.getElementById('colorValue').textContent = '#0dcaf0';
    
    const incidenciasCheck = document.getElementById('mapaIncidencias');
    const alertasCheck = document.getElementById('mapaAlertas');
    if (incidenciasCheck) incidenciasCheck.checked = false;
    if (alertasCheck) alertasCheck.checked = false;
    
    const submitBtn = document.querySelector('#formCrearPlan button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Crear Plan';
        submitBtn.removeAttribute('data-edit-id');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function actualizarFecha() {
    const fechaSpan = document.getElementById('fechaActualizacion');
    if (fechaSpan) {
        fechaSpan.textContent = new Date().toLocaleString('es-MX');
    }
}

function inicializarEventos() {
    const form = document.getElementById('formCrearPlan');
    if (form) form.addEventListener('submit', guardarPlan);
    
    const btnLimpiar = document.getElementById('btnLimpiar');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFormulario);
    
    const colorPicker = document.getElementById('planColor');
    const colorValue = document.getElementById('colorValue');
    if (colorPicker && colorValue) {
        colorPicker.addEventListener('input', (e) => colorValue.textContent = e.target.value);
    }
    
    actualizarFecha();
    setInterval(actualizarFecha, 1000);
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await inicializarManager();
        await cargarPlanes();
        guardarPlanesBackup();
        inicializarEventos();
    } catch (error) {
        console.error('Error:', error);
        inicializarEventos();
    }
});