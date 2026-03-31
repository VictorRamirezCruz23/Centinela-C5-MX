// crearAreas.js - VERSIÓN CORREGIDA CON COLECCIÓN DINÁMICA COMO CATEGORIAS
// SweetAlerts sin estilos personalizados
// SIN PANTALLA DE CARGA "CREANDO..."

console.clear();
console.log('inicializado');

window.crearAreaDebug = {
    estado: 'iniciando',
    controller: null
};

let Area, AreaManager;

// LÍMITES DE CARACTERES
const LIMITES = {
    NOMBRE_AREA: 50,
    DESCRIPCION_AREA: 500,
    NOMBRE_CARGO: 50,
    DESCRIPCION_CARGO: 200
};

async function cargarDependencias() {
    try {
        const areaModule = await import('/clases/area.js');
        Area = areaModule.Area;
        AreaManager = areaModule.AreaManager;

        iniciarAplicacion();

    } catch (error) {
        mostrarErrorInterfaz(error.message);
    }
}

function mostrarErrorInterfaz(mensaje) {
    const container = document.querySelector('.centinela-container') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-carga';
    errorDiv.innerHTML = `
        <h4><i class="fas fa-exclamation-triangle"></i> Error de Carga</h4>
        <p>${mensaje}</p>
    `;
    container.prepend(errorDiv);
}

function iniciarAplicacion() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarController);
    } else {
        inicializarController();
    }
}

function inicializarController() {
    try {
        const app = new CrearAreaController();
        window.crearAreaDebug.controller = app;
        app.init();
    } catch (error) {
        mostrarErrorInterfaz(error.message);
    }
}

class CrearAreaController {
    constructor() {
        // Primero cargar datos de organización desde localStorage como en categoria.js
        const orgData = this._cargarDatosOrganizacion();

        this.areaManager = new AreaManager();

        // Configurar userManager con los datos de organización
        this.userManager = {
            currentUser: {
                id: orgData.userId || 'admin_temp',
                nombreCompleto: orgData.nombreUsuario || 'Administrador',
                organizacion: orgData.organizacionNombre,
                organizacionCamelCase: orgData.organizacionCamelCase
            }
        };

        this.areaEnProceso = null;
        this.areaCreadaReciente = null;
        this.cargos = [];
    }

