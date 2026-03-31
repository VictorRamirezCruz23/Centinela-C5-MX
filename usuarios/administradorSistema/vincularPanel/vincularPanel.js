import { CuentaPM } from '/clases/cuentaPM.js';
import { CLOUD_FUNCTION_BASE_URL} from '/config/urlCloudFunction.js';

const FUNCTION_URL = `${CLOUD_FUNCTION_BASE_URL}proxyPowerManage`;
const EMAIL_RSI = "soportetecnico@rhafasoluciones.com"; // Email de tu cuenta Master

document.addEventListener('DOMContentLoaded', async () => {
    const panelsGrid = document.getElementById('panelsGrid');
    const form = document.getElementById('panelLinkForm');

    // 1. OBTENER LISTA DE PANELES DE LA API
    try {
        const cuenta = await CuentaPM.obtenerPorId(EMAIL_RSI);
        if (!cuenta || !cuenta.userToken) throw new Error("No hay un User-Token válido");

        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'listarPaneles', 
                user_token: cuenta.userToken 
            })
        });

        const paneles = await response.json();
        panelsGrid.innerHTML = '';

        if (!paneles || paneles.length === 0) {
            panelsGrid.innerHTML = '<div class="message-container info">No hay paneles pendientes en el servidor.</div>';
            return;
        }

        // Crear botones de selección para cada panel
        paneles.forEach(p => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'form-input-field panel-select-btn';
            btn.innerHTML = `<i class="fas fa-microchip"></i> ${p.alias || 'Sin Alias'} — <strong>${p.panel_serial}</strong>`;
            
            btn.onclick = () => {
                // Marcar seleccionado visualmente
                document.querySelectorAll('.panel-select-btn').forEach(b => b.style.borderColor = '');
                btn.style.borderColor = 'var(--color-accent-primary)';
                
                // Llenar formulario
                document.getElementById('panelSerial').value = p.panel_serial;
                document.getElementById('panelAlias').value = p.alias || '';
                form.style.display = 'block';
                form.scrollIntoView({ behavior: 'smooth' });
            };
            panelsGrid.appendChild(btn);
        });

    } catch (error) {
        console.error(error);
        panelsGrid.innerHTML = `<div class="message-container error">Error: ${error.message}</div>`;
    }

    // 2. ENVIAR FORMULARIO DE VINCULACIÓN FINAL
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cuenta = await CuentaPM.obtenerPorId(EMAIL_RSI);

        const panelData = {
            alias: document.getElementById('panelAlias').value.trim(),
            panel_serial: document.getElementById('panelSerial').value.trim(),
            master_user_code: document.getElementById('masterCode').value.trim(),
            access_proof: EMAIL_RSI //
        };

        if (!panelData.masterCode) return Swal.fire("Aviso", "Ingresa el código maestro", "warning");

        Swal.fire({ title: 'Vinculando panel...', didOpen: () => Swal.showLoading() });

        try {
            const res = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'vincularPanel', 
                    user_token: cuenta.userToken,
                    panel_data: panelData 
                })
            });

            if (res.ok) {
                await Swal.fire("Éxito", "El panel ha sido vinculado correctamente", "success");
                window.location.href = "/usuarios/administrador/usuarios/usuarios.html";
            } else {
                const errData = await res.json();
                throw new Error(errData.error_message || "Error al vincular");
            }
        } catch (e) {
            Swal.fire("Error", e.message, "error");
        }
    });
});