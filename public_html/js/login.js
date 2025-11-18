/**
 * js/login.js - Versión Final con Redirección por Ticket
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
                const tx = db.transaction(['usuario'], 'readonly');
                const store = tx.objectStore('usuario');
                const request = store.get(emailInput);

                request.onsuccess = () => {
                    const usuario = request.result;

                    if (usuario && usuario.password === passInput) {
                        
                        // 1. GUARDAR SESIÓN
                        const usuarioSession = { ...usuario };
                        delete usuarioSession.password; // Por seguridad
                        
                        sessionStorage.setItem(usuario.email, JSON.stringify(usuarioSession));
                        sessionStorage.setItem('currentUser', usuario.email);

                        // 2. LEER TICKET DE DESTINO
                        const destinoPendiente = sessionStorage.getItem('destinoPendiente');

                        if (destinoPendiente) {
                            // CASO A: Hay un ticket (Viene de una carta o del botón header en resultados)
                            console.log("Usando ticket de destino:", destinoPendiente);
                            sessionStorage.removeItem('destinoPendiente'); // Borramos el ticket usado
                            window.location.href = destinoPendiente;
                        } else {
                            // CASO B: No hay ticket (Viene del botón login en buscador normal)
                            console.log("Login estándar. Yendo a BuscadorLogeado.");
                            window.location.href = 'BuscadorLogeado.html';
                        }

                    } else {
                        mostrarError("Usuario o contraseña incorrectos.");
                    }
                };

                request.onerror = () => {
                    mostrarError("Error al leer la base de datos.");
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