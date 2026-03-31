// ========== asignarPermisosAdmin.js - ASIGNAR PLANES A ADMINISTRADORES ==========
// SUPER ADMIN (externo): Obtiene todos los administradores de la colección 'administradores'
// y les asigna planes de permisos usando la clase PlanPersonalizado

import { UserManager } from '/clases/user.js';
import { PlanPersonalizadoManager, MODULOS_SISTEMA } from '/clases/plan.js';

// ========== CONSTANTES ==========
const DIAS_VENCIMIENTO = 30; // 30 días fijos de vigencia del plan

// ========== VARIABLES GLOBALES ==========
let userManager = null;
let planManager = null;
let todosLosAdministradores = [];
let administradorSeleccionado = null;
let planSeleccionado = null;
let planesPersonalizados = [];

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando panel de asignación de planes para Super Admin...');
        
        // Inicializar managers
        userManager = new UserManager();
        planManager = new PlanPersonalizadoManager();
        
        // Cargar datos
        await cargarAdministradores();
        await cargarPlanesPersonalizados();
        
        // Configurar eventos
        configurarEventos();
        
        console.log('✅ Inicialización completa');
        
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarError('Error al cargar el panel: ' + error.message);
    }
});

// ========== CARGAR ADMINISTRADORES ==========
async function cargarAdministradores() {
    try {
        mostrarLoading();
        
        const administradores = await userManager.getAdministradores(true);
        
        todosLosAdministradores = administradores.map(admin => ({
            id: admin.id,
            nombreCompleto: admin.nombreCompleto || 'Sin nombre',
            correoElectronico: admin.correoElectronico || 'Sin email',
            organizacion: admin.organizacion || 'Sin organización',
            organizacionCamelCase: admin.organizacionCamelCase || '',
            planActual: admin.plan || 'sin-plan',
            fechaVencimiento: admin.fechaVencimiento || null,
            status: admin.status !== undefined ? admin.status : true,
            fotoUsuario: admin.fotoUsuario || null,
            fotoOrganizacion: admin.fotoOrganizacion || null,
            fechaCreacion: admin.fechaCreacion,
            cargo: admin.cargo || null,
            cargoId: admin.cargoId || null
        }));
        
        console.log(`✅ Cargados ${todosLosAdministradores.length} administradores`);
        mostrarResultados(todosLosAdministradores);
        
    } catch (error) {
        console.error('Error cargando administradores:', error);
        mostrarError('No se pudieron cargar los administradores: ' + error.message);
    }
}

// ========== CARGAR PLANES PERSONALIZADOS DESDE LA COLECCIÓN ==========
async function cargarPlanesPersonalizados() {
    try {
        console.log('📡 Cargando planes desde Firestore - Colección: planes');
        
        // Obtener todos los planes desde Firestore usando PlanPersonalizadoManager
        const planes = await planManager.obtenerTodos();
        
        console.log(`📋 Planes encontrados: ${planes.length}`);
        
        if (planes.length === 0) {
            console.warn('⚠️ No se encontraron planes en la colección "planes"');
        } else {
            planes.forEach(plan => {
                console.log(`  - ID: ${plan.id}, Nombre: ${plan.nombre}, Precio: ${plan.precio}`);
                console.log(`    Mapas activos:`, plan.mapasActivos);
            });
        }
        
        // Guardar los planes originales para uso posterior
        planesPersonalizados = planes;
        
        console.log(`✅ Cargados ${planesPersonalizados.length} planes personalizados desde Firestore`);
        
        return planesPersonalizados;
        
    } catch (error) {
        console.error('❌ Error cargando planes personalizados:', error);
        planesPersonalizados = [];
        return [];
    }
}

