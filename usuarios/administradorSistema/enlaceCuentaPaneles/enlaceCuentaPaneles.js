// ==================== IMPORTS ====================
import { CuentaPM } from '/clases/cuentaPM.js';
import { CLOUD_FUNCTION_BASE_URL, ACTIONS } from '/config/urlCloudFunction.js';

// ==================== VARIABLES GLOBALES ====================
let cuentaAppId = null;
let cuentaData = null;
let powerManageUserToken = null;
let panelesPowerManage = [];

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    await initForm();
});

async function initForm() {
    const urlParams = new URLSearchParams(window.location.search);
    cuentaAppId = urlParams.get('appId') || urlParams.get('id');
    
    if (!cuentaAppId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se especificó la cuenta de monitoreo',
            confirmButtonText: 'VOLVER'
        }).then(() => {
            window.location.href = '/usuarios/administrador/cuentasPM/cuentasPM.html';
        });
        return;
    }
    
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    try {
        await cargarCuenta();
        configurarEventos(elements);
        configurarTabs(elements);
        configurarTipoPanel(elements);
    } catch (error) {
        console.error('❌ Error inicializando:', error);
        mostrarError(error.message);
    }
}

function obtenerElementosDOM() {
    return {
        credentialsSection: document.getElementById('credentialsSection'),
        panelesSection: document.getElementById('panelesSection'),
        pmEmail: document.getElementById('pmEmail'),
        pmPassword: document.getElementById('pmPassword'),
        btnAuthenticate: document.getElementById('btnAuthenticate'),
        panelesLista: document.getElementById('panelesLista'),
        btnAsignarSeleccionados: document.getElementById('btnAsignarSeleccionados'),
        btnVincularNuevoPanel: document.getElementById('btnVincularNuevoPanel'),
        newPanelAlias: document.getElementById('newPanelAlias'),
        newPanelSerial: document.getElementById('newPanelSerial'),
        newPanelMasterCode: document.getElementById('newPanelMasterCode'),
        newAccessProof: document.getElementById('newAccessProof'),
        newEmailProof: document.getElementById('newEmailProof'),
        newAccessProofGroup: document.getElementById('newAccessProofGroup'),
        newEmailProofGroup: document.getElementById('newEmailProofGroup'),
        progressContainer: document.getElementById('progressContainer'),
        progressMessage: document.getElementById('progressMessage'),
        progressBar: document.getElementById('progressBar'),
        cuentaEmail: document.getElementById('cuentaEmail'),
        cuentaAppId: document.getElementById('cuentaAppId'),
        cuentaOrganizacion: document.getElementById('cuentaOrganizacion')
    };
}

async function cargarCuenta() {
    const cuenta = await CuentaPM.obtenerPorAppId(cuentaAppId);
    if (!cuenta) throw new Error('Cuenta no encontrada');
    
    cuentaData = cuenta.toJSON();
    const elements = obtenerElementosDOM();
    
    if (elements) {
        elements.cuentaEmail.textContent = cuentaData.email;
        elements.cuentaAppId.textContent = cuentaData.appId;
        elements.cuentaOrganizacion.textContent = cuentaData.organizacion || 'No asignada';
        if (elements.pmEmail) elements.pmEmail.value = cuentaData.email;
    }
}

async function autenticarPowerManage(elements) {
    const email = elements.pmEmail.value.trim();
    const password = elements.pmPassword.value.trim();
    
    if (!email || !password) {
        Swal.fire({ icon: 'warning', title: 'Credenciales requeridas', text: 'Ingresa email y contraseña' });
        return;
    }
    
    mostrarProgreso(elements, 'Autenticando en Power Manage...', 20);
    
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'autenticar', 
                email, 
                password, 
                app_id: cuentaAppId 
            })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error_message);
        
        powerManageUserToken = result.user_token;
        
        mostrarProgreso(elements, 'Autenticación exitosa', 100);
        setTimeout(() => { elements.progressContainer.style.display = 'none'; }, 1000);
        
        await Swal.fire({ icon: 'success', title: 'Autenticación exitosa', timer: 1500, showConfirmButton: false });
        
        elements.credentialsSection.style.display = 'none';
        elements.panelesSection.style.display = 'block';
        
        await cargarPanelesPowerManage(elements);
        
    } catch (error) {
        elements.progressContainer.style.display = 'none';
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
}

