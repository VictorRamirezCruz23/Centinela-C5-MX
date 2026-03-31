// EstadisticasExtraviosPDF.js
// Componente para generar PDF del dashboard de Pérdidas y Recuperaciones
// VERSIÓN: 1.3 - CORREGIDO ERROR DE COLOR Y MOSTRARALERTA

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

// =============================================
// CONFIGURACIÓN DE COLORES PARA ESTADÍSTICAS DE EXTRAVÍOS
// =============================================
export const coloresExtravios = {
    ...coloresBase,
    graficas: {
        perdidas: '#ef4444',
        recuperaciones: '#10b981',
        neto: '#f59e0b',
        porcentaje: '#3b82f6',
        eventos: '#8b5cf6',
        promedio: '#ec4899',
        robo: '#ef4444',
        extravio: '#f59e0b',
        accidente: '#3b82f6',
        otro: '#8b5cf6',
        topSucursales: '#3b82f6'  // Color azul para destacar la gráfica
    }
};

// =============================================
// CLASE PDF ESTADÍSTICAS EXTRAVÍOS GENERATOR
// =============================================
class EstadisticasExtraviosPDFGenerator extends PDFBaseGenerator {
    constructor() {
        super();
        this.datos = null;
        this.estadisticas = null;
        this.registros = [];
        this.sucursales = [];
        this.filtrosAplicados = {};
        this.fechaInicio = null;
        this.fechaFin = null;
        this.tipoEvento = null;

        // Captura de gráficas como imágenes (alta calidad)
        this.graficasCapturadas = {
            tipoEvento: null,
            evolucionMensual: null,
            topSucursales: null,
            comparativa: null
        };

        // Tamaños de fuente optimizados
        this.fonts = {
            tituloPrincipal: 16,
            titulo: 14,
            subtitulo: 12,
            normal: 10,
            small: 9,
            mini: 8,
            micro: 7
        };
        
        // Alturas ajustadas para gráficas
        this.alturaGrafica = 70;
        this.alturaEncabezado = 42;
    }

    // =============================================
    // CAPTURAR GRÁFICAS COMO IMÁGENES (ALTA CALIDAD)
    // =============================================
    async capturarGraficas() {
        const canvasIds = [
            { id: 'graficoTipoEvento', key: 'tipoEvento' },
            { id: 'graficoEvolucionMensual', key: 'evolucionMensual' },
            { id: 'graficoTopSucursales', key: 'topSucursales' },
            { id: 'graficoComparativa', key: 'comparativa' }
        ];

        for (const item of canvasIds) {
            const canvas = document.getElementById(item.id);
            if (canvas && canvas instanceof HTMLCanvasElement) {
                try {
                    // Capturar con mayor calidad (usar 2x para mejor resolución)
                    const scale = 2;
                    const originalWidth = canvas.width;
                    const originalHeight = canvas.height;
                    
                    // Crear canvas temporal de alta resolución
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = originalWidth * scale;
                    tempCanvas.height = originalHeight * scale;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    // Dibujar el canvas original escalado
                    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
                    
                    // Convertir a dataURL con calidad alta
                    const dataURL = tempCanvas.toDataURL('image/png', 1.0);
                    this.graficasCapturadas[item.key] = dataURL;
                } catch (error) {
                    console.error(`Error capturando gráfica ${item.id}:`, error);
                    this.graficasCapturadas[item.key] = null;
                }
            } else {
                this.graficasCapturadas[item.key] = null;
            }
        }
    }

    // =============================================
    // CONFIGURAR DATOS PARA EL REPORTE
    // =============================================
    configurarDatos(datos) {
        this.datos = datos;
        this.estadisticas = datos.estadisticas;
        this.registros = datos.registros || [];
        this.sucursales = datos.sucursalesResumen || [];
        
        if (datos.filtros) {
            this.filtrosAplicados = datos.filtros;
            this.fechaInicio = datos.filtros.fechaInicio;
            this.fechaFin = datos.filtros.fechaFin;
            this.tipoEvento = datos.filtros.tipoEvento;
        }
    }

