// navbar-complete.js 
(function () {
    'use strict';

    // Evitar carga duplicada
    if (window.NavbarCompleteLoaded) {
        return;
    }
    window.NavbarCompleteLoaded = true;

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }

    async function init() {
        try {
            removeOriginalNavbar();
            await createCompleteNavbar();
            setupAllFunctionalities();
        } catch (error) {
            console.error('❌ Error al inicializar navbar:', error);
        }
    }

    function removeOriginalNavbar() {
        const originalHeader = document.getElementById('main-header');
        if (originalHeader) {
            originalHeader.remove();
        }
    }

    // Crear navbar completo
    async function createCompleteNavbar() {
        addCompleteStyles();
        createNavbarHTML();
        adjustBodyPadding();
    }

    function addCompleteStyles() {
        const styleId = 'navbar-complete-styles';
        if (document.getElementById(styleId)) return;

        const styles = document.createElement('style');
        styles.id = styleId;
        styles.textContent = /*css*/ `
            /* NAVBAR COMPLETO */
            #complete-navbar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                z-index: 1000;
                background-color: var(--navbar-bg);
                box-shadow: 0 2px 10px transparent;
                transition: var(--transition-default);
                font-family: var(--font-family-primary);
            }
            
            #complete-navbar.scrolled {
                background-color: var(--navbar-scrolled-bg);
                box-shadow: var(--navbar-scrolled-shadow);
            }
            
            .navbar-main-container {
                display: flex;
                flex-direction: column;
                padding: 0;
            }
            
            /* Parte superior con logo y menú - CORREGIDO */
            .navbar-top-section {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px; 
                min-height: 70px; /* Altura mínima fija */
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                box-sizing: border-box; /* Importante */
            }
            
            /* Logo */
            .navbar-brand {
                display: flex;
                align-items: center;
                gap: 10px;
                font-weight: 700;
                font-size: 26px;
                color: var(--navbar-logo-text);
                text-decoration: none;
                z-index: 1003;
                text-shadow: var(--text-shadow-effect);
                position: relative;
                height: 60px; /* Altura fija para el contenedor */
                overflow: visible; /* Permite que los efectos salgan */
            }

            .navbar-logo-img {
                height: px; /* Aumentado a 60px */
                width: auto; /* Mantiene proporción */
                max-height: 90px; /* Límite máximo */
                transition: var(--transition-default);
                position: relative;
                z-index: 2;
            }

            /* Efecto hover opcional */
            .navbar-brand:hover .navbar-logo-img {
                transform: scale(1.05);
            }

            .navbar-brand:hover::before {
                opacity: 0.8;
                animation-duration: 2s;
            }
            
            /* Menú principal - DESKTOP */
            .navbar-main-menu {
                display: flex;
                list-style: none;
                gap: 25px;
                margin: 0;
                padding: 0;
            }
            
            .navbar-main-menu a {
                color: var(--navbar-text);
                text-decoration: none;
                font-weight: 500;
                font-size: 16px;
                transition: var(--transition-default);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .navbar-main-menu a:hover {
                text-shadow: var(--navbar-link-hover);
            }
            
            .navbar-main-menu a.active {
                color: var(--color-active);
                font-weight: 600;
            }
            
            /* BOTÓN HAMBURGUESA */
            .navbar-hamburger-btn {
                display: none;
                background: none;
                border: none;
                cursor: pointer;
                width: 40px;
                height: 40px;
                padding: 0;
                position: relative;
                z-index: 1002;
                margin: 0 15px 0 0;
            }
            
            .hamburger-line {
                display: block;
                width: 25px;
                height: 3px;
                background-color: var(--navbar-text);
                margin: 5px 0;
                border-radius: var(--border-radius-small);
                transition: var(--transition-default);
            }
            
            /* Animación a "X" cuando está activo */
            .navbar-hamburger-btn.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(6.3px, 6.3px);
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }
            
            .navbar-hamburger-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(6.3px, -6.3px);
            }
            
            /* Overlay para móvil */
            .navbar-mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: none;
            }
            
            .navbar-mobile-overlay.active {
                display: block;
            }
            
            /* ====== RESPONSIVE - MÓVIL ====== */
            @media (max-width: 992px) {
                .navbar-top-section {
                    padding: 10px 15px;
                    min-height: 60px;
                    position: relative;
                    display: grid;
                    grid-template-columns: 40px 1fr 40px;
                    align-items: center;
                    justify-items:center;
                }
                
                .navbar-hamburger-btn {
                    display: block;
                    grid-column: 3;
                    justify-self: end;
                    margin-left: 0;
                    margin-right: 5;
                }
                
                .navbar-brand {
                    grid-column: 2 / span 1;
                    grid-row: 1;
                    justify-self: center;
                    align-self: center;
                    height: 50px;
                    position: relative;
                    left: 0;
                    transform: none;
                    width: auto;
                    z-index: 1003;
                    text-align: center;
                }
                
                .navbar-logo-img {
                    height: 50px;
                    max-height: 50px;
                }
                
                /* Ajusta el efecto de luz para móvil */
                .navbar-brand::before {
                    width: 55px;
                    height: 55px;
                    left: -5px;
                }
                
                .navbar-main-menu {
                    position: fixed;
                    top: 0;
                    right: -100%;
                    left: auto;
                    width: 100%;
                    height: 100vh;
                    background-color: var(--navbar-scrolled-bg);
                    flex-direction: column;
                    align-items: center;
                    justify-content: flex-start;
                    padding: 100px 20px 30px;
                    gap: 0;
                    transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 1001;
                    overflow-y: auto;
                    box-shadow: none;
                    opacity: 0;
                    display: flex !important;
                }
                
                .navbar-main-menu.active {
                    right: 0;
                    left: auto;
                    opacity: 1;
                }
                
                .navbar-main-menu li {
                    width: 100%;
                    max-width: 300px;
                    border-bottom: 1px solid var(--color-border-light);
                    opacity: 0;
                    transform: translateX(20px);
                    transition: var(--transition-default);
                }
                
                .navbar-main-menu.active li {
                    opacity: 1;
                    transform: translateX(0);
                }
                
                .navbar-main-menu a {
                    padding: 15px 20px;
                    font-size: 18px;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    justify-content: flex-start;
                    text-align: left;
                    border-radius: var(--border-radius-medium);
                    margin: 5px 0;
                    color: var(--color-text-light);
                }
                
                .navbar-main-menu a:hover {
                    background-color: var(--color-hover);
                    padding-left: 25px;
                }
                
                body.mobile-menu-open {
                    overflow: hidden;
                }
            }
            
            @media (max-width: 480px) {
                .navbar-brand span {
                    font-size: 18px;
                }
                
                .navbar-logo-img {
                    height: 45px;
                    max-height: 45px;
                }
                
                .navbar-brand::before {
                    width: 50px;
                    height: 50px;
                    left: -4px;
                }
                
                .navbar-main-menu {
                    padding: 90px 15px 20px;
                }
                
                .navbar-main-menu a {
                    font-size: 16px;
                    padding: 14px 15px;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    function createNavbarHTML() {
        const navbar = document.createElement('header');
        navbar.id = 'complete-navbar';

        navbar.innerHTML = /*html*/ `
            <div class="navbar-main-container">
                <div class="navbar-top-section">
                    <a href="/index.html" class="navbar-brand">
                        <img src="/assets/images/logo.png" alt="" class="navbar-logo-img">
                        <span>CENTINELA</span>
                    </a>

                    <ul class="navbar-main-menu" id="navbarMainMenu">
                    
                        <li><a href="/index.html" class="active"><i class="fas fa-home"></i> <span>Inicio</span></a></li>
                        <li><a href="/index.html#quienes-somos"><i class="fas fa-box-open"></i><span>¿Quiénes somos?</span></a></li>
                        <li><a href="/usuarios/visitantes/planes/planes.html"><i class="fas fa-box-open"></i> <span>Planes</span></a></li>
                        <li><a href="/usuarios/visitantes/contacto/contacto.html"><i class="fas fa-map-marker-alt"></i> <span>Contactanos</span></a></li>
                        <li><a href="/usuarios/visitantes/inicioSesion/inicioSesion.html"><i class="fas fa-envelope"></i> <span>Inicio de sesion</span></a></li>
                    </ul>

                    <button class="navbar-hamburger-btn" id="navbarHamburger" aria-label="Toggle menu">
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                        <span class="hamburger-line"></span>
                    </button>
                </div>
                
                <div class="navbar-mobile-overlay" id="navbarMobileOverlay"></div>
            </div>
        `;

        document.body.insertBefore(navbar, document.body.firstChild);
    }

    function adjustBodyPadding() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        const navbarHeight = navbar.offsetHeight;
        document.body.style.paddingTop = navbarHeight + 'px';

        const resizeObserver = new ResizeObserver(() => {
            const newHeight = navbar.offsetHeight;
            document.body.style.paddingTop = newHeight + 'px';
        });

        resizeObserver.observe(navbar);
    }

    function setupAllFunctionalities() {
        setupResponsiveMenu();
        setupScrollEffects();
        markActiveLink();
    }

    function setupResponsiveMenu() {
        const hamburgerBtn = document.getElementById('navbarHamburger');
        const mainMenu = document.getElementById('navbarMainMenu');
        const overlay = document.getElementById('navbarMobileOverlay');

        if (!hamburgerBtn || !mainMenu || !overlay) return;

        let isMenuOpen = false;

        function openMobileMenu() {
            mainMenu.classList.add('active');
            hamburgerBtn.classList.add('active');
            overlay.classList.add('active');
            document.body.classList.add('mobile-menu-open');
            isMenuOpen = true;
        }

        function closeMobileMenu() {
            mainMenu.classList.remove('active');
            hamburgerBtn.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
            isMenuOpen = false;
        }

        function toggleMobileMenu() {
            if (isMenuOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        }

        hamburgerBtn.addEventListener('click', toggleMobileMenu);
        overlay.addEventListener('click', closeMobileMenu);

        mainMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 992) {
                    setTimeout(closeMobileMenu, 300);
                }
            });
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 992 && isMenuOpen) {
                closeMobileMenu();
            }
        });
    }

    function setupScrollEffects() {
        const navbar = document.getElementById('complete-navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    function markActiveLink() {
        const currentPage = window.location.pathname;
        const menuLinks = document.querySelectorAll('.navbar-main-menu a');

        menuLinks.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
    }

    window.NavbarComplete = {
        toggleMenu: function () {
            const hamburgerBtn = document.getElementById('navbarHamburger');
            if (hamburgerBtn) hamburgerBtn.click();
        },
    };

    // Cargar recursos necesarios
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement('link');
        faLink.rel = 'stylesheet';
        faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(faLink);
    }
})();