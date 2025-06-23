// === CONFIGURACIÓN ===
const GITHUB_CONFIG = {
    owner: 'cepoide',
    repo: 'cepoide.github.io',
    path: 'proyectos.json',
    branch: 'main'
};
const OAUTH_CONFIG = {
    clientId: 'Ov23liw9dOe4vGZ3Ueqy' // Tu Client ID
};

// === ELEMENTOS DEL DOM ===
const loginContainer = document.getElementById('login-container');
const editorContainer = document.getElementById('editor-container');
const loginButton = document.getElementById('login-button');
const saveButton = document.getElementById('save-button');
const addButton = document.getElementById('add-project-button');
const projectListContainer = document.getElementById('proyectos-editor-list');
const statusElem = document.getElementById('status');

let octokit;
let fileSha;

// === INICIALIZACIÓN Y AUTENTICACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
    // Para simplificar la prueba, usaremos un token hardcodeado.
    // Reemplaza 'TU_TOKEN_AQUI' con tu Token de Acceso Personal de GitHub.
    const savedToken = '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'; 
    // ADVERTENCIA: No subas este token a un repositorio público.

    if (savedToken) {
        // Si tenemos un token, nos saltamos el login y vamos directo al editor.
        loginButton.disabled = true;
        loginButton.textContent = 'Autenticando...';
        await setupAuthenticated(savedToken);
    } else {
        // Si no hay token, el botón de login estará activo.
        loginButton.addEventListener('click', () => {
            // CONSTRUIMOS LA URL DE AUTORIZACIÓN COMPLETA
            // Esta es la línea que he corregido
            const redirectUri = window.location.origin + window.location.pathname;
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${OAUTH_CONFIG.clientId}&scope=repo&redirect_uri=${encodeURIComponent(redirectUri)}`;
            window.location.href = authUrl;
        });
    }
});

async function setupAuthenticated(token) {
    try {
        octokit = new octokit.Octokit({ auth: token });
        // Verificamos que el token es válido haciendo una petición simple
        await octokit.request('GET /user'); 
        loginContainer.style.display = 'none';
        editorContainer.style.display = 'block';
        await loadProjects();
    } catch(error) {
        console.error("El token no es válido o ha expirado:", error);
        statusElem.textContent = "El token no es válido. Genera uno nuevo.";
        localStorage.removeItem('github_token'); // Limpiamos un token inválido
        loginButton.disabled = false;
        loginButton.textContent = 'Iniciar Sesión con GitHub';
    }
}

// === CARGA Y RENDERIZADO DE PROYECTOS ===
async function loadProjects() {
    try {
        statusElem.textContent = 'Cargando proyectos...';
        const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            ...GITHUB_CONFIG
        });
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
    // Destruir instancias de TinyMCE viejas si existen
    if (tinymce.editors.length > 0) {
        tinymce.remove();
    }

    projects.forEach((project, index) => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'editor-proyecto-item';
        projectDiv.dataset.index = index;
        // Usamos IDs únicos para cada textarea
        projectDiv.innerHTML = `
            <h3>Proyecto: <span class="project-title">${project.titulo}</span></h3>
            <div><label>Título</label><input type="text" class="titulo" value="${project.titulo}"></div>
            <div><label>Descripción</label><textarea id="editor-${index}" class="descripcion">${project.descripcion}</textarea></div>
            <div><label>URL de la Imagen</label><input type="text" class="imagenUrl" value="${project.imagenUrl}"></div>
            <div><label>URL del Proyecto</label><input type="text" class="enlaceUrl" value="${project.enlaceUrl}"></div>
            <div>
                <label>Categoría</label>
                <select class="categoria">
                    <option value="Facultad" ${project.categoria === 'Facultad' ? 'selected' : ''}>Facultad</option>
                    <option value="Personal" ${project.categoria === 'Personal' ? 'selected' : ''}>Personal</option>
                </select>
            </div>
            <button class="delete-button">Eliminar Proyecto</button>
        `;
        projectListContainer.appendChild(projectDiv);
    });

    tinymce.init({
        selector: 'textarea.descripcion',
        plugins: 'code lists link image',
        toolbar: 'undo redo | blocks | bold italic | bullist numlist | link image | code'
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (confirm('¿Estás seguro de que quieres eliminar este proyecto?')) {
                e.target.closest('.editor-proyecto-item').remove();
            }
        });
    });
}

// === GUARDADO DE DATOS ===
saveButton.addEventListener('click', async () => {
    try {
        statusElem.textContent = 'Guardando...';
        const projectElements = document.querySelectorAll('.editor-proyecto-item');
        const updatedProjects = [];

        for (const el of projectElements) {
            const titulo = el.querySelector('.titulo').value;
            // Obtenemos el contenido del editor TinyMCE por su ID
            const descripcion = tinymce.get(el.querySelector('.descripcion').id).getContent();
            
            updatedProjects.push({
                titulo: titulo,
                descripcion: descripcion,
                imagenUrl: el.querySelector('.imagenUrl').value,
                altImagen: `Captura de pantalla del proyecto ${titulo}`,
                enlaceUrl: el.querySelector('.enlaceUrl').value,
                categoria: el.querySelector('.categoria').value
            });
        }

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(updatedProjects, null, 2))));

        const { data } = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            ...GITHUB_CONFIG,
            message: `[Admin Panel] Actualización de proyectos ${new Date().toISOString()}`,
            content: content,
            sha: fileSha
        });
        
        // Actualizamos el SHA para el próximo guardado
        fileSha = data.content.sha;

        statusElem.textContent = '¡Guardado con éxito!';

    } catch (error) {
        console.error('Error al guardar:', error);
        statusElem.textContent = 'Error al guardar. Revisa la consola.';
    }
});

addButton.addEventListener('click', () => {
    // Esta funcionalidad es más compleja de lo que parece
    alert("Funcionalidad para añadir nuevos proyectos no implementada en esta versión. Puedes editar y eliminar los existentes.");
});
