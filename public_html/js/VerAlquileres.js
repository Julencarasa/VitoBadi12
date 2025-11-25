document.addEventListener('DOMContentLoaded', async () => {
    
    // seguridad: si no esta logueado fuera
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    // poner datos en el header
    let usuario = null;
    try { usuario = JSON.parse(sessionStorage.getItem(currentUserEmail)); } catch(e){}
    
    const greeting = document.getElementById('user-greeting');
    const photo = document.getElementById('user-photo');
    if (usuario) {
        greeting.textContent = `Hola, ${usuario.nombre}`;
        if (usuario.foto && usuario.foto.length > 10) photo.src = usuario.foto;
    }

    // boton de salir
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'BuscadorAnonimo.html';
        });
    }

    // cargar cosas de la bd
    try {
        const db = await abrirBD();

        // cargar mis alquileres como inquilino
        await cargarHistorialInquilino(db, currentUserEmail);

        // cargar mis alquileres como propietario
        // miro si tengo habitaciones primero
        const tx = db.transaction(['habitacion'], 'readonly');
        const storeHab = tx.objectStore('habitacion');
        const indexProp = storeHab.index('fk_email_prop');
        
        const request = indexProp.getAll(currentUserEmail);
        
        request.onsuccess = async () => {
            const misHabitaciones = request.result;
            if (misHabitaciones.length > 0) {
                // si tengo habitaciones muestro la seccion
                const secProp = document.getElementById('sec-propietario');
                if(secProp) secProp.style.display = 'block';
                await cargarHistorialPropietario(db, misHabitaciones);
            }
        };

    } catch (error) {
        console.error("Error cargando alquileres:", error);
    }
});

// funcion para cargar lo de inquilino
async function cargarHistorialInquilino(db, emailUser) {
    const section = document.getElementById('sec-inquilino');
    const container = document.getElementById('lista-inquilino');
    const msgVacio = document.getElementById('msg-no-inquilino');

    const tx = db.transaction(['alquiler', 'habitacion'], 'readonly');
    const storeAlq = tx.objectStore('alquiler');
    const indexInqui = storeAlq.index('fk_inquilino');

    // busco mis alquileres
    const alquileres = await new Promise(resolve => {
        indexInqui.getAll(emailUser).onsuccess = (e) => resolve(e.target.result);
    });

    // si no hay nada
    if (alquileres.length === 0) {
        if(section) section.style.display = 'block'; 
        if(msgVacio) msgVacio.style.display = 'block';
        return;
    }

    if(section) section.style.display = 'block';

    // ordenar por fecha fin
    alquileres.sort((a, b) => new Date(b.fFin) - new Date(a.fFin));

    const storeHab = tx.objectStore('habitacion');

    for (const alq of alquileres) {
        const hab = await new Promise(resolve => {
            storeHab.get(alq.idHabi).onsuccess = (e) => resolve(e.target.result);
        });

        if (hab) {
            // creo la tarjeta
            const card = crearTarjetaAlquiler(hab, alq, "Propietario: " + hab.emailPropietario);
            container.appendChild(card);
        }
    }
}

