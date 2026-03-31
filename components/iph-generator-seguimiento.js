/**
 * IPH GENERATOR PARA SEGUIMIENTO - Sistema Centinela
 * VERSIÓN: 9.5 - USA STORAGE SDK DIRECTAMENTE
 */

import { PDFBaseGenerator, coloresBase } from './pdf-base-generator.js';

export const coloresIPH = {
    ...coloresBase,
    riesgoCritico: '#c0392b',
    riesgoAlto: '#e67e22',
    riesgoMedio: '#f39c12',
    riesgoBajo: '#27ae60'
};

const CONFIG = {
    ANCHO_IMAGEN: 85,
    ALTO_IMAGEN: 70,
    ESPACIADO_COLUMNAS: 12,
    ESPACIADO_FILAS: 18,
    MARGEN: 20,
    ALTURA_COMENTARIO: 18,
    ESPACIADO_COMENTARIO: 4,
    ALTURA_LINEA: 4.5,
    MARGEN_IMAGEN: 5,
    MARGEN_PIE_PAGINA: 20,
    MAX_CARACTERES_POR_LINEA: 84,
    MAX_CARACTERES_COMENTARIO: 45,
    ALTURA_SEGUIMIENTO_BASE: 28,
    IMAGE_TIMEOUT: 30000,
    ESPACIO_ENTRE_BLOQUES: 2
};

class IPHGeneratorSeguimiento extends PDFBaseGenerator {
    constructor() {
        super();
        
        this.sucursalesCache = [];
        this.categoriasCache = [];
        this.usuariosCache = [];
        this.incidenciaActual = null;
        this.imagenesCache = new Map();
        this.storage = null;
        this.getDownloadURL = null;
        this.ref = null;
        
        this.configuracionCarta = {
            ancho: 215.9,
            alto: 279.4,
            margen: 20,
            alturaEncabezado: 42,
            alturaPie: 18
        };
    }

    async initStorage() {
        if (!this.storage) {
            try {
                const storageModule = await import('/config/firebase-config.js');
                const firebaseStorage = await import("https://www.gstatic.com/firebasejs/12.8.0/firebase-storage.js");
                
                this.storage = storageModule.storage;
                this.getDownloadURL = firebaseStorage.getDownloadURL;
                this.ref = firebaseStorage.ref;
                console.log('✅ Storage SDK inicializado');
            } catch (error) {
                console.error('❌ Error inicializando Storage:', error);
            }
        }
    }

    configurar(config) {
        if (config.organizacionActual) this.organizacionActual = config.organizacionActual;
        if (config.sucursalesCache) this.sucursalesCache = config.sucursalesCache;
        if (config.categoriasCache) this.categoriasCache = config.categoriasCache;
        if (config.usuariosCache) this.usuariosCache = config.usuariosCache;
    }

    obtenerNombreSucursal(sucursalId) {
        if (!sucursalId) return 'No especificada';
        const sucursal = this.sucursalesCache.find(s => s.id === sucursalId);
        return sucursal ? sucursal.nombre : 'No disponible';
    }
    
    obtenerNombreCategoria(categoriaId) {
        if (!categoriaId) return 'No especificada';
        const categoria = this.categoriasCache.find(c => c.id === categoriaId);
        return categoria ? categoria.nombre : 'No disponible';
    }
    
    obtenerNombreSubcategoria(subcategoriaId, categoriaId) {
        if (!subcategoriaId) return 'No especificada';
        const categoria = this.categoriasCache.find(c => c.id === categoriaId);
        if (categoria && categoria.subcategorias) {
            let subcategorias = [];
            if (categoria.subcategorias instanceof Map) {
                subcategorias = Array.from(categoria.subcategorias.values());
            } else if (typeof categoria.subcategorias === 'object') {
                subcategorias = Object.values(categoria.subcategorias);
            }
            const sub = subcategorias.find(s => s.id === subcategoriaId || s._id === subcategoriaId);
            if (sub) return sub.nombre || sub.descripcion || 'Subcategoría';
        }
        return 'No disponible';
    }
    