    // =============================================
    // FUNCIÓN PRINCIPAL - GENERAR REPORTE
    // =============================================
    async generarReporte(datos, opciones = {}) {
        try {
            const {
                mostrarAlerta = true,
                tituloPersonalizado = 'REPORTE DE PÉRDIDAS Y RECUPERACIONES'
            } = opciones;

            this.configurarDatos(datos);

            if (mostrarAlerta) {
                Swal.fire({
                    title: 'Generando Reporte PDF...',
                    html: `
                        <div style="margin-bottom: 10px;">
                            <i class="fas fa-chart-line" style="font-size: 32px; color: #c9a03d;"></i>
                        </div>
                        <div class="progress-bar-container" style="width:100%; height:20px; background:rgba(0,0,0,0.1); border-radius:10px; margin-top:10px;">
                            <div class="progress-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #1a3b5d, #c9a03d); border-radius:10px; transition:width 0.3s;"></div>
                        </div>
                        <p style="margin-top: 12px; color: #666;">Procesando datos y capturando gráficas...</p>
                    `,
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    didOpen: () => {
                        let progreso = 0;
                        const intervalo = setInterval(() => {
                            progreso += 5;
                            if (progreso <= 80) {
                                const barra = document.querySelector('.progress-bar');
                                if (barra) barra.style.width = progreso + '%';
                            }
                        }, 150);
                        window._intervaloProgreso = intervalo;
                    }
                });
            }

            await this.capturarGraficas();
            await this.cargarLibrerias();
            await this.cargarLogoCentinela();
            await this.cargarLogoOrganizacion();

            if (mostrarAlerta && window._intervaloProgreso) {
                clearInterval(window._intervaloProgreso);
                const barra = document.querySelector('.progress-bar');
                if (barra) barra.style.width = '85%';
            }

            const pdf = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            this.totalPaginas = 2;
            this.paginaActualReal = 1;

            await this._generarContenido(pdf, tituloPersonalizado);

            const fechaStr = this.formatearFechaArchivo();
            const nombreArchivo = `PERDIDAS_RECUPERACIONES_${this.organizacionActual?.nombre || 'organizacion'}_${fechaStr}.pdf`;

            if (mostrarAlerta) {
                if (window._intervaloProgreso) clearInterval(window._intervaloProgreso);
                Swal.close();
                await this.mostrarOpcionesDescarga(pdf, nombreArchivo);
            }

            return pdf;

        } catch (error) {
            console.error('Error generando reporte:', error);
            if (window._intervaloProgreso) clearInterval(window._intervaloProgreso);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo generar el reporte: ' + error.message,
                    confirmButtonText: 'Entendido'
                });
            }
            throw error;
        }
    }

    // =============================================
    // GENERAR CONTENIDO DEL PDF
    // =============================================
    async _generarContenido(pdf, tituloPersonalizado) {
        const margen = 12;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 5;

        // =============================================
        // PÁGINA 1
        // =============================================

        this.dibujarEncabezadoBase(
            pdf,
            tituloPersonalizado,
            this.organizacionActual?.nombre || 'SISTEMA CENTINELA'
        );

        yPos = this._dibujarInformacionFiltros(pdf, margen, anchoContenido, yPos);
        yPos = this._dibujarKPIs(pdf, margen, anchoContenido, yPos);
        yPos += 5;

        // Gráfica 1: Distribución por tipo de evento
        if (this.graficasCapturadas.tipoEvento) {
            yPos = this._dibujarGraficaConTitulo(pdf, 'DISTRIBUCIÓN POR TIPO DE EVENTO', 
                this.graficasCapturadas.tipoEvento, margen, anchoContenido, yPos, this.alturaGrafica);
        } else {
            yPos = this._dibujarGraficaVaciaConTitulo(pdf, 'DISTRIBUCIÓN POR TIPO DE EVENTO',
                'Sin datos de tipo de evento', margen, anchoContenido, yPos, this.alturaGrafica);
        }
        yPos += 3;

        // Gráfica 2: Evolución mensual
        if (this.graficasCapturadas.evolucionMensual) {
            yPos = this._dibujarGraficaConTitulo(pdf, 'EVOLUCIÓN MENSUAL',
                this.graficasCapturadas.evolucionMensual, margen, anchoContenido, yPos, this.alturaGrafica);
        } else {
            yPos = this._dibujarGraficaVaciaConTitulo(pdf, 'EVOLUCIÓN MENSUAL',
                'Sin datos de evolución mensual', margen, anchoContenido, yPos, this.alturaGrafica);
        }

        this.dibujarPiePagina(pdf);

        // =============================================
        // PÁGINA 2
        // =============================================
        pdf.addPage();
        this.paginaActualReal++;
        this.dibujarEncabezadoBase(pdf, tituloPersonalizado, 'CONTINUACIÓN');
        yPos = this.alturaEncabezado + 5;

        // Gráfica 3: Top sucursales con más pérdidas (CON COLOR PERSONALIZADO)
        if (this.graficasCapturadas.topSucursales) {
            yPos = this._dibujarGraficaConTituloColor(pdf, 'TOP SUCURSALES CON MÁS PÉRDIDAS',
                this.graficasCapturadas.topSucursales, margen, anchoContenido, yPos, this.alturaGrafica,
                coloresExtravios.graficas.topSucursales);
        } else {
            yPos = this._dibujarGraficaVaciaConTitulo(pdf, 'TOP SUCURSALES CON MÁS PÉRDIDAS',
                'Sin datos de sucursales', margen, anchoContenido, yPos, this.alturaGrafica);
        }
        yPos += 3;

        // Gráfica 4: Pérdida vs Recuperación
        if (this.graficasCapturadas.comparativa) {
            yPos = this._dibujarGraficaConTitulo(pdf, 'PÉRDIDA VS RECUPERACIÓN',
                this.graficasCapturadas.comparativa, margen, anchoContenido, yPos, this.alturaGrafica);
        } else {
            yPos = this._dibujarGraficaVaciaConTitulo(pdf, 'PÉRDIDA VS RECUPERACIÓN',
                'Sin datos comparativos', margen, anchoContenido, yPos, this.alturaGrafica);
        }
        yPos += 5;

        // Tabla de resumen por sucursal
        if (this.sucursales && this.sucursales.length > 0) {
            yPos = this._dibujarTablaResumen(pdf, margen, anchoContenido, yPos);
        } else {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(this.fonts.small);
            pdf.setTextColor(150, 150, 150);
            pdf.text('No hay datos de sucursales para mostrar', margen, yPos);
        }

        this.dibujarPiePagina(pdf);
    }

    // =============================================
    // DIBUJAR INFORMACIÓN DE FILTROS
    // =============================================
    _dibujarInformacionFiltros(pdf, margen, anchoContenido, yPos) {
        pdf.setFillColor(245, 245, 245);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(margen, yPos - 2, anchoContenido, 22, 2, 2, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.normal);
        pdf.setTextColor(26, 59, 93);
        pdf.text('FILTROS APLICADOS', margen + 5, yPos);
        yPos += 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(80, 80, 80);

        let filtroText = '';

        if (this.fechaInicio && this.fechaFin) {
            filtroText += `Período: ${this.formatearFechaVisualizacion(new Date(this.fechaInicio))} al ${this.formatearFechaVisualizacion(new Date(this.fechaFin))} | `;
        } else {
            filtroText += 'Período: Todo el historial | ';
        }

        if (this.filtrosAplicados.sucursal && this.filtrosAplicados.sucursal !== 'todas') {
            filtroText += `Sucursal: ${this.filtrosAplicados.sucursal} | `;
        } else {
            filtroText += 'Sucursal: Todas | ';
        }

        if (this.tipoEvento && this.tipoEvento !== 'todos') {
            filtroText += `Tipo: ${this._capitalize(this.tipoEvento)}`;
        } else {
            filtroText += 'Tipo: Todos';
        }

        const lineas = this.dividirTextoEnLineas(pdf, filtroText, anchoContenido - 10);
        for (let i = 0; i < Math.min(lineas.length, 2); i++) {
            pdf.text(lineas[i], margen + 5, yPos + (i * 4));
        }

        return yPos + 18;
    }

    // =============================================
    // DIBUJAR KPI CARDS
    // =============================================
    _dibujarKPIs(pdf, margen, anchoContenido, yPos) {
        if (!this.estadisticas) return yPos;

        const anchoKPI = (anchoContenido - 15) / 3;
        const espacioKPI = 7.5;

        const kpis = [
            { 
                titulo: 'Total Perdido', 
                valor: this.estadisticas.totalPerdido,
                color: [239, 68, 68],
                icono: '💰'
            },
            { 
                titulo: 'Total Recuperado', 
                valor: this.estadisticas.totalRecuperado,
                color: [16, 185, 129],
                icono: '🔄'
            },
            { 
                titulo: 'Pérdida Neta', 
                valor: this.estadisticas.totalNeto,
                color: [245, 158, 11],
                icono: '📊'
            },
            { 
                titulo: 'Tasa Recuperación', 
                valor: this.estadisticas.porcentajeRecuperacion,
                esPorcentaje: true,
                color: [59, 130, 246],
                icono: '📈'
            },
            { 
                titulo: 'Total Eventos', 
                valor: this.estadisticas.totalEventos,
                color: [139, 92, 246],
                icono: '📋'
            },
            { 
                titulo: 'Promedio por Evento', 
                valor: this.estadisticas.promedioPerdida,
                color: [236, 72, 153],
                icono: '⚖️'
            }
        ];

        const formatter = new Intl.NumberFormat('es-MX', { 
            style: 'currency', 
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

        for (let i = 0; i < kpis.length; i++) {
            const kpi = kpis[i];
            const columna = i % 3;
            const fila = Math.floor(i / 3);
            const xKPI = margen + (columna * (anchoKPI + espacioKPI));
            const yKPI = yPos + (fila * 32);

            pdf.setFillColor(248, 248, 248);
            pdf.setDrawColor(220, 220, 220);
            pdf.roundedRect(xKPI, yKPI, anchoKPI, 30, 3, 3, 'FD');

            pdf.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            pdf.rect(xKPI, yKPI, anchoKPI, 3, 'F');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(80, 80, 80);
            pdf.text(`${kpi.icono} ${kpi.titulo}`, xKPI + 6, yKPI + 10);

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);

            let valorTexto;
            if (kpi.esPorcentaje) {
                valorTexto = `${kpi.valor.toFixed(2)}%`;
            } else if (typeof kpi.valor === 'number') {
                if (kpi.titulo.includes('Eventos') || kpi.titulo === 'Total Eventos') {
                    valorTexto = kpi.valor.toLocaleString('es-MX');
                } else {
                    valorTexto = formatter.format(kpi.valor);
                }
            } else {
                valorTexto = kpi.valor;
            }

            pdf.text(valorTexto, xKPI + 6, yKPI + 24);
        }

        return yPos + 66;
    }

    // =============================================
    // DIBUJAR GRÁFICA CON TÍTULO (VERSIÓN NORMAL)
    // =============================================
    _dibujarGraficaConTitulo(pdf, titulo, imagenDataURL, x, anchoContenido, y, altura) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text(titulo, x, y);
        y += 5;

        pdf.setDrawColor(201, 160, 61);
        pdf.setLineWidth(0.5);
        pdf.line(x, y - 1, x + 60, y - 1);

        const anchoGrafica = anchoContenido;
        const alturaGrafica = altura;

        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, anchoGrafica, alturaGrafica, 2, 2, 'FD');

        if (imagenDataURL) {
            try {
                pdf.addImage(
                    imagenDataURL,
                    'PNG',
                    x + 2,
                    y + 2,
                    anchoGrafica - 4,
                    alturaGrafica - 4
                );
            } catch (error) {
                console.error('Error agregando gráfica:', error);
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text('Error al cargar la gráfica', x + anchoGrafica / 2, y + alturaGrafica / 2, { align: 'center' });
            }
        }

        return y + alturaGrafica + 3;
    }

    // =============================================
    // DIBUJAR GRÁFICA CON TÍTULO Y COLOR PERSONALIZADO (Para Top Sucursales)
    // =============================================
    _dibujarGraficaConTituloColor(pdf, titulo, imagenDataURL, x, anchoContenido, y, altura, colorHex) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text(titulo, x, y);
        y += 5;

        // Línea decorativa con color personalizado - usar el string hex directamente
        pdf.setDrawColor(colorHex);
        pdf.setLineWidth(0.8);
        pdf.line(x, y - 1, x + 60, y - 1);

        const anchoGrafica = anchoContenido;
        const alturaGrafica = altura;

        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, anchoGrafica, alturaGrafica, 2, 2, 'FD');

        if (imagenDataURL) {
            try {
                pdf.addImage(
                    imagenDataURL,
                    'PNG',
                    x + 2,
                    y + 2,
                    anchoGrafica - 4,
                    alturaGrafica - 4
                );
            } catch (error) {
                console.error('Error agregando gráfica:', error);
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text('Error al cargar la gráfica', x + anchoGrafica / 2, y + alturaGrafica / 2, { align: 'center' });
            }
        }

        return y + alturaGrafica + 3;
    }

    // =============================================
    // DIBUJAR GRÁFICA VACÍA CON TÍTULO
    // =============================================
    _dibujarGraficaVaciaConTitulo(pdf, titulo, mensaje, x, anchoContenido, y, altura) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text(titulo, x, y);
        y += 5;

        pdf.setDrawColor(201, 160, 61);
        pdf.setLineWidth(0.5);
        pdf.line(x, y - 1, x + 60, y - 1);

        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, anchoContenido, altura, 2, 2, 'FD');

        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(mensaje, x + anchoContenido / 2, y + altura / 2, { align: 'center' });

        return y + altura + 3;
    }

    // =============================================
    // DIBUJAR TABLA DE RESUMEN
    // =============================================
    _dibujarTablaResumen(pdf, margen, anchoContenido, yPos) {
        if (!this.sucursales || this.sucursales.length === 0) return yPos;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.subtitulo);
        pdf.setTextColor(26, 59, 93);
        pdf.text('RESUMEN POR SUCURSAL', margen, yPos);
        yPos += 5;

        pdf.setDrawColor(201, 160, 61);
        pdf.setLineWidth(0.5);
        pdf.line(margen, yPos - 1, margen + 70, yPos - 1);
        yPos += 6;

        const colAnchos = {
            sucursal: 50,
            eventos: 20,
            perdido: 32,
            recuperado: 32,
            neto: 32,
            porcentaje: 24
        };

        const xInicio = margen;
        let xActual = xInicio;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.micro);
        pdf.setTextColor(26, 59, 93);
        pdf.setFillColor(240, 240, 240);
        pdf.rect(xInicio, yPos - 2, anchoContenido, 7, 'F');

        const headers = [
            { text: 'Sucursal', width: colAnchos.sucursal },
            { text: 'Eventos', width: colAnchos.eventos, align: 'center' },
            { text: 'Perdido', width: colAnchos.perdido, align: 'right' },
            { text: 'Recuperado', width: colAnchos.recuperado, align: 'right' },
            { text: 'Pérdida Neta', width: colAnchos.neto, align: 'right' },
            { text: '% Rec.', width: colAnchos.porcentaje, align: 'center' }
        ];

        for (const header of headers) {
            pdf.text(header.text, xActual + (header.align === 'center' ? header.width / 2 : header.align === 'right' ? header.width - 2 : 2), yPos, { align: header.align || 'left' });
            xActual += header.width;
        }
        yPos += 6;

        const formatter = new Intl.NumberFormat('es-MX', { 
            style: 'currency', 
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.micro);

        const maxFilas = Math.min(this.sucursales.length, 8);
        
        for (let i = 0; i < maxFilas; i++) {
            const suc = this.sucursales[i];
            xActual = xInicio;

            if (yPos > 265) {
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(this.fonts.micro);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`... y ${this.sucursales.length - i} sucursales más`, margen, yPos);
                yPos += 5;
                break;
            }

            const nombreSuc = suc.nombre && suc.nombre.length > 22 ? suc.nombre.substring(0, 19) + '...' : (suc.nombre || 'N/A');
            pdf.text(nombreSuc, xActual + 2, yPos);
            xActual += colAnchos.sucursal;

            pdf.text(suc.eventos?.toString() || '0', xActual + colAnchos.eventos / 2, yPos, { align: 'center' });
            xActual += colAnchos.eventos;

            const perdido = suc.perdido || 0;
            pdf.setTextColor(239, 68, 68);
            pdf.text(formatter.format(perdido), xActual + colAnchos.perdido - 2, yPos, { align: 'right' });
            xActual += colAnchos.perdido;

            const recuperado = suc.recuperado || 0;
            pdf.setTextColor(16, 185, 129);
            pdf.text(formatter.format(recuperado), xActual + colAnchos.recuperado - 2, yPos, { align: 'right' });
            xActual += colAnchos.recuperado;

            const neto = (perdido - recuperado);
            pdf.setTextColor(neto > 0 ? 239 : 16, neto > 0 ? 68 : 185, neto > 0 ? 68 : 129);
            pdf.text(formatter.format(neto), xActual + colAnchos.neto - 2, yPos, { align: 'right' });
            xActual += colAnchos.neto;

            const porcentaje = suc.porcentaje || 0;
            pdf.setTextColor(59, 130, 246);
            pdf.text(`${porcentaje.toFixed(2)}%`, xActual + colAnchos.porcentaje / 2, yPos, { align: 'center' });
            
            yPos += 5;
        }

        pdf.setTextColor(80, 80, 80);

        if (this.sucursales.length > maxFilas) {
            yPos += 2;
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(this.fonts.micro);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`... y ${this.sucursales.length - maxFilas} sucursales más`, margen, yPos);
            yPos += 5;
        }

        return yPos + 5;
    }

    // =============================================
    // DIBUJAR ENCABEZADO
    // =============================================
    dibujarEncabezadoBase(pdf, titulo, subtitulo) {
        const margen = 12;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const dimensiones = this.dimensionesLogo;
        const radio = dimensiones.diametro / 2;

        pdf.saveGraphicsState();

        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, anchoPagina, this.alturaEncabezado, 'F');

        pdf.setDrawColor(coloresBase.primario);
        pdf.setFillColor(coloresBase.primario);
        pdf.rect(0, 0, anchoPagina, 3, 'F');

        const yLogo = 20;
        const xLogoDerecha = anchoPagina - margen - (dimensiones.diametro * 2) - dimensiones.separacion;
        const xCentinela = xLogoDerecha;
        const xOrganizacion = xCentinela + dimensiones.diametro + dimensiones.separacion;

        this._dibujarLogos(pdf, xCentinela, xOrganizacion, yLogo, radio);

        pdf.setTextColor(coloresBase.primario);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(this.fonts.titulo);
        pdf.text(titulo, anchoPagina / 2, 16, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.small);
        pdf.setTextColor(coloresBase.textoClaro);
        pdf.text(subtitulo, anchoPagina / 2, 23, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(this.fonts.micro);
        pdf.setTextColor(coloresBase.textoClaro);
        pdf.text(`Generado: ${this.formatearFecha(new Date())}`, margen, 29);

        pdf.setDrawColor(coloresBase.secundario);
        pdf.setLineWidth(0.5);
        pdf.line(margen, this.alturaEncabezado - 2, anchoPagina - margen, this.alturaEncabezado - 2);

        pdf.restoreGraphicsState();
    }

    // =============================================
    // DIBUJAR PIE DE PÁGINA
    // =============================================
    dibujarPiePagina(pdf) {
        const margen = 12;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const altoPagina = pdf.internal.pageSize.getHeight();
        const alturaPie = 12;
        const yPos = altoPagina - alturaPie - 1;

        pdf.saveGraphicsState();
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, yPos - 2, anchoPagina, alturaPie + 3, 'F');
        
        pdf.setDrawColor(coloresBase.secundario);
        pdf.setLineWidth(0.3);
        pdf.line(margen, yPos, anchoPagina - margen, yPos);
        
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(this.fonts.micro);
        pdf.setTextColor(coloresBase.textoClaro);
        pdf.text('Reporte Generado con Sistema Centinela', margen, yPos + 4);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(coloresBase.textoClaro);
        pdf.text(`Página ${this.paginaActualReal} de ${this.totalPaginas}`, anchoPagina - margen, yPos + 4, { align: 'right' });
        
        pdf.setDrawColor(coloresBase.primario);
        pdf.setFillColor(coloresBase.primario);
        pdf.rect(0, altoPagina - 2, anchoPagina, 2, 'F');
        
        pdf.restoreGraphicsState();
    }

    // =============================================
    // UTILIDADES
    // =============================================
    _capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
}

// =============================================
// EXPORTAR INSTANCIA GLOBAL
// =============================================
export const generadorPDFEstadisticasExtravios = new EstadisticasExtraviosPDFGenerator();
export default generadorPDFEstadisticasExtravios;