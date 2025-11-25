document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. REFERENCIAS AL DOM ---
    const imgEl = document.getElementById('room-image');
    const priceEl = document.getElementById('room-price');
    const addressEl = document.getElementById('room-address');
    const cityEl = document.getElementById('room-city');
    const latEl = document.getElementById('room-lat');
    const lonEl = document.getElementById('room-lon');
    const ownerEmailEl = document.getElementById('owner-email');
    const ownerNameEl = document.getElementById('owner-name');
    const btnVolver = document.getElementById('btn-volver');
    const logoLink = document.getElementById('logo-link');
    const actionArea = document.getElementById('action-area');

    // --- 2. OBTENER ID DE LA URL ---
    const params = new URLSearchParams(window.location.search);
    const idHabi = parseInt(params.get('id'));

    if (!idHabi) {
        alert("Error: No se ha especificado ninguna habitación.");
        window.location.href = 'BuscadorAnonimo.html';
        return;
    }

    // --- 3. GESTIÓN DE SESIÓN ---
    const currentUserEmail = sessionStorage.getItem('currentUser');
    const isLogged = !!currentUserEmail;

    // --- 4. CARGA PRINCIPAL DE DATOS (BD) ---
    let habitacionData = null;

    try {
        const db = await abrirBD();
        
        // Transacción para leer habitación y usuario propietario
        const tx = db.transaction(['habitacion', 'usuario'], 'readonly');
        const storeHab = tx.objectStore('habitacion');
        const storeUser = tx.objectStore('usuario');
        
        // A) Obtener Habitación
        habitacionData = await new Promise((resolve) => {
            const req = storeHab.get(idHabi);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });

        if (!habitacionData) {
            alert("La habitación solicitada no existe.");
            window.location.href = isLogged ? 'BuscadorLogeado.html' : 'BuscadorAnonimo.html';
            return;
        }

        // B) Rellenar HTML Básico
        if (addressEl) addressEl.textContent = habitacionData.direccion;
        if (cityEl) cityEl.textContent = habitacionData.ciudad;
        if (priceEl) priceEl.textContent = habitacionData.precio + " €";
        if (latEl) latEl.textContent = habitacionData.lat;
        if (lonEl) lonEl.textContent = habitacionData.lon;
        if (ownerEmailEl) ownerEmailEl.textContent = habitacionData.emailPropietario;
        
        // C) Obtener Nombre del Propietario
        const propietario = await new Promise((resolve) => {
            const req = storeUser.get(habitacionData.emailPropietario);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
        if (ownerNameEl) {
            ownerNameEl.textContent = propietario ? propietario.nombre : "Desconocido";
        }

    } catch (error) {
        console.error("Error cargando datos:", error);
        alert("Error de conexión con la base de datos.");
        return; 
    }

    // --- 5. LÓGICA DE INTERFAZ (Botones y Estado) ---

    if (isLogged) {
        // === USUARIO LOGUEADO (INQUILINO) ===
        // Asumimos que no es el propietario porque la navegación previa ya lo filtra.
        
        logoLink.href = 'BuscadorLogeado.html';
        
        // Configurar botón volver
        btnVolver.addEventListener('click', () => {
            if (document.referrer && document.referrer.indexOf('Resultados') !== -1) {
                history.back();
            } else {
                window.location.href = 'BuscadorLogeado.html';
            }
        });

        // Imagen Normal
        if (imgEl) {
            imgEl.src = (habitacionData.imagen && habitacionData.imagen.length > 10) ? habitacionData.imagen : 'imgs/VitoBadi Logo.png';
        }

        // --- LÓGICA DE SOLICITUD ---
        
        // 1. Pintamos el botón habilitado por defecto
        actionArea.innerHTML = `
            <button id="btn-alquilar" class="btn btn-primary">Solicitar Alquiler</button>
        `;
        const btnAlquilar = document.getElementById('btn-alquilar');

        // 2. Comprobamos inmediatamente si YA existe solicitud previa para bloquearlo
        verificarEstadoSolicitud(idHabi, currentUserEmail, btnAlquilar);

        // 3. Añadimos el evento de click para solicitar
        btnAlquilar.addEventListener('click', () => {
            realizarSolicitud(idHabi, currentUserEmail, btnAlquilar);
        });

    } else {
        // === USUARIO ANÓNIMO ===
        logoLink.href = 'BuscadorAnonimo.html';
        btnVolver.addEventListener('click', () => window.location.href = 'BuscadorAnonimo.html');

        // Imagen Borrosa
        if (imgEl) {
            imgEl.src = (habitacionData.imagen && habitacionData.imagen.length > 10) ? habitacionData.imagen : 'imgs/VitoBadi Logo.png';
            imgEl.style.filter = "blur(15px)";
        }

        // Aviso de Login
        actionArea.innerHTML = `
            <div style="text-align: center; background: #fff3f3; padding: 15px; border-radius: 5px; border: 1px solid #ffcccc;">
                <p style="color: #d9534f; font-weight: bold; margin-bottom: 10px;">
                    Inicia sesión para ver la foto y alquilar.
                </p>
                <a href="#" id="btn-login-detail" class="btn btn-outline">Iniciar Sesión</a>
            </div>
        `;

        document.getElementById('btn-login-detail').addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('destinoPendiente', `habitacion.html?id=${idHabi}`);
            window.location.href = 'login.html';
        });
    }
});

