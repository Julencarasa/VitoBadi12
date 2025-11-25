document.addEventListener('DOMContentLoaded', async () => {
    
    
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    
    let usuario = null;
    try { usuario = JSON.parse(sessionStorage.getItem(currentUserEmail)); } catch(e){}
    
    const greeting = document.getElementById('user-greeting');
    const photo = document.getElementById('user-photo');
    if (usuario) {
        greeting.textContent = `Hola, ${usuario.nombre}`;
        if (usuario.foto) photo.src = usuario.foto;
    }
    
    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'BuscadorAnonimo.html';
    });

    
    // Lo configuramos aquí una sola vez para asegurar que funcione siempre
    const modal = document.getElementById('modal-inquilinos');
    const closeBtn = document.querySelector('.close-btn');

    // Cerrar con la X
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Cerrar haciendo clic fuera del contenido
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });


  
    try {
        const db = await abrirBD();

       
        await cargarEnviadas(db, currentUserEmail);

        
        // Usamos una transacción para buscar las habitaciones
        const txHab = db.transaction(['habitacion'], 'readonly');
        const storeHab = txHab.objectStore('habitacion');
        const indexProp = storeHab.index('fk_email_prop');
        
        const misHabitacionesReq = indexProp.getAll(currentUserEmail);
        
        misHabitacionesReq.onsuccess = async () => {
            const misHabitaciones = misHabitacionesReq.result;
            if (misHabitaciones.length > 0) {
                document.getElementById('sec-recibidas').style.display = 'block';
                await cargarRecibidas(db, misHabitaciones);
            }
        };

    } catch (error) {
        console.error("Error:", error);
        alert("Error cargando datos de la base de datos.");
    }
});



async function cargarEnviadas(db, emailUser) {
    const container = document.getElementById('lista-enviadas');
    const msgEmpty = document.getElementById('msg-no-enviadas');

    const tx = db.transaction(['solicitud', 'habitacion'], 'readonly');
    const storeSol = tx.objectStore('solicitud');
    const indexInqui = storeSol.index('fk_inquilino');

    const solicitudes = await new Promise(resolve => {
        indexInqui.getAll(emailUser).onsuccess = (e) => resolve(e.target.result);
    });

    if (solicitudes.length === 0) {
        msgEmpty.style.display = 'block';
        return;
    }

    const storeHab = tx.objectStore('habitacion');

    for (const sol of solicitudes) {
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
                    <div style="font-size: 0.9rem; color: #666; margin-bottom: 4px;">${habitacion.ciudad}</div>
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

    
    const tx = db.transaction(['solicitud'], 'readonly');
    const storeSol = tx.objectStore('solicitud');
    const indexSolHab = storeSol.index('fk_habitacion');

    for (const hab of habitaciones) {
        // Ver si esta habitación tiene solicitudes
        const solicitudes = await new Promise(resolve => {
            indexSolHab.getAll(hab.idHabi).onsuccess = (e) => resolve(e.target.result);
        });

        // Crear elemento visual
        const div = document.createElement('div');
        div.className = 'req-item';
        
        const btnText = solicitudes.length > 0 
            ? `<button class="btn-ver-candidatos" data-hab="${hab.idHabi}">Ver interesados (${solicitudes.length})</button>`
            : `<span style="color:#999; font-size:0.9rem;">Sin solicitudes</span>`;

        div.innerHTML = `
            <img src="${hab.imagen || 'imgs/VitoBadi Logo.png'}" class="req-img">
            <div class="req-info">
                <div class="req-address">${hab.direccion}</div>
                <div style="font-size: 0.9rem; color: #666; margin-bottom: 4px;">${hab.ciudad}</div>
                <div class="req-price">${hab.precio} €</div>
            </div>
            <div class="req-action">
                ${btnText}
            </div>
        `;
        
        container.appendChild(div);
        haySolicitudes = true; 

        // Evento botón
        if (solicitudes.length > 0) {
            const btn = div.querySelector('.btn-ver-candidatos');
           
            btn.addEventListener('click', () => abrirModal(db, solicitudes));
        }
    }

    if (!haySolicitudes) {
        msgEmpty.style.display = 'block';
    }
}

// --- MODAL ---
async function abrirModal(db, solicitudes) {
    const modal = document.getElementById('modal-inquilinos');
    const listContainer = document.getElementById('lista-candidatos');

    listContainer.innerHTML = '<p>Cargando datos...</p>';
    modal.style.display = 'flex';

    
    const tx = db.transaction(['usuario'], 'readonly');
    const storeUser = tx.objectStore('usuario');

    listContainer.innerHTML = '';
    
    // Iteramos solicitudes y buscamos cada usuario
    for (const sol of solicitudes) {
        const usuario = await new Promise(resolve => {
            storeUser.get(sol.emailInquiPosible).onsuccess = (e) => resolve(e.target.result);
        });

        if (usuario) {
            const row = document.createElement('div');
            row.className = 'candidate-row';
            row.innerHTML = `
                <img src="${usuario.foto || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAAAAACPAi4CAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAk0lEQVRYw+3Vyw2AMAwE0E/6704qIFAkK0s2WbB/C/a2BDRxV0q5jG3q/X0bV/v5tG/j1n487du43Y+neRsP9+Np3sbj/Xiat/F8P57mbXzcj6d5G9/342nexg/9eJq38VM/nuZt/NyPp3kbv/fjad7G7/14mrfxfz+e5m3834+neRv/9+Np3sb//Xiat/F/P57mbfzfj6d5Gz8A829B5dOFwMcAAAAASUVORK5CYII='}" class="candidate-avatar">
                <div>
                    <div style="font-weight:bold;">${usuario.nombre}</div>
                    <div style="font-size:0.85rem; color:#666;">${usuario.email}</div>
                </div>
            `;
            listContainer.appendChild(row);
        }
    }
}