async function cargarPanelesPowerManage(elements) {
    mostrarProgreso(elements, 'Obteniendo paneles de Power Manage...', 20);
    
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'listarPaneles', 
                user_token: powerManageUserToken 
            })
        });
        
        if (!response.ok) throw new Error('Error al obtener paneles');
        
        panelesPowerManage = await response.json();
        
        mostrarProgreso(elements, 'Paneles cargados', 100);
        setTimeout(() => { elements.progressContainer.style.display = 'none'; }, 1000);
        
        renderizarListaPaneles(elements, panelesPowerManage);
        
        if (panelesPowerManage.length > 0 && elements.btnAsignarSeleccionados) {
            elements.btnAsignarSeleccionados.disabled = false;
        }
        
    } catch (error) {
        elements.progressContainer.style.display = 'none';
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
}

function renderizarListaPaneles(elements, paneles) {
    if (!paneles || paneles.length === 0) {
        elements.panelesLista.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tachometer-alt"></i>
                <p>No hay paneles vinculados en Power Manage</p>
                <small>Usa la pestaña "Vincular Nuevo Panel" para agregar uno</small>
            </div>
        `;
        return;
    }
    
    elements.panelesLista.innerHTML = `
        <div class="paneles-header">
            <label class="checkbox-all">
                <input type="checkbox" id="selectAllPaneles">
                <span>Seleccionar todos</span>
            </label>
            <span class="paneles-count">${paneles.length} panel(es) disponibles</span>
        </div>
        <div class="paneles-grid">
            ${paneles.map(panel => `
                <div class="panel-checkbox-card">
                    <label class="checkbox-label">
                        <input type="checkbox" class="panel-checkbox" value="${panel.panel_serial}"
                               data-alias="${escapeHTML(panel.alias || 'Panel sin nombre')}"
                               data-model="${escapeHTML(panel.panel_model || 'Desconocido')}"
                               data-type="${escapeHTML(panel.type || 'No especificado')}">
                        <div class="checkbox-content">
                            <div class="checkbox-icon"><i class="fas fa-microchip"></i></div>
                            <div class="checkbox-info">
                                <strong>${escapeHTML(panel.alias || 'Panel sin nombre')}</strong>
                                <span class="panel-serial">${escapeHTML(panel.panel_serial)}</span>
                                <div class="panel-details">
                                    <small>Modelo: ${escapeHTML(panel.panel_model || 'No disponible')}</small>
                                    <small>Tipo: ${escapeHTML(panel.type || 'No especificado')}</small>
                                </div>
                            </div>
                        </div>
                    </label>
                </div>
            `).join('')}
        </div>
    `;
    
    const selectAll = document.getElementById('selectAllPaneles');
    if (selectAll) {
        selectAll.onchange = (e) => {
            document.querySelectorAll('.panel-checkbox').forEach(cb => cb.checked = e.target.checked);
            actualizarContadorSeleccionados(elements);
        };
    }
    
    document.querySelectorAll('.panel-checkbox').forEach(cb => {
        cb.onchange = () => actualizarContadorSeleccionados(elements);
    });
}

function actualizarContadorSeleccionados(elements) {
    const seleccionados = document.querySelectorAll('.panel-checkbox:checked').length;
    if (elements.btnAsignarSeleccionados) {
        elements.btnAsignarSeleccionados.textContent = `ASIGNAR ${seleccionados} PANEL(ES) A CUENTA`;
    }
}

async function asignarPanelesSeleccionados(elements) {
    const checkboxes = document.querySelectorAll('.panel-checkbox:checked');
    if (checkboxes.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Selecciona paneles', text: 'Debes seleccionar al menos un panel' });
        return;
    }
    
    const panelesAAgregar = [];
    checkboxes.forEach(cb => {
        panelesAAgregar.push({
            serial: cb.value,
            alias: cb.getAttribute('data-alias'),
            modelo: cb.getAttribute('data-model'),
            tipo: cb.getAttribute('data-type'),
            fechaVinculacion: new Date().toISOString(),
            activo: true
        });
    });
    
    const confirm = await Swal.fire({
        title: 'Confirmar asignación',
        text: `¿Asignar ${panelesAAgregar.length} panel(es) a ${cuentaData.email}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'SÍ, ASIGNAR'
    });
    
    if (!confirm.isConfirmed) return;
    
    mostrarProgreso(elements, `Asignando ${panelesAAgregar.length} panel(es)...`, 20);
    
    try {
        const cuenta = await CuentaPM.obtenerPorAppId(cuentaAppId);
        const panelesExistentes = cuentaData.paneles || [];
        const panelesActualizados = [...panelesExistentes];
        
        for (const nuevoPanel of panelesAAgregar) {
            if (!panelesActualizados.some(p => p.serial === nuevoPanel.serial)) {
                panelesActualizados.push(nuevoPanel);
            }
        }
        
        mostrarProgreso(elements, 'Guardando...', 70);
        await cuenta.actualizar({ paneles: panelesActualizados });
        
        mostrarProgreso(elements, 'Completado', 100);
        setTimeout(() => { elements.progressContainer.style.display = 'none'; }, 1000);
        
        await Swal.fire({
            icon: 'success',
            title: '¡Paneles asignados!',
            text: `${panelesAAgregar.length} panel(es) asignado(s) correctamente`
        });
        
        window.location.href = '/usuarios/administrador/cuentasPM/cuentasPM.html';
        
    } catch (error) {
        elements.progressContainer.style.display = 'none';
        Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
}

