// app.js - Router SPA y punto de entrada (v2)

const App = {
    init() {
        window.addEventListener('hashchange', () => this.route());
        Storage.init().then(() => {
            this.route();
        }).catch(err => {
            console.error('Error inicializando base de datos:', err);
            UI.showError('Error al inicializar la base de datos del navegador.');
        });
    },

    route() {
        const hash = window.location.hash || '#/';
        const app = document.getElementById('app');
        app.innerHTML = '';

        // Actualizar navegación activa
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

        if (hash === '#/' || hash === '#') {
            document.getElementById('nav-home')?.classList.add('active');
            UI.renderHome(app);

        } else if (hash === '#/new') {
            document.getElementById('nav-new')?.classList.add('active');
            UI.renderNewSheet(app);

        } else if (hash.match(/^#\/sheet\/\d+\/edit$/)) {
            const id = parseInt(hash.split('/')[2], 10);
            if (Number.isInteger(id) && id >= 0) {
                UI.renderEditSheet(app, id);
            } else {
                window.location.hash = '#/sheets';
            }

        } else if (hash.match(/^#\/sheet\/\d+$/)) {
            const id = parseInt(hash.split('/')[2], 10);
            if (Number.isInteger(id) && id > 0) {
                UI.renderViewSheet(app, id);
            } else {
                window.location.hash = '#/sheets';
            }

        } else if (hash === '#/sheets') {
            document.getElementById('nav-sheets')?.classList.add('active');
            UI.renderSheetList(app);

        } else if (hash === '#/config') {
            UI.renderConfig(app);

        } else {
            app.innerHTML = `
                <div class="text-center py-5">
                    <h2 class="text-secondary">Página no encontrada</h2>
                    <a href="#/" class="btn btn-primary mt-3">Ir al inicio</a>
                </div>`;
        }
    }
};

// Helpers globales
function showLoading(message = 'Cargando...') {
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-message').textContent = message;
    overlay.classList.remove('d-none');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('d-none');
}

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');

    toastTitle.textContent = title;
    toastBody.textContent = message;

    toast.className = 'toast';
    if (type === 'success') toast.classList.add('border-success');
    else if (type === 'error') toast.classList.add('border-danger');
    else if (type === 'warning') toast.classList.add('border-warning');

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

document.addEventListener('DOMContentLoaded', () => App.init());
