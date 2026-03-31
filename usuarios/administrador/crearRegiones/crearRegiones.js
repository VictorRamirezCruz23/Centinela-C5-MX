// crearRegiones.js - VERSIÓN MEJORADA CON REGISTRO DE BITÁCORA
// BASADA EN CREAR CATEGORÍAS

// LÍMITES DE CARACTERES
const LIMITES = {
    NOMBRE_REGION: 50
};

// =============================================
// CLASE PRINCIPAL - CrearRegionController
// =============================================
class CrearRegionController {
    constructor() {
        this.regionManager = null;
        this.usuarioActual = null;
        this.loadingOverlay = null;
        this.historialManager = null; // ✅ NUEVO: Para registrar actividades

        // Inicializar
        this._init();
    }

    // ========== INICIALIZACIÓN ==========
    async _init() {
        try {
            // 1. Cargar usuario
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            // 2. Inicializar historialManager
            await this._initHistorialManager();

            // 3. Cargar RegionManager
            await this._cargarRegionManager();

            // 4. Configurar eventos
            this._configurarEventos();

            // 5. Configurar organización automática
            this._configurarOrganizacion();

            // 6. Inicializar validaciones
            this._inicializarValidaciones();

            // 7. Actualizar UI con información de la organización
            this._actualizarInfoOrganizacion();

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    // ✅ NUEVO: Inicializar historialManager
    async _initHistorialManager() {
        try {
            const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
            this.historialManager = new HistorialUsuarioManager();
            console.log('📋 HistorialManager inicializado para regiones');
        } catch (error) {
            console.error('Error inicializando historialManager:', error);
        }
    }

    // ✅ NUEVO: Registrar creación de región
    async _registrarCreacionRegion(region, datos) {
        if (!this.historialManager) return;
        
        try {
            await this.historialManager.registrarActividad({
                usuario: this.usuarioActual,
                tipo: 'crear',
                modulo: 'regiones',
                descripcion: `Creó región: ${datos.nombre}`,
                detalles: {
                    regionId: region.id,
                    regionNombre: datos.nombre,
                    regionColor: datos.color,
                    fechaCreacion: new Date().toISOString()
                }
            });
            console.log(`✅ Creación de región "${datos.nombre}" registrada en bitácora`);
        } catch (error) {
            console.error('Error registrando creación de región:', error);
        }
    }

    // ========== CARGA DE DEPENDENCIAS ==========
    async _cargarRegionManager() {
        try {
            const { RegionManager } = await import('/clases/region.js');
            this.regionManager = new RegionManager();
        } catch (error) {
            console.error('Error cargando RegionManager:', error);
            throw error;
        }
    }

    // ========== CARGA DE USUARIO ==========
    _cargarUsuario() {
        try {
            // Intentar adminInfo (para administradores)
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: adminData.id || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || ''
                };
                return;
            }

            // Intentar userData
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            if (userData && Object.keys(userData).length > 0) {
                this.usuarioActual = {
                    id: userData.uid || userData.id || `user_${Date.now()}`,
                    uid: userData.uid || userData.id,
                    nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                    organizacion: userData.organizacion || userData.empresa || 'Sin organización',
                    organizacionCamelCase: userData.organizacionCamelCase ||
                        this._generarCamelCase(userData.organizacion || userData.empresa),
                    correo: userData.correo || userData.email || ''
                };
                return;
            }

            // Datos por defecto (para desarrollo)
            this.usuarioActual = {
                id: `admin_${Date.now()}`,
                uid: `admin_${Date.now()}`,
                nombreCompleto: 'Administrador',
                organizacion: 'pollos Ray',
                organizacionCamelCase: 'pollosRay',
                correo: 'admin@centinela.com'
            };

        } catch (error) {
            console.error('Error cargando usuario:', error);
            throw error;
        }
    }

    _generarCamelCase(texto) {
        if (!texto || typeof texto !== 'string') return 'sinOrganizacion';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    // ========== CONFIGURACIÓN DE ORGANIZACIÓN ==========
    _configurarOrganizacion() {
        const orgInput = document.getElementById('organization');
        if (orgInput) {
            orgInput.value = this.usuarioActual.organizacion;
        }
    }

    _actualizarInfoOrganizacion() {
        // Podrías mostrar información adicional si lo deseas
        const container = document.getElementById('headerDescription');
        if (container) {
            const coleccion = `regiones_${this.usuarioActual.organizacionCamelCase}`;
            container.innerHTML = `
                <div style="margin-bottom: 8px;">
                    <strong>Organización:</strong> ${this.usuarioActual.organizacion}
                </div>
                <div style="font-size: 0.9rem; opacity: 0.8;">
                    <i class="fas fa-database"></i> Colección: ${coleccion}
                </div>
            `;
        }
    }

    // ========== CONFIGURACIÓN DE EVENTOS ==========
    _configurarEventos() {
        try {
            // Botón Volver a la lista
            const btnVolverLista = document.getElementById('btnVolverLista');
            if (btnVolverLista) {
                btnVolverLista.addEventListener('click', () => this._volverALista());
            }

            // Botón Cancelar
            const btnCancelar = document.getElementById('cancelBtn');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => this._cancelarCreacion());
            }

            // Botón Crear Región
            const btnCrearRegion = document.getElementById('registerBtn');
            if (btnCrearRegion) {
                btnCrearRegion.addEventListener('click', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Formulario Submit
            const form = document.getElementById('formRegionPrincipal');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this._validarYGuardar();
                });
            }