// --- FUNCIONES AUXILIARES PARA LA LÓGICA DE SOLICITUD ---

/**
 * Consulta la BD para ver si el usuario ya pidió esta habitación.
 * Si sí, bloquea el botón visualmente.
 */
async function verificarEstadoSolicitud(idHabi, emailUser, btn) {
    try {
        const db = await abrirBD();
        const tx = db.transaction(['solicitud'], 'readonly');
        const store = tx.objectStore('solicitud');
        const index = store.index('fk_inquilino');

        // Obtenemos TODAS las solicitudes de este usuario
        const request = index.getAll(emailUser);

        request.onsuccess = () => {
            const misSolicitudes = request.result;
            // Buscamos si alguna es para ESTA habitación
            const yaSolicitada = misSolicitudes.some(s => s.idHabi === idHabi);

            if (yaSolicitada) {
                bloquearBoton(btn);
            }
        };
    } catch (e) {
        console.error("Error verificando solicitud:", e);
    }
}

/**
 * Guarda la nueva solicitud en la BD.
 */
async function realizarSolicitud(idHabi, emailUser, btn) {
    try {
        const db = await abrirBD();
        const tx = db.transaction(['solicitud'], 'readwrite');
        const store = tx.objectStore('solicitud');
        
        // 1. Doble check de seguridad (por si modificaron el HTML/JS en caliente)
        const index = store.index('fk_inquilino');
        const reqCheck = index.getAll(emailUser);

        reqCheck.onsuccess = () => {
            const existentes = reqCheck.result;
            if (existentes.some(s => s.idHabi === idHabi)) {
                alert("Ya habías solicitado esta habitación.");
                bloquearBoton(btn);
                return;
            }

            // 2. Calcular siguiente ID
            const reqKeys = store.getAllKeys();
            reqKeys.onsuccess = () => {
                const keys = reqKeys.result;
                // Si hay claves, cogemos la máxima y sumamos 1. Si no, empezamos en 1.
                const nuevoId = keys.length > 0 ? Math.max(...keys) + 1 : 1;

                // 3. Crear objeto
                const nuevaSolicitud = {
                    idSolicitud: nuevoId,
                    idHabi: idHabi,
                    emailInquiPosible: emailUser
                };

                // 4. Guardar
                const reqAdd = store.add(nuevaSolicitud);
                
                reqAdd.onsuccess = () => {
                    alert("¡Solicitud enviada correctamente!");
                    bloquearBoton(btn); // Bloqueamos el botón tras el éxito
                };
                
                reqAdd.onerror = (e) => {
                    console.error(e);
                    alert("Error al guardar la solicitud.");
                };
            };
        };

    } catch (e) {
        console.error("Error al realizar solicitud:", e);
        alert("Error de conexión.");
    }
}

/**
 * Cambia el estilo del botón para indicar que ya está solicitado.
 */
function bloquearBoton(btn) {
    btn.textContent = "Solicitud Enviada";
    btn.disabled = true;
    btn.style.backgroundColor = "#ccc"; // Gris
    btn.style.borderColor = "#ccc";
    btn.style.color = "#666";
    btn.style.cursor = "not-allowed";
    btn.style.boxShadow = "none";
}