/**
 * js/login.js - Con protección anti-autoalquiler para propietarios
 */
document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('error-message');

    // Limpiamos sesión previa (pero NO el destino pendiente)
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
                
                // Transacción de USUARIO (Login)
                const txUser = db.transaction(['usuario'], 'readonly');
                const storeUser = txUser.objectStore('usuario');
                const request = storeUser.get(emailInput);

                request.onsuccess = async () => {
                    const usuario = request.result;

                    // 1. VERIFICAR CREDENCIALES
                    if (usuario && usuario.password === passInput) {
                        
                        // Guardar sesión
                        const usuarioSession = { ...usuario };
                        delete usuarioSession.password;
                        sessionStorage.setItem(usuario.email, JSON.stringify(usuarioSession));
                        sessionStorage.setItem('currentUser', usuario.email);

                        // 2. LÓGICA DE REDIRECCIÓN CON PROTECCIÓN
                        const destinoPendiente = sessionStorage.getItem('destinoPendiente');
                        let urlFinal = 'BuscadorLogeado.html'; // Destino por defecto

                        if (destinoPendiente) {
                            // CASO A: Intenta ver una habitación específica
                            if (destinoPendiente.includes('index.html?id=')) {
                                try {
                                    // Extraemos el ID de la habitación de la URL
                                    const urlParams = new URLSearchParams(destinoPendiente.split('?')[1]);
                                    const idHabi = parseInt(urlParams.get('id'));

                                    // Nueva transacción para consultar la habitación
                                    const txHab = db.transaction(['habitacion'], 'readonly');
                                    const storeHab = txHab.objectStore('habitacion');
                                    
                                    // Promesa para obtener la habitación
                                    const habitacion = await new Promise((resolve) => {
                                        const reqHab = storeHab.get(idHabi);
                                        reqHab.onsuccess = () => resolve(reqHab.result);
                                        reqHab.onerror = () => resolve(null);
                                    });

                                    // ¿SOY YO EL DUEÑO?
                                    if (habitacion && habitacion.emailPropietario === usuario.email) {
                                        console.warn("Acceso redirigido: Eres el propietario de esta habitación.");
                                        // No le dejamos ir a index.html, se va al menú principal
                                        urlFinal = 'BuscadorLogeado.html';
                                    } else {
                                        // No es el dueño, puede verla
                                        urlFinal = destinoPendiente;
                                    }

                                } catch (err) {
                                    console.error("Error verificando propiedad:", err);
                                    // Ante la duda, al menú principal
                                    urlFinal = 'BuscadorLogeado.html';
                                }
                            } 
                            // CASO B: Es una redirección de búsqueda (ResultadosLogeado.html)
                            else {
                                urlFinal = destinoPendiente;
                            }

                            // Limpiamos el ticket usado
                            sessionStorage.removeItem('destinoPendiente');
                        }

                        // 3. EJECUTAR LA REDIRECCIÓN FINAL
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