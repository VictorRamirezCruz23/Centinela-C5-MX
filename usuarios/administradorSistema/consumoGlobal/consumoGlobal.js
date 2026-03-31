// consumoGlobal.js - Panel administrativo para ver consumo de todas las empresas
// VERSIÓN SIN AUTO-REFRESCO - Actualización manual mediante botones
// CON BOTÓN PDF INTEGRADO
// MODIFICADO: Todos los valores undefined ahora muestran 0
// MODIFICADO: Eliminada la tabla de resumen de empresas y la tarjeta de última operación
// MODIFICADO: Todos los textos en español (abreviados)
// MODIFICADO: Eliminada la tarjeta de Authentication
// MODIFICADO: Usa la clase ConsumoFirebase para todas las operaciones (sin importar Firestore directamente)

import instanciaConsumo from '/clases/consumoFirebase.js';
import generadorPDFConsumo from '/components/pdf-consumo-generador.js';

// Elementos del DOM
const selectEmpresa = document.getElementById('selectEmpresa');
const btnCargar = document.getElementById('btnCargarEmpresa');
const btnActualizarTodo = document.getElementById('btnActualizarTodo');
const empresaInfo = document.getElementById('empresaInfo');
const empresaNombre = document.getElementById('empresaNombre');
const empresaUltimaActualizacion = document.getElementById('empresaUltimaActualizacion');
const fechaGlobal = document.getElementById('fechaActualizacionGlobal');
// Botón PDF
const btnExportarPDF = document.getElementById('btnExportarPDF');

// Métricas de empresa seleccionada
const metricas = {
    firestoreTotal: document.getElementById('empresaFirestoreTotal'),
    firestoreDetalle: document.getElementById('empresaFirestoreDetalle'),
    storageTotal: document.getElementById('empresaStorageTotal'),
    storageDetalle: document.getElementById('empresaStorageDetalle'),
    functionsTotal: document.getElementById('empresaFunctionsTotal'),
    functionsDetalle: document.getElementById('empresaFunctionsDetalle'),
    fcmTotal: document.getElementById('empresaFCMTotal'),
    fcmDetalle: document.getElementById('empresaFCMDetalle'),
    totalOperaciones: document.getElementById('empresaTotalOperaciones'),
    totalDetalle: document.getElementById('empresaTotalDetalle')
};

// Gráficas
let chartDistribucion = null;
let chartTipos = null;

// =============================================
// FUNCIÓN AUXILIAR PARA ASEGURAR NÚMERO (0 por defecto)
// =============================================
function asegurarNumero(valor) {
    if (valor === undefined || valor === null || isNaN(valor)) {
        return 0;
    }
    return typeof valor === 'number' ? valor : Number(valor) || 0;
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🌍 Iniciando panel global de consumo (sin auto-refresco)...');
        mostrarLoading();

        // Listeners de UI (solo para acciones manuales)
        btnCargar.addEventListener('click', () => {
            if (selectEmpresa.value) {
                cargarEmpresaSeleccionada();
            }
        });
        
        btnActualizarTodo.addEventListener('click', async () => {
            await cargarTodasLasEmpresas();
            // Si hay una empresa seleccionada, también actualizar sus datos
            if (selectEmpresa.value) {
                await actualizarEmpresaSeleccionada();
            }
            mostrarNotificacionManual('Datos actualizados manualmente');
        });
        
        selectEmpresa.addEventListener('change', () => {
            if (selectEmpresa.value) {
                cargarEmpresaSeleccionada();
            }
        });

        // Botón PDF
        if (btnExportarPDF) {
            btnExportarPDF.addEventListener('click', exportarPDF);
        }

        // Cargar datos iniciales
        await cargarTodasLasEmpresas();

    } catch (error) {
        console.error('Error al inicializar:', error);
        mostrarError('No se pudo cargar el panel global.');
    }
});

