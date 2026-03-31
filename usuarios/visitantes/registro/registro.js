// ARCHIVO JS PARA REGISTRO DE ADMINISTRADOR - VERSIÓN CORREGIDA (SWEETALERT2 PARA FOTOS)
// CON CAMPO TELÉFONO - SOLO NÚMEROS

// Importar las clases correctamente desde user.js
import { UserManager } from '/clases/user.js';

// ==================== VARIABLES GLOBALES ====================
let profileImageBase64 = null;
let orgImageBase64 = null;
let selectedFile = null;
let currentPhotoType = '';

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', function () {
    if (typeof Swal === 'undefined') {
        console.error('❌ SweetAlert2 no está cargado.');
        return;
    }

    initRegistrationForm();
});

async function initRegistrationForm() {
    console.log('🚀 Iniciando formulario de registro de administrador...');

    // Obtener elementos del DOM
    const elements = obtenerElementosDOM();
    if (!elements) return;

    // Configurar filtro de solo números para teléfono
    configurarFiltroNumerico(elements);

    // Instanciar UserManager
    const userManager = new UserManager();
    console.log('✅ UserManager inicializado');

    // Configurar handlers
    configurarHandlers(elements, userManager);

    // Mostrar mensaje inicial
    mostrarMensajeInicial(elements.mainMessage);

    console.log('✅ Formulario de administrador inicializado correctamente');
}

// ========== FUNCIÓN PARA FILTRAR SOLO NÚMEROS ==========
function configurarFiltroNumerico(elements) {
    if (elements.telefono) {
        elements.telefono.addEventListener('input', function (e) {
            // Eliminar cualquier carácter que no sea número
            this.value = this.value.replace(/[^0-9]/g, '');

            // Validar longitud máxima (15 dígitos)
            if (this.value.length > 15) {
                this.value = this.value.slice(0, 15);
            }
        });

        // Prevenir pegado de texto con caracteres no numéricos
        elements.telefono.addEventListener('paste', function (e) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const numericOnly = pastedText.replace(/[^0-9]/g, '');
            if (numericOnly) {
                this.value = numericOnly.slice(0, 15);
                // Disparar evento input para actualizar validación
                const inputEvent = new Event('input', { bubbles: true });
                this.dispatchEvent(inputEvent);
            }
        });

        // Prevenir entrada de caracteres no numéricos en tiempo real
        elements.telefono.addEventListener('keypress', function (e) {
            const key = e.key;
            // Permitir teclas de control (backspace, delete, tab, etc.)
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (key === 'Backspace' || key === 'Delete' || key === 'Tab' || key === 'ArrowLeft' || key === 'ArrowRight') return;

            // Solo permitir números
            if (!/^[0-9]$/.test(key)) {
                e.preventDefault();
            }
        });
    }
}

// ========== FUNCIONES DE UTILIDAD ==========

function obtenerElementosDOM() {
    try {
        return {
            // Fotos
            profileCircle: document.getElementById('profileCircle'),
            profilePlaceholder: document.getElementById('profilePlaceholder'),
            profileImage: document.getElementById('profileImage'),
            editProfileOverlay: document.getElementById('editProfileOverlay'),
            profileInput: document.getElementById('profile-input'),

            // Logo de organización
            orgCircle: document.getElementById('orgCircle'),
            orgPlaceholder: document.getElementById('orgPlaceholder'),
            orgImage: document.getElementById('orgImage'),
            editOrgOverlay: document.getElementById('editOrgOverlay'),
            orgInput: document.getElementById('org-input'),

            // Campos del formulario
            organization: document.getElementById('organization'),
            fullName: document.getElementById('fullName'),
            email: document.getElementById('email'),
            telefono: document.getElementById('telefono'), // Campo numérico
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirmPassword'),

            // Botones y mensajes
            registerBtn: document.getElementById('registerBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            mainMessage: document.getElementById('mainMessage'),
            registerForm: document.getElementById('registerForm'),

            // Toggle de contraseñas
            togglePasswordBtns: document.querySelectorAll('.toggle-password')
        };
    } catch (error) {
        console.error('❌ Error obteniendo elementos DOM:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de configuración',
            text: 'No se pudieron cargar los elementos del formulario.'
        });
        return null;
    }
}

