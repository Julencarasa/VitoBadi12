document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const errorMsgDiv = document.getElementById('error-message');

    //validacion

    crearMensajeError(emailInput, 'Formato de email inválido (ej: usuario@dominio.com)');
    crearMensajeError(passInput, 'La contraseña no puede estar vacía');

    emailInput.addEventListener('input', () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(emailInput.value)) {
            setValido(emailInput);
        } else {
            setInvalido(emailInput);
        }
    });

    passInput.addEventListener('input', () => {
        if (passInput.value.trim().length > 0) {
            setValido(passInput);
        } else {
            setInvalido(passInput);
        }
    });

    // logica login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMsgDiv.textContent = ""; 

        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        if (!email || !password) {
            errorMsgDiv.textContent = "Por favor, rellena todos los campos.";
            return;
        }

        try {
            const db = await abrirBD();
            const tx = db.transaction(['usuario'], 'readonly');
            const store = tx.objectStore('usuario');
            
            const request = store.get(email);

            request.onsuccess = () => {
                const usuario = request.result;

                if (usuario) {
                    //comprobamos contraseña
                    if (usuario.password === password) {
                        
                        
                        //guarda sesion
                        sessionStorage.setItem('currentUser', email);
                        sessionStorage.setItem(email, JSON.stringify(usuario));

                        
                        // si venía de intentar ver una habitación, lo devolvemos allí
                        const destino = sessionStorage.getItem('destinoPendiente');
                        
                        if (destino) {
                            sessionStorage.removeItem('destinoPendiente'); 
                            window.location.href = destino;
                        } else {
                            // si es un login normal, buscador
                            window.location.href = 'BuscadorLogeado.html';
                        }

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
            errorMsgDiv.textContent = "Error inesperado (Revisa si vitobadi12.js está cargado).";
        }
    });

    //funciones auxiliares
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