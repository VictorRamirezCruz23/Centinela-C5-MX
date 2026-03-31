// plan.js - CLASE PARA PLANES PERSONALIZADOS
// Colección: planes - ID del documento = nombre del plan (slug)

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { db } from '/config/firebase-config.js';

// =============================================
// MÓDULOS DISPONIBLES DEL SISTEMA
// =============================================
export const MODULOS_SISTEMA = {
    // ========== MAPA INCIDENCIAS ==========
    incidencias: {
        id: 'incidencias',
        nombre: 'Incidencias',
        descripcion: 'Gestión completa de incidencias',
        icono: 'fa-exclamation-triangle',
        color: '#ef4444',
        permisos: {
            listaIncidencias: {
                id: 'listaIncidencias',
                nombre: 'Lista de Incidencias',
                icono: 'fa-list'
            },
            crearIncidencias: {
                id: 'crearIncidencias',
                nombre: 'Crear Incidencias',
                icono: 'fa-plus-circle'
            },
            incidenciasCanalizadas: {
                id: 'incidenciasCanalizadas',
                nombre: 'Incidencias Canalizadas',
                icono: 'fa-share-alt'
            }
        }
    },
    
    // ========== MAPA ALERTAS ==========
    alertas: {
        id: 'alertas',
        nombre: 'Alertas',
        descripcion: 'Visualización de alertas en mapa',
        icono: 'fa-map-marker-alt',
        color: '#a855f7',
        permisos: {
            mapaAlertas: {
                id: 'mapaAlertas',
                nombre: 'Mapa de Alertas',
                icono: 'fa-map-marker-alt'
            }
        }
    }
};

