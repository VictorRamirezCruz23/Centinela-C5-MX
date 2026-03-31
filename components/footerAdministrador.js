// footer-component.js

class FooterComponent {
    constructor() {
        this.init();
    }

    // Inicializa el componente evitando duplicados
    init() {
        if (window.FooterComponentLoaded) return;
        window.FooterComponentLoaded = true;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    // Configuración principal del footer
    setup() {
        try {
            this.removeOriginalFooter();
            this.createFooter();
            this.updateDateTime();

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    // Remueve cualquier footer existente
    removeOriginalFooter() {
        const originalFooter = document.querySelector('footer');
        originalFooter?.remove();
    }

    // Crea el footer completo
    createFooter() {
        this.addStyles();
        this.insertHTML();
    }

    // Agrega estilos CSS para el footer
    addStyles() {
        if (document.getElementById('footer-component-styles')) return;

        const styles = `
            /* Footer fijo en la parte inferior */
            .footer-component {
                position: fixed;
                bottom: 0;
                left: 0;
                width: 100%;
                background-color: var(--color-bg-primary);
                color: var(--navbar-text);
                font-family: var(--font-family-primary);
                padding: 8px 0;
                font-size: 14px;
                box-shadow: 0 -2px 10px rgb(0, 0, 0);
                z-index: 900;
                border-top: 1px solid var(--color-border-light);
            }
            
            /* Efecto al hacer scroll */
            .footer-component.scrolled {
                background-color: var(--navbar-scrolled-bg);
                box-shadow: var(--navbar-scrolled-shadow);
            }
            
            /* Contenedor principal centrado */
            .footer-bottom-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 15px;
            }
            
            /* Layout principal: Logo | Copyright | Fecha/Hora */
            .footer-bottom-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                min-height: 35px;
            }
            
            /* Sección izquierda - Logo */
            .footer-left {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: 1;
                justify-content: flex-start;
            }
            
            /* Enlace del logo */
            .footer-logo-link {
                display: flex;
                align-items: center;
                gap: 6px;
                text-decoration: none;
                transition: var(--transition-default);
            }
            
            /* Logo */
            .footer-logo {
                height: 22px;
                width: auto;
                object-fit: contain;
            }
            
            /* Texto del logo */
            .footer-logo-text {
                color: var(--navbar-logo-text);
                font-weight: 500;
                font-size: 14px;
                white-space: nowrap;
            }
            
            /* Sección central - Copyright */
            .footer-center {
                flex: 1;
                text-align: center;
                padding: 0 10px;
            }
            
            .copyright {
                color: var(--navbar-text);
                margin: 0;
                font-size: 14px;
                white-space: nowrap;
            }
            
            /* Sección derecha - Fecha y Hora */
            .footer-right {
                display: flex;
                align-items: center;
                flex: 1;
                justify-content: flex-end;
            }
            
            /* Contenedor para fecha y hora apilados */
            .datetime-container {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 2px;
            }
            
            /* Estilos para fecha y hora */
            .date-display, .time-display {
                white-space: nowrap;
                color: var(--navbar-text);
                font-size: 14px;
            }
            
            /* Hora con estilo de reloj digital */
            .time-display {
                font-weight: 600;
                font-family: 'Courier New', monospace;
            }
            
            /* Ajuste del body para espacio del footer fijo */
            body {
                padding-bottom: 50px !important;
            }
            
            /* === RESPONSIVE PARA TABLET === */
            @media (max-width: 768px) {
                .footer-component { padding: 6px 0; }
                .footer-bottom-content { flex-wrap: wrap; gap: 6px; }
                .footer-left { width: 30%; }
                .footer-center { width: 40%; order: 2; }
                .footer-right { width: 30%; }
                .footer-logo { height: 20px; }
                .footer-logo-text, .copyright, .date-display, .time-display { font-size: 12px; }
                body { padding-bottom: 40px !important; }
            }
            
            /* === RESPONSIVE PARA MÓVIL === */
            @media (max-width: 480px) {
                .footer-component { padding: 5px 0; font-size: 11px; }
                .footer-bottom-content { gap: 4px; min-height: 25px; }
                .footer-left { order: 1; width: 30%; }
                .footer-center { order: 3; width: 100%; margin-top: 3px; }
                .footer-right { order: 2; width: 40%; }
                .footer-logo { height: 18px; }
                .footer-logo-text { font-size: 11px; }
                .copyright { font-size: 11px; }
                .date-display, .time-display { font-size: 11px; }
                body { padding-bottom: 35px !important; }
            }
            
            /* === RESPONSIVE PARA MÓVIL PEQUEÑO === */
            @media (max-width: 320px) {
                .footer-component { padding: 4px 0; }
                .footer-left { width: 25%; }
                .footer-right { width: 45%; }
                .footer-logo-text { display: none; }
                .copyright { font-size: 9px; }
                .date-display { font-size: 9px; }
                .time-display { font-size: 10px; }
                body { padding-bottom: 30px !important; }
            }
            
            /* Garantizar visibilidad de fecha y hora */
            #currentDate, #currentTime {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'footer-component-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }

    // Inserta la estructura HTML del footer
    insertHTML() {
        const footer = document.createElement('footer');
        footer.className = 'footer-component';
        footer.innerHTML = `
            <div class="footer-bottom-container">
                <div class="footer-bottom-content">
                    <!-- Logo y nombre de la empresa -->
                    <div class="footer-left">
                        <a href="https://rsienterprise.web.app/" target="_blank" rel="noopener noreferrer" class="footer-logo-link">
                            <img src="/assets/images/logoApp.png" alt="Centinela Logo" class="footer-logo">
                            <span class="footer-logo-text">RSI Enterprise</span>
                        </a>
                    </div>
                    
                    <!-- Información de copyright -->
                    <div class="footer-center">
                        <p class="copyright">
                            © ${new Date().getFullYear()} RSI Enterprise. Todos los derechos reservados.
                        </p>
                    </div>
                    
                    <!-- Fecha y hora en tiempo real -->
                    <div class="footer-right">
                        <div class="datetime-container">
                            <div id="currentDate" class="date-display"></div>
                            <div id="currentTime" class="time-display"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(footer);
        this.setupScrollEffect();
    }

    // Configura efecto visual al hacer scroll
    setupScrollEffect() {
        const footer = document.querySelector('.footer-component');
        if (!footer) return;

        window.addEventListener('scroll', () => {
            footer.classList.toggle('scrolled', window.scrollY > 50);
        });
    }

    // Formatea la fecha completa
    formatDate(date) {
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'America/Mexico_City'
        };
        return date.toLocaleDateString('es-MX', options);
    }

    // Formatea fecha muy corta (para móviles pequeños)
    formatVeryShortDate(date) {
        const options = {
            weekday: 'narrow',
            day: 'numeric',
            month: 'short',
            year: '2-digit',
            timeZone: 'America/Mexico_City'
        };
        return date.toLocaleDateString('es-MX', options);
    }

    // Formatea hora completa con segundos
    formatTime(date) {
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        };
        return date.toLocaleTimeString('es-MX', options);
    }

    // Formatea hora sin segundos (para pantallas pequeñas)
    formatShortTime(date) {
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Mexico_City'
        };
        return date.toLocaleTimeString('es-MX', options);
    }

