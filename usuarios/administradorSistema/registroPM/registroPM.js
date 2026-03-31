// ==================== IMPORTS ====================
import { CuentaPM } from '/clases/cuentaPM.js';
import { CLOUD_FUNCTION_BASE_URL, ACTIONS } from '/config/urlCloudFunction.js';

// Nombre de la Cloud Function específica
const POWER_MANAGE_FUNCTION = 'proxyPowerManage';

// Variables para almacenar datos temporales
let tempEmail = null;
let tempResetCode = null;

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }
    
    initPMForm();
});

function initPMForm() {
    const elements = obtenerElementosDOM();
    if (!elements) return;
    
    configurarEventos(elements);
}

function obtenerElementosDOM() {
    try {
        return {
            form: document.getElementById('pmRegisterForm'),
            btnSendCode: document.getElementById('btnSendCode'),
            btnVerifyCode: document.getElementById('btnVerifyCode'),
            btnSetPassword: document.getElementById('btnSetPassword'),
            step1: document.getElementById('step1'),
            step2: document.getElementById('step2'),
            step3: document.getElementById('step3'),
            inputEmail: document.getElementById('pmEmail'),
            inputCode: document.getElementById('pmCode'),
            inputPassword: document.getElementById('newPassword'),
            inputConfirmPassword: document.getElementById('confirmPassword')
        };
    } catch (error) {
        console.error('❌ Error obteniendo elementos DOM:', error);
        return null;
    }
}