// =============================================
// CARGAR TODAS LAS EMPRESAS (SIN AUTO-REFRESCO)
// =============================================
async function cargarTodasLasEmpresas() {
    console.log('📡 Cargando datos de todas las empresas...');
    
    try {
        // Usar el método de la clase para listar todas las empresas
        const empresas = await instanciaConsumo.listarTodasLasEmpresas();
        
        console.log(`✅ Se encontraron ${empresas.length} empresas`);
        
        if (empresas.length === 0) {
            selectEmpresa.innerHTML = '<option value="">-- No hay empresas disponibles --</option>';
            return;
        }

        let options = '<option value="">-- Selecciona una empresa --</option>';
        let valorSeleccionadoActual = selectEmpresa.value;

        empresas.sort((a, b) => (a.nombreEmpresa || a.id).localeCompare(b.nombreEmpresa || b.id));

        empresas.forEach(empresa => {
            const id = empresa.id;
            const nombre = empresa.nombreEmpresa || id;
            options += `<option value="${id}" ${id === valorSeleccionadoActual ? 'selected' : ''}>${nombre} (${id})</option>`;
        });

        selectEmpresa.innerHTML = options;
        fechaGlobal.textContent = new Date().toLocaleString('es-MX');

        // Si había una empresa seleccionada, actualizar sus datos
        if (valorSeleccionadoActual && empresas.some(e => e.id === valorSeleccionadoActual)) {
            await actualizarEmpresaSeleccionada();
        } else if (valorSeleccionadoActual) {
            // La empresa seleccionada ya no existe
            empresaInfo.style.display = 'none';
            selectEmpresa.value = '';
        }

    } catch (error) {
        console.error('Error cargando empresas:', error);
        selectEmpresa.innerHTML = '<option value="">-- Error al cargar empresas --</option>';
        mostrarError('No se pudieron cargar los datos de las empresas.');
    }
}

// =============================================
// ACTUALIZAR EMPRESA SELECCIONADA (CARGA MANUAL)
// =============================================
async function actualizarEmpresaSeleccionada() {
    const empresaId = selectEmpresa.value;
    
    if (!empresaId) return;

    try {
        // Usar el método de la clase para obtener datos de la empresa
        const data = await instanciaConsumo.obtenerConsumoEmpresa(empresaId);
        
        if (!data) {
            empresaInfo.style.display = 'none';
            Swal.fire({
                icon: 'info',
                title: 'Empresa no encontrada',
                text: 'La empresa seleccionada ya no existe en la base de datos.',
                timer: 3000
            });
            selectEmpresa.value = '';
            return;
        }

        mostrarDatosEmpresa(empresaId, data);
        
    } catch (error) {
        console.error('Error actualizando empresa:', error);
        mostrarError('No se pudo actualizar los datos de la empresa.');
    }
}

// =============================================
// CARGAR EMPRESA SELECCIONADA
// =============================================
async function cargarEmpresaSeleccionada() {
    const empresaId = selectEmpresa.value;
    
    if (!empresaId) {
        Swal.fire({
            icon: 'warning',
            title: 'Selecciona una empresa',
            text: 'Debes seleccionar una empresa para ver sus datos.'
        });
        return;
    }

    try {
        mostrarLoadingEmpresa();
        await actualizarEmpresaSeleccionada();
        
    } catch (error) {
        console.error('Error cargando empresa:', error);
        mostrarError('No se pudo cargar los datos de la empresa.');
    }
}

// =============================================
// MOSTRAR NOTIFICACIÓN DE ACTUALIZACIÓN MANUAL
// =============================================
function mostrarNotificacionManual(mensaje) {
    let indicator = document.getElementById('updateIndicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'updateIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        document.body.appendChild(indicator);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    indicator.innerHTML = `<i class="fas fa-sync-alt"></i> ${mensaje || 'Datos actualizados'}`;
    
    setTimeout(() => {
        if (indicator) {
            indicator.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (indicator && indicator.parentNode) {
                    indicator.parentNode.removeChild(indicator);
                }
            }, 300);
        }
    }, 2000);
}