// =============================================
// FUNCIÓN AUXILIAR: Convertir nombre a ID válido
// =============================================
function generarIdDesdeNombre(nombre) {
    return nombre
        .toLowerCase()
        .trim()
        .replace(/[áäâ]/g, 'a')
        .replace(/[éëê]/g, 'e')
        .replace(/[íïî]/g, 'i')
        .replace(/[óöô]/g, 'o')
        .replace(/[úüû]/g, 'u')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// =============================================
// CLASE PLAN PERSONALIZADO
// =============================================
class PlanPersonalizado {
    constructor(id, data) {
        // ID del documento
        this.id = id || null;
        
        // ========== DATOS DEL PLAN ==========
        this.nombre = data.nombre || '';
        this.descripcion = data.descripcion || '';
        this.precio = data.precio || 0;
        this.color = data.color || '#0dcaf0';
        this.icono = data.icono || 'fa-cube';
        
        // ========== MAPAS ACTIVOS ==========
        this.mapasActivos = data.mapasActivos || {
            incidencias: false,
            alertas: false
        };
    }
    
    // Verificar si tiene acceso a un mapa específico
    tieneMapa(mapaId) {
        return this.mapasActivos[mapaId] === true;
    }
    
    // Verificar si tiene acceso a un permiso específico dentro de un mapa
    tienePermiso(mapaId, permisoId) {
        if (!this.tieneMapa(mapaId)) return false;
        const mapa = MODULOS_SISTEMA[mapaId];
        if (!mapa || !mapa.permisos) return false;
        return Object.keys(mapa.permisos).includes(permisoId);
    }
    
    // Verificar acceso a cualquier funcionalidad
    puedeAcceder(funcionalidadId) {
        const partes = funcionalidadId.split('.');
        if (partes.length === 1) {
            return this.tieneMapa(partes[0]);
        } else if (partes.length === 2) {
            return this.tienePermiso(partes[0], partes[1]);
        }
        return false;
    }
    
    // Obtener todos los mapas activos
    obtenerMapasActivos() {
        const activos = [];
        for (const [mapaId, activo] of Object.entries(this.mapasActivos)) {
            if (activo && MODULOS_SISTEMA[mapaId]) {
                activos.push({
                    id: mapaId,
                    ...MODULOS_SISTEMA[mapaId]
                });
            }
        }
        return activos;
    }
    
    // Obtener todos los permisos activos
    obtenerPermisosActivos() {
        const permisos = [];
        for (const [mapaId, activo] of Object.entries(this.mapasActivos)) {
            if (activo && MODULOS_SISTEMA[mapaId] && MODULOS_SISTEMA[mapaId].permisos) {
                for (const [permisoId, permisoData] of Object.entries(MODULOS_SISTEMA[mapaId].permisos)) {
                    permisos.push({
                        id: `${mapaId}.${permisoId}`,
                        mapaId: mapaId,
                        mapaNombre: MODULOS_SISTEMA[mapaId].nombre,
                        ...permisoData
                    });
                }
            }
        }
        return permisos;
    }
    
    // Obtener información completa de todos los mapas
    obtenerMapasCompletos() {
        return Object.keys(MODULOS_SISTEMA).map(mapaId => ({
            id: mapaId,
            ...MODULOS_SISTEMA[mapaId],
            activo: this.tieneMapa(mapaId),
            permisosActivos: this.tieneMapa(mapaId) 
                ? Object.keys(MODULOS_SISTEMA[mapaId].permisos).map(permisoId => ({
                    id: permisoId,
                    ...MODULOS_SISTEMA[mapaId].permisos[permisoId]
                }))
                : []
        }));
    }
    
    // Contar mapas activos
    contarMapasActivos() {
        return Object.values(this.mapasActivos).filter(activo => activo === true).length;
    }
    
    // Contar permisos activos totales
    contarPermisosActivos() {
        return this.obtenerPermisosActivos().length;
    }
    
    // Obtener precio formateado
    obtenerPrecioFormateado() {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2
        }).format(this.precio);
    }
    
    // ToFirestore para crear
    toFirestoreCreate() {
        return {
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            color: this.color,
            icono: this.icono,
            mapasActivos: this.mapasActivos,
            fechaCreacion: serverTimestamp()
        };
    }
    
    // ToFirestore para actualizar
    toFirestoreUpdate() {
        return {
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            color: this.color,
            icono: this.icono,
            mapasActivos: this.mapasActivos,
            fechaActualizacion: serverTimestamp()
        };
    }
    
    // ToUI para mostrar en interfaz
    toUI() {
        return {
            id: this.id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            precioFormateado: this.obtenerPrecioFormateado(),
            color: this.color,
            icono: this.icono,
            mapasActivos: this.mapasActivos,
            mapasActivosLista: this.obtenerMapasActivos(),
            permisosActivos: this.obtenerPermisosActivos(),
            totalMapasActivos: this.contarMapasActivos(),
            totalPermisosActivos: this.contarPermisosActivos(),
            listaMapasCompleta: this.obtenerMapasCompletos()
        };
    }
    
    // ToJSON
    toJSON() {
        return {
            id: this.id,
            nombre: this.nombre,
            descripcion: this.descripcion,
            precio: this.precio,
            color: this.color,
            icono: this.icono,
            mapasActivos: this.mapasActivos
        };
    }
    
    // ToString
    toString() {
        const mapasActivos = this.contarMapasActivos();
        const totalMapas = Object.keys(MODULOS_SISTEMA).length;
        return `Plan: ${this.nombre} (${mapasActivos}/${totalMapas} mapas activos)`;
    }
}

// =============================================
// MANAGER DE PLANES PERSONALIZADOS
// =============================================
class PlanPersonalizadoManager {
    constructor() {
        this.planes = [];
    }
    
    _getCollectionName() {
        return 'planes';
    }
    
