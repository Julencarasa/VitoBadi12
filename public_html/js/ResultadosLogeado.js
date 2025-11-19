document.addEventListener('DOMContentLoaded', async () => {
    // Seguridad
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    const contenedor = document.getElementById('lista-habitaciones');
    const titulo = document.getElementById('titulo-resultado');
    const mensajeVacio = document.getElementById('mensaje-vacio');

    const params = new URLSearchParams(window.location.search);
    const ciudadBuscada = params.get('ciudad');
    const fechaBuscadaStr = params.get('fecha');

    if (!ciudadBuscada || !fechaBuscadaStr) {
        if (titulo) titulo.textContent = "Error: Datos incompletos.";
        return;
    }

    const fechaBusqueda = new Date(fechaBuscadaStr);
    if (titulo) titulo.textContent = `Habitaciones en ${ciudadBuscada} (Usuario Registrado)`;

    // Fondo dinámico
    const mainContent = document.querySelector('.main-content');
    const imagenesFondo = {
        'Vitoria': 'imgs/fondoVitoria.jpg',
        'Bilbao': 'imgs/fondoBilbao.jpg',
        'Donostia': 'imgs/fondoDonostia.jpg'
    };
    const imagenAUsar = imagenesFondo[ciudadBuscada] || 'imgs/fondoVitoria.jpg';
    if (mainContent) mainContent.style.backgroundImage = `url('${imagenAUsar}')`;

    try {
        const db = await abrirBD();

        const tx = db.transaction(['habitacion', 'alquiler'], 'readonly');
        const storeHab = tx.objectStore('habitacion');
        const indexCiudad = storeHab.index('ciudad');
        
        const habitaciones = await new Promise(resolve => {
            indexCiudad.getAll(ciudadBuscada).onsuccess = (e) => resolve(e.target.result);
            indexCiudad.getAll(ciudadBuscada).onerror = () => resolve([]);
        });

        const storeAlq = tx.objectStore('alquiler');
        const alquileres = await new Promise(resolve => {
            storeAlq.getAll().onsuccess = (e) => resolve(e.target.result);
            storeAlq.getAll().onerror = () => resolve([]);
        });

        // FILTRADO
        const habitacionesDisponibles = habitaciones.filter(hab => {
            // 1. NO MOSTRAR MIS PROPIAS HABITACIONES
            if (hab.emailPropietario === currentUserEmail) {
                return false; 
            }
            // 2. FILTRO DE FECHAS
            const estaOcupada = alquileres.some(alq => {
                if (alq.idHabi !== hab.idHabi) return false;
                const fInicio = new Date(alq.fIni);
                const fFin = new Date(alq.fFin);
                return (fechaBusqueda >= fInicio && fechaBusqueda <= fFin);
            });
            return !estaOcupada;
        });

        habitacionesDisponibles.sort((a, b) => a.precio - b.precio);

        if (contenedor) contenedor.innerHTML = "";

        if (habitacionesDisponibles.length === 0) {
            if (contenedor) contenedor.style.display = 'none';
            if (mensajeVacio) mensajeVacio.style.display = 'block';
            return;
        }

        habitacionesDisponibles.forEach(hab => {
            const card = document.createElement('div');
            card.className = 'room-card';

            // REDIRECCIÓN A HABITACION.HTML
            card.addEventListener('click', () => {
                window.location.href = `habitacion.html?id=${hab.idHabi}`;
            });

            const imagenSrc = (hab.imagen && hab.imagen.length > 10) ? hab.imagen : 'imgs/VitoBadi Logo.png';

            card.innerHTML = `
                <div class="img-wrapper">
                    <!-- FOTO NÍTIDA -->
                    <img src="${imagenSrc}" alt="${hab.direccion}" class="sharp-img" onerror="this.src='imgs/VitoBadi Logo.png'">
                </div>
                <div class="room-info">
                    <h3 class="room-address">${hab.direccion}</h3>
                    <p class="room-coords">Lat: ${hab.lat} | Lon: ${hab.lon}</p>
                    <p class="room-price">${hab.precio} € / mes</p>
                    <span class="click-hint">Ver detalles completos</span>
                </div>
            `;
            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error("Error:", error);
        if (titulo) titulo.textContent = "Error al cargar los datos.";
    }
});