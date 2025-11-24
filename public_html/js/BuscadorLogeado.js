/* js/BuscadorLogeado.js */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. SESIÓN
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    // 2. HEADER
    let usuario = null;
    try { usuario = JSON.parse(sessionStorage.getItem(currentUserEmail)); } catch(e){}

    const greeting = document.getElementById('user-greeting');
    const photo = document.getElementById('user-photo');

    if (usuario) {
        greeting.textContent = `Hola, ${usuario.nombre}`;
        if (usuario.foto && usuario.foto.length > 10) photo.src = usuario.foto;
    } else {
        greeting.textContent = currentUserEmail;
    }

    // LOGOUT
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'BuscadorAnonimo.html';
    });


    // 3. GESTIÓN DE PESTAÑAS (Genérica vs Geo)
    const tabGenerica = document.getElementById('btn-busqueda-generica');
    const tabGeo = document.getElementById('btn-busqueda-geo');
    const vistaGenerica = document.getElementById('vista-generica');
    const vistaGeo = document.getElementById('vista-geo');

    // Asignar eventos si existen los elementos (por si el HTML varía)
    if(tabGenerica && tabGeo && vistaGenerica && vistaGeo) {
        tabGenerica.addEventListener('click', (e) => {
            e.preventDefault();
            vistaGenerica.style.display = 'block';
            vistaGeo.style.display = 'none';
        });

        tabGeo.addEventListener('click', (e) => {
            e.preventDefault();
            vistaGenerica.style.display = 'none';
            vistaGeo.style.display = 'block';
        });
    }

    // 4. VALIDACIÓN DE FECHA (Genérica)
    const formGenerico = document.getElementById('search-form');
    const fechaInput = document.getElementById('fecha');
    const ciudadInput = document.getElementById('ciudad');

    if (fechaInput) {
        // Establecer fecha mínima = HOY
        const hoy = new Date().toISOString().split('T')[0];
        fechaInput.setAttribute('min', hoy);

        // Crear mensaje error
        crearMensajeError(fechaInput, 'La fecha no puede ser anterior a hoy');

        // Evento validación
        fechaInput.addEventListener('change', () => {
            if (fechaInput.value < hoy) {
                setInvalido(fechaInput);
                fechaInput.value = hoy; // Resetear
            } else {
                setValido(fechaInput);
            }
        });
    }

    // Enviar Formulario Genérico
    if(formGenerico) {
        formGenerico.addEventListener('submit', (e) => {
            e.preventDefault();
            const ciudad = ciudadInput.value;
            const fecha = fechaInput.value;
            
            if (ciudad && fecha) {
                window.location.href = `ResultadosLogeado.html?ciudad=${encodeURIComponent(ciudad)}&fecha=${encodeURIComponent(fecha)}`;
            } else {
                alert("Rellena todos los datos");
            }
        });
    }

    /* --- FUNCIONES AUXILIARES --- */
    function crearMensajeError(input, texto) {
        const msg = document.createElement('small');
        msg.className = 'msg-error-text';
        msg.textContent = texto;
        if(input.parentNode) input.parentNode.appendChild(msg);
    }

    function setValido(input) {
        input.classList.remove('input-error');
        input.classList.add('input-success');
    }

    function setInvalido(input) {
        input.classList.remove('input-success');
        input.classList.add('input-error');
    }
});