// ========== BUSCAR ADMINISTRADORES ==========
function buscarAdministradores(termino) {
    if (!termino || termino.trim() === '') {
        return todosLosAdministradores;
    }
    
    const terminoLower = termino.toLowerCase().trim();
    
    return todosLosAdministradores.filter(admin => {
        const orgNombre = (admin.organizacion || '').toLowerCase();
        const adminNombre = (admin.nombreCompleto || '').toLowerCase();
        const email = (admin.correoElectronico || '').toLowerCase();
        
        return orgNombre.includes(terminoLower) || 
               adminNombre.includes(terminoLower) || 
               email.includes(terminoLower);
    });
}

// ========== MOSTRAR RESULTADOS ==========
function mostrarResultados(administradores) {
    const container = document.getElementById('resultadosContainer');
    const lista = document.getElementById('resultadosLista');
    const countSpan = document.getElementById('resultadosCount');
    
    if (!container || !lista) {
        console.error('Elementos del DOM no encontrados: resultadosContainer o resultadosLista');
        return;
    }
    
    if (administradores.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <h3>No se encontraron administradores</h3>
                <p>No hay administradores registrados en el sistema</p>
            </div>
        `;
        if (countSpan) countSpan.textContent = '0 resultados';
    } else {
        lista.innerHTML = administradores.map(admin => `
            <div class="admin-card" data-admin-id="${admin.id}">
                <div class="admin-info">
                    <div class="admin-avatar">
                        ${admin.fotoUsuario ? 
                            `<img src="${admin.fotoUsuario}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : 
                            '<i class="fas fa-user-tie"></i>'
                        }
                    </div>
                    <div class="admin-details">
                        <h4>${escapeHTML(admin.nombreCompleto)}</h4>
                        <p>${escapeHTML(admin.correoElectronico)}</p>
                    </div>
                </div>
                <div class="admin-empresa">
                    <span>
                        <i class="fas fa-building"></i>
                        ${escapeHTML(admin.organizacion)}
                    </span>
                </div>
                <div class="admin-plan-actual">
                    ${getPlanBadge(admin.planActual, admin.fechaVencimiento)}
                </div>
                <div class="admin-status">
                    ${admin.status ? 
                        '<span class="status-badge active"><i class="fas fa-check-circle"></i> Activo</span>' : 
                        '<span class="status-badge inactive"><i class="fas fa-pause-circle"></i> Inactivo</span>'
                    }
                </div>
                <div class="admin-accion">
                    <button class="btn-asignar-plan" data-admin-id="${admin.id}">
                        <i class="fas fa-crown"></i> Asignar Plan
                    </button>
                </div>
            </div>
        `).join('');
        
        if (countSpan) countSpan.textContent = `${administradores.length} ${administradores.length === 1 ? 'administrador' : 'administradores'}`;
        
        // Eventos de botones
        document.querySelectorAll('.btn-asignar-plan').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const adminId = btn.dataset.adminId;
                const admin = administradores.find(a => a.id === adminId);
                if (admin) {
                    abrirModalAsignarPlan(admin);
                }
            });
        });
        
        // Click en tarjeta
        document.querySelectorAll('.admin-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-asignar-plan')) return;
                const adminId = card.dataset.adminId;
                const admin = administradores.find(a => a.id === adminId);
                if (admin) {
                    abrirModalAsignarPlan(admin);
                }
            });
        });
    }
    
    container.style.display = 'block';
}

// ========== OBTENER BADGE DEL PLAN ==========
function getPlanBadge(plan, fechaVencimiento) {
    // Buscar el plan en la lista de planes personalizados para mostrar nombre bonito
    if (plan && plan !== 'sin-plan' && plan !== 'gratis') {
        const planEncontrado = planesPersonalizados.find(p => p.id === plan);
        const nombreMostrar = planEncontrado ? planEncontrado.nombre : plan;
        
        let badgeHtml = `<span class="plan-badge personalizado"><i class="fas fa-cube"></i> ${escapeHTML(nombreMostrar)}</span>`;
        
        // Mostrar fecha de vencimiento si existe
        if (fechaVencimiento) {
            const fecha = new Date(fechaVencimiento);
            const fechaStr = fecha.toLocaleDateString('es-MX');
            badgeHtml += `<span class="vencimiento-badge" style="margin-left: 8px; font-size: 0.7rem; color: var(--color-text-dim);">
                <i class="fas fa-calendar-alt"></i> Vigente hasta: ${fechaStr}
            </span>`;
        }
        return badgeHtml;
    }
    
    const planes = {
        'gratis': { clase: 'sin-plan', texto: 'Gratis', icono: 'fa-gift' },
        'sin-plan': { clase: 'sin-plan', texto: 'Sin Plan', icono: 'fa-question-circle' }
    };
    
    const info = planes[plan] || planes['sin-plan'];
    return `<span class="plan-badge ${info.clase}"><i class="fas ${info.icono}"></i> ${info.texto}</span>`;
}

