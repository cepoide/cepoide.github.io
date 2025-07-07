document.addEventListener('DOMContentLoaded', () => {

const GITHUB_CONFIG = { owner: 'cepoide', repo: 'cepoide.github.io', path: 'proyectos.json', branch: 'main' };
const API_URL = 'https://api.github.com';
const IMAGES_FOLDER = 'img';
let githubToken, fileSha, allProjects = [], currentEditIndex = -1;

const CATEGORIES = ['University', 'Professional', 'Personal'];

// --- Upload Image ---
async function uploadImageToGitHub(base64Content, filenameHint) {
    const fileName = `${Date.now()}-${filenameHint}`.replace(/\s+/g, '-');
    const githubPath = `${IMAGES_FOLDER}/${fileName}`;

    const url = `${API_URL}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${githubPath}`;
    const body = {
        message: `[Admin Panel] Subida de imagen ${fileName}`,
        content: base64Content,
        branch: GITHUB_CONFIG.branch
    };

    await apiRequest('PUT', url, body);
    return `https://${GITHUB_CONFIG.owner}.github.io/${githubPath}`;
}

// --- TinyMCE configs ---
const TINYMCE_CONFIG = {
    plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
    toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | code fullscreen preview | help',
    menubar: 'file edit view insert format tools table help',
    skin: 'oxide',
    content_css: [
        '/libs/tinymce/skins/ui/oxide/content.min.css',
        'adminstyle.css' // Esto ya carga tu adminstyle.css con el @import
    ],
    font_formats: 'Arial=arial,helvetica,sans-serif; Courier New=courier new,courier,monospace; Georgia=georgia,palatino; Impact=impact,chicago; Pixellari=Pixellari; Just Another Hand="Just Another Hand";',
    images_upload_handler: async (blobInfo, success, failure) => {
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1];
                const url = await uploadImageToGitHub(base64, blobInfo.filename());
                success(url, { alt: blobInfo.filename(), width: '', height: '' });
            };
            reader.readAsDataURL(blobInfo.blob());
        } catch (err) {
            console.error(err);
            failure('Error al subir imagen: ' + err.message);
        }
    }
};

const TINYMCE_CONFIG_DARK = {
    ...TINYMCE_CONFIG,
    skin: 'oxide-dark',
    content_css: [
        '/libs/tinymce/skins/ui/oxide-dark/content.min.css',
        'adminstyle.css'
    ],
    font_formats: 'Arial=arial,helvetica,sans-serif; Courier New=courier new,courier,monospace; Georgia=georgia,palatino; Impact=impact,chicago; Pixellari=Pixellari; Just Another Hand="Just Another Hand";'
};

// --- UI Elements ---
const loginView = document.getElementById('login-view');
const panelContainer = document.getElementById('panel-container');
const editView = document.getElementById('edit-view');
const createView = document.getElementById('create-view');
const projectsTableContainer = document.getElementById('projects-table-container');
const singleProjectEditorContainer = document.getElementById('single-project-editor-container');
const navEdit = document.getElementById('nav-edit');
const navCreate = document.getElementById('nav-create');
const themeToggleButton = document.getElementById('admin-theme-toggle');

// --- Theme ---
function applyTheme(theme) {
    const isDark = theme === 'oscuro';
    document.body.classList.toggle('oscuro', isDark);
    themeToggleButton.textContent = isDark ? '🌙' : '☀️';

    if (window.tinymce && Array.isArray(tinymce.editors) && tinymce.editors.length > 0) {
        tinymce.remove();
        tinymce.init({ ...(isDark ? TINYMCE_CONFIG_DARK : TINYMCE_CONFIG), selector: 'textarea.descripcion' });
    }
}

// --- Init ---
function initApp() {
    console.log('[Init] App arrancando...');
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
        await apiRequest('GET', `${API_URL}/user`);
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

// --- Navigation ---
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

// --- Projects ---
function showProjectsList() {
    projectsTableContainer.style.display = 'block';
    singleProjectEditorContainer.style.display = 'none';
    renderProjectsTable(allProjects);
}

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

document.getElementById('cancel-edit-button').addEventListener('click', showProjectsList);

function showEditForm(projectIndex) {
    currentEditIndex = projectIndex;
    const project = allProjects[projectIndex];
    document.getElementById('editor-heading').textContent = `Editando: ${project.titulo}`;
    const formContainer = document.getElementById('single-project-form');
    formContainer.innerHTML = '';
    tinymce.remove(`#editor-${projectIndex}`);
    formContainer.appendChild(createProjectFormElement(project, projectIndex));
    tinymce.init({ ...getCurrentTinyConfig(), selector: `#editor-${projectIndex}` });
    setupPreviewImageUpload();
    projectsTableContainer.style.display = 'none';
    singleProjectEditorContainer.style.display = 'block';
}

function renderCreateForm() {
    const container = document.getElementById('create-project-form');
    container.innerHTML = '';
    tinymce.remove('#create-project-form .descripcion');
    const blankProject = { titulo: "", descripcion: "", imagenUrl: "", enlaceUrl: "", categoria: CATEGORIES[0], skills: [] };
    container.appendChild(createProjectFormElement(blankProject, 'new'));
    tinymce.init({ ...getCurrentTinyConfig(), selector: '#create-project-form .descripcion' });
    setupPreviewImageUpload();
}

function setupPreviewImageUpload() {
    document.querySelectorAll('.uploadPreviewImage').forEach(input => {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Data = reader.result.split(',')[1];
                try {
                    const url = await uploadImageToGitHub(base64Data, file.name);
                    const imagenUrlInput = e.target.closest('.editor-proyecto-item').querySelector('.imagenUrl');
                    imagenUrlInput.value = url;
                    alert('Imagen subida con éxito!');
                } catch (err) {
                    console.error(err);
                    alert('Error al subir imagen: ' + err.message);
                }
            };
            reader.readAsDataURL(file);
        });
    });
}