async function vincularNuevoPanel(elements) {
    const alias = elements.newPanelAlias.value.trim() || 'Panel Nuevo';
    const serial = elements.newPanelSerial.value.trim();
    const masterCode = elements.newPanelMasterCode.value.trim();
    const isNeo = document.querySelector('input[name="newPanelType"]:checked').value === 'Neo';
    
    if (!serial) {
        Swal.fire({ icon: 'warning', title: 'Serial requerido', text: 'Ingresa el serial del panel' });
        return;
    }
    
    if (!masterCode) {
        Swal.fire({ icon: 'warning', title: 'Código maestro requerido', text: 'Ingresa el código maestro del panel' });
        return;
    }
    
    let accessProof;
    if (isNeo) {
        accessProof = elements.newAccessProof.value.trim();
        if (!accessProof) {
            Swal.fire({ icon: 'warning', title: 'Access Proof requerido', text: 'Ingresa el nombre de la partición con acceso maestro' });
            return;
        }
    } else {
        accessProof = elements.newEmailProof.value.trim();
        if (!accessProof) {
            Swal.fire({ icon: 'warning', title: 'Email Proof requerido', text: 'Ingresa el email configurado en Private Reporting' });
            return;
        }
    }
    
    const confirm = await Swal.fire({
        title: 'Confirmar vinculación',
        html: `
            <div style="text-align: left;">
                <p><strong>Panel:</strong> ${escapeHTML(serial)}</p>
                <p><strong>Alias:</strong> ${escapeHTML(alias)}</p>
                <p><strong>Tipo:</strong> ${isNeo ? 'Neo' : 'PowerMaster'}</p>
                <p><strong>Access Proof:</strong> ${escapeHTML(accessProof)}</p>
            </div>
            <p style="margin-top: 15px;">¿Vincular este panel a Power Manage?</p>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'SÍ, VINCULAR',
        cancelButtonText: 'CANCELAR'
    });
    
    if (!confirm.isConfirmed) return;
    
    mostrarProgreso(elements, 'Vinculando panel a Power Manage...', 20);
    
    try {
        const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'vincularPanel',
                user_token: powerManageUserToken,
                panel_data: { 
                    alias: alias, 
                    panel_serial: serial, 
                    access_proof: accessProof, 
                    master_user_code: masterCode 
                }
            })
        });
        
        mostrarProgreso(elements, 'Procesando respuesta...', 60);
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error_message || 'Error al vincular panel');
        }
        
        mostrarProgreso(elements, 'Panel vinculado exitosamente', 100);
        
        await Swal.fire({ 
            icon: 'success', 
            title: '¡Panel vinculado!', 
            text: `El panel ${serial} ha sido vinculado a Power Manage` 
        });
        
        // Recargar la lista de paneles
        mostrarProgreso(elements, 'Actualizando lista de paneles...', 80);
        await cargarPanelesPowerManage(elements);
        
        // Limpiar formulario
        elements.newPanelSerial.value = '';
        elements.newPanelMasterCode.value = '';
        elements.newAccessProof.value = '';
        elements.newEmailProof.value = '';
        elements.newPanelAlias.value = '';
        
        // Cambiar a la pestaña de paneles existentes
        const existingTab = document.querySelector('.tab-btn[data-tab="existing"]');
        if (existingTab) existingTab.click();
        
        setTimeout(() => {
            elements.progressContainer.style.display = 'none';
            elements.progressBar.style.width = '0%';
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error vinculando panel:', error);
        elements.progressContainer.style.display = 'none';
        
        Swal.fire({ 
            icon: 'error', 
            title: 'Error de vinculación', 
            text: error.message || 'No se pudo vincular el panel. Verifica los datos ingresados.' 
        });
    }
}

function configurarTipoPanel(elements) {
    const radios = document.querySelectorAll('input[name="newPanelType"]');
    const updateProofFields = () => {
        const isNeo = document.querySelector('input[name="newPanelType"]:checked').value === 'Neo';
        elements.newAccessProofGroup.style.display = isNeo ? 'flex' : 'none';
        elements.newEmailProofGroup.style.display = isNeo ? 'none' : 'flex';
        elements.newAccessProof.required = isNeo;
        elements.newEmailProof.required = !isNeo;
    };
    
    radios.forEach(radio => radio.addEventListener('change', updateProofFields));
    updateProofFields();
}

function configurarTabs(elements) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Asegurar que el primer tab está visible
    if (tabContents.length > 0) {
        tabContents.forEach(c => c.style.display = 'none');
        const firstTab = document.getElementById('tab-existing');
        if (firstTab) {
            firstTab.style.display = 'block';
            firstTab.classList.add('active');
        }
    }
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = btn.getAttribute('data-tab');
            
            // Cambiar clase activa en botones
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Cambiar contenido visible
            tabContents.forEach(c => {
                c.classList.remove('active');
                c.style.display = 'none';
            });
            
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetTab) {
                targetTab.classList.add('active');
                targetTab.style.display = 'block';
            }
        });
    });
}

function configurarEventos(elements) {
    if (elements.btnAuthenticate) {
        elements.btnAuthenticate.addEventListener('click', () => autenticarPowerManage(elements));
    }
    if (elements.btnAsignarSeleccionados) {
        elements.btnAsignarSeleccionados.addEventListener('click', () => asignarPanelesSeleccionados(elements));
    }
    if (elements.btnVincularNuevoPanel) {
        elements.btnVincularNuevoPanel.addEventListener('click', () => vincularNuevoPanel(elements));
    }
}

function mostrarProgreso(elements, mensaje, porcentaje) {
    elements.progressContainer.style.display = 'block';
    elements.progressMessage.textContent = mensaje;
    elements.progressBar.style.width = `${porcentaje}%`;
}

function mostrarError(mensaje) {
    Swal.fire({ icon: 'error', title: 'Error', text: mensaje });
}

function escapeHTML(text) {
    if (!text) return '';
    return String(text).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}