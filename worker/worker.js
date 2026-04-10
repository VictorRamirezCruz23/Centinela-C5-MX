// worker.js - Versión con loop no bloqueante

const axios = require('axios');
const admin = require('firebase-admin');
const http = require('http');

// ========== INICIALIZAR FIREBASE ==========
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'centinela-c5'
});

const db = admin.firestore();
const PM_API = "https://cenc5.com/rest_api/14.0";
const INTERVAL = 2500;
const SYNC_INTERVAL = 5000;

const sesionesPorPanel = new Map();

let workerStatus = {
    healthy: true,
    lastSync: null,
    lastPoll: null,
    panelesActivos: 0,
    inicio: new Date().toISOString()
};

let isPolling = false;
let isSyncing = false;
let syncTimeout = null;
let pollTimeout = null;

// ===============================
// FUNCIONES AUXILIARES (mantener las que ya tienes)
// ===============================
function datetimeToTimestamp(datetime) {
    return new Date(datetime.replace(' ', 'T')).getTime();
}

async function obtenerUltimoTimestamp(panel_serial) {
    try {
        const controlRef = db.collection('control_eventos').doc(panel_serial);
        const doc = await controlRef.get();
        return doc.exists ? doc.data().ultimo_timestamp : null;
    } catch (error) {
        return null;
    }
}

