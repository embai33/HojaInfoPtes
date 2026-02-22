// config.js - Configuración del hospital (localStorage)

const HospitalConfig = {
    STORAGE_KEY: 'hospitalConfig',

    /**
     * Obtener la configuración del hospital.
     * @returns {Object|null} { nombre_hospital, logo, telefono, email } o null si no existe
     */
    get() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            const config = JSON.parse(raw);
            // Verificar que al menos un campo tiene valor
            if (!config.nombre_hospital && !config.logo && !config.telefono && !config.email) {
                return null;
            }
            return config;
        } catch (err) {
            console.error('Error leyendo configuración:', err);
            return null;
        }
    },

    /**
     * Guardar la configuración del hospital.
     * @param {Object} config - { nombre_hospital, logo, telefono, email }
     */
    save(config) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
        } catch (err) {
            throw new Error('Error guardando configuración: ' + err.message);
        }
    },

    /**
     * Borrar toda la configuración.
     */
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * Exportar configuración como fichero JSON.
     */
    exportJSON() {
        const config = this.get();
        if (!config) {
            throw new Error('No hay configuración para exportar.');
        }

        const data = {
            app: 'HojaInfoPtes',
            type: 'hospital_config',
            version: 1,
            exported_at: new Date().toISOString(),
            config: config
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `config_hospital_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Importar configuración desde fichero JSON.
     * @param {File} file - Fichero JSON a importar
     * @returns {Promise}
     */
    importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (data.type !== 'hospital_config') {
                        throw new Error('El fichero no es una configuración de hospital válida.');
                    }

                    if (!data.config || typeof data.config !== 'object') {
                        throw new Error('El fichero no contiene datos de configuración.');
                    }

                    // Guardar solo los campos esperados
                    const config = {
                        nombre_hospital: data.config.nombre_hospital || '',
                        logo: data.config.logo || null,
                        telefono: data.config.telefono || '',
                        email: data.config.email || ''
                    };

                    this.save(config);
                    resolve(config);
                } catch (err) {
                    reject(new Error('Error importando configuración: ' + err.message));
                }
            };

            reader.onerror = () => reject(new Error('Error leyendo el fichero.'));
            reader.readAsText(file);
        });
    }
};