function configurarEventos(elements) {
    if (!elements.btnSendCode || !elements.btnVerifyCode || !elements.btnSetPassword) return;
    
    // PASO 1: Solicitar código
    elements.btnSendCode.addEventListener('click', async () => {
        await solicitarCodigo(elements);
    });
    
    // Permitir Enter en el email
    elements.inputEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.btnSendCode.click();
        }
    });
    
    // PASO 2: Verificar código
    elements.btnVerifyCode.addEventListener('click', async () => {
        await verificarCodigo(elements);
    });
    
    // Permitir Enter en el código
    elements.inputCode.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.btnVerifyCode.click();
        }
    });
    
    // PASO 3: Establecer contraseña
    elements.btnSetPassword.addEventListener('click', async (e) => {
        e.preventDefault();
        await establecerContraseña(elements);
    });
    
    // Auto mayúsculas para el código
    if (elements.inputCode) {
        elements.inputCode.addEventListener('input', function() {
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }
}

// ========== FUNCIÓN PARA VERIFICAR EMAIL DUPLICADO ==========
async function verificarEmailExistente(email) {
    try {
        const existe = await CuentaPM.existe(email);
        
        if (existe) {
            const cuenta = await CuentaPM.obtenerPorId(email);
            return {
                existe: true,
                status: cuenta?.status || 'desconocido'
            };
        }
        
        return { existe: false };
        
    } catch (error) {
        console.error('❌ Error verificando email:', error);
        throw new Error('Error al verificar disponibilidad del email');
    }
}

function getFunctionUrl() {
    return `${CLOUD_FUNCTION_BASE_URL}${POWER_MANAGE_FUNCTION}`;
}

// ========== PASO 1: SOLICITAR CÓDIGO ==========
async function solicitarCodigo(elements) {
    const email = elements.inputEmail.value.trim();
    
    if (!email) {
        Swal.fire({
            icon: 'error',
            title: 'Email requerido',
            text: 'Ingresa un email corporativo válido',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Email inválido',
            text: 'El formato del email no es válido',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    Swal.fire({
        title: 'Verificando email...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        // Verificar si el email ya existe
        const verificado = await verificarEmailExistente(email);
        
        if (verificado.existe) {
            Swal.close();
            
            let mensaje = '';
            if (verificado.status === 'activa') {
                mensaje = 'Esta cuenta de monitoreo ya está activa.';
            } else if (verificado.status === 'pendiente') {
                mensaje = 'Ya existe un registro pendiente para este email. Si no recibiste el código, contacta a soporte.';
            } else {
                mensaje = 'Este email ya está registrado en el sistema.';
            }
            
            Swal.fire({
                icon: 'warning',
                title: 'Email no disponible',
                html: `
                    <div style="text-align: center;">
                        <p>${mensaje}</p>
                        <p style="margin-top: 15px; font-size: 0.9rem; color: var(--color-text-secondary);">
                            <strong>Email:</strong> ${email}
                        </p>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO'
            });
            return;
        }
        
        // Si no existe, solicitar código
        Swal.fire({
            title: 'Enviando código...',
            text: 'Por favor espera',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const url = getFunctionUrl();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: ACTIONS.SOLICITAR_CODIGO, 
                email: email 
            })
        });

        const resData = await response.json();
        
        Swal.close();
        
        if (response.ok) {
            tempEmail = email;
            
            await Swal.fire({
                icon: 'success',
                title: 'Código Enviado',
                html: `
                    <div style="text-align: center;">
                        <p>Se ha enviado un código de verificación a:</p>
                        <p><strong>${email}</strong></p>
                        <p style="margin-top: 15px; font-size: 0.9rem; color: var(--color-text-secondary);">
                            Revisa tu bandeja de entrada
                        </p>
                    </div>
                `,
                confirmButtonText: 'CONTINUAR'
            });
            
            elements.step1.style.display = 'none';
            elements.step2.style.display = 'block';
            
            setTimeout(() => elements.inputCode.focus(), 300);
            
        } else {
            throw new Error(resData.error_message || "Error al solicitar el código");
        }
        
    } catch (error) {
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message,
            confirmButtonText: 'REINTENTAR'
        });
    }
}

// ========== PASO 2: VERIFICAR CÓDIGO ==========
async function verificarCodigo(elements) {
    const email = tempEmail || elements.inputEmail.value.trim();
    const code = elements.inputCode.value.trim();
    
    if (!email || !code) {
        Swal.fire({
            icon: 'error',
            title: 'Campos incompletos',
            text: 'Debes ingresar el código de verificación',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    if (code.length < 6) {
        Swal.fire({
            icon: 'error',
            title: 'Código inválido',
            text: 'El código debe tener al menos 6 caracteres',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }

    Swal.fire({
        title: 'Verificando código...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // Crear instancia de CuentaPM temporal
        const cuenta = new CuentaPM(email);
        
        const url = getFunctionUrl();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: ACTIONS.COMPLETAR_REGISTRO, 
                email_code: code,
                app_id: cuenta.appId 
            })
        });

        const resData = await response.json();
        
        if (!response.ok) {
            throw new Error(resData.error_message || "Código inválido o expirado");
        }

        // Guardar el reset_password_code para el paso 3
        tempResetCode = resData.reset_password_code;
        
        // Guardar datos temporales en la cuenta
        cuenta.userToken = resData.user_token;
        cuenta.status = 'pendiente'; // Pendiente hasta establecer contraseña
        
        // Guardar en Firestore
        await cuenta.guardarEnFirebase();

        Swal.close();
        
        await Swal.fire({
            icon: 'success',
            title: 'Código verificado',
            html: `
                <div style="text-align: center;">
                    <p>¡Código verificado correctamente!</p>
                    <p style="margin-top: 10px; font-size: 0.9rem;">Ahora establece tu contraseña</p>
                </div>
            `,
            confirmButtonText: 'CONTINUAR'
        });
        
        elements.step2.style.display = 'none';
        elements.step3.style.display = 'block';
        
        setTimeout(() => elements.inputPassword.focus(), 300);
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error verificando código:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error de verificación',
            text: error.message,
            confirmButtonText: 'REINTENTAR'
        });
    }
}

// ========== PASO 3: ESTABLECER CONTRASEÑA ==========
async function establecerContraseña(elements) {
    const password = elements.inputPassword.value.trim();
    const confirmPassword = elements.inputConfirmPassword.value.trim();
    
    if (!password || !confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Contraseña requerida',
            text: 'Debes establecer una contraseña',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    if (password.length < 8) {
        Swal.fire({
            icon: 'error',
            title: 'Contraseña débil',
            text: 'La contraseña debe tener al menos 8 caracteres',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    if (password !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Contraseñas no coinciden',
            text: 'Las contraseñas ingresadas no son iguales',
            confirmButtonText: 'ENTENDIDO'
        });
        return;
    }
    
    if (!tempResetCode) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No hay un código de recuperación válido. Por favor reinicia el proceso.',
            confirmButtonText: 'REINTENTAR'
        });
        return;
    }

    Swal.fire({
        title: 'Estableciendo contraseña...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const url = getFunctionUrl();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'establecerContraseña',
                reset_password_code: tempResetCode,
                new_password: password,
                app_id: new CuentaPM(tempEmail).appId
            })
        });

        const resData = await response.json();
        
        if (!response.ok) {
            throw new Error(resData.error_message || "Error al establecer la contraseña");
        }
        
        // Actualizar la cuenta en Firestore
        const cuenta = await CuentaPM.obtenerPorId(tempEmail);
        if (cuenta) {
            cuenta.status = 'activa';
            await cuenta.guardarEnFirebase();
        }

        Swal.close();
        
        await Swal.fire({
            icon: 'success',
            title: '¡Registro completado!',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #28a745;"></i>
                    <p style="margin-top: 10px;">Cuenta de monitoreo creada correctamente</p>
                    <p style="margin-top: 10px; font-size: 0.85rem;">
                        <strong>Email:</strong> ${tempEmail}
                    </p>
                    <p style="font-size: 0.8rem; color: var(--color-text-secondary);">
                        Ya puedes iniciar sesión en Power Manage con tus credenciales
                    </p>
                </div>
            `,
            confirmButtonText: 'IR A GESTIÓN'
        });
        
        window.location.href = "../cuentasPM/cuentasPM.html";
        
    } catch (error) {
        Swal.close();
        console.error('❌ Error estableciendo contraseña:', error);
        
        Swal.fire({
            icon: 'error',
            title: 'Error al establecer contraseña',
            text: error.message,
            confirmButtonText: 'REINTENTAR'
        });
    }
}

// ========== EXPORT ==========
export { initPMForm };