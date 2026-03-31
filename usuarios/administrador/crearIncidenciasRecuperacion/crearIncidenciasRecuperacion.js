// crearIncidenciasRecuperacion.js - CONTROLADOR COMPLETO
// VERSIÓN OPTIMIZADA CON VISTA PREVIA DE PDF QUE SE SUBA DIRECTAMENTE
// SIN DEPENDENCIA DE manejadorPDFSegundoPlano.js

const LIMITES = {
    NARRACION_EVENTOS: 2000,
    DETALLES_PERDIDA: 1000
};

class CrearMercanciaPerdidaController {
    constructor() {
        this.mercanciaManager = null;
        this.usuarioActual = null;
        this.empresas = [];
        this.imagenesSeleccionadas = [];
        this.imageEditorModal = null;
        this.loadingOverlay = null;
        this.flatpickrInstance = null;
        this.historialManager = null;
        
        this.pdfGenerator = null;
        this.isInitialized = false;
        
        // Para vista previa de PDF
        this.pdfPreviewModal = null;
        this.pdfBlobGenerado = null;
        this.datosActuales = null;

        this._init();
    }

    async _initHistorialManager() {
        if (!this.historialManager) {
            try {
                const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
                this.historialManager = new HistorialUsuarioManager();
            } catch (error) {
                console.error('Error inicializando historialManager:', error);
            }
        }
        return this.historialManager;
    }

    async _initPDFGenerator() {
        if (!this.pdfGenerator) {
            try {
                const { generadorMercanciaPDF } = await import('/components/mercanciaPDF.js');
                this.pdfGenerator = generadorMercanciaPDF;
                console.log('✅ PDFGenerator inicializado correctamente');
                return true;
            } catch (error) {
                console.error('Error inicializando PDFGenerator:', error);
                return false;
            }
        }
        return true;
    }
    
    // =============================================
    // INICIALIZAR MODAL DE VISTA PREVIA PDF
    // =============================================
    _initPDFPreviewModal() {
        if (document.getElementById('pdfPreviewModal')) return;
        
        const modalHTML = `
            <div id="pdfPreviewModal" class="pdf-preview-modal">
                <div class="pdf-preview-header">
                    <h3><i class="fas fa-file-pdf"></i> Vista Previa del Reporte</h3>
                    <button class="pdf-preview-btn pdf-close-btn" id="pdfCloseBtn" title="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="pdf-preview-content">
                    <div class="pdf-preview-loading" id="pdfPreviewLoading">
                        <div class="spinner"></div>
                        <p>Generando vista previa del reporte...</p>
                        <p class="small">Esto puede tomar unos segundos dependiendo de las imágenes</p>
                    </div>
                    <iframe id="pdfPreviewIframe" class="pdf-preview-iframe" style="display: none;"></iframe>
                </div>
                <div class="pdf-preview-footer">
                    <button class="btn btn-secondary" id="pdfCancelBtn">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                    <button class="btn btn-success" id="pdfAcceptBtn">
                        <i class="fas fa-check-circle"></i> Aceptar
                    </button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Agregar estilos del modal
        this._addPDFPreviewStyles();
        
        // Referencias
        this.pdfPreviewModal = document.getElementById('pdfPreviewModal');
        this.pdfPreviewIframe = document.getElementById('pdfPreviewIframe');
        this.pdfPreviewLoading = document.getElementById('pdfPreviewLoading');
        
        // Event listeners
        document.getElementById('pdfCloseBtn').addEventListener('click', () => this._closePDFPreview());
        document.getElementById('pdfCancelBtn').addEventListener('click', () => this._closePDFPreview());
        document.getElementById('pdfAcceptBtn').addEventListener('click', () => this._acceptAndUpload());
        
        // Cerrar al hacer click fuera
        this.pdfPreviewModal.addEventListener('click', (e) => {
            if (e.target === this.pdfPreviewModal) {
                this._closePDFPreview();
            }
        });
        
        // Escapar con ESC
        document.addEventListener('keydown', (e) => {
            if (this.pdfPreviewModal && this.pdfPreviewModal.style.display === 'flex' && e.key === 'Escape') {
                this._closePDFPreview();
            }
        });
    }
    
    _addPDFPreviewStyles() {
        if (document.getElementById('pdfPreviewStyles')) return;
        
        const styles = `
            <style id="pdfPreviewStyles">
                .pdf-preview-modal {
                    display: none;
                    position: fixed;
                    z-index: 10000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.95);
                    flex-direction: column;
                    animation: pdfPreviewFadeIn 0.3s ease;
                }
                
                @keyframes pdfPreviewFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                .pdf-preview-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    background: linear-gradient(135deg, #1a3b5d 0%, #0f2a44 100%);
                    color: white;
                    border-bottom: 2px solid #c9a03d;
                }
                
                .pdf-preview-header h3 {
                    margin: 0;
                    font-size: 18px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .pdf-preview-header h3 i {
                    color: #e74c3c;
                }
                
                .pdf-preview-close-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    transition: all 0.3s ease;
                }
                
