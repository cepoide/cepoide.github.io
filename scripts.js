// =========================
// Inicialización principal
// =========================

document.addEventListener("DOMContentLoaded", () => {
    initDesktopIcons();
    initWindows();
    initModeToggle();
    initProfileImageRotation();
    loadProjectsFromGitHub();
    // Agregamos un listener para el evento resize
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize(); // Llamada inicial para establecer el estado responsive de las ventanas
});

let zIndexCounter = 10;
// Las variables baseTop y baseLeft ahora son porcentajes para mayor adaptabilidad
const baseTop = 10; // % del alto de la ventana
const baseLeft = 10; // % del ancho de la ventana
const offset = 2; // % para el desplazamiento de ventanas apiladas
let openedCount = 0;

// Variable para manejar el estado responsive
let isMobile = false;

// =========================
// Funciones de utilidad responsive para VENTANAS FLOTANTES
// =========================

function handleWindowResize() {
    // Definimos un breakpoint, puedes ajustarlo según tus necesidades de CSS
    const mobileBreakpoint = 768; // px
    const currentIsMobile = window.innerWidth < mobileBreakpoint;

    // Solo reajustamos si el modo (mobile/desktop) ha cambiado
    if (currentIsMobile !== isMobile) {
        isMobile = currentIsMobile;
        // Solo afectamos las ventanas flotantes
        document.querySelectorAll('.floating-window').forEach(win => {
            if (win.style.display === 'block') { // Solo si la ventana está visible
                positionFloatingWindow(win);
                // Si la ventana ya está inicializada, re-aplica el makeResizable
                // para que el resizer aparezca/desaparezca correctamente
                if (win.dataset.initialized === 'true') {
                    makeResizable(win);
                }
            }
        });
        // También volvemos a renderizar los proyectos para que las imágenes se ajusten
        // si se quitó o puso la rotación aleatoria
        if (projectsData.length > 0) {
            renderProjectsInWindows(projectsData);
        }
    }
}

// Función para posicionar y dimensionar ventanas flotantes de forma responsive
function positionFloatingWindow(windowElement) {
    if (isMobile) {
        // En móvil, las ventanas ocupan casi todo el ancho y alto
        windowElement.style.top = '5%';
        windowElement.style.left = '5%';
        windowElement.style.width = '90%';
        windowElement.style.height = '90%';
        windowElement.style.maxWidth = '90%'; // Añadir max-width para asegurar
        windowElement.style.maxHeight = '90%'; // Añadir max-height para asegurar
        windowElement.classList.add('no-resizable'); // Desactivamos la redimensión
    } else {
        // En escritorio, usamos el posicionamiento original
        let top = baseTop + openedCount * offset;
        let left = baseLeft + openedCount * offset;

        // Convertimos porcentajes a píxeles para el posicionamiento
        top = (window.innerHeight * top) / 100;
        left = (window.innerWidth * left) / 100;

        const maxTop = window.innerHeight - windowElement.offsetHeight;
        const maxLeft = window.innerWidth - windowElement.offsetWidth;

        if (top > maxTop) top = (window.innerHeight * baseTop) / 100;
        if (left > maxLeft) left = (window.innerWidth * baseLeft) / 100;

        windowElement.style.top = `${top}px`;
        windowElement.style.left = `${left}px`;
        // Restablecemos ancho/alto a auto o a valores por defecto para desktop
        windowElement.style.width = '600px'; // Un ancho por defecto o 'auto'
        windowElement.style.height = '400px'; // Un alto por defecto o 'auto'
        windowElement.style.maxWidth = 'none'; // Quitar restricciones de max-width/height
        windowElement.style.maxHeight = 'none';
        windowElement.classList.remove('no-resizable'); // Aseguramos que se pueda redimensionar
    }
}

// =========================
// Íconos y ventanas
// =========================

function initDesktopIcons() {
    document.querySelectorAll('.icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const targetWindow = document.getElementById(icon.dataset.targetWindow);
            if (!targetWindow) return;

            targetWindow.style.display = 'block';

            // Solo si es una ventana flotante, aplicamos la lógica responsive
            if (targetWindow.classList.contains('floating-window')) {
                positionFloatingWindow(targetWindow);
            } else {
                // Para ventanas no flotantes (si las hubiera y no quisieras que fueran responsive)
                // simplemente asegúrate de que se muestren.
                // Aquí podrías añadir una lógica de posicionamiento diferente si es necesario
                // para ventanas estáticas.
            }

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
// Modo claro/oscuro (sin cambios, ya que no afecta la responsividad general)
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
// Efecto máquina de escribir (sin cambios)
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
// Rotación imagen perfil (sin cambios)
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
            }, {
                once: true
            });
        }, 350);
    });
}