function mostrarMensajeInicial(element) {
    if (!element) return;

    element.innerHTML = `
        <div class="message-container info" style="display: block;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="fas fa-user-shield"></i>
                <strong>REGISTRO DE ADMINISTRADOR</strong>
            </div>
            <p>Completa todos los campos para crear una nueva cuenta de administrador para tu organización.</p>
            <div style="margin-top: 8px; padding: 8px; background: var(--color-bg-secondary); border-radius: 4px; font-size: 0.85rem;">
                <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                Una vez registrado, podrás crear colaboradores para tu organización.
            </div>
        </div>
    `;
    element.style.display = 'block';
}

// ========== MANEJO DE IMÁGENES CON SWEETALERT2 ==========

function configurarHandlers(elements, userManager) {
    // Variable para controlar que no se procese el mismo archivo múltiples veces
    let procesandoFoto = false;

    // Foto de perfil
    if (elements.editProfileOverlay && elements.profileInput) {
        elements.editProfileOverlay.addEventListener('click', () => {
            elements.profileInput.value = ''; // Limpiar antes de abrir
            elements.profileInput.click();
        });

        elements.profileCircle.addEventListener('click', () => {
            elements.profileInput.value = ''; // Limpiar antes de abrir
            elements.profileInput.click();
        });

        elements.profileInput.addEventListener('change', (e) => {
            if (procesandoFoto) return;

            const file = e.target.files[0];
            if (!file) return;

            procesandoFoto = true;

            manejarSeleccionFoto(file, 'profile', elements)
                .finally(() => {
                    procesandoFoto = false;
                    elements.profileInput.value = ''; // Limpiar después de procesar
                });
        });
    }

    // Logo de organización
    if (elements.editOrgOverlay && elements.orgInput) {
        elements.editOrgOverlay.addEventListener('click', () => {
            elements.orgInput.value = ''; // Limpiar antes de abrir
            elements.orgInput.click();
        });

        elements.orgCircle.addEventListener('click', () => {
            elements.orgInput.value = ''; // Limpiar antes de abrir
            elements.orgInput.click();
        });

        elements.orgInput.addEventListener('change', (e) => {
            if (procesandoFoto) return;

            const file = e.target.files[0];
            if (!file) return;

            procesandoFoto = true;

            manejarSeleccionFoto(file, 'organization', elements)
                .finally(() => {
                    procesandoFoto = false;
                    elements.orgInput.value = ''; // Limpiar después de procesar
                });
        });
    }

    // Mostrar/ocultar contraseña
    if (elements.togglePasswordBtns) {
        elements.togglePasswordBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                const targetId = this.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = this.querySelector('i');

                if (input && icon) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                    icon.classList.toggle('fa-eye');
                    icon.classList.toggle('fa-eye-slash');
                }
            });
        });
    }

    // Validación en tiempo real
    configurarValidacionTiempoReal(elements);

    // Botón de registro
    if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', (e) => registrarAdministrador(e, elements, userManager));
    }

    // Botón cancelar
    if (elements.cancelBtn) {
        elements.cancelBtn.addEventListener('click', () => cancelarRegistro());
    }
}

