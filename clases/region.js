// region.js - CON REGISTRO DE CONSUMO FIREBASE (PERSISTENTE)

import { db } from '/config/firebase-config.js';
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import consumo from '/clases/consumoFirebase.js';

class Region {
    // ... (todo igual, sin cambios)
    constructor(id, data) {
        this.id = id;
        this.nombre = data.nombre || '';
        this.color = data.color || '#0A2540';
        this.organizacion = data.organizacion || '';
        this.organizacionCamelCase = data.organizacionCamelCase || '';
        this.fechaCreacion = this._convertirFecha(data.fechaCreacion);
        this.fechaActualizacion = this._convertirFecha(data.fechaActualizacion) || this.fechaCreacion;
        this.creadoPor = data.creadoPor || '';
        this.creadoPorEmail = data.creadoPorEmail || '';
        this.creadoPorNombre = data.creadoPorNombre || '';
        this.actualizadoPor = data.actualizadoPor || '';
    }

    _convertirFecha(fecha) {
        if (!fecha) return null;
        if (fecha && typeof fecha.toDate === 'function') {
            return fecha.toDate();
        }
        if (fecha instanceof Date) {
            return fecha;
        }
        if (typeof fecha === 'string' || typeof fecha === 'number') {
            const date = new Date(fecha);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        if (fecha && typeof fecha === 'object' && 'seconds' in fecha) {
            return new Date(fecha.seconds * 1000);
        }
        return null;
    }

    getFechaCreacionFormateada(locale = 'es-MX') {
        if (!this.fechaCreacion) return 'No disponible';
        return this.fechaCreacion.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getFechaActualizacionFormateada(locale = 'es-MX') {
        if (!this.fechaActualizacion) return 'No disponible';
        return this.fechaActualizacion.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getColor() {
        return this.color;
    }

    getColorPreview() {
        return `<span style="display: inline-block; width: 16px; height: 16px; background: ${this.color}; border-radius: 50%; margin-right: 5px;"></span>`;
    }

    getResumen() {
        return {
            id: this.id,
            nombre: this.nombre,
            color: this.color,
            organizacion: this.organizacion
        };
    }
}

class RegionManager {
    constructor() {
        this.regiones = [];
        this.historialManager = null;
    }

    async _getHistorialManager() {
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

    async createRegion(regionData, organizacionCamelCase, creadorInfo) {
        try {
            if (!regionData.nombre) {
                throw new Error('El nombre de la región es obligatorio');
            }

            // CONSUMO: lectura para verificar existencia (AHORA CON AWAIT)
            await consumo.registrarFirestoreLectura(`regiones_${organizacionCamelCase}`, 'verificar nombre');
            
            const existe = await this.existeRegionPorNombre(regionData.nombre, organizacionCamelCase);
            if (existe) {
                throw new Error('Ya existe una región con este nombre');
            }

            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionesRef = collection(db, coleccionRegiones);

            const regionFirestoreData = {
                nombre: regionData.nombre,
                color: regionData.color || '#0A2540',
                organizacion: regionData.organizacion || '',
                organizacionCamelCase: organizacionCamelCase,
                creadoPor: creadorInfo.id || '',
                creadoPorEmail: creadorInfo.email || '',
                creadoPorNombre: creadorInfo.nombre || '',
                fechaCreacion: serverTimestamp(),
                fechaActualizacion: serverTimestamp()
            };

            // CONSUMO: escritura (AHORA CON AWAIT)
            await consumo.registrarFirestoreEscritura(coleccionRegiones, 'nueva región');

            const docRef = await addDoc(regionesRef, regionFirestoreData);

            const nuevaRegion = new Region(docRef.id, {
                ...regionFirestoreData,
                fechaCreacion: new Date(),
                fechaActualizacion: new Date()
            });

            this.regiones.unshift(nuevaRegion);

            const historial = await this._getHistorialManager();
            if (historial) {
                await historial.registrarActividad({
                    usuario: creadorInfo,
                    tipo: 'crear',
                    modulo: 'regiones',
                    descripcion: historial.generarDescripcion('crear', 'regiones', {
                        nombre: regionData.nombre,
                        color: regionData.color
                    }),
                    detalles: {
                        regionId: docRef.id,
                        nombre: regionData.nombre,
                        color: regionData.color || '#0A2540'
                    }
                });
            }

            return {
                id: docRef.id,
                region: nuevaRegion,
                success: true
            };

        } catch (error) {
            console.error("Error creando región:", error);
            throw error;
        }
    }

    async getRegionesByOrganizacion(organizacionCamelCase, usuarioActual = null) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionesRef = collection(db, coleccionRegiones);
            
            const regionesQuery = query(
                regionesRef,
                orderBy("fechaCreacion", "desc")
            );

            // CONSUMO: lectura (AHORA CON AWAIT)
            await consumo.registrarFirestoreLectura(coleccionRegiones, 'lista regiones');

            const snapshot = await getDocs(regionesQuery);
            const regiones = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                regiones.push(new Region(doc.id, data));
            });

            this.regiones = regiones;

            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'leer',
                        modulo: 'regiones',
                        descripcion: `Consultó lista de regiones (${regiones.length} regiones)`,
                        detalles: { total: regiones.length }
                    });
                }
            }

            return regiones;

        } catch (error) {
            console.error("Error obteniendo regiones:", error);
            return [];
        }
    }

    async getRegionById(id, organizacionCamelCase) {
        const regionEnMemoria = this.regiones.find(r => r.id === id);
        if (regionEnMemoria) {
            return regionEnMemoria;
        }

        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionRef = doc(db, coleccionRegiones, id);

            // CONSUMO: lectura (AHORA CON AWAIT)
            await consumo.registrarFirestoreLectura(coleccionRegiones, id);

            const regionSnap = await getDoc(regionRef);

            if (regionSnap.exists()) {
                const region = new Region(id, regionSnap.data());
                
                const index = this.regiones.findIndex(r => r.id === id);
                if (index === -1) {
                    this.regiones.push(region);
                } else {
                    this.regiones[index] = region;
                }
                
                return region;
            }

            return null;

        } catch (error) {
            console.error("Error obteniendo región por ID:", error);
            return null;
        }
    }

    async updateRegion(id, data, organizacionCamelCase, actualizadoPor) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionRef = doc(db, coleccionRegiones, id);

            const regionActual = await this.getRegionById(id, organizacionCamelCase);
            const nombreOriginal = regionActual ? regionActual.nombre : '';
            const colorOriginal = regionActual ? regionActual.color : '';

            if (data.nombre) {
                if (regionActual && regionActual.nombre !== data.nombre) {
                    // CONSUMO: lectura para verificar nombre (AHORA CON AWAIT)
                    await consumo.registrarFirestoreLectura(coleccionRegiones, 'verificar nombre');
                    
                    const existe = await this.existeRegionPorNombre(data.nombre, organizacionCamelCase);
                    if (existe) {
                        throw new Error('Ya existe otra región con este nombre');
                    }
                }
            }

            const updateData = {
                ...data,
                fechaActualizacion: serverTimestamp(),
                actualizadoPor: actualizadoPor?.id || 'sistema'
            };

            // CONSUMO: actualización (AHORA CON AWAIT)
            await consumo.registrarFirestoreActualizacion(coleccionRegiones, id);

            await updateDoc(regionRef, updateData);

            const index = this.regiones.findIndex(r => r.id === id);
            if (index !== -1) {
                Object.keys(data).forEach(key => {
                    this.regiones[index][key] = data[key];
                });
                this.regiones[index].fechaActualizacion = new Date();
                this.regiones[index].actualizadoPor = actualizadoPor?.id || 'sistema';
            }

            if (actualizadoPor) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    const cambios = [];
                    if (nombreOriginal !== data.nombre) {
                        cambios.push(`nombre: "${nombreOriginal}" → "${data.nombre}"`);
                    }
                    if (colorOriginal !== data.color) {
                        cambios.push(`color: ${colorOriginal} → ${data.color}`);
                    }

                    await historial.registrarActividad({
                        usuario: actualizadoPor,
                        tipo: 'editar',
                        modulo: 'regiones',
                        descripcion: historial.generarDescripcion('editar', 'regiones', {
                            nombre: data.nombre || nombreOriginal,
                            nombreOriginal,
                            cambios: cambios.join(', ')
                        }),
                        detalles: {
                            regionId: id,
                            nombre: data.nombre || nombreOriginal,
                            nombreOriginal,
                            color: data.color || colorOriginal,
                            colorOriginal,
                            cambios
                        }
                    });
                }
            }

            return true;

        } catch (error) {
            console.error("Error actualizando región:", error);
            throw error;
        }
    }

    async regionTieneSucursales(regionId, organizacionCamelCase) {
        try {
            const coleccionSucursales = `sucursales_${organizacionCamelCase}`;
            const sucursalesRef = collection(db, coleccionSucursales);
            
            const q = query(
                sucursalesRef,
                where("regionId", "==", regionId)
            );

            // CONSUMO: lectura (AHORA CON AWAIT)
            await consumo.registrarFirestoreLectura(coleccionSucursales, 'consulta sucursales por región');

            const snapshot = await getDocs(q);
            return !snapshot.empty;

        } catch (error) {
            console.error("Error verificando sucursales de la región:", error);
            return false;
        }
    }

    async getSucursalesDeRegion(regionId, organizacionCamelCase) {
        try {
            const coleccionSucursales = `sucursales_${organizacionCamelCase}`;
            const sucursalesRef = collection(db, coleccionSucursales);
            
            const q = query(
                sucursalesRef,
                where("regionId", "==", regionId)
            );

            // CONSUMO: lectura (AHORA CON AWAIT)
            await consumo.registrarFirestoreLectura(coleccionSucursales, 'sucursales de región');

            const snapshot = await getDocs(q);
            const sucursales = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                sucursales.push({
                    id: doc.id,
                    nombre: data.nombre || 'Sin nombre',
                    tipo: data.tipo || 'Sucursal'
                });
            });

            return sucursales;

        } catch (error) {
            console.error("Error obteniendo sucursales de la región:", error);
            return [];
        }
    }

    async deleteRegion(id, organizacionCamelCase, usuarioActual = null) {
        try {
            const region = await this.getRegionById(id, organizacionCamelCase);
            const nombreRegion = region ? region.nombre : 'Región desconocida';
            const colorRegion = region ? region.color : '';

            const tieneSucursales = await this.regionTieneSucursales(id, organizacionCamelCase);
            
            if (tieneSucursales) {
                const sucursales = await this.getSucursalesDeRegion(id, organizacionCamelCase);
                const nombresSucursales = sucursales.map(s => s.nombre).join(', ');
                
                throw new Error(
                    `No se puede eliminar la región porque tiene ${sucursales.length} sucursal(es) asociada(s): ${nombresSucursales}. ` +
                    `Debe reasignar o eliminar las sucursales primero.`
                );
            }

            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const regionRef = doc(db, coleccionRegiones, id);

            // CONSUMO: eliminación (AHORA CON AWAIT)
            await consumo.registrarFirestoreEliminacion(coleccionRegiones, id);

            await deleteDoc(regionRef);

            const index = this.regiones.findIndex(r => r.id === id);
            if (index !== -1) {
                this.regiones.splice(index, 1);
            }

            if (usuarioActual) {
                const historial = await this._getHistorialManager();
                if (historial) {
                    await historial.registrarActividad({
                        usuario: usuarioActual,
                        tipo: 'eliminar',
                        modulo: 'regiones',
                        descripcion: historial.generarDescripcion('eliminar', 'regiones', {
                            nombre: nombreRegion
                        }),
                        detalles: {
                            regionId: id,
                            nombre: nombreRegion,
                            color: colorRegion
                        }
                    });
                }
            }

            return true;

        } catch (error) {
            console.error("Error eliminando región:", error);
            throw error;
        }
    }

    async existeRegionPorNombre(nombre, organizacionCamelCase) {
        try {
            const coleccionRegiones = `regiones_${organizacionCamelCase}`;
            const q = query(
                collection(db, coleccionRegiones),
                where("nombre", "==", nombre)
            );
            
            const snapshot = await getDocs(q);
            return !snapshot.empty;

        } catch (error) {
            console.error("Error verificando nombre de región:", error);
            return false;
        }
    }

    async buscarRegionesPorNombre(termino, organizacionCamelCase) {
        try {
            const regiones = await this.getRegionesByOrganizacion(organizacionCamelCase);
            
            const terminoLower = termino.toLowerCase();
            return regiones.filter(region => 
                region.nombre.toLowerCase().includes(terminoLower)
            );

        } catch (error) {
            console.error("Error buscando regiones:", error);
            return [];
        }
    }

    async getTotalRegiones(organizacionCamelCase) {
        try {
            const regiones = await this.getRegionesByOrganizacion(organizacionCamelCase);
            return regiones.length;
        } catch (error) {
            console.error("Error obteniendo total de regiones:", error);
            return 0;
        }
    }
}

export { Region, RegionManager };