/**
 * GENERADOR PDF BITÁCORA - Sistema Centinela
 * VERSIÓN: 4.1 - SIN ÍCONOS QUE CAUSAN SÍMBOLOS EXTRAÑOS
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

// =============================================
// CONFIGURACIÓN DE COLORES PARA BITÁCORA
// =============================================
export const coloresBitacora = {
    ...coloresBase,
    actividad: '#00cfff'
};

// =============================================
// CLASE GENERADOR PDF BITÁCORA
// =============================================
class GeneradorPDFBitacora extends PDFBaseGenerator {
    constructor() {
        super();

        this.usuarioActual = null;
        this.actividades = [];
        this.fechaSeleccionada = null;
        this.organizacionNombre = '';
        this.baseUrl = window.location.origin;
        
        this.pdfUrlsCache = new Map();

        this.fonts = {
            tituloPrincipal: 18,
            titulo: 16,
            subtitulo: 14,
            normal: 11,
            small: 10,
            mini: 9,
            micro: 8
        };
    }

    configurar(config) {
        if (config.usuarioActual) this.usuarioActual = config.usuarioActual;
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.organizacionNombre) this.organizacionNombre = config.organizacionNombre;
        if (config.authToken) this.authToken = config.authToken;
    }

    async cargarLibrerias() {
        try {
            if (!window.jspdf) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            }

            if (!window.jspdf?.autoTable) {
                await this.cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.29/jspdf.plugin.autotable.min.js');
            }

            this.jsPDF = window.jspdf?.jsPDF;
            if (!this.jsPDF) throw new Error('No se pudo cargar jsPDF');

            return true;
        } catch (error) {
            console.error('Error cargando librerías:', error);
            throw error;
        }
    }

    async _obtenerPdfUrl(incidenciaId, organizacion) {
        if (this.pdfUrlsCache.has(incidenciaId)) {
            return this.pdfUrlsCache.get(incidenciaId);
        }
        
        try {
            const { IncidenciaManager } = await import('/clases/incidencia.js');
            const incidenciaManager = new IncidenciaManager();
            
            const incidencia = await incidenciaManager.getIncidenciaById(incidenciaId, organizacion);
            if (incidencia && incidencia.pdfUrl) {
                this.pdfUrlsCache.set(incidenciaId, incidencia.pdfUrl);
                return incidencia.pdfUrl;
            }
        } catch (error) {
            console.warn(`No se pudo obtener PDF para ${incidenciaId}:`, error);
        }
        
        return null;
    }

    async generarBitacoraPDF(actividades, fecha, opciones = {}) {
        const startTime = performance.now();
        const { mostrarAlerta = true } = opciones;

        try {
            if (mostrarAlerta) {
                Swal.fire({
                    title: 'Generando PDF...',
                    text: 'Procesando información...',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });
            }

            const organizacion = this.usuarioActual?.organizacionCamelCase || this.organizacionActual?.camelCase;
            
            const incidenciasIds = new Set();
            const actividadesLimpia = [];
            
            for (const act of actividades) {
                const actLimpia = { ...act };
                
                const incidenciaId = this._extraerIdIncidencia(actLimpia.descripcion || '');
                if (incidenciaId) {
                    incidenciasIds.add(incidenciaId);
                }
                
                actividadesLimpia.push(actLimpia);
            }
            
            const pdfUrlsPromises = Array.from(incidenciasIds).map(async (id) => {
                const url = await this._obtenerPdfUrl(id, organizacion);
                return { id, url };
            });
            
            const pdfUrlsResults = await Promise.all(pdfUrlsPromises);
            pdfUrlsResults.forEach(({ id, url }) => {
                if (url) {
                    this.pdfUrlsCache.set(id, url);
                }
            });

            await Promise.all([
                this.cargarLibrerias(),
                this.cargarLogoCentinela(),
                this.cargarLogoOrganizacion()
            ]);

            this.actividades = actividadesLimpia;
            this.fechaSeleccionada = fecha;

            const pdf = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            this._generarBitacoraDia(pdf, actividadesLimpia, fecha);

            const fechaStr = this._formatearFechaArchivo(fecha);
            const nombreArchivo = `bitacora_${fechaStr}.pdf`;

            const endTime = performance.now();
            console.log(`⏱️ PDF generado en ${(endTime - startTime).toFixed(0)}ms`);

            if (mostrarAlerta) {
                Swal.close();
                await this.mostrarOpcionesDescarga(pdf, nombreArchivo);
            }

            return pdf;

        } catch (error) {
            console.error('Error generando bitácora PDF:', error);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo generar la bitácora: ' + error.message,
                    confirmButtonColor: '#00cfff'
                });
            }
            throw error;
        }
    }

    _generarBitacoraDia(pdf, actividades, fecha) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);

        this.paginaActualReal = 1;
        this.totalPaginas = Math.max(1, Math.ceil(actividades.length / 15));

        const fechaFormateada = fecha.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const fechaActual = new Date();
        const fechaActualFormateada = fechaActual.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        this.dibujarEncabezadoBase(
            pdf,
            'BITÁCORA DE ACTIVIDADES',
            this.organizacionActual?.nombre || 'SISTEMA CENTINELA'
        );

        let yPos = this.alturaEncabezado + 5;

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(margen, yPos - 3, anchoContenido, 22, 2, 2, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text('FECHA CONSULTADA', margen + 5, yPos);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(fechaFormateada.substring(0, 35), margen + 5, yPos + 5);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`TOTAL: ${actividades.length}`, margen + 5, yPos + 10);
        
        const usuarioNombre = this.usuarioActual?.nombreCompleto || 'No especificado';
        const anchoMitad = anchoContenido / 2;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text('USUARIO', margen + anchoMitad + 5, yPos);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        const usuarioTruncado = usuarioNombre.length > 25 ? usuarioNombre.substring(0, 22) + '...' : usuarioNombre;
        pdf.text(usuarioTruncado, margen + anchoMitad + 5, yPos + 5);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text('PDF GENERADO', margen + anchoMitad + 5, yPos + 10);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 100, 100);
        pdf.text(fechaActualFormateada, margen + anchoMitad + 5, yPos + 15);

        yPos = this.alturaEncabezado + 5 + 28;

        if (actividades.length === 0) {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(11);
            pdf.setTextColor(150, 150, 150);
            pdf.text('No hay actividades registradas para esta fecha', anchoPagina / 2, yPos + 20, { align: 'center' });
        } else {
            this._dibujarTablaActividades(pdf, actividades, margen, yPos, anchoContenido);
        }

        this.dibujarPiePagina(pdf);
    }

    _extraerIdIncidencia(descripcion) {
        if (!descripcion) return null;
        const patron = /INC-\d{8}-\d{6}/i;
        const match = descripcion.match(patron);
        return match ? match[0] : null;
    }

    _extraerHora(fecha) {
        if (!fecha) return '--:--';
        try {
            const fechaObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
            return fechaObj.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return '--:--';
        }
    }

    _dibujarTablaActividades(pdf, actividades, margen, yInicio, anchoContenido) {
        const headers = [['Hora', 'Módulo', 'Tipo', 'Descripción']];
        const columnWidths = [18, 28, 22, anchoContenido - 68];

        const actividadesOrdenadas = [...actividades].sort((a, b) => {
            const fechaA = a.fecha ? (a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha)) : new Date(0);
            const fechaB = b.fecha ? (b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha)) : new Date(0);
            return fechaA - fechaB;
        });

        const filasConLinks = [];
        
        actividadesOrdenadas.forEach(act => {
            const uiData = act.toUI ? act.toUI() : this._extraerUIData(act);
            let descripcion = uiData.descripcion || 'Sin descripción';
            
            const incidenciaId = this._extraerIdIncidencia(descripcion);
            const pdfUrl = incidenciaId ? this.pdfUrlsCache.get(incidenciaId) : null;
            const tienePDF = !!pdfUrl;
            
            const textoColor = tienePDF ? [41, 98, 255] : [40, 40, 40];
            
            filasConLinks.push({
                data: [
                    uiData.hora || '--:--',
                    uiData.modulo || 'N/A',
                    uiData.tipo || 'N/A',
                    {
                        content: descripcion,
                        styles: { textColor: textoColor }
                    }
                ],
                incidenciaId: incidenciaId,
                pdfUrl: pdfUrl,
                tienePDF: tienePDF
            });
        });

        pdf.autoTable({
            startY: yInicio,
            head: headers,
            body: filasConLinks.map(f => f.data),
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 4,
                lineColor: [200, 200, 200],
                lineWidth: 0.1,
                cellWidth: 'wrap',
                minCellHeight: 10,
                valign: 'middle'
            },
            headStyles: {
                fillColor: [41, 98, 255],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: columnWidths[0], halign: 'center' },
                1: { cellWidth: columnWidths[1], halign: 'left' },
                2: { cellWidth: columnWidths[2], halign: 'center' },
                3: { cellWidth: columnWidths[3], halign: 'left' }
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { left: margen, right: margen },
            didDrawCell: (data) => {
                // SOLO agregar el enlace, NO el ícono que causa el problema
                if (data.column.index === 3) {
                    const filaIndex = data.row.index;
                    const filaInfo = filasConLinks[filaIndex];
                    
                    if (filaInfo && filaInfo.tienePDF && filaInfo.pdfUrl) {
                        try {
                            const x = data.cell.x;
                            const y = data.cell.y;
                            const width = data.cell.width;
                            const height = data.cell.height;
                            
                            pdf.link(x, y, width, height, { url: filaInfo.pdfUrl });
                            
                            // NO dibujar el ícono 📄 - eso es lo que causa Ø=ÜÄ
                        } catch (e) {
                            console.warn('Error:', e);
                        }
                    }
                }
            },
            didDrawPage: (data) => {
                this.paginaActualReal = data.pageNumber;
            }
        });
    }

    _extraerUIData(act) {
        return {
            id: act.id || act._id || '',
            hora: act.hora || this._extraerHora(act.fecha),
            modulo: act.modulo || 'N/A',
            tipo: act.tipo || act.tipoActividad || 'N/A',
            descripcion: act.descripcion || act.accion || 'Sin descripción',
            usuario: {
                nombre: act.usuarioNombre || act.usuario?.nombre || 'Desconocido',
                correo: act.usuarioCorreo || act.usuario?.correo || ''
            }
        };
    }

    _formatearFechaArchivo(fecha) {
        if (!fecha) return '';
        try {
            const fechaObj = fecha.toDate ? fecha.toDate() : new Date(fecha);
            const year = fechaObj.getFullYear();
            const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const day = String(fechaObj.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        } catch {
            return '';
        }
    }
}

// EXPORTACIÓN
export const generadorBitacoraPDF = new GeneradorPDFBitacora();
export default generadorBitacoraPDF;