    async crearPlan(planData) {
        try {
            if (!planData.nombre) {
                throw new Error('El nombre del plan es requerido');
            }
            
            const planId = generarIdDesdeNombre(planData.nombre);
            
            if (!planId) {
                throw new Error('El nombre del plan no es válido para generar un ID');
            }
            
            const mapasActivos = planData.mapasActivos || {
                incidencias: false,
                alertas: false
            };
            
            const nuevoPlan = new PlanPersonalizado(planId, {
                nombre: planData.nombre,
                descripcion: planData.descripcion || '',
                precio: planData.precio || 0,
                color: planData.color || '#0dcaf0',
                icono: planData.icono || 'fa-cube',
                mapasActivos: mapasActivos
            });
            
            const collectionName = this._getCollectionName();
            const planRef = doc(db, collectionName, planId);
            await setDoc(planRef, nuevoPlan.toFirestoreCreate());
            
            this.planes.unshift(nuevoPlan);
            
            return nuevoPlan;
            
        } catch (error) {
            console.error('❌ Error creando plan:', error);
            throw error;
        }
    }
    
    async obtenerTodos() {
        try {
            const collectionName = this._getCollectionName();
            const planesCollection = collection(db, collectionName);
            const q = query(planesCollection, orderBy('fechaCreacion', 'desc'));
            const planesSnapshot = await getDocs(q);
            
            const planes = [];
            planesSnapshot.forEach(doc => {
                try {
                    const data = doc.data();
                    const plan = new PlanPersonalizado(doc.id, data);
                    planes.push(plan);
                } catch (error) {
                    console.error(`Error procesando plan ${doc.id}:`, error);
                }
            });
            
            this.planes = planes;
            return planes;
            
        } catch (error) {
            console.error('Error obteniendo planes:', error);
            return [];
        }
    }
    
    async obtenerPorId(id) {
        const cachePlan = this.planes.find(p => p.id === id);
        if (cachePlan) return cachePlan;
        
        try {
            const collectionName = this._getCollectionName();
            const planRef = doc(db, collectionName, id);
            const planSnap = await getDoc(planRef);
            
            if (planSnap.exists()) {
                const plan = new PlanPersonalizado(id, planSnap.data());
                this.planes.push(plan);
                return plan;
            }
            
            return null;
            
        } catch (error) {
            console.error('Error obteniendo plan por ID:', error);
            return null;
        }
    }
    
    async actualizarPlan(id, datos) {
        try {
            const plan = await this.obtenerPorId(id);
            if (!plan) {
                throw new Error('Plan no encontrado');
            }
            
            if (datos.nombre !== undefined) plan.nombre = datos.nombre;
            if (datos.descripcion !== undefined) plan.descripcion = datos.descripcion;
            if (datos.precio !== undefined) plan.precio = datos.precio;
            if (datos.color !== undefined) plan.color = datos.color;
            if (datos.icono !== undefined) plan.icono = datos.icono;
            if (datos.mapasActivos !== undefined) {
                plan.mapasActivos = { ...plan.mapasActivos, ...datos.mapasActivos };
            }
            
            const collectionName = this._getCollectionName();
            const planRef = doc(db, collectionName, id);
            await updateDoc(planRef, plan.toFirestoreUpdate());
            
            const cacheIndex = this.planes.findIndex(p => p.id === id);
            if (cacheIndex !== -1) {
                this.planes[cacheIndex] = plan;
            }
            
            return plan;
            
        } catch (error) {
            console.error('Error actualizando plan:', error);
            throw error;
        }
    }
    
    async eliminarPlan(id) {
        try {
            const plan = await this.obtenerPorId(id);
            if (!plan) {
                throw new Error('Plan no encontrado');
            }
            
            const collectionName = this._getCollectionName();
            const planRef = doc(db, collectionName, id);
            await deleteDoc(planRef);
            
            const cacheIndex = this.planes.findIndex(p => p.id === id);
            if (cacheIndex !== -1) {
                this.planes.splice(cacheIndex, 1);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error eliminando plan:', error);
            throw error;
        }
    }
}

// =============================================
// EXPORTACIONES
// =============================================
export { PlanPersonalizado, PlanPersonalizadoManager, generarIdDesdeNombre };