// administradores.js
// Módulo completo para listar administradores (excluye masters)

import { UserManager } from '/clases/user.js';

class ListarAdministradoresUI {
    constructor() {
        // Propiedades del controlador integradas
        this.userManager = null;
        this.administradores = [];
        this.administradoresFiltrados = [];
        this.paginaActual = 1;
        this.elementosPorPagina = 10;
        this.filtroBusqueda = '';
        
        // Elementos del DOM
        this.elementos = {
            tablaBody: document.getElementById('tablaAdministradoresBody'),
            pagination: document.getElementById('pagination'),
            paginationInfo: document.getElementById('paginationInfo'),
            buscarInput: document.getElementById('buscarAdministrador'),
            btnBuscar: document.getElementById('btnBuscar'),
            btnLimpiar: document.getElementById('btnLimpiarBusqueda'),
            totalEstadisticas: document.getElementById('totalEstadisticas'),
            activosEstadisticas: document.getElementById('activosEstadisticas')
        };
    }

    // ==================== MÉTODOS DEL CONTROLADOR ====================
    
    /**
     * Obtiene todos los administradores (solo administradores de organizaciones, excluye masters)
     */
    async obtenerAdministradores() {
        try {
            if (!this.userManager) {
                throw new Error('UserManager no disponible');
            }
            
            const administradores = await this.userManager.getAdministradores(true);
            this.administradores = administradores.filter(admin => admin.rol !== 'master');
            this.aplicarFiltros();
            
            return this.administradoresFiltrados;
            
        } catch (error) {
            console.error('❌ Error obteniendo administradores:', error);
            throw error;
        }
    }

    /**
     * Aplica filtros a la lista de administradores
     */
    aplicarFiltros() {
        let resultado = [...this.administradores];
        
        if (this.filtroBusqueda && this.filtroBusqueda.trim() !== '') {
            const busqueda = this.filtroBusqueda.toLowerCase().trim();
            resultado = resultado.filter(admin => {
                return (
                    (admin.nombreCompleto && admin.nombreCompleto.toLowerCase().includes(busqueda)) ||
                    (admin.correoElectronico && admin.correoElectronico.toLowerCase().includes(busqueda)) ||
                    (admin.organizacion && admin.organizacion.toLowerCase().includes(busqueda))
                );
            });
        }
        
        resultado.sort((a, b) => {
            const fechaA = a.fechaCreacion instanceof Date ? a.fechaCreacion : new Date(a.fechaCreacion);
            const fechaB = b.fechaCreacion instanceof Date ? b.fechaCreacion : new Date(b.fechaCreacion);
            return fechaB - fechaA;
        });
        
        this.administradoresFiltrados = resultado;
        this.paginaActual = 1;
        
        return this.administradoresFiltrados;
    }

    /**
     * Establece el filtro de búsqueda
     */
    setFiltroBusqueda(texto) {
        this.filtroBusqueda = texto;
        this.aplicarFiltros();
    }

    /**
     * Limpia los filtros
     */
    limpiarFiltros() {
        this.filtroBusqueda = '';
        this.aplicarFiltros();
    }

    /**
     * Obtiene administradores paginados
     */
    obtenerAdministradoresPaginados() {
        const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
        const fin = inicio + this.elementosPorPagina;
        return this.administradoresFiltrados.slice(inicio, fin);
    }

    /**
     * Cambia de página
     */
    irPagina(pagina) {
        const totalPaginas = this.obtenerTotalPaginas();
        if (pagina >= 1 && pagina <= totalPaginas) {
            this.paginaActual = pagina;
        }
    }

    /**
     * Obtiene total de páginas
     */
    obtenerTotalPaginas() {
        return Math.ceil(this.administradoresFiltrados.length / this.elementosPorPagina);
    }

