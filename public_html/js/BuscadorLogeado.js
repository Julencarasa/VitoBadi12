/**
 * js/BuscadorLogeado.js
 * Gestiona la sesión del usuario, el menú desplegable y los buscadores.
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. VERIFICACIÓN DE SEGURIDAD
    const currentUserEmail = sessionStorage.getItem('currentUser');

    if (!currentUserEmail) {
        alert("Acceso denegado. Debes iniciar sesión.");
        window.location.href = 'login.html';
        return;
    }

    // 2. RECUPERAR DATOS DEL USUARIO
    let usuario = null;
    try {
        const userString = sessionStorage.getItem(currentUserEmail);
        if (userString) {
            usuario = JSON.parse(userString);
        }
    } catch (e) {
        console.error("Error parseando usuario:", e);
    }

    // 3. ACTUALIZAR LA INTERFAZ (HEADER)
    const greeting = document.getElementById('user-greeting');
    const photo = document.getElementById('user-photo');
    
    if (usuario) {
        greeting.textContent = `Bienvenido, ${usuario.nombre}`;
        
        if (usuario.foto && usuario.foto.length > 10) {
            photo.src = usuario.foto;
        } else {
            photo.src = 'imgs/user_placeholder.png'; 
        }
    } else {
        greeting.textContent = `Bienvenido, ${currentUserEmail}`;
    }

    // 4. LÓGICA DE LOGOUT
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'BuscadorAnonimo.html';
    });

    /* =========================================================
       5. GESTIÓN DEL MENÚ DESPLEGABLE (CAMBIO DE VISTAS)
       ========================================================= */
    const btnGenerico = document.getElementById('btn-busqueda-generica');
    const btnGeo = document.getElementById('btn-busqueda-geo');
    
    const seccionGenerica = document.getElementById('vista-generica');
    const seccionGeo = document.getElementById('vista-geo');

    // Función para cambiar de pestaña
    function mostrarSeccion(seccionAMostrar) {
        // Ocultamos ambas primero
        seccionGenerica.style.display = 'none';
        seccionGeo.style.display = 'none';
        
        // Mostramos la elegida con una pequeña animación de entrada (definida en CSS)
        seccionAMostrar.style.display = 'block';
    }

    // Eventos del menú
    if (btnGenerico) {
        btnGenerico.addEventListener('click', (e) => {
            e.preventDefault(); // Evita que el enlace recargue
            mostrarSeccion(seccionGenerica);
        });
    }

    if (btnGeo) {
        btnGeo.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarSeccion(seccionGeo);
        });
    }

    /* =========================================================
       6. LÓGICA DEL BUSCADOR GENÉRICO
       ========================================================= */
    const formGenerico = document.getElementById('search-form');
    const fechaInput = document.getElementById('fecha');
    
    // Bloquear fechas pasadas
    const hoy = new Date().toISOString().split('T')[0];
    if (fechaInput) fechaInput.setAttribute('min', hoy);

    if (formGenerico) {
        formGenerico.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const ciudad = document.getElementById('ciudad').value;
            const fecha = fechaInput.value;

            if (ciudad && fecha) {
                // Redirigimos a ResultadosLogeado.html
                window.location.href = `ResultadosLogeado.html?ciudad=${encodeURIComponent(ciudad)}&fecha=${encodeURIComponent(fecha)}`;
            } else {
                alert("Por favor rellena todos los campos");
            }
        });
    }

    /* =========================================================
       7. LÓGICA DEL BUSCADOR GEOLOCALIZACIÓN
       ========================================================= */
    const formGeo = document.getElementById('geo-form');

    if (formGeo) {
        formGeo.addEventListener('submit', (e) => {
            e.preventDefault();
            const direccion = document.getElementById('direccion-geo').value;

            if (direccion) {
                alert("Funcionalidad de mapa en construcción. Redirigiendo a inicio...");
                // Aquí iría la lógica para obtener lat/lon y mandar al mapa
                // De momento, redirige a index.html como pediste
                window.location.href = 'index.html'; 
            } else {
                alert("Por favor, introduce una dirección.");
            }
        });
    }
});