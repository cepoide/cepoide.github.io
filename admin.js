// admin.js

// --- CONFIGURACIÓN ---
const GITHUB_CLIENT_ID = 'TOv23liw9dOe4vGZ3Ueqy'; // ¡Pega tu Client ID aquí!
const GITHUB_REPO = 'cepoide/cepoide.github.io'; // ej: 'cepoide/portfolio'
const CONTENT_FILE_PATH = 'proyectos.json';

// --- ELEMENTOS DEL DOM ---
const loginContainer = document.getElementById('login-container');
const editorContainer = document.getElementById('editor-container');
const loginButton = document.getElementById('login-button');
const saveButton = document.getElementById('save-button');
const addButton = document.getElementById('add-project-button');
const statusElem = document.getElementById('status');
const projectListContainer = document.getElementById('proyectos-editor-list');

let githubToken = null;
let fileSha = null; // SHA del archivo para poder actualizarlo

// --- LÓGICA DE AUTENTICACIÓN --- (Sin cambios)
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get('access_token');
    if (token) {
        githubToken = token;
        window.history.replaceState({}, document.title, window.location.pathname);
        showEditor();
        loadProjects();
    }
});

loginButton.addEventListener('click', () => {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo&redirect_uri=${window.location.href}`;
    window.location.href = authUrl;
});

function showEditor() {
    loginContainer.style.display = 'none';
    editorContainer.style.display = 'block';
}

// --- LÓGICA DE CARGA Y RENDERIZADO DE PROYECTOS ---

async function loadProjects() {
    if (!githubToken) return;
    statusElem.textContent = 'Cargando proyectos...';

    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${CONTENT_FILE_PATH}`, {
            headers: { 'Authorization': `token ${githubToken}` }
        });
        if (!response.ok) throw new Error(`Error de GitHub: ${response.statusText}`);
        
        const data = await response.json();
        fileSha = data.sha;
        const decodedContent = atob(data.content);
        const proyectos = JSON.parse(decodedContent);

        projectListContainer.innerHTML = '';
        proyectos.forEach((proyecto, index) => {
            renderProjectForm(proyecto, index);
        });

        // MODIFICADO: Inicializamos TinyMCE DESPUÉS de haber creado todos los textareas
        tinymce.init({
            selector: 'textarea.tinymce-editor', // Usamos una clase para aplicar a todos los editores
            plugins: 'code lists link',
            toolbar: 'undo redo | blocks | bold italic | bullist numlist | link | code',
            height: 250
        });

        statusElem.textContent = 'Proyectos cargados.';
    } catch (error) {
        statusElem.textContent = 'Error al cargar los proyectos.';
        console.error(error);
    }
}

function renderProjectForm(proyecto, index) {
    // MODIFICADO: Añadimos la clase "tinymce-editor" al textarea de la descripción
    const formHtml = `
        <div class="editor-proyecto-item" data-index="${index}">
            <button class="delete-button" style="grid-column: 1 / -1; text-align: right; border: none; background: transparent; color: red; cursor: pointer; font-size: 1.2em;">✖</button>
            <div>
                <label for="titulo-${index}">Título</label>
                <input type="text" id="titulo-${index}" value="${proyecto.titulo || ''}">
            </div>
            <div>
                <label for="descripcion-${index}">Descripción</label>
                <textarea id="descripcion-${index}" class="tinymce-editor">${proyecto.descripcion || ''}</textarea>
            </div>
            <div>
                <label for="imagenUrl-${index}">URL de la Imagen (ej: img/proyecto.png)</label>
                <input type="text" id="imagenUrl-${index}" value="${proyecto.imagenUrl || ''}">
            </div>
            <div>
                <label for="enlaceUrl-${index}">URL del Proyecto (GitHub, etc.)</label>
                <input type="text" id="enlaceUrl-${index}" value="${proyecto.enlaceUrl || ''}">
            </div>
            <div>
                <label for="categoria-${index}">Categoría</label>
                <select id="categoria-${index}">
                    <option value="Facultad" ${proyecto.categoria === 'Facultad' ? 'selected' : ''}>Facultad</option>
                    <option value="Personal" ${proyecto.categoria === 'Personal' ? 'selected' : ''}>Personal</option>
                </select>
            </div>
        </div>
    `;
    projectListContainer.insertAdjacentHTML('beforeend', formHtml);
}

// --- LÓGICA DE GUARDADO Y MODIFICACIÓN ---

saveButton.addEventListener('click', async () => {
    if (!githubToken) return;
    statusElem.textContent = 'Guardando...';

    const nuevosProyectos = [];
    const projectForms = document.querySelectorAll('.editor-proyecto-item');

    projectForms.forEach(form => {
        const index = form.dataset.index;
        // MODIFICADO: Usamos la API de TinyMCE para obtener el contenido del editor
        const descripcionContenido = tinymce.get(`descripcion-${index}`).getContent();

        const proyecto = {
            titulo: document.getElementById(`titulo-${index}`).value,
            descripcion: descripcionContenido, // Usamos el contenido del editor
            imagenUrl: document.getElementById(`imagenUrl-${index}`).value,
            enlaceUrl: document.getElementById(`enlaceUrl-${index}`).value,
            categoria: document.getElementById(`categoria-${index}`).value,
            altImagen: `Captura de pantalla del proyecto ${document.getElementById(`titulo-${index}`).value}`
        };
        nuevosProyectos.push(proyecto);
    });
    
    const contentToSave = JSON.stringify(nuevosProyectos, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(contentToSave)));

    try {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${CONTENT_FILE_PATH}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `[Admin] Actualización de proyectos.json`,
                content: encodedContent,
                sha: fileSha
            })
        });
        if (!response.ok) throw new Error(`Error de GitHub: ${response.statusText}`);
        
        const data = await response.json();
        fileSha = data.content.sha;
        statusElem.textContent = '¡Proyectos guardados con éxito!';

    } catch (error) {
        statusElem.textContent = 'Error al guardar.';
        console.error(error);
    }
});

// NUEVO: Lógica para el botón de añadir y eliminar
addButton.addEventListener('click', () => {
    const nuevoIndex = document.querySelectorAll('.editor-proyecto-item').length;
    const proyectoVacio = { titulo: "Nuevo Proyecto", categoria: "Personal", descripcion: "" };
    renderProjectForm(proyectoVacio, nuevoIndex);

    // Inicializamos TinyMCE solo en el nuevo textarea
    tinymce.init({
        selector: `#descripcion-${nuevoIndex}`,
        plugins: 'code lists link',
        toolbar: 'undo redo | blocks | bold italic | bullist numlist | link | code',
        height: 250
    });
});

projectListContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-button')) {
        if (confirm('¿Estás seguro de que quieres eliminar este proyecto? El cambio no se guardará hasta que presiones "Guardar Todos los Cambios".')) {
            const formItem = e.target.closest('.editor-proyecto-item');
            const index = formItem.dataset.index;
            const editorId = `descripcion-${index}`;
            
            // Eliminamos la instancia de TinyMCE antes de quitar el elemento del DOM
            if (tinymce.get(editorId)) {
                tinymce.get(editorId).remove();
            }
            formItem.remove();
        }
    }
});