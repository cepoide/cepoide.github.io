// =========================
// Inicialización principal
// =========================

document.addEventListener("DOMContentLoaded", () => {
    initDesktopIcons();
    initWindows();
    initModeToggle();
    initProfileImageRotation();
    loadProjectsFromGitHub(); // Esta llamada inicial seguirá siendo para la primera carga
});

let zIndexCounter = 10;
const baseTop = 50;
const baseLeft = 50;
const offset = 30;
let openedCount = 0;

// =========================
// Íconos y ventanas
// =========================

function initDesktopIcons() {
    document.querySelectorAll('.icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const targetWindow = document.getElementById(icon.dataset.targetWindow);
            if (!targetWindow) return;

            targetWindow.style.display = 'block';

            if (!targetWindow.classList.contains('floating-window')) {
                zIndexCounter++;
                targetWindow.style.zIndex = zIndexCounter;
            }

            const bubbleText = targetWindow.querySelector("#bubble-text");
            if (bubbleText) {
                const text = bubbleText.dataset.text || bubbleText.textContent.trim();
                typeWriter(bubbleText, text);
            }

            const toolstack = targetWindow.querySelector(".toolstack");
            if (toolstack) {
                toolstack.style.animation = 'none';
                void toolstack.offsetWidth;
                toolstack.style.animation = '';
            }
        });
    });
}

function initWindows() {
    document.querySelectorAll('.win98-window').forEach(win => {
        const closeBtn = win.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                win.style.display = 'none';
            });
        }
    });
    document.querySelectorAll('.floating-window').forEach(floatingWin => {
        floatingWin.addEventListener('mousedown', () => {
            bringFloatingWindowToFront(floatingWin);
        });
    });
}

// =========================
// Modo claro/oscuro
// =========================

function initModeToggle() {
    const modeSelectorBar = document.getElementById("mode-selector-bar");
    const modeHandle = document.getElementById("mode-handle");

    let isDragging = false;

    const updateHandle = () => {
        const maxLeft = modeSelectorBar.offsetWidth - modeHandle.offsetWidth;
        modeHandle.style.left = document.body.classList.contains("dark-mode") ? `${maxLeft}px` : '0px';
    };

    window.addEventListener('load', updateHandle);

    modeHandle.addEventListener('mousedown', e => {
        isDragging = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging) return;

        const barRect = modeSelectorBar.getBoundingClientRect();
        const handleWidth = modeHandle.offsetWidth;
        const maxLeft = modeSelectorBar.offsetWidth - handleWidth;

        let newLeft = e.clientX - barRect.left - handleWidth / 2;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));

        modeHandle.style.left = `${newLeft}px`;
        document.body.classList.toggle("dark-mode", newLeft >= maxLeft / 2);
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;

        isDragging = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        updateHandle();
    });

    modeSelectorBar.addEventListener('click', () => {
        document.body.classList.toggle("dark-mode");
        updateHandle();
    });
}

// =========================
// Efecto máquina de escribir
// =========================

function typeWriter(element, text, speed = 10) {
    element.textContent = "";
    let i = 0;

    const write = () => {
        if (i < text.length) {
            element.textContent += text.charAt(i++);
            setTimeout(write, speed);
        }
    };

    write();
}

// =========================
// Rotación imagen perfil
// =========================

function initProfileImageRotation() {
    const profileImage = document.querySelector('.profile-image');
    if (!profileImage) return;

    const originalSrc = profileImage.src;
    const alternateSrc = 'img/yogatito.svg';

    profileImage.addEventListener('click', () => {
        if (profileImage.classList.contains('spiral-out') || profileImage.classList.contains('spiral-in')) return;

        profileImage.classList.add('spiral-out');

        setTimeout(() => {
            profileImage.src = profileImage.src.includes('yo.svg') ? alternateSrc : originalSrc;

            profileImage.classList.remove('spiral-out');
            profileImage.classList.add('spiral-in');

            profileImage.addEventListener('animationend', () => {
                profileImage.classList.remove('spiral-in');
            }, { once: true });
        }, 350);
    });
}

// =========================
// VENTANAS PROJECTS
// =========================

document.querySelectorAll('.folder').forEach(folder => {
    folder.addEventListener('click', () => {
        const name = folder.querySelector('span').textContent.toLowerCase();
        showWindow(name);
    });
});

function showWindow(name) {
    const windowElement = document.getElementById(`window-${name}`);
    if (!windowElement) return;

    windowElement.classList.add('floating-window');

    let top = baseTop + openedCount * offset;
    let left = baseLeft + openedCount * offset;

    const maxTop = window.innerHeight - windowElement.offsetHeight;
    const maxLeft = window.innerWidth - windowElement.offsetWidth;

    if (top > maxTop) top = baseTop;
    if (left > maxLeft) left = baseLeft;

    windowElement.style.top = `${top}px`;
    windowElement.style.left = `${left}px`;
    windowElement.style.display = 'block';

    openedCount++;

    bringFloatingWindowToFront(windowElement);

    if (!windowElement.dataset.initialized) {
        makeDraggable(windowElement);
        makeResizable(windowElement);
        windowElement.dataset.initialized = 'true';
    }
}

