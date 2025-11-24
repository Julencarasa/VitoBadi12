/* js/AnadirHabitacion.js */

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. SEGURIDAD
    const currentUserEmail = sessionStorage.getItem('currentUser');
    if (!currentUserEmail) {
        window.location.href = 'login.html';
        return;
    }

    // 2. HEADER
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

    // 3. REFERENCIAS Y VALIDACIÓN EN TIEMPO REAL
    const inputDireccion = document.getElementById('direccion');
    const inputPrecio = document.getElementById('precio');
    const form = document.getElementById('form-anadir');
    const errorMsg = document.getElementById('error-msg');

    // Crear mensajes de error
    crearMensajeError(inputDireccion, 'La dirección debe tener al menos 3 caracteres');
    crearMensajeError(inputPrecio, 'El precio debe ser un número positivo');

    // Validar Dirección
    inputDireccion.addEventListener('input', () => {
        if (inputDireccion.value.trim().length >= 3) {
            setValido(inputDireccion);
        } else {
            setInvalido(inputDireccion);
        }
    });

    // Validar Precio
    inputPrecio.addEventListener('input', () => {
        const val = parseFloat(inputPrecio.value);
        if (val > 0) {
            setValido(inputPrecio);
        } else {
            setInvalido(inputPrecio);
        }
    });


    // 4. LÓGICA DRAG AND DROP (FOTO)
    const dropZone = document.getElementById('drop-zone');
    const inputFoto = document.getElementById('input-foto');
    const previewImg = document.getElementById('preview-img');
    const dropText = dropZone.querySelector('p');
    let fotoBase64 = null;

    dropZone.addEventListener('click', () => inputFoto.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    inputFoto.addEventListener('change', (e) => {
        if (inputFoto.files.length > 0) handleFile(inputFoto.files[0]);
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert("Solo se permiten imágenes.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            fotoBase64 = e.target.result;
            previewImg.src = fotoBase64;
            previewImg.style.display = 'block';
            dropText.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }


    // 5. ENVÍO DEL FORMULARIO
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsg.textContent = "";

        const direccion = inputDireccion.value.trim();
        const precio = parseInt(inputPrecio.value);

        // Validaciones finales
        if (!direccion || direccion.length < 3) {
            errorMsg.textContent = "Dirección incorrecta.";
            setInvalido(inputDireccion);
            return;
        }
        if (!precio || precio <= 0) {
            errorMsg.textContent = "Precio incorrecto.";
            setInvalido(inputPrecio);
            return;
        }
        if (!fotoBase64) {
            errorMsg.textContent = "Debes subir una foto.";
            return;
        }

        try {
            const db = await abrirBD();
            const tx = db.transaction(['habitacion'], 'readwrite');
            const store = tx.objectStore('habitacion');

            // ID único basado en fecha
            const nuevoId = Date.now();

            // Simulación de coordenadas (Lat/Lon)
            const latMock = (42.8 + Math.random() * 0.1).toFixed(6);
            const lonMock = (-2.6 + Math.random() * 0.1).toFixed(6);

            const nuevaHabitacion = {
                idHabi: nuevoId,
                direccion: direccion,
                precio: precio,
                imagen: fotoBase64,
                lat: parseFloat(latMock),
                longi: parseFloat(lonMock),
                emailPropietario: currentUserEmail,
                descripcion: "Habitación en " + direccion
            };

            const request = store.add(nuevaHabitacion);

            request.onsuccess = () => {
                alert("¡Habitación publicada con éxito!");
                window.location.href = "VerMisHabitaciones.html";
            };

            request.onerror = () => {
                errorMsg.textContent = "Error guardando en BD.";
            };

        } catch (err) {
            console.error(err);
            errorMsg.textContent = "Error de sistema.";
        }
    });

    /* --- FUNCIONES AUXILIARES DE VALIDACIÓN --- */
    function crearMensajeError(input, texto) {
        const msg = document.createElement('small');
        msg.className = 'msg-error-text';
        msg.textContent = texto;
        input.parentNode.appendChild(msg);
    }

    function setValido(input) {
        input.classList.remove('input-error');
        input.classList.add('input-success');
    }

    function setInvalido(input) {
        input.classList.remove('input-success');
        input.classList.add('input-error');
    }
});