            // Color Preview (igual que categorías)
            const colorPreviewCard = document.getElementById('colorPreviewCard');
            const colorPickerNative = document.getElementById('colorRegion');

            if (colorPreviewCard && colorPickerNative) {
                colorPreviewCard.addEventListener('click', () => {
                    colorPickerNative.click();
                });

                colorPickerNative.addEventListener('input', (e) => {
                    const color = e.target.value;
                    const colorDisplay = document.getElementById('colorDisplay');
                    const colorHex = document.getElementById('colorHex');
                    
                    if (colorDisplay) {
                        colorDisplay.style.backgroundColor = color;
                    }
                    if (colorHex) {
                        colorHex.textContent = color;
                    }
                });
            }

            // Contador de caracteres para el nombre
            const nombreInput = document.getElementById('nombreRegion');
            if (nombreInput) {
                nombreInput.addEventListener('input', () => this._actualizarContadorCaracteres());
                nombreInput.maxLength = LIMITES.NOMBRE_REGION;
            }

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    _inicializarValidaciones() {
        this._actualizarContadorCaracteres();
    }

    _actualizarContadorCaracteres() {
        const nombreInput = document.getElementById('nombreRegion');
        const contador = document.getElementById('contadorCaracteres');

        if (nombreInput && contador) {
            const longitud = nombreInput.value.length;
            contador.textContent = `${longitud}/${LIMITES.NOMBRE_REGION}`;

            // Cambiar color si se acerca al límite
            if (longitud > LIMITES.NOMBRE_REGION * 0.9) {
                contador.style.color = 'var(--color-warning)';
            } else if (longitud > LIMITES.NOMBRE_REGION * 0.95) {
                contador.style.color = 'var(--color-danger)';
            } else {
                contador.style.color = 'var(--color-accent-primary)';
            }
        }
    }

    // ========== VALIDACIÓN Y GUARDADO ==========
    _validarYGuardar() {
        // Validar nombre
        const nombreInput = document.getElementById('nombreRegion');
        const nombre = nombreInput.value.trim();

        if (!nombre) {
            nombreInput.classList.add('is-invalid');
            this._mostrarError('El nombre de la región es obligatorio');
            return;
        }

        if (nombre.length < 3) {
            nombreInput.classList.add('is-invalid');
            this._mostrarError('El nombre debe tener al menos 3 caracteres');
            return;
        }

        if (nombre.length > LIMITES.NOMBRE_REGION) {
            nombreInput.classList.add('is-invalid');
            this._mostrarError(`El nombre no puede exceder ${LIMITES.NOMBRE_REGION} caracteres`);
            return;
        }

        nombreInput.classList.remove('is-invalid');

        // Obtener datos
        const datos = this._obtenerDatosFormulario();

        // Guardar
        this._guardarRegion(datos);
    }

    _obtenerDatosFormulario() {
        const nombre = document.getElementById('nombreRegion').value.trim();
        const color = document.getElementById('colorRegion')?.value || '#2f8cff';

        return {
            nombre: nombre,
            color: color,
            organizacion: this.usuarioActual.organizacion,
            organizacionCamelCase: this.usuarioActual.organizacionCamelCase
        };
    }

    async _guardarRegion(datos) {
        const btnCrear = document.getElementById('registerBtn');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check"></i>Crear Región';

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                btnCrear.disabled = true;
            }

            // Mostrar loading
            Swal.fire({
                title: 'Creando región...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Crear región
            const resultado = await this.regionManager.createRegion(
                datos,
                this.usuarioActual.organizacionCamelCase,
                {
                    id: this.usuarioActual.id,
                    email: this.usuarioActual.correo,
                    nombre: this.usuarioActual.nombreCompleto
                }
            );

            Swal.close();

            // ✅ NUEVO: Registrar creación en bitácora
            if (resultado && resultado.id) {
                await this._registrarCreacionRegion(resultado, datos);
            }

            // Mostrar éxito
            await Swal.fire({
                icon: 'success',
                title: '¡Región creada!',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Nombre:</strong> ${datos.nombre}</p>
                        <p><strong>Color:</strong> 
                            <span style="display:inline-block; width:20px; height:20px; background:${datos.color}; border-radius:4px; margin-right:8px; vertical-align:middle;"></span>
                            ${datos.color}
                        </p>
                    </div>
                `,
                confirmButtonText: 'Ver regiones'
            });

            this._volverALista();

        } catch (error) {
            console.error('Error guardando región:', error);
            Swal.close();
            this._mostrarError(error.message || 'No se pudo crear la región');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    // ========== NAVEGACIÓN ==========
    _volverALista() {
        window.location.href = '../regiones/regiones.html';
    }

    _cancelarCreacion() {
        Swal.fire({
            title: '¿Cancelar?',
            text: 'Los cambios no guardados se perderán',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar'
        }).then((result) => {
            if (result.isConfirmed) {
                this._volverALista();
            }
        });
    }

    // ========== UTILIDADES ==========
    _mostrarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: mensaje,
            confirmButtonText: 'Entendido'
        });
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    new CrearRegionController();
});