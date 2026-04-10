// =============================================
// estadisticas.js - VERSIÓN COMPLETA SIN MODALES INTERMEDIOS
// CLIC DIRECTO EN GRÁFICAS → INCIDENCIAS DIRECTAMENTE
// =============================================

// =============================================
// VARIABLES GLOBALES
// =============================================
let estadisticasManager = null;
let incidenciaManager = null;
let organizacionActual = null;
let incidenciasCache = [];
let incidenciasFiltradas = [];
let sucursalesCache = [];
let categoriasCache = [];
let charts = {};
let authToken = null;
let historialManager = null;
let accesoVistaRegistrado = false;

// Almacenar datos originales para los clics
let datosGraficas = {
    topActualizadores: [],
    topReportadores: [],
    topSeguimientos: [],
    estadoData: { pendientes: 0, finalizadas: 0 },
    riesgoData: { critico: 0, alto: 0, medio: 0, bajo: 0 },
    categoriasData: [],
    sucursalesData: [],
    tiemposPromedio: [],
    incidenciasFiltradas: []
};

// Filtros activos
let filtrosActivos = {
    fechaInicio: null,
    fechaFin: null,
    categoriaId: 'todas',
    sucursalId: 'todas',
    colaboradorId: 'todos',
    busqueda: ''
};

// Colores para gráficas
const COLORS = {
    critico: '#ef4444',
    alto: '#f97316',
    medio: '#eab308',
    bajo: '#10b981',
    pendiente: '#f59e0b',
    finalizada: '#10b981',
    azul: '#3b82f6',
    morado: '#8b5cf6',
    turquesa: '#14b8a6',
    naranja: '#f97316',
    verde: '#10b981'
};

// =============================================
// INICIALIZACIÓN
//==============================================
document.addEventListener('DOMContentLoaded', async function () {
    try {
        await inicializarHistorial();
        await inicializarEstadisticasManager();
        await obtenerTokenAuth();
        configurarFiltros();
        await Promise.all([
            cargarSucursales(),
            cargarCategorias()
        ]);
        establecerFechasPorDefecto();
        await registrarAccesoVistaEstadisticas();
    } catch (error) {
        console.error('Error al inicializar estadísticas:', error);
        mostrarError('Error al cargar la página: ' + error.message);
    }
});

function establecerFechasPorDefecto() {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    const fechaInicio = document.getElementById('filtroFechaInicio');
    const fechaFin = document.getElementById('filtroFechaFin');

    if (fechaInicio) fechaInicio.value = hace30Dias.toISOString().split('T')[0];
    if (fechaFin) fechaFin.value = hoy.toISOString().split('T')[0];

    filtrosActivos.fechaInicio = hace30Dias.toISOString().split('T')[0];
    filtrosActivos.fechaFin = hoy.toISOString().split('T')[0];
}

async function inicializarHistorial() {
    try {
        const { HistorialUsuarioManager } = await import('/clases/historialUsuario.js');
        historialManager = new HistorialUsuarioManager();
    } catch (error) {
        console.error('Error inicializando historialManager:', error);
    }
}

function obtenerUsuarioActual() {
    try {
        const adminInfo = localStorage.getItem('adminInfo');
        if (adminInfo) {
            const data = JSON.parse(adminInfo);
            return {
                id: data.id || data.uid,
                uid: data.uid || data.id,
                nombreCompleto: data.nombreCompleto || 'Administrador',
                organizacion: data.organizacion,
                organizacionCamelCase: data.organizacionCamelCase,
                correoElectronico: data.correoElectronico || ''
            };
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData && Object.keys(userData).length > 0) {
            return {
                id: userData.uid || userData.id,
                uid: userData.uid || userData.id,
                nombreCompleto: userData.nombreCompleto || userData.nombre || 'Usuario',
                organizacion: userData.organizacion,
                organizacionCamelCase: userData.organizacionCamelCase,
                correoElectronico: userData.correo || userData.email || ''
            };
        }

        return null;
    } catch (error) {
        console.error('Error obteniendo usuario actual:', error);
        return null;
    }
}

async function registrarAccesoVistaEstadisticas() {
    if (!historialManager) return;
    if (accesoVistaRegistrado) return;

    try {
        const usuario = obtenerUsuarioActual();
        if (!usuario) return;

        await historialManager.registrarActividad({
            usuario: usuario,
            tipo: 'leer',
            modulo: 'estadisticas',
            descripcion: 'Accedió al módulo de estadísticas',
            detalles: {
                organizacion: organizacionActual?.nombre,
                filtrosPredeterminados: {
                    fechaInicio: filtrosActivos.fechaInicio,
                    fechaFin: filtrosActivos.fechaFin,
                    rango: 'últimos 30 días'
                }
            }
        });
        accesoVistaRegistrado = true;
    } catch (error) {
        console.error('Error registrando acceso a estadísticas:', error);
    }
}

