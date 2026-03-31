// =============================================
// SISTEMA DE TARJETAS - VERSIÓN FUNCIONAL
// Control total de altura por JavaScript
// =============================================

document.addEventListener('DOMContentLoaded', function() {    
    const cards = document.querySelectorAll('.plan-card');
    const COMPACT_HEIGHT = 180;  // Altura compacta
    const EXPANDED_HEIGHT = 1050; // Altura expandida (850px)
    
    // Configurar cada tarjeta
    cards.forEach((card, index) => {
        
        const compactView = card.querySelector('.plan-compact-view');
        const expandedView = card.querySelector('.plan-expanded-view');
        
        // 1. MEDIR ALTURA REAL DE LA VISTA COMPACTA
        // Mostrar compacta, ocultar expandida
        compactView.style.display = 'flex';
        expandedView.style.display = 'none';
        
        // Forzar renderizado para medir altura real
        void card.offsetHeight;
        
        const measuredCompactHeight = compactView.offsetHeight;
        
        // Guardar altura real
        card.dataset.compactHeight = measuredCompactHeight;
        
        // 2. ESTADO INICIAL
        card.style.height = measuredCompactHeight + 'px';
        card.style.overflow = 'hidden'; // Importante
        card.style.transition = 'height 0.4s ease';
        
        // 3. PREPARAR VISTA EXPANDIDA PARA MEDIR
        // Mostrar temporalmente para medir
        expandedView.style.display = 'flex';
        expandedView.style.opacity = '0';
        expandedView.style.position = 'absolute';
        
        const measuredExpandedHeight = expandedView.scrollHeight;
        
        // Restaurar estado
        expandedView.style.display = 'none';
        expandedView.style.position = '';
        
        // 4. EVENTO CLIC
        card.addEventListener('click', function(e) {
            if (e.target.closest('.order-btn')) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
                        
            if (this.classList.contains('expanded')) {
                closeCard(this);
            } else {
                openCard(this);
                openCard(this);
            }
        });
        
        // 5. FUNCIÓN PARA ABRIR
        function openCard(cardElement) {
            const compact = cardElement.querySelector('.plan-compact-view');
            const expanded = cardElement.querySelector('.plan-expanded-view');
            
            // Ocultar compacta
            compact.style.opacity = '0';
            
            // Mostrar expandida
            expanded.style.display = 'flex';
            expanded.style.flexDirection = 'column';
            
            // Forzar render
            void expanded.offsetHeight;
            
            // Expandir altura
            cardElement.style.height = EXPANDED_HEIGHT + 'px';
            
            // Completar animación
            setTimeout(() => {
                expanded.style.opacity = '1';
                cardElement.classList.add('expanded');
            }, 10);
        }
        
        // 6. FUNCIÓN PARA CERRAR
        function closeCard(cardElement) {
            const compact = cardElement.querySelector('.plan-compact-view');
            const expanded = cardElement.querySelector('.plan-expanded-view');
            const compactHeight = cardElement.dataset.compactHeight;
            
            // Ocultar expandida
            expanded.style.opacity = '0';
            
            // Reducir altura
            cardElement.style.height = compactHeight + 'px';
            
            // Completar animación
            setTimeout(() => {
                expanded.style.display = 'none';
                compact.style.opacity = '1';
                cardElement.classList.remove('expanded');
            }, 400);
        }
    });
});