function bringFloatingWindowToFront(windowElement) {
    if (windowElement.classList.contains('floating-window')) {
        zIndexCounter++;
        windowElement.style.zIndex = zIndexCounter;
    }
}

function makeDraggable(el) {
    let offsetX = 0;
    let offsetY = 0;
    let isDragging = false;

    el.addEventListener('mousedown', e => {
        if (e.target.classList.contains('close-floating') || e.target.classList.contains('resizer')) return;

        isDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;

        el.style.cursor = 'grabbing';

        bringFloatingWindowToFront(el);
    });

    document.addEventListener('mousemove', e => {
        if (!isDragging) return;

        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        el.style.cursor = 'default';
    });

    const closeBtn = el.querySelector('.close-floating');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (!closeBtn.classList.contains('volver')) {
                el.style.display = 'none';
            }
        });
    }
}

function makeResizable(el) {
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    el.appendChild(resizer);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizer.addEventListener('mousedown', e => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = el.offsetWidth;
        startHeight = el.offsetHeight;
        e.preventDefault();
        e.stopPropagation();
        bringFloatingWindowToFront(el);
    });

    document.addEventListener('mousemove', e => {
        if (!isResizing) return;

        const newWidth = startWidth + (e.clientX - startX);
        const newHeight = startHeight + (e.clientY - startY);

        el.style.width = `${Math.max(100, newWidth)}px`;
        el.style.height = `${Math.max(100, newHeight)}px`;
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
}

// =========================
// Cargar proyectos dinámicos
// =========================

// Variable global para almacenar los proyectos
let projectsData = []; 

async function loadProjectsFromGitHub() {
    const API_URL = 'proyectos.json'; // URL local

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        projectsData = await res.json(); // Almacena los datos
        renderProjectsInWindows(projectsData);
    } catch (err) {
        console.error("Error al cargar proyectos:", err);
    }
}

function renderProjectsInWindows(projects) {
    // Primero, limpiamos todos los contenedores de proyectos dinámicos
    ["personal", "university", "professional"].forEach(id => {
        const container = document.querySelector(`#window-${id} .ventana-contenido`);
        if (container) container.innerHTML = "";
    });

    // Luego, volvemos a renderizar todos los proyectos en sus respectivas ventanas
    projects.forEach(project => {
        let category = project.categoria.toLowerCase();
        if (category === "facultad") category = "university";

        const windowContainer = document.querySelector(`#window-${category} .ventana-contenido`);
        if (!windowContainer) {
            // Importante: si la categoría es 'skills', y no tiene un '.ventana-contenido',
            // asumimos que su contenido es estático en el HTML. No hacemos nada aquí.
            if (category === "skills") {
                return;
            }
            console.warn(`No se encontró la ventana para la categoría ${project.categoria}`);
            return;
        }

        const div = document.createElement("div");
        div.classList.add("proyecto-item");
        div.innerHTML = `
            <img src="${project.imagenUrl}" alt="${project.altImagen}" class="preview-img" />
            <h4 class="preview-title">${project.titulo}</h4>
        `;

        div.addEventListener('click', () => {
            openProjectDetail(project, windowContainer.parentElement);
        });

        // Aplicar rotación y traslación aleatoria
        const randomRotation = Math.random() * 6 - 3; // Un número entre -3 y 3 grados
        const randomTranslateX = Math.random() * 10 - 5; // Entre -5px y 5px
        const randomTranslateY = Math.random() * 10 - 5; // Entre -5px y 5px

        div.style.transform = `rotate(${randomRotation}deg) translate(${randomTranslateX}px, ${randomTranslateY}px)`;
        div.style.transition = 'transform 0.3s ease';

        windowContainer.appendChild(div);
    });
}

// =========================
// Abrir detalle proyecto
// =========================