async function manejarSeleccionFoto(file, type, elements) {
    // Validar archivo
    const maxSizeMB = type === 'profile' ? 5 : 10;
    if (!validarArchivo(file, maxSizeMB)) {
        return;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            const imageBase64 = e.target.result;
            const fileSizeKB = Math.round(file.size / 1024);

            Swal.fire({
                title: type === 'profile' ? 'Confirmar foto de perfil' : 'Confirmar logo de organización',
                html: `
                    <div style="text-align: center;">
                        <img src="${imageBase64}" 
                             style="width: 150px; height: 150px; border-radius: 50% ; object-fit: cover; border: 3px solid var(--color-accent-primary); margin: 10px auto 15px auto; display: block;">
                        <p><strong>Tamaño:</strong> ${fileSizeKB} KB</p>
                        <p>¿Deseas usar esta imagen?</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'CONFIRMAR',
                cancelButtonText: 'CANCELAR',
                allowOutsideClick: false
            }).then((result) => {
                if (result.isConfirmed) {
                    if (type === 'profile') {
                        // Actualizar foto de perfil
                        if (elements.profilePlaceholder && elements.profileImage) {
                            elements.profilePlaceholder.style.display = 'none';
                            elements.profileImage.src = imageBase64;
                            elements.profileImage.style.display = 'block';
                            profileImageBase64 = imageBase64;
                        }
                    } else {
                        // Actualizar logo de organización
                        if (elements.orgPlaceholder && elements.orgImage) {
                            elements.orgPlaceholder.style.display = 'none';
                            elements.orgImage.src = imageBase64;
                            elements.orgImage.style.display = 'block';
                            orgImageBase64 = imageBase64;
                        }
                    }

                    Swal.fire({
                        icon: 'success',
                        title: '¡Imagen guardada!',
                        text: type === 'profile' ? 'Tu foto de perfil se ha guardado correctamente' : 'El logo de organización se ha guardado correctamente',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
                resolve();
            });
        };

        reader.readAsDataURL(file);
    });
}

function validarArchivo(file, maxSizeMB) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = maxSizeMB * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
        Swal.fire({
            icon: 'error',
            title: 'Formato no válido',
            text: 'Solo se permiten archivos JPG, PNG, GIF o WebP',
            confirmButtonText: 'ENTENDIDO'
        });
        return false;
    }

    if (file.size > maxSize) {
        Swal.fire({
            icon: 'error',
            title: 'Archivo demasiado grande',
            text: `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`,
            confirmButtonText: 'ENTENDIDO'
        });
        return false;
    }

    return true;
}

// ========== VALIDACIÓN ==========

function configurarValidacionTiempoReal(elements) {
    // Validar teléfono en tiempo real (solo números)
    if (elements.telefono) {
        elements.telefono.addEventListener('input', function () {
            if (this.value) {
                // Validar que solo tenga números y longitud adecuada
                const isValid = /^[0-9]{8,15}$/.test(this.value);
                this.style.borderColor = isValid ? '#28a745' : '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }

    // Validar coincidencia de contraseñas
    if (elements.confirmPassword) {
        elements.confirmPassword.addEventListener('input', function () {
            if (elements.password.value && this.value) {
                this.style.borderColor = elements.password.value === this.value ? '#28a745' : '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }

    // Validar email
    if (elements.email) {
        elements.email.addEventListener('blur', function () {
            if (this.value) {
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
                this.style.borderColor = isValid ? '#28a745' : '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }

    // Validar organización en tiempo real
    if (elements.organization) {
        elements.organization.addEventListener('blur', function () {
            if (this.value && this.value.trim().length >= 3) {
                this.style.borderColor = '#28a745';
            } else if (this.value) {
                this.style.borderColor = '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }
}

function validarFormulario(elements) {
    const errores = [];

    // Organización (con validación de nombre)
    if (!elements.organization.value.trim()) {
        errores.push('El nombre de la organización es obligatorio');
    } else if (elements.organization.value.trim().length < 3) {
        errores.push('El nombre de la organización debe tener al menos 3 caracteres');
    }

    // Nombre completo
    if (!elements.fullName.value.trim()) {
        errores.push('El nombre completo es obligatorio');
    } else if (elements.fullName.value.trim().length < 5) {
        errores.push('El nombre completo debe tener al menos 5 caracteres');
    }

    // Email
    if (!elements.email.value.trim()) {
        errores.push('El correo electrónico es obligatorio');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(elements.email.value)) {
        errores.push('El correo electrónico no es válido');
    }

    // Teléfono (validación: solo números, entre 8 y 15 dígitos)
    if (elements.telefono && elements.telefono.value.trim()) {
        if (!/^[0-9]{8,15}$/.test(elements.telefono.value.trim())) {
            errores.push('El teléfono debe contener solo números y tener entre 8 y 15 dígitos');
        }
    }

    // Contraseña
    if (!elements.password.value) {
        errores.push('La contraseña es obligatoria');
    } else if (!validarContrasena(elements.password.value)) {
        errores.push('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial');
    }

    // Confirmar contraseña
    if (!elements.confirmPassword.value) {
        errores.push('Debes confirmar la contraseña');
    } else if (elements.password.value !== elements.confirmPassword.value) {
        errores.push('Las contraseñas no coinciden');
    }

    return errores;
}

function validarContrasena(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength &&
        hasUpperCase &&
        hasLowerCase &&
        hasNumber &&
        hasSpecialChar;
}

function convertToCamelCase(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}

// ========== VALIDACIÓN DE ORGANIZACIÓN EXISTENTE ==========

async function verificarOrganizacionExistente(nombreOrganizacion, userManager) {
    try {
        console.log('🔍 Verificando si la organización ya existe:', nombreOrganizacion);

        // Convertir a diferentes formatos para comparación
        const nombreNormalizado = nombreOrganizacion.toLowerCase().trim();
        const nombreCamelCase = convertToCamelCase(nombreOrganizacion);

        // Obtener todas las organizaciones usando el método existente en UserManager
        const organizaciones = await userManager.getTodasLasOrganizaciones();

        // Buscar si alguna organización coincide con el nombre
        for (const organizacion of organizaciones) {
            // Comparar nombre normalizado (case-insensitive)
            if (organizacion.nombre.toLowerCase() === nombreNormalizado) {
                console.log('❌ Organización encontrada:', organizacion.nombre);
                return true;
            }

            // También verificar camelCase
            if (organizacion.camelCase === nombreCamelCase) {
                console.log('❌ Organización encontrada (camelCase):', nombreCamelCase);
                return true;
            }
        }

        console.log('✅ Organización disponible');
        return false;

    } catch (error) {
        console.error('❌ Error verificando organización:', error);

        // Si hay error de Firebase (conexión, permisos, etc.)
        if (error.code === 'permission-denied' || error.code === 'unavailable') {
            console.warn('⚠️ Error de acceso a Firestore. Continuando con validación básica...');

            // Mostrar advertencia al usuario
            await Swal.fire({
                icon: 'warning',
                title: 'Advertencia de conexión',
                html: `
                    <div style="text-align: left;">
                        <p>No se pudo verificar completamente si la organización ya existe.</p>
                        <p style="color: #ff9800; margin-top: 10px;">
                            <i class="fas fa-exclamation-triangle"></i> El sistema continuará con el registro.
                        </p>
                        <p style="font-size: 0.9rem; margin-top: 10px;">
                            Si la organización ya existe, el sistema lo detectará durante el proceso de registro.
                        </p>
                    </div>
                `,
                confirmButtonText: 'CONTINUAR'
            });

            // Permitir el registro - Firebase Auth detectará duplicados durante el proceso
            return false;
        }

        // Para otros errores, permitir el registro y confiar en que Firebase Auth lo manejará
        return false;
    }
}

// ========== REGISTRO DE ADMINISTRADOR ==========

async function registrarAdministrador(event, elements, userManager) {
    event.preventDefault();

    // Deshabilitar botón para evitar doble clic
    if (elements.registerBtn) {
        elements.registerBtn.disabled = true;
        elements.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    }

    // Validar formulario
    const errores = validarFormulario(elements);
    if (errores.length > 0) {
        Swal.fire({
            icon: 'error',
            title: 'Error de validación',
            html: errores.map(msg => `• ${msg}`).join('<br>'),
            confirmButtonText: 'CORREGIR'
        });

        // Rehabilitar botón
        if (elements.registerBtn) {
            elements.registerBtn.disabled = false;
            elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> REGISTRARSE';
        }
        return;
    }

    const nombreOrganizacion = elements.organization.value.trim();

    try {
        // Verificar si la organización ya existe (con loader)
        Swal.fire({
            title: 'Verificando organización...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const organizacionExiste = await verificarOrganizacionExistente(nombreOrganizacion, userManager);

        Swal.close();

        if (organizacionExiste) {
            Swal.fire({
                icon: 'error',
                title: 'Organización ya registrada',
                html: `
                    <div style="text-align: left;">
                        <p>La organización <strong>"${nombreOrganizacion}"</strong> ya está registrada en el sistema.</p>
                        <p style="color: #ff9800; margin-top: 10px;">
                            <i class="fas fa-exclamation-triangle"></i> Por favor, utiliza un nombre diferente para tu organización.
                        </p>
                        <div style="background: var(--color-bg-secondary); padding: 10px; border-radius: 5px; margin-top: 15px;">
                            <p style="font-size: 0.9rem;"><strong>Tip:</strong> Puedes añadir tu nombre, apellido o ubicación para hacerlo único.</p>
                            <p style="font-size: 0.9rem;">Ejemplo: "${nombreOrganizacion} México", "${nombreOrganizacion} Tech", etc.</p>
                        </div>
                    </div>
                `,
                confirmButtonText: 'ENTENDIDO'
            });

            // Resaltar campo de organización
            if (elements.organization) {
                elements.organization.style.borderColor = '#dc3545';
                elements.organization.focus();
            }

            // Rehabilitar botón
            if (elements.registerBtn) {
                elements.registerBtn.disabled = false;
                elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> REGISTRARSE';
            }
            return;
        }

        // Mostrar confirmación final
        const confirmResult = await Swal.fire({
            title: 'Crear cuenta de administrador',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <p><strong>Organización:</strong> ${nombreOrganizacion}</p>
                    <p><strong>Nombre:</strong> ${elements.fullName.value.trim()}</p>
                    <p><strong>Email:</strong> ${elements.email.value.trim()}</p>
                    <p><strong>Teléfono:</strong> ${elements.telefono?.value.trim() || 'No especificado'}</p>
                    <p><strong>Rol:</strong> ADMINISTRADOR PRINCIPAL</p>
                    <p style="color: #ff9800; margin-top: 15px;">
                        <i class="fas fa-exclamation-triangle"></i> Se enviará un correo de verificación.
                    </p>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'CONFIRMAR',
            cancelButtonText: 'CANCELAR',
            allowOutsideClick: false
        });

        if (!confirmResult.isConfirmed) {
            // Rehabilitar botón si cancela
            if (elements.registerBtn) {
                elements.registerBtn.disabled = false;
                elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> REGISTRARSE';
            }
            return;
        }

        // Mostrar loader de creación
        Swal.fire({
            title: 'Creando cuenta de administrador...',
            text: 'Esto puede tomar unos segundos. Por favor espera...',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Crear objeto de datos para el administrador
        const organizacionCamelCase = convertToCamelCase(nombreOrganizacion);

        const adminData = {
            organizacion: nombreOrganizacion,
            organizacionCamelCase: organizacionCamelCase,
            nombreCompleto: elements.fullName.value.trim(),
            correoElectronico: elements.email.value.trim(),
            telefono: elements.telefono?.value.trim() || '', // Solo números
            fotoUsuario: profileImageBase64,
            fotoOrganizacion: orgImageBase64,
            rol: 'administrador',
            cargo: null,
            status: true,
            theme: 'Predeterminado',
            plan: 'gratis',
            fechaCreacion: new Date()
        };

        console.log('📝 Datos del administrador a crear:', {
            organizacion: adminData.organizacion,
            nombre: adminData.nombreCompleto,
            email: adminData.correoElectronico,
            telefono: adminData.telefono,
            rol: adminData.rol,
            cargo: adminData.cargo,
            camelCase: adminData.organizacionCamelCase
        });

        // Registrar administrador usando UserManager
        const resultado = await userManager.createAdministrador(
            adminData,
            elements.password.value
        );

        console.log('✅ Administrador creado exitosamente:', resultado);

        // Cerrar loader
        Swal.close();

        // Mostrar éxito con instrucciones
        await mostrarExitoRegistro(adminData);

    } catch (error) {
        console.error('❌ Error creando administrador:', error);
        Swal.close();
        manejarErrorRegistro(error);

        // Rehabilitar botón
        if (elements.registerBtn) {
            elements.registerBtn.disabled = false;
            elements.registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> REGISTRARSE';
        }
    }
}

async function mostrarExitoRegistro(adminData) {
    const result = await Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        html: `
            <div style="text-align: center;">
                <p><strong>Organización:</strong> ${adminData.organizacion}</p>
                <p><strong>Administrador:</strong> ${adminData.nombreCompleto}</p>
                <p><strong>Email:</strong> ${adminData.correoElectronico}</p>
                <p><strong>Teléfono:</strong> ${adminData.telefono || 'No especificado'}</p>
                <p><strong>Rol:</strong> ADMINISTRADOR PRINCIPAL</p>
                <p style="margin-top: 15px;"><i class="fas fa-envelope"></i> Se ha enviado un correo de verificación</p>
                <p>Debes verificar tu email antes de iniciar sesión.</p>
            </div>
        `,
        confirmButtonText: 'IR AL INICIO DE SESIÓN',
        allowOutsideClick: false
    }).then(() => {
        // Redirigir al login
        window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
    });
}

function manejarErrorRegistro(error) {
    let errorMessage = 'Ocurrió un error al crear la cuenta de administrador';
    let errorTitle = 'Error al crear cuenta';
    let errorDetails = error.message || '';

    // Manejar errores específicos
    if (error.code) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Este correo electrónico ya está registrado en el sistema.';
                errorTitle = 'Email en uso';
                break;
            case 'auth/invalid-email':
                errorMessage = 'El correo electrónico no es válido.';
                errorTitle = 'Email inválido';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'El registro por correo/contraseña no está habilitado. Contacta al administrador.';
                errorTitle = 'Registro deshabilitado';
                break;
            case 'auth/weak-password':
                errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 8 caracteres con mayúsculas, minúsculas, números y caracteres especiales.';
                errorTitle = 'Contraseña débil';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Error de conexión a internet. Verifica tu conexión e intenta nuevamente.';
                errorTitle = 'Error de conexión';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos fallidos. Por favor, intenta más tarde.';
                errorTitle = 'Demasiados intentos';
                break;
            default:
                if (error.message) {
                    // Errores personalizados
                    if (error.message.includes('organización') || error.message.includes('Organización')) {
                        errorMessage = error.message;
                        errorTitle = 'Error de organización';
                    } else if (error.message.includes('Firestore')) {
                        errorMessage = 'Error en la base de datos';
                        errorTitle = 'Error de base de datos';
                    }
                }
        }
    } else if (error.message) {
        // Errores personalizados
        if (error.message.includes('organización') || error.message.includes('Organización')) {
            errorMessage = error.message;
            errorTitle = 'Error de organización';
        } else if (error.message.includes('Ya existe')) {
            errorMessage = error.message;
            errorTitle = 'Registro duplicado';
        } else if (error.message.includes('Límite')) {
            errorMessage = error.message;
            errorTitle = 'Límite alcanzado';
        }
    }

    Swal.fire({
        icon: 'error',
        title: errorTitle,
        html: `
            <div style="text-align: left;">
                <p>${errorMessage}</p>
                ${errorDetails ? `<p style="color: #666; font-size: 0.9rem; margin-top: 10px;"><strong>Detalles:</strong> ${errorDetails}</p>` : ''}
                <p style="color: #ff9800; margin-top: 15px; font-size: 0.9rem;">
                    <i class="fas fa-exclamation-triangle"></i> Si el problema persiste, contacta al soporte técnico.
                </p>
            </div>
        `,
        confirmButtonText: 'ENTENDIDO',
        allowOutsideClick: true
    });
}

// ========== FUNCIONES AUXILIARES ==========

function cancelarRegistro() {
    Swal.fire({
        title: '¿Cancelar registro?',
        text: "Se perderán todos los datos ingresados",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'CONFIRMAR',
        cancelButtonText: 'CANCELAR'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/usuarios/visitantes/inicioSesion/inicioSesion.html';
        }
    });
}

// ========== EXPORT ==========
export { initRegistrationForm };