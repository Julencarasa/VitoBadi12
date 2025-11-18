document.addEventListener('DOMContentLoaded', async () => {
    const contenedor = document.getElementById('lista-habitaciones');
    const titulo = document.getElementById('titulo-resultado');
    const mensajeVacio = document.getElementById('mensaje-vacio');

    // 1. Obtener parámetros de la URL
    const params = new URLSearchParams(window.location.search);
    const ciudadBuscada = params.get('ciudad');
    const fechaBuscadaStr = params.get('fecha');

    if (!ciudadBuscada || !fechaBuscadaStr) {
        titulo.textContent = "Error: Datos de búsqueda incompletos.";
        return;
    }

    const fechaBusqueda = new Date(fechaBuscadaStr);
    titulo.textContent = `Habitaciones disponibles en ${ciudadBuscada}`;

    try {
        // 2. Conexión a BD
        const db = await abrirBD();

        // 3. Obtener habitaciones de esa ciudad
        const tx = db.transaction(['habitacion', 'alquiler'], 'readonly');
        
        // A) Habitaciones
        const storeHab = tx.objectStore('habitacion');
        const indexCiudad = storeHab.index('ciudad');
        const habitaciones = await new Promise(resolve => {
            indexCiudad.getAll(ciudadBuscada).onsuccess = (e) => resolve(e.target.result);
        });

        // B) Alquileres (para comprobar fechas)
        const storeAlq = tx.objectStore('alquiler');
        const alquileres = await new Promise(resolve => {
            storeAlq.getAll().onsuccess = (e) => resolve(e.target.result);
        });

        // 4. FILTRAR: ¿Está la habitación libre en esa fecha?
        const habitacionesDisponibles = habitaciones.filter(hab => {
            
            // Buscamos si existe algún alquiler que coincida con esta habitación
            // Y que "pise" la fecha elegida
            const estaOcupada = alquileres.some(alq => {
                if (alq.idHabi !== hab.idHabi) return false;

                const fInicio = new Date(alq.fIni);
                const fFin = new Date(alq.fFin);

                // Si la fecha buscada está entre el inicio y el fin del contrato -> OCUPADA
                return (fechaBusqueda >= fInicio && fechaBusqueda <= fFin);
            });

            // Si NO está ocupada, la guardamos en la lista
            return !estaOcupada;
        });

        // 5. ORDENAR POR PRECIO (Menor a Mayor)
        habitacionesDisponibles.sort((a, b) => a.precio - b.precio);

        // 6. PINTAR EN HTML
        contenedor.innerHTML = ""; // Limpiar carga

        if (habitacionesDisponibles.length === 0) {
            contenedor.style.display = 'none';
            mensajeVacio.style.display = 'block';
            return;
        }

        habitacionesDisponibles.forEach(hab => {
            const card = document.createElement('div');
            card.className = 'room-card';

            // CLICK -> IR A LOGIN
            card.addEventListener('click', () => {
                // (Opcional) Guardar intención de visita
                // sessionStorage.setItem('redirectAfterLogin', `detalle.html?id=${hab.idHabi}`);
                window.location.href = 'login.html';
            });

            // Imagen (usa placeholder si no hay)
            const imagenSrc = (hab.imagen && hab.imagen.length > 10) ? hab.imagen : 'imgs/VitoBadi Logo.png';

            card.innerHTML = `
                <div class="img-wrapper">
                    <!-- Clase blur-img aplica el efecto borroso -->
                    <img src="${imagenSrc}" alt="${hab.direccion}" class="blur-img" onerror="this.src='imgs/VitoBadi Logo.png'">
                </div>
                <div class="room-info">
                    <h3 class="room-address">${hab.direccion}</h3>
                    <p class="room-price">${hab.precio} € / mes</p>
                    <span class="click-hint">Click para ver detalles</span>
                </div>
            `;

            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error("Error:", error);
        titulo.textContent = "Error al cargar los datos.";
    }
});
