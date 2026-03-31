// estadisticas.js - CLASE DE ESTADÍSTICAS CON REGISTRO DE CONSUMO FIREBASE
// VERSIÓN FINAL CON LA MISMA ESTRUCTURA

import {
    collection,
    getDocs,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

// [MODIFICACIÓN 1]: Importar la instancia de consumo
import consumo from '/clases/consumoFirebase.js';

// ============================================
// CLASE ESTADISTICAS MANAGER
// ============================================
class EstadisticasManager {
    constructor() {
        this.incidencias = []; // Cache igual que IncidenciaManager
    }

    _getCollectionName(organizacionCamelCase) {
        return `incidencias_${organizacionCamelCase}`;
    }

    _procesarIncidencias(snapshot) {
        const incidencias = [];
        snapshot.forEach(doc => {
            incidencias.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return incidencias;
    }

    _calcularTiempoResolucion(fechaInicio, fechaFinalizacion) {
        if (!fechaInicio || !fechaFinalizacion) return null;

        const inicio = fechaInicio.toDate ? fechaInicio.toDate() : new Date(fechaInicio);
        const fin = fechaFinalizacion.toDate ? fechaFinalizacion.toDate() : new Date(fechaFinalizacion);

        const diferenciaMs = fin - inicio;
        const diferenciaHoras = Math.round(diferenciaMs / (1000 * 60 * 60) * 10) / 10;
        const diferenciaDias = Math.round(diferenciaMs / (1000 * 60 * 60 * 24) * 10) / 10;

        return {
            horas: diferenciaHoras,
            dias: diferenciaDias
        };
    }

    _contarSeguimientos(incidencia) {
        if (!incidencia.seguimiento) return 0;
        return Object.keys(incidencia.seguimiento).length;
    }

    // ===== MÉTODO PRINCIPAL =====

    async getEstadisticas(organizacionCamelCase, filtros = {}) {
        try {
            if (!organizacionCamelCase) {
                throw new Error('Se requiere organización');
            }

            const collectionName = this._getCollectionName(organizacionCamelCase);
            const incidenciasCollection = collection(db, collectionName);

            // Construir query con filtros
            let constraints = [orderBy("fechaCreacion", "desc")];

            if (filtros.fechaInicio) {
                constraints.push(where("fechaCreacion", ">=", new Date(filtros.fechaInicio)));
            }
            if (filtros.fechaFin) {
                constraints.push(where("fechaCreacion", "<=", new Date(filtros.fechaFin)));
            }
            if (filtros.categoriaId && filtros.categoriaId !== 'todas') {
                constraints.push(where("categoriaId", "==", filtros.categoriaId));
            }
            if (filtros.sucursalId && filtros.sucursalId !== 'todas') {
                constraints.push(where("sucursalId", "==", filtros.sucursalId));
            }

            const incidenciasQuery = query(incidenciasCollection, ...constraints);
            
            // [MODIFICACIÓN 2]: Registrar LECTURA antes de getDocs
            await consumo.registrarFirestoreLectura(collectionName, 'estadísticas');

            const snapshot = await getDocs(incidenciasQuery);

            this.incidencias = this._procesarIncidencias(snapshot);

            // Aplicar filtro de búsqueda en texto
            let incidenciasFiltradas = this.incidencias;
            if (filtros.busqueda && filtros.busqueda.trim() !== '') {
                const busqueda = filtros.busqueda.toLowerCase();
                incidenciasFiltradas = incidenciasFiltradas.filter(inc =>
                    inc.detalles?.toLowerCase().includes(busqueda) ||
                    inc.id?.toLowerCase().includes(busqueda)
                );
            }

            return this._calcularEstadisticas(incidenciasFiltradas);

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    _calcularEstadisticas(incidencias) {
        const total = incidencias.length;

        // Contar por estado
        const pendientes = incidencias.filter(i => i.estado === 'pendiente').length;
        const finalizadas = incidencias.filter(i => i.estado === 'finalizada').length;

        // Contar por nivel de riesgo
        const criticas = incidencias.filter(i => i.nivelRiesgo === 'critico').length;
        const altas = incidencias.filter(i => i.nivelRiesgo === 'alto').length;
        const medias = incidencias.filter(i => i.nivelRiesgo === 'medio').length;
        const bajas = incidencias.filter(i => i.nivelRiesgo === 'bajo').length;

        // Calcular tiempos de resolución
        const incidenciasFinalizadas = incidencias.filter(i => i.estado === 'finalizada' && i.fechaFinalizacion);
        const tiemposResolucion = incidenciasFinalizadas
            .map(i => this._calcularTiempoResolucion(i.fechaInicio, i.fechaFinalizacion))
            .filter(t => t !== null);

        const tiempoPromedio = tiemposResolucion.length > 0
            ? {
                horas: tiemposResolucion.reduce((sum, t) => sum + t.horas, 0) / tiemposResolucion.length,
                dias: tiemposResolucion.reduce((sum, t) => sum + t.dias, 0) / tiemposResolucion.length
            }
            : { horas: 0, dias: 0 };

        // Estadísticas de seguimientos
        const totalSeguimientos = incidencias.reduce((acc, i) => acc + this._contarSeguimientos(i), 0);
        const incidenciasConSeguimientos = incidencias.filter(i => this._contarSeguimientos(i) > 0).length;

        return {
            // Métricas principales (para las tarjetas)
            metricas: {
                criticas,
                altas,
                pendientes,
                total
            },

            // Distribución por riesgo
            distribucionRiesgo: {
                critico: criticas,
                alto: altas,
                medio: medias,
                bajo: bajas,
                porcentajes: {
                    critico: total > 0 ? Math.round((criticas / total) * 100) : 0,
                    alto: total > 0 ? Math.round((altas / total) * 100) : 0,
                    medio: total > 0 ? Math.round((medias / total) * 100) : 0,
                    bajo: total > 0 ? Math.round((bajas / total) * 100) : 0
                }
            },

            // Estado general
            estado: {
                pendientes,
                finalizadas,
                porcentajePendientes: total > 0 ? Math.round((pendientes / total) * 100) : 0,
                porcentajeFinalizadas: total > 0 ? Math.round((finalizadas / total) * 100) : 0
            },

            // Rendimiento
            rendimiento: {
                tiempoPromedioResolucion: tiempoPromedio,
                totalSeguimientos,
                incidenciasConSeguimientos,
                promedioSeguimientos: total > 0 ? Math.round((totalSeguimientos / total) * 10) / 10 : 0,
                incidenciasConImagenes: incidencias.filter(i => (i.imagenes || []).length > 0).length
            },

            // Metadatos
            fechaCalculo: new Date(),
            totalIncidencias: total
        };
    }

    // ===== MÉTODOS DE CONSULTA ESPECÍFICOS =====

    async getEstadisticasPorSucursal(organizacionCamelCase, sucursalId) {
        // [MODIFICACIÓN 3]: Registrar LECTURA antes de la consulta
        await consumo.registrarFirestoreLectura(
            this._getCollectionName(organizacionCamelCase), 
            `estadísticas por sucursal: ${sucursalId}`
        );
        return await this.getEstadisticas(organizacionCamelCase, { sucursalId });
    }

    async getEstadisticasPorCategoria(organizacionCamelCase, categoriaId) {
        // [MODIFICACIÓN 4]: Registrar LECTURA antes de la consulta
        await consumo.registrarFirestoreLectura(
            this._getCollectionName(organizacionCamelCase), 
            `estadísticas por categoría: ${categoriaId}`
        );
        return await this.getEstadisticas(organizacionCamelCase, { categoriaId });
    }

    async getEstadisticasPorPeriodo(organizacionCamelCase, fechaInicio, fechaFin) {
        // [MODIFICACIÓN 5]: Registrar LECTURA antes de la consulta
        await consumo.registrarFirestoreLectura(
            this._getCollectionName(organizacionCamelCase), 
            `estadísticas por período: ${fechaInicio} - ${fechaFin}`
        );
        return await this.getEstadisticas(organizacionCamelCase, { fechaInicio, fechaFin });
    }

    // ===== MÉTODO PARA LIMPIAR CACHE =====

    limpiarCache() {
        this.incidencias = [];
    }
}

// ===== EXPORT =====
export { EstadisticasManager };