async function actualizarUltimoTimestamp(panel_serial, timestamp) {
    const controlRef = db.collection('control_eventos').doc(panel_serial);
    await controlRef.set({
        ultimo_timestamp: timestamp,
        ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

async function loginUsuario(email, password, appId) {
    const res = await axios.post(`${PM_API}/auth`, { email, password, app_id: appId });
    return res.data.user_token;
}

async function obtenerPaneles(userToken, appId) {
    const res = await axios.get(`${PM_API}/panels`, {
        headers: { 'User-Token': userToken },
        params: { app_id: appId }
    });
    return Array.isArray(res.data) ? res.data : (res.data.panels || []);
}

async function loginPanel(userToken, panel_serial, user_code, appId) {
    const res = await axios.post(`${PM_API}/panel/login`, {
        panel_serial,
        user_code,
        app_id: appId,
        app_type: "com.visonic.neogo"
    }, {
        headers: { 'User-Token': userToken }
    });
    return res.data.session_token;
}

async function obtenerEventos(userToken, sessionToken) {
    const res = await axios.get(`${PM_API}/events`, {
        headers: {
            'User-Token': userToken,
            'Session-Token': sessionToken
        }
    });
    return res.data;
}

async function guardarInfoPanel(panel_serial, alias, email) {
    const panelRef = db.collection('paneles_info').doc(panel_serial);
    await panelRef.set({
        serial: panel_serial,
        alias: alias || null,
        email_asociado: email,
        ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function obtenerNombreMostrar(serial, alias) {
    if (alias && alias.trim() !== '') {
        return `${serial} (${alias})`;
    }
    return serial;
}

async function procesarEventos(eventos, panel_serial, panel_alias, panel_email) {
    if (!Array.isArray(eventos) || eventos.length === 0) return;
    
    const nombrePanel = obtenerNombreMostrar(panel_serial, panel_alias);
    
    const eventosConTimestamp = eventos.map(evento => ({
        ...evento,
        timestamp_numero: datetimeToTimestamp(evento.datetime),
        timestamp_original: evento.datetime,
        panel_alias: panel_alias || null,
        panel_serial: panel_serial,
        email_asociado: panel_email,
        estadoEvento: 'pendiente',
        atendido: false
    }));
    
    eventosConTimestamp.sort((a, b) => a.timestamp_numero - b.timestamp_numero);
    
    let ultimoTimestamp = await obtenerUltimoTimestamp(panel_serial);
    
    if (ultimoTimestamp === null) {
        console.log(`🆕 Panel ${nombrePanel}: Guardando ${eventos.length} eventos históricos...`);
        
        let batch = db.batch();
        let count = 0;
        
        for (const evento of eventosConTimestamp) {
            const docRef = db.collection('eventos').doc();
            batch.set(docRef, {
                ...evento,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
            
            if (count % 500 === 0) {
                await batch.commit();
                batch = db.batch();
            }
        }
        
        if (count % 500 !== 0) await batch.commit();
        
        const eventoMasReciente = eventosConTimestamp[eventosConTimestamp.length - 1];
        await actualizarUltimoTimestamp(panel_serial, eventoMasReciente.timestamp_numero);
        console.log(`✅ Panel ${nombrePanel}: ${eventos.length} eventos guardados`);
        return;
    }
    
    const eventosNuevos = eventosConTimestamp.filter(e => e.timestamp_numero > ultimoTimestamp);
    
    if (eventosNuevos.length === 0) return;
    
    console.log(`🆕 Panel ${nombrePanel}: ${eventosNuevos.length} eventos nuevos`);
    
    let batch = db.batch();
    let count = 0;
    
    for (const evento of eventosNuevos) {
        const docRef = db.collection('eventos').doc();
        batch.set(docRef, {
            ...evento,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
        
        if (count % 500 === 0) {
            await batch.commit();
            batch = db.batch();
        }
    }
    
    if (count % 500 !== 0) await batch.commit();
    
    const nuevoUltimoTimestamp = eventosNuevos[eventosNuevos.length - 1].timestamp_numero;
    await actualizarUltimoTimestamp(panel_serial, nuevoUltimoTimestamp);
    console.log(`✅ Panel ${nombrePanel}: ${eventosNuevos.length} eventos nuevos guardados`);
}

async function reconectarPanel(panel_serial, data) {
    const nombrePanel = obtenerNombreMostrar(panel_serial, data.alias);
    console.log(`🔄 Reconectando panel ${nombrePanel}...`);
    try {
        const sessionToken = await loginPanel(data.userToken, panel_serial, data.panelPassword, data.appId);
        sesionesPorPanel.set(panel_serial, {
            ...data,
            sessionToken,
            ultimo_error: null
        });
        console.log(`✅ Panel ${nombrePanel} reconectado`);
        return true;
    } catch (error) {
        console.error(`❌ Error reconectando panel ${nombrePanel}:`, error.message);
        sesionesPorPanel.delete(panel_serial);
        return false;
    }
}

// ===============================
// SINCRONIZAR PANELES (NO BLOQUEANTE)
// ===============================
async function sincronizarPaneles() {
    if (isSyncing) return;
    
    isSyncing = true;
    console.log(`\n🔄 SINCRONIZANDO PANELES... [${new Date().toLocaleTimeString()}]`);
    
    try {
        const snapshot = await db.collection('cuentas_tecnicas_pm')
            .where('status', '==', 'activa')
            .get();
        
        for (const doc of snapshot.docs) {
            const { email, password, appId, panelPassword } = doc.data();
            
            try {
                let userToken = doc.data().userToken;
                
                if (!userToken) {
                    console.log(`🔐 Nuevo login para: ${email}`);
                    userToken = await loginUsuario(email, password, appId);
                    await doc.ref.update({ userToken, ultimoLogin: new Date().toISOString() });
                }
                
                const panels = await obtenerPaneles(userToken, appId);
                
                for (const panel of panels) {
                    const panel_serial = panel.panel_serial || panel.serial_number;
                    const panel_alias = panel.alias || null;
                    
                    if (!panel_serial) continue;
                    
                    await guardarInfoPanel(panel_serial, panel_alias, email);
                    
                    if (sesionesPorPanel.has(panel_serial)) continue;
                    
                    const nombrePanel = obtenerNombreMostrar(panel_serial, panel_alias);
                    console.log(`✨ NUEVO PANEL: ${nombrePanel} (${email})`);
                    
                    try {
                        const sessionToken = await loginPanel(userToken, panel_serial, panelPassword, appId);
                        sesionesPorPanel.set(panel_serial, {
                            userToken,
                            sessionToken,
                            email,
                            panelPassword,
                            appId,
                            alias: panel_alias
                        });
                        console.log(`✅ Panel ${nombrePanel} conectado`);
                        
                        // Polling inicial para este panel
                        setTimeout(async () => {
                            try {
                                const eventos = await obtenerEventos(userToken, sessionToken);
                                await procesarEventos(eventos, panel_serial, panel_alias, email);
                            } catch (e) {}
                        }, 2000);
                        
                    } catch (err) {
                        console.error(`❌ Error conectando panel ${nombrePanel}:`, err.message);
                    }
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    await doc.ref.update({ userToken: null });
                }
            }
        }
        
        workerStatus.lastSync = new Date().toISOString();
        workerStatus.panelesActivos = sesionesPorPanel.size;
        
        console.log(`📊 Paneles activos: ${sesionesPorPanel.size}`);
        
    } catch (error) {
        console.error('❌ Error en sincronización:', error.message);
    } finally {
        isSyncing = false;
    }
    
    // Programar próxima sincronización (NO BLOQUEANTE)
    syncTimeout = setTimeout(() => sincronizarPaneles(), SYNC_INTERVAL);
}

// ===============================
// POLLING DE EVENTOS (NO BLOQUEANTE)
// ===============================
async function pollEventos() {
    if (isPolling) return;
    if (sesionesPorPanel.size === 0) {
        // Programar próximo polling
        pollTimeout = setTimeout(() => pollEventos(), INTERVAL);
        return;
    }
    
    isPolling = true;
    
    try {
        const panelesActuales = Array.from(sesionesPorPanel.entries());
        
        for (const [panel_serial, data] of panelesActuales) {
            if (!sesionesPorPanel.has(panel_serial)) continue;
            
            const { userToken, sessionToken, alias, email } = data;
            
            try {
                const eventos = await obtenerEventos(userToken, sessionToken);
                if (eventos && eventos.length > 0) {
                    await procesarEventos(eventos, panel_serial, alias, email);
                }
            } catch (error) {
                const status = error.response?.status;
                if (status === 401 || status === 403 || status === 440) {
                    await reconectarPanel(panel_serial, data);
                }
            }
        }
        
        workerStatus.lastPoll = new Date().toISOString();
        
    } catch (error) {
        console.error('❌ Error en polling:', error.message);
    } finally {
        isPolling = false;
    }
    
    // Programar próximo polling (NO BLOQUEANTE)
    pollTimeout = setTimeout(() => pollEventos(), INTERVAL);
}

// ===============================
// SERVIDOR HTTP
// ===============================
const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            paneles: sesionesPorPanel.size,
            lastSync: workerStatus.lastSync,
            uptime: process.uptime()
        }));
        return;
    }
    
    if (req.url === '/debug') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            paneles: sesionesPorPanel.size,
            isPolling,
            isSyncing,
            uptime: process.uptime()
        }));
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

// ===============================
// INICIAR
// ===============================
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    WORKER DE EVENTOS v5                        ║
║   ✅ No bloqueante - Compatible con Cloud Run                 ║
╚════════════════════════════════════════════════════════════════╝
    `);
    console.log(`🌐 Puerto: ${PORT}`);
    
    // Iniciar sincronización (NO BLOQUEANTE)
    sincronizarPaneles();
    
    // Iniciar polling después de 5 segundos
    setTimeout(() => pollEventos(), 5000);
});

// Limpiar timeouts al salir
process.on('SIGTERM', () => {
    console.log('📡 SIGTERM - Cerrando...');
    if (syncTimeout) clearTimeout(syncTimeout);
    if (pollTimeout) clearTimeout(pollTimeout);
    server.close(() => process.exit(0));
});