// funcion para cargar lo de propietario
async function cargarHistorialPropietario(db, misHabitaciones) {
    const containerActivos = document.getElementById('lista-prop-activos');
    const containerInactivos = document.getElementById('lista-prop-inactivos');
    const msgNoActivos = document.getElementById('msg-no-activos');
    const msgNoInactivos = document.getElementById('msg-no-inactivos');

    const tx = db.transaction(['alquiler'], 'readonly');
    const storeAlq = tx.objectStore('alquiler');
    const indexAlqHab = storeAlq.index('fk_habitacion');

    let listaActivos = [];
    let listaInactivos = [];
    const hoy = new Date();
    
    // recorro mis habitaciones y busco contratos
    for (const hab of misHabitaciones) {
        const contratos = await new Promise(resolve => {
            indexAlqHab.getAll(hab.idHabi).onsuccess = (e) => resolve(e.target.result);
        });

        contratos.forEach(contrato => {
            const fFin = new Date(contrato.fFin);
            // separo activos y pasados
            if (fFin >= hoy) {
                listaActivos.push({ habitacion: hab, alquiler: contrato });
            } else {
                listaInactivos.push({ habitacion: hab, alquiler: contrato });
            }
        });
    }

    // ordenar
    listaActivos.sort((a, b) => new Date(a.alquiler.fFin) - new Date(b.alquiler.fFin));
    listaInactivos.sort((a, b) => new Date(b.alquiler.fFin) - new Date(a.alquiler.fFin));

    // mostrar activos
    if (listaActivos.length > 0) {
        listaActivos.forEach(item => {
            const card = crearTarjetaAlquiler(item.habitacion, item.alquiler, "Inquilino: " + item.alquiler.emailInqui);
            containerActivos.appendChild(card);
        });
    } else {
        if(msgNoActivos) msgNoActivos.style.display = 'block';
    }

    // mostrar historial
    if (listaInactivos.length > 0) {
        listaInactivos.forEach(item => {
            const card = crearTarjetaAlquiler(item.habitacion, item.alquiler, "Ex-Inquilino: " + item.alquiler.emailInqui);
            card.style.opacity = "0.7"; 
            card.style.backgroundColor = "#f9f9f9";
            containerInactivos.appendChild(card);
        });
    } else {
        if(msgNoInactivos) msgNoInactivos.style.display = 'block';
    }
}

// funcion para crear el html de la tarjeta
function crearTarjetaAlquiler(hab, alq, extraInfo) {
    const divCard = document.createElement('div');
    divCard.className = 'rental-item';

    const img = document.createElement('img');
    img.className = 'rental-img';
    
    // foto base64 o defecto
    if (hab.imagen && hab.imagen.length > 50) {
        img.src = hab.imagen;
    } else {
        img.src = 'imgs/VitoBadi Logo.png';
    }
    img.alt = 'Foto habitación';

    const divInfo = document.createElement('div');
    divInfo.className = 'rental-info';

    // direccion
    const divAddress = document.createElement('div');
    divAddress.className = 'rental-address';
    divAddress.textContent = hab.direccion;

    // ciudad en pequeño
    const divCity = document.createElement('div');
    divCity.style.fontSize = '0.9rem';
    divCity.style.color = '#666';
    divCity.style.marginBottom = '4px';
    divCity.textContent = hab.ciudad;

    const divDates = document.createElement('div');
    divDates.className = 'rental-dates';
    
    const hoy = new Date();
    const fFinDate = new Date(alq.fFin);
    const esActivo = fFinDate >= hoy;

    const textoFechas = document.createTextNode(`📅 ${alq.fIni} - ${alq.fFin} `);
    divDates.appendChild(textoFechas);

    const spanEstado = document.createElement('span');
    spanEstado.style.fontWeight = 'bold';
    spanEstado.style.marginLeft = '5px';
    
    if (esActivo) {
        spanEstado.textContent = '(ACTIVO)';
        spanEstado.style.color = '#27ae60'; 
    } else {
        spanEstado.textContent = '(FINALIZADO)';
        spanEstado.style.color = '#c0392b'; 
    }
    divDates.appendChild(spanEstado);

    const divExtra = document.createElement('div');
    divExtra.className = 'rental-extra';
    divExtra.textContent = extraInfo;

    divInfo.appendChild(divAddress);
    divInfo.appendChild(divCity);
    divInfo.appendChild(divDates);
    divInfo.appendChild(divExtra);

    const divPrice = document.createElement('div');
    divPrice.className = 'rental-price';
    divPrice.textContent = `${hab.precio} €`;

    divCard.appendChild(img);
    divCard.appendChild(divInfo);
    divCard.appendChild(divPrice);

    return divCard;
}