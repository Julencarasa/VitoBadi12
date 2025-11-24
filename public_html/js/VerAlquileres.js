/**
 * js/VerAlquileres.js
 */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. SEGURIDAD Y HEADER
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    // Cargar datos de usuario para el header
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

    // 2. CARGA DE DATOS DE ALQUILERES
    try {
        const db = await abrirBD();

        // A) CARGAR COMO INQUILINO (Mis estancias)
        await cargarComoInquilino(db, currentUserEmail);

        // B) CARGAR COMO PROPIETARIO (Mis rentas)
        await cargarComoPropietario(db, currentUserEmail);

    } catch (error) {
        console.error("Error cargando alquileres:", error);
        alert("Error al cargar los datos de la base de datos.");
    }
});

/**
 * LÓGICA DE INQUILINO:
 * Muestra las habitaciones donde el usuario ha sido o es inquilino.
 * Ordenadas por fecha fin.
 */
async function cargarComoInquilino(db, emailUser) {
    const container = document.getElementById('lista-inquilino');
    const section = document.getElementById('sec-inquilino');
    const msgEmpty = document.getElementById('msg-no-inquilino');

    const tx = db.transaction(['alquiler', 'habitacion'], 'readonly');
    const storeAlq = tx.objectStore('alquiler');
    const indexInqui = storeAlq.index('fk_inquilino');
    const storeHab = tx.objectStore('habitacion');

    // 1. Obtener alquileres del usuario
    const alquileres = await new Promise(resolve => {
        indexInqui.getAll(emailUser).onsuccess = (e) => resolve(e.target.result);
    });

    if (alquileres.length > 0) {
        section.style.display = 'block';

        // 2. Ordenar por fecha fin (Descendente)
        alquileres.sort((a, b) => new Date(b.fFin) - new Date(a.fFin));

        for (const alq of alquileres) {
            // 3. Obtener datos de la habitación asociada
            const habitacion = await new Promise(resolve => {
                storeHab.get(alq.idHabi).onsuccess = (e) => resolve(e.target.result);
            });

            if (habitacion) {
                const item = document.createElement('div');
                item.className = 'rental-item';
                item.innerHTML = `
                    <img src="${habitacion.imagen || 'imgs/VitoBadi Logo.png'}" class="rental-img">
                    <div class="rental-info">
                        <div class="rental-address">${habitacion.direccion}</div>
                        <div style="font-size: 0.9rem; color: #666; margin-bottom: 4px;">${habitacion.ciudad}</div>
                        <div class="rental-price">${habitacion.precio} € / mes</div>
                        <div class="rental-details">
                            Propietario: <strong>${habitacion.emailPropietario}</strong>
                        </div>
                        <div class="rental-dates">
                            📅 Desde: ${alq.fIni} &nbsp;|&nbsp; Hasta: ${alq.fFin}
                        </div>
                    </div>
                `;
                container.appendChild(item);
            }
        }
    } else {
        // Opcional: Si quieres mostrar la sección aunque esté vacía
        // section.style.display = 'block';
        // msgEmpty.style.display = 'block';
    }
}

/**
 * LÓGICA DE PROPIETARIO:
 * Muestra las habitaciones del usuario que tienen contratos.
 * Se divide en Activos (fecha actual <= fecha fin) e Inactivos.
 */
async function cargarComoPropietario(db, emailProp) {
    const section = document.getElementById('sec-propietario');
    const listActivos = document.getElementById('lista-prop-activos');
    const listInactivos = document.getElementById('lista-prop-inactivos');
    
    const tx = db.transaction(['habitacion', 'alquiler'], 'readonly');
    const storeHab = tx.objectStore('habitacion');
    const indexProp = storeHab.index('fk_email_prop'); // Mis habitaciones
    const storeAlq = tx.objectStore('alquiler');
    const indexAlqHab = storeAlq.index('fk_habitacion'); // Alquileres por habitacion

    // 1. Obtener mis habitaciones
    const misHabitaciones = await new Promise(resolve => {
        indexProp.getAll(emailProp).onsuccess = (e) => resolve(e.target.result);
    });

    if (misHabitaciones.length === 0) return; // No soy propietario

    let hayAlquileres = false;
    const fechaActual = new Date();
    fechaActual.setHours(0,0,0,0);

    let listaActivos = [];
    let listaInactivos = [];

    // 2. Iterar habitaciones y buscar sus contratos
    for (const hab of misHabitaciones) {
        const contratos = await new Promise(resolve => {
            indexAlqHab.getAll(hab.idHabi).onsuccess = (e) => resolve(e.target.result);
        });

        if (contratos.length > 0) {
            hayAlquileres = true;

            for (const contrato of contratos) {
                const fechaFin = new Date(contrato.fFin);
                const esActivo = fechaFin >= fechaActual;

                const objetoDatos = {
                    contrato: contrato,
                    habitacion: hab,
                    esActivo: esActivo
                };

                if (esActivo) {
                    listaActivos.push(objetoDatos);
                } else {
                    listaInactivos.push(objetoDatos);
                }
            }
        }
    }

    if (hayAlquileres) {
        section.style.display = 'block';

        // 3. Ordenar listas por fecha de fin
        listaActivos.sort((a, b) => new Date(a.contrato.fFin) - new Date(b.contrato.fFin));
        listaInactivos.sort((a, b) => new Date(b.contrato.fFin) - new Date(a.contrato.fFin));

        // 4. Renderizar Activos
        if (listaActivos.length > 0) {
            listaActivos.forEach(item => pintarItemPropietario(item, listActivos));
        } else {
            document.getElementById('msg-no-activos').style.display = 'block';
        }

        // 5. Renderizar Inactivos
        if (listaInactivos.length > 0) {
            listaInactivos.forEach(item => pintarItemPropietario(item, listInactivos));
        } else {
            document.getElementById('msg-no-inactivos').style.display = 'block';
        }
    }
}

function pintarItemPropietario(data, container) {
    const { contrato, habitacion } = data;
    
    const div = document.createElement('div');
    div.className = 'rental-item';
    div.innerHTML = `
        <img src="${habitacion.imagen || 'imgs/VitoBadi Logo.png'}" class="rental-img">
        <div class="rental-info">
            <div class="rental-address">${habitacion.direccion}</div>
            <div style="font-size: 0.9rem; color: #666; margin-bottom: 4px;">${habitacion.ciudad}</div>
            <div class="rental-price">${habitacion.precio} €</div>
            <div class="rental-details">
                Inquilino: <strong>${contrato.emailInqui}</strong>
            </div>
            <div class="rental-dates">
                📅 Del <b>${contrato.fIni}</b> al <b>${contrato.fFin}</b>
            </div>
        </div>
    `;
    container.appendChild(div);
}