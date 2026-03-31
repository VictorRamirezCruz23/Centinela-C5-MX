/**
 * PDF ESTADÍSTICAS GENERATOR - Sistema Centinela
 * VERSIÓN: 1.7 - CORREGIDO: Todas las gráficas perfectamente alineadas sin ensimarse
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

// =============================================
// CONFIGURACIÓN DE COLORES PARA ESTADÍSTICAS
// =============================================
export const coloresEstadisticas = {
    ...coloresBase,
    graficas: {
        actualizadores: '#3b82f6',
        reportadores: '#10b981',
        seguimientos: '#f97316',
        estadoPendiente: '#f97316',
        estadoFinalizada: '#10b981',
        riesgoCritico: '#ef4444',
        riesgoAlto: '#f97316',
        riesgoMedio: '#eab308',
        riesgoBajo: '#10b981',
        categorias: '#8b5cf6',
        sucursales: '#14b8a6',
        tiempo: '#ec4899',
        desempeno: '#8b5cf6'
    }
};

// =============================================
// CLASE PDF ESTADÍSTICAS GENERATOR
// =============================================
class PDFEstadisticasGenerator extends PDFBaseGenerator {
    constructor() {
        super();
        this.sucursalesCache = [];
        this.categoriasCache = [];
        this.usuariosCache = [];
        this.datosEstadisticas = null;
        this.filtrosAplicados = {};
        this.fechaInicio = null;
        this.fechaFin = null;

        // Tamaños de fuente optimizados
        this.fonts = {
            tituloPrincipal: 18,
            titulo: 16,
            subtitulo: 14,
            normal: 12,
            small: 11,
            mini: 10,
            micro: 9
        };
    }

    configurar(config) {
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.sucursalesCache) this.sucursalesCache = config.sucursalesCache;
        if (config.categoriasCache) this.categoriasCache = config.categoriasCache;
        if (config.usuariosCache) this.usuariosCache = config.usuariosCache;
        if (config.authToken) this.authToken = config.authToken;
    }

    // =============================================
    // FUNCIÓN PRINCIPAL - GENERAR REPORTE
    // =============================================
    async generarReporte(datos, opciones = {}) {
        try {
            const {
                mostrarAlerta = true,
                fechaInicio,
                fechaFin,
                filtrosAplicados = {}
            } = opciones;

            let alertaActual = null;

            if (mostrarAlerta) {
                alertaActual = Swal.fire({
                    title: 'Generando Reporte Estadístico...',
                    html: '<div class="progress-bar-container" style="width:100%; height:20px; background:rgba(0,0,0,0.1); border-radius:10px; margin-top:10px;"><div class="progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #1a3b5d, #c9a03d); border-radius:10px; transition:width 0.3s;"></div></div>',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        let progreso = 0;
                        const intervalo = setInterval(() => {
                            progreso += 5;
                            if (progreso <= 90) {
                                const barra = document.querySelector('.progress-bar');
                                if (barra) {
                                    barra.style.width = progreso + '%';
                                }
                            }
                        }, 200);
                        window._intervaloProgreso = intervalo;
                    }
                });
            }

            await this.cargarLibrerias();
            if (mostrarAlerta && window._intervaloProgreso) {
                clearInterval(window._intervaloProgreso);
            }

            await this.cargarLogoCentinela();
            await this.cargarLogoOrganizacion();

            this.datosEstadisticas = datos;
            this.filtrosAplicados = filtrosAplicados;
            this.fechaInicio = fechaInicio;
            this.fechaFin = fechaFin;

            const pdf = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // Calcular páginas necesarias
            this.totalPaginas = 3;
            this.paginaActualReal = 1;

            // Generar contenido
            await this._generarContenido(pdf, datos);

            const nombreArchivo = `ESTADISTICAS_${this.organizacionActual?.nombre || 'organizacion'}_${this.formatearFechaArchivo()}.pdf`;

            if (mostrarAlerta) {
                if (window._intervaloProgreso) {
                    clearInterval(window._intervaloProgreso);
                }
                Swal.close();
                await this.mostrarOpcionesDescarga(pdf, nombreArchivo);
            }

            return pdf;
        } catch (error) {
            console.error('Error generando reporte:', error);
            if (window._intervaloProgreso) {
                clearInterval(window._intervaloProgreso);
            }
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo generar el reporte: ' + error.message
                });
            }
            throw error;
        }
    }

    // =============================================
    // GENERAR CONTENIDO DEL PDF
    // =============================================
    async _generarContenido(pdf, datos) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 8;

        // =============================================
        // PÁGINA 1
        // =============================================

        // Encabezado
        this.dibujarEncabezadoBase(
            pdf,
            'REPORTE ESTADÍSTICO',
            this.organizacionActual?.nombre || 'SISTEMA CENTINELA'
        );

        // Información del período
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(margen, yPos - 3, anchoContenido, 22, 2, 2, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(26, 59, 93);
        pdf.text('PERÍODO ANALIZADO', margen + 5, yPos);
        yPos += 6;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(80, 80, 80);

        const periodo = this.fechaInicio && this.fechaFin
            ? `Del ${this.formatearFechaVisualizacion(new Date(this.fechaInicio))} al ${this.formatearFechaVisualizacion(new Date(this.fechaFin))}`
            : 'Todo el historial disponible';

        pdf.text(periodo, margen + 5, yPos);
        yPos += 15;

        // Métricas principales
        this._dibujarMetricas(pdf, datos.metricas, margen, anchoContenido, yPos);
        yPos += 45;

        // Título sección colaboradores
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text('DESEMPEÑO DE COLABORADORES', margen, yPos);
        yPos += 10;

        // 3 gráficas de colaboradores en fila con espacio uniforme
        const espacioGraficas = 8;
        const anchoGraficaPequena = (anchoContenido - (espacioGraficas * 2)) / 3;

        // Gráfica 1: Actualizadores
        if (datos.topActualizadores?.length > 0) {
            this._dibujarGraficaSimple(pdf, 'Más Actualizaciones', datos.topActualizadores, margen, yPos, anchoGraficaPequena, 60, coloresEstadisticas.graficas.actualizadores);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de actualizaciones', margen, yPos, anchoGraficaPequena, 60);
        }

        // Gráfica 2: Reportadores
        if (datos.topReportadores?.length > 0) {
            this._dibujarGraficaSimple(pdf, 'Más Reportes', datos.topReportadores, margen + anchoGraficaPequena + espacioGraficas, yPos, anchoGraficaPequena, 60, coloresEstadisticas.graficas.reportadores);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de reportes', margen + anchoGraficaPequena + espacioGraficas, yPos, anchoGraficaPequena, 60);
        }

        // Gráfica 3: Seguimientos
        if (datos.topSeguimientos?.length > 0) {
            this._dibujarGraficaSimple(pdf, 'Más Seguimientos', datos.topSeguimientos, margen + (anchoGraficaPequena + espacioGraficas) * 2, yPos, anchoGraficaPequena, 60, coloresEstadisticas.graficas.seguimientos);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de seguimientos', margen + (anchoGraficaPequena + espacioGraficas) * 2, yPos, anchoGraficaPequena, 60);
        }

        // Pie de página
        this.dibujarPiePagina(pdf);

        // =============================================
        // PÁGINA 2
        // =============================================
        pdf.addPage();
        this.paginaActualReal++;
        this.dibujarEncabezadoBase(pdf, 'REPORTE ESTADÍSTICO', 'CONTINUACIÓN');
        yPos = this.alturaEncabezado + 8;

        // Título sección estado y riesgo
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text('ESTADO Y RIESGO DE INCIDENCIAS', margen, yPos);
        yPos += 10;

        // Estado y Riesgo (2 gráficas lado a lado con espacio)
        const espacioGrande = 15;
        const anchoGraficaMediana = (anchoContenido - espacioGrande) / 2;

        // Gráfica de Estado
        if (datos.estadoData && (datos.estadoData.pendientes > 0 || datos.estadoData.finalizadas > 0)) {
            this._dibujarGraficaCircular(pdf, 'Estado de Incidencias', datos.estadoData, margen, yPos, anchoGraficaMediana, 75);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de estado', margen, yPos, anchoGraficaMediana, 75);
        }

        // Gráfica de Riesgo
        if (datos.riesgoData && (datos.riesgoData.critico > 0 || datos.riesgoData.alto > 0 || datos.riesgoData.medio > 0 || datos.riesgoData.bajo > 0)) {
            this._dibujarGraficaCircular(pdf, 'Nivel de Riesgo', datos.riesgoData, margen + anchoGraficaMediana + espacioGrande, yPos, anchoGraficaMediana, 75);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de riesgo', margen + anchoGraficaMediana + espacioGrande, yPos, anchoGraficaMediana, 75);
        }

        yPos += 90;

        // =============================================
        // DISTRIBUCIÓN POR CATEGORÍA Y SUCURSAL
        // =============================================
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text('DISTRIBUCIÓN POR CATEGORÍA Y SUCURSAL', margen, yPos);
        yPos += 10;

        // Calcular ancho para cada gráfica (lado a lado con espacio)
        const espacioCategorias = 15;
        const anchoGraficaCategorias = (anchoContenido - espacioCategorias) / 2;

        // Gráfica de Categorías (izquierda)
        if (datos.categoriasData?.length > 0) {
            this._dibujarGraficaCategorias(pdf, 'Incidencias por Categoría', datos.categoriasData, margen, yPos, anchoGraficaCategorias, 70);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de categorías', margen, yPos, anchoGraficaCategorias, 70);
        }

        // Gráfica de Sucursales (derecha)
        if (datos.sucursalesData?.length > 0) {
            this._dibujarGraficaSucursales(pdf, 'Incidencias por Sucursal', datos.sucursalesData, margen + anchoGraficaCategorias + espacioCategorias, yPos, anchoGraficaCategorias, 70);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de sucursales', margen + anchoGraficaCategorias + espacioCategorias, yPos, anchoGraficaCategorias, 70);
        }

        // Pie de página
        this.dibujarPiePagina(pdf);

        // =============================================
        // PÁGINA 3
        // =============================================
        pdf.addPage();
        this.paginaActualReal++;
        this.dibujarEncabezadoBase(pdf, 'REPORTE ESTADÍSTICO', 'CONTINUACIÓN');
        yPos = this.alturaEncabezado + 8;

        // Título sección tiempo
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text('TIEMPO DE RESOLUCIÓN', margen, yPos);
        yPos += 10;

        // Gráfica de Tiempo de resolución
        if (datos.tiemposPromedio?.length > 0) {
            this._dibujarGraficaBarrasTiempo(pdf, 'Horas promedio por colaborador', datos.tiemposPromedio, margen, yPos, anchoContenido, 75, coloresEstadisticas.graficas.tiempo);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de tiempo de resolución', margen, yPos, anchoContenido, 75);
        }

        yPos += 90;

        // Título sección desempeño detallado
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text('DESEMPEÑO DETALLADO DE COLABORADORES', margen, yPos);
        yPos += 10;

        // Gráfica de Desempeño de Colaboradores
        if (datos.colaboradores?.length > 0) {
            this._dibujarGraficaDesempenoColaboradores(pdf, datos.colaboradores.slice(0, 6), margen, yPos, anchoContenido, 85);
        } else {
            this._dibujarGraficaVacia(pdf, 'Sin datos de colaboradores', margen, yPos, anchoContenido, 85);
        }

        // Pie de página final
        this.dibujarPiePagina(pdf);
    }

    // =============================================
    // DIBUJAR MÉTRICAS
    // =============================================
    _dibujarMetricas(pdf, metricas, margen, anchoContenido, yPos) {
        const anchoMetrica = (anchoContenido - 30) / 4;
        const espacioMetricas = 10;

        // Críticas
        pdf.setFillColor(255, 240, 240);
        pdf.setDrawColor(220, 53, 69);
        pdf.roundedRect(margen, yPos, anchoMetrica, 32, 3, 3, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(220, 53, 69);
        pdf.text('CRÍTICAS', margen + 5, yPos + 9);
        pdf.setFontSize(16);
        pdf.setTextColor(220, 53, 69);
        pdf.text(metricas.criticas.toString(), margen + 5, yPos + 26);

        // Altas
        pdf.setFillColor(255, 245, 235);
        pdf.setDrawColor(243, 156, 18);
        pdf.roundedRect(margen + anchoMetrica + espacioMetricas, yPos, anchoMetrica, 32, 3, 3, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(243, 156, 18);
        pdf.text('ALTAS', margen + anchoMetrica + espacioMetricas + 5, yPos + 9);
        pdf.setFontSize(16);
        pdf.setTextColor(243, 156, 18);
        pdf.text(metricas.altas.toString(), margen + anchoMetrica + espacioMetricas + 5, yPos + 26);

        // Pendientes
        pdf.setFillColor(255, 250, 235);
        pdf.setDrawColor(201, 160, 61);
        pdf.roundedRect(margen + (anchoMetrica + espacioMetricas) * 2, yPos, anchoMetrica, 32, 3, 3, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(201, 160, 61);
        pdf.text('PENDIENTES', margen + (anchoMetrica + espacioMetricas) * 2 + 5, yPos + 9);
        pdf.setFontSize(16);
        pdf.setTextColor(201, 160, 61);
        pdf.text(metricas.pendientes.toString(), margen + (anchoMetrica + espacioMetricas) * 2 + 5, yPos + 26);

        // Total
        pdf.setFillColor(235, 245, 255);
        pdf.setDrawColor(26, 59, 93);
        pdf.roundedRect(margen + (anchoMetrica + espacioMetricas) * 3, yPos, anchoMetrica, 32, 3, 3, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(26, 59, 93);
        pdf.text('TOTAL', margen + (anchoMetrica + espacioMetricas) * 3 + 5, yPos + 9);
        pdf.setFontSize(16);
        pdf.setTextColor(26, 59, 93);
        pdf.text(metricas.total.toString(), margen + (anchoMetrica + espacioMetricas) * 3 + 5, yPos + 26);
    }

    // =============================================
    // DIBUJAR GRÁFICA SIMPLE (BARRAS VERTICALES)
    // =============================================
    _dibujarGraficaSimple(pdf, titulo, datos, x, y, ancho, alto, color) {
        // Contenedor
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');

        // Título
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(26, 59, 93);
        pdf.text(titulo, x + 5, y + 9);

        // Calcular valores
        const maxValor = Math.max(...datos.map(d => d.cantidad));
        const anchoBarra = (ancho - 25) / Math.min(datos.length, 5);
        const baseY = y + alto - 18;

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        for (let i = 0; i < Math.min(datos.length, 5); i++) {
            const dato = datos[i];
            const alturaBarra = maxValor > 0 ? (dato.cantidad / maxValor) * (alto - 40) : 0;
            const xBarra = x + 12 + (i * (anchoBarra + 3));

            // Barra
            pdf.setFillColor(r, g, b);
            pdf.rect(xBarra, baseY - alturaBarra, anchoBarra - 2, alturaBarra, 'F');

            // Valor
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(26, 59, 93);
            pdf.text(dato.cantidad.toString(), xBarra + 2, baseY - alturaBarra - 3);

            // Nombre
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(80, 80, 80);
            const nombre = dato.nombre.length > 10 ? dato.nombre.substring(0, 8) + '...' : dato.nombre;
            pdf.text(nombre, xBarra + 2, baseY + 8);
        }
    }

    // =============================================
    // DIBUJAR GRÁFICA CIRCULAR
    // =============================================
    _dibujarGraficaCircular(pdf, titulo, datos, x, y, ancho, alto) {
        // Contenedor
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');

        // Título
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(26, 59, 93);
        pdf.text(titulo, x + 5, y + 9);

        // Leyenda
        const total = Object.values(datos).reduce((a, b) => a + b, 0);
        let yLeyenda = y + 20;

        const coloresMap = {
            pendientes: '#f97316',
            finalizadas: '#10b981',
            critico: '#ef4444',
            alto: '#f97316',
            medio: '#eab308',
            bajo: '#10b981'
        };

        Object.entries(datos).forEach(([key, valor]) => {
            if (valor > 0) {
                const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;
                const colorHex = coloresMap[key] || '#c9a03d';
                const r = parseInt(colorHex.slice(1, 3), 16);
                const g = parseInt(colorHex.slice(3, 5), 16);
                const b = parseInt(colorHex.slice(5, 7), 16);

                // Cuadro de color
                pdf.setFillColor(r, g, b);
                pdf.rect(x + 10, yLeyenda, 7, 7, 'F');

                // Texto
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                pdf.setTextColor(80, 80, 80);
                const texto = `${this._capitalize(key)}: ${valor} (${porcentaje}%)`;
                pdf.text(texto, x + 22, yLeyenda + 5);

                yLeyenda += 12;
            }
        });
    }

    // =============================================
    // DIBUJAR GRÁFICA DE CATEGORÍAS (BARRAS HORIZONTALES)
    // =============================================
    _dibujarGraficaCategorias(pdf, titulo, datos, x, y, ancho, alto) {
        // Contenedor
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');

        // Título
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(26, 59, 93);
        pdf.text(titulo, x + 5, y + 9);

        // Calcular valores
        const maxValor = Math.max(...datos.map(d => d.cantidad));
        const anchoMaxBarra = ancho - 65;
        const altoFila = (alto - 35) / Math.min(datos.length, 5);

        const color = '#8b5cf6';
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        for (let i = 0; i < Math.min(datos.length, 5); i++) {
            const dato = datos[i];
            const anchoBarra = maxValor > 0 ? (dato.cantidad / maxValor) * anchoMaxBarra : 0;
            const yFila = y + 18 + (i * (altoFila + 3));

            // Nombre
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(80, 80, 80);
            const nombre = dato.nombre.length > 15 ? dato.nombre.substring(0, 12) + '...' : dato.nombre;
            pdf.text(nombre, x + 8, yFila + 4);

            // Barra
            pdf.setFillColor(r, g, b);
            pdf.rect(x + 50, yFila, anchoBarra, 8, 'F');

            // Valor
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(26, 59, 93);
            pdf.text(dato.cantidad.toString(), x + 50 + anchoBarra + 5, yFila + 5);
        }
    }

    // =============================================
    // DIBUJAR GRÁFICA DE SUCURSALES (BARRAS HORIZONTALES)
    // =============================================
    _dibujarGraficaSucursales(pdf, titulo, datos, x, y, ancho, alto) {
        // Contenedor
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');

        // Título
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(26, 59, 93);
        pdf.text(titulo, x + 5, y + 9);

        // Calcular valores
        const maxValor = Math.max(...datos.map(d => d.cantidad));
        const anchoMaxBarra = ancho - 65;
        const altoFila = (alto - 35) / Math.min(datos.length, 5);

        const color = '#14b8a6';
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        for (let i = 0; i < Math.min(datos.length, 5); i++) {
            const dato = datos[i];
            const anchoBarra = maxValor > 0 ? (dato.cantidad / maxValor) * anchoMaxBarra : 0;
            const yFila = y + 18 + (i * (altoFila + 3));

            // Nombre
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(80, 80, 80);
            const nombre = dato.nombre.length > 15 ? dato.nombre.substring(0, 12) + '...' : dato.nombre;
            pdf.text(nombre, x + 8, yFila + 4);

            // Barra
            pdf.setFillColor(r, g, b);
            pdf.rect(x + 50, yFila, anchoBarra, 8, 'F');

            // Valor
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(26, 59, 93);
            pdf.text(dato.cantidad.toString(), x + 50 + anchoBarra + 5, yFila + 5);
        }
    }

    // =============================================
    // DIBUJAR GRÁFICA DE TIEMPO (BARRAS VERTICALES)
    // =============================================
    _dibujarGraficaBarrasTiempo(pdf, titulo, datos, x, y, ancho, alto, color) {
        // Contenedor
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');

        // Título
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(26, 59, 93);
        pdf.text(titulo, x + 5, y + 9);

        // Calcular valores
        const maxValor = Math.max(...datos.map(d => d.promedio || 0));
        const anchoBarra = (ancho - 50) / Math.min(datos.length, 6);
        const baseY = y + alto - 20;

        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        for (let i = 0; i < Math.min(datos.length, 6); i++) {
            const dato = datos[i];
            const valor = dato.promedio || 0;
            const alturaBarra = maxValor > 0 ? (valor / maxValor) * (alto - 45) : 0;
            const xBarra = x + 25 + (i * (anchoBarra + 10));

            // Barra
            pdf.setFillColor(r, g, b);
            pdf.rect(xBarra, baseY - alturaBarra, anchoBarra - 2, alturaBarra, 'F');

            // Valor
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(26, 59, 93);
            pdf.text(valor + 'h', xBarra + 2, baseY - alturaBarra - 3);

            // Nombre
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(80, 80, 80);
            const nombre = dato.nombre.length > 12 ? dato.nombre.substring(0, 10) + '...' : dato.nombre;
            pdf.text(nombre, xBarra + 2, baseY + 8);
        }
    }

    // =============================================
    // DIBUJAR GRÁFICA DE DESEMPEÑO DE COLABORADORES
    // =============================================
    _dibujarGraficaDesempenoColaboradores(pdf, colaboradores, x, y, ancho, alto) {
        // Contenedor
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');

        // Título
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Actividad por Colaborador', x + 5, y + 9);

        // Calcular valores
        const maxValor = Math.max(...colaboradores.map(c =>
            Math.max(c.reportados || 0, c.actualizados || 0, c.seguimientos || 0)
        ));

        const anchoGrupo = (ancho - 50) / Math.min(colaboradores.length, 6);
        const anchoBarra = (anchoGrupo - 10) / 3;
        const baseY = y + alto - 25;

        const colores = [
            [59, 130, 246],   // Reportados - Azul
            [16, 185, 129],   // Actualizados - Verde
            [249, 115, 22]    // Seguimientos - Naranja
        ];

        for (let i = 0; i < Math.min(colaboradores.length, 6); i++) {
            const col = colaboradores[i];
            const xGrupo = x + 25 + (i * anchoGrupo);

            // Barra de Reportados
            const alturaReportados = maxValor > 0 ? ((col.reportados || 0) / maxValor) * (alto - 55) : 0;
            pdf.setFillColor(colores[0][0], colores[0][1], colores[0][2]);
            pdf.rect(xGrupo, baseY - alturaReportados, anchoBarra, alturaReportados, 'F');

            // Barra de Actualizados
            const alturaActualizados = maxValor > 0 ? ((col.actualizados || 0) / maxValor) * (alto - 55) : 0;
            pdf.setFillColor(colores[1][0], colores[1][1], colores[1][2]);
            pdf.rect(xGrupo + anchoBarra + 4, baseY - alturaActualizados, anchoBarra, alturaActualizados, 'F');

            // Barra de Seguimientos
            const alturaSeguimientos = maxValor > 0 ? ((col.seguimientos || 0) / maxValor) * (alto - 55) : 0;
            pdf.setFillColor(colores[2][0], colores[2][1], colores[2][2]);
            pdf.rect(xGrupo + (anchoBarra + 4) * 2, baseY - alturaSeguimientos, anchoBarra, alturaSeguimientos, 'F');

            // Nombre del colaborador
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(51, 51, 51);
            const nombre = col.nombre.length > 12 ? col.nombre.substring(0, 10) + '...' : col.nombre;
            pdf.text(nombre, xGrupo + anchoGrupo / 2, baseY + 12, { align: 'center' });
        }

        // Leyenda
        const yLeyenda = y + alto - 8;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(51, 51, 51);

        pdf.setFillColor(colores[0][0], colores[0][1], colores[0][2]);
        pdf.rect(x + 15, yLeyenda - 5, 5, 5, 'F');
        pdf.text('Reportes', x + 25, yLeyenda - 1);

        pdf.setFillColor(colores[1][0], colores[1][1], colores[1][2]);
        pdf.rect(x + 55, yLeyenda - 5, 5, 5, 'F');
        pdf.text('Actualiza', x + 65, yLeyenda - 1);

        pdf.setFillColor(colores[2][0], colores[2][1], colores[2][2]);
        pdf.rect(x + 95, yLeyenda - 5, 5, 5, 'F');
        pdf.text('Seguimientos', x + 105, yLeyenda - 1);
    }

    // =============================================
    // DIBUJAR GRÁFICA VACÍA
    // =============================================
    _dibujarGraficaVacia(pdf, mensaje, x, y, ancho, alto) {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(mensaje, x + ancho / 2, y + alto / 2, { align: 'center' });
    }

    // =============================================
    // UTILIDADES
    // =============================================
    _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

export const generadorPDFEstadisticas = new PDFEstadisticasGenerator();
export default generadorPDFEstadisticas;