/**
 * js/VerMisHabitaciones.js
 */

document.addEventListener('DOMContentLoaded', async () => {

    // 1. SEGURIDAD
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    // Header Usuario
    try {
        const usuario = JSON.parse(sessionStorage.getItem(currentUserEmail));
        if (usuario) {
            document.getElementById('user-greeting').textContent = `Bienvenido, ${usuario.nombre}`;
            if (usuario.foto) document.getElementById('user-photo').src = usuario.foto;
        }
    } catch(e){}

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'BuscadorAnonimo.html';
    });

    // 2. CARGAR HABITACIONES
    try {
        const db = await abrirBD();
        await cargarMisHabitaciones(db, currentUserEmail);
    } catch (error) {
        console.error("Error:", error);
        alert("Error al acceder a la base de datos.");
    }
});

async function cargarMisHabitaciones(db, emailProp) {
    const container = document.getElementById('lista-mis-habitaciones');
    const msgEmpty = document.getElementById('msg-no-rooms');

    const tx = db.transaction(['habitacion'], 'readonly');
    const store = tx.objectStore('habitacion');
    const index = store.index('fk_email_prop');

    // Obtener mis habitaciones
    const request = index.getAll(emailProp);

    request.onsuccess = () => {
        const habitaciones = request.result;

        if (habitaciones.length === 0) {
            msgEmpty.style.display = 'block';
            return;
        }

        container.innerHTML = '';

        habitaciones.forEach(hab => {
            const div = document.createElement('div');
            div.className = 'room-item'; 

            const imgUrl = hab.imagen && hab.imagen.length > 10 
                ? hab.imagen 
                : 'imgs/VitoBadi Logo.png';

            // SOLO DATOS, SIN BOTÓN
            div.innerHTML = `
                <img src="${imgUrl}" class="room-img" alt="Foto">
                
                <div class="room-info">
                    <div class="room-address">${hab.direccion}</div>
                    <div class="room-details">
                        Ciudad: <strong>${hab.ciudad}</strong> <br>
                        Lat: ${hab.lat} | Lon: ${hab.lon}
                    </div>
                    <div class="room-price">${hab.precio} € / mes</div>
                </div>
            `;

            container.appendChild(div);
        });
    };
}