// =============================================
// MOSTRAR DATOS DE EMPRESA
// =============================================
function mostrarDatosEmpresa(id, data) {
    empresaInfo.style.display = 'block';
    
    const nombre = data.nombreEmpresa || id;
    empresaNombre.textContent = nombre;
    
    const ultimaAct = data.ultimaActualizacion ? 
        new Date(data.ultimaActualizacion.seconds * 1000).toLocaleString('es-MX') : 
        'No disponible';
    empresaUltimaActualizacion.innerHTML = `<i class="fas fa-clock"></i> Última actualización: ${ultimaAct}`;
    
    // FIRESTORE
    const fs = {
        lectura: asegurarNumero(data.firestore?.lectura),
        escritura: asegurarNumero(data.firestore?.escritura),
        actualizacion: asegurarNumero(data.firestore?.actualizacion),
        eliminacion: asegurarNumero(data.firestore?.eliminacion),
        total: asegurarNumero(data.firestore?.total)
    };
    metricas.firestoreTotal.textContent = fs.total;
    metricas.firestoreDetalle.innerHTML = `L:${fs.lectura} / E:${fs.escritura} / A:${fs.actualizacion} / D:${fs.eliminacion}`;
    
    // STORAGE
    const st = {
        subida: asegurarNumero(data.storage?.subida),
        descarga: asegurarNumero(data.storage?.descarga),
        eliminacion: asegurarNumero(data.storage?.eliminacion),
        total: asegurarNumero(data.storage?.total)
    };
    metricas.storageTotal.textContent = st.total;
    metricas.storageDetalle.innerHTML = `Sub:${st.subida} / Desc:${st.descarga} / Del:${st.eliminacion}`;
    
    // FUNCTIONS
    const fn = {
        invocacion: asegurarNumero(data.functions?.invocacion),
        invocaciones: asegurarNumero(data.functions?.invocaciones),
        total: asegurarNumero(data.functions?.total),
        notificacionesPushEnviadas: asegurarNumero(data.functions?.notificacionesPushEnviadas),
        usuariosNotificados: asegurarNumero(data.functions?.usuariosNotificados)
    };
    const invocacionesTotales = fn.invocacion + fn.invocaciones;
    
    metricas.functionsTotal.textContent = fn.total || invocacionesTotales;
    metricas.functionsDetalle.innerHTML = `Invoc: ${invocacionesTotales}`;
    
    // FCM
    const notificacionesPushReales = fn.notificacionesPushEnviadas;
    const usuariosNotificados = fn.usuariosNotificados;
    
    const fcm = {
        notificacionEnviada: asegurarNumero(data.fcm?.notificacionEnviada),
        tokenRegistrado: asegurarNumero(data.fcm?.tokenRegistrado),
        tokenEliminado: asegurarNumero(data.fcm?.tokenEliminado),
        total: asegurarNumero(data.fcm?.total)
    };
    
    metricas.fcmTotal.textContent = notificacionesPushReales;
    metricas.fcmDetalle.innerHTML = `Push:${notificacionesPushReales} / Tokens:${fcm.tokenRegistrado}`;
    
    // Total general (sin Auth)
    const total = fs.total + st.total + (fn.total || invocacionesTotales) + fcm.total;
    metricas.totalOperaciones.textContent = total;
    metricas.totalDetalle.innerHTML = `${total} operaciones total (${notificacionesPushReales} push reales)`;
    
    // Actualizar gráficas (sin Auth)
    actualizarGraficasEmpresa(fs, st, { ...fn, invocacionesTotales, notificacionesPushReales, usuariosNotificados }, fcm);
}

// =============================================
// GRÁFICAS (sin Auth)
// =============================================
function actualizarGraficasEmpresa(fs, st, fn, fcm) {
    // Totales por servicio
    const fsTotal = asegurarNumero(fs.total);
    const stTotal = asegurarNumero(st.total);
    const fnTotal = asegurarNumero(fn.total) || asegurarNumero(fn.invocacionesTotales);
    const fcmTotal = asegurarNumero(fcm.total);
    
    // Gráfica de distribución por servicio
    const ctxDist = document.getElementById('graficoEmpresaDistribucion').getContext('2d');
    
    const dataDist = {
        labels: ['Firestore', 'Storage', 'Functions', 'FCM'],
        datasets: [{
            data: [fsTotal, stTotal, fnTotal, fcmTotal],
            backgroundColor: ['#3b82f6', '#f97316', '#8b5cf6', '#ec4899'],
            borderWidth: 0
        }]
    };
    
    if (chartDistribucion) {
        chartDistribucion.data = dataDist;
        chartDistribucion.update();
    } else {
        chartDistribucion = new Chart(ctxDist, {
            type: 'pie',
            data: dataDist,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: 'white' }, position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                                return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Gráfica de desglose por tipo (sin Auth)
    const ctxTipos = document.getElementById('graficoEmpresaTipos').getContext('2d');
    
    const dataTipos = {
        labels: ['Firestore', 'Storage', 'FCM', 'Functions'],
        datasets: [
            {
                label: 'Lecturas / Subidas / Push / Invocaciones',
                data: [
                    asegurarNumero(fs.lectura),
                    asegurarNumero(st.subida),
                    asegurarNumero(fn.notificacionesPushReales),
                    asegurarNumero(fn.invocacion)
                ],
                backgroundColor: '#3b82f6',
                stack: 'stack0'
            },
            {
                label: 'Escrituras / Descargas / Tokens / Invocaciones (alt)',
                data: [
                    asegurarNumero(fs.escritura),
                    asegurarNumero(st.descarga),
                    asegurarNumero(fcm.tokenRegistrado),
                    asegurarNumero(fn.invocaciones)
                ],
                backgroundColor: '#f97316',
                stack: 'stack0'
            },
            {
                label: 'Actualizaciones / Eliminaciones',
                data: [
                    asegurarNumero(fs.actualizacion),
                    asegurarNumero(st.eliminacion),
                    0,
                    0
                ],
                backgroundColor: '#10b981',
                stack: 'stack0'
            }
        ]
    };
    
    if (chartTipos) {
        chartTipos.data = dataTipos;
        chartTipos.update();
    } else {
        chartTipos = new Chart(ctxTipos, {
            type: 'bar',
            data: dataTipos,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: 'white', font: { size: 10 } } },
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: 'white' }
                    },
                    x: { 
                        ticks: { color: 'white' }
                    }
                }
            }
        });
    }
}