    /**
     * Obtiene info de paginación
     */
    obtenerInfoPaginacion() {
        const total = this.administradoresFiltrados.length;
        const inicio = (this.paginaActual - 1) * this.elementosPorPagina + 1;
        const fin = Math.min(inicio + this.elementosPorPagina - 1, total);
        
        return {
            total,
            inicio: total > 0 ? inicio : 0,
            fin: total > 0 ? fin : 0,
            paginaActual: this.paginaActual,
            totalPaginas: this.obtenerTotalPaginas()
        };
    }

    /**
     * Badge del plan - muestra el valor exacto de la base de datos
     */
    getPlanBadge(plan) {
        if (!plan) {
            return '<span class="badge badge-plan-default"><i class="fas fa-question-circle"></i> Sin plan</span>';
        }
        
        const planTexto = String(plan);
        const planLower = planTexto.toLowerCase();
        
        let planClass = 'plan-default';
        let icono = 'fa-chart-line';
        
        if (planLower.includes('gratis')) {
            planClass = 'plan-gratis';
            icono = 'fa-star-of-life';
        } else if (planLower.includes('basico') || planLower.includes('básico')) {
            planClass = 'plan-basico';
            icono = 'fa-chart-line';
        } else if (planLower.includes('premium')) {
            planClass = 'plan-premium';
            icono = 'fa-crown';
        } else if (planLower.includes('empresa')) {
            planClass = 'plan-empresa';
            icono = 'fa-building';
        } else if (planLower.includes('monitoreo')) {
            planClass = 'plan-monitoreo';
            icono = 'fa-chart-simple';
        }
        
        const textoMostrar = planTexto.charAt(0).toUpperCase() + planTexto.slice(1);
        
        return `<span class="badge badge-${planClass}"><i class="fas ${icono}"></i> ${textoMostrar}</span>`;
    }

    /**
     * Obtiene el texto del plan exacto de la base de datos
     */
    getPlanTexto(plan) {
        if (!plan) return 'Sin plan';
        return String(plan);
    }

    /**
     * Badge del rol
     */
    getRolBadge() {
        return '<span class="badge badge-admin"><i class="fas fa-user-shield"></i> Administrador</span>';
    }

    /**
     * Badge del estado
     */
    getEstadoBadge(status) {
        if (status) {
            return '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Activo</span>';
        }
        return '<span class="badge badge-danger"><i class="fas fa-ban"></i> Inactivo</span>';
    }

    /**
     * Genera avatar HTML con dimensiones fijas para evitar deformación
     */
    getAvatarHTML(admin) {
        const fotoUrl = admin.getFotoUrl();
        const nombre = admin.nombreCompleto || admin.correoElectronico || 'Usuario';
        const inicial = nombre.charAt(0).toUpperCase();
        
        if (fotoUrl && !fotoUrl.includes('placeholder')) {
            // Asegurar que la imagen tenga dimensiones fijas y no se deforme
            return `<img src="${fotoUrl}" alt="${nombre}" class="admin-avatar-img"  onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\'admin-avatar-initial\'>${inicial}</div>'">`;
        }
        
        return `<div class="admin-avatar-initial">${inicial}</div>`;
    }

    /**
     * Obtiene estadísticas
     */
    obtenerEstadisticas() {
        const total = this.administradoresFiltrados.length;
        const activos = this.administradoresFiltrados.filter(a => a.status).length;
        const inactivos = total - activos;
        
        return { total, activos, inactivos };
    }

    // ==================== MÉTODOS DE ACCIONES ====================
    
