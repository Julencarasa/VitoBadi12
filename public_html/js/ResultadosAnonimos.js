

document.addEventListener('DOMContentLoaded', async () => {
    const contenedor = document.getElementById('lista-habitaciones');
    const titulo = document.getElementById('titulo-resultado');
    const mensajeVacio = document.getElementById('mensaje-vacio');

   
    const params = new URLSearchParams(window.location.search);
    const ciudadBuscada = params.get('ciudad');
    const fechaBuscadaStr = params.get('fecha');

    // Validación básica
    if (!ciudadBuscada || !fechaBuscadaStr) {
        if (titulo) titulo.textContent = "Error: Datos de búsqueda incompletos.";
        return;
    }

    const fechaBusqueda = new Date(fechaBuscadaStr);
    if (titulo) titulo.textContent = `Habitaciones disponibles en ${ciudadBuscada}`;

   
    // Buscamos el botón que lleva al login en la barra de navegación
    const btnLoginHeader = document.querySelector('.header-nav a[href="login.html"]');
    
    if (btnLoginHeader) {
        btnLoginHeader.addEventListener('click', (e) => {
            e.preventDefault(); // Evitamos que navegue directamente
            
            // Construimos la URL "VIP" con los mismos datos que ya tenemos
            const destinoVIP = `ResultadosLogeado.html${window.location.search}`;
            
            // Guardamos el ticket
            sessionStorage.setItem('destinoPendiente', destinoVIP);
            
            // Nos vamos al login
            window.location.href = 'login.html';
        });
    }
    /* =========================================================== */


    
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
            const req = indexCiudad.getAll(ciudadBuscada);
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve([]);
        });

        const storeAlq = tx.objectStore('alquiler');
        const alquileres = await new Promise(resolve => {
            const req = storeAlq.getAll();
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = () => resolve([]);
        });

        
        const habitacionesDisponibles = habitaciones.filter(hab => {
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

            
            card.addEventListener('click', () => {
                // Queremos ver el detalle de esta habitación concreta
                const destinoDetalle = `habitacion.html?id=${hab.idHabi}`;
                sessionStorage.setItem('destinoPendiente', destinoDetalle);
                window.location.href = 'login.html';
            });

            // Imagen (placeholder si falla)
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
        if (titulo) titulo.textContent = "Error al cargar los datos.";
    }
});