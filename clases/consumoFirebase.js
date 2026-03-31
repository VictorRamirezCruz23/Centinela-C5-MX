// consumoFirebase.js
// Clase para contabilizar y PERSISTIR operaciones de Firebase
// SOLO UN DOCUMENTO por empresa en colección "consumo"
// MODIFICADO: Eliminada toda la funcionalidad de Autenticación (Auth)

import { db } from '/config/firebase-config.js';
import { doc, setDoc, updateDoc, increment, serverTimestamp, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

class ConsumoFirebase {
    constructor() {
        
        // Contadores en memoria (para visualización rápida)
        this.contadores = {
            firestore: {
                lecturas: 0,
                escrituras: 0,
                eliminaciones: 0,
                actualizaciones: 0,
                total: 0
            },
            storage: {
                subidas: 0,
                descargas: 0,
                eliminaciones: 0,
                total: 0
            },
            functions: {
                invocaciones: 0,
                notificacionesPushEnviadas: 0,
                usuariosNotificados: 0,
                total: 0
            },
            fcm: {
                notificacionesEnviadas: 0,
                tokensRegistrados: 0,
                tokensEliminados: 0,
                total: 0
            },
            totalOperaciones: 0,
            ultimaActualizacion: new Date()
        };

        this.historial = [];
        this.limiteHistorial = 100;
        this.organizacionCamelCase = null;
        this.nombreEmpresa = null;
        this._cargarOrganizacion();
        
    }

    _cargarOrganizacion() {
        try {
            // Intentar obtener nombre real de la empresa
            const adminInfo = localStorage.getItem('adminInfo');
            if (adminInfo) {
                const adminData = JSON.parse(adminInfo);
                this.organizacionCamelCase = adminData.organizacionCamelCase;
                this.nombreEmpresa = adminData.organizacion || adminData.organizacionCamelCase;
                return;
            }
            
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            this.organizacionCamelCase = userData.organizacionCamelCase;
            this.nombreEmpresa = userData.organizacion || userData.organizacionCamelCase;
            
        } catch (error) {
            console.error('❌ Error cargando organización:', error);
            this.nombreEmpresa = 'empresa_desconocida';
        }
    }

    // Método genérico para registrar cualquier operación
    async registrar(servicio, tipo, detalles = {}) {
        
        if (!this.organizacionCamelCase) {
            console.warn('⚠️ No hay organización definida, no se guarda en Firestore');
            return;
        }

        const timestamp = new Date();
        const idEmpresa = this.organizacionCamelCase;
        const nombreEmpresa = this.nombreEmpresa || idEmpresa;
        
        // 1️⃣ ACTUALIZAR EN FIRESTORE (usando increment)
        try {
            const docRef = doc(db, 'consumo', idEmpresa);
            
            // Construir la ruta del campo a incrementar según servicio y tipo
            let campoRuta = '';
            
            switch (servicio) {
                case 'firestore':
                    if (tipo === 'lectura') campoRuta = 'firestore.lecturas';
                    else if (tipo === 'escritura') campoRuta = 'firestore.escrituras';
                    else if (tipo === 'eliminacion') campoRuta = 'firestore.eliminaciones';
                    else if (tipo === 'actualizacion') campoRuta = 'firestore.actualizaciones';
                    break;
                    
                case 'storage':
                    if (tipo === 'subida') campoRuta = 'storage.subidas';
                    else if (tipo === 'descarga') campoRuta = 'storage.descargas';
                    else if (tipo === 'eliminacion') campoRuta = 'storage.eliminaciones';
                    break;
                    
                case 'functions':
                    if (tipo === 'invocacion') campoRuta = 'functions.invocaciones';
                    break;
                    
                case 'fcm':
                    if (tipo === 'notificacion') campoRuta = 'fcm.notificacionesEnviadas';
                    else if (tipo === 'token_registro') campoRuta = 'fcm.tokensRegistrados';
                    else if (tipo === 'token_eliminacion') campoRuta = 'fcm.tokensEliminados';
                    break;
            }

            // Usar set con merge para crear el documento si no existe
            await setDoc(docRef, {
                [servicio]: {
                    [tipo]: increment(1),
                    total: increment(1)
                },
                totalOperaciones: increment(1),
                ultimaActualizacion: serverTimestamp(),
                nombreEmpresa,
                ultimaOperacion: {
                    servicio,
                    tipo,
                    detalles,
                    timestamp: serverTimestamp()
                }
            }, { merge: true });


        } catch (error) {
            console.error('❌ Error actualizando documento en Firestore:', error);
        }

        // 2️⃣ Actualizar contadores en memoria
        switch (servicio) {
            case 'firestore':
                if (tipo === 'lectura') this.contadores.firestore.lecturas++;
                else if (tipo === 'escritura') this.contadores.firestore.escrituras++;
                else if (tipo === 'eliminacion') this.contadores.firestore.eliminaciones++;
                else if (tipo === 'actualizacion') this.contadores.firestore.actualizaciones++;
                this.contadores.firestore.total++;
                break;
            case 'storage':
                if (tipo === 'subida') this.contadores.storage.subidas++;
                else if (tipo === 'descarga') this.contadores.storage.descargas++;
                else if (tipo === 'eliminacion') this.contadores.storage.eliminaciones++;
                this.contadores.storage.total++;
                break;
            case 'functions':
                if (tipo === 'invocacion') this.contadores.functions.invocaciones++;
                this.contadores.functions.total++;
                break;
            case 'fcm':
                if (tipo === 'notificacion') this.contadores.fcm.notificacionesEnviadas++;
                else if (tipo === 'token_registro') this.contadores.fcm.tokensRegistrados++;
                else if (tipo === 'token_eliminacion') this.contadores.fcm.tokensEliminados++;
                this.contadores.fcm.total++;
                break;
        }

        this.contadores.totalOperaciones++;
        this.contadores.ultimaActualizacion = timestamp;

        // 3️⃣ Guardar en historial en memoria
        this.historial.push({
            servicio,
            tipo,
            detalles,
            timestamp,
            organizacion: this.organizacionCamelCase
        });
        
        if (this.historial.length > this.limiteHistorial) {
            this.historial.shift();
        }
        
    }

    // Métodos específicos para Firestore
    async registrarFirestoreLectura(coleccion, documento = null) {
        await this.registrar('firestore', 'lectura', { coleccion, documento });
    }

    async registrarFirestoreEscritura(coleccion, documento = null) {
        await this.registrar('firestore', 'escritura', { coleccion, documento });
    }

    async registrarFirestoreEliminacion(coleccion, documento = null) {
        await this.registrar('firestore', 'eliminacion', { coleccion, documento });
    }

    async registrarFirestoreActualizacion(coleccion, documento = null) {
        await this.registrar('firestore', 'actualizacion', { coleccion, documento });
    }

    // Métodos para Storage
    async registrarStorageSubida(ruta, archivo = null) {
        await this.registrar('storage', 'subida', { ruta, archivo });
    }

    async registrarStorageDescarga(ruta) {
        await this.registrar('storage', 'descarga', { ruta });
    }

    async registrarStorageEliminacion(ruta) {
        await this.registrar('storage', 'eliminacion', { ruta });
    }

    // Métodos para Functions
    async registrarFunctionInvocacion(nombreFuncion, parametros = {}) {
        await this.registrar('functions', 'invocacion', { nombreFuncion, parametros });
    }

    // 🆕 NUEVO: Método específico para registrar notificaciones push enviadas
    async registrarNotificacionesPush(cantidadNotificaciones, cantidadUsuarios, nombreFuncion = 'sendPushNotification', detalles = {}) {
        
        if (!this.organizacionCamelCase) {
            console.warn('⚠️ No hay organización definida, no se guarda en Firestore');
            return;
        }

        const idEmpresa = this.organizacionCamelCase;
        const nombreEmpresa = this.nombreEmpresa || idEmpresa;
        
        try {
            const docRef = doc(db, 'consumo', idEmpresa);
            
            await setDoc(docRef, {
                functions: {
                    invocaciones: increment(1),
                    notificacionesPushEnviadas: increment(cantidadNotificaciones),
                    usuariosNotificados: increment(cantidadUsuarios),
                    total: increment(1)
                },
                totalOperaciones: increment(1),
                ultimaActualizacion: serverTimestamp(),
                nombreEmpresa,
                ultimaOperacion: {
                    servicio: 'functions',
                    tipo: 'notificacion_push',
                    detalles: {
                        nombreFuncion: nombreFuncion,
                        notificacionesEnviadas: cantidadNotificaciones,
                        usuariosNotificados: cantidadUsuarios,
                        ...detalles
                    },
                    timestamp: serverTimestamp()
                }
            }, { merge: true });


        } catch (error) {
            console.error('❌ Error registrando notificaciones push:', error);
        }

        // Actualizar contadores en memoria
        this.contadores.functions.invocaciones++;
        this.contadores.functions.notificacionesPushEnviadas += cantidadNotificaciones;
        this.contadores.functions.usuariosNotificados += cantidadUsuarios;
        this.contadores.functions.total++;
        this.contadores.totalOperaciones++;
    }

    // Métodos para FCM (Firebase Cloud Messaging)
    async registrarFCMNotificacion(usuarioId, titulo) {
        await this.registrar('fcm', 'notificacion', { usuarioId, titulo });
    }

    async registrarFCMTokenRegistro(usuarioId, token) {
        await this.registrar('fcm', 'token_registro', { usuarioId, token });
    }

    async registrarFCMTokenEliminacion(usuarioId, token) {
        await this.registrar('fcm', 'token_eliminacion', { usuarioId, token });
    }

    // Obtener estadísticas actuales (solo memoria)
    obtenerEstadisticas() {
        return {
            firestore: { ...this.contadores.firestore },
            storage: { ...this.contadores.storage },
            functions: { ...this.contadores.functions },
            fcm: { ...this.contadores.fcm },
            totalOperaciones: this.contadores.totalOperaciones,
            ultimaActualizacion: this.contadores.ultimaActualizacion,
            historial: this.historial.slice(-50)
        };
    }

    // Resetear contadores en memoria (no afecta Firestore)
    resetearContadores() {
        this.contadores = {
            firestore: { lecturas: 0, escrituras: 0, eliminaciones: 0, actualizaciones: 0, total: 0 },
            storage: { subidas: 0, descargas: 0, eliminaciones: 0, total: 0 },
            functions: { 
                invocaciones: 0, 
                notificacionesPushEnviadas: 0, 
                usuariosNotificados: 0, 
                total: 0 
            },
            fcm: { notificacionesEnviadas: 0, tokensRegistrados: 0, tokensEliminados: 0, total: 0 },
            totalOperaciones: 0,
            ultimaActualizacion: new Date()
        };
        this.historial = [];
    }

    // Obtener datos de Firestore para una empresa específica
    async obtenerConsumoEmpresa(idEmpresa = null) {
        const empresaId = idEmpresa || this.organizacionCamelCase;
        if (!empresaId) return null;
        
        try {
            const docRef = doc(db, 'consumo', empresaId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error('❌ Error obteniendo consumo de empresa:', error);
            return null;
        }
    }

    // NUEVO MÉTODO: Listar todas las empresas
    async listarTodasLasEmpresas() {
        try {
            const consumoRef = collection(db, 'consumo');
            const snapshot = await getDocs(consumoRef);
            
            const empresas = [];
            snapshot.forEach(doc => {
                empresas.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return empresas;
        } catch (error) {
            console.error('❌ Error listando empresas:', error);
            return [];
        }
    }
}

// Exportar una instancia única (singleton)
const instanciaConsumo = new ConsumoFirebase();
export default instanciaConsumo;