    /**
     * Ver detalles del administrador
     */
    async verDetallesAdmin(admin) {
        try {
            Swal.fire({
                title: `Detalles de ${admin.nombreCompleto || 'Administrador'}`,
                html: `
                    <div style="text-align: left;">
                        <p><strong><i class="fas fa-user"></i> Nombre:</strong> ${this.escapeHtml(admin.nombreCompleto || 'No disponible')}</p>
                        <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${this.escapeHtml(admin.correoElectronico || 'No disponible')}</p>
                        <p><strong><i class="fas fa-building"></i> Organización:</strong> ${this.escapeHtml(admin.organizacion || 'No disponible')}</p>
                        <p><strong><i class="fas fa-chart-line"></i> Plan:</strong> ${this.getPlanTexto(admin.plan)}</p>
                        <p><strong><i class="fas ${admin.status ? 'fa-check-circle text-success' : 'fa-ban text-danger'}"></i> Estado:</strong> ${admin.status ? 'Activo' : 'Inactivo'}</p>
                        <p><strong><i class="fas fa-calendar-alt"></i> Fecha creación:</strong> ${this.formatearFechaCompleta(admin.fechaCreacion)}</p>
                        ${admin.ultimoLogin ? `<p><strong><i class="fas fa-clock"></i> Último login:</strong> ${this.formatearFechaCompleta(admin.ultimoLogin)}</p>` : ''}
                    </div>
                `,
                icon: 'info',
                confirmButtonText: 'Cerrar',
                confirmButtonColor: '#3085d6'
            });
        } catch (error) {
            console.error('❌ Error viendo detalles:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los detalles'
            });
        }
    }

    /**
     * Formatea fecha completa
     */
    formatearFechaCompleta(fecha) {
        if (!fecha) return 'No disponible';
        try {
            const date = new Date(fecha);
            if (isNaN(date.getTime())) return 'Fecha inválida';
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    /**
     * Inactivar administrador
     */
    async inactivarAdmin(admin) {
        const result = await Swal.fire({
            title: '¿Inactivar administrador?',
            html: `¿Estás seguro de que deseas inactivar a <strong>${this.escapeHtml(admin.nombreCompleto || admin.correoElectronico)}</strong>?<br><br>No podrá iniciar sesión hasta que sea reactivado.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, inactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#d33'
        });
        
        if (result.isConfirmed) {
            try {
                await this.userManager.inactivarUsuario(
                    admin.id, 
                    'administrador', 
                    admin.organizacionCamelCase,
                    this.userManager.currentUser
                );
                
                Swal.fire({
                    icon: 'success',
                    title: 'Inactivado',
                    text: `El administrador ha sido inactivado correctamente`,
                    timer: 2000,
                    showConfirmButton: false
                });
                
                await this.cargarAdministradores();
                
            } catch (error) {
                console.error('❌ Error inactivando administrador:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo inactivar el administrador: ' + error.message
                });
            }
        }
    }

    /**
     * Reactivar administrador
     */
    async reactivarAdmin(admin) {
        const result = await Swal.fire({
            title: '¿Reactivar administrador?',
            html: `¿Estás seguro de que deseas reactivar a <strong>${this.escapeHtml(admin.nombreCompleto || admin.correoElectronico)}</strong>?<br><br>Podrá iniciar sesión nuevamente.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#28a745'
        });
        
        if (result.isConfirmed) {
            try {
                await this.userManager.reactivarUsuario(
                    admin.id, 
                    'administrador', 
                    admin.organizacionCamelCase,
                    this.userManager.currentUser
                );
                
                Swal.fire({
                    icon: 'success',
                    title: 'Reactivado',
                    text: `El administrador ha sido reactivado correctamente`,
                    timer: 2000,
                    showConfirmButton: false
                });
                
                await this.cargarAdministradores();
                
            } catch (error) {
                console.error('❌ Error reactivando administrador:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el administrador: ' + error.message
                });
            }
        }
    }

    // ==================== MÉTODOS DE LA VISTA ====================
    
    /**
     * Espera a que el usuario esté cargado
     */
    async esperarUsuarioCargado() {
        return new Promise((resolve) => {
            if (this.userManager.currentUser) {
                resolve();
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (this.userManager.currentUser) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 5000);
        });
    }

    /**
     * Inicializa la página
     */
    async init() {
        try {
            this.userManager = new UserManager();
            await this.esperarUsuarioCargado();
            
            await this.cargarAdministradores();
            this.configurarEventos();
            
        } catch (error) {
            console.error('❌ Error inicializando página:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la página. Intenta nuevamente.\n' + error.message
            });
        }
    }

    /**
     * Carga administradores
     */
    async cargarAdministradores() {
        try {
            this.mostrarLoading();
            await this.obtenerAdministradores();
            this.renderizarTabla();
            this.renderizarPaginacion();
            this.mostrarEstadisticas();
        } catch (error) {
            console.error('❌ Error cargando administradores:', error);
            this.mostrarError('No se pudieron cargar los administradores: ' + error.message);
        }
    }

    /**
     * Muestra loading
     */
    mostrarLoading() {
        if (this.elementos.tablaBody) {
            this.elementos.tablaBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem;"></i>
                        <p style="margin-top: 10px;">Cargando administradores...</p>
                    <\/td>
                <\/tr>
            `;
        }
    }

    /**
     * Muestra error
     */
    mostrarError(mensaje) {
        if (this.elementos.tablaBody) {
            this.elementos.tablaBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #ff4d4d;"></i>
                        <p style="margin-top: 10px;">${mensaje}</p>
                        <button class="btn-recargar" style="margin-top: 15px; padding: 8px 16px; background: #0f0f0f; border: 1px solid #00cfff; border-radius: 8px; color: white; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    <\/td>
                <\/tr>
            `;
            
            const btnRecargar = document.querySelector('.btn-recargar');
            if (btnRecargar) {
                btnRecargar.addEventListener('click', () => {
                    this.cargarAdministradores();
                });
            }
        }
    }

    /**
     * Renderiza la tabla con data-labels para responsive
     */
    renderizarTabla() {
        if (!this.elementos.tablaBody) return;
        
        const administradores = this.obtenerAdministradoresPaginados();
        
        if (administradores.length === 0) {
            this.elementos.tablaBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <i class="fas fa-users" style="font-size: 2rem; opacity: 0.5;"></i>
                        <p style="margin-top: 10px;">No se encontraron administradores</p>
                        ${this.filtroBusqueda ? '<small>Intenta con otro término de búsqueda</small>' : ''}
                    <\/td>
                <\/tr>
            `;
            return;
        }
        
        this.elementos.tablaBody.innerHTML = administradores.map(admin => {
            const avatarHTML = this.getAvatarHTML(admin);
            const nombre = this.escapeHtml(admin.nombreCompleto || 'Sin nombre');
            const email = this.escapeHtml(admin.correoElectronico || 'Sin email');
            const organizacion = admin.organizacion ? this.escapeHtml(admin.organizacion) : '<span class="text-muted">Sin organización</span>';
            const planReal = admin.plan;
            
            return `
                <tr data-id="${admin.id}">
                    <td data-label="Avatar">
                        <div class="admin-avatar">${avatarHTML}</div>
                    <\/td>
                    <td data-label="Nombre / Email">
                        <div class="admin-info">
                            <strong class="admin-nombre">${nombre}</strong>
                            <small class="admin-email">${email}</small>
                        </div>
                    <\/td>
                    <td data-label="Rol">${this.getRolBadge()}<\/td>
                    <td data-label="Organización">${organizacion}<\/td>
                    <td data-label="Plan">${this.getPlanBadge(planReal)}<\/td>
                    <td data-label="Estado">${this.getEstadoBadge(admin.status)}<\/td>
                    <td data-label="Acciones">
                        <div class="btn-group-acciones">
                            <button class="btn-accion btn-ver" data-id="${admin.id}" title="Ver detalles">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${admin.status ? 
                                `<button class="btn-accion btn-inactivar" data-id="${admin.id}" title="Inactivar">
                                    <i class="fas fa-ban"></i>
                                </button>` :
                                `<button class="btn-accion btn-reactivar" data-id="${admin.id}" title="Reactivar">
                                    <i class="fas fa-check-circle"></i>
                                </button>`
                            }
                        </div>
                    <\/td>
                <\/tr>
            `;
        }).join('');
        
        this.configurarEventosBotones();
    }

    /**
     * Renderiza paginación
     */
    renderizarPaginacion() {
        if (!this.elementos.pagination) return;
        
        const info = this.obtenerInfoPaginacion();
        const totalPaginas = info.totalPaginas;
        const paginaActual = info.paginaActual;
        
        if (this.elementos.paginationInfo) {
            if (info.total > 0) {
                this.elementos.paginationInfo.innerHTML = `Mostrando ${info.inicio} - ${info.fin} de ${info.total} administradores`;
            } else {
                this.elementos.paginationInfo.innerHTML = 'No hay administradores para mostrar';
            }
        }
        
        if (totalPaginas <= 1) {
            this.elementos.pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        paginationHTML += `
            <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${paginaActual - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        const startPage = Math.max(1, paginaActual - 2);
        const endPage = Math.min(totalPaginas, paginaActual + 2);
        
        if (startPage > 1) {
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === paginaActual ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        if (endPage < totalPaginas) {
            if (endPage < totalPaginas - 1) paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPaginas}">${totalPaginas}</a></li>`;
        }
        
        paginationHTML += `
            <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${paginaActual + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        this.elementos.pagination.innerHTML = paginationHTML;
        
        this.elementos.pagination.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.getAttribute('data-page'));
                if (page && !isNaN(page) && page !== this.paginaActual) {
                    this.irPagina(page);
                    this.renderizarTabla();
                    this.renderizarPaginacion();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    }

    /**
     * Muestra estadísticas
     */
    mostrarEstadisticas() {
        const estadisticas = this.obtenerEstadisticas();
        
        if (this.elementos.totalEstadisticas) {
            this.elementos.totalEstadisticas.textContent = estadisticas.total;
        }
        if (this.elementos.activosEstadisticas) {
            this.elementos.activosEstadisticas.textContent = estadisticas.activos;
        }
    }

    /**
     * Configura eventos principales
     */
    configurarEventos() {
        if (this.elementos.btnBuscar) {
            this.elementos.btnBuscar.addEventListener('click', () => {
                this.buscarAdministradores();
            });
        }
        
        if (this.elementos.buscarInput) {
            this.elementos.buscarInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.buscarAdministradores();
            });
        }
        
        if (this.elementos.btnLimpiar) {
            this.elementos.btnLimpiar.addEventListener('click', () => {
                this.limpiarBusqueda();
            });
        }
    }

    /**
     * Configura eventos de los botones de acción
     */
    configurarEventosBotones() {
        document.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const admin = this.administradoresFiltrados.find(a => a.id === id);
                if (admin) {
                    await this.verDetallesAdmin(admin);
                }
            });
        });
        
        document.querySelectorAll('.btn-inactivar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const admin = this.administradoresFiltrados.find(a => a.id === id);
                if (admin) {
                    await this.inactivarAdmin(admin);
                }
            });
        });
        
        document.querySelectorAll('.btn-reactivar').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                const admin = this.administradoresFiltrados.find(a => a.id === id);
                if (admin) {
                    await this.reactivarAdmin(admin);
                }
            });
        });
    }

    /**
     * Busca administradores
     */
    async buscarAdministradores() {
        const busqueda = this.elementos.buscarInput?.value || '';
        this.setFiltroBusqueda(busqueda);
        this.renderizarTabla();
        this.renderizarPaginacion();
        this.mostrarEstadisticas();
    }

    /**
     * Limpia búsqueda
     */
    async limpiarBusqueda() {
        if (this.elementos.buscarInput) {
            this.elementos.buscarInput.value = '';
        }
        this.limpiarFiltros();
        this.renderizarTabla();
        this.renderizarPaginacion();
        this.mostrarEstadisticas();
    }

    /**
     * Escapa HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    const listarAdmin = new ListarAdministradoresUI();
    listarAdmin.init();
});

export default ListarAdministradoresUI;