    /**
     * Cargar datos de organización desde localStorage (igual que en categoria.js)
     */
    _cargarDatosOrganizacion() {
        try {
            // Intentar cargar desde adminInfo (admin)
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                return {
                    organizacionNombre: adminData.organizacion || 'Mi Organización',
                    organizacionCamelCase: adminData.organizacionCamelCase || this._generarCamelCase(adminData.organizacion),
                    userId: adminData.id,
                    nombreUsuario: adminData.nombreCompleto
                };
            }

            // Intentar cargar desde userData (usuario normal)
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const orgNombre = userData.organizacion || userData.empresa || 'Mi Organización';

            return {
                organizacionNombre: orgNombre,
                organizacionCamelCase: userData.organizacionCamelCase || this._generarCamelCase(orgNombre),
                userId: userData.id,
                nombreUsuario: userData.nombreCompleto || userData.nombre || 'Usuario'
            };

        } catch (error) {
            return {
                organizacionNombre: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion',
                userId: 'admin_temp',
                nombreUsuario: 'Administrador'
            };
        }
    }

    /**
     * Generar camelCase a partir de texto (igual que en categoria.js)
     */
    _generarCamelCase(texto) {
        if (!texto || typeof texto !== 'string') return 'miOrganizacion';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
            .replace(/[^a-zA-Z0-9]/g, '');
    }

    async cargarResponsables() {
        const responsableSelect = document.getElementById('responsable');
        if (!responsableSelect) return;

        try {
            responsableSelect.innerHTML = '<option value="">Seleccionar responsable...</option>';

            // Opción del administrador actual
            const adminOption = document.createElement('option');
            adminOption.value = 'admin_temp';
            adminOption.text = `${this.userManager.currentUser.nombreCompleto} (Administrador)`;
            adminOption.selected = true;
            adminOption.style.fontWeight = 'bold';
            responsableSelect.appendChild(adminOption);

            const otroSeparator = document.createElement('option');
            otroSeparator.disabled = true;
            otroSeparator.text = '────────── OTRAS OPCIONES ──────────';
            responsableSelect.appendChild(otroSeparator);

            const nuevoOption = document.createElement('option');
            nuevoOption.value = 'nuevo';
            nuevoOption.text = '🆕 Asignar nuevo responsable...';
            responsableSelect.appendChild(nuevoOption);

        } catch (error) {
            this.mostrarNotificacion('Error cargando responsables', 'warning');
        }
    }

    init() {
        this.inicializarEventos();
        this.inicializarValidaciones();
        this.cargarResponsables();
        this.inicializarGestionCargos();

        // Aplicar límites de caracteres a los campos
        this.aplicarLimitesCaracteres();
    }

    aplicarLimitesCaracteres() {
        // Campo nombre área
        const nombreArea = document.getElementById('nombreArea');
        if (nombreArea) {
            nombreArea.maxLength = LIMITES.NOMBRE_AREA;
            nombreArea.addEventListener('input', () => this.validarLongitudCampo(nombreArea, LIMITES.NOMBRE_AREA, 'El nombre del área'));
        }

        // Campo descripción área
        const descripcionArea = document.getElementById('descripcionArea');
        if (descripcionArea) {
            descripcionArea.maxLength = LIMITES.DESCRIPCION_AREA;
            descripcionArea.addEventListener('input', () => {
                this.validarLongitudCampo(descripcionArea, LIMITES.DESCRIPCION_AREA, 'La descripción');
                this.actualizarContadorCaracteres();
            });
        }
    }

    validarLongitudCampo(campo, limite, nombreCampo) {
        const longitud = campo.value.length;
        if (longitud > limite) {
            campo.value = campo.value.substring(0, limite);
            this.mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
        }
    }

    validarLongitudCargo(nombre, descripcion) {
        if (nombre && nombre.length > LIMITES.NOMBRE_CARGO) {
            this.mostrarNotificacion(`El nombre del cargo no puede exceder ${LIMITES.NOMBRE_CARGO} caracteres`, 'warning', 3000);
            return false;
        }
        if (descripcion && descripcion.length > LIMITES.DESCRIPCION_CARGO) {
            this.mostrarNotificacion(`La descripción del cargo no puede exceder ${LIMITES.DESCRIPCION_CARGO} caracteres`, 'warning', 3000);
            return false;
        }
        return true;
    }

    inicializarEventos() {
        const btnVolverLista = document.getElementById('btnVolverLista');
        if (btnVolverLista) {
            btnVolverLista.addEventListener('click', () => this.volverALista());
        }

        const descripcionArea = document.getElementById('descripcionArea');
        if (descripcionArea) {
            descripcionArea.addEventListener('input', () => this.actualizarContadorCaracteres());
        }

        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelarCreacion());
        }

        const formCrearArea = document.getElementById('formCrearArea');
        if (formCrearArea) {
            formCrearArea.addEventListener('submit', (e) => {
                e.preventDefault();
                this.validarYPrepararCreacion();
            });
        }
    }

    inicializarValidaciones() {
        this.actualizarContadorCaracteres();
    }

    actualizarContadorCaracteres() {
        const descripcionArea = document.getElementById('descripcionArea');
        const contador = document.getElementById('contadorCaracteres');

        if (descripcionArea && contador) {
            const longitud = descripcionArea.value.length;
            contador.textContent = `${longitud}/${LIMITES.DESCRIPCION_AREA}`;

            // Cambiar color si se acerca al límite
            if (longitud > LIMITES.DESCRIPCION_AREA * 0.9) {
                contador.style.color = 'var(--color-warning)';
            } else if (longitud > LIMITES.DESCRIPCION_AREA * 0.95) {
                contador.style.color = 'var(--color-danger)';
            } else {
                contador.style.color = 'var(--color-accent-primary)';
            }
        }
    }

    volverALista() {
        window.location.href = '../areas/areas.html';
    }

    cancelarCreacion() {
        Swal.fire({
            title: '¿Cancelar registro?',
            text: "Se perderán todos los datos ingresados",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No, continuar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.volverALista();
            }
        });
    }

    validarFormulario() {
        const nombreArea = document.getElementById('nombreArea')?.value.trim();
        const descripcion = document.getElementById('descripcionArea')?.value.trim();
        const responsableSelect = document.getElementById('responsable');

        if (!nombreArea) {
            this.mostrarError('El nombre del área es requerido');
            return false;
        }

        if (nombreArea.length > LIMITES.NOMBRE_AREA) {
            this.mostrarError(`El nombre del área no puede exceder ${LIMITES.NOMBRE_AREA} caracteres`);
            return false;
        }

        if (!descripcion) {
            this.mostrarError('La descripción es requerida');
            return false;
        }

        if (descripcion.length < 20) {
            this.mostrarError('La descripción debe tener al menos 20 caracteres');
            return false;
        }

        if (descripcion.length > LIMITES.DESCRIPCION_AREA) {
            this.mostrarError(`La descripción no puede exceder ${LIMITES.DESCRIPCION_AREA} caracteres`);
            return false;
        }

        if (nombreArea.length < 3) {
            this.mostrarError('El nombre del área debe tener al menos 3 caracteres');
            return false;
        }

        if (responsableSelect && !responsableSelect.value) {
            this.mostrarError('Debe seleccionar un responsable para el área');
            return false;
        }

        if (responsableSelect &&
            (responsableSelect.value.includes('──────────') ||
                responsableSelect.value === 'nuevo')) {
            this.mostrarError('Debe seleccionar un responsable válido');
            return false;
        }

        const cargosValidos = this.cargos.filter(c => c.nombre && c.nombre.trim() !== '');
        if (cargosValidos.length === 0) {
            this.mostrarError('Debe agregar al menos un cargo con nombre');
            return false;
        }

        // Validar límites de caracteres de los cargos
        for (const cargo of cargosValidos) {
            if (!this.validarLongitudCargo(cargo.nombre, cargo.descripcion)) {
                return false;
            }
        }

        return true;
    }

    async validarYPrepararCreacion() {
        try {
            if (!this.validarFormulario()) return;

            const datosArea = this.obtenerDatosFormulario();

            // Verificar si el área ya existe en la colección específica de la organización
            const existe = await this.areaManager.verificarAreaExistente(
                datosArea.nombreArea,
                this.userManager.currentUser.organizacionCamelCase
            );

            if (existe) {
                this.mostrarError('Ya existe un área con ese nombre en esta organización');
                return;
            }

            this.areaEnProceso = datosArea;

            const result = await Swal.fire({
                title: '¿Confirmar creación?',
                text: '¿Está seguro de crear esta área?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, crear',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                await this.confirmarCreacion();
            }

        } catch (error) {
            this.mostrarError('Error validando datos');
        }
    }

    inicializarGestionCargos() {
        const btnAgregarCargo = document.getElementById('btnAgregarCargo');
        if (btnAgregarCargo) {
            btnAgregarCargo.addEventListener('click', () => this.agregarCargo());
        }
    }

    agregarCargo() {
        const cargoId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

        const nuevoCargo = {
            id: cargoId,
            nombre: '',
            descripcion: ''
        };

        this.cargos.push(nuevoCargo);
        this.renderizarCargos();

        setTimeout(() => {
            const input = document.getElementById(`cargo_nombre_${cargoId}`);
            if (input) {
                input.focus();
                input.maxLength = LIMITES.NOMBRE_CARGO;
            }
        }, 100);
    }

    eliminarCargo(cargoId) {
        Swal.fire({
            title: '¿Eliminar cargo?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.cargos = this.cargos.filter(c => c.id !== cargoId);
                this.renderizarCargos();
                this.mostrarNotificacion('Cargo eliminado', 'success');
            }
        });
    }

    renderizarCargos() {
        const cargosList = document.getElementById('cargosList');
        if (!cargosList) return;

        if (this.cargos.length === 0) {
            cargosList.innerHTML = `
                <div class="cargos-empty">
                    <i class="fas fa-briefcase mb-2"></i>
                    <p>No hay cargos agregados</p>
                    <small>Haga clic en "Agregar Cargo" para añadir uno</small>
                </div>
            `;
            return;
        }

        let html = '';
        this.cargos.forEach((cargo, index) => {
            html += `
                <div class="cargo-item" id="cargo_${cargo.id}">
                    <div class="cargo-header">
                        <h6 class="cargo-titulo">
                            <i class="fas fa-briefcase me-2"></i>
                            Cargo #${index + 1}
                        </h6>
                        <button type="button" class="btn-eliminar-cargo" onclick="window.crearAreaDebug.controller.eliminarCargo('${cargo.id}')">
                            <i class="fas fa-trash-alt me-1"></i>
                            Eliminar
                        </button>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; margin: 0 -10px;">
                        <div style="width: 50%; padding: 0 10px; box-sizing: border-box;">
                            <label class="form-label">Nombre del Cargo *</label>
                            <div class="input-group">
                                <input type="text" class="form-control" 
                                       id="cargo_nombre_${cargo.id}"
                                       value="${this.escapeHTML(cargo.nombre)}"
                                       placeholder="Ej: Gerente, Analista, Coordinador"
                                       maxlength="${LIMITES.NOMBRE_CARGO}"
                                       oninput="window.crearAreaDebug.controller.actualizarCargo('${cargo.id}', 'nombre', this.value)">
                            </div>
                            <div class="char-limit-info">
                                <span class="char-counter">${cargo.nombre?.length || 0}/${LIMITES.NOMBRE_CARGO}</span>
                            </div>
                        </div>
                        <div style="width: 50%; padding: 0 10px; box-sizing: border-box;">
                            <label class="form-label">Descripción del Cargo</label>
                            <div class="input-group">
                                <input type="text" class="form-control" 
                                       id="cargo_descripcion_${cargo.id}"
                                       value="${this.escapeHTML(cargo.descripcion)}"
                                       placeholder="Responsabilidades principales"
                                       maxlength="${LIMITES.DESCRIPCION_CARGO}"
                                       oninput="window.crearAreaDebug.controller.actualizarCargo('${cargo.id}', 'descripcion', this.value)">
                            </div>
                            <div class="char-limit-info">
                                <span class="char-counter">${cargo.descripcion?.length || 0}/${LIMITES.DESCRIPCION_CARGO}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        cargosList.innerHTML = html;
    }

    actualizarCargo(cargoId, campo, valor) {
        const cargo = this.cargos.find(c => c.id === cargoId);
        if (cargo) {
            // Validar límites de caracteres
            if (campo === 'nombre' && valor.length > LIMITES.NOMBRE_CARGO) {
                valor = valor.substring(0, LIMITES.NOMBRE_CARGO);
                this.mostrarNotificacion(`El nombre no puede exceder ${LIMITES.NOMBRE_CARGO} caracteres`, 'warning', 3000);
            }
            if (campo === 'descripcion' && valor.length > LIMITES.DESCRIPCION_CARGO) {
                valor = valor.substring(0, LIMITES.DESCRIPCION_CARGO);
                this.mostrarNotificacion(`La descripción no puede exceder ${LIMITES.DESCRIPCION_CARGO} caracteres`, 'warning', 3000);
            }
            cargo[campo] = valor;
        }
    }

    escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    obtenerDatosFormulario() {
        const userOrgCamel = this.userManager.currentUser.organizacionCamelCase;

        const cargosArray = this.cargos
            .filter(c => c.nombre && c.nombre.trim() !== '')
            .map(c => ({
                nombre: c.nombre.trim(),
                descripcion: c.descripcion ? c.descripcion.trim() : ''
            }));

        const cargosObject = {};
        cargosArray.forEach((cargo, index) => {
            cargosObject[`cargo_${index}`] = cargo;
        });

        return {
            nombreArea: document.getElementById('nombreArea').value.trim(),
            descripcion: document.getElementById('descripcionArea').value.trim(),
            cargos: cargosObject,
            organizacionCamelCase: userOrgCamel,
            responsable: 'admin_temp',
            responsableNombre: this.userManager.currentUser.nombreCompleto
        };
    }

    async confirmarCreacion() {
        try {
            if (!this.areaEnProceso) {
                throw new Error('No hay datos de área para crear');
            }

            // Crear área sin mostrar pantalla de carga
            const nuevaArea = await this.areaManager.crearArea(this.areaEnProceso, this.userManager);

            this.areaCreadaReciente = nuevaArea;

            // MENSAJE SIMPLIFICADO
            await Swal.fire({
                icon: 'success',
                title: '¡Área creada!',
                text: `Área guardada en: areas_${this.userManager.currentUser.organizacionCamelCase}`,
                timer: 2000,
                showConfirmButton: false
            });

            // Preguntar qué hacer después
            const result = await Swal.fire({
                title: '¿Qué desea hacer?',
                icon: 'question',
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: 'Ver lista',
                denyButtonText: 'Crear otra',
                cancelButtonText: 'Cancelar'
            });

            if (result.isConfirmed) {
                this.verAreaCreada();
            } else if (result.isDenied) {
                this.crearOtraArea();
            }

        } catch (error) {
            this.mostrarError('Error creando área: ' + error.message);
        }
    }

    crearOtraArea() {
        this.limpiarFormulario();

        setTimeout(() => {
            const nombreArea = document.getElementById('nombreArea');
            if (nombreArea) nombreArea.focus();
        }, 100);
    }

    verAreaCreada() {
        window.location.href = '../areas/areas.html';
    }

    limpiarFormulario() {
        const form = document.getElementById('formCrearArea');
        if (form) form.reset();

        this.cargos = [];
        this.renderizarCargos();

        const responsableSelect = document.getElementById('responsable');
        if (responsableSelect) {
            for (let i = 0; i < responsableSelect.options.length; i++) {
                if (responsableSelect.options[i].value === 'admin_temp') {
                    responsableSelect.selectedIndex = i;
                    break;
                }
            }
        }

        this.actualizarContadorCaracteres();
        this.areaEnProceso = null;
    }

    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'error');
    }

    mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
        Swal.fire({
            title: tipo === 'success' ? 'Éxito' :
                tipo === 'error' ? 'Error' :
                    tipo === 'warning' ? 'Advertencia' : 'Información',
            text: mensaje,
            icon: tipo,
            timer: duracion,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }
}

cargarDependencias();