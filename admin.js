// Usamos fetch nativo, no necesitamos Octokit
document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURACIÓN Y ELEMENTOS GLOBALES ---
    const GITHUB_CONFIG = {
        owner: 'cepoide',
        repo: 'cepoide.github.io',
        path: 'proyectos.json',
        branch: 'main'
    };
    const API_URL = 'https://api.github.com';
    let githubToken;
    let fileSha;
    let allProjects = [];

    const loginView = document.getElementById('login-view');
    const panelContainer = document.getElementById('panel-container');
    const saveTokenButton = document.getElementById('save-token-button');
    const tokenInput = document.getElementById('token-input');
    const loginStatusElem = document.getElementById('login-status');
    
    const editView = document.getElementById('edit-view');
    const createView = document.getElementById('create-view');
    const navEdit = document.getElementById('nav-edit');
    const navCreate = document.getElementById('nav-create');

    const themeToggleButton = document.getElementById('admin-theme-toggle');

    // --- LÓGICA DE TEMA OSCURO/CLARO ---
    function applyTheme(theme) {
        if (theme === 'oscuro') {
            document.body.classList.add('oscuro');
            themeToggleButton.textContent = '🌙';
        } else {
            document.body.classList.remove('oscuro');
            themeToggleButton.textContent = '☀️';
        }
    }

    themeToggleButton.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('oscuro') ? 'claro' : 'oscuro';
        localStorage.setItem('admin_theme', currentTheme);
        applyTheme(currentTheme);
    });

    // --- LÓGICA PRINCIPAL DE LA APP ---
    function initApp() {
        const savedToken = localStorage.getItem('github_token');
        const savedTheme = localStorage.getItem('admin_theme') || 'claro';
        applyTheme(savedTheme);

        if (savedToken) {
            setupAuthenticated(savedToken);
        } else {
            loginView.style.display = 'block';
        }
    }

    saveTokenButton.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (token && (token.startsWith('ghp_') || token.startsWith('github_pat_'))) {
            localStorage.setItem('github_token', token);
            loginStatusElem.style.color = 'green';
            loginStatusElem.textContent = '¡Token guardado! Verificando...';
            setupAuthenticated(token);
        } else {
            alert('Por favor, pega un Token de Acceso Personal de GitHub válido.');
        }
    });

    async function setupAuthenticated(token) {
        githubToken = token;
        try {
            const response = await fetch(`${API_URL}/user`, { headers: { 'Authorization': `Bearer ${githubToken}` } });
            if (!response.ok) throw new Error(`Token inválido: ${response.status}`);
            
            loginView.style.display = 'none';
            panelContainer.style.display = 'block';
            
            await loadProjects();
            setupNavigation();
            showView('edit'); // Mostrar la vista de edición por defecto
            renderCreateForm(); // Preparar el formulario de creación

        } catch (error) {
            console.error("Fallo de autenticación:", error);
            localStorage.removeItem('github_token');
            loginStatusElem.style.color = 'red';
            loginStatusElem.textContent = "Tu token no es válido o ha expirado. Por favor, genera uno nuevo.";
            loginView.style.display = 'block';
        }
    }
    
    // --- LÓGICA DE NAVEGACIÓN ENTRE VISTAS ---
    function setupNavigation() {
        navEdit.addEventListener('click', (e) => {
            e.preventDefault();
            showView('edit');
        });
        navCreate.addEventListener('click', (e) => {
            e.preventDefault();
            showView('create');
        });
    }
    
    function showView(viewName) {
        editView.style.display = 'none';
        createView.style.display = 'none';
        navEdit.classList.remove('active');
        navCreate.classList.remove('active');

        if (viewName === 'edit') {
            editView.style.display = 'block';
            navEdit.classList.add('active');
        } else if (viewName === 'create') {
            createView.style.display = 'block';
            navCreate.classList.add('active');
        }
    }

    // --- LÓGICA DE MANEJO DE PROYECTOS ---
    async function apiRequest(method, url, body = null) {
        const headers = { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' };
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error de API: ${response.status}`);
        }
        return response.status === 204 ? null : response.json();
    }

    async function loadProjects() {
        try {
            document.getElementById('status').textContent = 'Cargando proyectos...';
            const url = `${API_URL}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}?ref=${GITHUB_CONFIG.branch}`;
            const data = await apiRequest('GET', url);
            fileSha = data.sha;
            // Corregir problema de codificación al leer
            const decodedContent = decodeURIComponent(escape(atob(data.content)));
            allProjects = JSON.parse(decodedContent);
            
            renderEditList(allProjects);
            document.getElementById('status').textContent = 'Proyectos cargados.';
        } catch (error) {
            console.error('Error al cargar proyectos:', error);
            document.getElementById('status').textContent = `Error: ${error.message}`;
        }
    }

    function renderEditList(projects) {
        const container = document.getElementById('proyectos-editor-list');
        container.innerHTML = '';
        if (window.tinymce) tinymce.remove();
        projects.forEach((p, i) => container.appendChild(createProjectFormElement(p, i)));
        tinymce.init({ selector: '.editor-proyecto-item .descripcion', plugins: 'code lists link', toolbar: 'undo redo | blocks | bold italic | bullist numlist | link | code' });
    }

    function renderCreateForm() {
        const container = document.getElementById('create-project-form');
        container.innerHTML = '';
        const blankProject = { titulo: "", descripcion: "", imagenUrl: "", enlaceUrl: "", categoria: "Personal" };
        container.appendChild(createProjectFormElement(blankProject, 'new'));
        tinymce.init({ selector: '#create-project-form .descripcion', plugins: 'code lists link', toolbar: 'undo redo | blocks | bold italic | bullist numlist | link | code' });
    }

    function createProjectFormElement(project, index) {
        const div = document.createElement('div');
        div.className = 'editor-proyecto-item';
        div.dataset.id = index;
        div.innerHTML = `
            <h3>${project.titulo || 'Nuevo Proyecto'}</h3>
            <div><label>Título</label><input type="text" class="titulo" value="${project.titulo}"></div>
            <div><label>Descripción</label><textarea class="descripcion">${project.descripcion}</textarea></div>
            <div><label>URL de la Imagen</label><input type="text" class="imagenUrl" value="${project.imagenUrl}"></div>
            <div><label>URL del Proyecto</label><input type="text" class="enlaceUrl" value="${project.enlaceUrl}"></div>
            <div><label>Categoría</label><select class="categoria"><option value="Facultad" ${project.categoria === 'Facultad' ? 'selected' : ''}>Facultad</option><option value="Personal" ${project.categoria === 'Personal' ? 'selected' : ''}>Personal</option></select></div>
            ${index !== 'new' ? '<button class="delete-button">Eliminar Proyecto</button>' : ''}
        `;
        if (index !== 'new') {
            div.querySelector('.delete-button').addEventListener('click', e => {
                if (confirm('¿Estás seguro?')) e.target.closest('.editor-proyecto-item').remove();
            });
        }
        return div;
    }

    async function saveChanges(projectsToSave, statusElement) {
        try {
            statusElement.textContent = 'Guardando...';
            // Corregir problema de codificación al escribir
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(projectsToSave, null, 2))));
            const url = `${API_URL}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
            const body = {
                message: `[Admin Panel] Actualización de proyectos ${new Date().toISOString()}`,
                content, sha: fileSha, branch: GITHUB_CONFIG.branch
            };
            const data = await apiRequest('PUT', url, body);
            fileSha = data.content.sha;
            statusElement.textContent = '¡Guardado con éxito!';
            return true;
        } catch (error) {
            console.error('Error al guardar:', error);
            statusElement.textContent = `Error: ${error.message}`;
            return false;
        }
    }
    
    document.getElementById('save-all-button').addEventListener('click', async () => {
        const projectElements = document.querySelectorAll('#proyectos-editor-list .editor-proyecto-item');
        const updatedProjects = [];
        projectElements.forEach(el => {
            const titulo = el.querySelector('.titulo').value;
            updatedProjects.push({
                titulo,
                descripcion: tinymce.get(el.querySelector('.descripcion').id).getContent(),
                imagenUrl: el.querySelector('.imagenUrl').value,
                altImagen: `Captura de pantalla del proyecto ${titulo}`,
                enlaceUrl: el.querySelector('.enlaceUrl').value,
                categoria: el.querySelector('.categoria').value
            });
        });
        if (await saveChanges(updatedProjects, document.getElementById('status'))) {
            allProjects = updatedProjects; // Actualizar el estado local
        }
    });

    document.getElementById('save-new-button').addEventListener('click', async () => {
        const form = document.getElementById('create-project-form').querySelector('.editor-proyecto-item');
        const titulo = form.querySelector('.titulo').value;
        const newProject = {
            titulo,
            descripcion: tinymce.get(form.querySelector('.descripcion').id).getContent(),
            imagenUrl: form.querySelector('.imagenUrl').value,
            altImagen: `Captura de pantalla del proyecto ${titulo}`,
            enlaceUrl: form.querySelector('.enlaceUrl').value,
            categoria: form.querySelector('.categoria').value
        };
        const projectsToSave = [newProject, ...allProjects];
        if (await saveChanges(projectsToSave, document.getElementById('create-status'))) {
            await loadProjects(); // Recargar la lista de edición
            showView('edit'); // Volver a la vista de edición
        }
    });

    // --- INICIAR LA APLICACIÓN ---
    initApp();
});