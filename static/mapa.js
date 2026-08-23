// ==========================================
// CREAR MAPA
// ==========================================

const mapa = L.map("map").setView(
    [-25.2867, -57.3333],
    11
);


// ==========================================
// MAPA OPENSTREETMAP
// ==========================================

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }
).addTo(mapa);


// ==========================================
// MARCADORES DE LOS COLECTORES
// ==========================================

const marcadores = {};


// ==========================================
// CALCULAR ESTADO DEL COLECTOR
// ==========================================

function obtenerEstado(ultimaConexion) {

    if (!ultimaConexion) {
        return {
            texto: "🔴 DESCONECTADO",
            segundos: null
        };
    }

    let fechaTexto = ultimaConexion;

    // El servidor AWS actualmente guarda la hora en UTC.
    // Si la fecha no trae zona horaria, agregamos Z.
    if (
        !fechaTexto.endsWith("Z") &&
        !fechaTexto.includes("+")
    ) {
        fechaTexto += "Z";
    }

    const fechaUltimaConexion =
        new Date(fechaTexto);

    if (isNaN(fechaUltimaConexion.getTime())) {
        return {
            texto: "🔴 DESCONECTADO",
            segundos: null
        };
    }

    const ahora = new Date();

    const diferenciaSegundos =
        Math.floor(
            (ahora.getTime() -
                fechaUltimaConexion.getTime()) / 1000
        );


    // ======================================
    // MENOS DE 60 SEGUNDOS
    // ======================================

    if (
        diferenciaSegundos >= 0 &&
        diferenciaSegundos <= 60
    ) {

        return {
            texto: "🟢 EN LÍNEA",
            segundos: diferenciaSegundos
        };
    }


    // ======================================
    // MÁS DE 60 SEGUNDOS
    // ======================================

    return {
        texto: "🔴 DESCONECTADO",
        segundos: diferenciaSegundos
    };
}


// ==========================================
// FORMATEAR ÚLTIMA CONEXIÓN
// ==========================================

function formatearUltimaConexion(
    ultimaConexion
) {

    if (!ultimaConexion) {
        return "Sin datos";
    }

    let fechaTexto = ultimaConexion;

    if (
        !fechaTexto.endsWith("Z") &&
        !fechaTexto.includes("+")
    ) {
        fechaTexto += "Z";
    }

    const fecha =
        new Date(fechaTexto);

    if (isNaN(fecha.getTime())) {
        return ultimaConexion;
    }

    return fecha.toLocaleString(
        "es-PY",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


// ==========================================
// ACTUALIZAR COLECTORES
// ==========================================

async function actualizarColectores() {

    try {

        const respuesta =
            await fetch(
                "/api/ubicaciones",
                {
                    cache: "no-store"
                }
            );


        if (!respuesta.ok) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }


        const colectores =
            await respuesta.json();


        colectores.forEach(
            colector => {

                const latitud =
                    parseFloat(
                        colector.latitud
                    );

                const longitud =
                    parseFloat(
                        colector.longitud
                    );


                if (
                    isNaN(latitud) ||
                    isNaN(longitud)
                ) {
                    return;
                }


                // ==================================
                // ESTADO
                // ==================================

                const estado =
                    obtenerEstado(
                        colector.ultima_conexion
                    );


                // ==================================
                // ÚLTIMA CONEXIÓN FORMATEADA
                // ==================================

                const ultimaConexion =
                    formatearUltimaConexion(
                        colector.ultima_conexion
                    );


                // ==================================
                // TEXTO DEL POPUP
                // ==================================

                const texto = `

                    <div style="
                        min-width: 220px;
                        font-family: Arial, sans-serif;
                    ">

                        <strong>
                            Colector:
                        </strong>

                        ${colector.device_id}

                        <br><br>

                        <strong>
                            Estado:
                        </strong>

                        ${estado.texto}

                        <br>

                        <strong>
                            Batería:
                        </strong>

                        ${colector.bateria ?? "Sin datos"}%

                        <br>

                        <strong>
                            Última conexión:
                        </strong>

                        ${ultimaConexion}

                    </div>
                `;


                // ==================================
                // SI YA EXISTE EL COLECTOR
                // ==================================

                if (
                    marcadores[
                        colector.device_id
                    ]
                ) {

                    marcadores[
                        colector.device_id
                    ]
                    .setLatLng(
                        [
                            latitud,
                            longitud
                        ]
                    );


                    marcadores[
                        colector.device_id
                    ]
                    .setPopupContent(
                        texto
                    );

                }


                // ==================================
                // SI ES UN COLECTOR NUEVO
                // ==================================

                else {

                    marcadores[
                        colector.device_id
                    ] = L.marker(
                        [
                            latitud,
                            longitud
                        ]
                    )
                    .addTo(mapa)
                    .bindPopup(
                        texto
                    );

                }

            }
        );

    }

    catch (error) {

        console.error(
            "Error obteniendo ubicaciones:",
            error
        );
    }
}


// ==========================================
// PRIMERA ACTUALIZACIÓN
// ==========================================

actualizarColectores();


// ==========================================
// ACTUALIZAR CADA 5 SEGUNDOS
// ==========================================

setInterval(
    actualizarColectores,
    5000
);