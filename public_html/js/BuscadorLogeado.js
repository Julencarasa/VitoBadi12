/**
 * js/BuscadorLogeado.js
 * Gestiona la sesión del usuario, muestra sus datos en el header
 * y maneja la funcionalidad de búsqueda y logout.
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. VERIFICACIÓN DE SEGURIDAD
    // Obtenemos el email del usuario actual guardado en login.js
    const currentUserEmail = sessionStorage.getItem('currentUser');

    if (!currentUserEmail) {
        // Si no hay sesión, patada al buscador anónimo o login
        alert("Acceso denegado. Debes iniciar sesión.");
        window.location.href = 'login.html';
        return;
    }

    // 2. RECUPERAR DATOS COMPLETOS DEL USUARIO
    // Intentamos coger el objeto completo del session storage
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
    const welcomeTitle = document.getElementById('welcome-title');

    if (usuario) {
        // Poner nombre
        greeting.textContent = `Bienvenido, ${usuario.nombre}`;
        
        // Poner foto (si tiene base64 válido, sino placeholder)
        if (usuario.foto && usuario.foto.length > 10) {
            photo.src = usuario.foto;
        } else {
            // Foto por defecto si el usuario no tiene
            photo.src = 'imgs/user_placeholder.png'; 
        }
    } else {
        greeting.textContent = `Bienvenido, ${currentUserEmail}`;
    }

    // 4. LOGICA DE LOGOUT
    document.getElementById('btn-logout').addEventListener('click', () => {
        // Borramos la sesión
        sessionStorage.clear();
        // Redirigimos a la parte pública
        window.location.href = 'BuscadorAnonimo.html';
    });

    // 5. LÓGICA DEL BUSCADOR (Igual que el anónimo, pero podríamos redirigir a resultados diferentes)
    const form = document.getElementById('search-form');
    
    // Bloquear fechas pasadas
    const fechaInput = document.getElementById('fecha');
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.setAttribute('min', hoy);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const ciudad = document.getElementById('ciudad').value;
        const fecha = fechaInput.value;

        if (ciudad && fecha) {
            // Aquí podrías redirigir a 'ResultadosLogeado.html' si esa página va a ser distinta
            // (por ejemplo, mostrando fotos nítidas y botones de alquilar)
            // De momento, enviamos a la misma de resultados pero quizás quieras añadir un parámetro '&user=1'
            window.location.href = `resultadosAnonimos.html?ciudad=${encodeURIComponent(ciudad)}&fecha=${encodeURIComponent(fecha)}`;
        } else {
            alert("Por favor rellena todos los campos");
        }
    });
});