async function registrarAplicacionFiltros(filtrosAplicados, totalIncidencias) {
    if (!historialManager) return;

    try {
        const usuario = obtenerUsuarioActual();
        if (!usuario) return;

        const filtrosDetalles = {};

        if (filtrosAplicados.fechaInicio && filtrosAplicados.fechaFin) {
            filtrosDetalles.rangoFechas = `${filtrosAplicados.fechaInicio} al ${filtrosAplicados.fechaFin}`;
        }

        if (filtrosAplicados.categoriaId !== 'todas') {
            const categoria = categoriasCache.find(c => c.id === filtrosAplicados.categoriaId);
            filtrosDetalles.categoria = categoria?.nombre || filtrosAplicados.categoriaId;
        }

        if (filtrosAplicados.sucursalId !== 'todas') {
            const sucursal = sucursalesCache.find(s => s.id === filtrosAplicados.sucursalId);
            filtrosDetalles.sucursal = sucursal?.nombre || filtrosAplicados.sucursalId;
        }

        if (filtrosAplicados.colaboradorId !== 'todos') {
            filtrosDetalles.colaborador = filtrosAplicados.colaboradorId;
        }

        if (filtrosAplicados.busqueda) {
            filtrosDetalles.busqueda = filtrosAplicados.busqueda;
        }

        await historialManager.registrarActividad({
            usuario: usuario,
            tipo: 'leer',
            modulo: 'estadisticas',
            descripcion: `Aplicó filtros en estadísticas - ${totalIncidencias} incidencias encontradas`,
            detalles: {
                filtros: filtrosDetalles,
                totalIncidencias: totalIncidencias,
                fechaAplicacion: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error registrando aplicación de filtros:', error);
    }
}

async function registrarGeneracionPDFReporte(totalIncidencias, filtrosAplicados) {
    if (!historialManager) return;

    try {
        const usuario = obtenerUsuarioActual();
        if (!usuario) return;

        await historialManager.registrarActividad({
            usuario: usuario,
            tipo: 'leer',
            modulo: 'estadisticas',
            descripcion: `Generó reporte PDF de estadísticas - ${totalIncidencias} incidencias`,
            detalles: {
                totalIncidencias: totalIncidencias,
                filtrosAplicados: {
                    fechaInicio: filtrosAplicados.fechaInicio,
                    fechaFin: filtrosAplicados.fechaFin,
                    categoria: filtrosAplicados.categoriaId !== 'todas' ?
                        categoriasCache.find(c => c.id === filtrosAplicados.categoriaId)?.nombre : 'todas',
                    sucursal: filtrosAplicados.sucursalId !== 'todas' ?
                        sucursalesCache.find(s => s.id === filtrosAplicados.sucursalId)?.nombre : 'todas',
                    colaborador: filtrosAplicados.colaboradorId !== 'todos' ? filtrosAplicados.colaboradorId : 'todos'
                },
                fechaGeneracion: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error registrando generación de PDF:', error);
    }
}

async function registrarLimpiezaFiltros() {
    if (!historialManager) return;

    try {
        const usuario = obtenerUsuarioActual();
        if (!usuario) return;

        await historialManager.registrarActividad({
            usuario: usuario,
            tipo: 'leer',
            modulo: 'estadisticas',
            descripcion: 'Limpió los filtros de estadísticas',
            detalles: {
                fechaLimpieza: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error registrando limpieza de filtros:', error);
    }
}

// =============================================
// OBTENER TOKEN DE AUTENTICACIÓN
// =============================================
async function obtenerTokenAuth() {
    try {
        if (window.firebase) {
            const user = firebase.auth().currentUser;
            if (user) {
                authToken = await user.getIdToken();
            }
        }
        if (!authToken) {
            const token = localStorage.getItem('firebaseToken') ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('token');
            if (token) {
                authToken = token;
            }
        }
    } catch (error) {
        authToken = null;
    }
}

// =============================================
// MOSTRAR/MOVER SECCIÓN DE RESULTADOS
// =============================================
function mostrarResultados() {
    const welcomeMsg = document.getElementById('welcomeMessage');
    const resultadosSection = document.getElementById('resultadosSection');

    if (welcomeMsg) welcomeMsg.style.display = 'none';
    if (resultadosSection) {
        resultadosSection.classList.add('visible');
    }
}

function mostrarMensajeSinResultados() {
    mostrarResultados();

    const graficasIds = [
        'graficoActualizadores', 'graficoReportadores', 'graficoSeguimientos',
        'graficoEstado', 'graficoRiesgo', 'graficoCategorias',
        'graficoSucursales', 'graficoTiempo'
    ];

    graficasIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (charts[id]) {
                delete charts[id];
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = '16px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.textAlign = 'center';
            ctx.fillText('📭 Sin resultados con los filtros actuales', canvas.width / 2, canvas.height / 2);
        }
    });

    const tablaColab = document.getElementById('tablaColaboradoresBody');
    if (tablaColab) {
        tablaColab.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px;"><i class="fas fa-search" style="font-size: 32px; opacity: 0.3; margin-bottom: 10px;"></i><br>No hay incidencias que coincidan con los filtros</td</tr>';
    }

    const tablaCat = document.getElementById('tablaCategoriasBody');
    if (tablaCat) {
        tablaCat.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:40px;"><i class="fas fa-search" style="font-size: 32px; opacity: 0.3; margin-bottom: 10px;"></i><br>No hay incidencias que coincidan con los filtros</td</tr>';
    }

    setElementText('metricCriticas', '0');
    setElementText('metricAltas', '0');
    setElementText('metricPendientes', '0');
    setElementText('metricTotal', '0');
    setElementText('metricCriticasPorcentaje', '0% del total');
    setElementText('metricAltasPorcentaje', '0% del total');
    setElementText('metricPendientesPorcentaje', '0% pendientes');
    setElementText('metricFinalizadasPorcentaje', '0% resueltas');
}

// =============================================
// INICIALIZACIÓN DE MANAGERS
// =============================================
async function inicializarEstadisticasManager() {
    try {
        await obtenerDatosOrganizacion();

        const { IncidenciaManager } = await import('/clases/incidencia.js');
        const { EstadisticasManager } = await import('/clases/estadistica.js');

        incidenciaManager = new IncidenciaManager();
        estadisticasManager = new EstadisticasManager();

        return true;
    } catch (error) {
        console.error('Error al inicializar managers:', error);
        mostrarErrorInicializacion();
        return false;
    }
}

async function obtenerDatosOrganizacion() {
    try {
        if (window.userManager && window.userManager.currentUser) {
            const user = window.userManager.currentUser;
            organizacionActual = {
                nombre: user.organizacion || 'Mi Empresa',
                camelCase: user.organizacionCamelCase || ''
            };
            return;
        }

        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}');

        organizacionActual = {
            nombre: userData.organizacion || adminInfo.organizacion || 'Mi Empresa',
            camelCase: userData.organizacionCamelCase || adminInfo.organizacionCamelCase || ''
        };
    } catch (error) {
        organizacionActual = { nombre: 'Mi Empresa', camelCase: '' };
    }
}

// =============================================
// CARGA DE DATOS AUXILIARES
// =============================================
async function cargarSucursales() {
    try {
        const { SucursalManager } = await import('/clases/sucursal.js');
        const sucursalManager = new SucursalManager();

        if (organizacionActual.camelCase) {
            sucursalesCache = await sucursalManager.getSucursalesByOrganizacion(organizacionActual.camelCase);

            const filtroSucursal = document.getElementById('filtroSucursal');
            if (filtroSucursal) {
                filtroSucursal.innerHTML = '<option value="todas">Todas las sucursales</option>';
                sucursalesCache.forEach(suc => {
                    const option = document.createElement('option');
                    option.value = suc.id;
                    option.textContent = suc.nombre;
                    filtroSucursal.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Error cargando sucursales:', error);
        sucursalesCache = [];
    }
}

async function cargarCategorias() {
    try {
        const { CategoriaManager } = await import('/clases/categoria.js');
        const categoriaManager = new CategoriaManager();
        categoriasCache = await categoriaManager.obtenerCategoriasPorOrganizacion(organizacionActual.camelCase);

        const filtroCategoria = document.getElementById('filtroCategoria');
        if (filtroCategoria) {
            filtroCategoria.innerHTML = '<option value="todas">Todas las categorías</option>';
            categoriasCache.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nombre;
                filtroCategoria.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
        categoriasCache = [];
    }
}

// =============================================
// CONFIGURAR FILTROS
// =============================================
function configurarFiltros() {
    document.getElementById('btnAplicarFiltros')?.addEventListener('click', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);

    let timeout;
    document.getElementById('buscarIncidencias')?.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            filtrosActivos.busqueda = e.target.value;
            aplicarFiltros();
        }, 500);
    });

    document.getElementById('btnGenerarPDF')?.addEventListener('click', generarReportePDF);
}

// =============================================
// APLICAR FILTROS (FUNCIÓN PRINCIPAL)
// =============================================
async function aplicarFiltros() {
    const nuevosFiltros = {
        fechaInicio: document.getElementById('filtroFechaInicio')?.value || null,
        fechaFin: document.getElementById('filtroFechaFin')?.value || null,
        categoriaId: document.getElementById('filtroCategoria')?.value || 'todas',
        sucursalId: document.getElementById('filtroSucursal')?.value || 'todas',
        colaboradorId: document.getElementById('filtroColaborador')?.value || 'todos',
        busqueda: document.getElementById('buscarIncidencias')?.value || ''
    };

    filtrosActivos = nuevosFiltros;

    await cargarIncidencias();

    if (incidenciasFiltradas && incidenciasFiltradas.length > 0) {
        await registrarAplicacionFiltros(filtrosActivos, incidenciasFiltradas.length);
    }
}

async function limpiarFiltros() {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);

    const fechaInicio = document.getElementById('filtroFechaInicio');
    const fechaFin = document.getElementById('filtroFechaFin');
    const filtroCategoria = document.getElementById('filtroCategoria');
    const filtroSucursal = document.getElementById('filtroSucursal');
    const filtroColaborador = document.getElementById('filtroColaborador');
    const buscar = document.getElementById('buscarIncidencias');

    if (fechaInicio) fechaInicio.value = hace30Dias.toISOString().split('T')[0];
    if (fechaFin) fechaFin.value = hoy.toISOString().split('T')[0];
    if (filtroCategoria) filtroCategoria.value = 'todas';
    if (filtroSucursal) filtroSucursal.value = 'todas';
    if (filtroColaborador) filtroColaborador.value = 'todos';
    if (buscar) buscar.value = '';

    filtrosActivos = {
        fechaInicio: hace30Dias.toISOString().split('T')[0],
        fechaFin: hoy.toISOString().split('T')[0],
        categoriaId: 'todas',
        sucursalId: 'todas',
        colaboradorId: 'todos',
        busqueda: ''
    };

    await registrarLimpiezaFiltros();
    await cargarIncidencias();
}

function filtrarIncidencias(incidencias) {
    return incidencias.filter(inc => {
        if (filtrosActivos.fechaInicio) {
            const fechaInc = inc.fechaInicio instanceof Date ? inc.fechaInicio : new Date(inc.fechaInicio);
            if (fechaInc < new Date(filtrosActivos.fechaInicio)) return false;
        }

        if (filtrosActivos.fechaFin) {
            const fechaInc = inc.fechaInicio instanceof Date ? inc.fechaInicio : new Date(inc.fechaInicio);
            const fechaFin = new Date(filtrosActivos.fechaFin);
            fechaFin.setHours(23, 59, 59);
            if (fechaInc > fechaFin) return false;
        }

        if (filtrosActivos.categoriaId !== 'todas' && inc.categoriaId !== filtrosActivos.categoriaId) {
            return false;
        }

        if (filtrosActivos.sucursalId !== 'todas' && inc.sucursalId !== filtrosActivos.sucursalId) {
            return false;
        }

        if (filtrosActivos.colaboradorId !== 'todos') {
            const coincideColaborador =
                inc.creadoPorNombre === filtrosActivos.colaboradorId ||
                inc.actualizadoPorNombre === filtrosActivos.colaboradorId;

            if (!coincideColaborador) return false;
        }

        if (filtrosActivos.busqueda) {
            const busqueda = filtrosActivos.busqueda.toLowerCase();
            const coincide =
                inc.id?.toLowerCase().includes(busqueda) ||
                inc.detalles?.toLowerCase().includes(busqueda) ||
                (inc.creadoPorNombre && inc.creadoPorNombre.toLowerCase().includes(busqueda));

            if (!coincide) return false;
        }

        return true;
    });
}

// =============================================
// CARGAR INCIDENCIAS Y GENERAR GRÁFICAS
// =============================================
async function cargarIncidencias() {
    if (!incidenciaManager || !organizacionActual.camelCase) {
        mostrarError('No se pudo cargar el gestor de incidencias');
        return;
    }

    try {
        if (incidenciasCache.length === 0) {
            incidenciasCache = await incidenciaManager.getIncidenciasByOrganizacion(organizacionActual.camelCase);
        }

        incidenciasFiltradas = filtrarIncidencias(incidenciasCache);

        if (incidenciasFiltradas.length === 0) {
            mostrarMensajeSinResultados();
            return;
        }

        mostrarResultados();

        const datos = procesarDatosGraficas(incidenciasFiltradas);

        // Guardar datos para los clics
        datosGraficas = {
            topActualizadores: datos.topActualizadores,
            topReportadores: datos.topReportadores,
            topSeguimientos: datos.topSeguimientos,
            estadoData: datos.estadoData,
            riesgoData: datos.riesgoData,
            categoriasData: datos.categoriasData,
            sucursalesData: datos.sucursalesData,
            tiemposPromedio: datos.tiemposPromedio,
            incidenciasFiltradas: incidenciasFiltradas
        };

        actualizarMetricasPrincipales(datos.metricas);
        renderizarTodasLasGraficas(datos);

        // Configurar KPI cards como clickeables
        setTimeout(() => {
            configurarKpiCardsClickeables();
        }, 100);

        if (datos.colaboradores && datos.colaboradores.length > 0) {
            renderizarTablaColaboradores(datos.colaboradores);
        } else {
            renderizarTablaColaboradores([]);
        }

        if (datos.categoriasData && datos.categoriasData.length > 0) {
            renderizarTablaCategorias(datos.categoriasData);
        } else {
            renderizarTablaCategorias([]);
        }

        if (datos.colaboradores && datos.colaboradores.length > 0) {
            cargarFiltroColaboradores(datos.colaboradores);
        }

        const fechaEl = document.getElementById('fechaActualizacion');
        if (fechaEl) {
            fechaEl.textContent = new Date().toLocaleString('es-MX');
        }

    } catch (error) {
        console.error('Error al cargar incidencias:', error);
        mostrarError('Error al cargar estadísticas: ' + error.message);
    }
}

// =============================================
// CONFIGURAR CLICS EN KPI CARDS
// =============================================
function configurarKpiCardsClickeables() {
    // Card de Incidencias Críticas
    const criticasCard = document.querySelector('.metric-card.criticas');
    if (criticasCard) {
        criticasCard.style.cursor = 'pointer';
        criticasCard.addEventListener('click', () => {
            const incidenciasCriticas = datosGraficas.incidenciasFiltradas?.filter(i => i.nivelRiesgo === 'critico') || [];
            if (incidenciasCriticas.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin registros',
                    text: 'No hay incidencias críticas para mostrar',
                    background: 'var(--color-bg-primary)',
                    color: 'white'
                });
                return;
            }
            mostrarRegistrosEnSweet(incidenciasCriticas, 'Incidencias Críticas', '<i class="fas fa-exclamation-triangle"></i>');
        });
    }

    // Card de Incidencias Altas
    const altasCard = document.querySelector('.metric-card.altas');
    if (altasCard) {
        altasCard.style.cursor = 'pointer';
        altasCard.addEventListener('click', () => {
            const incidenciasAltas = datosGraficas.incidenciasFiltradas?.filter(i => i.nivelRiesgo === 'alto') || [];
            if (incidenciasAltas.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin registros',
                    text: 'No hay incidencias altas para mostrar',
                    background: 'var(--color-bg-primary)',
                    color: 'white'
                });
                return;
            }
            mostrarRegistrosEnSweet(incidenciasAltas, 'Incidencias Altas', '<i class="fas fa-exclamation-circle"></i>');
        });
    }

    // Card de Incidencias Pendientes
    const pendientesCard = document.querySelector('.metric-card.pendientes');
    if (pendientesCard) {
        pendientesCard.style.cursor = 'pointer';
        pendientesCard.addEventListener('click', () => {
            const incidenciasPendientes = datosGraficas.incidenciasFiltradas?.filter(i => i.estado === 'pendiente') || [];
            if (incidenciasPendientes.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin registros',
                    text: 'No hay incidencias pendientes para mostrar',
                    background: 'var(--color-bg-primary)',
                    color: 'white'
                });
                return;
            }
            mostrarRegistrosEnSweet(incidenciasPendientes, 'Incidencias Pendientes', '<i class="fas fa-clock"></i>');
        });
    }

    // Card de Total Incidencias
    const totalCard = document.querySelector('.metric-card.total');
    if (totalCard) {
        totalCard.style.cursor = 'pointer';
        totalCard.addEventListener('click', () => {
            const incidencias = datosGraficas.incidenciasFiltradas || [];
            if (incidencias.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin registros',
                    text: 'No hay incidencias para mostrar',
                    background: 'var(--color-bg-primary)',
                    color: 'white'
                });
                return;
            }
            mostrarRegistrosEnSweet(incidencias, 'Todas las Incidencias', '<i class="fas fa-chart-bar"></i>');
        });
    }
}

