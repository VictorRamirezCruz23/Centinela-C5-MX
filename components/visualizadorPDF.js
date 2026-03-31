// /components/visualizadorPDF.js
// Componente para visualizar PDF en modal

class VisualizadorPDF {
    constructor() {
        this.modal = null;
        this.iframe = null;
        this.closeBtn = null;
        this.downloadBtn = null;
        this.currentUrl = null;
        this.init();
    }

    init() {
        // Crear el modal si no existe
        if (!document.getElementById('visualizadorPDFModal')) {
            const modalHTML = `
                <div id="visualizadorPDFModal" class="pdf-visualizador-modal">
                    <div class="pdf-visualizador-header">
                        <h3 class="pdf-visualizador-title">Visualizador de PDF</h3>
                        <div class="pdf-visualizador-actions">
                            <button class="pdf-visualizador-btn pdf-visualizador-download" title="Descargar PDF">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="pdf-visualizador-btn pdf-visualizador-close" title="Cerrar">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="pdf-visualizador-content">
                        <iframe class="pdf-visualizador-iframe" frameborder="0"></iframe>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        this.modal = document.getElementById('visualizadorPDFModal');
        this.iframe = this.modal.querySelector('.pdf-visualizador-iframe');
        this.closeBtn = this.modal.querySelector('.pdf-visualizador-close');
        this.downloadBtn = this.modal.querySelector('.pdf-visualizador-download');
        this.title = this.modal.querySelector('.pdf-visualizador-title');

        // Event listeners
        this.closeBtn.addEventListener('click', () => this.cerrar());
        this.downloadBtn.addEventListener('click', () => this.descargar());

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.cerrar();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.modal.style.display === 'flex' && e.key === 'Escape') {
                this.cerrar();
            }
        });

        // Agregar estilos
        this.agregarEstilos();
    }

    agregarEstilos() {
        if (document.getElementById('visualizadorPDFStyles')) return;

        const styles = `
            <style id="visualizadorPDFStyles">
                .pdf-visualizador-modal {
                    display: none;
                    position: fixed;
                    z-index: 9999;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.95);
                    flex-direction: column;
                    animation: pdfFadeIn 0.3s;
                }

                @keyframes pdfFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .pdf-visualizador-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 24px;
                    background: linear-gradient(135deg, #1a3b5d 0%, #0f2a44 100%);
                    color: white;
                    border-bottom: 2px solid #c9a03d;
                }

                .pdf-visualizador-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 500;
                    color: #fff;
                }

                .pdf-visualizador-actions {
                    display: flex;
                    gap: 12px;
                }

                .pdf-visualizador-btn {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    transition: all 0.3s;
                }

                .pdf-visualizador-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                    transform: scale(1.1);
                }

                .pdf-visualizador-btn i {
                    font-size: 18px;
                }

                .pdf-visualizador-content {
                    flex: 1;
                    padding: 20px;
                    background: #1a1a1a;
                }

                .pdf-visualizador-iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }

                @media (max-width: 768px) {
                    .pdf-visualizador-header {
                        padding: 12px 16px;
                    }
                    .pdf-visualizador-title {
                        font-size: 16px;
                    }
                    .pdf-visualizador-btn {
                        width: 36px;
                        height: 36px;
                    }
                    .pdf-visualizador-content {
                        padding: 10px;
                    }
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    abrir(url, titulo = 'Visualizador de PDF') {
        if (!url) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No hay PDF disponible para visualizar'
            });
            return;
        }

        this.currentUrl = url;
        this.iframe.src = url;
        this.title.textContent = titulo;
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    cerrar() {
        this.modal.style.display = 'none';
        this.iframe.src = '';
        document.body.style.overflow = 'auto';
    }

    descargar() {
        if (this.currentUrl) {
            const link = document.createElement('a');
            link.href = this.currentUrl;
            link.download = this.currentUrl.split('/').pop() || 'documento.pdf';
            link.target = '_blank';
            link.click();
        }
    }
}

// Crear instancia global
window.visualizadorPDF = new VisualizadorPDF();
export default window.visualizadorPDF;