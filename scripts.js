// =========================
// Inicialización principal
// =========================

document.addEventListener("DOMContentLoaded", () => {
  initDesktopIcons();
  initWindows();
  initModeToggle();
  initProfileImageRotation();
  cargarProyectosDesdeGitHub(); 
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

      zIndexCounter++;
      targetWindow.style.zIndex = zIndexCounter;

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
    mostrarVentana(name);
  });
});

function mostrarVentana(name) {
  const ventana = document.getElementById(`window-${name}`);
  if (!ventana) return;

  let top = baseTop + openedCount * offset;
  let left = baseLeft + openedCount * offset;

  const maxTop = window.innerHeight - ventana.offsetHeight;
  const maxLeft = window.innerWidth - ventana.offsetWidth;

  if (top > maxTop) top = baseTop;
  if (left > maxLeft) left = baseLeft;

  ventana.style.top = `${top}px`;
  ventana.style.left = `${left}px`;
  ventana.style.display = 'block';

  openedCount++;

  if (!ventana.dataset.inicializada) {
    hacerArrastrable(ventana);
    hacerRedimensionable(ventana);
    ventana.dataset.inicializada = 'true';
  }
}

function hacerArrastrable(el) {
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  el.addEventListener('mousedown', e => {
    if (e.target.classList.contains('close-floating') || e.target.classList.contains('resizer')) return;

    isDragging = true;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;

    el.style.cursor = 'grabbing';
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

  el.querySelector('.close-floating').addEventListener('click', () => {
    el.style.display = 'none';
  });
}

function hacerRedimensionable(el) {
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

async function cargarProyectosDesdeGitHub() {
  const API_URL = 'proyectos.json'; // URL local
  
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const proyectos = await res.json(); // direct parse, sin decode base64
    
    renderProyectosEnVentanas(proyectos);
  } catch (err) {
    console.error("Error al cargar proyectos:", err);
  }
}

function renderProyectosEnVentanas(proyectos) {
  ["personal", "university", "professional"].forEach(id => {
    const contenedor = document.querySelector(`#window-${id} .ventana-contenido`);
    if (contenedor) contenedor.innerHTML = "";
  });

  proyectos.forEach(proyecto => {
    let categoria = proyecto.categoria.toLowerCase();
    if (categoria === "facultad") categoria = "university";

    const ventana = document.querySelector(`#window-${categoria} .ventana-contenido`);
    if (!ventana) {
      console.warn(`No existe una ventana para la categoría ${proyecto.categoria}`);
      return;
    }

    const div = document.createElement("div");
    div.classList.add("proyecto-item");
    div.innerHTML = `
      <h3>${proyecto.titulo}</h3>
      <img src="${proyecto.imagenUrl}" alt="${proyecto.altImagen}" style="max-width: 100px;">
      <p>${proyecto.descripcion}</p>
      <a href="${proyecto.enlaceUrl}" target="_blank">Ver proyecto</a>
    `;
    ventana.appendChild(div);
  });
}

function renderProyectosEnVentanas(proyectos) {
  ["personal", "university", "professional"].forEach(id => {
    const contenedor = document.querySelector(`#window-${id} .ventana-contenido`);
    if (contenedor) contenedor.innerHTML = "";
  });

  proyectos.forEach(proyecto => {
    let categoria = proyecto.categoria.toLowerCase();
    if (categoria === "facultad") categoria = "university";

    const ventana = document.querySelector(`#window-${categoria} .ventana-contenido`);
    if (!ventana) {
      console.warn(`No existe una ventana para la categoría ${proyecto.categoria}`);
      return;
    }

    const div = document.createElement("div");
    div.classList.add("proyecto-item");
    div.innerHTML = `
      <img src="${proyecto.imagenUrl}" alt="${proyecto.altImagen}" class="preview-img" />
      <h4 class="preview-title">${proyecto.titulo}</h4>
    `;

    div.addEventListener('click', () => {
      abrirDetalleProyecto(proyecto);
    });

    ventana.appendChild(div);
  });
}

function abrirDetalleProyecto(proyecto) {
  // Aquí abrís o generás la ventana modal con más detalles
  // Para arrancar, podés mostrar un alert:
  alert(`Proyecto: ${proyecto.titulo}\n\nDescripción:\n${proyecto.descripcion}`);

  // Luego podemos reemplazar por una ventana flotante que cargue más imágenes, etc.
}
