/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/ClientSide/javascript.js to edit this template
 */
const DB_NAME = 'vitobadi12'; 
// IMPORTANTE: Hemos subido la versión a 2 para que el navegador actualice los cambios
const DB_VERSION = 2; 

function abrirBD() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // --- 1. TABLA USUARIOS ---
            // PK: email [cite: 8, 56]
            if (!db.objectStoreNames.contains('usuario')) {
                const userStore = db.createObjectStore('usuario', { keyPath: 'email' });
                datosUsuarios.forEach(u => userStore.add(u));
            } else {
                // Si ya existe (de la versión 1), añadimos los nuevos datos si faltan
                // (Opcional: en desarrollo a veces es mejor borrar la BD desde consola)
                const transaction = event.target.transaction;
                const userStore = transaction.objectStore('usuario');
                datosUsuarios.forEach(u => {
                    try { userStore.add(u); } catch(e) {} // Ignora si ya existe
                });
            }

            // --- 2. TABLA HABITACIONES ---
            // PK: idHabi [cite: 8]
            if (!db.objectStoreNames.contains('habitacion')) {
                const habStore = db.createObjectStore('habitacion', { keyPath: 'idHabi' });
                
                // Índices para búsquedas y FKs
                habStore.createIndex('ciudad', 'ciudad', { unique: false }); // Para buscar por ciudad [cite: 13]
                habStore.createIndex('precio', 'precio', { unique: false }); // Para ordenar por precio [cite: 15]
                habStore.createIndex('fk_email_prop', 'emailPropietario', { unique: false }); // FK hacia usuario [cite: 24]

                datosHabitaciones.forEach(h => habStore.add(h));
            }

            // --- 3. TABLA ALQUILERES ---
            // PK: idContrato [cite: 8]
            if (!db.objectStoreNames.contains('alquiler')) {
                const alqStore = db.createObjectStore('alquiler', { keyPath: 'idContrato' });

                // FKs e índices para ordenación
                alqStore.createIndex('fk_habitacion', 'idHabi', { unique: false }); // FK habitacion
                alqStore.createIndex('fk_inquilino', 'emailInqui', { unique: false }); // FK usuario (inquilino)
                alqStore.createIndex('fecha_fin', 'fFin', { unique: false }); // Para ordenar por fecha fin [cite: 48]

                datosAlquileres.forEach(a => alqStore.add(a));
            }

            // --- 4. TABLA SOLICITUDES ---
            // PK: idSolicitud [cite: 8]
            if (!db.objectStoreNames.contains('solicitud')) {
                const solStore = db.createObjectStore('solicitud', { keyPath: 'idSolicitud' });

                // FKs
                solStore.createIndex('fk_habitacion', 'idHabi', { unique: false }); // FK habitacion
                solStore.createIndex('fk_inquilino', 'emailInquiPosible', { unique: false }); // FK usuario

                datosSolicitudes.forEach(s => solStore.add(s));
            }
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject('Error al abrir la BD: ' + event.target.errorCode);
        };
    });
}

// --- DATOS DE PRUEBA (Carga inicial) ---

// Requisito: 8 usuarios 
const datosUsuarios = [
    // Propietarios
    { email: 'mco@deusto.es', password: '1234', nombre: 'MCO', foto: 'imgs/user1.jpg' }, // Usuario del ejemplo [cite: 20]
    { email: 'propietario1@mail.com', password: '123', nombre: 'Juan Prop', foto: '' },
    { email: 'propietario2@mail.com', password: '123', nombre: 'Maria Prop', foto: '' },
    { email: 'propietario3@mail.com', password: '123', nombre: 'Pedro Prop', foto: '' },
    // Inquilinos
    { email: 'inquilino1@mail.com', password: '123', nombre: 'Ana Inq', foto: '' },
    { email: 'inquilino2@mail.com', password: '123', nombre: 'Luis Inq', foto: '' },
    { email: 'inquilino3@mail.com', password: '123', nombre: 'Sofia Inq', foto: '' },
    { email: 'inquilino4@mail.com', password: '123', nombre: 'Carlos Inq', foto: '' }
];

