/* js/AnadirHabitacion.js - VERSIÓN GOOGLE MAPS API */

document.addEventListener('DOMContentLoaded', async () => {
    
    // SEGURIDAD
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    // HEADER
    let usuario = null;
    try { usuario = JSON.parse(sessionStorage.getItem(currentUserEmail)); } catch(e){}
    
    const greeting = document.getElementById('user-greeting');
    const photoUser = document.getElementById('user-photo');
    if (usuario) {
        greeting.textContent = `Hola, ${usuario.nombre}`;
        if (usuario.foto && usuario.foto.length > 10) photoUser.src = usuario.foto;
    }

    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = 'BuscadorAnonimo.html';
        });
    }

    // REFERENCIAS DEL FORMULARIO
    const inputDireccion = document.getElementById('direccion');
    const inputPrecio = document.getElementById('precio');
    const form = document.getElementById('form-anadir');
    const errorMsg = document.getElementById('error-msg');

    // LÓGICA DRAG AND DROP
    const dropZone = document.getElementById('drop-zone');
    const inputFoto = document.getElementById('input-foto');
    const previewImg = document.getElementById('preview-img');
    const dropText = dropZone.querySelector('p');
    let fotoBase64 = null;

    dropZone.addEventListener('click', () => inputFoto.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, () => dropZone.classList.add('dragover')));
    ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, () => dropZone.classList.remove('dragover')));

    dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });

    inputFoto.addEventListener('change', () => {
        if (inputFoto.files.length > 0) handleFile(inputFoto.files[0]);
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) return alert("Solo imágenes.");
        const reader = new FileReader();
        reader.onload = (e) => {
            fotoBase64 = e.target.result;
            previewImg.src = fotoBase64;
            previewImg.style.display = 'block';
            dropText.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    // ENVÍO DEL FORMULARIO CON GOOGLE MAPS
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        errorMsg.textContent = "";

        const direccionTexto = inputDireccion.value.trim();
        const precio = parseInt(inputPrecio.value);

        // Validaciones iniciales
        if (!direccionTexto || direccionTexto.length < 3) return mostrarError("La dirección es demasiado corta.");
        if (!precio || precio <= 0) return mostrarError("El precio debe ser mayor que 0.");
        if (!fotoBase64) return mostrarError("Debes subir una foto de la habitación.");

        // Bloqueamos el botón para dar feedback visual
        const btnSubmit = form.querySelector('button[type="submit"]');
        const textoOriginalBtn = btnSubmit.textContent;
        btnSubmit.textContent = "Consultando Google Maps...";
        btnSubmit.disabled = true;

        // LLAMADA A LA API DE GOOGLE MAPS 
        const geocoder = new google.maps.Geocoder();

        geocoder.geocode({ 'address': direccionTexto }, async (results, status) => {
            
            if (status === 'OK') {
                // Google encontró la dirección
                const resultado = results[0];
                
                // Obtener Coordenadas
                const latitudFinal = resultado.geometry.location.lat();
                const longitudFinal = resultado.geometry.location.lng();
                
                // Detectar Ciudad
                // Google devuelve la dirección desglosada en 'address_components'.
                // Buscamos el componente que sea de tipo 'locality' (ciudad).
                let ciudadGoogle = "";
                const comp = resultado.address_components;
                
                for(let i=0; i < comp.length; i++) {
                    if (comp[i].types.includes("locality")) {
                        ciudadGoogle = comp[i].long_name;
                        break;
                    }
                }
                // Si no encuentra 'locality' (a veces pasa en pueblos o áreas grandes), 
                // buscamos 'administrative_area_level_2' (provincia) como fallback.
                if(!ciudadGoogle) {
                     for(let i=0; i < comp.length; i++) {
                        if (comp[i].types.includes("administrative_area_level_2")) {
                            ciudadGoogle = comp[i].long_name;
                            break;
                        }
                    }
                }

                // Validar si la ciudad es una de las permitidas
                let ciudadFinal = null;
                if (ciudadGoogle.includes("Vitoria") || ciudadGoogle.includes("Gasteiz")) ciudadFinal = "Vitoria";
                else if (ciudadGoogle.includes("Bilbao")) ciudadFinal = "Bilbao";
                else if (ciudadGoogle.includes("Donostia") || ciudadGoogle.includes("Sebastián")) ciudadFinal = "Donostia";

                if (!ciudadFinal) {
                    restaurarBoton();
                    return mostrarError(`Ubicación detectada: ${ciudadGoogle}. Solo operamos en Vitoria, Bilbao o Donostia.`);
                }

                // Guardar en IndexedDB
                try {
                    const db = await abrirBD();
                    // Transacción de escritura
                    const tx = db.transaction(['habitacion'], 'readwrite');
                    const store = tx.objectStore('habitacion');

                    // 1. Calcular ID Autoincremental (Máximo actual + 1)
                    const reqKeys = store.getAllKeys();
                    
                    reqKeys.onsuccess = () => {
                        const keys = reqKeys.result;
                        let nuevoId = 1;
                        if (keys.length > 0) {
                            nuevoId = Math.max(...keys) + 1;
                        }

                        // Usamos la dirección "bonita" que nos devuelve Google (ej: "Calle Dato, 1")
                        // Cogemos solo la parte antes de la primera coma para que no sea larguísima
                        const direccionBonita = resultado.formatted_address.split(',')[0];

                        const nuevaHabitacion = {
                            idHabi: nuevoId,
                            direccion: direccionBonita, 
                            ciudad: ciudadFinal,
                            precio: precio,
                            imagen: fotoBase64,
                            lat: latitudFinal,
                            lon: longitudFinal,
                            longi: longitudFinal, // Guardamos ambos nombres por compatibilidad
                            emailPropietario: currentUserEmail,
                            descripcion: "Habitación en " + ciudadFinal
                        };

                        store.add(nuevaHabitacion);
                    };

                    // Esperar a que termine la transacción (CRUCIAL para que se guarde bien)
                    tx.oncomplete = () => {
                        alert(`¡Guardado con éxito!\nUbicación: ${ciudadFinal}`);
                        window.location.href = "VerMisHabitaciones.html";
                    };
                    
                    tx.onerror = (ev) => { 
                        console.error(ev);
                        mostrarError("Error al guardar en la base de datos."); 
                        restaurarBoton(); 
                    };

                } catch (err) {
                    console.error(err);
                    mostrarError("Error de conexión con la base de datos.");
                    restaurarBoton();
                }

            } else {
                // Google devolvió error 
                restaurarBoton();
                mostrarError('Google no encontró la dirección. Intenta ser más específico (ej: Calle Dato 1, Vitoria). Estado: ' + status);
            }
        });

        function restaurarBoton() {
            btnSubmit.textContent = "Aceptar";
            btnSubmit.disabled = false;
        }
    });

    function mostrarError(texto) {
        errorMsg.textContent = texto;
    }
});