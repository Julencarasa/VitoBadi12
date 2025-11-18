/* js/resultadosAnonimos.js */

document.addEventListener('DOMContentLoaded', async () => {
    const contenedor = document.getElementById('lista-habitaciones');
    const titulo = document.getElementById('titulo-resultado');
    const mensajeVacio = document.getElementById('mensaje-vacio');

    // 1. OBTENER PARÁMETROS DE LA URL
    const params = new URLSearchParams(window.location.search);
    const ciudadBuscada = params.get('ciudad'); // Ejemplo: "Bilbao"
    const fechaBuscadaStr = params.get('fecha');

    // Validación básica
    if (!ciudadBuscada || !fechaBuscadaStr) {
        if (titulo) titulo.textContent = "Error: Datos de búsqueda incompletos.";
        return;
    }

    const fechaBusqueda = new Date(fechaBuscadaStr);
    if (titulo) titulo.textContent = `Habitaciones disponibles en ${ciudadBuscada}`;

    /* ===========================================================
       LOGICA PARA CAMBIAR EL FONDO SEGÚN LA CIUDAD
       =========================================================== */
    const mainContent = document.querySelector('.main-content');
    
    // Diccionario de imágenes (Asegúrate de que los archivos existan en la carpeta imgs)
    // Rutas relativas al archivo HTML, no al JS ni al CSS
    const imagenesFondo = {
        'Vitoria': 'imgs/fondoVitoria.jpg',
        'Bilbao': 'imgs/fondoBilbao.jpg',
        'Donostia': 'imgs/fondoDonostia.jpg'
    };

    // Si la ciudad está en la lista, cogemos su foto. Si no, usamos Vitoria por defecto.
    const imagenAUsar = imagenesFondo[ciudadBuscada] || 'imgs/fondoVitoria.jpg';

    // Aplicamos el estilo en línea (esto sobreescribe al CSS)
    if (mainContent) {
        mainContent.style.backgroundImage = `url('${imagenAUsar}')`;
    }
    /* =========================================================== */

    try {
        // 2. CONEXIÓN A LA BASE DE DATOS
        const db = await abrirBD();

        // 3. OBTENER DATOS (Habitaciones y Alquileres)
        const tx = db.transaction(['habitacion', 'alquiler'], 'readonly');
        
        // A) Obtener habitaciones de la ciudad solicitada
        const storeHab = tx.objectStore('habitacion');
        const indexCiudad = storeHab.index('ciudad');
        
        const habitaciones = await new Promise(resolve => {
            const req = indexCiudad.getAll(ciudadBuscada);
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve([]);
        });

        // B) Obtener alquileres para verificar disponibilidad
        const storeAlq = tx.objectStore('alquiler');
        const alquileres = await new Promise(resolve => {
            const req = storeAlq.getAll();
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve([]);
        });

        // 4. FILTRAR: ¿ESTÁ LIBRE EN ESA FECHA?
        const habitacionesDisponibles = habitaciones.filter(hab => {
            
            // Buscamos si existe algún alquiler para esta habitación que coincida con la fecha
            const estaOcupada = alquileres.some(alq => {
                // Debe ser la misma habitación (FK)
                if (alq.idHabi !== hab.idHabi) return false;

                const fInicio = new Date(alq.fIni);
                const fFin = new Date(alq.fFin);

                // Comprobamos si la fecha buscada cae dentro del rango del alquiler
                return (fechaBusqueda >= fInicio && fechaBusqueda <= fFin);
            });

            // Si NO está ocupada, la incluimos en la lista
            return !estaOcupada;
        });

        // 5. ORDENAR POR PRECIO (Menor a Mayor)
        habitacionesDisponibles.sort((a, b) => a.precio - b.precio);

        // 6. PINTAR LOS RESULTADOS EN EL HTML
        // Limpiamos el mensaje de "Cargando..."
        if (contenedor) contenedor.innerHTML = ""; 

        // Si no hay resultados, mostramos el mensaje de vacío
        if (habitacionesDisponibles.length === 0) {
            if (contenedor) contenedor.style.display = 'none';
            if (mensajeVacio) mensajeVacio.style.display = 'block';
            return;
        }

        // Generamos una tarjeta por cada habitación disponible
        habitacionesDisponibles.forEach(hab => {
            const card = document.createElement('div');
            card.className = 'room-card';

            // Al hacer clic -> Redirigir al Login
            card.addEventListener('click', () => {
                window.location.href = 'login.html';
            });

            // Gestión de la imagen (placeholder si no existe)
            const imagenSrc = (hab.imagen && hab.imagen.length > 10) ? hab.imagen : 'imgs/VitoBadi Logo.png';

            card.innerHTML = `
                <div class="img-wrapper">
                    <img src="${imagenSrc}" alt="${hab.direccion}" class="blur-img" onerror="this.src='imgs/VitoBadi Logo.png'">
                </div>
                <div class="room-info">
                    <h3 class="room-address">${hab.direccion}</h3>
                    <p class="room-price">${hab.precio} € / mes</p>
                    <span class="click-hint">Clic para ver detalles</span>
                </div>
            `;

            contenedor.appendChild(card);
        });

    } catch (error) {
        console.error("Error crítico:", error);
        if (titulo) titulo.textContent = "Error al cargar los datos de la base de datos.";
    }
});