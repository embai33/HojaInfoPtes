// ui.js - Renderizado de vistas (v2 - sin CIMA)

const UI = {
    /**
     * Definición de campos de la hoja informativa
     */
    SHEET_FIELDS: [
        { key: 'que_es_para_que', label: '¿Qué es y para qué se utiliza este medicamento?', rows: 4 },
        { key: 'administracion', label: '¿Cómo se administra este medicamento?', rows: 5 },
        { key: 'olvido_dosis', label: '¿Qué hacer si se olvida administrar una dosis?', rows: 3 },
        { key: 'efectos_adversos', label: '¿Qué efectos adversos pueden aparecer durante el tratamiento?', rows: 6 },
        { key: 'interacciones', label: 'Interacciones clínicamente relevantes', rows: 5 },
        { key: 'excipientes', label: 'Listado de excipientes', rows: 3 },
        { key: 'conservacion', label: '¿Cómo se debe conservar?', rows: 3 },
        { key: 'observaciones', label: 'Observaciones importantes', rows: 5 }
    ],

    // ==========================================
    // VISTA: Inicio
    // ==========================================
    async renderHome(container) {
        let recentHtml = '';
        try {
            const sheets = await Storage.getAll();
            if (sheets.length > 0) {
                const recent = sheets.slice(0, 3);
                recentHtml = `
                    <h4 class="section-title mt-5 mb-3">Hojas recientes</h4>
                    <div class="row">
                        ${recent.map(s => this._renderSheetCard(s)).join('')}
                    </div>
                    ${sheets.length > 3 ? `<div class="text-center mt-2"><a href="#/sheets" class="btn btn-outline-secondary btn-sm">Ver todas (${sheets.length})</a></div>` : ''}
                `;
            }
        } catch (err) {
            console.error(err);
        }

        container.innerHTML = `
            <div class="text-center pt-3 pb-5">
                <div class="mb-4">
                    <i class="bi bi-file-earmark-medical display-1 text-primary"></i>
                </div>
                <h1 class="display-6 fw-bold text-dark">HojaInfoPtes</h1>
                <p class="lead text-secondary mb-4">
                    Crea hojas informativas de medicamentos para tus pacientes
                </p>
                <div class="d-flex gap-3 justify-content-center">
                    <a href="#/new" class="btn btn-primary btn-lg px-4">
                        <i class="bi bi-plus-circle me-2"></i>Nueva hoja
                    </a>
                    <a href="#/sheets" class="btn btn-outline-secondary btn-lg px-4">
                        <i class="bi bi-collection me-2"></i>Hojas guardadas
                    </a>
                    <a href="#/config" class="btn btn-outline-secondary btn-lg px-4">
                        <i class="bi bi-gear me-2"></i>Configuraci\u00f3n
                    </a>
                </div>
            </div>
            ${recentHtml}
            <div class="text-center mt-2">
                <small class="text-secondary" style="font-size:0.75rem;">Aplicaci\u00f3n creada por <a href="https://www.linkedin.com/in/emilio-monte-boquet" target="_blank" rel="noopener noreferrer" class="text-secondary">EMB</a> - 2026</small>
            </div>
        `;
    },

    // ==========================================
    // VISTA: Nueva hoja (pegar texto)
    // ==========================================
    renderNewSheet(container) {
        const placeholderText = `PRINCIPIO ACTIVO
Ibuprofeno

QUÉ ES Y PARA QUÉ SE UTILIZA
El ibuprofeno es un medicamento antiinflamatorio...

CONSERVACIÓN
Conservar por debajo de 25°C...

ADMINISTRACIÓN
Tome este medicamento por vía oral...

OLVIDO DE DOSIS
Si olvida tomar una dosis...

EFECTOS ADVERSOS
Los efectos adversos más frecuentes son...

INTERACCIONES
No tome ibuprofeno junto con...

EXCIPIENTES
Lactosa monohidrato, celulosa microcristalina...

OBSERVACIONES
Este medicamento no debe utilizarse durante...`;

        container.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-lg-10">
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="#/">Inicio</a></li>
                            <li class="breadcrumb-item active">Nueva hoja informativa</li>
                        </ol>
                    </nav>

                    <div class="card shadow-sm">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h3 class="card-title mb-0">
                                <i class="bi bi-clipboard-plus me-2"></i>Pegar contenido del LLM
                            </h3>
                            <a href="https://chatgpt.com/g/g-67cca269c0148191a4e96359b76af9e4-informacion-de-medicamentos-para-pacientes"
                               target="_blank" rel="noopener noreferrer"
                               class="btn btn-sm btn-outline-secondary">
                                <i class="bi bi-box-arrow-up-right me-1"></i>Acceso a GPT
                            </a>
                        </div>
                        <div class="card-body">
                            <p class="text-secondary mb-3">
                                Pegue el texto generado por el LLM con los títulos de sección.
                                La aplicación detectará automáticamente cada apartado.
                            </p>
                            <div class="mb-3">
                                <textarea class="form-control paste-textarea" id="paste-input"
                                          rows="20" placeholder="${this._escapeAttr(placeholderText)}"
                                          autofocus></textarea>
                            </div>
                            <div id="parse-warnings" class="d-none"></div>
                            <div class="d-flex gap-2">
                                <button id="btn-process" class="btn btn-primary btn-lg">
                                    <i class="bi bi-arrow-right-circle me-2"></i>Procesar texto
                                </button>
                                <button id="btn-clear" class="btn btn-outline-secondary btn-lg">
                                    <i class="bi bi-x-circle me-2"></i>Limpiar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="card mt-3 border-0 bg-light">
                        <div class="card-body">
                            <h6 class="text-secondary"><i class="bi bi-info-circle me-1"></i> Formato esperado</h6>
                            <p class="small text-secondary mb-1">
                                El texto debe incluir títulos de sección como: <strong>PRINCIPIO ACTIVO</strong>,
                                <strong>QUÉ ES Y PARA QUÉ SE UTILIZA</strong>, <strong>CONSERVACIÓN</strong>,
                                <strong>ADMINISTRACIÓN</strong>, <strong>OLVIDO DE DOSIS</strong>,
                                <strong>EFECTOS ADVERSOS</strong>, <strong>INTERACCIONES</strong>,
                                <strong>EXCIPIENTES</strong>, <strong>OBSERVACIONES</strong>.
                            </p>
                            <p class="small text-secondary mb-0">
                                Los títulos pueden tener variaciones (con o sin signos de interrogación, en mayúsculas o minúsculas).
                            </p>
                        </div>
                    </div>
                </div>
            </div>`;

        // Event: Procesar texto
        document.getElementById('btn-process').addEventListener('click', () => {
            const text = document.getElementById('paste-input').value;
            this._processText(text);
        });

        // Event: Limpiar
        document.getElementById('btn-clear').addEventListener('click', () => {
            document.getElementById('paste-input').value = '';
            document.getElementById('parse-warnings').classList.add('d-none');
            document.getElementById('paste-input').focus();
        });
    },

    /**
     * Procesar texto pegado: parsear y navegar a edición
     */
    async _processText(text) {
        if (!text.trim()) {
            showToast('Aviso', 'Pegue el texto generado por el LLM antes de procesar.', 'warning');
            return;
        }

        const { fields, warnings } = Parser.parseText(text);

        // Mostrar warnings si los hay
        const warningsDiv = document.getElementById('parse-warnings');
        if (warnings.length > 0) {
            warningsDiv.className = 'alert alert-warning mb-3';
            warningsDiv.innerHTML = `
                <strong><i class="bi bi-exclamation-triangle me-1"></i>Avisos:</strong>
                <ul class="mb-0 mt-1">
                    ${warnings.map(w => `<li>${this._escapeHtml(w)}</li>`).join('')}
                </ul>
                <p class="mt-2 mb-0 small">
                    Los campos no detectados quedarán vacíos. Puede completarlos manualmente en la siguiente pantalla.
                </p>`;

            // Botón para continuar de todas formas
            const continueBtn = document.createElement('button');
            continueBtn.className = 'btn btn-primary mt-2';
            continueBtn.innerHTML = '<i class="bi bi-arrow-right-circle me-2"></i>Continuar a edición';
            continueBtn.addEventListener('click', () => {
                sessionStorage.setItem('newSheetFields', JSON.stringify(fields));
                window.location.hash = '#/sheet/0/edit';
            });
            warningsDiv.appendChild(continueBtn);
        } else {
            // Sin warnings, ir directamente
            sessionStorage.setItem('newSheetFields', JSON.stringify(fields));
            window.location.hash = '#/sheet/0/edit';
        }
    },

    // ==========================================
    // VISTA: Editar hoja (nueva o existente)
    // ==========================================
    async renderEditSheet(container, id) {
        let sheetData = {};
        let isNew = (id === 0);

        if (isNew) {
            const stored = sessionStorage.getItem('newSheetFields');
            if (stored) {
                sheetData = JSON.parse(stored);
                sessionStorage.removeItem('newSheetFields');
            }
        } else {
            try {
                sheetData = await Storage.get(id);
                if (!sheetData) {
                    container.innerHTML = '<div class="alert alert-warning">Hoja no encontrada.</div>';
                    return;
                }
            } catch (err) {
                container.innerHTML = `<div class="alert alert-danger">Error: ${this._escapeHtml(err.message)}</div>`;
                return;
            }
        }

        this._renderSheetForm(container, sheetData, isNew);
    },

    // ==========================================
    // VISTA: Ver hoja (lectura)
    // ==========================================
    async renderViewSheet(container, id) {
        try {
            const sheet = await Storage.get(id);
            if (!sheet) {
                container.innerHTML = '<div class="alert alert-warning">Hoja no encontrada.</div>';
                return;
            }

            const fechaCreacion = sheet.created_at ? new Date(sheet.created_at).toLocaleDateString('es-ES') : '-';
            const fechaModificacion = sheet.updated_at ? new Date(sheet.updated_at).toLocaleDateString('es-ES') : '-';

            let sectionsHtml = '';
            for (const field of this.SHEET_FIELDS) {
                const value = sheet[field.key] || '';
                if (value) {
                    sectionsHtml += `
                        <div class="sheet-view-section pdf-section">
                            <h5>${this._escapeHtml(field.label)}</h5>
                            <div class="content">${this._escapeHtml(value)}</div>
                        </div>`;
                }
            }

            const imagenHtml = sheet.imagen
                ? `<img src="${sheet.imagen}" alt="Imagen del medicamento" class="sheet-view-imagen me-3">`
                : '';
            const pdfImagenHtml = sheet.imagen
                ? `<img src="${sheet.imagen}" alt="">`
                : '';

            container.innerHTML = `
                <!-- Cabecera PDF (visible solo al imprimir) -->
                <div class="pdf-header">
                    ${pdfImagenHtml}
                    <div>
                        <h1>${this._escapeHtml(sheet.principio_activo || '')}</h1>
                        <div class="subtitle">Hoja informativa para el paciente</div>
                    </div>
                </div>

                <nav aria-label="breadcrumb" class="d-print-none">
                    <ol class="breadcrumb">
                        <li class="breadcrumb-item"><a href="#/sheets">Hojas guardadas</a></li>
                        <li class="breadcrumb-item active">${this._escapeHtml(sheet.principio_activo || '')}</li>
                    </ol>
                </nav>

                <div class="d-flex justify-content-between align-items-start mb-4 d-print-none">
                    <div class="d-flex align-items-center">
                        ${imagenHtml}
                        <div>
                            <h2 class="fw-bold">${this._escapeHtml(sheet.principio_activo || '')}</h2>
                            <p class="text-secondary small">
                                Creada: ${fechaCreacion} | Modificada: ${fechaModificacion}
                            </p>
                        </div>
                    </div>
                    <div class="d-flex gap-2">
                        <button id="btn-print" class="btn btn-outline-secondary" title="Imprimir">
                            <i class="bi bi-printer"></i> Imprimir
                        </button>
                        <button id="btn-pdf" data-sheet-id="${sheet.id}" class="btn btn-pdf" title="Descargar PDF">
                            <i class="bi bi-file-earmark-pdf"></i> PDF
                        </button>
                        <a href="#/sheet/${sheet.id}/edit" class="btn btn-primary">
                            <i class="bi bi-pencil"></i> Editar
                        </a>
                    </div>
                </div>

                ${sectionsHtml}

                <!-- Pie de página PDF -->
                <div class="pdf-footer">
                    Generado con HojaInfoPtes | Fecha: ${new Date().toLocaleDateString('es-ES')}
                </div>`;

            document.getElementById('btn-print')?.addEventListener('click', () => PDFGenerator.print());
            document.getElementById('btn-pdf')?.addEventListener('click', (e) => {
                const sheetId = parseInt(e.currentTarget.dataset.sheetId);
                PDFGenerator.download(sheetId);
            });

        } catch (err) {
            container.innerHTML = `<div class="alert alert-danger">Error: ${this._escapeHtml(err.message)}</div>`;
        }
    },

    // ==========================================
    // VISTA: Listado de hojas guardadas
    // ==========================================
    async renderSheetList(container) {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2 class="fw-bold">Hojas informativas</h2>
                <div class="d-flex gap-2">
                    <button id="btn-export" class="btn btn-outline-secondary btn-sm" title="Exportar">
                        <i class="bi bi-download"></i> Exportar
                    </button>
                    <label class="btn btn-outline-secondary btn-sm" title="Importar">
                        <i class="bi bi-upload"></i> Importar
                        <input type="file" id="import-file" accept=".json" class="d-none">
                    </label>
                    <a href="#/new" class="btn btn-primary btn-sm">
                        <i class="bi bi-plus-circle"></i> Nueva
                    </a>
                </div>
            </div>
            <div class="mb-3">
                <input type="text" class="form-control" id="sheet-search"
                       placeholder="Buscar por principio activo...">
            </div>
            <div id="sheet-list-container"></div>`;

        const listContainer = document.getElementById('sheet-list-container');

        document.getElementById('btn-export').addEventListener('click', async () => {
            try {
                const count = await Storage.exportJSON();
                showToast('Exportación', `Se exportaron ${count} hoja(s).`, 'success');
            } catch (err) {
                showToast('Error', err.message, 'error');
            }
        });

        document.getElementById('import-file').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const result = await Storage.importJSON(file);
                showToast('Importación', `Importadas: ${result.imported} | Omitidas: ${result.skipped}`, 'success');
                this._loadSheetList(listContainer, '');
            } catch (err) {
                showToast('Error', err.message, 'error');
            }
            e.target.value = '';
        });

        let searchTimeout;
        document.getElementById('sheet-search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this._loadSheetList(listContainer, e.target.value);
            }, 300);
        });

        this._loadSheetList(listContainer, '');
    },

    // ==========================================
    // HELPERS
    // ==========================================

    _renderSheetCard(sheet) {
        const fecha = sheet.updated_at ? new Date(sheet.updated_at).toLocaleDateString('es-ES') : '-';
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card sheet-card h-100">
                    <div class="card-body">
                        <h5 class="card-title fw-bold">${this._escapeHtml(sheet.principio_activo || '(Sin título)')}</h5>
                        <p class="card-text small text-secondary mb-0">Modificada: ${fecha}</p>
                    </div>
                    <div class="card-footer bg-transparent d-flex gap-1">
                        <a href="#/sheet/${sheet.id}" class="btn btn-sm btn-outline-primary flex-fill">
                            <i class="bi bi-eye"></i> Ver
                        </a>
                        <a href="#/sheet/${sheet.id}/edit" class="btn btn-sm btn-outline-secondary flex-fill">
                            <i class="bi bi-pencil"></i> Editar
                        </a>
                        <button class="btn btn-sm btn-outline-danger btn-delete-sheet"
                                data-sheet-id="${sheet.id}"
                                data-sheet-name="${this._escapeAttr(sheet.principio_activo || '')}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    },

    async _loadSheetList(container, query) {
        try {
            const sheets = await Storage.search(query);

            if (sheets.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5 text-secondary">
                        <i class="bi bi-inbox display-4"></i>
                        <p class="mt-2">${query ? 'No se encontraron hojas.' : 'No hay hojas guardadas todavía.'}</p>
                        ${!query ? '<a href="#/new" class="btn btn-primary mt-2"><i class="bi bi-plus-circle me-1"></i>Crear nueva hoja</a>' : ''}
                    </div>`;
                return;
            }

            let html = '<div class="row">';
            for (const sheet of sheets) {
                html += this._renderSheetCard(sheet);
            }
            html += '</div>';
            container.innerHTML = html;

            container.querySelectorAll('.btn-delete-sheet').forEach(btn => {
                btn.addEventListener('click', () => {
                    const sheetId = parseInt(btn.dataset.sheetId);
                    const sheetName = btn.dataset.sheetName;
                    this._deleteSheet(sheetId, sheetName, container);
                });
            });

        } catch (err) {
            container.innerHTML = `<div class="alert alert-danger">Error: ${this._escapeHtml(err.message)}</div>`;
        }
    },

    async _deleteSheet(id, name, listContainer) {
        if (!Number.isInteger(id) || id < 0) return;
        if (!confirm(`¿Eliminar la hoja de "${name}"?`)) return;
        try {
            await Storage.delete(id);
            showToast('Eliminada', `Hoja de "${name}" eliminada.`, 'success');
            this._loadSheetList(listContainer, document.getElementById('sheet-search')?.value || '');
        } catch (err) {
            showToast('Error', err.message, 'error');
        }
    },

    _renderSheetForm(container, sheetData, isNew) {
        let fieldsHtml = '';
        for (const field of this.SHEET_FIELDS) {
            const value = sheetData[field.key] || '';
            fieldsHtml += `
                <div class="mb-4 sheet-field">
                    <label for="field-${field.key}" class="form-label">${this._escapeHtml(field.label)}</label>
                    <textarea class="form-control" id="field-${field.key}" name="${field.key}"
                              rows="${field.rows}">${this._escapeHtml(value)}</textarea>
                </div>`;
        }

        container.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-lg-10">
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="#/${isNew ? '' : 'sheets'}">${isNew ? 'Inicio' : 'Hojas guardadas'}</a></li>
                            <li class="breadcrumb-item active">${isNew ? 'Nueva hoja' : 'Editar hoja'}</li>
                        </ol>
                    </nav>

                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h3 class="card-title mb-0">
                                ${isNew ? '<i class="bi bi-plus-circle me-2"></i>Nueva hoja informativa' : '<i class="bi bi-pencil me-2"></i>Editar hoja informativa'}
                            </h3>
                        </div>
                        <div class="card-body">
                            <form id="sheet-form">
                                <div class="mb-4 sheet-field">
                                    <label for="field-principio_activo" class="form-label fs-5 fw-bold">
                                        Principio activo (título de la hoja)
                                    </label>
                                    <input type="text" class="form-control form-control-lg"
                                           id="field-principio_activo" name="principio_activo"
                                           value="${this._escapeAttr(sheetData.principio_activo || '')}"
                                           placeholder="Ej: Ibuprofeno" required>
                                </div>

                                <div class="mb-4 sheet-field">
                                    <label class="form-label">
                                        <i class="bi bi-image me-1"></i>Imagen del medicamento (opcional)
                                    </label>
                                    <div id="imagen-container"></div>
                                </div>

                                ${fieldsHtml}

                                <hr>
                                <div class="d-flex gap-2">
                                    <button type="submit" class="btn btn-primary btn-lg">
                                        <i class="bi bi-check-circle me-2"></i>${isNew ? 'Guardar hoja' : 'Guardar cambios'}
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary btn-lg" id="btn-cancel">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;

        // Configurar widget de imagen
        this._setupImageWidget(sheetData);

        document.getElementById('btn-cancel').addEventListener('click', () => {
            if (isNew) {
                window.location.hash = '#/';
            } else {
                window.location.hash = `#/sheet/${sheetData.id}`;
            }
        });

        document.getElementById('sheet-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = { ...sheetData };
            formData.principio_activo = document.getElementById('field-principio_activo').value.trim();

            for (const field of this.SHEET_FIELDS) {
                formData[field.key] = document.getElementById(`field-${field.key}`).value.trim();
            }

            // Recoger imagen
            const imagenState = document.getElementById('sheet-form')._getImagen?.();
            if (imagenState?.touched) {
                if (imagenState.value) {
                    formData.imagen = imagenState.value;
                } else {
                    delete formData.imagen;
                }
            }

            if (!formData.principio_activo) {
                showToast('Aviso', 'El principio activo es obligatorio.', 'warning');
                return;
            }

            formData.updated_at = new Date().toISOString();

            try {
                let id;
                if (isNew) {
                    delete formData.id;
                    id = await Storage.save(formData);
                    showToast('Guardada', 'Hoja informativa creada.', 'success');
                } else {
                    id = formData.id;
                    await Storage.update(formData);
                    showToast('Actualizada', 'Cambios guardados.', 'success');
                }
                window.location.hash = `#/sheet/${id}`;
            } catch (err) {
                showToast('Error', 'No se pudo guardar: ' + err.message, 'error');
            }
        });
    },

    showError(message) {
        const app = document.getElementById('app');
        app.innerHTML = `<div class="alert alert-danger">${this._escapeHtml(message)}</div>`;
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _escapeAttr(text) {
        return (text || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    // ==========================================
    // IMAGEN: Procesado y widget
    // ==========================================

    /**
     * Leer un fichero de imagen, redimensionar y comprimir como JPEG.
     * @param {File} file
     * @param {number} maxWidth - Ancho máximo en px (defecto 400)
     * @param {number} maxHeight - Alto máximo en px (defecto 400)
     * @param {number} quality - Calidad JPEG 0-1 (defecto 0.8)
     * @returns {Promise<string>} data URL base64 (image/jpeg)
     */
    async _processImage(file, maxWidth = 400, maxHeight = 400, quality = 0.8) {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo seleccionado no es una imagen.');
        }

        // Validar tamaño (máx 10 MB)
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('La imagen es demasiado grande (máximo 10 MB).');
        }

        // Leer fichero como data URL
        const rawDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Error leyendo la imagen.'));
            reader.readAsDataURL(file);
        });

        // Crear Image y esperar carga
        const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Error cargando la imagen.'));
            image.src = rawDataUrl;
        });

        // Calcular dimensiones escaladas manteniendo aspect ratio
        const resize = (mw, mh) => {
            let w = img.width;
            let h = img.height;
            if (w > mw || h > mh) {
                const ratio = Math.min(mw / w, mh / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            return { w, h };
        };

        // Dibujar en canvas y obtener JPEG
        const toJpeg = (w, h, q) => {
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            return canvas.toDataURL('image/jpeg', q);
        };

        // Intento 1: dimensiones y calidad normales
        let dims = resize(maxWidth, maxHeight);
        let result = toJpeg(dims.w, dims.h, quality);

        // Si el resultado es muy grande (>200KB ≈ 270k chars base64), reducir calidad
        if (result.length > 270000) {
            result = toJpeg(dims.w, dims.h, 0.5);
        }

        // Si sigue siendo grande, reducir dimensiones
        if (result.length > 270000) {
            dims = resize(200, 200);
            result = toJpeg(dims.w, dims.h, 0.5);
        }

        return result;
    },

    /**
     * Configurar el widget de imagen en el formulario de edición.
     * @param {Object} sheetData - Datos de la hoja (puede contener .imagen)
     */
    _setupImageWidget(sheetData) {
        const container = document.getElementById('imagen-container');
        if (!container) return;

        let currentImagen = sheetData.imagen || null;
        let imageTouched = false;

        // Exponer getter en el formulario para que el submit handler lo lea
        const form = document.getElementById('sheet-form');
        if (form) {
            form._getImagen = () => ({ touched: imageTouched, value: currentImagen });
        }

        const self = this;

        const renderWidget = () => {
            if (currentImagen) {
                // Estado: hay imagen → mostrar preview + botones
                container.innerHTML = `
                    <div class="d-flex align-items-start gap-3">
                        <img src="${currentImagen}" alt="Preview"
                             class="img-thumbnail" style="max-height:120px; max-width:160px; object-fit:contain;">
                        <div class="d-flex flex-column gap-1">
                            <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-change-imagen">
                                <i class="bi bi-arrow-repeat me-1"></i>Cambiar
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" id="btn-remove-imagen">
                                <i class="bi bi-trash me-1"></i>Quitar
                            </button>
                        </div>
                    </div>`;

                document.getElementById('btn-remove-imagen').addEventListener('click', () => {
                    currentImagen = null;
                    imageTouched = true;
                    renderWidget();
                });

                document.getElementById('btn-change-imagen').addEventListener('click', () => {
                    const tmpInput = document.createElement('input');
                    tmpInput.type = 'file';
                    tmpInput.accept = 'image/*';
                    tmpInput.addEventListener('change', async () => {
                        const file = tmpInput.files[0];
                        if (!file) return;
                        try {
                            currentImagen = await self._processImage(file);
                            imageTouched = true;
                            renderWidget();
                        } catch (err) {
                            showToast('Error', err.message, 'error');
                        }
                    });
                    tmpInput.click();
                });
            } else {
                // Estado: sin imagen → mostrar input file
                container.innerHTML = `
                    <input type="file" class="form-control" id="input-imagen" accept="image/*">
                    <div class="form-text">Formato: JPG, PNG o similar. Se redimensiona automaticamente.</div>`;

                document.getElementById('input-imagen').addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                        currentImagen = await self._processImage(file);
                        imageTouched = true;
                        renderWidget();
                    } catch (err) {
                        showToast('Error', err.message, 'error');
                    }
                });
            }
        };

        renderWidget();
    },

    // ==========================================
    // VISTA: Configuración del hospital
    // ==========================================
    renderConfig(container) {
        const config = HospitalConfig.get() || {};

        container.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="#/">Inicio</a></li>
                            <li class="breadcrumb-item active">Configuraci\u00f3n</li>
                        </ol>
                    </nav>

                    <div class="card shadow-sm">
                        <div class="card-header">
                            <h3 class="card-title mb-0">
                                <i class="bi bi-gear me-2"></i>Configuraci\u00f3n del hospital
                            </h3>
                        </div>
                        <div class="card-body">
                            <p class="text-secondary mb-4">
                                Estos datos aparecer\u00e1n en la cabecera del PDF generado. Todos los campos son opcionales.
                            </p>
                            <form id="config-form">
                                <div class="mb-3">
                                    <label for="config-nombre" class="form-label">
                                        <i class="bi bi-building me-1"></i>Nombre del hospital
                                    </label>
                                    <input type="text" class="form-control" id="config-nombre"
                                           value="${this._escapeAttr(config.nombre_hospital || '')}"
                                           placeholder="Ej: Hospital Universitario La Paz">
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">
                                        <i class="bi bi-image me-1"></i>Logo del hospital (opcional)
                                    </label>
                                    <div id="logo-container"></div>
                                </div>

                                <div class="mb-3">
                                    <label for="config-telefono" class="form-label">
                                        <i class="bi bi-telephone me-1"></i>Tel\u00e9fono
                                    </label>
                                    <input type="text" class="form-control" id="config-telefono"
                                           value="${this._escapeAttr(config.telefono || '')}"
                                           placeholder="Ej: 91 123 45 67">
                                </div>

                                <div class="mb-3">
                                    <label for="config-email" class="form-label">
                                        <i class="bi bi-envelope me-1"></i>Correo electr\u00f3nico
                                    </label>
                                    <input type="email" class="form-control" id="config-email"
                                           value="${this._escapeAttr(config.email || '')}"
                                           placeholder="Ej: farmacia@hospital.es">
                                </div>

                                <hr>
                                <div class="d-flex gap-2">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="bi bi-check-circle me-2"></i>Guardar configuraci\u00f3n
                                    </button>
                                    <button type="button" class="btn btn-outline-danger" id="btn-clear-config">
                                        <i class="bi bi-trash me-2"></i>Borrar configuraci\u00f3n
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="card mt-3 shadow-sm">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-arrow-left-right me-2"></i>Importar / Exportar configuraci\u00f3n
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="d-flex gap-2 align-items-center">
                                <button id="btn-export-config" class="btn btn-outline-secondary">
                                    <i class="bi bi-download me-1"></i>Exportar
                                </button>
                                <label class="btn btn-outline-secondary">
                                    <i class="bi bi-upload me-1"></i>Importar
                                    <input type="file" id="import-config-file" accept=".json" class="d-none">
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        // Configurar widget de logo
        this._setupLogoWidget(config);

        // Guardar configuración
        document.getElementById('config-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const newConfig = {
                nombre_hospital: document.getElementById('config-nombre').value.trim(),
                telefono: document.getElementById('config-telefono').value.trim(),
                email: document.getElementById('config-email').value.trim()
            };

            // Recoger logo del widget
            const logoState = document.getElementById('config-form')._getLogo?.();
            if (logoState?.touched) {
                newConfig.logo = logoState.value;
            } else {
                newConfig.logo = config.logo || null;
            }

            try {
                HospitalConfig.save(newConfig);
                showToast('Guardada', 'Configuraci\u00f3n del hospital guardada.', 'success');
            } catch (err) {
                showToast('Error', err.message, 'error');
            }
        });

        // Borrar configuración
        document.getElementById('btn-clear-config').addEventListener('click', () => {
            if (!confirm('\u00bfSeguro que desea borrar toda la configuraci\u00f3n del hospital?')) return;
            HospitalConfig.clear();
            showToast('Borrada', 'Configuraci\u00f3n eliminada.', 'success');
            // Recargar la vista
            this.renderConfig(container);
        });

        // Exportar
        document.getElementById('btn-export-config').addEventListener('click', () => {
            try {
                HospitalConfig.exportJSON();
                showToast('Exportada', 'Configuraci\u00f3n exportada como JSON.', 'success');
            } catch (err) {
                showToast('Error', err.message, 'error');
            }
        });

        // Importar
        document.getElementById('import-config-file').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                await HospitalConfig.importJSON(file);
                showToast('Importada', 'Configuraci\u00f3n importada correctamente.', 'success');
                // Recargar la vista
                this.renderConfig(container);
            } catch (err) {
                showToast('Error', err.message, 'error');
            }
            e.target.value = '';
        });
    },

    /**
     * Configurar el widget de logo en el formulario de configuración.
     * Similar a _setupImageWidget pero para el logo del hospital.
     * @param {Object} configData - Datos de configuración (puede contener .logo)
     */
    _setupLogoWidget(configData) {
        const container = document.getElementById('logo-container');
        if (!container) return;

        let currentLogo = configData.logo || null;
        let logoTouched = false;

        // Exponer getter en el formulario
        const form = document.getElementById('config-form');
        if (form) {
            form._getLogo = () => ({ touched: logoTouched, value: currentLogo });
        }

        const self = this;

        const renderWidget = () => {
            if (currentLogo) {
                container.innerHTML = `
                    <div class="d-flex align-items-start gap-3">
                        <img src="${currentLogo}" alt="Logo preview"
                             class="img-thumbnail" style="max-height:80px; max-width:120px; object-fit:contain;">
                        <div class="d-flex flex-column gap-1">
                            <button type="button" class="btn btn-sm btn-outline-secondary" id="btn-change-logo">
                                <i class="bi bi-arrow-repeat me-1"></i>Cambiar
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger" id="btn-remove-logo">
                                <i class="bi bi-trash me-1"></i>Quitar
                            </button>
                        </div>
                    </div>`;

                document.getElementById('btn-remove-logo').addEventListener('click', () => {
                    currentLogo = null;
                    logoTouched = true;
                    renderWidget();
                });

                document.getElementById('btn-change-logo').addEventListener('click', () => {
                    const tmpInput = document.createElement('input');
                    tmpInput.type = 'file';
                    tmpInput.accept = 'image/*';
                    tmpInput.addEventListener('change', async () => {
                        const file = tmpInput.files[0];
                        if (!file) return;
                        try {
                            currentLogo = await self._processImage(file, 200, 100);
                            logoTouched = true;
                            renderWidget();
                        } catch (err) {
                            showToast('Error', err.message, 'error');
                        }
                    });
                    tmpInput.click();
                });
            } else {
                container.innerHTML = `
                    <input type="file" class="form-control" id="input-logo" accept="image/*">
                    <div class="form-text">Formato: JPG, PNG o similar. Se redimensiona autom\u00e1ticamente (m\u00e1x. 200x100 px).</div>`;

                document.getElementById('input-logo').addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                        currentLogo = await self._processImage(file, 200, 100);
                        logoTouched = true;
                        renderWidget();
                    } catch (err) {
                        showToast('Error', err.message, 'error');
                    }
                });
            }
        };

        renderWidget();
    }
};