    // Actualiza fecha y hora en tiempo real
    updateDateTime() {
        const dateElement = document.getElementById('currentDate');
        const timeElement = document.getElementById('currentTime');

        if (!dateElement || !timeElement) return;

        const update = () => {
            const now = new Date();
            const width = window.innerWidth;

            // Formato responsive según tamaño de pantalla
            if (width <= 320) {
                // Móvil muy pequeño: formato compacto
                dateElement.textContent = this.formatVeryShortDate(now);
                timeElement.textContent = this.formatShortTime(now);
            } else if (width <= 480) {
                // Móvil: fecha normal, hora sin segundos
                dateElement.textContent = this.formatDate(now);
                timeElement.textContent = this.formatShortTime(now);
            } else if (width <= 768) {
                // Tablet: igual que móvil
                dateElement.textContent = this.formatDate(now);
                timeElement.textContent = this.formatShortTime(now);
            } else {
                // Desktop: formato completo
                dateElement.textContent = this.formatDate(now);
                timeElement.textContent = this.formatTime(now);
            }

            // Asegurar visibilidad
            dateElement.style.display = 'block';
            dateElement.style.visibility = 'visible';
            timeElement.style.display = 'block';
            timeElement.style.visibility = 'visible';
        };

        update(); // Actualizar inmediatamente
        setInterval(update, 1000); // Actualizar cada segundo
        window.addEventListener('resize', update); // Actualizar al cambiar tamaño
    }
}

// Inicializa automáticamente al cargar
new FooterComponent();