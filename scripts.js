// --- LÓGICA PARA EL BOTÓN DE MODO OSCURO/CLARO ---
const btnModo = document.getElementById('modo-toggle');
const body = document.body;

// Aplicar modo guardado (oscuro o claro)
if (localStorage.getItem('modo') === 'oscuro') {
  body.classList.add('oscuro');
  btnModo.textContent = '🌙'; 
} else {
  btnModo.textContent = '☀️';
}

// Cambiar modo al hacer clic
btnModo.addEventListener('click', () => {
  body.classList.toggle('oscuro');
  if (body.classList.contains('oscuro')) {
    btnModo.textContent = '🌙'; // Ícono modo oscuro
    localStorage.setItem('modo', 'oscuro');
  } else {
    btnModo.textContent = '☀️'; // Ícono modo claro
    localStorage.setItem('modo', 'claro');
  }
});

// --- LÓGICA PARA EL MENÚ HAMBURGUESA ---
const menuPrincipal = document.querySelector("#menuNavPrincipal");
const abrirMenuBoton = document.querySelector("#abrirMenuBtn");
const cerrarMenuBoton = document.querySelector("#cerrarMenuBtn");

if (abrirMenuBoton && cerrarMenuBoton && menuPrincipal) {
    abrirMenuBoton.addEventListener("click", () => {
        menuPrincipal.classList.add("visible");
    });

    cerrarMenuBoton.addEventListener("click", () => {
        menuPrincipal.classList.remove("visible");
    });

    // Opcional: Cerrar el menú si se hace clic en un enlace (para Single Page Applications)
    const enlacesDelMenu = menuPrincipal.querySelectorAll("a");
    enlacesDelMenu.forEach(enlace => {
        enlace.addEventListener("click", () => {
            menuPrincipal.classList.remove("visible");
        });
    });

} else {
    console.error("No se encontraron todos los elementos para el menú hamburguesa.");
}

// --- Cargar Proyectos Dinámicamente ---
async function cargarProyectos() {
    try {
        const response = await fetch('proyectos.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const proyectos = await response.json();

        // 1. OBTENEMOS AMBOS CONTENEDORES
        const contenedorFacultad = document.getElementById('lista-proyectos-facultad');
        const contenedorPersonales = document.getElementById('lista-proyectos-personales');

        // Verifica que al menos uno de los contenedores exista para no hacer trabajo de más
        if (contenedorFacultad || contenedorPersonales) {
            proyectos.forEach(proyecto => {
                const proyectoCard = `
                    <a href="${proyecto.enlaceUrl}" target="_blank" class="proyecto-item">
                        <h4>${proyecto.titulo}</h4>
                        <img src="${proyecto.imagenUrl}" alt="${proyecto.altImagen || proyecto.titulo}" class="captura-proyecto">
                        <p>${proyecto.descripcion}</p>
                    </a>
                `;
                
                // 2. LÓGICA PARA DISTRIBUIR LOS PROYECTOS
                if (proyecto.categoria === "Facultad" && contenedorFacultad) {
                    contenedorFacultad.innerHTML += proyectoCard;
                } else if (proyecto.categoria === "Personal" && contenedorPersonales) {
                    contenedorPersonales.innerHTML += proyectoCard;
                }
            });
        }

    } catch (error) {
        console.error("No se pudieron cargar los proyectos:", error);
        // Puedes añadir un mensaje de error en la página si quieres
    }
}

// Asegúrate de que esta línea esté al final para llamar a la función
document.addEventListener('DOMContentLoaded', cargarProyectos);