// =========================
// VENTANAS PROJECTS (con ajustes para responsividad solo en flotantes)
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

    // Usamos la función positionFloatingWindow para gestionar el posicionamiento
    positionFloatingWindow(windowElement);

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

    // Solo hacemos arrastrable si no estamos en modo móvil
    const startDrag = (e) => {
        if (isMobile || e.target.classList.contains('close-floating') || e.target.classList.contains('resizer')) return;

        isDragging = true;
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;

        el.style.cursor = 'grabbing';

        bringFloatingWindowToFront(el);
    };

    const drag = (e) => {
        if (!isDragging) return;

        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
    };

    const stopDrag = () => {
        isDragging = false;
        el.style.cursor = 'default';
    };

    el.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    // Agregamos soporte táctil para arrastrar si NO estamos en móvil
    el.addEventListener('touchstart', (e) => {
        if (isMobile) return;
        e.clientX = e.touches[0].clientX;
        e.clientY = e.touches[0].clientY;
        startDrag(e);
    }, {
        passive: false
    });
    document.addEventListener('touchmove', (e) => {
        if (!isDragging || isMobile) return;
        e.clientX = e.touches[0].clientX;
        e.clientY = e.touches[0].clientY;
        drag(e);
    }, {
        passive: false
    });
    document.addEventListener('touchend', stopDrag);

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
    let resizer = el.querySelector('.resizer');

    if (isMobile) {
        // Si estamos en móvil, aseguramos que el resizer no exista
        if (resizer) {
            resizer.remove();
        }
        return; // Salimos de la función, no hacemos la ventana redimensionable
    }

    // Si no estamos en móvil y el resizer no existe, lo creamos
    if (!resizer) {
        resizer = document.createElement('div');
        resizer.className = 'resizer';
        el.appendChild(resizer);
    }


    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    const startResize = (e) => {
        // No permitimos redimensionar en móvil
        if (isMobile) return;

        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = el.offsetWidth;
        startHeight = el.offsetHeight;
        e.preventDefault();
        e.stopPropagation();
        bringFloatingWindowToFront(el);
    };

    const resize = (e) => {
        if (!isResizing || isMobile) return; // Aseguramos que no se redimensione en móvil

        const newWidth = startWidth + (e.clientX - startX);
        const newHeight = startHeight + (e.clientY - startY);

        el.style.width = `${Math.max(200, newWidth)}px`;
        el.style.height = `${Math.max(150, newHeight)}px`;
    };

    const stopResize = () => {
        isResizing = false;
    };

    resizer.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    // Agregamos soporte táctil para redimensionar si NO estamos en móvil
    resizer.addEventListener('touchstart', (e) => {
        if (isMobile) return;
        e.clientX = e.touches[0].clientX;
        e.clientY = e.touches[0].clientY;
        startResize(e);
    }, {
        passive: false
    });
    document.addEventListener('touchmove', (e) => {
        if (!isResizing || isMobile) return;
        e.clientX = e.touches[0].clientX;
        e.clientY = e.touches[0].clientY;
        resize(e);
    }, {
        passive: false
    });
    document.addEventListener('touchend', stopResize);
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

        // Aplicar rotación y traslación aleatoria, solo si NO estamos en móvil
        if (!isMobile) {
            const randomRotation = Math.random() * 6 - 3; // Un número entre -3 y 3 grados
            const randomTranslateX = Math.random() * 10 - 5; // Entre -5px y 5px
            const randomTranslateY = Math.random() * 10 - 5; // Entre -5px y 5px
            div.style.transform = `rotate(${randomRotation}deg) translate(${randomTranslateX}px, ${randomTranslateY}px)`;
            div.style.transition = 'transform 0.3s ease';
        } else {
            // En móvil, aseguramos que no haya transformaciones aleatorias
            div.style.transform = 'none';
            div.style.transition = 'none';
        }

        windowContainer.appendChild(div);
    });
}

// =========================
// Abrir detalle proyecto (sin cambios significativos, ya está dentro de una ventana flotante)
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

    closeButton.classList.add('volver');
    closeButton.title = "Volver";

    const returnFunction = () => {
        detailContainer.style.display = 'none';

        projectList.style.display = 'flex';
        void projectList.offsetWidth;
        renderProjectsInWindows(projectsData);

        closeButton.classList.remove('volver');
        closeButton.title = "Cerrar";
        closeButton.removeEventListener('click', returnFunction);
        delete closeButton.dataset.returnListener;

        const defaultCloseHandler = (e) => {
            if (!e.currentTarget.classList.contains('volver')) {
                e.stopPropagation();
                parentWindow.style.display = 'none';
            }
        };
        closeButton.addEventListener('click', defaultCloseHandler);
        closeButton.dataset.closeListener = `(${defaultCloseHandler.toString()})`;
    };

    closeButton.addEventListener('click', returnFunction);
    closeButton.dataset.returnListener = `(${returnFunction.toString()})`;
}