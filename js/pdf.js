// pdf.js - Generación de PDF con jsPDF + html2canvas
// Layout adaptativo: columnas paralelas cuando es posible para caber en 2 páginas.
// Mantiene siempre el orden de las secciones.

const PDFGenerator = {
    /**
     * Imprimir la vista actual (usa CSS @media print)
     */
    print() {
        window.print();
    },

    /**
     * Iconos SVG inline para cada sección del PDF.
     * Se renderizan con html2canvas, no necesitan ficheros externos.
     */
    SECTION_ICONS: {
        que_es_para_que: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1B2A4A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M9 6V4a3 3 0 0 1 6 0v2"/><circle cx="12" cy="12" r="2"/></svg>',

        administracion: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1B2A4A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',

        olvido_dosis: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1B2A4A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="#1B2A4A"/></svg>',

        efectos_adversos: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1B2A4A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><circle cx="12" cy="17" r="0.5" fill="#1B2A4A"/></svg>',

        interacciones: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1B2A4A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>',

        excipientes: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1B2A4A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>',

        conservacion: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1B2A4A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 1 1 4 0z"/></svg>',

        observaciones: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1B2A4A" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/></svg>'
    },

    // ==========================================
    // Constantes de layout
    // ==========================================
    LAYOUT: {
        PW: 210,             // page width mm
        PH: 297,             // page height mm
        MARGIN_TOP: 15,
        MARGIN_BOTTOM: 18,
        MARGIN_LEFT: 8,      // margen lateral mm
        MARGIN_RIGHT: 8,
        GAP: 4,              // separación entre columnas mm
        CONTAINER_W: 680,    // ancho contenedor px (columna única)
        SCALE: 2             // html2canvas scale
    },

    /**
     * Descargar PDF con layout adaptativo.
     * 1. Mide todas las secciones en columna única
     * 2. Si no cabe en 2 páginas, planifica emparejamiento de secciones cortas
     * 3. Renderiza según el plan (columna única o pares lado a lado)
     */
    async download(sheetId, patientName) {
        try {
            showLoading('Generando PDF...');

            const sheet = await Storage.get(sheetId);
            if (!sheet) {
                hideLoading();
                showToast('Error', 'Hoja no encontrada.', 'error');
                return;
            }

            await this._loadLibraries();

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const L = this.LAYOUT;
            const USABLE_H = L.PH - L.MARGIN_TOP - L.MARGIN_BOTTOM;
            const USABLE_W = L.PW - L.MARGIN_LEFT - L.MARGIN_RIGHT;
            const pxToMm_full = L.PW / (L.CONTAINER_W * L.SCALE);

            // Ancho de cada columna cuando se usan 2 columnas (en px)
            const HALF_CONTAINER_W = Math.floor((L.CONTAINER_W - 20) / 2);
            // Factor de conversión para media columna: cada media columna → ocupa la mitad del ancho útil
            const colWidthMm = (USABLE_W - L.GAP) / 2;
            const pxToMm_half = colWidthMm / (HALF_CONTAINER_W * L.SCALE);

            let currentY = L.MARGIN_TOP;

            // ==========================================
            // 1. CABECERA
            // ==========================================
            const hospitalConfig = (typeof HospitalConfig !== 'undefined') ? HospitalConfig.get() : null;

            let headerHtml = '<div style="padding: 8px 0 12px 0; border-bottom: 3px solid #1B2A4A; margin-bottom: 4px;">';
            headerHtml += '<div style="display:flex; align-items:center; justify-content:space-between;">';

            // Lado izquierdo: imagen del medicamento + título
            headerHtml += '<div style="display:flex; align-items:center;">';
            if (sheet.imagen) {
                headerHtml += '<img src="' + sheet.imagen + '" style="max-height:55px; max-width:70px; object-fit:contain; margin-right:14px; border-radius:6px;" />';
            }
            headerHtml += '<div>';
            headerHtml += '<div style="font-size:24px; color:#1B2A4A; font-weight:700; letter-spacing:0.5px;">' + this._esc(sheet.principio_activo || '') + '</div>';
            headerHtml += '<div style="font-size:11px; color:#6B7280; margin-top:3px;">Hoja informativa para el paciente</div>';
            headerHtml += '</div></div>';

            // Lado derecho: info del hospital (solo si hay configuración)
            if (hospitalConfig) {
                headerHtml += '<div style="display:flex; align-items:center;">';

                // Textos del hospital (alineados a la derecha)
                headerHtml += '<div style="text-align:right; margin-right:' + (hospitalConfig.logo ? '10' : '0') + 'px;">';
                headerHtml += '<div style="font-size:9px; color:#1B2A4A; font-weight:700;">Servicio de Farmacia Hospitalaria</div>';
                if (hospitalConfig.nombre_hospital) {
                    headerHtml += '<div style="font-size:9px; color:#1F2937;">' + this._esc(hospitalConfig.nombre_hospital) + '</div>';
                }
                if (hospitalConfig.telefono) {
                    headerHtml += '<div style="font-size:8px; color:#6B7280;">Tel: ' + this._esc(hospitalConfig.telefono) + '</div>';
                }
                if (hospitalConfig.email) {
                    headerHtml += '<div style="font-size:8px; color:#6B7280;">' + this._esc(hospitalConfig.email) + '</div>';
                }
                headerHtml += '</div>';

                // Logo del hospital
                if (hospitalConfig.logo) {
                    headerHtml += '<img src="' + hospitalConfig.logo + '" style="max-height:45px; max-width:80px; object-fit:contain;" />';
                }

                headerHtml += '</div>';
            }

            headerHtml += '</div></div>';

            const headerCanvas = await this._renderToCanvas(headerHtml, L.CONTAINER_W, L.SCALE);
            const headerH = headerCanvas.height * pxToMm_full;
            const headerImgData = headerCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(headerImgData, 'JPEG', 0, currentY, headerCanvas.width * pxToMm_full, headerH);
            currentY += headerH + 2;

            // ==========================================
            // 2. PREPARAR SECCIONES
            // ==========================================
            const fields = [
                { key: 'que_es_para_que', label: '\u00bfQu\u00e9 es y para qu\u00e9 se utiliza?' },
                { key: 'administracion', label: '\u00bfC\u00f3mo se administra?' },
                { key: 'olvido_dosis', label: '\u00bfQu\u00e9 hacer si olvida una dosis?' },
                { key: 'efectos_adversos', label: 'Posibles efectos adversos' },
                { key: 'interacciones', label: 'Interacciones con otros medicamentos' },
                { key: 'excipientes', label: 'Excipientes' },
                { key: 'conservacion', label: '\u00bfC\u00f3mo se debe conservar?' },
                { key: 'observaciones', label: 'Observaciones importantes' }
            ];

            // Filtrar secciones con contenido
            const activeSections = fields.filter(f => sheet[f.key]);

            // Generar HTML y medir alturas en columna única
            const sectionData = [];
            for (const field of activeSections) {
                const value = sheet[field.key];
                const html = this._buildSectionHtml(field, value);
                const canvas = await this._renderToCanvas(html, L.CONTAINER_W, L.SCALE);
                const heightMm = canvas.height * pxToMm_full;
                sectionData.push({
                    field,
                    value,
                    html,
                    canvas,
                    heightMm,
                    imgData: canvas.toDataURL('image/jpeg', 0.95),
                    imgW: canvas.width * pxToMm_full
                });
            }

            // ==========================================
            // 3. PLANIFICAR LAYOUT
            // ==========================================
            const spaceAfterHeader = USABLE_H - (currentY - L.MARGIN_TOP);
            const totalSingleH = sectionData.reduce((sum, s) => sum + s.heightMm, 0);

            // ¿Cabe todo en 2 páginas con columna única?
            const fitsInTwoPages = totalSingleH <= spaceAfterHeader + USABLE_H;

            let layoutPlan;

            if (fitsInTwoPages) {
                // Layout simple: todas en columna única
                layoutPlan = sectionData.map((_, i) => ({ type: 'single', indices: [i] }));
            } else {
                // Intentar emparejar secciones consecutivas cortas
                layoutPlan = await this._planDualColumnLayout(
                    sectionData, spaceAfterHeader, USABLE_H,
                    HALF_CONTAINER_W, L.SCALE, pxToMm_half
                );
            }

            // ==========================================
            // 4. RENDERIZAR SEGÚN EL PLAN
            // ==========================================
            for (const item of layoutPlan) {
                if (item.type === 'single') {
                    const s = sectionData[item.indices[0]];

                    // ¿Cabe en la página actual?
                    if (currentY + s.heightMm > L.PH - L.MARGIN_BOTTOM) {
                        pdf.addPage();
                        currentY = L.MARGIN_TOP;
                    }

                    pdf.addImage(s.imgData, 'JPEG', 0, currentY, s.imgW, s.heightMm);
                    currentY += s.heightMm;

                } else if (item.type === 'pair') {
                    const leftData = sectionData[item.indices[0]];
                    const rightData = sectionData[item.indices[1]];

                    // Renderizar ambas secciones a mitad de ancho
                    const leftCanvas = await this._renderToCanvas(leftData.html, HALF_CONTAINER_W, L.SCALE);
                    const rightCanvas = await this._renderToCanvas(rightData.html, HALF_CONTAINER_W, L.SCALE);

                    const leftH = leftCanvas.height * pxToMm_half;
                    const rightH = rightCanvas.height * pxToMm_half;
                    const pairH = Math.max(leftH, rightH);

                    // ¿Cabe en la página actual?
                    if (currentY + pairH > L.PH - L.MARGIN_BOTTOM) {
                        pdf.addPage();
                        currentY = L.MARGIN_TOP;
                    }

                    const leftImgData = leftCanvas.toDataURL('image/jpeg', 0.95);
                    const rightImgData = rightCanvas.toDataURL('image/jpeg', 0.95);

                    // Columna izquierda
                    pdf.addImage(leftImgData, 'JPEG', L.MARGIN_LEFT, currentY, colWidthMm, leftH);
                    // Columna derecha
                    pdf.addImage(rightImgData, 'JPEG', L.MARGIN_LEFT + colWidthMm + L.GAP, currentY, colWidthMm, rightH);

                    currentY += pairH;
                }
            }

            // ==========================================
            // 5. ESQUEMA DE ADMINISTRACIÓN + Y RECUERDE
            // ==========================================
            // Pre-renderizar ambos bloques para medir alturas
            const scheduleHtml = this._buildScheduleHtml(patientName);
            const scheduleCanvas = await this._renderToCanvas(scheduleHtml, L.CONTAINER_W, L.SCALE);
            const scheduleH = scheduleCanvas.height * pxToMm_full;

            const adviceHtml = this._buildAdviceHtml();
            const adviceCanvas = await this._renderToCanvas(adviceHtml, L.CONTAINER_W, L.SCALE);
            const adviceH = adviceCanvas.height * pxToMm_full;

            const totalEndBlockH = scheduleH + 3 + adviceH;
            const remainingSpace = L.PH - L.MARGIN_BOTTOM - currentY;

            // Solo crear página nueva si no cabe en el espacio actual
            if (totalEndBlockH > remainingSpace) {
                pdf.addPage();
                currentY = L.MARGIN_TOP;
            }

            // 5a. Esquema individualizado de administración
            const scheduleImgData = scheduleCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(scheduleImgData, 'JPEG', 0, currentY, scheduleCanvas.width * pxToMm_full, scheduleH);
            currentY += scheduleH + 3;

            // 5b. Bloque "Y recuerde..."
            // Si por alguna razón no cabe (ej. página ya llena), saltar
            if (currentY + adviceH > L.PH - L.MARGIN_BOTTOM) {
                pdf.addPage();
                currentY = L.MARGIN_TOP;
            }

            const adviceImgData = adviceCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(adviceImgData, 'JPEG', 0, currentY, adviceCanvas.width * pxToMm_full, adviceH);
            currentY += adviceH;

            // ==========================================
            // 6. PIE DE PAGINA en todas las paginas
            // ==========================================
            const totalPages = pdf.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);

                // Linea separadora
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.3);
                pdf.line(20, L.PH - 13, L.PW - 20, L.PH - 13);

                pdf.setFontSize(7);
                pdf.setTextColor(150, 150, 150);
                pdf.setFont('helvetica', 'normal');
                let footerText = 'Servicio de Farmacia Hospitalaria';
                if (hospitalConfig && hospitalConfig.nombre_hospital) {
                    footerText += '. ' + hospitalConfig.nombre_hospital;
                }
                footerText += ' | ' + new Date().toLocaleDateString('es-ES') + ' | Pag. ' + i + '/' + totalPages;
                pdf.text(
                    footerText,
                    L.PW / 2, L.PH - 9,
                    { align: 'center' }
                );
            }

            // ==========================================
            // 7. DESCARGAR
            // ==========================================
            const filename = 'hoja_' + (sheet.principio_activo || 'medicamento').replace(/[^a-zA-Z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00c1\u00c9\u00cd\u00d3\u00da\u00d1]/g, '_') + '.pdf';
            pdf.save(filename);

            hideLoading();
            showToast('PDF generado', 'Descargado como ' + filename, 'success');

        } catch (err) {
            hideLoading();
            console.error('Error generando PDF:', err);
            showToast('Error', 'No se pudo generar el PDF. Use "Imprimir" como alternativa.', 'error');
        }
    },

    /**
     * Planificar layout con columnas duales para intentar que quepa en 2 páginas.
     * Algoritmo greedy: empareja secciones consecutivas cortas, priorizando
     * los pares que más espacio ahorran. NUNCA cambia el orden.
     *
     * @param {Array} sectionData - datos de cada sección con heightMm y html
     * @param {number} firstPageSpace - espacio disponible en la primera página (mm)
     * @param {number} fullPageSpace - espacio disponible en páginas completas (mm)
     * @param {number} halfContainerW - ancho px de media columna
     * @param {number} scale - html2canvas scale
     * @param {number} pxToMm_half - factor mm/px para media columna
     * @returns {Array} layoutPlan - array de { type: 'single'|'pair', indices: [i] o [i,j] }
     */
    async _planDualColumnLayout(sectionData, firstPageSpace, fullPageSpace, halfContainerW, scale, pxToMm_half) {
        const n = sectionData.length;

        // Umbral: una sección es candidata a emparejarse si su altura
        // en columna única es menor que el 40% de una página
        const SHORT_THRESHOLD = fullPageSpace * 0.40;

        // Marcar cuáles son "cortas" en columna única
        const isShort = sectionData.map(s => s.heightMm <= SHORT_THRESHOLD);

        // Encontrar pares consecutivos de secciones cortas
        const candidatePairs = [];
        for (let i = 0; i < n - 1; i++) {
            if (isShort[i] && isShort[i + 1]) {
                candidatePairs.push([i, i + 1]);
            }
        }

        if (candidatePairs.length === 0) {
            // No hay pares posibles, todo en columna única
            return sectionData.map((_, i) => ({ type: 'single', indices: [i] }));
        }

        // Medir alturas reales de los pares candidatos renderizados a mitad de ancho
        const pairMeasurements = await this._measurePairs(candidatePairs, sectionData, halfContainerW, scale, pxToMm_half);

        // Seleccionar pares con greedy (mayor ahorro primero, sin solapar)
        let selectedPairs = this._selectBestPairs(pairMeasurements);

        // Simular para ver cuántas páginas se necesitan
        let pages = this._simulateLayout(sectionData, selectedPairs, firstPageSpace, fullPageSpace);

        // Si aún no cabe en 2, intentar con umbral más agresivo (55%)
        if (pages > 2) {
            const AGGRESSIVE_THRESHOLD = fullPageSpace * 0.55;
            const aggressivePairs = [];
            const measuredKeys = new Set(candidatePairs.map(p => p[0] + '-' + p[1]));

            for (let i = 0; i < n - 1; i++) {
                if (sectionData[i].heightMm <= AGGRESSIVE_THRESHOLD &&
                    sectionData[i + 1].heightMm <= AGGRESSIVE_THRESHOLD) {
                    const key = i + '-' + (i + 1);
                    if (!measuredKeys.has(key)) {
                        aggressivePairs.push([i, i + 1]);
                    }
                }
            }

            if (aggressivePairs.length > 0) {
                const moreMeasurements = await this._measurePairs(aggressivePairs, sectionData, halfContainerW, scale, pxToMm_half);
                pairMeasurements.push(...moreMeasurements);
            }

            selectedPairs = this._selectBestPairs(pairMeasurements);
            pages = this._simulateLayout(sectionData, selectedPairs, firstPageSpace, fullPageSpace);
        }

        // Construir plan final manteniendo el orden
        return this._buildPlanFromPairs(sectionData, selectedPairs);
    },

    /**
     * Medir alturas de pares de secciones renderizadas a mitad de ancho.
     */
    async _measurePairs(pairs, sectionData, halfContainerW, scale, pxToMm_half) {
        const measurements = [];
        for (const [i, j] of pairs) {
            const canvas_i = await this._renderToCanvas(sectionData[i].html, halfContainerW, scale);
            const canvas_j = await this._renderToCanvas(sectionData[j].html, halfContainerW, scale);

            const h_i = canvas_i.height * pxToMm_half;
            const h_j = canvas_j.height * pxToMm_half;
            const pairH = Math.max(h_i, h_j);
            const savedH = sectionData[i].heightMm + sectionData[j].heightMm - pairH;

            measurements.push({ pair: [i, j], pairH, savedH });
        }
        return measurements;
    },

    /**
     * Seleccionar pares que no se solapen, priorizando mayor ahorro.
     */
    _selectBestPairs(pairMeasurements) {
        // Ordenar por ahorro descendente
        const sorted = [...pairMeasurements].sort((a, b) => b.savedH - a.savedH);

        const paired = new Set();
        const selected = [];

        for (const pm of sorted) {
            const [i, j] = pm.pair;
            if (pm.savedH <= 0) continue;
            if (paired.has(i) || paired.has(j)) continue;
            selected.push(pm);
            paired.add(i);
            paired.add(j);
        }

        return selected;
    },

    /**
     * Simular cuántas páginas ocupa un layout con los pares dados.
     */
    _simulateLayout(sectionData, selectedPairs, firstPageSpace, fullPageSpace) {
        const n = sectionData.length;
        const pairedSet = new Set();
        const pairMap = {};
        for (const p of selectedPairs) {
            pairedSet.add(p.pair[0]);
            pairedSet.add(p.pair[1]);
            pairMap[p.pair[0]] = p;
        }

        let pages = 1;
        let usedY = fullPageSpace - firstPageSpace; // lo ya ocupado en pag 1 (cabecera)

        let i = 0;
        while (i < n) {
            let blockH;

            if (pairedSet.has(i) && pairMap[i]) {
                blockH = pairMap[i].pairH;
                i += 2;
            } else if (pairedSet.has(i)) {
                // Segundo de un par ya procesado
                i++;
                continue;
            } else {
                blockH = sectionData[i].heightMm;
                i++;
            }

            if (usedY + blockH > fullPageSpace) {
                pages++;
                usedY = 0;
            }
            usedY += blockH;
        }

        return pages;
    },

    /**
     * Construir el plan de layout final a partir de los pares seleccionados.
     * Mantiene el orden de las secciones.
     */
    _buildPlanFromPairs(sectionData, selectedPairs) {
        const n = sectionData.length;
        const pairedSet = new Set();
        const pairMap = {};
        for (const p of selectedPairs) {
            pairedSet.add(p.pair[0]);
            pairedSet.add(p.pair[1]);
            pairMap[p.pair[0]] = p;
        }

        const plan = [];
        let i = 0;
        while (i < n) {
            if (pairedSet.has(i) && pairMap[i]) {
                plan.push({ type: 'pair', indices: [i, i + 1] });
                i += 2;
            } else if (pairedSet.has(i)) {
                // Segundo de un par, ya incluido en el anterior
                i++;
            } else {
                plan.push({ type: 'single', indices: [i] });
                i++;
            }
        }

        return plan;
    },

    /**
     * Construir HTML de una sección individual con icono y contenido.
     */
    _buildSectionHtml(field, value) {
        const icon = this.SECTION_ICONS[field.key] || '';

        let html = '<div style="margin: 6px 0 10px 0; padding: 10px 14px; background: #F5F7FA; border-radius: 8px; border-left: 4px solid #1B2A4A;">';

        // Cabecera de sección con icono
        html += '<div style="display:flex; align-items:center; margin-bottom:8px;">';
        if (icon) {
            html += '<div style="margin-right:8px; flex-shrink:0;">' + icon + '</div>';
        }
        html += '<div style="font-size:12px; color:#1B2A4A; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">';
        html += this._esc(field.label);
        html += '</div></div>';

        // Contenido
        if (value) {
            const paragraphs = value.split('\n');
            for (const p of paragraphs) {
                const trimmed = p.trim();
                if (!trimmed) {
                    html += '<div style="height:5px;"></div>';
                    continue;
                }

                if (/^[-\u2022*+]\s/.test(trimmed)) {
                    const bulletText = trimmed.replace(/^[-\u2022*+]\s+/, '');
                    html += '<div style="font-size:11px; line-height:1.6; padding-left:16px; margin-bottom:2px;">';
                    html += '<span style="color:#1B2A4A; margin-right:4px;">\u2022</span>' + this._esc(bulletText);
                    html += '</div>';
                } else {
                    html += '<div style="font-size:11px; line-height:1.6; margin-bottom:2px;">';
                    html += this._esc(trimmed);
                    html += '</div>';
                }
            }
        }

        html += '</div>';
        return html;
    },

    /**
     * Construir HTML del esquema individualizado de administración.
     * Tabla horaria con iconos de momento del día, dos filas para marcar tomas,
     * campo de paciente y observaciones.
     */
    _buildScheduleHtml(patientName) {
        // SVG icons para momentos del día
        const iconSun = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#F59E0B" stroke="#F59E0B" stroke-width="1"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
        const iconCoffee = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#6B4423" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M6 2v3M10 2v3M14 2v3"/></svg>';
        const iconLunch = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#EF6C00" stroke="#EF6C00" stroke-width="0.5"><circle cx="12" cy="12" r="9" fill="#FFF3E0" stroke="#EF6C00"/><circle cx="12" cy="12" r="5" fill="#FFCC80"/><path d="M8 12h8" stroke="#EF6C00" stroke-width="1"/></svg>';
        const iconMoon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="#5C6BC0" stroke="#5C6BC0" stroke-width="1"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
        const iconBed = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4A5568" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v11M21 7v11M3 18h18"/><path d="M3 11h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3z"/><circle cx="7" cy="9" r="2"/></svg>';

        // Horas (todas de 8 a 24)
        const hours = ['8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24'];
        // Iconos sobre columnas especiales
        const topIcons = {
            0: iconSun,       // 8h - mañana
            1: iconCoffee,    // 9h - desayuno
            6: iconLunch,     // 14h - comida
            13: iconMoon,     // 21h - noche
            16: iconBed       // 24h - dormir
        };

        const cellW = 32; // px por celda (17 columnas)

        let html = '<div style="padding: 10px 0;">';

        // Título
        html += '<div style="text-align:center; margin-bottom:12px;">';
        html += '<div style="font-size:14px; font-weight:700; color:#1B2A4A; text-decoration:underline; text-transform:uppercase; letter-spacing:1px;">';
        html += 'Esquema individualizado de administraci\u00f3n';
        html += '</div></div>';

        // Campo PACIENTE
        html += '<div style="margin-bottom:14px; font-size:11px;">';
        html += '<span style="font-weight:700; text-decoration:underline;">PACIENTE:</span>';
        if (patientName) {
            html += '<span style="margin-left:8px;">' + this._esc(patientName) + '</span>';
        } else {
            html += '<span style="display:inline-block; width:80%; border-bottom:1px solid #333; margin-left:8px;">&nbsp;</span>';
        }
        html += '</div>';

        // Fila de iconos superiores
        html += '<div style="display:flex; align-items:flex-end; margin-bottom:2px; padding-left:28px;">';
        for (let i = 0; i < hours.length; i++) {
            html += '<div style="width:' + cellW + 'px; text-align:center; height:22px; display:flex; align-items:flex-end; justify-content:center;">';
            if (topIcons[i]) {
                html += topIcons[i];
            }
            html += '</div>';
        }
        html += '</div>';

        // Tabla de horas
        html += '<table style="border-collapse:collapse; margin-left:28px; margin-bottom:6px;">';

        // Fila de horas
        html += '<tr>';
        for (let i = 0; i < hours.length; i++) {
            const bg = (i === 1 || i === 6 || i === 13 || i === 16) ? '#F5F5F5' : '#fff';
            html += '<td style="width:' + cellW + 'px; height:22px; border:1px solid #999; text-align:center; font-size:10px; font-weight:600; background:' + bg + ';">';
            html += hours[i];
            html += '</td>';
        }
        html += '</tr>';

        // Fila de tomas (vacía para rellenar a mano)
        html += '<tr>';
        for (let i = 0; i < hours.length; i++) {
            html += '<td style="width:' + cellW + 'px; height:22px; border:1px solid #999; background:#fff;"></td>';
        }
        html += '</tr>';

        html += '</table>';

        // Campo OBSERVACIONES con líneas
        html += '<div style="margin-top:14px; font-size:11px;">';
        html += '<div style="font-weight:600; margin-bottom:6px;">OBSERVACIONES:</div>';
        for (let i = 0; i < 2; i++) {
            html += '<div style="border-bottom:1px solid #666; height:20px; margin-bottom:4px;"></div>';
        }
        html += '</div>';

        html += '</div>';
        return html;
    },

    /**
     * Construir HTML del bloque "Y recuerde..." con consejos generales.
     */
    _buildAdviceHtml() {
        const tips = [
            'Tome su medicamento exactamente como le ha indicado su m\u00e9dico.',
            'Este medicamento se le ha prescrito a usted personalmente y no debe ser utilizado por otras personas, ya que puede perjudicarles aunque tengan s\u00edntomas similares a los suyos.',
            'Informe a su m\u00e9dico o farmac\u00e9utico si est\u00e1 tomando o ha tomado recientemente otros medicamentos, incluso los adquiridos sin receta.',
            'Mantenga sus medicamentos fuera de la vista y del alcance de los ni\u00f1os.',
            'No utilice su medicamento una vez superada su fecha de caducidad (el \u00faltimo d\u00eda del mes indicado en el envase).',
            'Conserve sus medicamentos, siempre que sea posible, en su envase original.',
            'Devuelva la medicaci\u00f3n no utilizada a la farmacia del hospital.'
        ];

        let html = '<div style="padding: 10px 0;">';

        // Título "Y recuerde..."
        html += '<div style="font-size:14px; color:#991B1B; font-weight:700; font-style:italic; margin-bottom:10px;">';
        html += 'Y recuerde.........';
        html += '</div>';

        // Lista de consejos
        for (const tip of tips) {
            html += '<div style="font-size:10px; line-height:1.5; margin-bottom:7px; padding-left:8px; font-weight:normal; color:#1F2937;">';
            html += this._esc(tip);
            html += '</div>';
        }

        // Aviso final en recuadro
        html += '<div style="margin-top:14px; border:3px solid #1B2A4A; padding:10px 16px; text-align:center;">';
        html += '<div style="font-size:14px; font-weight:700; color:#1B2A4A; text-transform:uppercase; letter-spacing:0.5px; line-height:1.6;">';
        html += 'ESTA INFORMACI\u00d3N NO SUSTITUYE AL PROSPECTO<br>';
        html += 'CONSULTE A SU M\u00c9DICO O FARMAC\u00c9UTICO';
        html += '</div></div>';

        html += '</div>';
        return html;
    },

    /**
     * Renderizar HTML a canvas (sin añadir al PDF).
     * Crea un div temporal, lo renderiza con html2canvas, y devuelve el canvas.
     */
    async _renderToCanvas(htmlContent, containerWidth, scale) {
        const div = document.createElement('div');
        div.innerHTML = htmlContent;
        div.style.cssText = [
            'position: fixed',
            'left: 0',
            'top: 0',
            'width: ' + containerWidth + 'px',
            'background: #fff',
            'font-family: Arial, Helvetica, sans-serif',
            'font-size: 12px',
            'line-height: 1.5',
            'color: #1F2937',
            'z-index: -9999',
            'padding: 0 20px'
        ].join('; ');
        document.body.appendChild(div);

        await new Promise(r => setTimeout(r, 50));

        const canvas = await window.html2canvas(div, {
            scale: scale,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: containerWidth,
            windowWidth: containerWidth
        });

        document.body.removeChild(div);
        return canvas;
    },

    /**
     * Cargar html2canvas y jsPDF desde CDN bajo demanda
     */
    async _loadLibraries() {
        const libs = [
            {
                check: () => window.html2canvas,
                src: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
            },
            {
                check: () => window.jspdf,
                src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
            }
        ];

        for (const lib of libs) {
            if (lib.check()) continue;

            if (document.querySelector('script[src="' + lib.src + '"]')) {
                let waited = 0;
                while (!lib.check() && waited < 10000) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    waited += 200;
                }
                if (lib.check()) continue;
            }

            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = lib.src;
                script.crossOrigin = 'anonymous';

                const timeout = setTimeout(() => {
                    reject(new Error('Timeout cargando ' + lib.src));
                }, 15000);

                script.onload = () => { clearTimeout(timeout); resolve(); };
                script.onerror = () => { clearTimeout(timeout); reject(new Error('No se pudo cargar ' + lib.src)); };

                document.head.appendChild(script);
            });
        }
    },

    /**
     * Escapar HTML
     */
    _esc(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
