/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/ClientSide/javascript.js to edit this template
 */
// js/login.js

// Esperamos a que el DOM cargue
document.addEventListener('DOMContentLoaded', () => {
    
    // Referencia al formulario y al div de errores
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('error-message');

    // Escuchamos el evento submit (sin usar onsubmit en HTML) [cite: 71]
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        const emailInput = document.getElementById('email').value;
        const passInput = document.getElementById('password').value;

        try {
            // 1. Abrimos la base de datos
            const db = await abrirBD();

            // 2. Iniciamos una transacción de lectura en 'usuario'
            const transaction = db.transaction(['usuario'], 'readonly');
            const store = transaction.objectStore('usuario');

            // 3. Buscamos al usuario por su email (que es la KeyPath)
            const request = store.get(emailInput);

            request.onsuccess = () => {
                const usuario = request.result;

                // Validación: ¿Existe el usuario? ¿Coincide la contraseña?
                if (usuario && usuario.password === passInput) {
                    
                    // A. Guardar en SessionStorage (Requisito clave) [cite: 55]
                    // Se guarda clave: email, valor: todo el objeto en JSON
                    sessionStorage.setItem(usuario.email, JSON.stringify(usuario));

                    // B. Redirigir a la página principal/búsqueda
                    // Según el flujo, al loguearse vuelves a la pantalla con más opciones [cite: 21]
                    window.location.href = 'index.html'; 
                } else {
                    // Mostrar error visualmente
                    errorDiv.textContent = "Error: Usuario o contraseña incorrectos.";
                }
            };

            request.onerror = () => {
                errorDiv.textContent = "Error al consultar la base de datos.";
            };

        } catch (error) {
            console.error(error);
            errorDiv.textContent = "Error crítico en la aplicación.";
        }
    });
});

