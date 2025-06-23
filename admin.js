// === CONFIGURACIÓN ===
const GITHUB_CONFIG = {
    owner: 'cepoide',
    repo: 'cepoide.github.io',
    path: 'proyectos.json',
    branch: 'main'
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
    const savedToken = localStorage.getItem('github_token');

    if (savedToken) {
        // Si tenemos un token, intentamos autenticarnos
        await setupAuthenticated(savedToken);
    } else {
        // Si no hay token, mostramos el mensaje de login
        loginContainer.innerHTML = `
            <h1>Panel de Administración</h1>
            <p>No se encontró un token de acceso guardado.</p>
            <button onclick="window.location.href='login.html'">Ir a la página de Login</button>
        `;
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
        // Si el token es inválido, mostramos el mensaje de error y el botón de login
        loginContainer.innerHTML = `
            <h1>Panel de Administración</h1>
            <p style="color: red;">Tu token de acceso no es válido o ha expirado.</p>
            <p>Por favor, genera uno nuevo y configúralo en la página de login.</p>
            <button onclick="window.location.href='login.html'">Ir a la página de Login</button>
        `;
        loginContainer.style.display = 'block';
        editorContainer.style.display = 'none';
        localStorage.removeItem('github_token'); // Limpiamos el token inválido
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
    if (tinymce.editors.length > 0) {
        tinymce.remove();
    }

    projects.forEach((project, index) => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'editor-proyecto-item';
        projectDiv.innerHTML = `
            <h3>${project.titulo}</h3>
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
            <button class="delete-button" data-index="${index}">Eliminar Proyecto</button>
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
        let updatedProjects = [];

        for (const el of projectElements) {
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

        const { data } = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            ...GITHUB_CONFIG,
            message: `[Admin Panel] Actualización de proyectos ${new Date().toISOString()}`,
            content: content,
            sha: fileSha
        });
        
        fileSha = data.content.sha;
        statusElem.textContent = '¡Guardado con éxito!';

    } catch (error) {
        console.error('Error al guardar:', error);
        statusElem.textContent = 'Error al guardar. Revisa la consola.';
    }
});

// === AÑADIR NUEVO PROYECTO ===
addButton.addEventListener('click', () => {
    const newIndex = document.querySelectorAll('.editor-proyecto-item').length;

    // Crea un nuevo objeto de proyecto
    const newProject = {
        titulo: "Nuevo Proyecto",
        descripcion: "<p>Añade una descripción aquí.</p>",
        imagenUrl: "img/placeholder.png",
        enlaceUrl: "#",
        categoria: "Personal"
    };
    
    // Renderiza el nuevo proyecto en la UI y lo añade a la lista
    const projectDiv = document.createElement('div');
    projectDiv.className = 'editor-proyecto-item';
    projectDiv.innerHTML = `
        <h3>${newProject.titulo}</h3>
        <div><label>Título</label><input type="text" class="titulo" value="${newProject.titulo}"></div>
        <div><label>Descripción</label><textarea id="editor-${newIndex}" class="descripcion">${newProject.descripcion}</textarea></div>
        <div><label>URL de la Imagen</label><input type="text" class="imagenUrl" value="${newProject.imagenUrl}"></div>
        <div><label>URL del Proyecto</label><input type="text" class="enlaceUrl" value="${newProject.enlaceUrl}"></div>
        <div>
            <label>Categoría</label>
            <select class="categoria">
                <option value="Facultad">Facultad</option>
                <option value="Personal" selected>Personal</option>
            </select>
        </div>
        <button class="delete-button" data-index="${newIndex}">Eliminar Proyecto</button>
    `;
    projectListContainer.appendChild(projectDiv);

    // Inicializa TinyMCE en el nuevo textarea
    tinymce.init({
        selector: `#editor-${newIndex}`
    });
    
    // Añade el event listener al nuevo botón de eliminar
    projectDiv.querySelector('.delete-button').addEventListener('click', (e) => {
        if (confirm('¿Estás seguro de que quieres eliminar este proyecto?')) {
            e.target.closest('.editor-proyecto-item').remove();
        }
    });
});
