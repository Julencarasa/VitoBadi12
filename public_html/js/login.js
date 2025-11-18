/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/ClientSide/javascript.js to edit this template
 */
// js/login.js

document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('error-message');

    // Escuchamos el evento submit [cite: 71]
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita la recarga de la página

        const emailInput = document.getElementById('email').value;
        const passInput = document.getElementById('password').value;

        try {
            // 1. Abrimos la base de datos (función en db.js)
            const db = await abrirBD();

            // 2. Iniciamos transacción de lectura
            const transaction = db.transaction(['usuario'], 'readonly');
            const store = transaction.objectStore('usuario');

            // 3. Buscamos al usuario por email
            const request = store.get(emailInput);

            request.onsuccess = () => {
                const usuario = request.result;

                // Validación: Usuario existe Y contraseña coincide [cite: 20]
                if (usuario && usuario.password === passInput) {
                    
                    // A. Guardar sesión en SessionStorage [cite: 55]
                    sessionStorage.setItem('usuarioLogueado', JSON.stringify(usuario));

                    // B. Redirigir a la página del buscador
                    window.location.href = 'index.html'; 
                } else {
                    // Mensaje de error para el usuario
                    errorDiv.textContent = "Error: Usuario o contraseña incorrectos.";
                }
            };

            request.onerror = () => {
                errorDiv.textContent = "Error al acceder a la base de datos.";
            };

        } catch (error) {
            // Solo dejamos el error en consola por si acaso, pero limpio para el usuario
            console.error(error);
            errorDiv.textContent = "Ocurrió un error técnico en la aplicación.";
        }
    });
});