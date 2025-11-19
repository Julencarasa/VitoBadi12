/**
 * js/habitacion.js
 * Gestiona la visualización del detalle de una habitación.
 * Controla el acceso anónimo (foto borrosa) vs registrado.
 */
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
        // Si no hay ID, mandamos al buscador público por defecto
        window.location.href = 'BuscadorAnonimo.html';
        return;
    }

    // --- 3. GESTIÓN DE SESIÓN Y UI ---
    const currentUserEmail = sessionStorage.getItem('currentUser');
    const isLogged = !!currentUserEmail;

    if (isLogged) {
        // === USUARIO REGISTRADO ===
        
        // Navegación
        logoLink.href = 'BuscadorLogeado.html';
        
        btnVolver.addEventListener('click', () => {
            // Intentamos volver atrás manteniendo el filtro de búsqueda si existe
            if (document.referrer && document.referrer.indexOf('Resultados') !== -1) {
                history.back();
            } else {
                window.location.href = 'BuscadorLogeado.html';
            }
        });

        // Botón de Acción (Alquilar)
        // Inicialmente ponemos este botón, luego comprobaremos si es el dueño
        actionArea.innerHTML = `
            <button id="btn-alquilar" class="btn btn-primary">
                Solicitar Alquiler
            </button>
        `;
        
        document.getElementById('btn-alquilar').addEventListener('click', () => {
            alert(`Solicitud enviada para la habitación ${idHabi}. (Simulación)`);
        });

    } else {
        // === USUARIO ANÓNIMO ===
        
        // Navegación
        logoLink.href = 'BuscadorAnonimo.html';
        btnVolver.addEventListener('click', () => window.location.href = 'BuscadorAnonimo.html');
        
        // REQUISITO: Foto difuminada
        if (imgEl) imgEl.style.filter = "blur(15px)";
        
        // Aviso para Loguearse
        actionArea.innerHTML = `
            <div style="text-align: center; background: #fff3f3; padding: 15px; border-radius: 5px; border: 1px solid #ffcccc;">
                <p style="color: #d9534f; font-weight: bold; margin-bottom: 10px;">
                    Para ver la foto nítida y alquilar, debes iniciar sesión.
                </p>
                <a href="#" id="btn-login-detail" class="btn btn-outline">Iniciar Sesión</a>
            </div>
        `;

        // Guardar "Ticket" para volver aquí tras el login
        document.getElementById('btn-login-detail').addEventListener('click', (e) => {
            e.preventDefault();
            // Guardamos: "Quiero volver a habitacion.html con este ID"
            sessionStorage.setItem('destinoPendiente', `habitacion.html?id=${idHabi}`);
            window.location.href = 'login.html';
        });
    }

    // --- 4. CARGA DE DATOS DESDE INDEXEDDB ---
    try {
        const db = await abrirBD();
        
        // Transacción para leer Habitación y Usuario (para el nombre del dueño)
        const tx = db.transaction(['habitacion', 'usuario'], 'readonly');
        const storeHab = tx.objectStore('habitacion');
        const storeUser = tx.objectStore('usuario');
        
        // A) Obtener Habitación
        const habitacion = await new Promise((resolve, reject) => {
            const req = storeHab.get(idHabi);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject("Error leyendo habitación");
        });

        if (!habitacion) {
            alert("La habitación solicitada no existe.");
            window.location.href = isLogged ? 'BuscadorLogeado.html' : 'BuscadorAnonimo.html';
            return;
        }

        // B) Rellenar HTML con datos
        if (addressEl) addressEl.textContent = habitacion.direccion;
        if (cityEl) cityEl.textContent = habitacion.ciudad;
        if (priceEl) priceEl.textContent = habitacion.precio + " €";
        if (latEl) latEl.textContent = habitacion.lat;
        if (lonEl) lonEl.textContent = habitacion.lon;
        if (ownerEmailEl) ownerEmailEl.textContent = habitacion.emailPropietario;
        
        // Imagen con fallback
        if (imgEl) {
            const imagenSrc = (habitacion.imagen && habitacion.imagen.length > 10) ? habitacion.imagen : 'imgs/VitoBadi Logo.png';
            imgEl.src = imagenSrc;
        }

        // C) Obtener Nombre del Propietario (JOIN Manual)
        const propietario = await new Promise((resolve) => {
            const req = storeUser.get(habitacion.emailPropietario);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });

        if (ownerNameEl) {
            ownerNameEl.textContent = propietario ? propietario.nombre : "Desconocido";
        }

        // --- 5. VALIDACIÓN EXTRA: ¿SOY EL PROPIETARIO? ---
        if (isLogged && habitacion.emailPropietario === currentUserEmail) {
            // Si soy el dueño, quito el botón de alquilar y pongo un aviso
            actionArea.innerHTML = `
                <div style="background-color: #e0f7fa; color: #006064; padding: 15px; border-radius: 5px; text-align: center; border: 1px solid #b2ebf2;">
                    <strong>Eres el propietario de esta habitación.</strong>
                    <br>No puedes solicitar un alquiler a ti mismo.
                </div>
            `;
        }

    } catch (error) {
        console.error("Error cargando detalles:", error);
        alert("Error técnico al cargar los datos de la habitación.");
    }
});