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
    // Intentar obtener el token de la redirección de OAuth
    const token = await getTokenFromCallback();
    if (token) {
        localStorage.setItem('github_token', token);
        // Limpiar la URL después de obtener el token
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Usar el token guardado si existe
    const savedToken = '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'
    if (savedToken) {
        setupAuthenticated(savedToken);
    }
});

loginButton.addEventListener('click', () => {
    // Redirigir al usuario a GitHub para la autorización
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${OAUTH_CONFIG.clientId}&scope=repo`;
    window.location.href = authUrl;
});

// Función para intercambiar el código por un token (requiere un pequeño proxy)
// Como esto no es posible de forma segura en el cliente, nos basaremos en un flujo simplificado
// Para este ejemplo, usaremos un flujo que dependa de una configuración OAuth de tipo "web"
// que devuelve el token en el hash o requiere un paso intermedio.
// El código de Octokit.js simplifica esto enormemente si la app está bien configurada.
// Por ahora, asumiremos que un token es obtenido y guardado.

// Esta es una simplificación. Un flujo completo y seguro requiere un backend
// o un servicio de proxy para intercambiar el código por un token.
// Sin embargo, para una app de GitHub Pages, podemos usar el token directamente
// si la app OAuth está configurada para un flujo de cliente.
// El siguiente código asume que el token se obtiene y almacena.

async function getTokenFromCallback() {
    // Esto es una simplificación y no funcionará out-of-the-box
    // para intercambiar un `code`. Se necesita un backend o un proxy.
    // La forma más fácil con Octokit es usar un token personal o un flujo de app.
    // Para no complicar, vamos a usar un token personal de momento para probar.
    // Reemplaza esto con un flujo de autenticación real si es necesario.
    return null; // Dejamos esto como placeholder por ahora
}


async function setupAuthenticated(token) {
    octokit = new octokit.Octokit({ auth: token });
    loginContainer.style.display = 'none';
    editorContainer.style.display = 'block';
    await loadProjects();
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
    projects.forEach((project, index) => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'editor-proyecto-item';
        projectDiv.dataset.index = index;
        projectDiv.innerHTML = `
            <h3>Proyecto: <span class="project-title">${project.titulo}</span></h3>
            <div><label>Título</label><input type="text" class="titulo" value="${project.titulo}"></div>
            <div><label>Descripción</label><textarea class="descripcion">${project.descripcion}</textarea></div>
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
            const index = el.dataset.index;
            const titulo = el.querySelector('.titulo').value;
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

        await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            ...GITHUB_CONFIG,
            message: `[Admin Panel] Actualización de proyectos ${new Date().toISOString()}`,
            content: content,
            sha: fileSha
        });

        statusElem.textContent = '¡Guardado con éxito!';
        // Recargar para obtener el nuevo SHA
        setTimeout(loadProjects, 1000);

    } catch (error) {
        console.error('Error al guardar:', error);
        statusElem.textContent = 'Error al guardar. Revisa la consola.';
    }
});

addButton.addEventListener('click', () => {
    const newIndex = document.querySelectorAll('.editor-proyecto-item').length;
    const newProject = {
        titulo: "Nuevo Proyecto",
        descripcion: "<p>Añade una descripción.</p>",
        imagenUrl: "img/placeholder.png",
        enlaceUrl: "#",
        categoria: "Personal"
    };
    // Esta función necesita ser ajustada para renderizar un solo item nuevo
    // Por simplicidad, por ahora pedimos al usuario guardar y recargar.
    alert("Funcionalidad para añadir en el sitio no implementada aún. Por ahora, edita los existentes o añade uno directamente en el JSON.");
});