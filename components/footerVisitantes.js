// footer-component.js - Componente autónomo de footer (VERSIÓN SIMPLIFICADA)
(function () {
    'use strict';

    // Evitar carga duplicada
    if (window.FooterComponentLoaded) {
        return;
    }
    window.FooterComponentLoaded = true;

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    async function init() {
        try {
            removeOriginalFooter();
            await createFooterComponent();
            setupFooterFunctionalities();
        } catch (error) {
            console.error('❌ Error al inicializar footer:', error);
        }
    }

    function removeOriginalFooter() {
        const originalFooter = document.querySelector('footer');
        if (originalFooter) {
            originalFooter.remove();
        }
    }

    // Crear footer component
    async function createFooterComponent() {
        addFooterStyles();
        createFooterHTML();
    }

    function addFooterStyles() {
        const styleId = 'footer-component-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = /*css*/ `
            /* ====== ESTILOS DEL FOOTER ====== */
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            
            .footer-component {
                background-color: transparent;
                color: var(--footer-text-primary);
                width: 100%;
                font-family: var(--font-family-primary);
            }
            
            /* Contenido principal del footer */
            .footer-content {
                background-color: var(--footer-bg-primary);
                padding: 80px 0 40px;
            }
            
            .footer-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            /* Grid del footer */
            .footer-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 40px;
            }
            
            /* Columnas del footer */
            .footer-col h3 {
                font-size: 20px;
                margin-bottom: 25px;
                position: relative;
                padding-bottom: 10px;
                color: var(--footer-text-primary);
            }
            
            .footer-col h3::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 50px;
                height: 2px;
                background-color: var(--footer-border-accent);
            }
            
            /* Logo en el footer */
            .footer-logo {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .footer-logo-img {
                height: 40px;
            }
            
            .footer-logo span {
                font-weight: 700;
                font-size: 20px;
                color: var(--footer-text-primary);
            }

            /* Logo en el simple del footer*/
            .footer-logo-simple {
                display: flex;
                align-items: center;
                gap: 20px;
                margin-bottom: 5px;
            }
            
            .footer-logo-simple-img {
                height: 40px;
            }
            
            .footer-logo-simple span {
                color: var(--footer-text-secondary);
                text-decoration: none;
                font-size: 14px;
                transition: var(--transition-default);
            }
            
            /* Enlace del logo simple */
            .footer-logo-simple-link {
                display: flex;
                align-items: center;
                gap: 10px;
                text-decoration: none;
                transition: var(--transition-default);
            }
            
            .footer-logo-simple-link:hover {
                opacity: 0.8;
            }
            
            /* Texto "about" */
            .footer-about {
                margin-bottom: 20px;
                opacity: 0.8;
                font-size: 15px;
                line-height: 1.6;
                color: var(--footer-text-secondary);
            }
            
            /* Social icons */
            .footer-social {
                display: flex;
                gap: 15px;
                margin-top: 20px;
            }
            
            .footer-social a {
                width: 40px;
                height: 40px;
                background-color: var(--footer-social-bg);
                color: var(--footer-text-primary);
                border-radius: var(--border-radius-circle);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: var(--transition-default);
                text-decoration: none;
            }
            
            .footer-social a:hover {
                background-color: var(--footer-social-hover);
                color: var(--color-bg-primary);
                transform: translateY(-3px);
            }
            
            /* Links del footer */
            .footer-links {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .footer-links li {
                margin-bottom: 12px;
            }
            
            .footer-links a {
                color: var(--footer-text-secondary);
                text-decoration: none;
                transition: var(--transition-default);
                display: flex;
                align-items: center;
                font-size: 15px;
            }
            
            .footer-links a:hover {
                text-shadow: var(--footer-link-hover);
                padding-left: 5px;
            }
            
            .footer-links a i {
                margin-right: 8px;
                font-size: 12px;
                color: var(--footer-text-secondary);
            }
            
            /* Información de contacto */
            .footer-contact {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .footer-contact li {
                display: flex;
                align-items: flex-start;
                margin-bottom: 15px;
                font-size: 15px;
                line-height: 1.5;
                color: var(--footer-text-secondary);
            }
            
            .footer-contact i {
                margin-right: 15px;
                color: var(--color-icon-primary);
                font-size: 18px;
                margin-top: 3px;
                min-width: 20px;
            }
            
            .footer-contact span {
                flex: 1;
                opacity: 0.8;
                color: var(--footer-text-secondary);
            }
            
            /* Sección inferior del footer */
            .footer-bottom {
                background-color: var(--footer-bg-secondary);
                padding: 20px 0;
            }
            
            .footer-bottom-container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }
            
            .footer-bottom-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .copyright {
                font-size: 14px;
                opacity: 0.8;
                color: var(--footer-text-secondary);
            }
            
            .copyright a {
                color: var(--footer-text-primary);
                text-decoration: underline;
            }
            
            .copyright a:hover {
                text-shadow: var(--footer-link-hover);
            }
            
            .footer-legal {
                display: flex;
                gap: 20px;
            }
            
            .footer-legal a {
                color: var(--footer-text-secondary);
                text-decoration: none;
                font-size: 14px;
                transition: var(--transition-default);
            }
            
            .footer-legal a:hover {
                text-shadow: var(--footer-link-hover);
            }
            
            /* ====== RESPONSIVE ====== */
            @media (max-width: 768px) {
                .footer-content {
                    padding: 60px 0 30px;
                }
                
                .footer-grid {
                    gap: 30px;
                }
                
                .footer-bottom-content {
                    flex-direction: column;
                    text-align: center;
                    gap: 15px;
                }
                
                .footer-legal {
                    justify-content: center;
                }
            }
            
            @media (max-width: 480px) {
                .footer-content {
                    padding: 40px 0 20px;
                }
                
                .footer-grid {
                    grid-template-columns: 1fr;
                    gap: 25px;
                }
                
                .footer-col h3 {
                    font-size: 18px;
                    margin-bottom: 20px;
                }
                
                .footer-about {
                    font-size: 14px;
                }
                
                .footer-links a,
                .footer-contact li {
                    font-size: 14px;
                }
                
                .footer-contact i {
                    font-size: 16px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    function createFooterHTML() {
        const footer = document.createElement('footer');
        footer.className = 'footer-component';

        footer.innerHTML = /*html*/ `
        <div class="footer-content">
            <div class="footer-container">
                <div class="footer-grid">
                    <!-- Columna 1: Descripción -->
                    <div class="footer-col">
                        <div class="footer-logo">
                            <img src="/assets/images/logo.png" alt="Centinela Logo" class="footer-logo-img">
                            <span>CENTINELA</span>
                        </div>
                        <p class="footer-about">Líderes en soluciones de seguridad electrónica en México.</p>
                        <div class="footer-social">
                            <a href="#" target="_blank" title="Facebook">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                            <a href="#" target="_blank" title="Twitter">
                                <i class="fab fa-twitter"></i>
                            </a>
                            <a href="#" target="_blank" title="LinkedIn">
                                <i class="fab fa-linkedin-in"></i>
                            </a>
                        </div>
                    </div>
                    
                    <!-- Columna 2: Enlaces Rápidos -->
                    <div class="footer-col">
                        <h3>Enlaces Rápidos</h3>
                        <ul class="footer-links">
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Términos y Condiciones</a></li>
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Política de Privacidad</a></li>
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Política de Devoluciones</a></li>
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Proceso de facturación</a></li>
                        </ul>
                    </div>
                    
                    <!-- Columna 3: Servicios -->
                    <div class="footer-col">
                        <h3>Servicios</h3>
                        <ul class="footer-links">
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Seguridad electrónica</a></li>
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Multimedia</a></li>
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Desarrollo de Software</a></li>
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Acerca de nosotros</a></li>
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Contacto</a></li>
                            <li><a href="#"><i class="fas fa-chevron-right"></i> Únete a RSI</a></li>
                        </ul>
                    </div>
                    
                    <!-- Columna 4: Contacto -->
                    <div class="footer-col">
                        <h3>Contacto</h3>
                        <ul class="footer-contact">
                            <li>
                                <i class="fas fa-map-marker-alt"></i>
                                <span>Calle 31 #110, Col. El Sol, Nezahualcóyotl, Méx</span>
                            </li>
                            <li>
                                <i class="fas fa-phone-alt"></i>
                                <span>55 7690 8248</span>
                            </li>
                            <li>
                                <i class="fas fa-envelope"></i>
                                <span>contacto@rsienterprise.com</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer-bottom">
            <div class="footer-bottom-container">
                <div class="footer-bottom-content">
                    <div class="footer-logo-simple">
                        <a href="https://rsienterprise.web.app/" target="_blank" rel="noopener noreferrer" class="footer-logo-simple-link">
                            <img src="/assets/images/logoApp.png" alt="RSI Enterprise Logo" class="footer-logo-simple-img">
                            <span>RSI Enterprise</span>
                        </a>
                    </div>
                    <p class="copyright">
                        © ${new Date().getFullYear()} RSI Enterprise. Todos los derechos reservados.
                    </p>
                    <div class="footer-legal">
                        <a href="#">Política de Privacidad</a>
                        <a href="#">Términos y Condiciones</a>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.appendChild(footer);
    }

    // Configurar funcionalidades del footer
    function setupFooterFunctionalities() {
        // Asegurar que los enlaces externos se abran en nueva pestaña
        const externalLinks = document.querySelectorAll('.footer-component a[href^="http"]');
        externalLinks.forEach(link => {
            if (!link.href.includes(window.location.hostname)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    // API pública
    window.FooterComponent = {
        refresh: function () {
            // Método para actualizar footer si es necesario
        },
        getVersion: function () {
            return '1.1.0-simplified';
        }
    };

    // Cargar recursos necesarios
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }
})();