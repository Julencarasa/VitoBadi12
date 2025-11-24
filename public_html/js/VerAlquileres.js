/* js/VerAlquileres.js */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. SEGURIDAD: Verificar que el usuario está logueado
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    // 2. HEADER: Cargar datos del usuario en la cabecera
    let usuario = null;
    try { usuario = JSON.parse(sessionStorage.getItem(currentUserEmail)); } catch(e){}
    
    const greeting = document.getElementById('user-greeting');
    const photo = document.getElementById('user-photo');
    if (usuario) {
        greeting.textContent = `Hola, ${usuario.nombre}`;
        if (usuario.foto && usuario.foto.length > 10) photo.src = usuario.foto;
    }

    // Botón Logout
    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'BuscadorAnonimo.html';
        });
    }

    // 3. CARGA DE DATOS (Lógica Híbrida)
    try {
        const db = await abrirBD();

        // PARTE A: Cargar historial como INQUILINO (donde yo vivo/viví)
        await cargarHistorialInquilino(db, currentUserEmail);

        // PARTE B: Cargar historial como PROPIETARIO (mis pisos alquilados)
        // Primero verificamos si tengo habitaciones publicadas
        const tx = db.transaction(['habitacion'], 'readonly');
        const storeHab = tx.objectStore('habitacion');
        const indexProp = storeHab.index('fk_email_prop');
        
        const request = indexProp.getAll(currentUserEmail);
        
        request.onsuccess = async () => {
            const misHabitaciones = request.result;
            if (misHabitaciones.length > 0) {
                // Si tengo habitaciones, muestro la sección de propietario y cargo los datos
                const secProp = document.getElementById('sec-propietario');
                if(secProp) secProp.style.display = 'block';
                await cargarHistorialPropietario(db, misHabitaciones);
            }
        };

    } catch (error) {
        console.error("Error cargando alquileres:", error);
    }
});

/**
 * LÓGICA 1: COMO INQUILINO
 * Muestra las habitaciones donde el usuario figura como inquilino.
 */
async function cargarHistorialInquilino(db, emailUser) {
    const section = document.getElementById('sec-inquilino');
    const container = document.getElementById('lista-inquilino');
    const msgVacio = document.getElementById('msg-no-inquilino');

    const tx = db.transaction(['alquiler', 'habitacion'], 'readonly');
    const storeAlq = tx.objectStore('alquiler');
    const indexInqui = storeAlq.index('fk_inquilino');

    // Buscar alquileres donde yo soy el inquilino
    const alquileres = await new Promise(resolve => {
        indexInqui.getAll(emailUser).onsuccess = (e) => resolve(e.target.result);
    });

    // Si no hay alquileres, mostramos mensaje
    if (alquileres.length === 0) {
        if(section) section.style.display = 'block'; // Mostramos la sección vacía
        if(msgVacio) msgVacio.style.display = 'block';
        return;
    }

    if(section) section.style.display = 'block';

    // Ordenar por fecha fin descendente (más reciente primero)
    alquileres.sort((a, b) => new Date(b.fFin) - new Date(a.fFin));

    const storeHab = tx.objectStore('habitacion');

    for (const alq of alquileres) {
        const hab = await new Promise(resolve => {
            storeHab.get(alq.idHabi).onsuccess = (e) => resolve(e.target.result);
        });

        if (hab) {
            // Usamos la función purista DOM
            const card = crearTarjetaAlquiler(hab, alq, "Propietario: " + hab.emailPropietario);
            container.appendChild(card);
        }
    }
}

/**
 * LÓGICA 2: COMO PROPIETARIO
 * Separa alquileres en Activos (en curso) e Inactivos (historial).
 */
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
    // Ajustamos la hora de "hoy" a 00:00 para comparar solo fechas si es necesario, 
    // pero new Date() directo funciona bien para comparaciones estándar.

    for (const hab of misHabitaciones) {
        const contratos = await new Promise(resolve => {
            indexAlqHab.getAll(hab.idHabi).onsuccess = (e) => resolve(e.target.result);
        });

        contratos.forEach(contrato => {
            const fFin = new Date(contrato.fFin);
            if (fFin >= hoy) {
                listaActivos.push({ habitacion: hab, alquiler: contrato });
            } else {
                listaInactivos.push({ habitacion: hab, alquiler: contrato });
            }
        });
    }

    // Ordenar
    listaActivos.sort((a, b) => new Date(a.alquiler.fFin) - new Date(b.alquiler.fFin));
    listaInactivos.sort((a, b) => new Date(b.alquiler.fFin) - new Date(a.alquiler.fFin));

    // Renderizar Activos
    if (listaActivos.length > 0) {
        listaActivos.forEach(item => {
            const card = crearTarjetaAlquiler(item.habitacion, item.alquiler, "Inquilino: " + item.alquiler.emailInqui);
            containerActivos.appendChild(card);
        });
    } else {
        if(msgNoActivos) msgNoActivos.style.display = 'block';
    }

    // Renderizar Historial
    if (listaInactivos.length > 0) {
        listaInactivos.forEach(item => {
            const card = crearTarjetaAlquiler(item.habitacion, item.alquiler, "Ex-Inquilino: " + item.alquiler.emailInqui);
            // Estilo visual para indicar que es pasado
            card.style.opacity = "0.7"; 
            card.style.backgroundColor = "#f9f9f9";
            containerInactivos.appendChild(card);
        });
    } else {
        if(msgNoInactivos) msgNoInactivos.style.display = 'block';
    }
}

/**
 * FUNCIÓN PURISTA DOM (Sin innerHTML)
 * Crea la tarjeta visual elemento a elemento.
 */
function crearTarjetaAlquiler(hab, alq, extraInfo) {
    // 1. Contenedor principal
    const divCard = document.createElement('div');
    divCard.className = 'rental-item';

    // 2. Imagen
    const img = document.createElement('img');
    img.className = 'rental-img';
    // Comprobación de imagen válida
    if (hab.imagen && hab.imagen.length > 50) {
        img.src = hab.imagen;
    } else {
        img.src = 'imgs/VitoBadi Logo.png'; // Imagen por defecto
    }
    img.alt = 'Foto habitación';

    // 3. Contenedor Info
    const divInfo = document.createElement('div');
    divInfo.className = 'rental-info';

    // 3a. Dirección
    const divAddress = document.createElement('div');
    divAddress.className = 'rental-address';
    divAddress.textContent = hab.direccion;

    // 3b. Fechas y Estado
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
        spanEstado.style.color = '#27ae60'; // Verde
    } else {
        spanEstado.textContent = '(FINALIZADO)';
        spanEstado.style.color = '#c0392b'; // Rojo
    }
    divDates.appendChild(spanEstado);

    // 3c. Info Extra (Email del otro usuario)
    const divExtra = document.createElement('div');
    divExtra.className = 'rental-extra';
    divExtra.textContent = extraInfo;

    // Añadir hijos al contenedor Info
    divInfo.appendChild(divAddress);
    divInfo.appendChild(divDates);
    divInfo.appendChild(divExtra);

    // 4. Precio
    const divPrice = document.createElement('div');
    divPrice.className = 'rental-price';
    divPrice.textContent = `${hab.precio} €`;

    // 5. Ensamblaje final
    divCard.appendChild(img);
    divCard.appendChild(divInfo);
    divCard.appendChild(divPrice);

    return divCard;
}