    obtenerNombreUsuario(usuarioId) {
        if (!usuarioId) return 'No especificado';
        const usuario = this.usuariosCache.find(u =>
            u.id === usuarioId || u.uid === usuarioId || u._id === usuarioId
        );
        if (usuario) {
            return usuario.nombreCompleto || usuario.nombre || usuario.displayName || 'Usuario';
        }
        return 'No especificado';
    }

    // =============================================
    // OBTENER URL FRESCA DESDE STORAGE
    // =============================================
    
    async obtenerUrlFresca(item) {
        if (!item) return null;
        
        await this.initStorage();
        
        // Buscar el path en el objeto
        let path = null;
        
        if (typeof item === 'object') {
            if (item.path) {
                path = item.path;
            } else if (item.storagePath) {
                path = item.storagePath;
            } else if (item.ruta) {
                path = item.ruta;
            }
        }
        
        if (path && this.getDownloadURL && this.ref) {
            try {
                const storageRef = this.ref(this.storage, path);
                const url = await this.getDownloadURL(storageRef);
                console.log(`✅ URL fresca obtenida: ${path.substring(0, 50)}...`);
                return url;
            } catch (error) {
                console.error(`❌ Error obteniendo URL fresca para ${path}:`, error);
                // Fallback a la URL guardada
                if (typeof item === 'object' && item.url) {
                    return item.url;
                }
                return null;
            }
        }
        
        // Fallback: usar URL guardada
        if (typeof item === 'object' && item.url) {
            return item.url;
        }
        if (typeof item === 'string') {
            return item;
        }
        
        return null;
    }

    extraerComentario(item) {
        if (!item) return '';
        if (typeof item === 'string') return '';
        if (typeof item === 'object') {
            const props = ['comentario', 'descripcion', 'observacion', 'nota', 'detalle', 'description'];
            for (const prop of props) {
                if (item[prop] && typeof item[prop] === 'string') {
                    const comentario = item[prop].trim();
                    if (comentario) return comentario;
                }
            }
        }
        return '';
    }

    // =============================================
    // CARGA DE IMÁGENES
    // =============================================
    
    async cargarImagenDesdeUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            const timeoutId = setTimeout(() => {
                img.src = '';
                console.warn(`⏰ Timeout: ${url?.substring(0, 80)}`);
                resolve(null);
            }, CONFIG.IMAGE_TIMEOUT);
            
