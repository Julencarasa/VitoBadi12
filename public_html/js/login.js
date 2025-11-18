/**
 * js/login.js - Versión depurada y robusta
 */
document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('error-message');

    // Limpiar sesión previa
    sessionStorage.clear();

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 1. Frenamos el envío tradicional
            
            const emailInput = document.getElementById('email').value.trim();
            const passInput = document.getElementById('password').value.trim();

            if (!emailInput || !passInput) {
                mostrarError("Por favor, rellena todos los campos.");
                return;
            }

            try {
                console.log("Iniciando conexión a BD...");
                // 2. Conectamos a la BD
                const db = await abrirBD(); 
                
                const tx = db.transaction(['usuario'], 'readonly');
                const store = tx.objectStore('usuario');
                const request = store.get(emailInput);

                request.onsuccess = () => {
                    const usuario = request.result;
                    console.log("Usuario encontrado:", usuario ? "Sí" : "No");

                    // 3. Verificación
                    if (usuario && usuario.password === passInput) {
                        console.log("Contraseña correcta. Guardando sesión...");
                        
                        // Guardar sesión
                        const usuarioSession = { ...usuario };
                        delete usuarioSession.password; 
                        sessionStorage.setItem(usuario.email, JSON.stringify(usuarioSession));
                        sessionStorage.setItem('currentUser', usuario.email);

                        // 4. Lógica de Redirección Segura
                        let destino = 'BuscadorLogeado.html'; // Destino por defecto

                        try {
                            const origen = document.referrer;
                            console.log("Vengo de:", origen);

                            if (origen && typeof origen === 'string') {
                                if (origen.indexOf('resultadosAnonimos.html') !== -1) {
                                    // Reemplazar la página pero mantener los parámetros URL (?ciudad=...)
                                    destino = origen.replace('resultadosAnonimos.html', 'resultadosLogeados.html');
                                } 
                                else if (origen.indexOf('BuscadorAnonimo.html') !== -1) {
                                    destino = 'BuscadorLogeado.html';
                                }
                            }
                        } catch (err) {
                            console.warn("Error calculando redirección, usando por defecto:", err);
                        }

                        console.log("Redirigiendo a:", destino);
                        // Forzamos la redirección
                        window.location.href = destino;

                    } else {
                        mostrarError("Usuario o contraseña incorrectos.");
                    }
                };

                request.onerror = () => {
                    console.error("Error en request DB:", request.error);
                    mostrarError("Error al leer el usuario de la base de datos.");
                };

            } catch (error) {
                console.error("Error crítico:", error);
                // Mensaje especial si la BD no abre (posible bloqueo de versión)
                mostrarError("Error de conexión. Si tienes otras pestañas abiertas, ciérralas y recarga.");
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