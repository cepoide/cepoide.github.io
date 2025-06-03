const btn = document.getElementById('modo-toggle');
const body = document.body;

// Aplicar modo guardado (oscuro o claro)
if (localStorage.getItem('modo') === 'oscuro') {
  body.classList.add('oscuro');
  btn.textContent = '🌙';
}

// Cambiar modo al hacer clic
btn.addEventListener('click', () => {
  body.classList.toggle('oscuro');
  if (body.classList.contains('oscuro')) {
    btn.textContent = '🌙';
    localStorage.setItem('modo', 'oscuro');
  } else {
    btn.textContent = '☀️';
    localStorage.setItem('modo', 'claro');
  }
});