// Requisito: 14 habitaciones (10 Vitoria, 2 Bilbao, 2 Donostia) 
// Campos: idHabi, direccion, lat (double), lon (double), precio, imagen (base64), emailPropietario (FK)
const datosHabitaciones = [
    // --- VITORIA (10 habitaciones) ---
    { idHabi: 1, ciudad: 'Vitoria', direccion: 'Calle Dato 1', lat: 42.846, lon: -2.672, precio: 300, imagen: 'imgs/Habitaciones/hab1.jpg', emailPropietario: 'mco@deusto.es' },
    { idHabi: 2, ciudad: 'Vitoria', direccion: 'Av. Gasteiz 45', lat: 42.850, lon: -2.675, precio: 250, imagen: 'imgs/Habitaciones/hab2.jpg', emailPropietario: 'propietario1@mail.com' },
    { idHabi: 3, ciudad: 'Vitoria', direccion: 'Calle San Prudencio', lat: 42.847, lon: -2.670, precio: 350, imagen: 'imgs/Habitaciones/hab3.jpg', emailPropietario: 'mco@deusto.es' },
    { idHabi: 4, ciudad: 'Vitoria', direccion: 'Calle Francia', lat: 42.848, lon: -2.668, precio: 280, imagen: 'imgs/Habitaciones/hab4.jpg', emailPropietario: 'propietario2@mail.com' },
    { idHabi: 5, ciudad: 'Vitoria', direccion: 'Calle La Paz', lat: 42.845, lon: -2.669, precio: 320, imagen: 'imgs/Habitaciones/hab5.jpg', emailPropietario: 'propietario3@mail.com' },
    { idHabi: 6, ciudad: 'Vitoria', direccion: 'Calle Florida', lat: 42.844, lon: -2.671, precio: 310, imagen: 'imgs/Habitaciones/hab6.jpg', emailPropietario: 'mco@deusto.es' },
    { idHabi: 7, ciudad: 'Vitoria', direccion: 'Calle Gorbea', lat: 42.851, lon: -2.678, precio: 290, imagen: 'imgs/Habitaciones/hab7.jpg', emailPropietario: 'propietario1@mail.com' },
    { idHabi: 8, ciudad: 'Vitoria', direccion: 'Avenida Santiago', lat: 42.849, lon: -2.665, precio: 260, imagen: 'imgs/Habitaciones/hab8.jpg', emailPropietario: 'propietario2@mail.com' },
    { idHabi: 9, ciudad: 'Vitoria', direccion: 'Portal de Castilla', lat: 42.843, lon: -2.680, precio: 300, imagen: 'imgs/Habitaciones/hab9.jpg', emailPropietario: 'propietario3@mail.com' },
    { idHabi: 10, ciudad: 'Vitoria', direccion: 'Calle Prado', lat: 42.846, lon: -2.674, precio: 400, imagen: 'imgs/Habitaciones/hab10.jpg', emailPropietario: 'mco@deusto.es' },

    // --- BILBAO (2 habitaciones) ---
    { idHabi: 11, ciudad: 'Bilbao', direccion: 'Gran Vía 10', lat: 43.263, lon: -2.935, precio: 450, imagen: 'imgs/Habitaciones/hab11.jpg', emailPropietario: 'mco@deusto.es' },
    { idHabi: 12, ciudad: 'Bilbao', direccion: 'Casco Viejo 2', lat: 43.258, lon: -2.923, precio: 400, imagen: 'imgs/Habitaciones/hab12.jpg', emailPropietario: 'propietario1@mail.com' },

    // --- DONOSTIA (2 habitaciones) ---
    { idHabi: 13, ciudad: 'Donostia', direccion: 'La Concha 1', lat: 43.315, lon: -1.986, precio: 600, imagen: 'imgs/Habitaciones/hab13.jpg', emailPropietario: 'mco@deusto.es' },
    { idHabi: 14, ciudad: 'Donostia', direccion: 'Gros 5', lat: 43.322, lon: -1.976, precio: 550, imagen: 'imgs/Habitaciones/hab14.jpg', emailPropietario: 'propietario1@mail.com' }
];

// Requisito: Datos para pruebas de Alquiler 
// Campos: idContrato, idHabi (FK), emailInqui (FK), fIni, fFin
const datosAlquileres = [
    // Alquiler activo
    { idContrato: 1, idHabi: 1, emailInqui: 'inquilino1@mail.com', fIni: '2025-01-01', fFin: '2025-12-31' },
    // Alquiler finalizado (pasado)
    { idContrato: 2, idHabi: 2, emailInqui: 'inquilino2@mail.com', fIni: '2025-11-18', fFin: '2026-02-28' },
     // Alquiler futuro
    { idContrato: 3, idHabi: 11, emailInqui: 'inquilino1@mail.com', fIni: '2025-12-01', fFin: '2026-06-01' }
];

// Requisito: Datos para pruebas de Solicitudes 
// Campos: idSolicitud, idHabi (FK), emailInquiPosible (FK)
const datosSolicitudes = [
    { idSolicitud: 1, idHabi: 13, emailInquiPosible: 'inquilino3@mail.com' },
    { idSolicitud: 2, idHabi: 13, emailInquiPosible: 'inquilino4@mail.com' },
    { idSolicitud: 3, idHabi: 14, emailInquiPosible: 'inquilino1@mail.com' }
];