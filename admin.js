document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURACIÓN Y ELEMENTOS GLOBALES ---
    const GITHUB_CONFIG = { owner: 'cepoide', repo: 'cepoide.github.io', path: 'proyectos.json', branch: 'main' };
    const API_URL = 'https://api.github.com';
    let githubToken, fileSha, allProjects = [];

    const TINYMCE_CONFIG = {
        plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
        toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | code fullscreen preview | help',
        menubar: 'file edit view insert format tools table help',
        skin: 'oxide', content_css: 'default'
    };
    const TINYMCE_CONFIG_DARK = { ...TINYMCE_CONFIG, skin: 'oxide-dark', content_css: 'dark' };

    const loginView = document.getElementById('login-view');
    const panelContainer = document.getElementById('panel-container');
    const editView = document.getElementById('edit-view');
    const createView = document.getElementById('create-view');
    const navEdit = document.getElementById('nav-edit');
    const navCreate = document.getElementById('nav-create');
    const themeToggleButton = document.getElementById('admin-theme-toggle');
    const accordionContainer = document.getElementById('project-accordion');
    
    // --- LÓGICA DE TEMA ---
    function applyTheme(theme) {
        const isDark = theme === 'oscuro';
        document.body.classList.toggle('oscuro', isDark);
        themeToggleButton.textContent = isDark ? '🌙' : '☀️';
        if (window.tinymce && tinymce.get().length > 0) {
            tinymce.remove();
            tinymce.init({ ... (isDark ? TINYMCE_CONFIG_DARK : TINYMCE_CONFIG), selector: 'textarea.descripcion' });
        }
    }
    themeToggleButton.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('oscuro') ? 'claro' : 'oscuro';
        localStorage.setItem('admin_theme', newTheme);
        applyTheme(newTheme);
    });

    // --- LÓGICA DE APP Y AUTENTICACIÓN ---
    function initApp() {
        applyTheme(localStorage.getItem('admin_theme') || 'claro');
        const savedToken = localStorage.getItem('github_token');
        if (savedToken) setupAuthenticated(savedToken);
        else loginView.style.display = 'block';
    }

    document.getElementById('save-token-button').addEventListener('click', () => {
        const token = document.getElementById('token-input').value.trim();
        if (token && (token.startsWith('ghp_') || token.startsWith('github_pat_'))) {
            localStorage.setItem('github_token', token);
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
            renderCreateForm(); 
            showView('create'); 
        } catch (error) {
            console.error("Fallo de autenticación:", error);
            localStorage.removeItem('github_token');
            loginView.style.display = 'block';
        }
    }
    
    // --- LÓGICA DE NAVEGACIÓN Y VISTAS ---
    function setupNavigation() {
        navEdit.addEventListener('click', (e) => { e.preventDefault(); showView('edit'); });
        navCreate.addEventListener('click', (e) => { e.preventDefault(); showView('create'); });
    }
    
    function showView(viewName) {
        [editView, createView].forEach(v => v.style.display = 'none');
        [navEdit, navCreate].forEach(n => n.classList.remove('active'));
        if (viewName === 'edit') {
            editView.style.display = 'block';
            navEdit.classList.add('active');
        } else {
            createView.style.display = 'block';
            navCreate.classList.add('active');
        }
    }

    // --- LÓGICA DE MANEJO DE PROYECTOS (ACORDEÓN) ---
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
            const url = `${API_URL}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}?ref=${GITHUB_CONFIG.branch}&t=${new Date().getTime()}`;
            const data = await apiRequest('GET', url);
            fileSha = data.sha;
            const decodedContent = decodeURIComponent(escape(atob(data.content)));
            allProjects = JSON.parse(decodedContent);
            renderAccordion(allProjects);
        } catch (error) {
            console.error('Error al cargar proyectos:', error);
        }
    }

    function renderAccordion(projects) {
        accordionContainer.innerHTML = '';
        if (window.tinymce) tinymce.remove('.accordion-content .descripcion');
        projects.forEach((p, i) => accordionContainer.appendChild(createAccordionItem(p, i)));
    }

    function createAccordionItem(project, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'accordion-item';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'accordion-header';
        headerDiv.textContent = project.titulo;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'accordion-content';
        contentDiv.appendChild(createProjectFormElement(project, index));

        headerDiv.addEventListener('click', () => {
            const isActive = headerDiv.classList.contains('active');
            // Cerrar todos los demás
            accordionContainer.querySelectorAll('.accordion-header').forEach(h => h.classList.remove('active'));
            accordionContainer.querySelectorAll('.accordion-content').forEach(c => c.style.display = 'none');
            
            if (!isActive) {
                headerDiv.classList.add('active');
                contentDiv.style.display = 'block';
                // Inicializar TinyMCE solo si es la primera vez que se abre
                const textarea = contentDiv.querySelector('textarea');
                if (textarea && !textarea.dataset.initialized) {
                    const currentThemeConfig = document.body.classList.contains('oscuro') ? TINYMCE_CONFIG_DARK : TINYMCE_CONFIG;
                    tinymce.init({ ...currentThemeConfig, selector: `#${textarea.id}` });
                    textarea.dataset.initialized = 'true';
                }
            }
        });

        itemDiv.appendChild(headerDiv);
        itemDiv.appendChild(contentDiv);
        return itemDiv;
    }
    
    function renderCreateForm() {
        const container = document.getElementById('create-project-form');
        container.innerHTML = '';
        if (window.tinymce) tinymce.remove('#create-project-form .descripcion');
        const blankProject = { titulo: "", descripcion: "", imagenUrl: "", enlaceUrl: "", categoria: "Personal" };
        container.appendChild(createProjectFormElement(blankProject, 'new'));
        const currentThemeConfig = document.body.classList.contains('oscuro') ? TINYMCE_CONFIG_DARK : TINYMCE_CONFIG;
        tinymce.init({ ...currentThemeConfig, selector: '#create-project-form .descripcion' });
    }

    function createProjectFormElement(project, index) {
        const div = document.createElement('div');
        div.className = 'editor-proyecto-item';
        div.innerHTML = `
            <div><label>Título</label><input type="text" class="titulo" value="${project.titulo}"></div>
            <div><label>Descripción</label><textarea id="editor-${index}" class="descripcion">${project.descripcion}</textarea></div>
            <div><label>URL de la Imagen</label><input type="text" class="imagenUrl" value="${project.imagenUrl}"></div>
            <div><label>URL del Proyecto</label><input type="text" class="enlaceUrl" value="${project.enlaceUrl}"></div>
            <div><label>Categoría</label><select class="categoria"><option value="Facultad" ${project.categoria === 'Facultad' ? 'selected' : ''}>Facultad</option><option value="Personal" ${project.categoria === 'Personal' ? 'selected' : ''}>Personal</option></select></div>
            ${index !== 'new' ? '<button class="admin-button btn-delete">Eliminar Este Proyecto</button>' : ''}
        `;
        if (index !== 'new') {
            div.querySelector('.delete-button').addEventListener('click', e => {
                if (confirm('¿Estás seguro? El proyecto se eliminará de la lista. Deberás presionar "Guardar Todos los Cambios" para confirmar.')) {
                    e.target.closest('.accordion-item').remove();
                }
            });
        }
        return div;
    }
    
    async function saveChanges(projectsToSave, statusElement) {
        try {
            statusElement.textContent = 'Guardando...';
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(projectsToSave, null, 2))));
            const url = `${API_URL}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}`;
            const body = { message: `[Admin Panel] Actualización de proyectos`, content, sha: fileSha, branch: GITHUB_CONFIG.branch };
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
        const projectForms = document.querySelectorAll('#project-accordion .editor-proyecto-item');
        const updatedProjects = [];
        projectForms.forEach(form => {
            const titulo = form.querySelector('.titulo').value;
            updatedProjects.push({
                titulo,
                descripcion: tinymce.get(form.querySelector('.descripcion').id).getContent(),
                imagenUrl: form.querySelector('.imagenUrl').value,
                altImagen: `Captura de pantalla del proyecto ${titulo}`,
                enlaceUrl: form.querySelector('.enlaceUrl').value,
                categoria: form.querySelector('.categoria').value
            });
        });
        if (await saveChanges(updatedProjects, document.getElementById('status'))) {
            allProjects = updatedProjects;
        }
    });

    document.getElementById('save-new-button').addEventListener('click', async () => {
        const form = document.getElementById('create-project-form').querySelector('.editor-proyecto-item');
        const titulo = form.querySelector('.titulo').value;
        if (!titulo) { alert("El título no puede estar vacío."); return; }
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
            await loadProjects();
            showView('edit');
        }
    });

    initApp();
});