                .pdf-preview-close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }
                
                .pdf-preview-content {
                    flex: 1;
                    padding: 20px;
                    background: #1a1a1a;
                    position: relative;
                    min-height: 0;
                }
                
                .pdf-preview-iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }
                
                .pdf-preview-loading {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    color: white;
                }
                
                .pdf-preview-loading .spinner {
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-top-color: #c9a03d;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                }
                
                .pdf-preview-loading p {
                    margin: 10px 0;
                    font-size: 14px;
                }
                
                .pdf-preview-loading .small {
                    font-size: 12px;
                    color: #aaa;
                }
                
                .pdf-preview-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    padding: 16px 24px;
                    background: #2d2d2d;
                    border-top: 1px solid #444;
                }
                
                .pdf-preview-footer .btn {
                    padding: 10px 24px;
                    font-family: var(--font-family-secondary);
                    font-weight: 600;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    border: none;
                }
                
                .pdf-preview-footer .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .pdf-preview-footer .btn-secondary:hover {
                    background: #5a6268;
                    transform: translateY(-2px);
                }
                
                .pdf-preview-footer .btn-success {
                    background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
                    border: 1px solid #28a745;
                    color: white;
                }
                
                .pdf-preview-footer .btn-success:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                @media (max-width: 768px) {
                    .pdf-preview-header {
                        padding: 12px 16px;
                    }
                    .pdf-preview-header h3 {
                        font-size: 16px;
                    }
                    .pdf-preview-footer {
                        padding: 12px 16px;
                    }
                    .pdf-preview-footer .btn {
                        padding: 8px 16px;
                        font-size: 14px;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // =============================================
    // MOSTRAR VISTA PREVIA DEL PDF
    // =============================================
    async _mostrarVistaPreviaPDF(datos) {
        try {
            // Mostrar modal
            this.pdfPreviewModal.style.display = 'flex';
            this.pdfPreviewIframe.style.display = 'none';
            this.pdfPreviewLoading.style.display = 'block';
            
            // Guardar datos para después
            this.datosActuales = datos;
            
            // Crear un objeto de registro temporal para el PDF
            const registroTemporal = this._crearRegistroTemporal(datos);
            
            console.log('📄 Generando vista previa del PDF...');
            console.log('📸 Evidencias para vista previa:', registroTemporal.evidencias?.length || 0);
            
            // Generar PDF como blob
            const pdfBlob = await this.pdfGenerator.generarReporte(registroTemporal, {
                mostrarAlerta: false,
                returnBlob: true,
                diagnosticar: false
            });
            
            if (!pdfBlob || pdfBlob.size === 0) {
                throw new Error('El PDF generado está vacío');
            }
            
            console.log(`📦 PDF generado: ${(pdfBlob.size / 1024).toFixed(2)} KB`);
            
            // Guardar el blob para usarlo después
            this.pdfBlobGenerado = pdfBlob;
            
            // Crear URL para el iframe
            const pdfUrl = URL.createObjectURL(pdfBlob);
            
            // Mostrar en iframe
            this.pdfPreviewIframe.src = pdfUrl;
            this.pdfPreviewIframe.style.display = 'block';
            this.pdfPreviewLoading.style.display = 'none';
            
            console.log('✅ Vista previa PDF cargada correctamente');
            
        } catch (error) {
            console.error('❌ Error generando vista previa:', error);
            this._closePDFPreview();
            
            Swal.fire({
                icon: 'error',
                title: 'Error al generar vista previa',
                text: error.message || 'No se pudo generar la vista previa del reporte',
                footer: 'Por favor, verifica tu conexión y las imágenes seleccionadas.'
            });
        }
    }
    
    _crearRegistroTemporal(datos) {
        // Crear un objeto que simule la estructura de MercanciaPerdida
        const fechaObj = new Date(datos.fechaHora);
        
        // Procesar evidencias para el formato que espera el PDF
        const evidenciasProcesadas = datos.imagenes.map((img, index) => {
            return {
                id: `temp_${Date.now()}_${index}`,
                file: img.file,
                preview: img.preview,
                url: img.preview,
                comentario: img.comentario || '',
                elementos: img.elementos || [],
                generatedName: img.generatedName
            };
        });
        
        return {
            id: `PREVIEW_${Date.now()}`,
            nombreEmpresaCC: datos.nombreEmpresaCC,
            tipoEvento: datos.tipoEvento,
            montoPerdido: datos.montoPerdido,
            montoRecuperado: datos.montoRecuperado,
            fecha: fechaObj,
            hora: fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            narracionEventos: datos.narracionEventos,
            detallesPerdida: datos.detallesPerdida,
            reportadoPorNombre: this.usuarioActual.nombreCompleto,
            evidencias: evidenciasProcesadas,
            estado: 'activo',
            getMontoNeto: () => datos.montoPerdido - (datos.montoRecuperado || 0),
            getPorcentajeRecuperado: () => datos.montoPerdido > 0 ? ((datos.montoRecuperado || 0) / datos.montoPerdido) * 100 : 0,
            getEstadoTexto: () => 'Activo',
            getTipoEventoTexto: () => this._getTipoEventoTexto(datos.tipoEvento)
        };
    }
    
    _closePDFPreview() {
        if (this.pdfPreviewModal) {
            this.pdfPreviewModal.style.display = 'none';
            
            // Limpiar iframe
            if (this.pdfPreviewIframe) {
                this.pdfPreviewIframe.src = '';
                this.pdfPreviewIframe.style.display = 'none';
            }
            
            // Limpiar loading
            if (this.pdfPreviewLoading) {
                this.pdfPreviewLoading.style.display = 'block';
            }
            
            this.pdfPreviewLoading.style.display = 'block';
        }
    }
    
    async _downloadPreviewPDF() {
        if (this.pdfBlobGenerado) {
            const url = URL.createObjectURL(this.pdfBlobGenerado);
            const link = document.createElement('a');
            link.href = url;
            link.download = `preview_reporte_${Date.now()}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            
            Swal.fire({
                icon: 'success',
                title: 'Descarga iniciada',
                text: 'El reporte se está descargando',
                timer: 1500,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'No hay PDF generado',
                text: 'Por favor, espera a que se genere la vista previa',
                timer: 2000,
                showConfirmButton: false
            });
        }
    }
    
    async _acceptAndUpload() {
        // Cerrar modal
        this._closePDFPreview();
        
        // Verificar que tenemos el PDF generado
        if (!this.pdfBlobGenerado) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo generar el PDF. Por favor, intenta de nuevo.'
            });
            return;
        }
        
        // Guardar el registro con el PDF generado
        await this._guardarRegistroConPDF(this.datosActuales, this.pdfBlobGenerado);
    }
    
    // =============================================
    // MÉTODOS EXISTENTES
    // =============================================
    
    async _init() {
        try {
            this._cargarUsuario();

            if (!this.usuarioActual) {
                throw new Error('No se pudo cargar información del usuario');
            }

            console.log('👤 Usuario cargado:', this.usuarioActual);

            await this._inicializarManager();
            await this._cargarEmpresas();
            
            const pdfOk = await this._initPDFGenerator();
            
            if (!pdfOk) {
                console.warn('⚠️ PDFGenerator no disponible');
            }

            this._configurarOrganizacion();
            this._inicializarDateTimePicker();
            this._configurarEventos();
            this._inicializarValidaciones();
            this._configurarMontoPreview();

            this.imageEditorModal = new window.ImageEditorModal();
            this._initPDFPreviewModal();
            
            this.isInitialized = true;

        } catch (error) {
            console.error('Error inicializando:', error);
            this._mostrarError('Error al inicializar: ' + error.message);
        }
    }

    async _inicializarManager() {
        try {
            const { MercanciaPerdidaManager } = await import('/clases/mercanciaPerdida.js');
            this.mercanciaManager = new MercanciaPerdidaManager();
        } catch (error) {
            console.error('Error cargando MercanciaPerdidaManager:', error);
            throw error;
        }
    }

    _configurarOrganizacion() {
        const orgInput = document.getElementById('organization');
        if (orgInput) {
            orgInput.value = this.usuarioActual.organizacion;
        }
    }

    _inicializarDateTimePicker() {
        const fechaInput = document.getElementById('fechaHoraEvento');
        if (fechaInput && typeof flatpickr !== 'undefined') {
            try {
                const ahora = new Date();

                this.flatpickrInstance = flatpickr(fechaInput, {
                    enableTime: true,
                    dateFormat: "Y-m-d H:i",
                    time_24hr: true,
                    locale: "es",
                    defaultDate: ahora,
                    minuteIncrement: 1,
                    maxDate: ahora,
                    disableMobile: true,
                    onChange: function (selectedDates, dateStr, instance) {
                        if (selectedDates.length > 0) {
                            const selectedDate = selectedDates[0];
                            const now = new Date();
                            if (selectedDate > now) {
                                instance.setDate(now, true);
                                Swal.fire({
                                    icon: 'warning',
                                    title: 'Fecha no válida',
                                    text: 'No puedes seleccionar una fecha futura',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Error inicializando Flatpickr:', error);
                fechaInput.type = 'datetime-local';
                fechaInput.max = this._formatearFechaParaInput(new Date());
            }
        } else {
            console.warn('Flatpickr no está disponible, usando input nativo');
            const fechaInput = document.getElementById('fechaHoraEvento');
            if (fechaInput) {
                fechaInput.type = 'datetime-local';
                fechaInput.max = this._formatearFechaParaInput(new Date());
            }
        }
    }

    _formatearFechaParaInput(fecha) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        const hours = String(fecha.getHours()).padStart(2, '0');
        const minutes = String(fecha.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    async _cargarEmpresas() {
        try {
            const { SucursalManager } = await import('/clases/sucursal.js');
            const sucursalManager = new SucursalManager();

            const sucursales = await sucursalManager.getSucursalesByOrganizacion(
                this.usuarioActual.organizacionCamelCase
            );

            this.empresas = sucursales.map(s => s.nombre);
            this.empresas = [...new Set(this.empresas)];

        } catch (error) {
            console.error('Error cargando empresas:', error);
            this.empresas = [];
        }
    }

    _cargarUsuario() {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.usuarioActual = {
                    id: adminData.id || adminData.uid || `admin_${Date.now()}`,
                    uid: adminData.uid || adminData.id,
                    nombreCompleto: adminData.nombreCompleto || 'Administrador',
                    organizacion: adminData.organizacion || 'Sin organización',
                    organizacionCamelCase: adminData.organizacionCamelCase ||
                        this._generarCamelCase(adminData.organizacion),
                    correo: adminData.correoElectronico || '',
                    email: adminData.correoElectronico || ''
                };
                return;
            }

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

            this.usuarioActual = {
                id: `admin_${Date.now()}`,
                uid: `admin_${Date.now()}`,
                nombreCompleto: 'Administrador',
                organizacion: 'Mi Organización',
                organizacionCamelCase: 'miOrganizacion',
                correo: 'admin@centinela.com',
                email: 'admin@centinela.com'
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

    _inicializarValidaciones() {
        const narracionInput = document.getElementById('narracionEventos');
        if (narracionInput) {
            narracionInput.maxLength = LIMITES.NARRACION_EVENTOS;
            narracionInput.addEventListener('input', () => {
                this._validarLongitudCampo(narracionInput, LIMITES.NARRACION_EVENTOS, 'La narración');
                this._actualizarContador('narracionEventos', 'contadorNarracion', LIMITES.NARRACION_EVENTOS);
            });
        }

        const detallesInput = document.getElementById('detallesPerdida');
        if (detallesInput) {
            detallesInput.maxLength = LIMITES.DETALLES_PERDIDA;
            detallesInput.addEventListener('input', () => {
                this._validarLongitudCampo(detallesInput, LIMITES.DETALLES_PERDIDA, 'Los detalles');
                this._actualizarContador('detallesPerdida', 'contadorDetalles', LIMITES.DETALLES_PERDIDA);
            });
        }

        this._actualizarContador('narracionEventos', 'contadorNarracion', LIMITES.NARRACION_EVENTOS);
        this._actualizarContador('detallesPerdida', 'contadorDetalles', LIMITES.DETALLES_PERDIDA);
    }

    _actualizarContador(inputId, counterId, limite) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);

        if (input && counter) {
            const longitud = input.value.length;
            counter.textContent = `${longitud}/${limite}`;

            if (longitud > limite * 0.9) {
                counter.style.color = 'var(--color-warning)';
            } else if (longitud > limite * 0.95) {
                counter.style.color = 'var(--color-danger)';
            } else {
                counter.style.color = 'var(--color-accent-primary)';
            }
        }
    }

    _validarLongitudCampo(campo, limite, nombreCampo) {
        const longitud = campo.value.length;
        if (longitud > limite) {
            campo.value = campo.value.substring(0, limite);
            this._mostrarNotificacion(`${nombreCampo} no puede exceder ${limite} caracteres`, 'warning', 3000);
        }
    }

    _configurarMontoPreview() {
        const montoPerdido = document.getElementById('montoPerdido');
        const montoRecuperado = document.getElementById('montoRecuperado');
        const perdidoPreview = document.getElementById('montoPerdidoPreview');
        const recuperadoPreview = document.getElementById('montoRecuperadoPreview');

        if (montoPerdido && perdidoPreview) {
            montoPerdido.addEventListener('input', () => {
                const valor = parseFloat(montoPerdido.value) || 0;
                perdidoPreview.textContent = `$${valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
            });
        }

        if (montoRecuperado && recuperadoPreview) {
            montoRecuperado.addEventListener('input', () => {
                const valor = parseFloat(montoRecuperado.value) || 0;
                recuperadoPreview.textContent = `$${valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
            });
        }
    }

    _configurarEventos() {
        try {
            document.getElementById('btnVolverLista')?.addEventListener('click', () => this._volverALista());
            document.getElementById('btnCancelar')?.addEventListener('click', () => this._cancelarCreacion());

            document.getElementById('btnCrearRegistro')?.addEventListener('click', (e) => {
                e.preventDefault();
                this._validarYMostrarOpciones(); // Cambiado: ahora muestra opciones primero
            });

            document.getElementById('btnAgregarImagen')?.addEventListener('click', () => {
                document.getElementById('inputImagenes').click();
            });

            document.getElementById('inputImagenes')?.addEventListener('change', (e) => this._procesarImagenes(e.target.files));

            document.getElementById('formMercanciaPrincipal')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this._validarYMostrarOpciones(); // Cambiado: ahora muestra opciones primero
            });

            this._configurarSugerencias();

        } catch (error) {
            console.error('Error configurando eventos:', error);
        }
    }

    _configurarSugerencias() {
        const inputEmpresa = document.getElementById('nombreEmpresaCC');

        if (inputEmpresa) {
            inputEmpresa.addEventListener('input', (e) => {
                this._mostrarSugerenciasEmpresa(e.target.value);
            });

            inputEmpresa.addEventListener('blur', () => {
                setTimeout(() => {
                    document.getElementById('sugerenciasEmpresa').innerHTML = '';
                }, 200);
            });

            inputEmpresa.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    this._mostrarSugerenciasEmpresa(e.target.value);
                }
            });
        }
    }

    _mostrarSugerenciasEmpresa(termino) {
        const contenedor = document.getElementById('sugerenciasEmpresa');
        if (!contenedor) return;

        const terminoLower = termino.toLowerCase().trim();

        if (terminoLower.length === 0) {
            contenedor.innerHTML = '';
            return;
        }

        const sugerencias = this.empresas.filter(emp =>
            emp.toLowerCase().includes(terminoLower)
        ).slice(0, 8);

        if (sugerencias.length === 0) {
            contenedor.innerHTML = `
                <div class="sugerencias-lista">
                    <div class="sugerencia-vacia">
                        <i class="fas fa-store"></i>
                        <p>No se encontraron empresas</p>
                        <small>Puedes escribir el nombre manualmente</small>
                    </div>
                </div>
            `;
            return;
        }

        let html = '<div class="sugerencias-lista">';
        sugerencias.forEach(emp => {
            const seleccionada = document.getElementById('nombreEmpresaCC').value === emp;
            html += `
                <div class="sugerencia-item ${seleccionada ? 'seleccionada' : ''}" 
                     data-nombre="${this._escapeHTML(emp)}">
                    <div class="sugerencia-icono">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="sugerencia-info">
                        <div class="sugerencia-nombre">${this._escapeHTML(emp)}</div>
                        <div class="sugerencia-detalle">
                            <i class="fas fa-check-circle"></i>
                            Seleccionar
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        contenedor.innerHTML = html;

        contenedor.querySelectorAll('.sugerencia-item').forEach(item => {
            item.addEventListener('click', () => {
                const nombre = item.dataset.nombre;
                this._seleccionarEmpresa(nombre);
            });
        });
    }

    _seleccionarEmpresa(nombre) {
        const input = document.getElementById('nombreEmpresaCC');
        input.value = nombre;
        input.dataset.selectedName = nombre;

        document.getElementById('sugerenciasEmpresa').innerHTML = '';
    }

    _procesarImagenes(files) {
        if (!files || files.length === 0) return;

        const nuevosArchivos = Array.from(files);
        const maxSize = 10 * 1024 * 1024;
        const maxImages = 20;

        if (this.imagenesSeleccionadas.length + nuevosArchivos.length > maxImages) {
            this._mostrarError(`Máximo ${maxImages} imágenes permitidas`);
            return;
        }

        const archivosValidos = nuevosArchivos.filter(file => {
            if (file.size > maxSize) {
                this._mostrarNotificacion(`La imagen ${file.name} excede 10MB`, 'warning');
                return false;
            }

            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                this._mostrarNotificacion(`Formato no válido: ${file.name}. Usa JPG, PNG, GIF o WEBP`, 'warning');
                return false;
            }

            return true;
        });

        archivosValidos.forEach(file => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const generatedName = `${timestamp}_${random}_${cleanFileName}`;

            this.imagenesSeleccionadas.push({
                file: file,
                preview: URL.createObjectURL(file),
                comentario: '',
                elementos: [],
                edited: false,
                generatedName: generatedName
            });
        });

        this._actualizarVistaPreviaImagenes();
        document.getElementById('inputImagenes').value = '';
    }

    _actualizarVistaPreviaImagenes() {
        const container = document.getElementById('imagenesPreview');
        const countSpan = document.getElementById('imagenesCount');

        if (!container) return;

        if (countSpan) {
            countSpan.textContent = this.imagenesSeleccionadas.length;
        }

        if (this.imagenesSeleccionadas.length === 0) {
            container.innerHTML = `
                <div class="no-images">
                    <i class="fas fa-images"></i>
                    <p>No hay evidencias seleccionadas</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.imagenesSeleccionadas.forEach((img, index) => {
            html += `
                <div class="preview-item">
                    <img src="${img.preview}" alt="Evidencia ${index + 1}">
                    <div class="preview-overlay">
                        <button type="button" class="preview-btn edit-btn" data-index="${index}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="preview-btn delete-btn" data-index="${index}" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${img.edited ? '<span class="edited-badge"><i class="fas fa-check"></i> Editada</span>' : ''}
                    </div>
                    ${img.comentario ? `<div class="image-comment"><i class="fas fa-comment"></i> ${this._escapeHTML(img.comentario.substring(0, 30))}${img.comentario.length > 30 ? '...' : ''}</div>` : ''}
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                this._editarImagen(parseInt(index));
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.dataset.index;
                this._eliminarImagen(parseInt(index));
            });
        });
    }

    _editarImagen(index) {
        if (this.imageEditorModal && this.imagenesSeleccionadas[index]) {
            const img = this.imagenesSeleccionadas[index];
            this.imageEditorModal.show(
                img.file,
                index,
                img.comentario,
                (savedIndex, editedFile, comentario, elementos) => {
                    this.imagenesSeleccionadas[savedIndex].file = editedFile;
                    this.imagenesSeleccionadas[savedIndex].comentario = comentario;
                    this.imagenesSeleccionadas[savedIndex].elementos = elementos;
                    this.imagenesSeleccionadas[savedIndex].edited = true;

                    if (this.imagenesSeleccionadas[savedIndex].preview) {
                        URL.revokeObjectURL(this.imagenesSeleccionadas[savedIndex].preview);
                    }
                    this.imagenesSeleccionadas[savedIndex].preview = URL.createObjectURL(editedFile);

                    this._actualizarVistaPreviaImagenes();
                }
            );
        }
    }

    _eliminarImagen(index) {
        Swal.fire({
            title: '¿Eliminar evidencia?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                if (this.imagenesSeleccionadas[index].preview) {
                    URL.revokeObjectURL(this.imagenesSeleccionadas[index].preview);
                }
                this.imagenesSeleccionadas.splice(index, 1);
                this._actualizarVistaPreviaImagenes();
            }
        });
    }

    // =============================================
    // NUEVO MÉTODO: VALIDAR Y MOSTRAR OPCIONES (SweetAlert con 3 botones)
    // =============================================
    async _validarYMostrarOpciones() {
        // Primero validar todos los campos
        const empresaInput = document.getElementById('nombreEmpresaCC');
        const nombreEmpresaCC = empresaInput.value.trim();

        if (!nombreEmpresaCC) {
            this._mostrarError('Debe ingresar el nombre de la empresa o centro comercial');
            empresaInput.focus();
            return;
        }

        const tipoEvento = document.getElementById('tipoEvento').value;
        if (!tipoEvento) {
            this._mostrarError('Debe seleccionar el tipo de evento');
            document.getElementById('tipoEvento').focus();
            return;
        }

        const montoPerdido = parseFloat(document.getElementById('montoPerdido').value) || 0;
        if (montoPerdido <= 0) {
            this._mostrarError('Debe ingresar un monto perdido válido mayor a 0');
            document.getElementById('montoPerdido').focus();
            return;
        }

        const montoRecuperado = parseFloat(document.getElementById('montoRecuperado').value) || 0;

        const fechaInput = document.getElementById('fechaHoraEvento');
        let fechaHora = fechaInput.value;

        if (!fechaHora) {
            this._mostrarError('Debe seleccionar fecha y hora');
            fechaInput.focus();
            return;
        }

        const fechaSeleccionada = new Date(fechaHora);
        const ahora = new Date();

        if (fechaSeleccionada > ahora) {
            this._mostrarError('No puede seleccionar una fecha futura');
            fechaInput.focus();
            return;
        }

        const narracionInput = document.getElementById('narracionEventos');
        const narracionEventos = narracionInput.value.trim();
        if (!narracionEventos) {
            narracionInput.classList.add('is-invalid');
            this._mostrarError('La narración de los eventos es obligatoria');
            narracionInput.focus();
            return;
        }
        if (narracionEventos.length < 10) {
            narracionInput.classList.add('is-invalid');
            this._mostrarError('La narración debe tener al menos 10 caracteres');
            narracionInput.focus();
            return;
        }
        if (narracionEventos.length > LIMITES.NARRACION_EVENTOS) {
            narracionInput.classList.add('is-invalid');
            this._mostrarError(`La narración no puede exceder ${LIMITES.NARRACION_EVENTOS} caracteres`);
            narracionInput.focus();
            return;
        }
        narracionInput.classList.remove('is-invalid');

        const detallesPerdida = document.getElementById('detallesPerdida').value.trim();

        // Guardar datos validados (ubicación y responsableAsignado eliminados)
        const datos = {
            nombreEmpresaCC,
            tipoEvento,
            montoPerdido,
            montoRecuperado,
            fechaHora,
            narracionEventos,
            detallesPerdida,
            imagenes: this.imagenesSeleccionadas
        };

        // Mostrar SweetAlert con opciones
        const result = await Swal.fire({
            title: 'Confirmar registro',
            html: `
                <div style="text-align: left;">
                    <p><strong><i class="fas fa-store"></i> Empresa:</strong> ${this._escapeHTML(nombreEmpresaCC)}</p>
                    <p><strong><i class="fas fa-exclamation-triangle"></i> Tipo:</strong> ${this._getTipoEventoTexto(tipoEvento)}</p>
                    <p><strong><i class="fas fa-dollar-sign"></i> Monto perdido:</strong> $${montoPerdido.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                    ${montoRecuperado > 0 ? `<p><strong><i class="fas fa-undo-alt"></i> Monto recuperado:</strong> $${montoRecuperado.toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>` : ''}
                    <p><strong><i class="fas fa-calendar"></i> Fecha:</strong> ${new Date(fechaHora).toLocaleString('es-MX')}</p>
                    <p><strong><i class="fas fa-images"></i> Evidencias:</strong> ${this.imagenesSeleccionadas.length} imagen(es)</p>
                </div>
                <hr>
                <p style="font-size: 12px; color: #aaa;">Selecciona una opción:</p>
            `,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '<i class="fas fa-check-circle"></i> Aceptar',
            denyButtonText: '<i class="fas fa-file-pdf"></i> Ver PDF',
            cancelButtonText: '<i class="fas fa-times"></i> Cerrar',
            confirmButtonColor: '#28a745',
            denyButtonColor: '#dc3545',  // CAMBIADO: ahora es rojo como en las demás vistas
            cancelButtonColor: '#6c757d',
            reverseButtons: false
        });

        // Manejar la opción seleccionada
        if (result.isConfirmed) {
            // Aceptar - guardar directamente
            await this._guardarRegistroDirecto(datos);
        } else if (result.isDenied) {
            // Ver PDF - mostrar vista previa
            await this._generarYMostrarPDFPreview(datos);
        } else {
            // Cerrar - no hacer nada
            console.log('Usuario canceló');
        }
    }

    // =============================================
    // GUARDAR REGISTRO DIRECTAMENTE (sin vista previa)
    // =============================================
    async _guardarRegistroDirecto(datos) {
        const btnCrear = document.getElementById('btnCrearRegistro');
        const originalHTML = btnCrear ? btnCrear.innerHTML : '<i class="fas fa-check me-2"></i>Registrar Evento';

        let registroId = null;

        try {
            if (btnCrear) {
                btnCrear.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Guardando...';
                btnCrear.disabled = true;
            }

            Swal.fire({
                title: 'Guardando registro...',
                text: 'Generando reporte y subiendo evidencias...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const fechaObj = new Date(datos.fechaHora);
            const hora = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

            // Generar PDF en segundo plano
            const registroTemporal = this._crearRegistroTemporal(datos);
            const pdfBlob = await this.pdfGenerator.generarReporte(registroTemporal, {
                mostrarAlerta: false,
                returnBlob: true,
                diagnosticar: false
            });

            if (!pdfBlob || pdfBlob.size === 0) {
                throw new Error('No se pudo generar el PDF');
            }

            // PASO 1: CREAR REGISTRO EN FIRESTORE (campos ubicacion y responsableAsignado eliminados)
            const registroData = {
                nombreEmpresaCC: datos.nombreEmpresaCC,
                tipoEvento: datos.tipoEvento,
                montoPerdido: datos.montoPerdido,
                montoRecuperado: datos.montoRecuperado,
                fecha: fechaObj,
                hora: hora,
                narracionEventos: datos.narracionEventos,
                detallesPerdida: datos.detallesPerdida,
                reportadoPorId: this.usuarioActual.id,
                reportadoPorNombre: this.usuarioActual.nombreCompleto
            };

            const nuevoRegistro = await this.mercanciaManager.crearRegistro(
                registroData,
                this.usuarioActual,
                [],
                []
            );

            registroId = nuevoRegistro.id;
            console.log('✅ Registro creado:', registroId);

            // PASO 2: SUBIR EVIDENCIAS
            Swal.update({
                title: 'Subiendo evidencias...',
                text: `Subiendo ${datos.imagenes.length} evidencias...`
            });

            const evidenciasUrls = await this._subirEvidencias(registroId, datos.imagenes);

            // PASO 3: ACTUALIZAR REGISTRO CON URLs DE EVIDENCIAS
            if (evidenciasUrls.length > 0) {
                await this.mercanciaManager.actualizarRegistro(
                    registroId,
                    { evidencias: evidenciasUrls },
                    this.usuarioActual.id,
                    this.usuarioActual.organizacionCamelCase,
                    this.usuarioActual
                );
                console.log(`✅ ${evidenciasUrls.length} evidencias actualizadas`);
            }

            // PASO 4: SUBIR EL PDF GENERADO
            Swal.update({
                title: 'Subiendo PDF...',
                text: 'Guardando el reporte PDF...'
            });

            const pdfFile = new File([pdfBlob], `reporte_${registroId}.pdf`, { type: 'application/pdf' });
            const rutaPDF = `mercancia_perdida_${this.usuarioActual.organizacionCamelCase}/${registroId}/pdf/reporte_${registroId}.pdf`;

            const resultado = await this.mercanciaManager.subirArchivo(pdfFile, rutaPDF);

            await this.mercanciaManager.actualizarEstadoPDF(
                registroId,
                'completado',
                resultado.url,
                this.usuarioActual.organizacionCamelCase,
                this.usuarioActual
            );

            console.log('✅ PDF subido exitosamente:', resultado.url);

            Swal.close();

            // PASO 5: REGISTRAR EN HISTORIAL
            const historial = await this._initHistorialManager();
            if (historial) {
                await historial.registrarActividad({
                    usuario: this.usuarioActual,
                    tipo: 'crear',
                    modulo: 'mercancia_perdida',
                    descripcion: `Registró mercancía perdida - ${datos.nombreEmpresaCC} - $${datos.montoPerdido}`,
                    detalles: {
                        registroId,
                        nombreEmpresaCC: datos.nombreEmpresaCC,
                        montoPerdido: datos.montoPerdido,
                        tipoEvento: datos.tipoEvento,
                        totalEvidencias: evidenciasUrls.length
                    }
                });
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Evento registrado!',
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-check-circle" style="font-size: 48px; color: #28a745; margin-bottom: 16px;"></i>
                        <p>El registro de <strong>${this._escapeHTML(datos.nombreEmpresaCC)}</strong> se ha guardado correctamente.</p>
                        <p style="margin-top: 10px; font-size: 12px; color: #666;">
                            <i class="fas fa-file-pdf"></i> El reporte PDF ya está disponible.<br>
                            Puedes descargarlo desde la lista de registros.
                        </p>
                    </div>
                `,
                confirmButtonText: 'Ver registros',
                confirmButtonColor: '#28a745'
            });

            this._volverALista();

        } catch (error) {
            console.error('Error guardando registro:', error);
            Swal.close();
            
            if (registroId) {
                try {
                    const rutaStorage = `mercancia_perdida_${this.usuarioActual.organizacionCamelCase}/${registroId}`;
                    await this.mercanciaManager.eliminarCarpetaStorage(rutaStorage);
                    await this.mercanciaManager.eliminarRegistro(registroId, this.usuarioActual.organizacionCamelCase, false);
                } catch (cleanupError) {
                    console.error('Error limpiando:', cleanupError);
                }
            }
            
            this._mostrarError(error.message || 'No se pudo registrar el evento');
        } finally {
            if (btnCrear) {
                btnCrear.innerHTML = originalHTML;
                btnCrear.disabled = false;
            }
        }
    }

    // =============================================
    // GENERAR Y MOSTRAR VISTA PREVIA DEL PDF (sin guardar aún)
    // =============================================
    async _generarYMostrarPDFPreview(datos) {
        // Mostrar loading
        Swal.fire({
            title: 'Generando vista previa...',
            text: 'Preparando el reporte PDF con tus evidencias',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        // Generar y mostrar vista previa
        await this._mostrarVistaPreviaPDF(datos);
        
        Swal.close();
    }

    async _subirEvidencias(registroId, imagenes) {
        if (!imagenes || imagenes.length === 0) return [];
        
        const resultados = [];
        console.log(`📸 Subiendo ${imagenes.length} evidencias...`);
        
        for (let i = 0; i < imagenes.length; i++) {
            const img = imagenes[i];
            const comentario = img.comentario || '';
            
            const nombreArchivo = img.generatedName || 
                `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${img.file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            
            const rutaStorage = `mercancia_perdida_${this.usuarioActual.organizacionCamelCase}/${registroId}/evidencias/${nombreArchivo}`;
            
            try {
                console.log(`📤 Evidencia ${i + 1}/${imagenes.length}: ${nombreArchivo}`);
                const resultado = await this.mercanciaManager.subirArchivo(img.file, rutaStorage);
                
                resultados.push({
                    id: `EVD${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
                    url: resultado.url,
                    path: resultado.path,
                    comentario: comentario,
                    nombre: img.file.name,
                    generatedName: nombreArchivo,
                    fechaAgregada: new Date()
                });
                console.log(`✅ Evidencia ${i + 1} subida correctamente`);
            } catch (error) {
                console.error(`❌ Error subiendo evidencia ${i + 1}:`, error);
                throw error;
            }
        }
        
        return resultados;
    }

    _volverALista() {
        this.imagenesSeleccionadas.forEach(img => {
            if (img.preview) {
                URL.revokeObjectURL(img.preview);
            }
        });
        window.location.href = '../mercanciaPerdida/mercanciaPerdida.html';
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
                this.imagenesSeleccionadas.forEach(img => {
                    if (img.preview) {
                        URL.revokeObjectURL(img.preview);
                    }
                });
                this._volverALista();
            }
        });
    }

    _mostrarError(mensaje) {
        this._mostrarNotificacion(mensaje, 'error');
    }

    _mostrarNotificacion(mensaje, tipo = 'info', duracion = 5000) {
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

    _escapeHTML(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    _getTipoEventoTexto(tipo) {
        const tipos = {
            'robo': 'Robo',
            'extravio': 'Extravío',
            'accidente': 'Accidente',
            'otro': 'Otro'
        };
        return tipos[tipo] || tipo;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.crearMercanciaPerdidaDebug = { controller: new CrearMercanciaPerdidaController() };
});