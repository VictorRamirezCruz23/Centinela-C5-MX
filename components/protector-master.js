// protector-master.js
// Módulo de protección para administradores del sistema (Master)
// Solo permite acceso a usuarios con rol "master"
// Uso: <script src="/components/protector-master.js"></script>

(async function() {
    'use strict';

    // =============================================
    // CLASE PROTECTOR MASTER
    // =============================================
    class ProtectorMaster {
        constructor() {
            this.userRole = null;
            this.redirigiendo = false;
        }

        async iniciar() {
            try {
                // 1. Cargar rol desde localStorage
                this._cargarRol();
                
                // 2. VALIDACIÓN: Verificar que sea master
                if (this.userRole !== 'master') {
                    await this._mostrarAlerta();
                    return;
                }
                
            } catch (error) {
                console.error('Error en protector master:', error);
                await this._mostrarAlerta('Error al validar permisos.');
            }
        }

        _obtenerUrlRedireccion() {
            // Si es administrador, redirige al dashboard de admin
            if (this.userRole === 'administrador') {
                return '/usuarios/administrador/panelControl/panelControl.html';
            }
            // Si es colaborador o cualquier otro, redirige al dashboard de colaborador
            return '/usuarios/colaboradores/panelControl/panelControl.html';
        }

        async _mostrarAlerta(mensajePersonalizado = null) {
            if (this.redirigiendo) return;
            this.redirigiendo = true;
            
            // Cargar SweetAlert si no está disponible
            if (typeof Swal === 'undefined') {
                await this._cargarSweetAlert();
            }
            
            const urlRedireccion = this._obtenerUrlRedireccion();
            const mensaje = mensajePersonalizado || 'No tienes permisos de administrador del sistema para acceder a esta página.';
            
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

        _cargarRol() {
            try {
                const userDataStr = localStorage.getItem('userData');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    this.userRole = userData.rol?.toLowerCase() || 'colaborador';
                    return;
                }
                
                const adminInfoStr = localStorage.getItem('adminInfo');
                if (adminInfoStr) {
                    const adminData = JSON.parse(adminInfoStr);
                    this.userRole = adminData.rol?.toLowerCase() || 'colaborador';
                    return;
                }
                
                this.userRole = 'colaborador';
                
            } catch (error) {
                console.error('Error cargando rol:', error);
                this.userRole = 'colaborador';
            }
        }
    }

    // =============================================
    // INICIALIZACIÓN
    // =============================================
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new ProtectorMaster().iniciar();
        });
    } else {
        new ProtectorMaster().iniciar();
    }
})();