// ========== OBTENER MAPAS ACTIVOS PARA MOSTRAR (usado en confirmación) ==========
function obtenerMapasActivosHtml(plan) {
    if (!plan || !plan.mapasActivos) return '';
    
    const mapasHtml = [];
    
    if (plan.mapasActivos.incidencias) {
        mapasHtml.push(`
            <span class="modulo-tag activo" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i> Incidencias
            </span>
        `);
    }
    
    if (plan.mapasActivos.alertas) {
        mapasHtml.push(`
            <span class="modulo-tag activo" style="background: rgba(168, 85, 247, 0.15); color: #a855f7;">
                <i class="fas fa-map-marker-alt"></i> Alertas (Mapa)
            </span>
        `);
    }
    
    return mapasHtml.join('');
}

// ========== OBTENER PERMISOS ACTIVOS PARA MOSTRAR (usado en confirmación) ==========
function obtenerPermisosActivosHtml(plan) {
    if (!plan) return '';
    
    const permisosHtml = [];
    
    // Permisos de Incidencias
    if (plan.mapasActivos?.incidencias) {
        const moduloIncidencias = MODULOS_SISTEMA.incidencias;
        if (moduloIncidencias && moduloIncidencias.permisos) {
            Object.values(moduloIncidencias.permisos).forEach(permiso => {
                permisosHtml.push(`
                    <span class="permiso-tag" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                        <i class="fas ${permiso.icono}"></i> ${permiso.nombre}
                    </span>
                `);
            });
        }
    }
    
    // Permisos de Alertas
    if (plan.mapasActivos?.alertas) {
        const moduloAlertas = MODULOS_SISTEMA.alertas;
        if (moduloAlertas && moduloAlertas.permisos) {
            Object.values(moduloAlertas.permisos).forEach(permiso => {
                permisosHtml.push(`
                    <span class="permiso-tag" style="background: rgba(168, 85, 247, 0.1); color: #a855f7;">
                        <i class="fas ${permiso.icono}"></i> ${permiso.nombre}
                    </span>
                `);
            });
        }
    }
    
    return permisosHtml.join('');
}

