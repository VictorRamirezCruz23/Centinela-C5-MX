/**
 * PDF CONSUMO GENERATOR - Sistema Centinela
 * VERSIÓN: 4.7 - Gráfica grande intacta + Resumen perfectamente alineado
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

// =============================================
// CONFIGURACIÓN DE COLORES
// =============================================
export const coloresConsumo = {
    ...coloresBase,
    servicios: {
        firestore: '#3b82f6',
        storage: '#f97316',
        functions: '#8b5cf6',
        fcm: '#ec4899',
        total: '#0dcaf0'
    }
};

// =============================================
// CLASE PDF CONSUMO GENERATOR
// =============================================
class PDFConsumoGenerator extends PDFBaseGenerator {
    constructor() {
        super();
        this.datosConsumo = null;
        this.empresaSeleccionada = null;
        this.fechaGeneracion = new Date();
    }

    configurar(config) {
        if (config.datosConsumo) this.datosConsumo = config.datosConsumo;
        if (config.empresaNombre) this.empresaNombre = config.empresaNombre;
        if (config.empresaId) this.empresaId = config.empresaId;
        if (config.ultimaActualizacion) this.ultimaActualizacion = config.ultimaActualizacion;
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.authToken) this.authToken = config.authToken;
    }

    async generarReporte(datosConsumo, opciones = {}) {
        try {
            const { mostrarAlerta = true, empresaNombre = 'Empresa', empresaId = '', ultimaActualizacion = new Date() } = opciones;

            if (mostrarAlerta) {
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
                                if (barra) barra.style.width = progreso + '%';
                            }
                        }, 150);
                        window._intervaloProgreso = intervalo;
                    }
                });
            }

            await this.cargarLibrerias();
            if (mostrarAlerta && window._intervaloProgreso) clearInterval(window._intervaloProgreso);

            await this.cargarLogoCentinela();
            await this.cargarLogoOrganizacion();

            this.datosConsumo = datosConsumo;
            this.empresaNombre = empresaNombre;
            this.empresaId = empresaId;
            this.ultimaActualizacion = ultimaActualizacion;
            this.fechaGeneracion = new Date();

            const pdf = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            await this._generarPagina1(pdf, datosConsumo);
            await this._generarPagina2(pdf, datosConsumo);

            const nombreArchivo = `CONSUMO_${this.empresaNombre.replace(/[^a-zA-Z0-9]/g, '_')}_${this.formatearFechaArchivo()}.pdf`;

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
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el reporte: ' + error.message });
            }
            throw error;
        }
    }

    async _generarPagina1(pdf, datos) {
        const margen = 15;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 5;

        this.dibujarEncabezadoBase(pdf, 'REPORTE DE CONSUMO', this.empresaNombre || 'SISTEMA CENTINELA');

        pdf.setDrawColor(200, 200, 200);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margen, yPos, anchoContenido, 28, 3, 3, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(26, 59, 93);
        pdf.text(this.empresaNombre || 'Empresa', margen + 8, yPos + 10);

        const fechaActualizacion = datos.ultimaActualizacion ? 
            new Date(datos.ultimaActualizacion.seconds * 1000).toLocaleString('es-MX') : 'No disponible';
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`ID: ${this.empresaId || 'No disponible'}`, margen + 8, yPos + 18);
        pdf.text(`Última actualización: ${fechaActualizacion}`, margen + 8, yPos + 24);
        
        yPos += 32;

        const anchoTarjeta = (anchoContenido - 30) / 4;
        const altoTarjeta = 58;
        
        const fs = datos.firestore || { lectura: 0, escritura: 0, actualizacion: 0, eliminacion: 0, total: 0 };
        const st = datos.storage || { subida: 0, descarga: 0, eliminacion: 0, total: 0 };
        const fn = datos.functions || { invocacion: 0, invocaciones: 0, notificacionesPushEnviadas: 0, usuariosNotificados: 0, total: 0 };
        const fcm = datos.fcm || { notificacionEnviada: 0, tokenRegistrado: 0, tokenEliminado: 0, total: 0 };
        
        const invocacionesTotales = (fn.invocacion || 0) + (fn.invocaciones || 0);
        const notificacionesPush = fn.notificacionesPushEnviadas || 0;
        const totalGeneral = fs.total + st.total + (fn.total || invocacionesTotales) + fcm.total;
        
        this._dibujarTarjetaGrande(pdf, 'Firestore', this._formatearNumero(fs.total), 
            `L:${fs.lectura} / E:${fs.escritura} / A:${fs.actualizacion} / D:${fs.eliminacion || 0}`,
            margen, yPos, anchoTarjeta, altoTarjeta, '#3b82f6');
        
        this._dibujarTarjetaGrande(pdf, 'Storage', this._formatearNumero(st.total),
            `Sub:${st.subida} / Desc:${st.descarga} / Del:${st.eliminacion || 0}`,
            margen + anchoTarjeta + 10, yPos, anchoTarjeta, altoTarjeta, '#f97316');
        
        this._dibujarTarjetaGrande(pdf, 'Cloud Functions', this._formatearNumero(invocacionesTotales),
            `Invoc: ${invocacionesTotales}`,
            margen + (anchoTarjeta + 10) * 2, yPos, anchoTarjeta, altoTarjeta, '#8b5cf6');
        
        this._dibujarTarjetaCompactaGrande(pdf, 'FCM Notificaciones', this._formatearNumero(notificacionesPush),
            `Push:${notificacionesPush} / Tokens:${fcm.tokenRegistrado}`,
            margen + (anchoTarjeta + 10) * 3, yPos, anchoTarjeta, altoTarjeta, '#ec4899');
        
        yPos += altoTarjeta + 12;
        
        const anchoTotal = 140;
        const xTotal = (anchoPagina - anchoTotal) / 2;
        this._dibujarTarjetaTotalGrande(pdf, 'Total Operaciones', this._formatearNumero(totalGeneral),
            `${this._formatearNumero(totalGeneral)} ops total (${notificacionesPush} push reales)`,
            xTotal, yPos, anchoTotal, altoTarjeta, '#0dcaf0');
        
        this.dibujarPiePagina(pdf);
    }

    async _generarPagina2(pdf, datos) {
        pdf.addPage();
        
        const margen = 18;
        const anchoPagina = pdf.internal.pageSize.getWidth();
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = 15;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(26, 59, 93);
        pdf.text('DISTRIBUCIÓN DE CONSUMO POR SERVICIO', anchoPagina / 2, yPos, { align: 'center' });
        yPos += 8;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Empresa: ${this.empresaNombre}`, anchoPagina / 2, yPos, { align: 'center' });
        yPos += 18;
        
        const fs = datos.firestore || { total: 0 };
        const st = datos.storage || { total: 0 };
        const fn = datos.functions || { invocacion: 0, invocaciones: 0, total: 0 };
        const fcm = datos.fcm || { total: 0 };
        
        const invocacionesTotales = (fn.invocacion || 0) + (fn.invocaciones || 0);
        
        const datosGrafica = [
            { nombre: 'Firestore', valor: fs.total, color: '#3b82f6' },
            { nombre: 'Storage', valor: st.total, color: '#f97316' },
            { nombre: 'Cloud Functions', valor: invocacionesTotales, color: '#8b5cf6' },
            { nombre: 'FCM', valor: fcm.total, color: '#ec4899' }
        ];
        
        // Gráfica grande - igual que en versión 4.2
        const altoGrafica = 125;
        await this._dibujarGraficaCircularPerfecta(pdf, datosGrafica, margen, yPos, anchoContenido, altoGrafica);
        yPos += altoGrafica + 15;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(26, 59, 93);
        pdf.text('RESUMEN DETALLADO DE CONSUMO', anchoPagina / 2, yPos, { align: 'center' });
        yPos += 12;
        
        const fsDetalle = datos.firestore || { lectura: 0, escritura: 0, actualizacion: 0, eliminacion: 0, total: 0 };
        const stDetalle = datos.storage || { subida: 0, descarga: 0, eliminacion: 0, total: 0 };
        const fnDetalle = datos.functions || { invocacion: 0, invocaciones: 0, notificacionesPushEnviadas: 0, usuariosNotificados: 0, total: 0 };
        const fcmDetalle = datos.fcm || { tokenRegistrado: 0, tokenEliminado: 0 };
        
        const invocacionesTotalesDetalle = (fnDetalle.invocacion || 0) + (fnDetalle.invocaciones || 0);
        const notificacionesPushDetalle = fnDetalle.notificacionesPushEnviadas || 0;
        const usuariosNotificadosDetalle = fnDetalle.usuariosNotificados || 0;
        
        // Layout en 2 columnas con alineación perfecta
        const columnaIzq = margen;
        const columnaDer = anchoPagina / 2 + 5;
        
        // Calcular la altura de la columna izquierda para alinear la derecha
        let yIzq = yPos;
        
        // ========== COLUMNA IZQUIERDA ==========
        // Firestore
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Firestore', columnaIzq, yIzq);
        yIzq += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Total: ${this._formatearNumero(fsDetalle.total)} operaciones`, columnaIzq + 5, yIzq);
        yIzq += 5;
        pdf.text(`  Lecturas: ${this._formatearNumero(fsDetalle.lectura)}`, columnaIzq + 5, yIzq);
        yIzq += 5;
        pdf.text(`  Escrituras: ${this._formatearNumero(fsDetalle.escritura)}`, columnaIzq + 5, yIzq);
        yIzq += 5;
        pdf.text(`  Actualizaciones: ${this._formatearNumero(fsDetalle.actualizacion)}`, columnaIzq + 5, yIzq);
        yIzq += 5;
        pdf.text(`  Eliminaciones: ${this._formatearNumero(fsDetalle.eliminacion || 0)}`, columnaIzq + 5, yIzq);
        yIzq += 10;
        
        // Storage
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Storage', columnaIzq, yIzq);
        yIzq += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Total: ${this._formatearNumero(stDetalle.total)} operaciones`, columnaIzq + 5, yIzq);
        yIzq += 5;
        pdf.text(`  Subidas: ${this._formatearNumero(stDetalle.subida)}`, columnaIzq + 5, yIzq);
        yIzq += 5;
        pdf.text(`  Descargas: ${this._formatearNumero(stDetalle.descarga)}`, columnaIzq + 5, yIzq);
        yIzq += 5;
        pdf.text(`  Eliminaciones: ${this._formatearNumero(stDetalle.eliminacion || 0)}`, columnaIzq + 5, yIzq);
        
        // ========== COLUMNA DERECHA (alineada con Firestore y Storage) ==========
        let yDer = yPos;
        
        // Cloud Functions - alineado con Firestore
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Cloud Functions', columnaDer, yDer);
        yDer += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Invocaciones: ${this._formatearNumero(invocacionesTotalesDetalle)}`, columnaDer + 5, yDer);
        yDer += 28; // Espacio para que Notificaciones quede alineada con Storage
        
        // Notificaciones Push - alineado con Storage
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(26, 59, 93);
        pdf.text('Notificaciones Push (FCM)', columnaDer, yDer);
        yDer += 6;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`• Enviadas: ${this._formatearNumero(notificacionesPushDetalle)} notificaciones`, columnaDer + 5, yDer);
        yDer += 5;
        pdf.text(`  Usuarios notificados: ${this._formatearNumero(usuariosNotificadosDetalle)}`, columnaDer + 5, yDer);
        yDer += 5;
        pdf.text(`  Tokens registrados: ${this._formatearNumero(fcmDetalle.tokenRegistrado)}`, columnaDer + 5, yDer);
        yDer += 5;
        pdf.text(`  Tokens eliminados: ${this._formatearNumero(fcmDetalle.tokenEliminado)}`, columnaDer + 5, yDer);
        
        this.dibujarPiePagina(pdf);
    }

    // =============================================
    // TARJETAS CON TEXTO MÁS GRANDE
    // =============================================
    _dibujarTarjetaGrande(pdf, titulo, valorGrande, detalle, x, y, ancho, alto, colorHex) {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 4, 4, 'FD');
        
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(x, y, ancho, 4, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(titulo, x + 5, y + 10);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(26, 59, 93);
        pdf.text(valorGrande, x + 5, y + 25);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 100, 100);
        const lineasDetalle = this._dividirTexto(detalle, ancho - 10);
        lineasDetalle.forEach((linea, i) => {
            pdf.text(linea, x + 5, y + 35 + (i * 4));
        });
    }

    _dibujarTarjetaCompactaGrande(pdf, titulo, valorGrande, detalle, x, y, ancho, alto, colorHex) {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 4, 4, 'FD');
        
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(x, y, ancho, 4, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text(titulo, x + 5, y + 10);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(26, 59, 93);
        pdf.text(valorGrande, x + 5, y + 25);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(detalle, x + 5, y + 37);
    }

    _dibujarTarjetaTotalGrande(pdf, titulo, valorGrande, detalle, x, y, ancho, alto, colorHex) {
        pdf.setFillColor(250, 250, 250);
        pdf.setDrawColor(200, 200, 200);
        pdf.roundedRect(x, y, ancho, alto, 4, 4, 'FD');
        
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);
        pdf.setFillColor(r, g, b);
        pdf.rect(x, y, ancho, 4, 'F');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 80);
        pdf.text(titulo, x + 10, y + 11);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(26, 59, 93);
        pdf.text(valorGrande, x + 10, y + 27);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(detalle, x + 10, y + 39);
    }

    // =============================================
    // GRÁFICA CIRCULAR PERFECTA - MÁS GRANDE (igual que versión 4.2)
    // =============================================
    async _dibujarGraficaCircularPerfecta(pdf, datos, x, y, ancho, alto) {
        const total = datos.reduce((sum, d) => sum + d.valor, 0);
        
        if (total === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.setDrawColor(200, 200, 200);
            pdf.roundedRect(x, y, ancho, alto, 3, 3, 'FD');
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            pdf.text('Sin datos disponibles', x + ancho / 2, y + alto / 2, { align: 'center' });
            return;
        }

        const canvasSize = 700;
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centroX = canvasSize / 2;
        const centroY = canvasSize / 2 - 15;
        const radio = canvasSize * 0.32;
        
        let anguloInicio = 0;
        
        datos.forEach((d) => {
            const angulo = (d.valor / total) * 360;
            const anguloFin = anguloInicio + angulo;
            const radInicio = (anguloInicio * Math.PI) / 180;
            const radFin = (anguloFin * Math.PI) / 180;
            
            ctx.beginPath();
            ctx.moveTo(centroX, centroY);
            ctx.arc(centroX, centroY, radio, radInicio, radFin);
            ctx.closePath();
            ctx.fillStyle = d.color;
            ctx.fill();
            
            anguloInicio = anguloFin;
        });
        
        ctx.beginPath();
        ctx.arc(centroX, centroY, radio * 0.45, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        const xLeyenda = canvasSize - 160;
        let yLeyenda = 70;
        
        datos.forEach((d) => {
            const porcentaje = total > 0 ? Math.round((d.valor / total) * 100) : 0;
            ctx.fillStyle = d.color;
            ctx.fillRect(xLeyenda, yLeyenda, 16, 16);
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#333';
            let nombre = d.nombre;
            if (nombre === 'Cloud Functions') nombre = 'Functions';
            ctx.fillText(`${nombre}: ${porcentaje}%`, xLeyenda + 22, yLeyenda + 13);
            yLeyenda += 28;
        });
        
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#1a3b5d';
        ctx.fillText(`Total: ${this._formatearNumero(total)}`, centroX - 65, centroY + radio + 48);
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        const margenInterno = 5;
        const altoImagen = alto - margenInterno;
        const anchoImagen = altoImagen;
        const xImagen = x + (ancho - anchoImagen) / 2;
        
        pdf.addImage(imgData, 'PNG', xImagen, y, anchoImagen, altoImagen);
    }

    _dividirTexto(texto, anchoMax) {
        if (!texto) return [''];
        const longitudMax = Math.floor(anchoMax / 1.8);
        if (texto.length <= longitudMax) return [texto];
        
        const palabras = texto.split(' ');
        const lineas = [];
        let lineaActual = '';
        
        for (const palabra of palabras) {
            const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
            if (prueba.length <= longitudMax) {
                lineaActual = prueba;
            } else {
                if (lineaActual) lineas.push(lineaActual);
                lineaActual = palabra;
            }
        }
        if (lineaActual) lineas.push(lineaActual);
        return lineas;
    }

    _formatearNumero(num) {
        if (num === undefined || num === null) return '0';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
}

export const generadorPDFConsumo = new PDFConsumoGenerator();
export default generadorPDFConsumo;