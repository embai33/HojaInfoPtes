// parser.js - Parser de texto plano/Markdown → secciones de hoja informativa

const Parser = {
    /**
     * Patrones de detección de secciones.
     * Cada sección tiene un key (campo en la BD) y keywords para detectar el título.
     * El orden importa: se procesan en este orden para resolver ambigüedades.
     */
    SECTION_PATTERNS: [
        {
            key: 'principio_activo',
            keywords: ['principio activo', 'principio_activo', 'nombre del medicamento']
        },
        {
            key: 'que_es_para_que',
            keywords: ['qué es y para qué', 'qué es', 'para qué se utiliza', 'para qué sirve', 'indicaciones']
        },
        {
            key: 'administracion',
            keywords: ['administración', 'cómo se administra', 'cómo tomar', 'cómo se toma', 'posología', 'forma de administración']
        },
        {
            key: 'olvido_dosis',
            keywords: ['olvido de dosis', 'olvido dosis', 'dosis olvidada', 'si olvida', 'si se olvida', 'qué hacer si se olvida', 'qué hacer si olvida']
        },
        {
            key: 'efectos_adversos',
            keywords: ['efectos adversos', 'reacciones adversas', 'efectos secundarios', 'efectos no deseados']
        },
        {
            key: 'interacciones',
            keywords: ['interacciones']
        },
        {
            key: 'excipientes',
            keywords: ['excipientes', 'lista de excipientes', 'listado de excipientes']
        },
        {
            key: 'conservacion',
            keywords: ['conservación', 'cómo se debe conservar', 'cómo se conserva', 'cómo conservar', 'condiciones de conservación', 'almacenamiento']
        },
        {
            key: 'observaciones',
            keywords: ['observaciones', 'notas importantes', 'información adicional', 'otras observaciones']
        }
    ],

    /**
     * Parsear texto completo pegado por el usuario.
     * Acepta texto plano o Markdown generado por LLMs.
     * Detecta secciones por títulos y devuelve un objeto con los 9 campos.
     *
     * @param {string} text - Texto completo pegado
     * @returns {{ fields: Object, warnings: string[] }}
     */
    parseText(text) {
        if (!text || !text.trim()) {
            return { fields: {}, warnings: ['El texto está vacío.'] };
        }

        const lines = text.split('\n');
        const warnings = [];

        // Paso 1: Identificar en qué líneas están los títulos de sección
        const sectionStarts = []; // [{lineIndex, key}]

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Saltar líneas que son separadores Markdown (---, ***, ___)
            if (/^[-*_]{3,}\s*$/.test(line)) continue;

            const matchedSection = this._matchSectionTitle(line);
            if (matchedSection) {
                // Evitar duplicados: si ya se detectó esta sección, ignorar
                if (!sectionStarts.some(s => s.key === matchedSection)) {
                    sectionStarts.push({ lineIndex: i, key: matchedSection });
                }
            }
        }

        // Paso 2: Extraer contenido entre títulos
        const fields = {};

        for (let s = 0; s < sectionStarts.length; s++) {
            const current = sectionStarts[s];
            const nextLineIndex = (s + 1 < sectionStarts.length)
                ? sectionStarts[s + 1].lineIndex
                : lines.length;

            // El contenido es todo entre la línea del título +1 y la siguiente sección
            const contentLines = lines.slice(current.lineIndex + 1, nextLineIndex);
            const content = this._cleanContent(contentLines.join('\n')).trim();

            // Para principio_activo, si el contenido es corto (una línea), tomarlo directamente
            // Si no se detectó contenido tras el título, puede que esté en la misma línea
            if (!content && current.key === 'principio_activo') {
                // Intentar extraer de la misma línea (ej: "PRINCIPIO ACTIVO: Ibuprofeno")
                const titleLine = this._stripMarkdown(lines[current.lineIndex].trim());
                const afterColon = titleLine.split(/[:：\-–—]\s*/);
                if (afterColon.length > 1) {
                    fields[current.key] = afterColon.slice(1).join(': ').trim();
                } else {
                    fields[current.key] = '';
                }
            } else {
                fields[current.key] = content;
            }
        }

        // Paso 3: Comprobar secciones no detectadas
        const allKeys = this.SECTION_PATTERNS.map(p => p.key);
        const detectedKeys = Object.keys(fields);

        for (const key of allKeys) {
            if (!detectedKeys.includes(key)) {
                const label = this._keyToLabel(key);
                warnings.push(`No se detectó la sección "${label}".`);
                fields[key] = '';
            }
        }

        // Si no se detectó ninguna sección, advertir
        if (sectionStarts.length === 0) {
            warnings.unshift('No se detectaron secciones en el texto. Verifique que el texto incluye los títulos de sección.');
        }

        return { fields, warnings };
    },

    /**
     * Intentar identificar si una línea es un título de sección.
     * Soporta texto plano, Markdown headers (##), bold (**), numeración, etc.
     * Retorna el key de la sección si coincide, o null si no.
     */
    _matchSectionTitle(line) {
        // Limpiar completamente la línea de formato Markdown y puntuación
        const cleaned = this._stripMarkdown(line).toLowerCase();

        // Líneas vacías o muy largas no son títulos
        if (!cleaned || cleaned.length > 80) return null;

        // Buscar coincidencia con keywords de cada sección
        for (const pattern of this.SECTION_PATTERNS) {
            for (const keyword of pattern.keywords) {
                if (cleaned.includes(keyword.toLowerCase())) {
                    return pattern.key;
                }
            }
        }

        return null;
    },

    /**
     * Eliminar todo formato Markdown y puntuación decorativa de una línea.
     * Útil para limpiar títulos antes de hacer matching con keywords.
     */
    _stripMarkdown(line) {
        return line
            // Markdown headers: ## Título, ### Título, etc.
            .replace(/^#{1,6}\s+/, '')
            // Bold/italic envolvente: **texto**, *texto*, __texto__, _texto_
            .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
            .replace(/_{1,3}(.*?)_{1,3}/g, '$1')
            // Emojis comunes (eliminar)
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}]/gu, '')
            // Numeración al inicio: 1. 2. 3. o 1) 2) 3)
            .replace(/^\d+[.)]\s+/, '')
            // Viñetas Markdown: - item, * item, + item
            .replace(/^[-–—•*+]\s+/, '')
            // Signos de interrogación/exclamación (¿? ¡!)
            .replace(/[¿?¡!]/g, '')
            // Dos puntos al final
            .replace(/[:：]\s*$/, '')
            // Espacios múltiples
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Limpiar contenido Markdown para presentación en texto plano.
     * Convierte Markdown a texto legible preservando la estructura.
     */
    _cleanContent(text) {
        if (!text) return '';

        return text
            // Eliminar separadores Markdown (---, ***, ___)
            .replace(/^[-*_]{3,}\s*$/gm, '')
            // Bold: **texto** → texto
            .replace(/\*{2,3}(.*?)\*{2,3}/g, '$1')
            // Italic: *texto* → texto (cuidado con listas)
            .replace(/(?<!\n)\*([^*\n]+)\*/g, '$1')
            // Bold/italic con underscores: __texto__, _texto_
            .replace(/_{2,3}(.*?)_{2,3}/g, '$1')
            .replace(/(?<![a-zA-Z])_([^_\n]+)_(?![a-zA-Z])/g, '$1')
            // Viñetas Markdown: convertir * item a - item (normalizar)
            .replace(/^\*\s+/gm, '- ')
            // Viñetas +: convertir + item a - item
            .replace(/^\+\s+/gm, '- ')
            // Links Markdown: [texto](url) → texto
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            // Inline code: `código` → código
            .replace(/`([^`]+)`/g, '$1')
            // Emojis (eliminar)
            .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}]/gu, '')
            // Múltiples líneas en blanco → una sola
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    },

    /**
     * Convertir key interno a etiqueta legible
     */
    _keyToLabel(key) {
        const labels = {
            principio_activo: 'Principio activo',
            que_es_para_que: '¿Qué es y para qué se utiliza?',
            conservacion: 'Conservación',
            administracion: 'Administración',
            olvido_dosis: 'Olvido de dosis',
            efectos_adversos: 'Efectos adversos',
            interacciones: 'Interacciones',
            excipientes: 'Excipientes',
            observaciones: 'Observaciones'
        };
        return labels[key] || key;
    }
};