function openProjectDetail(project, parentWindow) {
    const projectList = parentWindow.querySelector('.ventana-contenido');
    if (!projectList) return;

    projectList.style.display = 'none';

    let detailContainer = parentWindow.querySelector('.detalle-proyecto');
    if (!detailContainer) {
        detailContainer = document.createElement('div');
        detailContainer.classList.add('detalle-proyecto');
        detailContainer.style.padding = '10px';
        detailContainer.style.overflowY = 'auto';
        detailContainer.style.height = 'calc(100% - 40px)';
        parentWindow.appendChild(detailContainer);
    }
    detailContainer.style.display = 'block';

    detailContainer.innerHTML = '';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = project.descripcion;

    const imgs = Array.from(tempDiv.querySelectorAll('img'));
    const imgSrcs = imgs.map(img => img.src);
    imgs.forEach(img => img.remove());

    const titleElement = document.createElement('h2');
    titleElement.textContent = project.titulo;
    titleElement.classList.add('detalle-proyecto-titulo');
    detailContainer.appendChild(titleElement);

    if (imgSrcs.length > 0) {
        const slider = document.createElement('div');
        slider.classList.add('detalle-proyecto-slider');

        const leftArrow = document.createElement('button');
        leftArrow.classList.add('slider-arrow', 'left');
        leftArrow.innerHTML = `
            <span class="arrow-line"></span>
            <span class="arrow-tip-top"></span>
            <span class="arrow-tip-bottom"></span>
        `;

        const rightArrow = document.createElement('button');
        rightArrow.classList.add('slider-arrow', 'right');
        rightArrow.innerHTML = `
            <span class="arrow-line"></span>
            <span class="arrow-tip-top"></span>
            <span class="arrow-tip-bottom"></span>
        `;

        const imgElement = document.createElement('img');
        imgElement.classList.add('slider-image');
        let currentIndex = 0;

        function updateImage() {
            imgElement.src = imgSrcs[currentIndex];
        }

        leftArrow.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + imgSrcs.length) % imgSrcs.length;
            updateImage();
        });

        rightArrow.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % imgSrcs.length;
            updateImage();
        });

        slider.appendChild(leftArrow);
        slider.appendChild(imgElement);
        slider.appendChild(rightArrow);

        detailContainer.appendChild(slider);
        updateImage();
    } else {
        const mainImage = document.createElement('img');
        mainImage.src = project.imagenUrl;
        mainImage.alt = project.altImagen || '';
        mainImage.style.maxWidth = '100%';
        mainImage.style.borderRadius = '8px';
        mainImage.style.marginBottom = '12px';
        detailContainer.appendChild(mainImage);
    }

    const descriptionDiv = document.createElement('div');
    descriptionDiv.classList.add('descripcion-proyecto');
    descriptionDiv.innerHTML = tempDiv.innerHTML;
    detailContainer.appendChild(descriptionDiv);

    const projectLink = document.createElement('a');
    projectLink.href = project.enlaceUrl;
    projectLink.target = '_blank';
    projectLink.rel = 'noopener noreferrer';
    projectLink.classList.add('boton-ver-proyecto');
    projectLink.textContent = 'Ver proyecto online';
    detailContainer.appendChild(projectLink);

    const closeButton = parentWindow.querySelector('.close-floating');
    if (!closeButton) return;

    // Reiniciar listeners previos para el botón 'close-floating'
    // Esto es vital ya que openProjectDetail puede ser llamado múltiples veces para el mismo botón
    const oldReturnFunction = closeButton.dataset.returnListener;
    if (oldReturnFunction) {
        closeButton.removeEventListener('click', eval(oldReturnFunction));
        delete closeButton.dataset.returnListener;
    }
    const oldCloseFunction = closeButton.dataset.closeListener;
    if (oldCloseFunction) {
        closeButton.removeEventListener('click', eval(oldCloseFunction));
        delete closeButton.dataset.closeListener;
    }

    // Configurar el botón en modo "volver"
    closeButton.classList.add('volver');
    closeButton.title = "Volver";

    const returnFunction = () => {
        detailContainer.style.display = 'none';
        
        // *** LA CORRECCIÓN CLAVE ***:
        // 1. Aseguramos que el contenedor sea display: flex
        projectList.style.display = 'flex'; 
        // 2. Forzamos un reflow para que el navegador recalcule el layout de Flexbox
        void projectList.offsetWidth; 
        // 3. Volvemos a renderizar TODOS los proyectos para que se apliquen las transformaciones aleatorias
        renderProjectsInWindows(projectsData); 

        closeButton.classList.remove('volver');
        closeButton.title = "Cerrar"; // Restablecer título a 'Cerrar'
        closeButton.removeEventListener('click', returnFunction);
        // Limpiar la referencia de la función almacenada
        delete closeButton.dataset.returnListener;

        // Volver a adjuntar el comportamiento de cierre por defecto (si no está en modo 'volver')
        const defaultCloseHandler = (e) => {
            if (!e.currentTarget.classList.contains('volver')) { // Doble verificación de que no está en modo 'volver'
                e.stopPropagation();
                parentWindow.style.display = 'none'; // Ocultar la ventana padre
            }
        };
        closeButton.addEventListener('click', defaultCloseHandler);
        closeButton.dataset.closeListener = `(${defaultCloseHandler.toString()})`;
    };

    closeButton.addEventListener('click', returnFunction);
    // Almacenar la referencia de la función como una cadena para permitir su eliminación posterior
    closeButton.dataset.returnListener = `(${returnFunction.toString()})`;
}