function createProjectFormElement(project, index) {
    const div = document.createElement('div');
    div.className = 'editor-proyecto-item';
    div.innerHTML = `
        <div><label>Título</label><input type="text" class="titulo" value="${project.titulo}"></div>
        <div><label>Descripción</label><textarea id="editor-${index}" class="descripcion">${project.descripcion}</textarea></div>
        <div><label>URL de la Imagen</label><input type="text" class="imagenUrl" value="${project.imagenUrl}"><input type="file" class="uploadPreviewImage" accept="image/*"></div>
        <div><label>URL del Proyecto</label><input type="text" class="enlaceUrl" value="${project.enlaceUrl}"></div>
        <div><label>Categoría</label><select class="categoria">${CATEGORIES.map(cat => `<option value="${cat}" ${project.categoria === cat ? 'selected' : ''}>${cat}</option>`).join('')}</select></div>
        <div><label>Skills (separadas por coma)</label><input type="text" class="skills" value="${(project.skills || []).join(', ')}"></div>
    `;
    return div;
}

async function loadProjects() {
    const url = `${API_URL}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.path}?ref=${GITHUB_CONFIG.branch}`;
    const data = await apiRequest('GET', url);
    fileSha = data.sha;
    const decodedContent = decodeURIComponent(escape(atob(data.content)));
    allProjects = JSON.parse(decodedContent);
    renderProjectsTable(allProjects);
}

async function saveChanges(projectsToSave, statusElement) {
    try {
        console.log('[Save] Guardando proyectos...');
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

function getCurrentTinyConfig() {
    return document.body.classList.contains('oscuro') ? TINYMCE_CONFIG_DARK : TINYMCE_CONFIG;
}

// Event listener para el botón 'Guardar Nuevo Proyecto'
const saveNewButton = document.getElementById('save-new-button');
const createProjectForm = document.getElementById('create-project-form');
const createStatusElement = document.getElementById('create-status');

saveNewButton.addEventListener('click', async () => {
    const newProject = {
        titulo: createProjectForm.querySelector('.titulo').value,
        descripcion: tinymce.get(createProjectForm.querySelector('.descripcion').id).getContent(),
        imagenUrl: createProjectForm.querySelector('.imagenUrl').value,
        enlaceUrl: createProjectForm.querySelector('.enlaceUrl').value,
        categoria: createProjectForm.querySelector('.categoria').value,
        skills: createProjectForm.querySelector('.skills').value.split(',').map(s => s.trim()).filter(s => s)
    };

    allProjects.push(newProject);
    if (await saveChanges(allProjects, createStatusElement)) {
        renderCreateForm(); // Vuelve a renderizar el formulario para limpiar los campos
        showView('edit'); // Navega a la vista de edición para ver el nuevo proyecto
    }
});

// Event listener para el botón 'Guardar Cambios' (editar proyecto)
const saveSingleButton = document.getElementById('save-single-button');
const singleProjectForm = document.getElementById('single-project-form');
const statusElement = document.getElementById('status'); // Asumo que este es el elemento de estado para el editor de un solo proyecto

saveSingleButton.addEventListener('click', async () => {
    if (currentEditIndex !== -1) {
        const updatedProject = {
            titulo: singleProjectForm.querySelector('.titulo').value,
            descripcion: tinymce.get(singleProjectForm.querySelector('.descripcion').id).getContent(),
            imagenUrl: singleProjectForm.querySelector('.imagenUrl').value,
            enlaceUrl: singleProjectForm.querySelector('.enlaceUrl').value,
            categoria: singleProjectForm.querySelector('.categoria').value,
            skills: singleProjectForm.querySelector('.skills').value.split(',').map(s => s.trim()).filter(s => s)
        };

        allProjects[currentEditIndex] = updatedProject;
        if (await saveChanges(allProjects, statusElement)) {
            showProjectsList(); // Vuelve a la lista de proyectos después de guardar
        }
    }
});

initApp();

});