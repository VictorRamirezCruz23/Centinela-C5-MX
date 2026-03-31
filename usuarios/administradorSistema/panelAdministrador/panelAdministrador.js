// panelAdministrador.js - Versión limpia

import OperacionesEstadisticas from '/clases/operacion.js';

class PanelAdministrador {
    constructor() {
        this.charts = {};
        this.datosGlobales = null;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando Panel Administrador...');
        
        OperacionesEstadisticas.onProgreso((progreso) => {
            this.actualizarProgreso(progreso);
        });
        
        await this.cargarDatosGlobales();
        this.inicializarBotonesAcciones();
        this.inicializarActualizacionAutomatica();
        this.inicializarAccionesRapidas();
    }

    async cargarDatosGlobales() {
        try {
            this.mostrarLoadingKPI();
            this.datosGlobales = await OperacionesEstadisticas.obtenerDatosTodasEmpresas();
            
            if (this.datosGlobales && this.datosGlobales.totales) {
                this.actualizarKPIs(this.datosGlobales.totales);
                this.actualizarGraficas(this.datosGlobales);
                this.actualizarTopEmpresas(this.datosGlobales.porEmpresa);
                this.actualizarAlertas(this.datosGlobales);
                this.actualizarUltimasEmpresas(this.datosGlobales.porEmpresa);
            } else {
                this.mostrarSinDatos();
            }
            
        } catch (error) {
            console.error('❌ Error cargando datos globales:', error);
            this.mostrarError('Error al cargar los datos del panel');
        }
    }

