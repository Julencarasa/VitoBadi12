/**
 * js/login.js - Versión Final con Redirección por Ticket y Protección Anti-Autoalquiler
 */
document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('error-message');

    // Limpiamos la sesión anterior (logout implícito) al cargar el login
    // PERO NO borramos 'destinoPendiente' porque lo necesitamos para redirigir
    sessionStorage.removeItem('currentUser');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const emailInput = document.getElementById('email').value.trim();
            const passInput = document.getElementById('password').value.trim();

            if (!emailInput || !passInput) {
                mostrarError("Por favor, rellena todos los campos.");
                return;
            }

            try {
                const db = await abrirBD(); 
                
                // 1. BUSCAR USUARIO
                const txUser = db.transaction(['usuario'], 'readonly');
                const storeUser = txUser.objectStore('usuario');
                const request = storeUser.get(emailInput);

                request.onsuccess = async () => {
                    const usuario = request.result;

                    // 2. VERIFICAR CREDENCIALES
                    if (usuario && usuario.password === passInput) {
                        
                        // Guardar sesión (JSON completo como pide el requisito)
                        const usuarioSession = { ...usuario };
                        // Nota: El requisito pide guardar password, así que lo dejamos.
                        
                        sessionStorage.setItem(usuario.email, JSON.stringify(usuarioSession));
                        sessionStorage.setItem('currentUser', usuario.email);

                        // 3. LÓGICA DE REDIRECCIÓN INTELIGENTE
                        const destinoPendiente = sessionStorage.getItem('destinoPendiente');
                        let urlFinal = 'BuscadorLogeado.html'; // Destino por defecto si no hay ticket

                        if (destinoPendiente) {
                            
                            // CASO A: El usuario quería ver el detalle de una habitación
                            // Ahora buscamos 'habitacion.html' en lugar de 'index.html'
                            if (destinoPendiente.includes('habitacion.html?id=')) {
                                try {
                                    // Extraer el ID de la URL guardada
                                    const urlParams = new URLSearchParams(destinoPendiente.split('?')[1]);
                                    const idHabi = parseInt(urlParams.get('id'));

                                    // Abrir transacción para consultar la habitación
                                    const txHab = db.transaction(['habitacion'], 'readonly');
                                    const storeHab = txHab.objectStore('habitacion');
                                    
                                    const habitacion = await new Promise((resolve) => {
                                        const reqHab = storeHab.get(idHabi);
                                        reqHab.onsuccess = () => resolve(reqHab.result);
                                        reqHab.onerror = () => resolve(null);
                                    });

                                    // VERIFICACIÓN DE PROPIEDAD
                                    // Si soy el dueño, NO me dejes ir a la pantalla de alquiler
                                    if (habitacion && habitacion.emailPropietario === usuario.email) {
                                        console.warn("Acceso redirigido: Eres el propietario de esta habitación.");
                                        urlFinal = 'BuscadorLogeado.html';
                                    } else {
                                        // No soy el dueño, puedo verla
                                        urlFinal = destinoPendiente;
                                    }

                                } catch (err) {
                                    console.error("Error verificando propiedad:", err);
                                    urlFinal = 'BuscadorLogeado.html'; // Ante error, ir a lo seguro
                                }
                            } 
                            // CASO B: Es una redirección de búsqueda (ResultadosLogeado.html)
                            else {
                                urlFinal = destinoPendiente;
                            }

                            // Limpiamos el ticket usado
                            sessionStorage.removeItem('destinoPendiente');
                        }

                        // 4. EJECUTAR REDIRECCIÓN
                        console.log("Redirigiendo a:", urlFinal);
                        window.location.href = urlFinal;

                    } else {
                        mostrarError("Usuario o contraseña incorrectos.");
                    }
                };

                request.onerror = () => {
                    mostrarError("Error al leer el usuario de la base de datos.");
                };

            } catch (error) {
                console.error("Error crítico:", error);
                mostrarError("Error de conexión. Intenta recargar la página.");
            }
        });
    }

    function mostrarError(mensaje) {
        if (errorDiv) {
            errorDiv.textContent = mensaje;
            errorDiv.style.display = 'block';
        } else {
            alert(mensaje);
        }
    }
});