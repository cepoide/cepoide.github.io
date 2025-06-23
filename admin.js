// === CONFIGURACIÓN ===
const GITHUB_CONFIG = {
    owner: 'cepoide',
    repo: 'cepoide.github.io',
    path: 'proyectos.json',
    branch: 'main'
};

// === ELEMENTOS DEL DOM ===
const loginView = document.getElementById('login-view');
const editorView = document.getElementById('editor-view');
const tokenInput = document.getElementById('token-input');
const saveTokenButton = document.getElementById('save-token-button');
const saveButton = document.getElementById('save-button');
const addButton = document.getElementById('add-project-button');
const projectListContainer = document.getElementById('proyectos-editor-list');
const statusElem = document.getElementById('status');
const loginStatusElem = document.getElementById('login-status');

let octokit;
let fileSha;

// === LÓGICA PRINCIPAL AL CARGAR LA PÁGINA ===
document.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
        setupAuthenticated(savedToken);
    } else {
        showLoginView();
    }
});

function showLoginView(errorMessage = '') {
    editorView.style.display = 'none';
    loginView.style.display = 'block';
    if (errorMessage) {
        loginStatusElem.style.color = 'red';
        loginStatusElem.textContent = errorMessage;
    }
}

function showEditorView() {
    loginView.style.display = 'none';
    editorView.style.display = 'block';
}

// === LÓGICA DE AUTENTICACIÓN ===
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
    try {
        // Se usa "Octokit" con mayúscula, la variable global que carga el script
        octokit = new Octokit({ auth: token });
        
        await octokit.request('GET /user'); // Verifica que el token es válido
        showEditorView();
        await loadProjects();
    } catch (error) {
        console.error("El token no es válido o ha expirado:", error);
        localStorage.removeItem('github_token');
        showLoginView("Tu token no es válido o ha expirado. Por favor, genera uno nuevo.");
    }
}

// === LÓGICA DEL EDITOR (CARGAR, RENDERIZAR, GUARDAR, AÑADIR) ===

async function loadProjects() {
    try {
        statusElem.textContent = 'Cargando proyectos...';
        const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { ...GITHUB_CONFIG });
        fileSha = data.sha;
        const projects = JSON.parse(atob(data.content));
        renderUI(projects);
        statusElem.textContent = 'Proyectos cargados.';
    } catch (error) {
        console.error('Error al cargar proyectos:', error);
        statusElem.textContent = 'Error al cargar proyectos. Revisa la consola.';
    }
}

function renderUI(projects) {
    projectListContainer.innerHTML = '';
    if (window.tinymce && tinymce.get().length > 0) {
        tinymce.remove();
    }
    projects.forEach((project, index) => renderProjectForm(project, index, false));
    tinymce.init({ selector: 'textarea.descripcion', plugins: 'code lists link image', toolbar: 'undo redo | blocks | bold italic | bullist numlist | link image | code', menubar: false, statusbar: false });
}

function renderProjectForm(project, index, isNew) {
    const projectDiv = document.createElement('div');
    projectDiv.className = 'editor-proyecto-item';
    projectDiv.innerHTML = `
        <h3>${project.titulo}</h3>
        <div><label>Título</label><input type="text" class="titulo" value="${project.titulo}"></div>
        <div><label>Descripción</label><textarea id="editor-${index}" class="descripcion">${project.descripcion}</textarea></div>
        <div><label>URL de la Imagen</label><input type="text" class="imagenUrl" value="${project.imagenUrl}"></div>
        <div><label>URL del Proyecto</label><input type="text" class="enlaceUrl" value="${project.enlaceUrl}"></div>
        <div><label>Categoría</label><select class="categoria"><option value="Facultad" ${project.categoria === 'Facultad' ? 'selected' : ''}>Facultad</option><option value="Personal" ${project.categoria === 'Personal' ? 'selected' : ''}>Personal</option></select></div>
        <button class="delete-button">Eliminar Proyecto</button>
    `;
    projectListContainer.appendChild(projectDiv);
    if (isNew) {
        tinymce.init({ selector: `#editor-${index}`, plugins: 'code lists link image', toolbar: 'undo redo | blocks | bold italic | bullist numlist | link image | code', menubar: false, statusbar: false });
    }
    projectDiv.querySelector('.delete-button').addEventListener('click', (e) => {
        if (confirm('¿Estás seguro?')) { e.target.closest('.editor-proyecto-item').remove(); }
    });
}

saveButton.addEventListener('click', async () => {
    try {
        statusElem.textContent = 'Guardando...';
        const projectElements = document.querySelectorAll('.editor-proyecto-item');
        let updatedProjects = [];
        for (const el of projectElements) {
            const titulo = el.querySelector('.titulo').value;
            const editorInst = tinymce.get(el.querySelector('.descripcion').id);
            const descripcion = editorInst ? editorInst.getContent() : el.querySelector('.descripcion').value;
            updatedProjects.push({
                titulo: titulo, descripcion: descripcion, imagenUrl: el.querySelector('.imagenUrl').value,
                altImagen: `Captura de pantalla del proyecto ${titulo}`, enlaceUrl: el.querySelector('.enlaceUrl').value,
                categoria: el.querySelector('.categoria').value
            });
        }
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(updatedProjects, null, 2))));
        const { data } = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            ...GITHUB_CONFIG, message: `[Admin Panel] Actualización de proyectos ${new Date().toISOString()}`,
            content: content, sha: fileSha
        });
        fileSha = data.content.sha;
        statusElem.textContent = '¡Guardado con éxito!';
    } catch (error) {
        console.error('Error al guardar:', error);
        statusElem.textContent = 'Error al guardar. Revisa la consola.';
    }
});

addButton.addEventListener('click', () => {
    const newIndex = 'new-' + new Date().getTime(); // Unique ID for new editor
    const newProject = { titulo: "Nuevo Proyecto", descripcion: "<p>Añade una descripción.</p>", imagenUrl: "img/placeholder.png", enlaceUrl: "#", categoria: "Personal" };
    renderProjectForm(newProject, newIndex, true);
});
