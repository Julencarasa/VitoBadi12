/**
 * js/MisSolicitudes.js
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. SEGURIDAD
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    // 2. HEADER (Usuario)
    let usuario = null;
    try { usuario = JSON.parse(sessionStorage.getItem(currentUserEmail)); } catch(e){}
    
    const greeting = document.getElementById('user-greeting');
    const photo = document.getElementById('user-photo');
    if (usuario) {
        greeting.textContent = `Bienvenido, ${usuario.nombre}`;
        if (usuario.foto) photo.src = usuario.foto;
    }
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'BuscadorAnonimo.html';
    });

    // 3. CARGA DE DATOS
    try {
        const db = await abrirBD();

        // A) CARGAR MIS SOLICITUDES ENVIADAS (Inquilino)
        await cargarEnviadas(db, currentUserEmail);

        // B) CARGAR SOLICITUDES RECIBIDAS (Propietario)
        // Primero verificamos si el usuario tiene habitaciones
        const txHab = db.transaction(['habitacion'], 'readonly');
        const storeHab = txHab.objectStore('habitacion');
        const indexProp = storeHab.index('fk_email_prop');
        
        const misHabitacionesReq = indexProp.getAll(currentUserEmail);
        
        misHabitacionesReq.onsuccess = async () => {
            const misHabitaciones = misHabitacionesReq.result;
            if (misHabitaciones.length > 0) {
                // Mostrar sección y cargar datos
                document.getElementById('sec-recibidas').style.display = 'block';
                await cargarRecibidas(db, misHabitaciones);
            }
        };

    } catch (error) {
        console.error("Error:", error);
        alert("Error cargando datos de la base de datos.");
    }
});

// --- FUNCIONES DE CARGA ---

async function cargarEnviadas(db, emailUser) {
    const container = document.getElementById('lista-enviadas');
    const msgEmpty = document.getElementById('msg-no-enviadas');

    const tx = db.transaction(['solicitud', 'habitacion'], 'readonly');
    const storeSol = tx.objectStore('solicitud');
    const indexInqui = storeSol.index('fk_inquilino');

    // Obtener solicitudes donde soy inquilino
    const solicitudes = await new Promise(resolve => {
        indexInqui.getAll(emailUser).onsuccess = (e) => resolve(e.target.result);
    });

    if (solicitudes.length === 0) {
        msgEmpty.style.display = 'block';
        return;
    }

    const storeHab = tx.objectStore('habitacion');

    for (const sol of solicitudes) {
        // Obtener detalle de la habitación
        const habitacion = await new Promise(resolve => {
            storeHab.get(sol.idHabi).onsuccess = (e) => resolve(e.target.result);
        });

        if (habitacion) {
            const div = document.createElement('div');
            div.className = 'req-item';
            div.innerHTML = `
                <img src="${habitacion.imagen || 'imgs/VitoBadi Logo.png'}" class="req-img">
                <div class="req-info">
                    <div class="req-address">${habitacion.direccion}</div>
                    <div class="req-price">${habitacion.precio} €</div>
                    <div class="req-status">Propietario: ${habitacion.emailPropietario}</div>
                </div>
            `;
            container.appendChild(div);
        }
    }
}

async function cargarRecibidas(db, habitaciones) {
    const container = document.getElementById('lista-recibidas');
    const msgEmpty = document.getElementById('msg-no-recibidas');
    let haySolicitudes = false;

    const tx = db.transaction(['solicitud', 'usuario'], 'readonly');
    const storeSol = tx.objectStore('solicitud');
    const indexSolHab = storeSol.index('fk_habitacion');
    const storeUser = tx.objectStore('usuario'); // Para datos de inquilinos

    for (const hab of habitaciones) {
        // Ver si esta habitación tiene solicitudes
        const solicitudes = await new Promise(resolve => {
            indexSolHab.getAll(hab.idHabi).onsuccess = (e) => resolve(e.target.result);
        });

        // Pintar la tarjeta de la habitación (incluso si tiene 0 solicitudes, 
        // aunque el enunciado sugiere mostrar "si hay o no solicitudes")
        // Para que no quede muy lleno, mostramos solo las que tienen solicitudes O un botón "0 solicitudes"
        
        // Vamos a pintar la fila de la habitación
        const div = document.createElement('div');
        div.className = 'req-item';
        
        const btnText = solicitudes.length > 0 
            ? `<button class="btn-ver-candidatos" data-hab="${hab.idHabi}">Ver interesados (${solicitudes.length})</button>`
            : `<span style="color:#999; font-size:0.9rem;">Sin solicitudes</span>`;

        div.innerHTML = `
            <img src="${hab.imagen || 'imgs/VitoBadi Logo.png'}" class="req-img">
            <div class="req-info">
                <div class="req-address">${hab.direccion}</div>
                <div class="req-price">${hab.precio} €</div>
            </div>
            <div class="req-action">
                ${btnText}
            </div>
        `;
        
        container.appendChild(div);
        haySolicitudes = true; // Al menos pintamos habitaciones propias

        // Evento botón
        if (solicitudes.length > 0) {
            const btn = div.querySelector('.btn-ver-candidatos');
            btn.addEventListener('click', () => abrirModal(solicitudes, storeUser));
        }
    }

    if (!haySolicitudes) {
        msgEmpty.style.display = 'block';
    }
}

// --- MODAL ---
async function abrirModal(solicitudes, storeUser) {
    const modal = document.getElementById('modal-inquilinos');
    const listContainer = document.getElementById('lista-candidatos');
    const closeBtn = document.querySelector('.close-btn');

    listContainer.innerHTML = '<p>Cargando datos...</p>';
    modal.style.display = 'flex'; // Usamos flex para centrar

    // Cargar datos de usuarios
    listContainer.innerHTML = '';
    for (const sol of solicitudes) {
        const usuario = await new Promise(resolve => {
            storeUser.get(sol.emailInquiPosible).onsuccess = (e) => resolve(e.target.result);
        });

        if (usuario) {
            const row = document.createElement('div');
            row.className = 'candidate-row';
            row.innerHTML = `
                <img src="${usuario.foto || 'imgs/user_placeholder.png'}" class="candidate-avatar">
                <div>
                    <div style="font-weight:bold;">${usuario.nombre}</div>
                    <div style="font-size:0.85rem; color:#666;">${usuario.email}</div>
                </div>
            `;
            listContainer.appendChild(row);
        }
    }

    // Cerrar
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if(e.target == modal) modal.style.display = 'none'; }
}