// =============================================
// FUNCIÓN PARA EXPORTAR PDF
// =============================================
async function exportarPDF() {
    const empresaId = selectEmpresa.value;
    
    if (!empresaId) {
        Swal.fire({
            icon: 'warning',
            title: 'Selecciona una empresa',
            text: 'Debes seleccionar una empresa para exportar el reporte de consumo.'
        });
        return;
    }

    try {
        Swal.fire({
            title: 'Generando Reporte de Consumo...',
            html: `
                <div style="text-align: center; margin: 10px 0;">
                    <i class="fas fa-chart-line fa-2x" style="color: #c9a03d; animation: pulse 1s infinite;"></i>
                </div>
                <div class="progress-bar-container" style="width:100%; height:20px; background:rgba(0,0,0,0.1); border-radius:10px; margin-top:10px;">
                    <div class="progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #1a3b5d, #c9a03d); border-radius:10px; transition:width 0.3s;"></div>
                </div>
                <p style="margin-top: 10px; font-size: 12px;">Procesando métricas de consumo...</p>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                let progreso = 0;
                const intervalo = setInterval(() => {
                    progreso += 8;
                    if (progreso <= 90) {
                        const barra = document.querySelector('.progress-bar');
                        if (barra) {
                            barra.style.width = progreso + '%';
                        }
                    }
                }, 150);
                window._intervaloProgresoPDF = intervalo;
            }
        });

        // Usar el método de la clase para obtener datos de la empresa
        const datos = await instanciaConsumo.obtenerConsumoEmpresa(empresaId);
        
        if (!datos) {
            if (window._intervaloProgresoPDF) clearInterval(window._intervaloProgresoPDF);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Sin datos',
                text: 'No hay datos de consumo para esta empresa.'
            });
            return;
        }
        
        const empresaNombre = datos.nombreEmpresa || empresaId;
        const ultimaActualizacion = datos.ultimaActualizacion ? 
            new Date(datos.ultimaActualizacion.seconds * 1000) : new Date();
        
        if (window._intervaloProgresoPDF) clearInterval(window._intervaloProgresoPDF);
        Swal.close();
        
        generadorPDFConsumo.configurar({
            datosConsumo: datos,
            empresaNombre: empresaNombre,
            empresaId: empresaId,
            ultimaActualizacion: ultimaActualizacion,
            organizacionActual: { nombre: empresaNombre }
        });
        
        await generadorPDFConsumo.generarReporte(datos, {
            mostrarAlerta: true,
            empresaNombre: empresaNombre,
            empresaId: empresaId,
            ultimaActualizacion: ultimaActualizacion
        });
        
    } catch (error) {
        console.error('Error exportando PDF:', error);
        if (window._intervaloProgresoPDF) clearInterval(window._intervaloProgresoPDF);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte PDF: ' + error.message
        });
    }
}

// =============================================
// UTILIDADES
// =============================================
function mostrarLoading() {
    selectEmpresa.innerHTML = '<option value="">-- Cargando empresas... --</option>';
}

function mostrarLoadingEmpresa() {
    metricas.firestoreTotal.textContent = '...';
    metricas.storageTotal.textContent = '...';
    metricas.functionsTotal.textContent = '...';
    metricas.fcmTotal.textContent = '...';
    metricas.totalOperaciones.textContent = '...';
}

function mostrarError(mensaje) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje
    });
}

// Hacer funciones globales para los onclick
window.cargarEmpresaSeleccionada = cargarEmpresaSeleccionada;