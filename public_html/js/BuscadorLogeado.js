/* js/BuscadorLogeado.js - VERSIÓN API GOOGLE MAPS */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. SESIÓN Y HEADER (Igual que antes)
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
        if (usuario.foto && usuario.foto.length > 10) photo.src = usuario.foto;
    }

    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'BuscadorAnonimo.html';
        });
    }

    // 2. GESTIÓN DE PESTAÑAS
    const tabGenerica = document.getElementById('btn-busqueda-generica');
    const tabGeo = document.getElementById('btn-busqueda-geo');
    const vistaGenerica = document.getElementById('vista-generica');
    const vistaGeo = document.getElementById('vista-geo');

    if(tabGenerica && tabGeo && vistaGenerica && vistaGeo) {
        tabGenerica.addEventListener('click', (e) => {
            e.preventDefault();
            vistaGenerica.style.display = 'block';
            vistaGeo.style.display = 'none';
        });

        tabGeo.addEventListener('click', (e) => {
            e.preventDefault();
            vistaGenerica.style.display = 'none';
            vistaGeo.style.display = 'block';
        });
    }

    // 3. BÚSQUEDA GENÉRICA
    const formGenerico = document.getElementById('search-form');
    if(formGenerico) {
        const fechaInput = document.getElementById('fecha');
        if(fechaInput) {
            const hoy = new Date().toISOString().split('T')[0];
            fechaInput.setAttribute('min', hoy);
        }
        formGenerico.addEventListener('submit', (e) => {
            e.preventDefault();
            const ciudad = document.getElementById('ciudad').value;
            const fecha = document.getElementById('fecha').value;
            if (ciudad && fecha) {
                window.location.href = `ResultadosLogeado.html?ciudad=${encodeURIComponent(ciudad)}&fecha=${encodeURIComponent(fecha)}`;
            }
        });
    }

    // =========================================================
    // 4. LÓGICA DE GEOLOCALIZACIÓN CON GOOGLE MAPS API
    // =========================================================
    
    const formGeo = document.getElementById('geo-form');
    
    if (formGeo) {
        // Crear contenedor del mapa si no existe
        let mapContainer = document.getElementById('mapa-resultado');
        if (!mapContainer) {
            mapContainer = document.createElement('div');
            mapContainer.id = 'mapa-resultado';
            formGeo.parentNode.appendChild(mapContainer);
        }

        // Crear selector de radio si no existe
        let radioSelect = document.getElementById('radio-km');
        if(!radioSelect) {
            const divGroup = document.createElement('div');
            divGroup.className = 'form-group';
            divGroup.style.marginTop = '10px';
            
            const label = document.createElement('label');
            label.textContent = 'Radio (Km): ';
            
            radioSelect = document.createElement('select');
            radioSelect.id = 'radio-km';
            [0.5, 1, 1.5, 2].forEach(km => {
                const opt = document.createElement('option');
                opt.value = km;
                opt.textContent = km + ' km';
                radioSelect.appendChild(opt);
            });

            divGroup.appendChild(label);
            divGroup.appendChild(radioSelect);
            
            const btnSubmit = formGeo.querySelector('button');
            formGeo.insertBefore(divGroup, btnSubmit);
        }

        formGeo.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Verificar si la API de Google ha cargado
            if (typeof google === 'undefined') {
                alert("La API de Google Maps no ha cargado correctamente. Revisa tu API KEY.");
                return;
            }

            const direccionInput = document.getElementById('direccion-geo').value;
            const radioKm = parseFloat(document.getElementById('radio-km').value);
            const radioMetros = radioKm * 1000; // Google usa metros

            // 1. Usar Geocoder para obtener coordenadas de la dirección escrita
            const geocoder = new google.maps.Geocoder();
            
            geocoder.geocode({ 'address': direccionInput }, async (results, status) => {
                if (status === 'OK') {
                    const centroCoords = results[0].geometry.location; // Objeto LatLng de Google

                    // Mostrar el mapa
                    mapContainer.style.display = 'block';
                    const mapa = new google.maps.Map(mapContainer, {
                        zoom: 14, // Zoom inicial (ajustable)
                        center: centroCoords
                    });

                    // Marcador de "Tu Ubicación" (Azul si es posible, o por defecto)
                    new google.maps.Marker({
                        map: mapa,
                        position: centroCoords,
                        title: "Tu búsqueda: " + direccionInput,
                        icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' // Icono azul
                    });

                    // Dibujar círculo del radio (Opcional pero visualmente útil)
                    new google.maps.Circle({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#FF0000',
                        fillOpacity: 0.1,
                        map: mapa,
                        center: centroCoords,
                        radius: radioMetros
                    });

                    // 2. Traer habitaciones de IndexedDB y filtrar
                    try {
                        const db = await abrirBD();
                        const tx = db.transaction(['habitacion'], 'readonly');
                        const store = tx.objectStore('habitacion');
                        const request = store.getAll();

                        request.onsuccess = () => {
                            const habitaciones = request.result;

                            habitaciones.forEach(hab => {
                                if (hab.lat && hab.longi) {
                                    const habCoords = new google.maps.LatLng(hab.lat, hab.longi);
                                    
                                    // CALCULAR DISTANCIA REAL (Librería Geometry)
                                    const distancia = google.maps.geometry.spherical.computeDistanceBetween(centroCoords, habCoords);

                                    if (distancia <= radioMetros) {
                                        // 3. Crear Marcador para la habitación
                                        const marker = new google.maps.Marker({
                                            map: mapa,
                                            position: habCoords,
                                            title: hab.direccion,
                                            animation: google.maps.Animation.DROP
                                        });

                                        // 4. InfoWindow (Click para ver precio y fecha)
                                        // Simulación de fecha fin (o "Disponible" si no tenemos el dato a mano)
                                        const contenidoInfo = `
                                            <div style="text-align:center">
                                                <h3 style="margin:0; color:#333;">${hab.direccion}</h3>
                                                <p style="font-size:1.1rem; font-weight:bold; color:#00cccc;">${hab.precio} €</p>
                                                <p style="font-size:0.9rem;">Fecha fin: <br><strong>Disponible</strong></p>
                                            </div>
                                        `;

                                        const infoWindow = new google.maps.InfoWindow({
                                            content: contenidoInfo
                                        });

                                        marker.addListener('click', () => {
                                            infoWindow.open(mapa, marker);
                                        });
                                    }
                                }
                            });
                        };
                    } catch (err) {
                        console.error("Error BD:", err);
                    }

                } else {
                    alert('No se pudo encontrar la dirección: ' + status);
                }
            });
        });
    }
});