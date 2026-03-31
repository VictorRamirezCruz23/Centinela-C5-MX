// protector-administrador.js
// Módulo de protección para administradores - Centinela
// Valida rol de administrador y permisos según plan
// Los planes tienen mapasActivos: { incidencias: true/false, alertas: true/false }
// Uso: <script src="/components/protector-administrador.js" data-modulo="incidencias"></script>

(async function() {
    'use strict';

    // =============================================
    // CONFIGURACIÓN DE MÓDULOS POR PLAN
    // =============================================
    const MODULOS_POR_PLAN = {
        // Módulos de INCIDENCIAS
        incidencias: { nombreAmigable: 'Incidencias', campoPlan: 'incidencias' },
        listaIncidencias: { nombreAmigable: 'Lista de Incidencias', campoPlan: 'incidencias' },
        crearIncidencias: { nombreAmigable: 'Crear Incidencias', campoPlan: 'incidencias' },
        incidenciasCanalizadas: { nombreAmigable: 'Incidencias Canalizadas', campoPlan: 'incidencias' },
        
        // Módulos de MONITOREO (ALERTAS)
        monitoreo: { nombreAmigable: 'Monitoreo', campoPlan: 'alertas' },
        mapaAlertas: { nombreAmigable: 'Mapa de Alertas', campoPlan: 'alertas' },
        
        // Módulos GENERALES (siempre accesibles para administradores)
        dashboard: { nombreAmigable: 'Dashboard', campoPlan: null },
        perfil: { nombreAmigable: 'Perfil', campoPlan: null },
        configuracion: { nombreAmigable: 'Configuración', campoPlan: null },
        ayuda: { nombreAmigable: 'Ayuda', campoPlan: null },
        bitacora: { nombreAmigable: 'Bitácora', campoPlan: null },
        panelControl: { nombreAmigable: 'Panel de Control', campoPlan: null },
        areas: { nombreAmigable: 'Áreas', campoPlan: null },
        categorias: { nombreAmigable: 'Categorías', campoPlan: null },
        sucursales: { nombreAmigable: 'Sucursales', campoPlan: null },
        regiones: { nombreAmigable: 'Regiones', campoPlan: null },
        usuarios: { nombreAmigable: 'Usuarios', campoPlan: null },
        estadisticas: { nombreAmigable: 'Estadísticas', campoPlan: null },
        tareas: { nombreAmigable: 'Tareas', campoPlan: null },
        permisos: { nombreAmigable: 'Roles y Permisos', campoPlan: null }
    };

    // =============================================
    // CLASE PROTECTOR ADMINISTRADOR
    // =============================================
    class ProtectorAdministrador {
        constructor() {
            this.userRole = null;
            this.planId = null;
            this.plan = null;
            this.moduloRequerido = null;
            this.nombreModulo = null;
            this.campoPlan = null;
            this.redirigiendo = false;
            this.motivoBloqueo = null;
        }

        async iniciar() {
            try {
                this._obtenerModuloRequerido();
                
                if (!this.moduloRequerido) {
                    return;
                }
                
                this._cargarRolYPlan();
                
                // Validar que sea administrador o master
                if (this.userRole !== 'administrador' && this.userRole !== 'master') {
                    this.motivoBloqueo = 'NO_ADMIN';
                    await this._mostrarAlerta();
                    return;
                }
                
                // Master tiene acceso total
                if (this.userRole === 'master') {
                    return;
                }
                
                // Módulos generales siempre permitidos
                if (!this.campoPlan) {
                    return;
                }
                
                // Cargar plan y validar permiso
                await this._cargarPlanUsuario();
                
                const tienePermiso = this._tienePermisoModulo();
                
                if (!tienePermiso) {
                    this.motivoBloqueo = 'SIN_PLAN';
                    await this._mostrarAlerta();
                    return;
                }
                
            } catch (error) {
                console.error('Error en protector administrador:', error);
                this.motivoBloqueo = 'NO_ADMIN';
                await this._mostrarAlerta('Error al validar permisos.');
            }
        }

        _obtenerUrlRedireccion() {
            if (this.userRole === 'administrador' || this.userRole === 'master') {
                return '/usuarios/administrador/panelControl/panelControl.html';
            }
            return '/usuarios/colaboradores/panelControl/panelControl.html';
        }

        async _mostrarAlerta(mensajePersonalizado = null) {
            if (this.redirigiendo) return;
            this.redirigiendo = true;
            
            if (typeof Swal === 'undefined') {
                await this._cargarSweetAlert();
            }
            
            const nombreModulo = this.nombreModulo || this.moduloRequerido;
            const urlRedireccion = this._obtenerUrlRedireccion();
            let mensaje = mensajePersonalizado;
            
            if (!mensaje) {
                if (this.motivoBloqueo === 'NO_ADMIN') {
                    mensaje = `No tienes permisos de administrador.`;
                } else if (this.motivoBloqueo === 'SIN_PLAN') {
                    const nombreMapa = this.campoPlan === 'incidencias' ? 'Incidencias' : 'Monitoreo';
                    mensaje = `El módulo <strong>${nombreMapa}</strong> no está incluido en tu plan actual.<br><br>Contáctate con RSI.`;
                }
            }
            
            await Swal.fire({
                icon: 'warning',
                title: 'Acceso Denegado',
                html: `
                    <p>${mensaje}</p>
                    <div class="mt-3">
                        <div class="progress" style="height: 5px;">
                            <div id="swal-progress-bar" class="progress-bar bg-warning" role="progressbar" style="width: 0%; transition: width 0.1s linear;"></div>
                        </div>
                        <p class="mt-2 text-muted small">Redirigiendo...</p>
                    </div>
                `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                allowEnterKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    let progress = 0;
                    const interval = setInterval(() => {
                        progress += 2;
                        const progressBar = document.getElementById('swal-progress-bar');
                        if (progressBar) {
                            progressBar.style.width = `${Math.min(progress, 100)}%`;
                        }
                        if (progress >= 100) {
                            clearInterval(interval);
                            window.location.replace(urlRedireccion);
                        }
                    }, 60);
                    this._progressInterval = interval;
                },
                willClose: () => {
                    if (this._progressInterval) {
                        clearInterval(this._progressInterval);
                    }
                }
            });
        }
        
        async _cargarSweetAlert() {
            return new Promise((resolve) => {
                if (typeof Swal !== 'undefined') {
                    resolve();
                    return;
                }
                
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css';
                document.head.appendChild(link);
                
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
                script.onload = () => resolve();
                document.head.appendChild(script);
            });
        }

        _obtenerModuloRequerido() {
            const scripts = document.querySelectorAll('script[src*="protector-admin.js"]');
            let scriptActual = null;
            
            for (const script of scripts) {
                if (script.src && script.src.includes('protector-admin.js')) {
                    scriptActual = script;
                    break;
                }
            }
            
            if (!scriptActual) return;
            
            const modulo = scriptActual.getAttribute('data-modulo');
            
            if (modulo && MODULOS_POR_PLAN[modulo]) {
                this.moduloRequerido = modulo;
                this.nombreModulo = MODULOS_POR_PLAN[modulo].nombreAmigable;
                this.campoPlan = MODULOS_POR_PLAN[modulo].campoPlan;
            } else if (modulo) {
                this.moduloRequerido = modulo;
                this.nombreModulo = modulo;
                this.campoPlan = null;
            }
        }

        _cargarRolYPlan() {
            try {
                const userDataStr = localStorage.getItem('userData');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    this.userRole = userData.rol?.toLowerCase() || 'colaborador';
                    this.planId = userData.plan || 'gratis';
                    return;
                }
                
                const adminInfoStr = localStorage.getItem('adminInfo');
                if (adminInfoStr) {
                    const adminData = JSON.parse(adminInfoStr);
                    this.userRole = adminData.rol?.toLowerCase() || 'colaborador';
                    this.planId = adminData.plan || 'gratis';
                    return;
                }
                
                this.userRole = 'colaborador';
                this.planId = 'gratis';
                
            } catch (error) {
                console.error('Error cargando rol y plan:', error);
                this.userRole = 'colaborador';
                this.planId = 'gratis';
            }
        }

        async _cargarPlanUsuario() {
            try {
                const { PlanPersonalizadoManager } = await import('/clases/plan.js');
                const planManager = new PlanPersonalizadoManager();
                const plan = await planManager.obtenerPorId(this.planId);
                
                if (plan) {
                    this.plan = plan;
                } else {
                    this.plan = null;
                }
            } catch (error) {
                console.warn('Error cargando plan:', error);
                this.plan = null;
            }
        }
        
        _tienePermisoModulo() {
            if (!this.campoPlan) {
                return true;
            }
            
            if (!this.plan || !this.plan.mapasActivos) {
                return false;
            }
            
            return this.plan.tieneMapa(this.campoPlan);
        }
    }

    // =============================================
    // INICIALIZACIÓN
    // =============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new ProtectorAdministrador().iniciar();
        });
    } else {
        new ProtectorAdministrador().iniciar();
    }
})();