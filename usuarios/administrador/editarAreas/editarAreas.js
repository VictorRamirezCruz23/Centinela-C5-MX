// editarAreas.js - VERSIÓN CORREGIDA CON DATOS REALES DE ORGANIZACIÓN
// SweetAlerts sin estilos personalizados

window.editarAreaDebug = {
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
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(iniciarAplicacion, 100);
            });
        } else {
            setTimeout(iniciarAplicacion, 100);
        }
        
    } catch (error) {
        console.error('[Error]', error.message);
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
    try {
        const app = new EditarAreaController();
        window.editarAreaDebug.controller = app;
        app.init();
    } catch (error) {
        console.error('[Error]', error.message);
        mostrarErrorInterfaz(error.message);
    }
}

class EditarAreaController {
    constructor() {
        // Cargar datos reales de organización desde localStorage
        const orgData = this._cargarDatosOrganizacion();
        
        this.areaManager = new AreaManager();
        
        // Configurar userManager con los datos reales de organización
        this.userManager = {
            currentUser: {
                id: orgData.userId || 'usuario_temp',
                nombreCompleto: orgData.nombreUsuario || 'Usuario',
                organizacion: orgData.organizacionNombre,
                organizacionCamelCase: orgData.organizacionCamelCase
            }
        };
        
        this.areaActual = null;
        this.datosOriginales = null;
        this.loadingOverlay = null;
        this.cargos = [];
        this._inputHandler = null;
        this._submitHandler = null;
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
            console.error('Error cargando datos de organización:', error);
            return {
                organizacionNombre: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion',
                userId: 'usuario_temp',
                nombreUsuario: 'Usuario'
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
        this.cargarArea();
        this.aplicarLimitesCaracteres();
        
        // Mostrar en consola la colección que se está usando (para debugging)
        console.log(`📁 Editando área en colección: areas_${this.userManager.currentUser.organizacionCamelCase}`);
    }
    
    aplicarLimitesCaracteres() {
        const nombreArea = document.getElementById('nombreArea');
        if (nombreArea) {
            nombreArea.maxLength = LIMITES.NOMBRE_AREA;
            nombreArea.addEventListener('input', () => this.validarLongitudCampo(nombreArea, LIMITES.NOMBRE_AREA, 'El nombre del área'));
        }
        
        const descripcionArea = document.getElementById('descripcionArea');
        if (descripcionArea) {
            descripcionArea.maxLength = LIMITES.DESCRIPCION_AREA;
            descripcionArea.addEventListener('input', () => this.validarLongitudCampo(descripcionArea, LIMITES.DESCRIPCION_AREA, 'La descripción'));
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
        if (nombre.length > LIMITES.NOMBRE_CARGO) {
            this.mostrarNotificacion(`El nombre del cargo no puede exceder ${LIMITES.NOMBRE_CARGO} caracteres`, 'warning', 3000);
            return false;
        }
        if (descripcion.length > LIMITES.DESCRIPCION_CARGO) {
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
            if (this._inputHandler) {
                descripcionArea.removeEventListener('input', this._inputHandler);
            }
            this._inputHandler = () => this.actualizarContadorCaracteres();
            descripcionArea.addEventListener('input', this._inputHandler);
        }
        
        const btnCancelar = document.getElementById('btnCancelar');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => this.cancelarEdicion());
        }
        
        const btnAgregarCargo = document.getElementById('btnAgregarCargo');
        if (btnAgregarCargo) {
            btnAgregarCargo.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.agregarCargo();
            });
        }
        
        const formEditarArea = document.getElementById('formEditarArea');
        if (formEditarArea) {
            if (this._submitHandler) {
                formEditarArea.removeEventListener('submit', this._submitHandler);
            }
            this._submitHandler = (e) => {
                e.preventDefault();
                this.validarYPrepararGuardado();
            };
            formEditarArea.addEventListener('submit', this._submitHandler);
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
            
            if (longitud > LIMITES.DESCRIPCION_AREA * 0.9) {
                contador.style.color = 'var(--color-warning)';
            } else if (longitud > LIMITES.DESCRIPCION_AREA * 0.95) {
                contador.style.color = 'var(--color-danger)';
            } else {
                contador.style.color = 'var(--color-accent-primary)';
            }
        }
    }
    
    async cargarArea() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const areaId = urlParams.get('id');
            
            if (!areaId) {
                this.mostrarError('No se especificó qué área editar');
                setTimeout(() => this.volverALista(), 2000);
                return;
            }
            
            console.log(`🔍 Buscando área ${areaId} en colección: areas_${this.userManager.currentUser.organizacionCamelCase}`);
            
            const area = await this.areaManager.getAreaById(
                areaId, 
                this.userManager.currentUser.organizacionCamelCase
            );
            
            if (area) {
                this.areaActual = area;
                this.cargarDatosEnFormulario();
                this.datosOriginales = this.obtenerDatosFormulario();
                this.ocultarCargando();
                
                document.title = `Editar ${this.areaActual.nombreArea} - Sistema Centinela`;
                
                const nombreTitulo = document.getElementById('nombreAreaTitulo');
                if (nombreTitulo) {
                    nombreTitulo.textContent = this.areaActual.nombreArea;
                }
            } else {
                this.ocultarCargando();
                this.mostrarError('Área no encontrada');
                setTimeout(() => this.volverALista(), 2000);
            }
            
        } catch (error) {
            this.ocultarCargando();
            console.error('Error cargando área:', error);
            this.mostrarError('Error cargando área');
            setTimeout(() => this.volverALista(), 2000);
        }
    }
    
    cargarDatosEnFormulario() {
        if (!this.areaActual) return;
        
        document.getElementById('areaId').value = this.areaActual.id;
        document.getElementById('nombreArea').value = this.areaActual.nombreArea || '';
        document.getElementById('descripcionArea').value = this.areaActual.descripcion || '';
        
        this.cargarResponsableActual();
        this.cargarCargosExistentes();
        this.actualizarContadorCaracteres();
    }
    
    async cargarResponsableActual() {
        const responsableSelect = document.getElementById('responsable');
        if (!responsableSelect) return;
        
        setTimeout(() => {
            if (this.areaActual.responsable) {
                let responsableAsignado = false;
                
                for (let i = 0; i < responsableSelect.options.length; i++) {
                    if (responsableSelect.options[i].value === this.areaActual.responsable) {
                        responsableSelect.selectedIndex = i;
                        responsableAsignado = true;
                        break;
                    }
                }
                
                if (!responsableAsignado) {
                    const option = document.createElement('option');
                    option.value = this.areaActual.responsable;
                    option.text = this.areaActual.responsableNombre || 'Responsable asignado';
                    option.selected = true;
                    responsableSelect.appendChild(option);
                }
            } else {
                for (let i = 0; i < responsableSelect.options.length; i++) {
                    if (responsableSelect.options[i].value === 'admin_temp') {
                        responsableSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }, 500);
    }
    
    inicializarGestionCargos() {}
    
    cargarCargosExistentes() {
        this.cargos = [];
        
        if (this.areaActual.cargos) {
            if (Array.isArray(this.areaActual.cargos)) {
                this.areaActual.cargos.forEach((cargo, index) => {
                    if (cargo?.nombre) {
                        this.cargos.push({
                            id: cargo.id || `cargo_${index}_${Date.now()}`,
                            nombre: cargo.nombre || '',
                            descripcion: cargo.descripcion || ''
                        });
                    }
                });
            } else if (typeof this.areaActual.cargos === 'object') {
                Object.keys(this.areaActual.cargos).forEach(key => {
                    const cargo = this.areaActual.cargos[key];
                    if (cargo?.nombre) {
                        this.cargos.push({
                            id: key,
                            nombre: cargo.nombre || '',
                            descripcion: cargo.descripcion || ''
                        });
                    }
                });
            }
        }
        
        this.renderizarCargos();
    }
    
    agregarCargo() {
        const cargoId = `cargo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        
        const nuevoCargo = {
            id: cargoId,
            nombre: '',
            descripcion: ''
        };
        
        this.cargos.push(nuevoCargo);
        this.renderizarCargos();
        
        setTimeout(() => {
            const input = document.getElementById(`cargo_nombre_${cargoId}`);
            if (input) input.focus();
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
                        <button type="button" class="btn-eliminar-cargo" onclick="window.editarAreaDebug.controller.eliminarCargo('${cargo.id}')">
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
                                       oninput="window.editarAreaDebug.controller.actualizarCargo('${cargo.id}', 'nombre', this.value)">
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
                                       oninput="window.editarAreaDebug.controller.actualizarCargo('${cargo.id}', 'descripcion', this.value)">
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
            this.mostrarError('Debe seleccionar un responsable');
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
        
        for (const cargo of cargosValidos) {
            if (!this.validarLongitudCargo(cargo.nombre, cargo.descripcion)) {
                return false;
            }
        }
        
        return true;
    }
    
    hayCambios() {
        if (!this.datosOriginales) return true;
        
        const datosActuales = this.obtenerDatosFormulario();
        
        if (datosActuales.nombreArea !== this.datosOriginales.nombreArea) return true;
        if (datosActuales.descripcion !== this.datosOriginales.descripcion) return true;
        
        const cargosActuales = JSON.stringify(datosActuales.cargos);
        const cargosOriginales = JSON.stringify(this.datosOriginales.cargos || []);
        if (cargosActuales !== cargosOriginales) return true;
        
        if (datosActuales.responsable !== this.datosOriginales.responsable) return true;
        
        return false;
    }
    
    async validarYPrepararGuardado() {
        try {
            if (!this.validarFormulario()) return;
            
            if (!this.hayCambios()) {
                this.mostrarNotificacion('No hay cambios para guardar', 'info');
                return;
            }
            
            const datosActualizados = this.obtenerDatosFormulario();
            
            const result = await Swal.fire({
                title: '¿Guardar cambios?',
                text: '¿Está seguro de guardar los cambios realizados?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, guardar',
                cancelButtonText: 'Cancelar'
            });
            
            if (result.isConfirmed) {
                await this.confirmarGuardado(datosActualizados);
            }
            
        } catch (error) {
            this.mostrarError('Error validando datos');
        }
    }
    
    obtenerDatosFormulario() {
        const cargosValidos = this.cargos.filter(c => c.nombre && c.nombre.trim() !== '');
        
        const cargosObject = {};
        cargosValidos.forEach(cargo => {
            cargosObject[cargo.id] = {
                nombre: cargo.nombre.trim(),
                descripcion: cargo.descripcion ? cargo.descripcion.trim() : ''
            };
        });
        
        const responsableSelect = document.getElementById('responsable');
        let responsableId = '';
        let responsableNombre = '';
        
        if (responsableSelect && responsableSelect.value && 
            !responsableSelect.value.includes('──────────') && 
            responsableSelect.value !== 'nuevo') {
            responsableId = responsableSelect.value;
            responsableNombre = responsableSelect.options[responsableSelect.selectedIndex]?.text || '';
        }
        
        return {
            nombreArea: document.getElementById('nombreArea').value.trim(),
            descripcion: document.getElementById('descripcionArea').value.trim(),
            cargos: cargosObject,
            responsable: responsableId,
            responsableNombre: responsableNombre
        };
    }
    
    async confirmarGuardado(datosActualizados) {
        try {
            if (!this.areaActual) {
                throw new Error('No hay área para actualizar');
            }
            
            this.mostrarCargando('Guardando cambios...');
            
            console.log(`💾 Guardando cambios en colección: areas_${this.userManager.currentUser.organizacionCamelCase}`);
            
            await this.areaManager.actualizarArea(
                this.areaActual.id,
                datosActualizados,
                this.userManager.currentUser.id,
                this.userManager.currentUser.organizacionCamelCase,
                this.userManager.currentUser
            );
            
            this.ocultarCargando();
            
            Object.assign(this.areaActual, datosActualizados);
            this.datosOriginales = this.obtenerDatosFormulario();
            
            await Swal.fire({
                icon: 'success',
                title: '¡Guardado!',
                html: `Cambios guardados correctamente en:<br><strong>areas_${this.userManager.currentUser.organizacionCamelCase}</strong>`,
                timer: 2500,
                showConfirmButton: false
            });
            
            setTimeout(() => this.volverALista(), 2600);
            
        } catch (error) {
            this.ocultarCargando();
            console.error('Error guardando:', error);
            this.mostrarError('Error actualizando área: ' + error.message);
        }
    }
    
    volverALista() {
        window.location.href = '../areas/areas.html';
    }
    
    cancelarEdicion() {
        if (this.hayCambios()) {
            Swal.fire({
                title: '¿Cancelar edición?',
                text: "Los cambios no guardados se perderán",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, cancelar',
                cancelButtonText: 'No, continuar'
            }).then((result) => {
                if (result.isConfirmed) this.volverALista();
            });
        } else {
            this.volverALista();
        }
    }
    
    mostrarCargando(mensaje = 'Guardando...') {
        if (this.loadingOverlay) this.ocultarCargando();

        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            flex-direction: column;
        `;

        overlay.innerHTML = `
            <div class="spinner-border text-light mb-3" style="width: 3rem; height: 3rem;" role="status">
                <span class="visually-hidden">${mensaje}</span>
            </div>
            <div class="text-light fs-5">${mensaje}</div>
        `;

        document.body.appendChild(overlay);
        this.loadingOverlay = overlay;
    }
    
    ocultarCargando() {
        if (this.loadingOverlay?.parentNode) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
    
    mostrarError(mensaje) {
        this.mostrarNotificacion(mensaje, 'error');
    }
    
    mostrarNotificacion(mensaje, tipo = 'info', duracion = 3000) {
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