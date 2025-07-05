document.addEventListener('DOMContentLoaded', () => {

const GITHUB_CONFIG = { owner: 'cepoide', repo: 'cepoide.github.io', path: 'proyectos.json', branch: 'main' };
const API_URL = 'https://api.github.com';
let githubToken, fileSha, allProjects = [], currentEditIndex = -1;

const CATEGORIES = ['University', 'Professional', 'Personal'];

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
const projectsTableContainer = document.getElementById('projects-table-container');
const singleProjectEditorContainer = document.getElementById('single-project-editor-container');
const navEdit = document.getElementById('nav-edit');
const navCreate = document.getElementById('nav-create');
const themeToggleButton = document.getElementById('admin-theme-toggle');

function applyTheme(theme) {
    const isDark = theme === 'oscuro';
    document.body.classList.toggle('oscuro', isDark);
    themeToggleButton.textContent = isDark ? '🌙' : '☀️';
    if (window.tinymce && tinymce.get().length > 0) {
        tinymce.remove();
        tinymce.init({ ...(isDark ? TINYMCE_CONFIG_DARK : TINYMCE_CONFIG), selector: 'textarea.descripcion' });
    }
}
themeToggleButton.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('oscuro') ? 'claro' : 'oscuro';
    localStorage.setItem('admin_theme', newTheme);
    applyTheme(newTheme);
});

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
        showProjectsList();
    } else {
        createView.style.display = 'block';
        navCreate.classList.add('active');
    }
}

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

function showProjectsList() {
    projectsTableContainer.style.display = 'block';
    singleProjectEditorContainer.style.display = 'none';
    renderProjectsTable(allProjects);
}

function showEditForm(projectIndex) {
    currentEditIndex = projectIndex;
    const project = allProjects[projectIndex];
    document.getElementById('editor-heading').textContent = `Editando: ${project.titulo}`;
    const formContainer = document.getElementById('single-project-form');
    formContainer.innerHTML = '';
    if (window.tinymce) tinymce.remove(`#editor-${projectIndex}`);
    formContainer.appendChild(createProjectFormElement(project, projectIndex));
    const currentThemeConfig = document.body.classList.contains('oscuro') ? TINYMCE_CONFIG_DARK : TINYMCE_CONFIG;
    tinymce.init({ ...currentThemeConfig, selector: `#editor-${projectIndex}` });
    projectsTableContainer.style.display = 'none';
    singleProjectEditorContainer.style.display = 'block';
}

document.getElementById('cancel-edit-button').addEventListener('click', showProjectsList);

function renderProjectsTable(projects) {
    const tableBody = document.getElementById('projects-table-body');
    tableBody.innerHTML = '';
    projects.forEach((p, i) => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${p.titulo}</td>
            <td>${p.categoria}</td>
            <td class="actions-cell">
                <button class="admin-button btn-edit" data-index="${i}">Editar</button>
                <button class="admin-button btn-delete" data-index="${i}">Eliminar</button>
            </td>
        `;
    });
    tableBody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => showEditForm(btn.dataset.index));
    });
    tableBody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const indexToDelete = parseInt(btn.dataset.index, 10);
            if (confirm(`¿Eliminar "${allProjects[indexToDelete].titulo}"?`)) {
                allProjects.splice(indexToDelete, 1);
                if (await saveChanges(allProjects, document.getElementById('status'))) {
                    renderProjectsTable(allProjects);
                }
            }
        });
    });
}

document.getElementById('save-single-button').addEventListener('click', async () => {
    const form = singleProjectEditorContainer.querySelector('.editor-proyecto-item');
    const titulo = form.querySelector('.titulo').value.trim();
    const updatedProject = {
        titulo,
        descripcion: tinymce.get(`editor-${currentEditIndex}`).getContent(),
        imagenUrl: form.querySelector('.imagenUrl').value.trim(),
        altImagen: `Vista previa del proyecto ${titulo}`,
        enlaceUrl: form.querySelector('.enlaceUrl').value.trim(),
        categoria: form.querySelector('.categoria').value,
        skills: form.querySelector('.skills').value.split(',').map(s => s.trim()).filter(s => s)
    };
    allProjects[currentEditIndex] = updatedProject;
    if (await saveChanges(allProjects, document.getElementById('status'))) {
        showProjectsList();
    }
});

function renderCreateForm() {
    const container = document.getElementById('create-project-form');
    container.innerHTML = '';
    if (window.tinymce) tinymce.remove('#create-project-form .descripcion');
    const blankProject = { titulo: "", descripcion: "", imagenUrl: "", enlaceUrl: "", categoria: CATEGORIES[0], skills: [] };
    container.appendChild(createProjectFormElement(blankProject, 'new'));
    const currentThemeConfig = document.body.classList.contains('oscuro') ? TINYMCE_CONFIG_DARK : TINYMCE_CONFIG;
    tinymce.init({ ...currentThemeConfig, selector: '#create-project-form .descripcion' });
}

document.getElementById('save-new-button').addEventListener('click', async () => {
    const form = document.getElementById('create-project-form').querySelector('.editor-proyecto-item');
    const titulo = form.querySelector('.titulo').value.trim();
    if (!titulo) { alert("El título no puede estar vacío."); return; }
    const newProject = {
        titulo,
        descripcion: tinymce.get('editor-new').getContent(),
        imagenUrl: form.querySelector('.imagenUrl').value.trim(),
        altImagen: `Vista previa del proyecto ${titulo}`,
        enlaceUrl: form.querySelector('.enlaceUrl').value.trim(),
        categoria: form.querySelector('.categoria').value,
        skills: form.querySelector('.skills').value.split(',').map(s => s.trim()).filter(s => s)
    };
    const projectsToSave = [newProject, ...allProjects];
    if (await saveChanges(projectsToSave, document.getElementById('create-status'))) {
        await loadProjects();
        showView('edit');
    }
});

async function loadProjects() {
    const url = `${API_URL}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}?ref=${GITHUB_CONFIG.branch}&t=${Date.now()}`;
    const data = await apiRequest('GET', url);
    fileSha = data.sha;
    const decodedContent = decodeURIComponent(escape(atob(data.content)));
    allProjects = JSON.parse(decodedContent);
    renderProjectsTable(allProjects);
}

function createProjectFormElement(project, index) {
    const div = document.createElement('div');
    div.className = 'editor-proyecto-item';
    div.innerHTML = `
        <div><label>Título</label><input type="text" class="titulo" value="${project.titulo}"></div>
        <div><label>Descripción</label><textarea id="editor-${index}" class="descripcion">${project.descripcion}</textarea></div>
        <div><label>URL de la Imagen</label><input type="text" class="imagenUrl" value="${project.imagenUrl}"></div>
        <div><label>URL del Proyecto</label><input type="text" class="enlaceUrl" value="${project.enlaceUrl}"></div>
        <div><label>Categoría</label><select class="categoria">
        ${CATEGORIES.map(cat => `<option value="${cat}" ${project.categoria === cat ? 'selected' : ''}>${cat}</option>`).join('')}
        </select></div>
        <div><label>Skills (separadas por coma)</label><input type="text" class="skills" value="${(project.skills || []).join(', ')}"></div>
    `;
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

initApp();

});
