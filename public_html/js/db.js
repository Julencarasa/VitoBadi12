/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/ClientSide/javascript.js to edit this template
 */

// js/db.js
const DB_NAME = 'vitobadi12'; // Cambia el 12 por tu número de grupo
const DB_VERSION = 1;

// Función para abrir la base de datos
function abrirBD() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // Este evento se ejecuta solo si la BD no existe o cambia de versión
        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // 1. Crear colección de USUARIOS (Clave primaria: email)
            if (!db.objectStoreNames.contains('usuario')) {
                const userStore = db.createObjectStore('usuario', { keyPath: 'email' });
                // Cargamos los 8 usuarios de prueba [cite: 59]
                datosUsuarios.forEach(u => userStore.add(u));
            }

            // 2. Crear colección de HABITACIONES (Clave primaria: idHabi)
            if (!db.objectStoreNames.contains('habitacion')) {
                const habStore = db.createObjectStore('habitacion', { keyPath: 'idHabi' });
                // Índice para buscar rápido por ciudad (opcional pero recomendado)
                habStore.createIndex('ciudad', 'ciudad', { unique: false });
                // Cargamos las 14 habitaciones de prueba [cite: 60]
                datosHabitaciones.forEach(h => habStore.add(h));
            }
            
            // Aquí irían 'alquiler' y 'solicitud' [cite: 8]
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject('Error al abrir la BD: ' + event.target.errorCode);
        };
    });
}

// --- DATOS DE PRUEBA (HARDCODED) ---

const datosUsuarios = [
    { email: 'mco@deusto.es', password: '1234', nombre: 'MCO', foto: 'base64...' }, // Usuario del ejemplo [cite: 20]
    { email: 'lorenamcpollo@gmail.com', password: 'lorelilu', nombre: 'Juan Prop', foto: '' },
    { email: 'inquilino1@mail.com', password: '123', nombre: 'Ana Inq', foto: '' },
    // ... Añade hasta tener 8 usuarios
];

const datosHabitaciones = [
    // 10 en Vitoria
    { idHabi: 1, ciudad: 'Vitoria', direccion: 'Calle Dato 1', precio: 300, lat: 0, lon: 0, emailPropietario: 'mco@deusto.es' },
    { idHabi: 2, ciudad: 'Vitoria', direccion: 'Av. Gasteiz 45', precio: 250, lat: 0, lon: 0, emailPropietario: 'propietario1@mail.com' },
    // ... Añade 8 más de Vitoria
    // 2 en Bilbao
    { idHabi: 11, ciudad: 'Bilbao', direccion: 'Gran Vía 10', precio: 450, lat: 0, lon: 0, emailPropietario: 'mco@deusto.es' },
    { idHabi: 12, ciudad: 'Bilbao', direccion: 'Casco Viejo 2', precio: 400, lat: 0, lon: 0, emailPropietario: 'propietario1@mail.com' },
    // 2 en Donostia
    { idHabi: 13, ciudad: 'Donostia', direccion: 'La Concha 1', precio: 600, lat: 0, lon: 0, emailPropietario: 'mco@deusto.es' },
    { idHabi: 14, ciudad: 'Donostia', direccion: 'Gros 5', precio: 550, lat: 0, lon: 0, emailPropietario: 'propietario1@mail.com' }
];
