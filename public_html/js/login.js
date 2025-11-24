/* js/login.js */

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const errorMsgDiv = document.getElementById('error-message');

    // --- 1. CONFIGURACIÓN DE VALIDACIÓN EN TIEMPO REAL ---

    // Crear los huecos para los mensajes de error
    crearMensajeError(emailInput, 'Formato de email inválido (ej: usuario@dominio.com)');
    crearMensajeError(passInput, 'La contraseña no puede estar vacía');

    // Evento INPUT para el Email
    emailInput.addEventListener('input', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(emailInput.value)) {
            setValido(emailInput);
        } else {
            setInvalido(emailInput);
        }
    });

    // Evento INPUT para la Contraseña
    passInput.addEventListener('input', () => {
        if (passInput.value.trim().length > 0) {
            setValido(passInput);
        } else {
            setInvalido(passInput);
        }
    });

    // --- 2. LÓGICA DEL FORMULARIO (SUBMIT) ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsgDiv.textContent = ""; // Limpiar errores previos

        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        // Validación final antes de enviar
        if (!email || !password) {
            errorMsgDiv.textContent = "Por favor, rellena todos los campos.";
            return;
        }

        try {
            const db = await abrirBD();
            const tx = db.transaction(['usuario'], 'readonly');
            const store = tx.objectStore('usuario');
            
            // Buscamos al usuario por su email (que es la clave)
            const request = store.get(email);

            request.onsuccess = () => {
                const usuario = request.result;

                if (usuario) {
                    // El usuario existe, comprobamos contraseña
                    if (usuario.password === password) {
                        // LOGIN CORRECTO
                        [cite_start]// Guardamos sesión [cite: 55]
                        sessionStorage.setItem('currentUser', email);
                        sessionStorage.setItem(email, JSON.stringify(usuario));

                        // Redirigir
                        window.location.href = 'BuscadorLogeado.html';
                    } else {
                        errorMsgDiv.textContent = "Contraseña incorrecta.";
                        setInvalido(passInput);
                    }
                } else {
                    errorMsgDiv.textContent = "El usuario no existe.";
                    setInvalido(emailInput);
                }
            };

            request.onerror = () => {
                errorMsgDiv.textContent = "Error al conectar con la base de datos.";
            };

        } catch (error) {
            console.error(error);
            errorMsgDiv.textContent = "Error inesperado.";
        }
    });

    /* --- FUNCIONES AUXILIARES DE VALIDACIÓN VISUAL --- */
    function crearMensajeError(input, texto) {
        const msg = document.createElement('small');
        msg.className = 'msg-error-text'; // Clase definida en CSS
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