// =============================================
// FUNCIONES PARA ALERTAS DE GRÁFICAS - CLIC DIRECTO SIN MODAL INTERMEDIO
// =============================================

function mostrarAlertActualizadores() {
    const data = datosGraficas.topActualizadores;
    if (!data || data.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No hay información de actualizaciones para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    // Tomar el primer colaborador y mostrar sus incidencias DIRECTAMENTE
    const colaborador = data[0];
    const incidencias = datosGraficas.incidenciasFiltradas?.filter(i => i.actualizadoPorNombre === colaborador.nombre) || [];
    
    if (incidencias.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin registros',
            text: `No hay incidencias actualizadas por ${colaborador.nombre}`,
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    mostrarRegistrosEnSweet(incidencias, `Incidencias actualizadas por ${colaborador.nombre}`, `<i class="fas fa-edit"></i>`);
}

function mostrarAlertReportadores() {
    const data = datosGraficas.topReportadores;
    if (!data || data.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No hay información de reportes para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    // Tomar el primer colaborador y mostrar sus incidencias DIRECTAMENTE
    const colaborador = data[0];
    const incidencias = datosGraficas.incidenciasFiltradas?.filter(i => i.creadoPorNombre === colaborador.nombre) || [];
    
    if (incidencias.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin registros',
            text: `No hay incidencias reportadas por ${colaborador.nombre}`,
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    mostrarRegistrosEnSweet(incidencias, `Incidencias reportadas por ${colaborador.nombre}`, `<i class="fas fa-flag"></i>`);
}

function mostrarAlertSeguimientos() {
    const data = datosGraficas.topSeguimientos;
    if (!data || data.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No hay información de seguimientos para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    // Tomar el primer colaborador y mostrar sus incidencias DIRECTAMENTE
    const colaborador = data[0];
    const incidencias = datosGraficas.incidenciasFiltradas?.filter(i => {
        if (i.seguimiento) {
            return Object.values(i.seguimiento).some(seg => seg.usuarioNombre === colaborador.nombre);
        }
        return false;
    }) || [];
    
    if (incidencias.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin registros',
            text: `No hay incidencias con seguimiento de ${colaborador.nombre}`,
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    mostrarRegistrosEnSweet(incidencias, `Incidencias con seguimiento de ${colaborador.nombre}`, `<i class="fas fa-history"></i>`);
}

function mostrarAlertEstado() {
    const data = datosGraficas.estadoData;
    const total = (data.pendientes || 0) + (data.finalizadas || 0);
    
    if (total === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No hay incidencias para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    // Mostrar directamente las incidencias pendientes (o se puede cambiar a finalizadas)
    const incidencias = datosGraficas.incidenciasFiltradas?.filter(i => i.estado === 'pendiente') || [];
    if (incidencias.length > 0) {
        mostrarRegistrosEnSweet(incidencias, 'Incidencias Pendientes', '<i class="fas fa-clock"></i>');
    } else {
        const incidenciasFinalizadas = datosGraficas.incidenciasFiltradas?.filter(i => i.estado === 'finalizada') || [];
        mostrarRegistrosEnSweet(incidenciasFinalizadas, 'Incidencias Finalizadas', '<i class="fas fa-check-circle"></i>');
    }
}

function mostrarAlertRiesgo() {
    const data = datosGraficas.riesgoData;
    const total = (data.critico || 0) + (data.alto || 0) + (data.medio || 0) + (data.bajo || 0);
    
    if (total === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No hay incidencias para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    // Mostrar directamente las incidencias críticas
    const incidencias = datosGraficas.incidenciasFiltradas?.filter(i => i.nivelRiesgo === 'critico') || [];
    if (incidencias.length > 0) {
        mostrarRegistrosEnSweet(incidencias, 'Incidencias Críticas', '<i class="fas fa-exclamation-triangle"></i>');
    } else {
        const incidenciasAltas = datosGraficas.incidenciasFiltradas?.filter(i => i.nivelRiesgo === 'alto') || [];
        mostrarRegistrosEnSweet(incidenciasAltas, 'Incidencias Altas', '<i class="fas fa-exclamation-circle"></i>');
    }
}

function mostrarAlertCategorias() {
    const data = datosGraficas.categoriasData;
    if (!data || data.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No hay información de categorías para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    // Tomar la primera categoría y mostrar sus incidencias DIRECTAMENTE
    const categoriaNombre = data[0].nombre;
    const categoria = categoriasCache.find(c => c.nombre === categoriaNombre);
    
    if (!categoria) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró la categoría',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    const incidencias = datosGraficas.incidenciasFiltradas?.filter(i => i.categoriaId === categoria.id) || [];
    
    if (incidencias.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin registros',
            text: `No hay incidencias en la categoría ${categoriaNombre}`,
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    mostrarRegistrosEnSweet(incidencias, `Incidencias: ${categoriaNombre} (Top 1)`, '<i class="fas fa-tag"></i>');
}

function mostrarAlertSucursales() {
    const data = datosGraficas.sucursalesData;
    if (!data || data.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No hay información de sucursales para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    // Tomar la primera sucursal y mostrar sus incidencias DIRECTAMENTE
    const sucursalNombre = data[0].nombre;
    const sucursal = sucursalesCache.find(s => s.nombre === sucursalNombre);
    
    if (!sucursal) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró la sucursal',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    const incidencias = datosGraficas.incidenciasFiltradas?.filter(i => i.sucursalId === sucursal.id) || [];
    
    if (incidencias.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin registros',
            text: `No hay incidencias en la sucursal ${sucursalNombre}`,
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    mostrarRegistrosEnSweet(incidencias, `Incidencias: ${sucursalNombre} (Top 1)`, '<i class="fas fa-store"></i>');
}

function mostrarAlertTiempoResolucion() {
    const data = datosGraficas.tiemposPromedio;
    if (!data || data.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin datos',
            text: 'No hay información de tiempos de resolución para mostrar. Asegúrate de tener incidencias finalizadas.',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }

    // Tomar el primer colaborador y mostrar sus incidencias DIRECTAMENTE
    const colaborador = data[0];
    const incidencias = datosGraficas.incidenciasFiltradas?.filter(i => i.actualizadoPorNombre === colaborador.nombre) || [];
    
    if (incidencias.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin registros',
            text: `No hay incidencias actualizadas por ${colaborador.nombre}`,
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    mostrarRegistrosEnSweet(incidencias, `Incidencias resueltas por ${colaborador.nombre} (Promedio: ${colaborador.promedio} horas)`, `<i class="fas fa-clock"></i>`);
}

// =============================================
// FUNCIÓN PARA MOSTRAR REGISTROS EN SWEETALERT - VERSIÓN MEJORADA PARA INCIDENCIAS
// =============================================
function mostrarRegistrosEnSweet(incidencias, titulo, icono = '<i class="fas fa-chart-simple"></i>') {
    if (!incidencias || incidencias.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'Sin registros',
            text: 'No hay incidencias para mostrar',
            background: 'var(--color-bg-primary)',
            color: 'white',
            customClass: {
                popup: 'swal2-popup-custom'
            }
        });
        return;
    }

    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    
    // Calcular estadísticas resumen
    const totalCriticas = incidencias.filter(i => i.nivelRiesgo === 'critico').length;
    const totalAltas = incidencias.filter(i => i.nivelRiesgo === 'alto').length;
    const totalPendientes = incidencias.filter(i => i.estado === 'pendiente').length;
    const totalFinalizadas = incidencias.filter(i => i.estado === 'finalizada').length;

    // Limitar a los primeros 15 registros
    const incidenciasMostrar = incidencias.slice(0, 15);
    const hayMas = incidencias.length > 15;

    let registrosHtml = `
        <div class="swal-resumen-stats">
            <div class="swal-stats-grid">
                <div class="swal-stat-item" style="border-left-color: #8b5cf6;">
                    <span class="swal-stat-label">Total incidencias</span>
                    <span class="swal-stat-value">${incidencias.length}</span>
                </div>
                <div class="swal-stat-item" style="border-left-color: #ef4444;">
                    <span class="swal-stat-label">Críticas + Altas</span>
                    <span class="swal-stat-value" style="color: #ef4444;">${totalCriticas + totalAltas}</span>
                </div>
                <div class="swal-stat-item" style="border-left-color: #f59e0b;">
                    <span class="swal-stat-label">Pendientes</span>
                    <span class="swal-stat-value" style="color: #f59e0b;">${totalPendientes}</span>
                </div>
                <div class="swal-stat-item" style="border-left-color: #10b981;">
                    <span class="swal-stat-label">Finalizadas</span>
                    <span class="swal-stat-value" style="color: #10b981;">${totalFinalizadas}</span>
                </div>
            </div>
        </div>
        <div class="swal-registros-list">
    `;

    incidenciasMostrar.forEach(inc => {
        const fecha = inc.fechaInicio instanceof Date ? inc.fechaInicio.toLocaleDateString('es-MX') :
            (inc.fechaInicio ? new Date(inc.fechaInicio).toLocaleDateString('es-MX') : 'N/A');

        let estadoColor = '#6c757d';
        let estadoIcon = 'fa-circle';
        if (inc.estado === 'finalizada') {
            estadoColor = '#10b981';
            estadoIcon = 'fa-check-circle';
        } else if (inc.estado === 'pendiente') {
            estadoColor = '#f59e0b';
            estadoIcon = 'fa-clock';
        }

        let riesgoColor = '#6c757d';
        let riesgoIcon = 'fa-chart-line';
        let riesgoTexto = inc.nivelRiesgo ? inc.nivelRiesgo.charAt(0).toUpperCase() + inc.nivelRiesgo.slice(1) : 'N/A';
        if (inc.nivelRiesgo === 'critico') {
            riesgoColor = '#ef4444';
            riesgoIcon = 'fa-exclamation-triangle';
        } else if (inc.nivelRiesgo === 'alto') {
            riesgoColor = '#f97316';
            riesgoIcon = 'fa-exclamation-circle';
        } else if (inc.nivelRiesgo === 'medio') {
            riesgoColor = '#eab308';
            riesgoIcon = 'fa-chart-simple';
        } else if (inc.nivelRiesgo === 'bajo') {
            riesgoColor = '#10b981';
            riesgoIcon = 'fa-check';
        }

        const detalles = inc.detalles ? (inc.detalles.length > 80 ? inc.detalles.substring(0, 80) + '...' : inc.detalles) : 'Sin detalles';

        // Verificar si tiene PDF asociado
        const tienePDF = inc.pdfUrl && inc.pdfUrl.trim() !== '';
        const pdfEstado = inc.estadoGeneracion || 'pendiente';
        let pdfIcono = '';
        let pdfTexto = '';
        let pdfColor = '';
        
        if (tienePDF) {
            pdfIcono = '<i class="fas fa-file-pdf" style="color: #c0392b;"></i>';
            pdfTexto = 'Ver PDF';
            pdfColor = '#c0392b';
        } else if (pdfEstado === 'generando') {
            pdfIcono = '<i class="fas fa-spinner fa-spin"></i>';
            pdfTexto = 'Generando PDF...';
            pdfColor = '#f59e0b';
        } else {
            pdfIcono = '<i class="fas fa-file-pdf" style="color: #6c757d;"></i>';
            pdfTexto = 'PDF no disponible';
            pdfColor = '#6c757d';
        }

        registrosHtml += `
            <div class="swal-registro-card" data-incidencia-id="${inc.id}">
                <div class="swal-card-header">
                    <span class="swal-id"><i class="fas fa-hashtag"></i> ${escapeHTML(inc.id.substring(0, 12))}...</span>
                    <span class="swal-fecha"><i class="fas fa-calendar-alt"></i> ${fecha}</span>
                </div>
                <div class="swal-card-body">
                    <div class="swal-info-principal">
                        <div class="swal-sucursal">
                            <i class="fas fa-store"></i> ${escapeHTML(obtenerNombreSucursal(inc.sucursalId) || 'Sin asignar')}
                        </div>
                        <div class="swal-tipo-evento">
                            <i class="fas ${riesgoIcon}" style="color: ${riesgoColor};"></i> ${riesgoTexto}
                            <span class="swal-estado-badge" style="margin-left: 8px; color: ${estadoColor};">
                                <i class="fas ${estadoIcon}"></i> ${inc.estado ? inc.estado.charAt(0).toUpperCase() + inc.estado.slice(1) : 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div class="swal-montos">
                        <span class="swal-monto-perdido"><i class="fas fa-user"></i> ${escapeHTML(inc.creadoPorNombre || 'N/A')}</span>
                        ${inc.actualizadoPorNombre ? `<span class="swal-monto-recuperado"><i class="fas fa-edit"></i> ${escapeHTML(inc.actualizadoPorNombre)}</span>` : ''}
                    </div>
                </div>
                <div class="swal-card-footer">
                    <div class="swal-narracion">
                        <i class="fas fa-file-alt"></i>
                        <span>${escapeHTML(detalles)}</span>
                    </div>
                </div>
                <div class="swal-card-actions" style="display: flex; justify-content: flex-end; gap: 8px; padding: 8px 14px 12px 14px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <button class="swal-pdf-btn" data-incidencia-id="${inc.id}" data-pdf-url="${inc.pdfUrl || ''}" data-pdf-estado="${pdfEstado}" style="background: rgba(0,0,0,0.5); border: none; border-radius: 8px; padding: 6px 12px; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 0.7rem; transition: all 0.2s ease;">
                        ${pdfIcono}
                        <span style="color: ${pdfColor};">${pdfTexto}</span>
                    </button>
                </div>
            </div>
        `;
    });

    if (hayMas) {
        registrosHtml += `
            <div class="swal-mas-registros">
                <i class="fas fa-ellipsis-h"></i> y ${incidencias.length - 15} incidencias más. Haz clic en un registro para ver detalles completos.
            </div>
        `;
    }

    registrosHtml += `</div>`;

    Swal.fire({
        title: `${icono} ${titulo}`,
        html: registrosHtml,
        width: '880px',
        background: 'transparent',
        showConfirmButton: true,
        confirmButtonText: '<i class="fas fa-check"></i> Cerrar',
        confirmButtonColor: '#28a745',
        customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            confirmButton: 'swal2-confirm'
        },
        backdrop: `
            rgba(0,0,0,0.8)
            left top
            no-repeat
        `,
        didOpen: () => {
            // Agregar event listeners a los botones de PDF
            document.querySelectorAll('.swal-pdf-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const incidenciaId = btn.dataset.incidenciaId;
                    const pdfUrl = btn.dataset.pdfUrl;
                    const pdfEstado = btn.dataset.pdfEstado;
                    
                    abrirPDFDesdeSweet(incidenciaId, pdfUrl, pdfEstado);
                });
            });
            
            // Agregar click en las tarjetas para ver detalles
            document.querySelectorAll('.swal-registro-card').forEach(card => {
                const incidenciaId = card.dataset.incidenciaId;
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.swal-pdf-btn')) {
                        window.verDetalleIncidenciaDesdeSweet(incidenciaId);
                    }
                });
            });
        }
    });
}

// =============================================
// FUNCIÓN PARA ABRIR PDF DESDE SWEETALERT
// =============================================
function abrirPDFDesdeSweet(incidenciaId, pdfUrl, pdfEstado) {
    const incidencia = datosGraficas.incidenciasFiltradas?.find(i => i.id === incidenciaId);
    
    if (!incidencia) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontró la incidencia',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
        return;
    }
    
    const urlActual = incidencia.pdfUrl || pdfUrl;
    const estadoActual = incidencia.estadoGeneracion || pdfEstado;
    
    if (urlActual && urlActual.trim() !== '') {
        window.open(urlActual, '_blank');
        
        Swal.fire({
            icon: 'success',
            title: 'Abriendo PDF',
            text: 'El PDF se abrirá en el visor del navegador',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
    } else if (estadoActual === 'generando') {
        Swal.fire({
            icon: 'info',
            title: 'Generando PDF',
            text: 'El PDF se está generando en segundo plano. Recibirás una notificación cuando esté listo.',
            confirmButtonText: 'Entendido',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'PDF no disponible',
            text: 'Este registro aún no tiene un PDF generado.',
            confirmButtonText: 'Entendido',
            background: 'var(--color-bg-primary)',
            color: 'white'
        });
    }
}

// =============================================
// FUNCIÓN GLOBAL PARA VER DETALLE DE INCIDENCIA - VERSIÓN MEJORADA
// =============================================
window.verDetalleIncidenciaDesdeSweet = function (incidenciaId) {
    Swal.close();

    const incidencia = datosGraficas.incidenciasFiltradas?.find(i => i.id === incidenciaId);

    if (!incidencia) {
        Swal.fire({
            icon: 'error',
            title: 'Incidencia no encontrada',
            text: 'No se pudo encontrar la incidencia seleccionada',
            background: 'var(--color-bg-primary)',
            color: 'white',
            customClass: {
                popup: 'swal2-popup-custom'
            }
        });
        return;
    }

    const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
    const fecha = incidencia.fechaInicio instanceof Date ? incidencia.fechaInicio.toLocaleDateString('es-MX') :
        (incidencia.fechaInicio ? new Date(incidencia.fechaInicio).toLocaleDateString('es-MX') : 'N/A');

    let estadoColor = '#6c757d';
    let estadoIcon = 'fa-circle';
    if (incidencia.estado === 'finalizada') {
        estadoColor = '#10b981';
        estadoIcon = 'fa-check-circle';
    } else if (incidencia.estado === 'pendiente') {
        estadoColor = '#f59e0b';
        estadoIcon = 'fa-clock';
    }

    let riesgoColor = '#6c757d';
    let riesgoIcon = 'fa-chart-line';
    let riesgoTexto = incidencia.nivelRiesgo ? incidencia.nivelRiesgo.charAt(0).toUpperCase() + incidencia.nivelRiesgo.slice(1) : 'N/A';
    if (incidencia.nivelRiesgo === 'critico') {
        riesgoColor = '#ef4444';
        riesgoIcon = 'fa-exclamation-triangle';
    } else if (incidencia.nivelRiesgo === 'alto') {
        riesgoColor = '#f97316';
        riesgoIcon = 'fa-exclamation-circle';
    } else if (incidencia.nivelRiesgo === 'medio') {
        riesgoColor = '#eab308';
        riesgoIcon = 'fa-chart-simple';
    } else if (incidencia.nivelRiesgo === 'bajo') {
        riesgoColor = '#10b981';
        riesgoIcon = 'fa-check';
    }

    // Verificar estado del PDF
    const tienePDF = incidencia.pdfUrl && incidencia.pdfUrl.trim() !== '';
    const pdfEstado = incidencia.estadoGeneracion || 'pendiente';
    let pdfIcono = '';
    let pdfTexto = '';
    let pdfColor = '';
    
    if (tienePDF) {
        pdfIcono = '<i class="fas fa-file-pdf" style="color: #c0392b;"></i>';
        pdfTexto = 'Ver PDF';
        pdfColor = '#c0392b';
    } else if (pdfEstado === 'generando') {
        pdfIcono = '<i class="fas fa-spinner fa-spin"></i>';
        pdfTexto = 'Generando PDF...';
        pdfColor = '#f59e0b';
    } else {
        pdfIcono = '<i class="fas fa-file-pdf" style="color: #6c757d;"></i>';
        pdfTexto = 'PDF no disponible';
        pdfColor = '#6c757d';
    }

    // Construir HTML de seguimientos si existen
    let seguimientosHtml = '';
    if (incidencia.seguimiento && Object.keys(incidencia.seguimiento).length > 0) {
        const seguimientosList = Object.values(incidencia.seguimiento);
        seguimientosHtml = `
            <div style="background: rgba(0,0,0,0.3); border-radius: 16px; padding: 16px;">
                <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af; margin-bottom: 12px;"><i class="fas fa-history"></i> Seguimientos (${seguimientosList.length})</div>
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                    ${seguimientosList.map(seg => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                            <div style="display: flex; flex-direction: column;">
                                <span style="color: #3b82f6; font-weight: 600;">${escapeHTML(seg.usuarioNombre || 'Usuario')}</span>
                                <span style="font-size: 0.65rem; color: #9ca3af;">${seg.fecha ? new Date(seg.fecha).toLocaleString('es-MX') : 'Fecha no disponible'}</span>
                            </div>
                            <span style="font-size: 0.7rem; color: #d1d5db;">${escapeHTML(seg.comentario ? (seg.comentario.substring(0, 50) + (seg.comentario.length > 50 ? '...' : '')) : 'Sin comentario')}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    const detallesHtml = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="swal-resumen-stats" style="margin-bottom: 0;">
                <div class="swal-stats-grid">
                    <div class="swal-stat-item" style="border-left-color: #8b5cf6;">
                        <span class="swal-stat-label">ID Incidencia</span>
                        <span class="swal-stat-value" style="font-size: 0.8rem; word-break: break-all;">${escapeHTML(incidencia.id)}</span>
                    </div>
                    <div class="swal-stat-item" style="border-left-color: #3b82f6;">
                        <span class="swal-stat-label">Fecha</span>
                        <span class="swal-stat-value" style="font-size: 0.9rem;">${fecha}</span>
                    </div>
                    <div class="swal-stat-item" style="border-left-color: ${estadoColor};">
                        <span class="swal-stat-label">Estado</span>
                        <span class="swal-stat-value" style="color: ${estadoColor};"><i class="fas ${estadoIcon}"></i> ${incidencia.estado ? incidencia.estado.charAt(0).toUpperCase() + incidencia.estado.slice(1) : 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div style="background: rgba(0,0,0,0.4); border-radius: 16px; padding: 16px; border: 1px solid rgba(255,255,255,0.08);">
                <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: space-between;">
                    <div>
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">Sucursal</div>
                        <div style="font-size: 1rem; font-weight: 600; margin-top: 4px;"><i class="fas fa-store" style="color: var(--color-accent-primary);"></i> ${escapeHTML(obtenerNombreSucursal(incidencia.sucursalId) || 'N/A')}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">Categoría</div>
                        <div style="font-size: 1rem; font-weight: 600; margin-top: 4px;"><i class="fas fa-tag"></i> ${escapeHTML(obtenerNombreCategoria(incidencia.categoriaId) || 'N/A')}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af; letter-spacing: 1px;">Nivel de riesgo</div>
                        <div style="font-size: 1rem; font-weight: 600; margin-top: 4px; color: ${riesgoColor};"><i class="fas ${riesgoIcon}"></i> ${riesgoTexto}</div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; flex-wrap: wrap; gap: 16px;">
                <div style="flex: 1; background: rgba(59, 130, 246, 0.1); border-radius: 16px; padding: 16px; border-left: 3px solid #3b82f6;">
                    <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af;">Creado por</div>
                    <div style="font-size: 1rem; font-weight: 600; margin-top: 4px;"><i class="fas fa-user-plus"></i> ${escapeHTML(incidencia.creadoPorNombre || 'N/A')}</div>
                </div>
                <div style="flex: 1; background: rgba(245, 158, 11, 0.1); border-radius: 16px; padding: 16px; border-left: 3px solid #f59e0b;">
                    <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af;">Actualizado por</div>
                    <div style="font-size: 1rem; font-weight: 600; margin-top: 4px;"><i class="fas fa-user-edit"></i> ${escapeHTML(incidencia.actualizadoPorNombre || 'N/A')}</div>
                </div>
            </div>
            
            ${incidencia.detalles ? `
            <div style="background: rgba(0,0,0,0.3); border-radius: 16px; padding: 16px;">
                <div style="font-size: 0.7rem; text-transform: uppercase; color: #9ca3af; margin-bottom: 8px;"><i class="fas fa-file-alt"></i> Detalles</div>
                <div style="font-size: 0.85rem; line-height: 1.5; color: #d1d5db;">${escapeHTML(incidencia.detalles)}</div>
            </div>
            ` : ''}
            
            ${seguimientosHtml}
            
            <!-- Botón de PDF -->
            <div style="display: flex; justify-content: center; gap: 12px; margin-top: 8px;">
                <button id="btnPdfDesdeSweetDetalle" style="background: linear-gradient(145deg, #0f0f0f, #1a1a1a); border: 1px solid ${tienePDF ? '#c0392b' : '#6c757d'}; border-radius: 12px; padding: 10px 24px; color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 0.8rem; font-family: var(--font-family-primary, 'Orbitron', sans-serif); transition: all 0.2s ease;">
                    ${pdfIcono}
                    <span style="color: ${pdfColor};">${pdfTexto}</span>
                </button>
            </div>
        </div>
    `;

    Swal.fire({
        title: `<i class="fas fa-info-circle" style="color: var(--color-accent-primary);"></i> Detalles de la incidencia`,
        html: detallesHtml,
        width: '750px',
        background: 'transparent',
        showConfirmButton: true,
        confirmButtonText: '<i class="fas fa-check"></i> Cerrar',
        customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            confirmButton: 'swal2-confirm'
        },
        didOpen: () => {
            const btnPdf = document.getElementById('btnPdfDesdeSweetDetalle');
            if (btnPdf) {
                btnPdf.addEventListener('click', (e) => {
                    e.stopPropagation();
                    abrirPDFDesdeSweet(incidencia.id, incidencia.pdfUrl, incidencia.estadoGeneracion);
                });
            }
        }
    });
};

// =============================================
// PROCESAR DATOS PARA LAS 8 GRÁFICAS
// =============================================
function procesarDatosGraficas(incidencias) {
    const metricas = {
        total: incidencias.length,
        pendientes: incidencias.filter(i => i.estado === 'pendiente').length,
        finalizadas: incidencias.filter(i => i.estado === 'finalizada').length,
        criticas: incidencias.filter(i => i.nivelRiesgo === 'critico').length,
        altas: incidencias.filter(i => i.nivelRiesgo === 'alto').length,
        medias: incidencias.filter(i => i.nivelRiesgo === 'medio').length,
        bajas: incidencias.filter(i => i.nivelRiesgo === 'bajo').length
    };

    const actualizacionesPorColaborador = new Map();
    incidencias.forEach(inc => {
        if (inc.actualizadoPorNombre) {
            const nombre = inc.actualizadoPorNombre;
            actualizacionesPorColaborador.set(nombre, (actualizacionesPorColaborador.get(nombre) || 0) + 1);
        }
    });

    const topActualizadores = Array.from(actualizacionesPorColaborador.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    const reportesPorColaborador = new Map();
    incidencias.forEach(inc => {
        if (inc.creadoPorNombre) {
            const nombre = inc.creadoPorNombre;
            reportesPorColaborador.set(nombre, (reportesPorColaborador.get(nombre) || 0) + 1);
        }
    });

    const topReportadores = Array.from(reportesPorColaborador.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    const seguimientosPorColaborador = new Map();
    incidencias.forEach(inc => {
        if (inc.seguimiento) {
            Object.values(inc.seguimiento).forEach(seg => {
                if (seg.usuarioNombre) {
                    const nombre = seg.usuarioNombre;
                    seguimientosPorColaborador.set(nombre, (seguimientosPorColaborador.get(nombre) || 0) + 1);
                }
            });
        }
    });

    const topSeguimientos = Array.from(seguimientosPorColaborador.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    const estadoData = {
        pendientes: metricas.pendientes,
        finalizadas: metricas.finalizadas
    };

    const riesgoData = {
        critico: metricas.criticas,
        alto: metricas.altas,
        medio: metricas.medias,
        bajo: metricas.bajas
    };

    const categoriasMap = new Map();
    incidencias.forEach(inc => {
        if (inc.categoriaId) {
            const nombre = obtenerNombreCategoria(inc.categoriaId);
            categoriasMap.set(nombre, (categoriasMap.get(nombre) || 0) + 1);
        }
    });

    const categoriasData = Array.from(categoriasMap.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    const sucursalesMap = new Map();
    incidencias.forEach(inc => {
        if (inc.sucursalId) {
            const nombre = obtenerNombreSucursal(inc.sucursalId);
            sucursalesMap.set(nombre, (sucursalesMap.get(nombre) || 0) + 1);
        }
    });

    const sucursalesData = Array.from(sucursalesMap.entries())
        .map(([nombre, cantidad]) => ({ nombre, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    // Cálculo del tiempo promedio de resolución
    const tiemposResolucion = new Map();
    const incidenciasFinalizadas = incidencias.filter(i =>
        i.estado === 'finalizada' && i.fechaFinalizacion && i.fechaInicio
    );

    incidenciasFinalizadas.forEach(inc => {
        if (inc.actualizadoPorNombre) {
            const inicio = inc.fechaInicio instanceof Date ? inc.fechaInicio : new Date(inc.fechaInicio);
            const fin = inc.fechaFinalizacion instanceof Date ? inc.fechaFinalizacion : new Date(inc.fechaFinalizacion);
            const diferenciaMs = fin - inicio;
            const tiempoHoras = Math.round(diferenciaMs / (1000 * 60 * 60));

            if (tiempoHoras > 0 && tiempoHoras < 720) {
                if (!tiemposResolucion.has(inc.actualizadoPorNombre)) {
                    tiemposResolucion.set(inc.actualizadoPorNombre, {
                        total: 0,
                        count: 0
                    });
                }
                const data = tiemposResolucion.get(inc.actualizadoPorNombre);
                data.total += tiempoHoras;
                data.count++;
            }
        }
    });

    const tiemposPromedio = Array.from(tiemposResolucion.entries())
        .map(([nombre, data]) => ({
            nombre: nombre,
            promedio: data.count > 0 ? Math.round(data.total / data.count) : 0
        }))
        .filter(t => t.promedio > 0)
        .sort((a, b) => a.promedio - b.promedio)
        .slice(0, 8);

    // Datos de colaboradores para la tabla
    const colaboradoresMap = new Map();

    incidencias.forEach(inc => {
        if (inc.creadoPorNombre) {
            if (!colaboradoresMap.has(inc.creadoPorNombre)) {
                colaboradoresMap.set(inc.creadoPorNombre, {
                    nombre: inc.creadoPorNombre,
                    reportados: 0,
                    actualizados: 0,
                    seguimientos: 0,
                    tiempoTotal: 0,
                    incidenciasResueltas: 0
                });
            }
            colaboradoresMap.get(inc.creadoPorNombre).reportados++;
        }

        if (inc.actualizadoPorNombre) {
            if (!colaboradoresMap.has(inc.actualizadoPorNombre)) {
                colaboradoresMap.set(inc.actualizadoPorNombre, {
                    nombre: inc.actualizadoPorNombre,
                    reportados: 0,
                    actualizados: 0,
                    seguimientos: 0,
                    tiempoTotal: 0,
                    incidenciasResueltas: 0
                });
            }
            const col = colaboradoresMap.get(inc.actualizadoPorNombre);
            col.actualizados++;

            if (inc.estado === 'finalizada') {
                col.incidenciasResueltas++;
            }
        }

        if (inc.seguimiento) {
            Object.values(inc.seguimiento).forEach(seg => {
                if (seg.usuarioNombre) {
                    if (!colaboradoresMap.has(seg.usuarioNombre)) {
                        colaboradoresMap.set(seg.usuarioNombre, {
                            nombre: seg.usuarioNombre,
                            reportados: 0,
                            actualizados: 0,
                            seguimientos: 0,
                            tiempoTotal: 0,
                            incidenciasResueltas: 0
                        });
                    }
                    colaboradoresMap.get(seg.usuarioNombre).seguimientos++;
                }
            });
        }
    });

    incidenciasFinalizadas.forEach(inc => {
        if (inc.actualizadoPorNombre && colaboradoresMap.has(inc.actualizadoPorNombre)) {
            const inicio = inc.fechaInicio instanceof Date ? inc.fechaInicio : new Date(inc.fechaInicio);
            const fin = inc.fechaFinalizacion instanceof Date ? inc.fechaFinalizacion : new Date(inc.fechaFinalizacion);
            const tiempo = Math.round((fin - inicio) / (1000 * 60 * 60));

            if (tiempo > 0 && tiempo < 720) {
                const col = colaboradoresMap.get(inc.actualizadoPorNombre);
                col.tiempoTotal += tiempo;
            }
        }
    });

    return {
        metricas,
        topActualizadores,
        topReportadores,
        topSeguimientos,
        estadoData,
        riesgoData,
        categoriasData,
        sucursalesData,
        tiemposPromedio,
        colaboradores: Array.from(colaboradoresMap.values())
            .sort((a, b) => (b.reportados + b.actualizados + b.seguimientos) - (a.reportados + a.actualizados + a.seguimientos))
    };
}

// =============================================
// ACTUALIZAR MÉTRICAS PRINCIPALES
// =============================================
function actualizarMetricasPrincipales(metricas) {
    const total = metricas.total || 1;

    setElementText('metricCriticas', metricas.criticas);
    setElementText('metricAltas', metricas.altas);
    setElementText('metricPendientes', metricas.pendientes);
    setElementText('metricTotal', total);

    setElementText('metricCriticasPorcentaje', `${Math.round((metricas.criticas / total) * 100)}% del total`);
    setElementText('metricAltasPorcentaje', `${Math.round((metricas.altas / total) * 100)}% del total`);
    setElementText('metricPendientesPorcentaje', `${Math.round((metricas.pendientes / total) * 100)}% pendientes`);
    setElementText('metricFinalizadasPorcentaje', `${Math.round((metricas.finalizadas / total) * 100)}% resueltas`);
}

// =============================================
// RENDERIZAR TODAS LAS GRÁFICAS CON EVENTOS DE CLIC
// =============================================
function renderizarTodasLasGraficas(datos) {
    // Destruir gráficas existentes
    Object.keys(charts).forEach(key => {
        if (charts[key] && typeof charts[key].destroy === 'function') {
            charts[key].destroy();
            delete charts[key];
        }
    });

    crearGraficoActualizadores(datos.topActualizadores);
    crearGraficoReportadores(datos.topReportadores);
    crearGraficoSeguimientos(datos.topSeguimientos);
    crearGraficoEstado(datos.estadoData);
    crearGraficoRiesgo(datos.riesgoData);
    crearGraficoCategorias(datos.categoriasData);
    crearGraficoSucursales(datos.sucursalesData);
    crearGraficoTiempoResolucion(datos.tiemposPromedio);

    // Agregar eventos de clic a los canvas
    agregarEventosClickCanvas();
}

function agregarEventosClickCanvas() {
    const canvasConfigs = [
        { id: 'graficoActualizadores', handler: mostrarAlertActualizadores },
        { id: 'graficoReportadores', handler: mostrarAlertReportadores },
        { id: 'graficoSeguimientos', handler: mostrarAlertSeguimientos },
        { id: 'graficoEstado', handler: mostrarAlertEstado },
        { id: 'graficoRiesgo', handler: mostrarAlertRiesgo },
        { id: 'graficoCategorias', handler: mostrarAlertCategorias },
        { id: 'graficoSucursales', handler: mostrarAlertSucursales },
        { id: 'graficoTiempo', handler: mostrarAlertTiempoResolucion }
    ];

    canvasConfigs.forEach(config => {
        const canvas = document.getElementById(config.id);
        if (canvas) {
            canvas.removeEventListener('click', config.handler);
            canvas.addEventListener('click', config.handler);
            canvas.style.cursor = 'pointer';
        }
    });
}

function crearGraficoActualizadores(actualizadores) {
    const canvas = document.getElementById('graficoActualizadores');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!actualizadores || actualizadores.length === 0) {
        mostrarMensajeSinDatosEnCanvas(ctx, canvas, 'Sin datos de actualizaciones');
        return;
    }

    charts.actualizadores = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: actualizadores.map(a => a.nombre.length > 12 ? a.nombre.substring(0, 10) + '...' : a.nombre),
            datasets: [{
                label: 'Incidencias actualizadas',
                data: actualizadores.map(a => a.cantidad),
                backgroundColor: COLORS.azul,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: 'white' } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.raw} incidencias actualizadas`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'white', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'white', maxRotation: 45 }
                }
            }
        }
    });
}

function crearGraficoReportadores(reportadores) {
    const canvas = document.getElementById('graficoReportadores');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!reportadores || reportadores.length === 0) {
        mostrarMensajeSinDatosEnCanvas(ctx, canvas, 'Sin datos de reportes');
        return;
    }

    charts.reportadores = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: reportadores.map(r => r.nombre.length > 12 ? r.nombre.substring(0, 10) + '...' : r.nombre),
            datasets: [{
                label: 'Incidencias reportadas',
                data: reportadores.map(r => r.cantidad),
                backgroundColor: COLORS.verde,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: 'white' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'white', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'white', maxRotation: 45 }
                }
            }
        }
    });
}

function crearGraficoSeguimientos(seguimientos) {
    const canvas = document.getElementById('graficoSeguimientos');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!seguimientos || seguimientos.length === 0) {
        mostrarMensajeSinDatosEnCanvas(ctx, canvas, 'Sin datos de seguimientos');
        return;
    }

    charts.seguimientos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: seguimientos.map(s => s.nombre.length > 12 ? s.nombre.substring(0, 10) + '...' : s.nombre),
            datasets: [{
                label: 'Seguimientos realizados',
                data: seguimientos.map(s => s.cantidad),
                backgroundColor: COLORS.naranja,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: 'white' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'white', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'white', maxRotation: 45 }
                }
            }
        }
    });
}

function crearGraficoEstado(estado) {
    const canvas = document.getElementById('graficoEstado');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if ((!estado.pendientes || estado.pendientes === 0) && (!estado.finalizadas || estado.finalizadas === 0)) {
        mostrarMensajeSinDatosEnCanvas(ctx, canvas, 'Sin datos de estado');
        return;
    }

    charts.estado = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Finalizadas'],
            datasets: [{
                data: [estado.pendientes || 0, estado.finalizadas || 0],
                backgroundColor: [COLORS.pendiente, COLORS.finalizada],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: 'white' },
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = (estado.pendientes || 0) + (estado.finalizadas || 0);
                            const porcentaje = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                            return `${ctx.label}: ${ctx.raw} (${porcentaje}%)`;
                        }
                    }
                }
            }
        }
    });
}

function crearGraficoRiesgo(riesgo) {
    const canvas = document.getElementById('graficoRiesgo');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if ((!riesgo.critico || riesgo.critico === 0) &&
        (!riesgo.alto || riesgo.alto === 0) &&
        (!riesgo.medio || riesgo.medio === 0) &&
        (!riesgo.bajo || riesgo.bajo === 0)) {
        mostrarMensajeSinDatosEnCanvas(ctx, canvas, 'Sin datos de riesgo');
        return;
    }

    charts.riesgo = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Crítico', 'Alto', 'Medio', 'Bajo'],
            datasets: [{
                data: [riesgo.critico || 0, riesgo.alto || 0, riesgo.medio || 0, riesgo.bajo || 0],
                backgroundColor: [COLORS.critico, COLORS.alto, COLORS.medio, COLORS.bajo],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: 'white' },
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = (riesgo.critico || 0) + (riesgo.alto || 0) + (riesgo.medio || 0) + (riesgo.bajo || 0);
                            const porcentaje = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                            return `${ctx.label}: ${ctx.raw} (${porcentaje}%)`;
                        }
                    }
                }
            }
        }
    });
}

function crearGraficoCategorias(categorias) {
    const canvas = document.getElementById('graficoCategorias');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!categorias || categorias.length === 0) {
        mostrarMensajeSinDatosEnCanvas(ctx, canvas, 'Sin datos de categorías');
        return;
    }

    charts.categorias = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categorias.map(c => c.nombre.length > 15 ? c.nombre.substring(0, 12) + '...' : c.nombre),
            datasets: [{
                label: 'Incidencias',
                data: categorias.map(c => c.cantidad),
                backgroundColor: COLORS.morado,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: 'white' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'white', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'white', maxRotation: 45 }
                }
            }
        }
    });
}

function crearGraficoSucursales(sucursales) {
    const canvas = document.getElementById('graficoSucursales');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!sucursales || sucursales.length === 0) {
        mostrarMensajeSinDatosEnCanvas(ctx, canvas, 'Sin datos de sucursales');
        return;
    }

    charts.sucursales = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sucursales.map(s => s.nombre.length > 15 ? s.nombre.substring(0, 12) + '...' : s.nombre),
            datasets: [{
                label: 'Incidencias',
                data: sucursales.map(s => s.cantidad),
                backgroundColor: COLORS.turquesa,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: 'white' } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: 'white', stepSize: 1 }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'white', maxRotation: 45 }
                }
            }
        }
    });
}

function crearGraficoTiempoResolucion(tiempos) {
    const canvas = document.getElementById('graficoTiempo');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (!tiempos || tiempos.length === 0) {
        mostrarMensajeSinDatosEnCanvas(ctx, canvas, 'Sin datos de tiempo de resolución');
        return;
    }

    const nombres = tiempos.map(t => t.nombre.length > 15 ? t.nombre.substring(0, 12) + '...' : t.nombre);
    const promedios = tiempos.map(t => t.promedio);

    const colores = tiempos.map(t => {
        if (t.promedio <= 24) return COLORS.bajo;
        if (t.promedio <= 72) return COLORS.alto;
        return COLORS.critico;
    });

    charts.tiempo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: nombres,
            datasets: [{
                label: 'Horas promedio de resolución',
                data: promedios,
                backgroundColor: colores,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { labels: { color: 'white' } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const horas = ctx.raw;
                            const dias = Math.floor(horas / 24);
                            const horasResto = horas % 24;
                            let texto = `${horas} horas`;
                            if (dias > 0) {
                                texto = `${dias} día${dias > 1 ? 's' : ''} y ${horasResto} horas`;
                            }
                            return `${ctx.dataset.label}: ${texto}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: {
                        color: 'white', stepSize: 24, callback: (value) => {
                            if (value >= 24) {
                                const dias = value / 24;
                                return `${dias}d`;
                            }
                            return `${value}h`;
                        }
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'white', font: { size: 10 } }
                }
            }
        }
    });
}

function mostrarMensajeSinDatosEnCanvas(ctx, canvas, mensaje) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(mensaje, canvas.width / 2, canvas.height / 2);
}

// =============================================
// TABLA DE COLABORADORES
// =============================================
function renderizarTablaColaboradores(colaboradores) {
    const tbody = document.getElementById('tablaColaboradoresBody');
    if (!tbody) return;

    if (!colaboradores || colaboradores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">No hay datos de colaboradores</td</tr>';
        return;
    }

    tbody.innerHTML = colaboradores.slice(0, 10).map(col => {
        const tiempoPromedio = col.incidenciasResueltas > 0 ? Math.round(col.tiempoTotal / col.incidenciasResueltas) : 0;
        const totalActividad = (col.reportados || 0) + (col.actualizados || 0) + (col.seguimientos || 0);
        const maxActividad = colaboradores.length > 0 ?
            Math.max(...colaboradores.map(c => (c.reportados || 0) + (c.actualizados || 0) + (c.seguimientos || 0))) : 1;
        const eficiencia = Math.min(100, Math.round((totalActividad / maxActividad) * 100));

        let tiempoColor = COLORS.bajo;
        if (tiempoPromedio > 72) tiempoColor = COLORS.critico;
        else if (tiempoPromedio > 24) tiempoColor = COLORS.alto;
        else if (tiempoPromedio > 0) tiempoColor = COLORS.medio;

        return `
            <tr>
                <td><i class="fas fa-user-circle" style="color: ${COLORS.azul}; margin-right: 8px;"></i> ${escapeHTML(col.nombre)}</td>
                <td><span class="badge-value badge-info">${col.reportados || 0}</span></td>
                <td><span class="badge-value badge-warning">${col.actualizados || 0}</span></td>
                <td><span class="badge-value badge-success">${col.seguimientos || 0}</span></td>
                <td><span class="badge-value" style="background: ${tiempoColor}20; color: ${tiempoColor};">${tiempoPromedio} h</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="eficiencia-bar" style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px;">
                            <div class="eficiencia-fill" style="width: ${eficiencia}%; height: 100%; background: linear-gradient(90deg, ${COLORS.verde}, ${COLORS.azul}); border-radius: 3px;"></div>
                        </div>
                        <span style="color: white; min-width: 40px;">${eficiencia}%</span>
                    </div>
                    </td>
            </tr>
        `;
    }).join('');
}

// =============================================
// TABLA DE CATEGORÍAS
// =============================================
function renderizarTablaCategorias(categorias) {
    const tbody = document.getElementById('tablaCategoriasBody');
    if (!tbody) return;

    if (!categorias || categorias.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:30px;">No hay datos de categorías</td</tr>';
        return;
    }

    tbody.innerHTML = categorias.map(cat => `
        <tr>
            <td>${escapeHTML(cat.nombre)}</td>
            <td><span class="badge-value badge-info">${cat.cantidad}</span></td>
        </tr>
    `).join('');
}

// =============================================
// FILTRO DE COLABORADORES
// =============================================
function cargarFiltroColaboradores(colaboradores) {
    const selectColab = document.getElementById('filtroColaborador');
    if (!selectColab) return;

    if (!colaboradores || colaboradores.length === 0) {
        selectColab.innerHTML = '<option value="todos">Todos los colaboradores</option>';
        return;
    }

    const opciones = ['<option value="todos">Todos los colaboradores</option>'];

    colaboradores.slice(0, 20).forEach(col => {
        opciones.push(`<option value="${escapeHTML(col.nombre)}">${escapeHTML(col.nombre)}</option>`);
    });

    selectColab.innerHTML = opciones.join('');
}

// =============================================
// FUNCIONES AUXILIARES
// =============================================
function obtenerNombreSucursal(sucursalId) {
    if (!sucursalId) return 'No especificada';
    const sucursal = sucursalesCache.find(s => s.id === sucursalId);
    return sucursal ? sucursal.nombre : 'No disponible';
}

function obtenerNombreCategoria(categoriaId) {
    if (!categoriaId) return 'No especificada';
    const categoria = categoriasCache.find(c => c.id === categoriaId);
    return categoria ? categoria.nombre : 'No disponible';
}

// =============================================
// GENERAR REPORTE PDF
// =============================================
async function generarReportePDF() {
    try {
        if (!incidenciasFiltradas || incidenciasFiltradas.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Sin datos',
                text: 'No hay incidencias para generar el reporte estadístico.'
            });
            return;
        }

        Swal.fire({
            title: 'Preparando datos...',
            text: 'Generando reporte estadístico',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const datos = procesarDatosGraficas(incidenciasFiltradas);

        datos.metricas = {
            total: incidenciasFiltradas.length,
            pendientes: incidenciasFiltradas.filter(i => i.estado === 'pendiente').length,
            finalizadas: incidenciasFiltradas.filter(i => i.estado === 'finalizada').length,
            criticas: incidenciasFiltradas.filter(i => i.nivelRiesgo === 'critico').length,
            altas: incidenciasFiltradas.filter(i => i.nivelRiesgo === 'alto').length,
            medias: incidenciasFiltradas.filter(i => i.nivelRiesgo === 'medio').length,
            bajas: incidenciasFiltradas.filter(i => i.nivelRiesgo === 'bajo').length
        };

        Swal.close();

        await registrarGeneracionPDFReporte(incidenciasFiltradas.length, filtrosActivos);

        const { generadorPDFEstadisticas } = await import('/components/pdf-estadisticas-generator.js');

        generadorPDFEstadisticas.configurar({
            organizacionActual,
            sucursalesCache,
            categoriasCache,
            usuariosCache: [],
            authToken
        });

        await generadorPDFEstadisticas.generarReporte(datos, {
            mostrarAlerta: true,
            fechaInicio: filtrosActivos.fechaInicio,
            fechaFin: filtrosActivos.fechaFin,
            filtrosAplicados: filtrosActivos
        });

    } catch (error) {
        console.error('Error generando PDF:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo generar el reporte PDF: ' + error.message
        });
    }
}

// =============================================
// UTILIDADES
// =============================================
function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function mostrarError(mensaje) {
    console.error(mensaje);
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: mensaje
    });
}

function mostrarErrorInicializacion() {
    const container = document.querySelector('.admin-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#ef4444; margin-bottom:16px;"></i>
                <h5 style="color:white;">Error de inicialización</h5>
                <p style="color:var(--color-text-dim);">No se pudo cargar el módulo de estadísticas.</p>
                <button class="btn-buscar" onclick="location.reload()" style="margin-top:16px; padding:10px 20px;">
                    <i class="fas fa-sync-alt"></i> Reintentar
                </button>
            </div>
        `;
    }
} 
1