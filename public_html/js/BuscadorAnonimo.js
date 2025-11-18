/* js/BuscadorAnonimo.js */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('search-form');
    const fechaInput = document.getElementById('fecha');

    // --- 1. VALIDACIÓN INICIAL (Bloqueo visual) ---
    const hoy = new Date();
    const hoyString = hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    fechaInput.setAttribute('min', hoyString); // Impide seleccionar ayer en el calendario

    // --- 2. EVENTO DE BÚSQUEDA ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Paramos el envío normal

        const ciudadSeleccionada = document.getElementById('ciudad').value;
        const fechaSeleccionada = fechaInput.value;

        // Validación 1: Campos vacíos
        if (!ciudadSeleccionada || !fechaSeleccionada) {
            alert("Por favor, rellena todos los campos.");
            return;
        }

        // Validación 2: Fecha pasada (seguridad extra)
        if (fechaSeleccionada < hoyString) {
            alert("Por favor, selecciona una fecha a partir de hoy.");
            return;
        }

        // Convertimos fecha del input a objeto Date para comparar
        const fechaBusqueda = new Date(fechaSeleccionada);

        try {
            // --- 3. CONSULTA A LA BASE DE DATOS ---
            const db = await abrirBD();

            // Transacción para leer 'habitacion' y 'alquiler' a la vez
            const tx = db.transaction(['habitacion', 'alquiler'], 'readonly');
            
            // A) Obtenemos las habitaciones de la ciudad elegida
            const storeHab = tx.objectStore('habitacion');
            const indexCiudad = storeHab.index('ciudad');
            
            const habitaciones = await new Promise((resolve) => {
                const request = indexCiudad.getAll(ciudadSeleccionada);
                request.onsuccess = () => resolve(request.result);
            });

            if (habitaciones.length === 0) {
                alert("No existen habitaciones registradas en esa ciudad.");
                return;
            }

            // B) Obtenemos todos los alquileres para comprobar disponibilidad
            const storeAlq = tx.objectStore('alquiler');
            const alquileres = await new Promise((resolve) => {
                const request = storeAlq.getAll();
                request.onsuccess = () => resolve(request.result);
            });

            // --- 4. LÓGICA DE DISPONIBILIDAD ---
            // Buscamos si hay AL MENOS UNA habitación libre.
            let hayHabitacionLibre = false;

            for (const hab of habitaciones) {
                
                // ¿Está esta habitación ocupada en esa fecha?
                const estaOcupada = alquileres.some(alq => {
                    // 1. ¿Es alquiler de esta habitación?
                    if (alq.idHabi !== hab.idHabi) return false;

                    // 2. ¿Chocan las fechas?
                    const fInicio = new Date(alq.fIni);
                    const fFin = new Date(alq.fFin);

                    // La fecha buscada está DENTRO del rango de alquiler (Ocupada)
                    return (fechaBusqueda >= fInicio && fechaBusqueda <= fFin);
                });

                // Si NO está ocupada, ¡encontramos una libre!
                if (!estaOcupada) {
                    hayHabitacionLibre = true;
                    break; // Ya podemos parar y redirigir
                }
            }

            // --- 5. REDIRECCIÓN O MENSAJE ---
            if (hayHabitacionLibre) {
                console.log("¡Éxito! Hay habitaciones disponibles.");
                // Redirigimos a resultados.html pasando los datos en la URL
                window.location.href = `ResultadosAnonimos.html?ciudad=${ciudadSeleccionada}&fecha=${fechaSeleccionada}`;
            } else {
                alert("Lo sentimos, todas las habitaciones en esa ciudad están ocupadas en esa fecha.");
            }

        } catch (error) {
            console.error("Error técnico en la búsqueda:", error);
            alert("Error al consultar la base de datos.");
        }
    });
});