            img.onload = () => {
                clearTimeout(timeoutId);
                console.log(`✅ Imagen cargada: ${img.width}x${img.height}`);
                
                const canvas = document.createElement('canvas');
                const maxDimension = 1024;
                let width = img.width;
                let height = img.height;
                
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height * maxDimension) / width;
                        width = maxDimension;
                    } else {
                        width = (width * maxDimension) / height;
                        height = maxDimension;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            
            img.onerror = (err) => {
                clearTimeout(timeoutId);
                console.warn(`❌ Error: ${url?.substring(0, 80)}`);
                resolve(null);
            };
            
            try {
                img.crossOrigin = 'Anonymous';
            } catch(e) {}
            img.src = url;
        });
    }
    
    async obtenerImagen(item) {
        // Obtener URL fresca desde Storage
        const url = await this.obtenerUrlFresca(item);
        
        if (!url) {
            return null;
        }
        
        // Verificar caché
        if (this.imagenesCache.has(url)) {
            return this.imagenesCache.get(url);
        }
        
        const imgData = await this.cargarImagenDesdeUrl(url);
        if (imgData) {
            this.imagenesCache.set(url, imgData);
            setTimeout(() => {
                this.imagenesCache.delete(url);
            }, 300000);
        }
        
        return imgData;
    }

    // =============================================
    // DIBUJAR IMAGEN
    // =============================================
    
    async dibujarImagen(pdf, imagenObj, x, y, ancho, alto, numero, anchoDisponible = null) {
        try {
            const imgData = await this.obtenerImagen(imagenObj);
            const comentario = this.extraerComentario(imagenObj);
            
            pdf.saveGraphicsState();
            
            const margenImagen = 5;
            const anchoConMargen = ancho - (margenImagen * 2);
            const altoConMargen = alto - (margenImagen * 2);
            
            pdf.setDrawColor(80, 80, 80);
            pdf.setLineWidth(0.3);
            pdf.rect(x, y, ancho, alto, 'S');
            
            if (imgData) {
                pdf.setFillColor(255, 255, 255);
                pdf.rect(x, y, ancho, alto, 'F');
                
                try {
                    const tempImg = new Image();
                    await new Promise((resolve, reject) => {
                        tempImg.onload = resolve;
                        tempImg.onerror = reject;
                        tempImg.src = imgData;
                    });
                    
                    const aspectRatio = tempImg.width / tempImg.height;
                    let drawWidth = anchoConMargen;
                    let drawHeight = altoConMargen;
                    
                    if (aspectRatio > 1) {
                        drawHeight = drawWidth / aspectRatio;
                    } else {
                        drawWidth = drawHeight * aspectRatio;
                    }
                    
                    const xOffset = (ancho - drawWidth) / 2;
                    const yOffset = (alto - drawHeight) / 2;
                    
                    pdf.addImage(imgData, 'JPEG', x + xOffset, y + yOffset, drawWidth, drawHeight, undefined, 'FAST');
                    
                } catch (imgError) {
                    pdf.addImage(imgData, 'JPEG', x + margenImagen, y + margenImagen, anchoConMargen, altoConMargen, undefined, 'FAST');
                }
            } else {
                this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero);
            }
            
            pdf.restoreGraphicsState();
            
            const anchoTexto = anchoDisponible || ancho;
            const xComentario = x;
            const yComentario = y + alto + 4;
            
            if (comentario && comentario.trim() !== '') {
                const lineasComentario = this.dividirTextoPorCaracteres(comentario, 45);
                const alturaComentario = Math.min(lineasComentario.length * 4.5, 33);
                
                pdf.setFillColor(248, 248, 248);
                pdf.setDrawColor(220, 220, 220);
                pdf.setLineWidth(0.2);
                pdf.rect(xComentario, yComentario - 1, anchoTexto, alturaComentario + 2, 'FD');
                pdf.rect(xComentario, yComentario - 1, anchoTexto, alturaComentario + 2, 'S');
                
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(7);
                pdf.setTextColor(80, 80, 80);
                pdf.text("Descripción:", xComentario + 3, yComentario + 4);
                
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(7);
                pdf.setTextColor(80, 80, 80);
                
                let yTexto = yComentario + 4;
                const lineasAMostrar = Math.min(lineasComentario.length, 4);
                for (let i = 0; i < lineasAMostrar; i++) {
                    pdf.text(lineasComentario[i], xComentario + 3, yTexto + (i * 4.5) + 4);
                }
                
                if (lineasComentario.length > 4) {
                    pdf.setFont('helvetica', 'italic');
                    pdf.text("(Más texto disponible en el sistema)", xComentario + 3, yTexto + 24);
                }
                
                return {
                    alturaUtilizada: alto + 4 + alturaComentario + 6
                };
            } else {
                pdf.setFillColor(250, 250, 250);
                pdf.rect(xComentario, yComentario - 1, anchoTexto, 7, 'F');
                
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(6);
                pdf.setTextColor(150, 150, 150);
                pdf.text("Sin descripción", xComentario + 3, yComentario + 4);
                
                return {
                    alturaUtilizada: alto + 4 + 9
                };
            }
            
        } catch (error) {
            console.error(`Error dibujando imagen ${numero}:`, error);
            this.dibujarPlaceholder(pdf, x, y, ancho, alto, numero);
            return { alturaUtilizada: alto + 4 + 12 };
        }
    }

    dibujarPlaceholder(pdf, x, y, ancho, alto, numero) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(x + 1, y + 1, ancho - 2, alto - 2, 'F');
        
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.3);
        pdf.rect(x, y, ancho, alto, 'S');
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`[ Imagen ${numero} no disponible ]`, x + (ancho / 2), y + (alto / 2), { align: 'center' });
    }

    // =============================================
    // DIVIDIR TEXTO
    // =============================================
    
    dividirTextoPorCaracteres(texto, maxChars = 84) {
        if (!texto) return [''];
        
        const lineas = [];
        const parrafos = texto.split('\n');
        
        for (const parrafo of parrafos) {
            if (parrafo.trim() === '') {
                lineas.push('');
                continue;
            }
            
            let inicio = 0;
            while (inicio < parrafo.length) {
                let fin = inicio + maxChars;
                if (fin >= parrafo.length) {
                    lineas.push(parrafo.substring(inicio));
                    break;
                }
                let corte = fin;
                while (corte > inicio && parrafo[corte] !== ' ' && parrafo[corte] !== '-' && parrafo[corte] !== ',' && parrafo[corte] !== ';') {
                    corte--;
                }
                if (corte === inicio) {
                    corte = fin;
                }
                lineas.push(parrafo.substring(inicio, corte));
                inicio = corte;
                while (inicio < parrafo.length && parrafo[inicio] === ' ') {
                    inicio++;
                }
            }
        }
        return lineas;
    }

    // =============================================
    // DIBUJAR SEGUIMIENTO
    // =============================================
    
    async dibujarSeguimiento(pdf, seguimiento, x, y, ancho, numero) {
        const fecha = seguimiento.fecha ? this.formatearFechaVisualizacion(seguimiento.fecha) : 'Fecha no disponible';
        const usuario = seguimiento.usuarioNombre || 'Usuario';
        const descripcion = seguimiento.descripcion || 'Sin descripción';
        const evidencias = seguimiento.evidencias || [];
        
        let alturaTotal = 28;
        
        const lineasDescripcion = this.dividirTextoPorCaracteres(descripcion, 74);
        const alturaDescripcion = Math.min(lineasDescripcion.length, 4) * 4.5;
        alturaTotal += alturaDescripcion;
        
        let alturaEvidencias = 0;
        if (evidencias.length > 0) {
            alturaEvidencias = 45;
            alturaTotal += alturaEvidencias + 8;
        }
        
        pdf.saveGraphicsState();
        pdf.setFillColor(248, 248, 248);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.rect(x, y, ancho, alturaTotal, 'FD');
        pdf.rect(x, y, ancho, alturaTotal, 'S');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`${usuario}`, x + 6, y + 6);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(100, 100, 100);
        pdf.text(fecha, x + ancho - 6, y + 6, { align: 'right' });
        
        pdf.setDrawColor(220, 220, 220);
        pdf.line(x + 4, y + 12, x + ancho - 4, y + 12);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(80, 80, 80);
        
        let yTexto = y + 18;
        const lineasAMostrar = Math.min(lineasDescripcion.length, 4);
        for (let i = 0; i < lineasAMostrar; i++) {
            pdf.text(lineasDescripcion[i], x + 6, yTexto);
            yTexto += 4.5;
        }
        
        if (lineasDescripcion.length > 4) {
            pdf.setFont('helvetica', 'italic');
            pdf.text("(Más texto disponible en el sistema)", x + 6, yTexto);
            yTexto += 4.5;
        }
        
        if (evidencias.length > 0) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6.5);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`📷 ${evidencias.length} evidencia(s)`, x + 6, yTexto + 4);
            
            const anchoMiniatura = 30;
            const altoMiniatura = 25;
            const espaciadoMiniatura = 8;
            let xMiniatura = x + 6;
            const yMiniatura = yTexto + 10;
            
            for (let i = 0; i < Math.min(evidencias.length, 3); i++) {
                const evidencia = evidencias[i];
                
                try {
                    const imgData = await this.obtenerImagen(evidencia);
                    if (imgData) {
                        pdf.addImage(imgData, 'JPEG', xMiniatura, yMiniatura, anchoMiniatura, altoMiniatura, undefined, 'FAST');
                        pdf.setDrawColor(150, 150, 150);
                        pdf.setLineWidth(0.2);
                        pdf.rect(xMiniatura, yMiniatura, anchoMiniatura, altoMiniatura, 'S');
                    } else {
                        this.dibujarMiniaturaPlaceholder(pdf, xMiniatura, yMiniatura, anchoMiniatura, altoMiniatura, i + 1);
                    }
                } catch (e) {
                    this.dibujarMiniaturaPlaceholder(pdf, xMiniatura, yMiniatura, anchoMiniatura, altoMiniatura, i + 1);
                }
                
                xMiniatura += anchoMiniatura + espaciadoMiniatura;
            }
            
            if (evidencias.length > 3) {
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(6);
                pdf.setTextColor(120, 120, 120);
                pdf.text(`+${evidencias.length - 3} más`, xMiniatura + 5, yMiniatura + altoMiniatura / 2);
            }
        }
        
        pdf.restoreGraphicsState();
        
        return alturaTotal;
    }
    
    dibujarMiniaturaPlaceholder(pdf, x, y, ancho, alto, numero) {
        pdf.setFillColor(230, 230, 230);
        pdf.rect(x, y, ancho, alto, 'F');
        pdf.setDrawColor(180, 180, 180);
        pdf.rect(x, y, ancho, alto, 'S');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`[${numero}]`, x + ancho / 2, y + alto / 2, { align: 'center' });
    }

    // =============================================
    // MÉTODO PRINCIPAL
    // =============================================
    
    async generarIPHSeguimiento(incidencia, opciones = {}) {
        try {
            const { 
                mostrarAlerta = true, 
                tituloAlerta = 'Generando informe actualizado...', 
                onProgress = null,
                returnBlob = false
            } = opciones;
            
            console.log('📋 GENERANDO INFORME DE SEGUIMIENTO');
            console.log('  Folio:', incidencia.id);
            
            await this.initStorage();
            
            if (mostrarAlerta) {
                Swal.fire({
                    title: tituloAlerta,
                    html: `
                        <div style="text-align: center;">
                            <div class="progress-container" style="width:100%; margin-top:10px;">
                                <div class="progress-bar" style="width:0%; height:3px; background:#2c3e50; border-radius:2px;"></div>
                                <p class="progress-text" style="margin-top:12px; font-size:13px;">Procesando información...</p>
                            </div>
                        </div>
                    `,
                    allowOutsideClick: false,
                    showConfirmButton: false
                });
            }
            
            const actualizarProgreso = (porcentaje, texto) => {
                if (mostrarAlerta && Swal.isVisible()) {
                    const progressBar = Swal.getPopup()?.querySelector('.progress-bar');
                    const progressText = Swal.getPopup()?.querySelector('.progress-text');
                    if (progressBar) progressBar.style.width = `${porcentaje}%`;
                    if (progressText && texto) progressText.textContent = texto;
                }
                if (onProgress) onProgress(porcentaje);
            };
            
            actualizarProgreso(5, 'Cargando librerías...');
            await this.cargarLibrerias();
            
            actualizarProgreso(10, 'Cargando información...');
            await Promise.all([this.cargarLogoCentinela(), this.cargarLogoOrganizacion()]);
            
            this.incidenciaActual = incidencia;
            
            actualizarProgreso(50, 'Componiendo documento...');
            
            const pdf = new this.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
            this.totalPaginas = 1;
            this.paginaActualReal = 1;
            
            await this.generarPaginaOficial(pdf, incidencia, actualizarProgreso);
            
            actualizarProgreso(95, 'Finalizando...');
            
            if (mostrarAlerta) {
                Swal.close();
            }
            
            actualizarProgreso(100, 'Completado');
            
            if (returnBlob) return pdf.output('blob');
            return pdf;
            
        } catch (error) {
            console.error('Error generando informe:', error);
            if (mostrarAlerta) {
                Swal.close();
                Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Error al generar el informe' });
            }
            throw error;
        }
    }
    
    async generarPaginaOficial(pdf, incidencia, onProgress) {
        const margen = 20;
        const anchoPagina = 215.9;
        const altoPagina = 279.4;
        const anchoContenido = anchoPagina - (margen * 2);
        let yPos = this.alturaEncabezado + 8;
        
        this.dibujarEncabezadoBase(pdf, 'INFORME DE SEGUIMIENTO', incidencia.id || 'Nueva Incidencia');
        
        // IDENTIFICACIÓN
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margen, yPos, anchoContenido, 48, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text("1. IDENTIFICACIÓN DE LA UNIDAD", margen + 6, yPos + 6);
        pdf.line(margen + 4, yPos + 9, margen + anchoContenido - 4, yPos + 9);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Organización: ${this.organizacionActual?.nombre || 'No especificada'}`, margen + 6, yPos + 16);
        pdf.text(`Sucursal: ${this.obtenerNombreSucursal(incidencia.sucursalId)}`, margen + 6, yPos + 24);
        pdf.text(`Reportado por: ${incidencia.creadoPorNombre || 'No especificado'}`, margen + 6, yPos + 32);
        yPos += 48 + 2;
        
        // DATOS GENERALES
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margen, yPos, anchoContenido, 32, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text("2. DATOS GENERALES", margen + 6, yPos + 6);
        pdf.line(margen + 4, yPos + 12, margen + anchoContenido - 4, yPos + 12);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        const fechaReporte = incidencia.fechaCreacion ? new Date(incidencia.fechaCreacion) : new Date();
        pdf.text(`Fecha de reporte: ${this.formatearFechaVisualizacion(fechaReporte)}`, margen + 6, yPos + 22);
        pdf.text(`Hora de reporte: ${this.formatearHoraVisualizacion(fechaReporte)}`, margen + 105, yPos + 22);
        yPos += 32 + 2;
        
        // CLASIFICACIÓN
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margen, yPos, anchoContenido, 72, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text("3. CLASIFICACIÓN DE LA INCIDENCIA", margen + 6, yPos + 6);
        pdf.line(margen + 4, yPos + 12, margen + anchoContenido - 4, yPos + 12);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(`Categoría: ${this.obtenerNombreCategoria(incidencia.categoriaId)}`, margen + 6, yPos + 22);
        pdf.text(`Subcategoría: ${this.obtenerNombreSubcategoria(incidencia.subcategoriaId, incidencia.categoriaId)}`, margen + 6, yPos + 30);
        
        const nivelRiesgo = incidencia.nivelRiesgo || 'No especificado';
        const riesgoTexto = nivelRiesgo.toUpperCase();
        let riesgoColor = [60, 60, 60];
        if (nivelRiesgo === 'critico') riesgoColor = [192, 57, 43];
        else if (nivelRiesgo === 'alto') riesgoColor = [230, 126, 34];
        else if (nivelRiesgo === 'medio') riesgoColor = [243, 156, 18];
        else if (nivelRiesgo === 'bajo') riesgoColor = [39, 174, 96];
        
        pdf.setTextColor(riesgoColor[0], riesgoColor[1], riesgoColor[2]);
        pdf.text(`Nivel de riesgo: ${riesgoTexto}`, margen + 6, yPos + 38);
        
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Estado: ${incidencia.estado === 'pendiente' ? 'Pendiente de atención' : 'Finalizada'}`, margen + 6, yPos + 46);
        
        const fechaInicio = incidencia.fechaInicio ? new Date(incidencia.fechaInicio) : new Date();
        pdf.text(`Fecha del incidente: ${this.formatearFechaVisualizacion(fechaInicio)}`, margen + 6, yPos + 54);
        pdf.text(`Hora del incidente: ${this.formatearHoraVisualizacion(fechaInicio)}`, margen + 105, yPos + 54);
        yPos += 72 + 2;
        
        // DESCRIPCIÓN
        const detalles = incidencia.detalles || 'No se proporcionó descripción.';
        const lineasDescripcion = this.dividirTextoPorCaracteres(detalles, 84);
        const alturaDescNecesaria = 16 + 8 + (Math.min(lineasDescripcion.length, 15) * 4.5) + 5;
        
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(margen, yPos, anchoContenido, alturaDescNecesaria, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.text("4. DESCRIPCIÓN DE LOS HECHOS", margen + 6, yPos + 6);
        pdf.line(margen + 4, yPos + 12, margen + anchoContenido - 4, yPos + 12);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        
        let yTexto = yPos + 20;
        for (let i = 0; i < Math.min(lineasDescripcion.length, 15); i++) {
            pdf.text(lineasDescripcion[i], margen + 6, yTexto);
            yTexto += 4.5;
        }
        yPos += alturaDescNecesaria + 2;
        
        // EVIDENCIAS ORIGINALES
        const imagenesPrincipales = incidencia.imagenes || [];
        
        if (imagenesPrincipales.length > 0) {
            const imgWidth = 85;
            const imgHeight = 70;
            
            let col1X = margen + 6;
            let col2X = col1X + imgWidth + 12;
            
            let imagenIndex = 0;
            
            if (!this.verificarEspacio(pdf, yPos, 25)) {
                this.dibujarPiePagina(pdf);
                pdf.addPage();
                this.paginaActualReal++;
                this.dibujarEncabezadoBase(pdf, 'INFORME DE SEGUIMIENTO', `${incidencia.id} (Continuación)`);
                yPos = this.alturaEncabezado + 5;
            }
            
            pdf.setFillColor(250, 250, 250);
            pdf.setDrawColor(200, 200, 200);
            pdf.rect(margen, yPos - 2, anchoContenido, 14, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            pdf.text("5. EVIDENCIAS FOTOGRÁFICAS ORIGINALES", margen + 6, yPos + 6);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${imagenesPrincipales.length} imagen(es)`, anchoPagina - margen - 45, yPos + 6);
            yPos += 18;
            
            while (imagenIndex < imagenesPrincipales.length) {
                const imagenesEnFila = Math.min(2, imagenesPrincipales.length - imagenIndex);
                let alturaFila = 0;
                
                for (let i = 0; i < imagenesEnFila; i++) {
                    const img = imagenesPrincipales[imagenIndex + i];
                    const comentario = this.extraerComentario(img);
                    let alturaExtra = 4 + 12;
                    if (comentario && comentario.trim() !== '') {
                        const lineasCom = this.dividirTextoPorCaracteres(comentario, 45);
                        const lineas = Math.min(lineasCom.length, 4);
                        alturaExtra += Math.min(lineas * 4.5, 24);
                    } else {
                        alturaExtra += 7;
                    }
                    alturaFila = Math.max(alturaFila, imgHeight + alturaExtra);
                }
                
                if (!this.verificarEspacio(pdf, yPos, alturaFila + 15)) {
                    this.dibujarPiePagina(pdf);
                    pdf.addPage();
                    this.paginaActualReal++;
                    this.dibujarEncabezadoBase(pdf, 'INFORME DE SEGUIMIENTO', `${incidencia.id} (Continuación)`);
                    yPos = this.alturaEncabezado + 5;
                    
                    pdf.setFillColor(250, 250, 250);
                    pdf.setDrawColor(200, 200, 200);
                    pdf.rect(margen, yPos - 2, anchoContenido, 14, 'FD');
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(10);
                    pdf.setTextColor(0, 0, 0);
                    pdf.text("5. EVIDENCIAS FOTOGRÁFICAS ORIGINALES (Continuación)", margen + 6, yPos + 6);
                    yPos += 18;
                }
                
                for (let col = 0; col < imagenesEnFila; col++) {
                    let xPos = col === 0 ? col1X : col2X;
                    const imagen = imagenesPrincipales[imagenIndex + col];
                    const numeroImagen = imagenIndex + col + 1;
                    
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(7);
                    pdf.setTextColor(100, 100, 100);
                    pdf.text(`Imagen ${numeroImagen}`, xPos + 2, yPos - 3);
                    
                    await this.dibujarImagen(pdf, imagen, xPos, yPos, imgWidth, imgHeight, numeroImagen, imgWidth);
                }
                
                yPos += alturaFila + 18;
                imagenIndex += imagenesEnFila;
            }
            yPos += 5;
        } else {
            pdf.setFillColor(255, 255, 255);
            pdf.setDrawColor(200, 200, 200);
            pdf.rect(margen, yPos, anchoContenido, 32, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            pdf.text("5. EVIDENCIAS FOTOGRÁFICAS ORIGINALES", margen + 6, yPos + 6);
            pdf.line(margen + 4, yPos + 12, margen + anchoContenido - 4, yPos + 12);
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text("No se adjuntaron evidencias fotográficas en este reporte.", margen + 6, yPos + 22);
            yPos += 32 + 8;
        }
        
        // SEGUIMIENTOS
        const seguimientos = incidencia.getSeguimientosArray ? incidencia.getSeguimientosArray() : [];
        
        if (seguimientos.length > 0) {
            if (!this.verificarEspacio(pdf, yPos, 20)) {
                this.dibujarPiePagina(pdf);
                pdf.addPage();
                this.paginaActualReal++;
                this.dibujarEncabezadoBase(pdf, 'INFORME DE SEGUIMIENTO', `${incidencia.id} (Continuación)`);
                yPos = this.alturaEncabezado + 5;
            }
            
            pdf.setFillColor(250, 250, 250);
            pdf.setDrawColor(200, 200, 200);
            pdf.rect(margen, yPos - 2, anchoContenido, 14, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            pdf.text("6. HISTORIAL DE SEGUIMIENTOS", margen + 6, yPos + 6);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${seguimientos.length} seguimiento(s)`, anchoPagina - margen - 50, yPos + 6);
            yPos += 18;
            
            for (let i = 0; i < seguimientos.length; i++) {
                const seguimiento = seguimientos[i];
                
                if (!this.verificarEspacio(pdf, yPos, 80)) {
                    this.dibujarPiePagina(pdf);
                    pdf.addPage();
                    this.paginaActualReal++;
                    this.dibujarEncabezadoBase(pdf, 'INFORME DE SEGUIMIENTO', `${incidencia.id} (Continuación)`);
                    yPos = this.alturaEncabezado + 5;
                    
                    pdf.setFillColor(250, 250, 250);
                    pdf.setDrawColor(200, 200, 200);
                    pdf.rect(margen, yPos - 2, anchoContenido, 14, 'FD');
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(10);
                    pdf.setTextColor(0, 0, 0);
                    pdf.text("6. HISTORIAL DE SEGUIMIENTOS (Continuación)", margen + 6, yPos + 6);
                    yPos += 18;
                }
                
                const alturaSeguimiento = await this.dibujarSeguimiento(pdf, seguimiento, margen, yPos, anchoContenido, i + 1);
                yPos += alturaSeguimiento + 8;
            }
        }
        
        // AVISO
        const alturaAviso = 36;
        if (yPos > altoPagina - alturaAviso - 15) {
            this.dibujarPiePagina(pdf);
            pdf.addPage();
            this.paginaActualReal++;
            this.dibujarEncabezadoBase(pdf, 'INFORME DE SEGUIMIENTO', `${incidencia.id} (Continuación)`);
            yPos = this.alturaEncabezado + 5;
        }
        
        pdf.setFillColor(248, 248, 248);
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(margen, altoPagina - alturaAviso - 8, anchoContenido, alturaAviso, 'FD');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(80, 80, 80);
        pdf.text("AVISO DE PRIVACIDAD", margen + 6, altoPagina - alturaAviso - 2);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.setTextColor(100, 100, 100);
        
        const aviso = "La información contenida en este documento es responsabilidad exclusiva de quien utiliza el Sistema Centinela y de la persona que ingresó los datos. Este reporte tiene carácter informativo y puede ser utilizado como medio de prueba ante las autoridades correspondientes.";
        const lineasAviso = this.dividirTextoEnLineas(pdf, aviso, anchoContenido - 20);
        let yAviso = altoPagina - alturaAviso + 4;
        for (let i = 0; i < Math.min(lineasAviso.length, 3); i++) {
            pdf.text(lineasAviso[i], margen + 6, yAviso + (i * 4));
        }
        
        this.dibujarPiePagina(pdf);
    }
}

export const generadorIPHSeguimiento = new IPHGeneratorSeguimiento();
export default generadorIPHSeguimiento;