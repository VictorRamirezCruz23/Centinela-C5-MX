// /components/imagenEditorEvidencias.js
// Componente reutilizable para el editor de imágenes con herramientas de dibujo

class ImageEditorModal {
    constructor() {
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.elements = [];
        this.currentTool = 'circle';
        this.currentColor = '#ff0000';
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentFile = null;
        this.currentIndex = -1;
        this.onSaveCallback = null;
        this.comentario = '';

        this.init();
    }

    init() {
        this.injectStyles();
        this.createModalStructure();
        this.setupEventListeners();
    }

    injectStyles() {
        if (document.getElementById('image-editor-modal-styles')) return;

        const styles = `
            /* =============================================
               MODAL EDITOR DE IMAGEN (COMPONENTE REUTILIZABLE)
               ============================================= */
            .image-editor-modal {
                display: none;
                position: fixed;
                z-index: 10000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(5px);
            }

            .image-editor-modal .modal-content {
                position: relative;
                margin: 20px auto;
                width: 95%;
                max-width: 1400px;
                height: calc(100vh - 40px);
                background: var(--color-bg-secondary);
                border: 2px solid var(--color-accent-primary);
                border-radius: var(--border-radius-large);
                box-shadow: 0 0 30px rgba(0, 207, 255, 0.3);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .image-editor-modal .modal-header {
                padding: 20px 25px;
                background: rgba(20, 20, 20, 0.95);
                border-bottom: 2px solid var(--color-accent-primary);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .image-editor-modal .modal-header h5 {
                color: var(--color-text-primary);
                font-family: var(--font-family-primary);
                font-size: 20px;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .image-editor-modal .modal-header h5 i {
                color: var(--color-accent-primary);
            }

            .image-editor-modal .modal-close {
                background: none;
                border: none;
                color: var(--color-text-secondary);
                font-size: 28px;
                cursor: pointer;
                transition: all 0.3s ease;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }

            .image-editor-modal .modal-close:hover {
                color: var(--color-danger);
                background: rgba(220, 53, 69, 0.1);
                transform: rotate(90deg);
            }

            .image-editor-modal .modal-body {
                flex: 1;
                padding: 20px;
                overflow: auto;
            }

            .image-editor-modal .editor-layout {
                display: flex;
                gap: 20px;
                height: 100%;
            }

            .image-editor-modal .editor-canvas-panel {
                flex: 2;
                display: flex;
                flex-direction: column;
                gap: 15px;
                min-width: 0;
            }

            .image-editor-modal .canvas-container {
                background: #1a1a1a;
                border-radius: var(--border-radius-medium);
                overflow: auto;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 2px solid var(--color-border-light);
                height: calc(100% - 50px);
            }

            .image-editor-modal #modalImageCanvas {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                cursor: crosshair;
            }

            .image-editor-modal .editor-tools-panel {
                flex: 1;
                min-width: 280px;
                background: var(--color-bg-tertiary);
                border-radius: var(--border-radius-medium);
                padding: 20px;
                border: 1px solid var(--color-border-light);
                overflow-y: auto;
            }

            .image-editor-modal .tools-section {
                margin-bottom: 25px;
            }

            .image-editor-modal .tools-section h6 {
                color: var(--color-text-primary);
                font-family: var(--font-family-primary);
                font-size: 14px;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid var(--color-accent-primary);
                text-transform: uppercase;
            }

            .image-editor-modal .tools-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }

            .image-editor-modal .tool-btn-large {
                background: linear-gradient(145deg, #0f0f0f, #1a1a1a);
                border: 2px solid var(--color-border-light);
                color: var(--color-text-primary);
                padding: 15px;
                border-radius: var(--border-radius-medium);
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            }

            .image-editor-modal .tool-btn-large:hover {
                border-color: var(--color-accent-primary);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 207, 255, 0.2);
            }

            .image-editor-modal .tool-btn-large.active {
                background: var(--color-accent-primary);
                color: #000;
                border-color: var(--color-accent-primary);
            }

            .image-editor-modal .tool-btn-large.active i {
                color: #000;
            }

            .image-editor-modal .tool-btn-large i {
                font-size: 24px;
                color: var(--color-accent-primary);
            }

            .image-editor-modal .tool-btn-large.active i {
                color: #000;
            }

            .image-editor-modal .color-picker {
                display: flex;
                gap: 10px;
                align-items: center;
            }

            .image-editor-modal #modalColorPicker {
                width: 50px;
                height: 50px;
                border: 2px solid var(--color-border-light);
                border-radius: var(--border-radius-small);
                cursor: pointer;
                background: transparent;
            }

            .image-editor-modal .color-value {
                background: var(--color-bg-secondary);
                padding: 8px 12px;
                border-radius: var(--border-radius-small);
                border: 1px solid var(--color-border-light);
                font-family: monospace;
                color: var(--color-text-secondary);
            }

            .image-editor-modal .action-buttons-vertical {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .image-editor-modal .action-buttons-vertical .tool-btn-large {
                width: 100%;
                flex-direction: row;
                justify-content: center;
            }

            .image-editor-modal #modalLimpiarTodo:hover {
                border-color: var(--color-warning);
            }

            .image-editor-modal #modalGuardarCambios:hover {
                border-color: var(--color-success);
            }

            .image-editor-modal #modalCancelar:hover {
                border-color: var(--color-danger);
            }

            .image-editor-modal .image-info {
                color: var(--color-text-secondary);
                font-size: 13px;
                text-align: center;
                padding: 8px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: var(--border-radius-small);
            }

            @media (max-width: 768px) {
                .image-editor-modal .editor-layout {
                    flex-direction: column;
                }

                .image-editor-modal .modal-content {
                    width: 98%;
                    margin: 10px auto;
                    height: calc(100vh - 20px);
                }

                .image-editor-modal .canvas-container {
                    height: 400px;
                }

                .image-editor-modal .editor-tools-panel {
                    min-width: auto;
                }
            }

            @media (max-width: 480px) {
                .image-editor-modal .modal-header h5 {
                    font-size: 18px;
                }

                .image-editor-modal .tools-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'image-editor-modal-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }

    createModalStructure() {
        // Verificar si ya existe el modal
        let existingModal = document.getElementById('imageEditorModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'imageEditorModal';
        modal.className = 'image-editor-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h5><i class="fas fa-edit"></i> Editor de Imagen</h5>
                    <button type="button" class="modal-close" id="btnCerrarModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="editor-layout">
                        <!-- Panel izquierdo - Canvas -->
                        <div class="editor-canvas-panel">
                            <div class="canvas-container">
                                <canvas id="modalImageCanvas"></canvas>
                            </div>
                            <div class="image-info" id="modalImageInfo">
                                Cargando imagen...
                            </div>
                        </div>

                        <!-- Panel derecho - Herramientas -->
                        <div class="editor-tools-panel">
                            <div class="tools-section">
                                <h6>Herramientas de dibujo</h6>
                                <div class="tools-grid">
                                    <button type="button" class="tool-btn-large" id="modalToolCircle">
                                        <i class="fas fa-circle"></i>
                                        <span>Círculo</span>
                                    </button>
                                    <button type="button" class="tool-btn-large" id="modalToolArrow">
                                        <i class="fas fa-arrow-right"></i>
                                        <span>Flecha</span>
                                    </button>
                                </div>
                            </div>

                            <div class="tools-section">
                                <h6>Color</h6>
                                <div class="color-picker">
                                    <input type="color" id="modalColorPicker" value="#ff0000">
                                    <span class="color-value" id="modalColorValue">#ff0000</span>
                                </div>
                            </div>

                            <div class="tools-section">
                                <h6>Comentario</h6>
                                <textarea id="modalComentario" class="form-control" rows="3"
                                    placeholder="Agrega un comentario"></textarea>
                            </div>

                            <div class="tools-section">
                                <h6>Acciones</h6>
                                <div class="action-buttons-vertical">
                                    <button type="button" class="tool-btn-large" id="modalLimpiarTodo">
                                        <i class="fas fa-eraser"></i>
                                        <span>Limpiar todo</span>
                                    </button>
                                    <button type="button" class="tool-btn-large" id="modalGuardarCambios">
                                        <i class="fas fa-save"></i>
                                        <span>Guardar cambios</span>
                                    </button>
                                    <button type="button" class="tool-btn-large" id="modalCancelar">
                                        <i class="fas fa-times"></i>
                                        <span>Cancelar</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
        this.canvas = document.getElementById('modalImageCanvas');
        this.ctx = this.canvas?.getContext('2d');
    }

    setupEventListeners() {
        if (!this.modal) return;

        document.getElementById('btnCerrarModal')?.addEventListener('click', () => this.hide());
        document.getElementById('modalCancelar')?.addEventListener('click', () => this.hide());

        document.getElementById('modalToolCircle')?.addEventListener('click', () => {
            this.setTool('circle');
            document.getElementById('modalToolCircle').classList.add('active');
            document.getElementById('modalToolArrow').classList.remove('active');
        });

        document.getElementById('modalToolArrow')?.addEventListener('click', () => {
            this.setTool('arrow');
            document.getElementById('modalToolArrow').classList.add('active');
            document.getElementById('modalToolCircle').classList.remove('active');
        });

        document.getElementById('modalColorPicker')?.addEventListener('input', (e) => {
            this.currentColor = e.target.value;
            document.getElementById('modalColorValue').textContent = e.target.value;
        });

        document.getElementById('modalLimpiarTodo')?.addEventListener('click', () => {
            this.elements = [];
            this.redrawCanvas();
        });

        document.getElementById('modalGuardarCambios')?.addEventListener('click', () => {
            this.saveImage();
        });

        if (this.canvas) {
            this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
            this.canvas.addEventListener('mousemove', (e) => this.draw(e));
            this.canvas.addEventListener('mouseup', () => this.stopDrawing());
            this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.hide();
            }
        });
    }

    show(file, index, comentario = '', onSaveCallback) {
        if (!this.modal || !this.canvas || !this.ctx) return;

        this.currentFile = file;
        this.currentIndex = index;
        this.comentario = comentario;
        this.onSaveCallback = onSaveCallback;
        this.elements = [];

        document.getElementById('modalToolCircle')?.classList.add('active');
        document.getElementById('modalToolArrow')?.classList.remove('active');
        this.currentTool = 'circle';

        const reader = new FileReader();
        reader.onload = (e) => {
            this.image = new Image();
            this.image.onload = () => {
                const maxWidth = 1200;
                const maxHeight = 800;
                let width = this.image.width;
                let height = this.image.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }

                this.canvas.width = width;
                this.canvas.height = height;
                this.redrawCanvas();

                document.getElementById('modalImageInfo').textContent =
                    `Editando: ${file.name} (${Math.round(width)}x${Math.round(height)})`;

                document.getElementById('modalComentario').value = comentario || '';
            };
            this.image.src = e.target.result;
        };
        reader.readAsDataURL(file);

        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (!this.modal) return;
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.image = null;
        this.elements = [];
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    redrawCanvas() {
        if (!this.ctx || !this.image || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);

        this.elements.forEach(el => {
            this.ctx.beginPath();
            this.ctx.strokeStyle = el.color;
            this.ctx.lineWidth = 3;

            if (el.type === 'circle') {
                this.ctx.arc(el.x, el.y, el.radius, 0, 2 * Math.PI);
                this.ctx.stroke();
            } else if (el.type === 'arrow') {
                const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
                const arrowLength = 15;

                this.ctx.beginPath();
                this.ctx.moveTo(el.startX, el.startY);
                this.ctx.lineTo(el.endX, el.endY);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(el.endX, el.endY);
                this.ctx.lineTo(
                    el.endX - arrowLength * Math.cos(angle - Math.PI / 6),
                    el.endY - arrowLength * Math.sin(angle - Math.PI / 6)
                );
                this.ctx.lineTo(
                    el.endX - arrowLength * Math.cos(angle + Math.PI / 6),
                    el.endY - arrowLength * Math.sin(angle + Math.PI / 6)
                );
                this.ctx.closePath();
                this.ctx.fillStyle = el.color;
                this.ctx.fill();
            }
        });
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    startDrawing(e) {
        if (!this.image || !this.canvas) return;

        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        this.startX = (e.clientX - rect.left) * scaleX;
        this.startY = (e.clientY - rect.top) * scaleY;
    }

    draw(e) {
        if (!this.isDrawing || !this.image || !this.canvas || !this.ctx) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const currentX = (e.clientX - rect.left) * scaleX;
        const currentY = (e.clientY - rect.top) * scaleY;

        this.redrawCanvas();
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = 3;

        if (this.currentTool === 'circle') {
            const radius = Math.sqrt(
                Math.pow(currentX - this.startX, 2) +
                Math.pow(currentY - this.startY, 2)
            );
            this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
            this.ctx.stroke();
        } else if (this.currentTool === 'arrow') {
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();

            const angle = Math.atan2(currentY - this.startY, currentX - this.startX);
            const arrowLength = 15;

            this.ctx.beginPath();
            this.ctx.moveTo(currentX, currentY);
            this.ctx.lineTo(
                currentX - arrowLength * Math.cos(angle - Math.PI / 6),
                currentY - arrowLength * Math.sin(angle - Math.PI / 6)
            );
            this.ctx.lineTo(
                currentX - arrowLength * Math.cos(angle + Math.PI / 6),
                currentY - arrowLength * Math.sin(angle + Math.PI / 6)
            );
            this.ctx.closePath();
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fill();
        }
    }

    stopDrawing() {
        if (!this.isDrawing || !this.image || !this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const lastMouseMove = (e) => {
            const currentX = (e.clientX - rect.left) * scaleX;
            const currentY = (e.clientY - rect.top) * scaleY;

            if (this.currentTool === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(currentX - this.startX, 2) +
                    Math.pow(currentY - this.startY, 2)
                );

                if (radius > 5) {
                    this.elements.push({
                        type: 'circle',
                        x: this.startX,
                        y: this.startY,
                        radius: radius,
                        color: this.currentColor
                    });
                }
            } else if (this.currentTool === 'arrow') {
                const distance = Math.sqrt(
                    Math.pow(currentX - this.startX, 2) +
                    Math.pow(currentY - this.startY, 2)
                );

                if (distance > 5) {
                    this.elements.push({
                        type: 'arrow',
                        startX: this.startX,
                        startY: this.startY,
                        endX: currentX,
                        endY: currentY,
                        color: this.currentColor
                    });
                }
            }

            this.redrawCanvas();
            document.removeEventListener('mousemove', lastMouseMove);
        };

        document.addEventListener('mousemove', lastMouseMove);
        this.isDrawing = false;
    }

    saveImage() {
        if (!this.canvas || !this.currentFile) return;

        const comentario = document.getElementById('modalComentario').value;

        this.canvas.toBlob((blob) => {
            const editedFile = new File([blob], `edited_${this.currentFile.name}`, {
                type: 'image/png'
            });

            if (this.onSaveCallback) {
                this.onSaveCallback(this.currentIndex, editedFile, comentario, this.elements);
            }

            this.hide();
        }, 'image/png');
    }
}

// Hacer disponible globalmente
window.ImageEditorModal = ImageEditorModal;