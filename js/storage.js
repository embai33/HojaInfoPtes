// storage.js - Persistencia con IndexedDB (v2 - sin CIMA)

const Storage = {
    DB_NAME: 'HojaInfoPtesDB',
    DB_VERSION: 2, // Bump de versión para nuevo esquema
    STORE_NAME: 'sheets',
    db: null,

    /**
     * Inicializar IndexedDB
     */
    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Si existe la versión anterior, eliminarla
                if (db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.deleteObjectStore(this.STORE_NAME);
                }

                const store = db.createObjectStore(this.STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('principio_activo', 'principio_activo', { unique: false });
                store.createIndex('created_at', 'created_at', { unique: false });
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                reject(new Error('Error abriendo IndexedDB: ' + event.target.error));
            };
        });
    },

    /**
     * Guardar una nueva hoja
     */
    save(sheet) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            sheet.created_at = sheet.created_at || new Date().toISOString();
            sheet.updated_at = new Date().toISOString();

            const request = store.add(sheet);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Error guardando hoja: ' + request.error));
        });
    },

    /**
     * Actualizar una hoja existente
     */
    update(sheet) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);

            sheet.updated_at = new Date().toISOString();

            const request = store.put(sheet);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error('Error actualizando hoja: ' + request.error));
        });
    },

    /**
     * Obtener una hoja por ID
     */
    get(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readonly');
            const store = tx.objectStore(this.STORE_NAME);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(new Error('Error obteniendo hoja: ' + request.error));
        });
    },

    /**
     * Obtener todas las hojas (más recientes primero)
     */
    getAll() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readonly');
            const store = tx.objectStore(this.STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const sheets = request.result || [];
                sheets.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
                resolve(sheets);
            };
            request.onerror = () => reject(new Error('Error listando hojas: ' + request.error));
        });
    },

    /**
     * Buscar hojas por texto (principio activo)
     */
    async search(query) {
        const all = await this.getAll();
        if (!query) return all;

        const q = query.toLowerCase();
        return all.filter(sheet =>
            (sheet.principio_activo || '').toLowerCase().includes(q)
        );
    },

    /**
     * Eliminar una hoja por ID
     */
    delete(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
            const store = tx.objectStore(this.STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Error eliminando hoja: ' + request.error));
        });
    },

    /**
     * Exportar todas las hojas como JSON
     */
    async exportJSON() {
        const sheets = await this.getAll();
        const data = {
            app: 'HojaInfoPtes',
            version: 2,
            exported_at: new Date().toISOString(),
            count: sheets.length,
            sheets: sheets
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `hojas_informativas_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return sheets.length;
    },

    /**
     * Importar hojas desde fichero JSON
     */
    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (!data.sheets || !Array.isArray(data.sheets)) {
                        throw new Error('El fichero no tiene un formato válido.');
                    }

                    const existing = await this.getAll();
                    let imported = 0;
                    let skipped = 0;

                    for (const sheet of data.sheets) {
                        // Detectar duplicados por principio_activo + created_at
                        const isDuplicate = existing.some(
                            ex => ex.principio_activo === sheet.principio_activo &&
                                  ex.created_at === sheet.created_at
                        );

                        if (isDuplicate) {
                            skipped++;
                            continue;
                        }

                        const { id, ...sheetWithoutId } = sheet;
                        await this.save(sheetWithoutId);
                        imported++;
                    }

                    resolve({ imported, skipped });
                } catch (err) {
                    reject(new Error('Error importando: ' + err.message));
                }
            };

            reader.onerror = () => reject(new Error('Error leyendo el fichero.'));
            reader.readAsText(file);
        });
    }
};