// ========== ABRIR MODAL ASIGNAR PLAN ==========
async function abrirModalAsignarPlan(admin) {
    administradorSeleccionado = admin;
    planSeleccionado = null;
    
    const modal = document.getElementById('modalAsignarPlan');
    const adminInfoDiv = document.getElementById('adminInfoSeleccionado');
    const modalTitle = document.getElementById('modalTitle');
    const planesContainer = document.getElementById('planesContainer');
    
    // Validar elementos necesarios
    if (!modal) {
        console.error('Modal no encontrado: modalAsignarPlan');
        mostrarError('Error: No se pudo abrir el modal de asignación');
        return;
    }
    
    if (!adminInfoDiv) {
        console.error('Elemento no encontrado: adminInfoSeleccionado');
        mostrarError('Error: Elemento de información del administrador no encontrado');
        return;
    }
    
    if (!planesContainer) {
        console.error('❌ ELEMENTO CRÍTICO FALTANTE: planesContainer');
        console.error('Debes agregar un elemento con id="planesContainer" dentro de tu modal');
        mostrarError('Error: Contenedor de planes no encontrado. Revisa la consola para más detalles.');
        return;
    }
    
    console.log('✅ planesContainer encontrado:', planesContainer);
    
    if (modalTitle) modalTitle.textContent = 'Asignar Plan';
    
    // Calcular fecha de vencimiento (30 días desde hoy)
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + DIAS_VENCIMIENTO);
    const fechaVencimientoStr = fechaVencimiento.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Buscar el plan actual del admin para mostrar su nombre bonito
    const planActualObj = planesPersonalizados.find(p => p.id === admin.planActual);
    const nombrePlanActual = planActualObj ? planActualObj.nombre : (admin.planActual === 'sin-plan' ? 'Sin Plan' : admin.planActual === 'gratis' ? 'Gratis' : admin.planActual);
    
    adminInfoDiv.innerHTML = `
        <div class="info-icon">
            ${admin.fotoUsuario ? 
                `<img src="${admin.fotoUsuario}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` : 
                '<i class="fas fa-user-tie"></i>'
            }
        </div>
        <div class="info-text">
            <h4>${escapeHTML(admin.nombreCompleto)}</h4>
            <p><i class="fas fa-building"></i> ${escapeHTML(admin.organizacion)}</p>
            <p><i class="fas fa-envelope"></i> ${escapeHTML(admin.correoElectronico)}</p>
            <p><i class="fas fa-chart-line"></i> Plan actual: ${getPlanBadge(admin.planActual, admin.fechaVencimiento)}</p>
            <p><i class="fas fa-calendar-alt"></i> <strong>Vigencia del nuevo plan:</strong> ${DIAS_VENCIMIENTO} días (hasta ${fechaVencimientoStr})</p>
        </div>
    `;
    
    // Construir HTML de planes - VERSIÓN COMPACTA SIN INFO REDUNDANTE
    let planesHTML = '';
    
    if (planesPersonalizados.length > 0) {
        console.log(`📋 Mostrando ${planesPersonalizados.length} planes personalizados (vista compacta)`);
        
        planesHTML += `
            <div class="planes-section">
                <div class="planes-grid">
                    ${planesPersonalizados.map(plan => {
                        // Calcular datos básicos para mostrar de forma compacta
                        const totalMapas = plan.contarMapasActivos();
                        const totalPermisos = plan.contarPermisosActivos();
                        const precioFormateado = plan.obtenerPrecioFormateado();
                        const nombrePlan = escapeHTML(plan.nombre);
                        const colorPlan = plan.color || '#8b5cf6';
                        const iconoPlan = plan.icono || 'fa-cube';
                        
                        return `
                            <div class="plan-opcion plan-personalizado" data-plan-id="${escapeHTML(plan.id)}">
                                <input type="radio" name="planSeleccionado" value="${escapeHTML(plan.id)}" id="plan_${escapeHTML(plan.id)}">
                                <label for="plan_${escapeHTML(plan.id)}">
                                    <div class="plan-header">
                                        <i class="fas ${iconoPlan}" style="color: ${colorPlan};"></i>
                                        <h3>${nombrePlan}</h3>
                                        <span class="plan-precio">${precioFormateado}</span>
                                    </div>
                                    <div class="plan-stats">
                                        <span><i class="fas fa-cubes"></i> ${totalMapas} mapa(s)</span>
                                        <span><i class="fas fa-key"></i> ${totalPermisos} permiso(s)</span>
                                        <span><i class="fas fa-calendar-check"></i> ${DIAS_VENCIMIENTO} días</span>
                                    </div>
                                </label>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    } else {
        console.log('⚠️ No hay planes personalizados en la colección "planes"');
        planesHTML += `
            <div class="planes-section">
                <div class="empty-state-small">
                    <i class="fas fa-info-circle"></i>
                    <p>No hay planes creados. Puedes crearlos desde el panel de creación de planes.</p>
                </div>
            </div>
        `;
    }
    
    planesContainer.innerHTML = planesHTML;
    console.log('✅ Planes cargados en el contenedor (vista compacta)');
    
    // Resetear selección
    document.querySelectorAll('input[name="planSeleccionado"]').forEach(radio => {
        radio.checked = false;
        const planOpcion = radio.closest('.plan-opcion');
        if (planOpcion) planOpcion.classList.remove('selected');
    });
    
    // Preseleccionar plan actual del admin
    if (admin.planActual && admin.planActual !== 'sin-plan' && admin.planActual !== 'gratis') {
        const radioSeleccionado = document.querySelector(`input[name="planSeleccionado"][value="${admin.planActual}"]`);
        if (radioSeleccionado) {
            radioSeleccionado.checked = true;
            const planOpcion = radioSeleccionado.closest('.plan-opcion');
            if (planOpcion) planOpcion.classList.add('selected');
            planSeleccionado = admin.planActual;
            console.log(`✅ Plan preseleccionado: ${admin.planActual}`);
        }
    }
    
    // Evento de selección de plan
    document.querySelectorAll('.plan-opcion').forEach(opcion => {
        const radio = opcion.querySelector('input[type="radio"]');
        if (radio) {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll('.plan-opcion').forEach(opt => opt.classList.remove('selected'));
                opcion.classList.add('selected');
                planSeleccionado = e.target.value;
                console.log(`📋 Plan seleccionado: ${planSeleccionado}`);
            });
        }
    });
    
    modal.style.display = 'flex';
    console.log('✅ Modal abierto');
}

// ========== OBTENER INFORMACIÓN DEL PLAN SELECCIONADO ==========
async function obtenerInfoPlan(planId) {
    console.log(`🔍 Buscando información del plan: ${planId}`);
    
    // Buscar en planes personalizados usando el manager
    try {
        const plan = await planManager.obtenerPorId(planId);
        if (plan) {
            console.log(`✅ Plan personalizado encontrado: ${plan.nombre} (ID: ${plan.id})`);
            return {
                id: plan.id,
                nombre: plan.nombre,
                color: plan.color,
                icono: plan.icono,
                precio: plan.precio,
                precioFormateado: plan.obtenerPrecioFormateado(),
                mapasActivos: plan.mapasActivos,
                totalMapas: plan.contarMapasActivos(),
                totalPermisos: plan.contarPermisosActivos(),
                mapasActivosLista: plan.obtenerMapasActivos(),
                permisosActivos: plan.obtenerPermisosActivos()
            };
        }
    } catch (error) {
        console.error('Error obteniendo plan por ID:', error);
    }
    
    // Fallback: buscar en caché
    const cachedPlan = planesPersonalizados.find(p => p.id === planId);
    if (cachedPlan) {
        console.log(`✅ Plan encontrado en caché: ${cachedPlan.nombre}`);
        return {
            id: cachedPlan.id,
            nombre: cachedPlan.nombre,
            color: cachedPlan.color,
            icono: cachedPlan.icono,
            precio: cachedPlan.precio,
            precioFormateado: cachedPlan.obtenerPrecioFormateado(),
            mapasActivos: cachedPlan.mapasActivos,
            totalMapas: cachedPlan.contarMapasActivos(),
            totalPermisos: cachedPlan.contarPermisosActivos(),
            mapasActivosLista: cachedPlan.obtenerMapasActivos(),
            permisosActivos: cachedPlan.obtenerPermisosActivos()
        };
    }
    
    console.warn(`⚠️ Plan no encontrado: ${planId}`);
    return null;
}

// ========== ASIGNAR PLAN ==========
async function asignarPlan() {
    if (!administradorSeleccionado) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No hay administrador seleccionado',
            background: '#1a1a1a',
            color: '#fff'
        });
        return;
    }
    
    if (!planSeleccionado) {
        Swal.fire({
            icon: 'warning',
            title: 'Selecciona un plan',
            text: 'Debes seleccionar un plan para asignar',
            background: '#1a1a1a',
            color: '#fff'
        });
        return;
    }
    
    console.log(`📋 Asignando plan "${planSeleccionado}" al administrador ${administradorSeleccionado.nombreCompleto}`);
    
    const infoPlan = await obtenerInfoPlan(planSeleccionado);
    if (!infoPlan) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo obtener la información del plan seleccionado',
            background: '#1a1a1a',
            color: '#fff'
        });
        return;
    }
    
    // Calcular fecha de vencimiento (30 días desde hoy)
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + DIAS_VENCIMIENTO);
    const fechaVencimientoStr = fechaVencimiento.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const confirmModal = document.getElementById('modalConfirmacion');
    const confirmContenido = document.getElementById('confirmacionContenido');
    
    if (!confirmModal || !confirmContenido) {
        console.error('Elementos de confirmación no encontrados');
        mostrarError('Error: No se pudo mostrar la confirmación');
        return;
    }
    
    // Generar HTML de mapas y permisos para confirmación
    const mapasConfirmHtml = infoPlan.mapasActivosLista.map(mapa => `
        <span style="background: ${mapa.color}20; color: ${mapa.color}; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem;">
            <i class="fas ${mapa.icono}"></i> ${mapa.nombre}
        </span>
    `).join('');
    
    const permisosConfirmHtml = infoPlan.permisosActivos.map(permiso => `
        <span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem;">
            <i class="fas ${permiso.icono}"></i> ${permiso.nombre}
        </span>
    `).join('');
    
    confirmContenido.innerHTML = `
        <div style="padding: 10px 0;">
            <p><strong>Administrador:</strong> ${escapeHTML(administradorSeleccionado.nombreCompleto)}</p>
            <p><strong>Organización:</strong> ${escapeHTML(administradorSeleccionado.organizacion)}</p>
            <p><strong>Plan a asignar:</strong> ${infoPlan.nombre}</p>
            <p><strong>ID del Plan:</strong> ${planSeleccionado}</p>
            <p><strong>Precio:</strong> ${infoPlan.precioFormateado}/mes</p>
            <p><strong>Vigencia:</strong> ${DIAS_VENCIMIENTO} días (hasta ${fechaVencimientoStr})</p>
            <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
            <div class="mapas-preview">
                <p><strong>Mapas incluidos (${infoPlan.totalMapas}):</strong></p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    ${mapasConfirmHtml || '<span>Ningún mapa activo</span>'}
                </div>
            </div>
            <div class="permisos-preview" style="margin-top: 15px;">
                <p><strong>Permisos incluidos (${infoPlan.totalPermisos}):</strong></p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                    ${permisosConfirmHtml || '<span>Sin permisos específicos</span>'}
                </div>
            </div>
        </div>
    `;
    
    const modalAsignar = document.getElementById('modalAsignarPlan');
    if (modalAsignar) modalAsignar.style.display = 'none';
    confirmModal.style.display = 'flex';
    
    const confirmarBtn = document.getElementById('btnConfirmarAsignar');
    const cancelarConfirm = document.getElementById('btnCancelarConfirm');
    const closeConfirm = document.getElementById('closeConfirmModal');
    
    if (!confirmarBtn || !cancelarConfirm) {
        console.error('Botones de confirmación no encontrados');
        confirmModal.style.display = 'none';
        return;
    }
    
    const handleConfirm = async () => {
        confirmModal.style.display = 'none';
        
        try {
            Swal.fire({
                title: 'Asignando plan...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            
            // Actualizar el campo 'plan' y 'fechaVencimiento' del administrador
            const fechaVencimientoISO = fechaVencimiento.toISOString();
            
            await userManager.updateUser(
                administradorSeleccionado.id,
                { 
                    plan: planSeleccionado,
                    fechaVencimiento: fechaVencimientoISO,
                    planAsignadoEn: new Date().toISOString(),
                    planNombre: infoPlan.nombre // Guardar también el nombre para fácil acceso
                },
                'administrador',
                administradorSeleccionado.organizacionCamelCase
            );
            
            console.log(`✅ Plan "${planSeleccionado}" (${infoPlan.nombre}) asignado correctamente con vencimiento el ${fechaVencimientoStr}`);
            
            Swal.fire({
                icon: 'success',
                title: 'Plan asignado',
                html: `
                    <p>Se ha asignado el <strong>${escapeHTML(infoPlan.nombre)}</strong> a:</p>
                    <p><strong>${escapeHTML(administradorSeleccionado.nombreCompleto)}</strong></p>
                    <p>de <strong>${escapeHTML(administradorSeleccionado.organizacion)}</strong></p>
                    <p>Vigencia: ${DIAS_VENCIMIENTO} días (hasta ${fechaVencimientoStr})</p>
                    <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;">
                    <p style="font-size: 0.85rem; color: #aaa;">
                        <i class="fas fa-cubes"></i> ${infoPlan.totalMapas} mapas activos<br>
                        <i class="fas fa-key"></i> ${infoPlan.totalPermisos} permisos
                    </p>
                `,
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonText: 'Aceptar'
            });
            
            await cargarAdministradores();
            administradorSeleccionado = null;
            planSeleccionado = null;
            
        } catch (error) {
            console.error('Error asignando plan:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'No se pudo asignar el plan',
                background: '#1a1a1a',
                color: '#fff'
            });
        }
        
        confirmarBtn.removeEventListener('click', handleConfirm);
        cancelarConfirm.removeEventListener('click', handleCancel);
        if (closeConfirm) closeConfirm.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
        confirmModal.style.display = 'none';
        administradorSeleccionado = null;
        planSeleccionado = null;
    };
    
    confirmarBtn.addEventListener('click', handleConfirm, { once: true });
    cancelarConfirm.addEventListener('click', handleCancel, { once: true });
    if (closeConfirm) closeConfirm.addEventListener('click', handleCancel, { once: true });
}

// ========== CONFIGURAR EVENTOS ==========
function configurarEventos() {
    const btnBuscar = document.getElementById('btnBuscar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const inputBuscar = document.getElementById('buscarOrganizacion');
    
    if (btnBuscar && inputBuscar) {
        btnBuscar.addEventListener('click', () => {
            const resultados = buscarAdministradores(inputBuscar.value);
            mostrarResultados(resultados);
        });
    }
    
    if (btnLimpiar && inputBuscar) {
        btnLimpiar.addEventListener('click', () => {
            inputBuscar.value = '';
            mostrarResultados(todosLosAdministradores);
        });
    }
    
    if (inputBuscar) {
        inputBuscar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const resultados = buscarAdministradores(inputBuscar.value);
                mostrarResultados(resultados);
            }
        });
    }
    
    const closeModal = document.getElementById('closeModal');
    const cancelarModal = document.getElementById('btnCancelarModal');
    const asignarBtn = document.getElementById('btnAsignarPlan');
    const modalAsignar = document.getElementById('modalAsignarPlan');
    
    if (closeModal && modalAsignar) {
        closeModal.addEventListener('click', () => {
            modalAsignar.style.display = 'none';
            administradorSeleccionado = null;
            planSeleccionado = null;
        });
    }
    
    if (cancelarModal && modalAsignar) {
        cancelarModal.addEventListener('click', () => {
            modalAsignar.style.display = 'none';
            administradorSeleccionado = null;
            planSeleccionado = null;
        });
    }
    
    if (asignarBtn) {
        asignarBtn.addEventListener('click', asignarPlan);
    }
    
    window.addEventListener('click', (e) => {
        const modalAsignar = document.getElementById('modalAsignarPlan');
        const modalConfirm = document.getElementById('modalConfirmacion');
        
        if (e.target === modalAsignar && modalAsignar) {
            modalAsignar.style.display = 'none';
            administradorSeleccionado = null;
            planSeleccionado = null;
        }
        
        if (e.target === modalConfirm && modalConfirm) {
            modalConfirm.style.display = 'none';
        }
    });
}

// ========== UTILIDADES ==========
function mostrarLoading() {
    const lista = document.getElementById('resultadosLista');
    if (lista) {
        lista.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Cargando administradores...</p>
            </div>
        `;
    }
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje,
        background: '#1a1a1a',
        color: '#fff'
    });
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}