    mostrarLoadingKPI() {
        const kpis = ['total-empresas', 'total-usuarios', 'total-ingresos', 'total-almacenamiento'];
        kpis.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            }
        });
    }

    actualizarKPIs(totales) {
        const totalEmpresas = this.datosGlobales.porEmpresa?.length || 0;
        this.actualizarElemento('total-empresas', totalEmpresas);
        
        const totalUsuarios = totales.auth?.totalUsuarios || 0;
        this.actualizarElemento('total-usuarios', totalUsuarios);
        
        const ingresosEstimados = (totalEmpresas * 100) + (totalUsuarios * 5);
        this.actualizarElemento('total-ingresos', `$${ingresosEstimados.toLocaleString()}`);
        
        const almacenamientoGB = (totales.storage?.totalSizeMB || 0) / 1024;
        this.actualizarElemento('total-almacenamiento', `${almacenamientoGB.toFixed(2)} GB`);
    }

    actualizarGraficas(datosGlobales) {
        const porEmpresa = datosGlobales.porEmpresa || [];
        
        if (porEmpresa.length > 0) {
            const top5 = [...porEmpresa]
                .sort((a, b) => (b.conteos?.storage?.totalSizeMB || 0) - (a.conteos?.storage?.totalSizeMB || 0))
                .slice(0, 5);
            
            const labels = top5.map(e => this.truncarTexto(e.nombreEmpresa || e.id, 15));
            const data = top5.map(e => e.conteos?.storage?.totalSizeMB || 0);
            
            this.crearGraficaPastel('chartPlanes', labels, data, 'MB');
        }
        
        this.crearGraficaCrecimiento(porEmpresa);
    }

    crearGraficaPastel(canvasId, labels, data, unidad = '') {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        const total = data.reduce((a, b) => a + b, 0);
        const colores = ['#ff4d00', '#2f8cff', '#00cfff', '#b16bff', '#ffcc00'];
        
        this.charts[canvasId] = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colores.slice(0, data.length),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            font: { size: 10, family: "'Rajdhani', sans-serif" },
                            boxWidth: 12,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw;
                                const porcentaje = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value.toFixed(2)} ${unidad} (${porcentaje}%)`;
                            }
                        }
                    }
                },
                cutout: '50%'
            }
        });
    }

    crearGraficaCrecimiento(porEmpresa) {
        const canvas = document.getElementById('chartCrecimiento');
        if (!canvas) return;
        
        if (this.charts['chartCrecimiento']) {
            this.charts['chartCrecimiento'].destroy();
        }
        
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const documentosTotales = porEmpresa.reduce((sum, e) => sum + (e.conteos?.firestore?.documentos || 0), 0);
        const base = documentosTotales / 6;
        const documentosPorMes = [
            Math.round(base * 0.3),
            Math.round(base * 0.5),
            Math.round(base * 0.7),
            Math.round(base * 0.9),
            Math.round(base * 1.1),
            Math.round(base * 1.3)
        ];
        
        this.charts['chartCrecimiento'] = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Documentos Firestore',
                    data: documentosPorMes,
                    borderColor: '#ff4d00',
                    backgroundColor: 'rgba(255, 77, 0, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ff4d00',
                    pointBorderColor: '#ffffff',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#ffffff', font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Documentos: ${context.raw.toLocaleString()}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#ffffff' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#ffffff' }
                    }
                }
            }
        });
    }

    actualizarTopEmpresas(porEmpresa) {
        const container = document.getElementById('topEmpresas');
        if (!container) return;
        
        if (!porEmpresa || porEmpresa.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">No hay datos disponibles</div>';
            return;
        }
        
        const topEmpresas = [...porEmpresa]
            .sort((a, b) => (b.conteos?.auth?.totalUsuarios || 0) - (a.conteos?.auth?.totalUsuarios || 0))
            .slice(0, 5);
        
        container.innerHTML = topEmpresas.map((emp, index) => {
            const nombre = emp.nombreEmpresa || emp.id;
            const usuarios = emp.conteos?.auth?.totalUsuarios || 0;
            const documentos = emp.conteos?.firestore?.documentos || 0;
            const tamanioMB = emp.conteos?.storage?.totalSizeMB || 0;
            const plan = tamanioMB < 100 ? 'Básico' : tamanioMB < 500 ? 'Pro' : tamanioMB < 2000 ? 'Empresarial' : 'Enterprise';
            
            return `
                <div class="top-empresa-item">
                    <div class="top-empresa-rank">${index + 1}</div>
                    <div class="top-empresa-info">
                        <div class="top-empresa-nombre">${this.escapeHTML(nombre)}</div>
                        <div class="top-empresa-detalle">
                            <span><i class="fa-solid fa-users"></i> ${usuarios}</span>
                            <span><i class="fa-solid fa-file"></i> ${documentos}</span>
                            <span class="top-empresa-plan">${plan}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    actualizarAlertas(datosGlobales) {
        const container = document.getElementById('alertasList');
        if (!container) return;
        
        const alertas = [];
        const totales = datosGlobales.totales;
        const porEmpresa = datosGlobales.porEmpresa || [];
        
        const almacenamientoGB = (totales.storage?.totalSizeMB || 0) / 1024;
        if (almacenamientoGB > 90) {
            alertas.push({
                tipo: 'danger',
                titulo: '⚠️ Almacenamiento crítico',
                mensaje: `Se ha utilizado ${almacenamientoGB.toFixed(1)} GB del almacenamiento disponible`
            });
        } else if (almacenamientoGB > 70) {
            alertas.push({
                tipo: 'warning',
                titulo: '📀 Almacenamiento elevado',
                mensaje: `Uso de almacenamiento: ${almacenamientoGB.toFixed(1)} GB`
            });
        }
        
        const empresasInactivas = porEmpresa.filter(e => (e.conteos?.firestore?.documentos || 0) === 0).length;
        if (empresasInactivas > 0) {
            alertas.push({
                tipo: 'info',
                titulo: '🏢 Empresas sin actividad',
                mensaje: `${empresasInactivas} empresas no tienen documentos registrados`
            });
        }
        
        const empresasSinColaboradores = porEmpresa.filter(e => (e.conteos?.auth?.colaboradores || 0) === 0).length;
        if (empresasSinColaboradores > 0) {
            alertas.push({
                tipo: 'warning',
                titulo: '👥 Equipos incompletos',
                mensaje: `${empresasSinColaboradores} empresas no tienen colaboradores registrados`
            });
        }
        
        if (alertas.length === 0) {
            alertas.push({
                tipo: 'success',
                titulo: '✅ Sistema saludable',
                mensaje: 'Todos los indicadores están dentro de los parámetros normales'
            });
        }
        
        container.innerHTML = alertas.map(alerta => `
            <div class="alerta-item ${alerta.tipo}">
                <i class="fa-solid ${this.getIconoAlerta(alerta.tipo)}"></i>
                <div class="alerta-texto">
                    <strong>${alerta.titulo}</strong>
                    <span>${alerta.mensaje}</span>
                </div>
            </div>
        `).join('');
    }

    getIconoAlerta(tipo) {
        const iconos = {
            danger: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            success: 'fa-check-circle'
        };
        return iconos[tipo] || 'fa-bell';
    }

    actualizarUltimasEmpresas(porEmpresa) {
        const container = document.getElementById('ultimasEmpresas');
        if (!container) return;
        
        if (!porEmpresa || porEmpresa.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">No hay empresas registradas</div>';
            return;
        }
        
        const ultimas = [...porEmpresa]
            .sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion))
            .slice(0, 5);
        
        container.innerHTML = ultimas.map(emp => {
            const nombre = emp.nombreEmpresa || emp.id;
            const fecha = emp.fechaActualizacion;
            const fechaFormateada = fecha ? new Date(fecha).toLocaleDateString() : 'Fecha desconocida';
            
            return `
                <div class="ultima-empresa-item">
                    <div class="ultima-empresa-nombre">
                        <i class="fa-solid fa-building" style="color: #ff4d00; margin-right: 8px;"></i>
                        ${this.escapeHTML(nombre)}
                    </div>
                    <div class="ultima-empresa-fecha">
                        <i class="fa-regular fa-calendar"></i> ${fechaFormateada}
                    </div>
                </div>
            `;
        }).join('');
    }

    actualizarProgreso(progreso) {
        if (!progreso.completado && progreso.total > 0) {
            const toastContainer = document.getElementById('progressToast') || this.crearToastProgreso();
            const porcentaje = progreso.porcentaje || Math.round((progreso.procesadas / progreso.total) * 100);
            
            toastContainer.querySelector('.progress-text').textContent = progreso.mensaje || `Actualizando datos... ${porcentaje}%`;
            toastContainer.querySelector('.progress-bar-fill').style.width = `${porcentaje}%`;
            toastContainer.style.display = 'block';
            
        } else if (progreso.completado) {
            const toastContainer = document.getElementById('progressToast');
            if (toastContainer) {
                setTimeout(() => {
                    toastContainer.style.display = 'none';
                }, 3000);
            }
            
            if (progreso.exitosas !== undefined) {
                this.mostrarNotificacion(`Actualización completada: ${progreso.exitosas} empresas actualizadas`, 'success');
                this.cargarDatosGlobales();
            }
        }
    }

    crearToastProgreso() {
        const toast = document.createElement('div');
        toast.id = 'progressToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border-left: 3px solid #ff4d00;
            border-radius: 8px;
            padding: 12px 16px;
            z-index: 1000;
            min-width: 250px;
            backdrop-filter: blur(10px);
            display: none;
        `;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="fa-solid fa-sync-alt fa-spin" style="color: #ff4d00;"></i>
                <span class="progress-text" style="color: #fff; font-size: 0.75rem;">Actualizando...</span>
            </div>
            <div style="background: rgba(255,255,255,0.2); border-radius: 10px; overflow: hidden;">
                <div class="progress-bar-fill" style="width: 0%; height: 3px; background: #ff4d00; transition: width 0.3s;"></div>
            </div>
        `;
        document.body.appendChild(toast);
        return toast;
    }

    inicializarBotonesAcciones() {
        const btnActualizar = document.getElementById('btnActualizarDatos');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => this.actualizarTodosLosDatos());
        }
    }

    inicializarActualizacionAutomatica() {
        setInterval(() => {
            console.log('🔄 Actualización automática de datos...');
            this.cargarDatosGlobales();
        }, 300000);
    }

    inicializarAccionesRapidas() {
        const rutas = {
            'card-ver-empresas': '/usuarios/administradorSistema/administradores/administradores.html',
            'card-ver-planes': '/usuarios/administradorSistema/consumoGlobal/consumoGlobal.html',
            'card-reportes': '/usuarios/administradorSistema/cuentasPM/cuentasPM.html',
            'card-config': '#',
            'card-respaldos': '/usuarios/administradorSistema/operaciones/operaciones.html'
        };

        for (const [id, url] of Object.entries(rutas)) {
            const boton = document.getElementById(id);
            if (boton && url !== '#') {
                boton.addEventListener('click', (e) => {
                    e.preventDefault();
                    Swal.fire({
                        title: 'Cargando...',
                        text: 'Por favor espera',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => Swal.showLoading()
                    });
                    setTimeout(() => {
                        Swal.close();
                        window.location.href = url;
                    }, 300);
                });
            } else if (boton && url === '#') {
                boton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.mostrarNotificacion('Módulo en construcción', 'info');
                });
            }
        }
    }

    async actualizarTodosLosDatos() {
        try {
            const resultado = await OperacionesEstadisticas.actualizarTodas({
                pausaEntreLotes: 800,
                loteSize: 2
            });
            
            if (resultado && resultado.length > 0) {
                this.mostrarNotificacion(`✅ Actualización completada: ${resultado.length} empresas actualizadas`, 'success');
                await this.cargarDatosGlobales();
            }
        } catch (error) {
            console.error('Error actualizando datos:', error);
            this.mostrarError('Error al actualizar los datos');
        }
    }

    actualizarElemento(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    }

    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncarTexto(texto, maxLength) {
        if (!texto) return '';
        return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
    }

    mostrarNotificacion(mensaje, tipo = 'info') {
        Swal.fire({
            text: mensaje,
            icon: tipo,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            background: '#1e1e2e',
            color: '#ffffff'
        });
    }

    mostrarError(mensaje) {
        Swal.fire({
            title: 'Error',
            text: mensaje,
            icon: 'error',
            confirmButtonText: 'OK',
            background: '#1e1e2e',
            color: '#ffffff',
            confirmButtonColor: '#ff4d00'
        });
    }

    mostrarSinDatos() {
        const kpis = ['total-empresas', 'total-usuarios', 'total-ingresos', 'total-almacenamiento'];
        kpis.forEach(id => {
            this.actualizarElemento(id, '0');
        });
        
        const containers = ['topEmpresas', 'alertasList', 'ultimasEmpresas'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '<div style="text-align:center; padding:20px;">No hay datos disponibles</div>';
            }
        });
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new PanelAdministrador();
});