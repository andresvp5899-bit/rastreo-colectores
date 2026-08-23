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
// MARCADORES
// ==========================================

const marcadores = {};
let datosColectores = [];


// ==========================================
// ESTADO DEL COLECTOR
// ==========================================

function obtenerEstado(ultimaConexion) {

    if (!ultimaConexion) {
        return {
            texto: "🔴 DESCONECTADO",
            online: false
        };
    }

    let fechaTexto = ultimaConexion;

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
            online: false
        };
    }

    const ahora = new Date();

    const diferenciaSegundos =
        Math.floor(
            (
                ahora.getTime() -
                fechaUltimaConexion.getTime()
            ) / 1000
        );

    if (
        diferenciaSegundos >= 0 &&
        diferenciaSegundos <= 60
    ) {
        return {
            texto: "🟢 EN LÍNEA",
            online: true
        };
    }

    return {
        texto: "🔴 DESCONECTADO",
        online: false
    };
}


// ==========================================
// FORMATEAR FECHA
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
// ACTUALIZAR ESTADÍSTICAS
// ==========================================

function actualizarEstadisticas(
    colectores
) {

    let online = 0;
    let offline = 0;

    colectores.forEach(
        colector => {

            const estado =
                obtenerEstado(
                    colector.ultima_conexion
                );

            if (estado.online) {
                online++;
            } else {
                offline++;
            }
        }
    );

    document.getElementById(
        "totalColectores"
    ).textContent =
        colectores.length;

    document.getElementById(
        "totalOnline"
    ).textContent =
        online;

    document.getElementById(
        "totalOffline"
    ).textContent =
        offline;
}


// ==========================================
// ACTUALIZAR LISTA LATERAL
// ==========================================

function actualizarLista(
    colectores
) {

    const lista =
        document.getElementById(
            "listaColectores"
        );

    lista.innerHTML = "";


    const ordenados =
        [...colectores].sort(
            (a, b) =>
                a.device_id.localeCompare(
                    b.device_id
                )
        );


    ordenados.forEach(
        colector => {

            const estado =
                obtenerEstado(
                    colector.ultima_conexion
                );


            const item =
                document.createElement(
                    "div"
                );

            item.className =
                estado.online
                    ? "colectorItem online"
                    : "colectorItem offline";


            item.innerHTML = `

                <div class="colectorSerie">

                    <span>
                        ${estado.online ? "🟢" : "🔴"}
                    </span>

                    <strong>
                        ${colector.device_id}
                    </strong>

                </div>

                <div class="colectorInfo">
                    🔋 ${colector.bateria ?? "-"}%
                </div>

            `;


            item.addEventListener(
                "click",
                function () {

                    centrarColector(
                        colector.device_id
                    );
                }
            );


            lista.appendChild(
                item
            );
        }
    );
}


// ==========================================
// CENTRAR COLECTOR
// ==========================================

function centrarColector(
    serie
) {

    const marcador =
        marcadores[serie];

    if (!marcador) {
        return;
    }

    const posicion =
        marcador.getLatLng();

    mapa.flyTo(
        posicion,
        19,
        {
            animate: true,
            duration: 1.2
        }
    );

    marcador.openPopup();
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

        datosColectores =
            colectores;


        // Estadísticas
        actualizarEstadisticas(
            colectores
        );


        // Lista lateral
        actualizarLista(
            colectores
        );


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


                const estado =
                    obtenerEstado(
                        colector.ultima_conexion
                    );


                const ultimaConexion =
                    formatearUltimaConexion(
                        colector.ultima_conexion
                    );


                const texto = `

                    <div class="popupColector">

                        <div class="popupTitulo">
                            📱 ${colector.device_id}
                        </div>

                        <div class="popupFila">
                            <strong>Estado:</strong>
                            ${estado.texto}
                        </div>

                        <div class="popupFila">
                            <strong>Batería:</strong>
                            🔋 ${colector.bateria ?? "Sin datos"}%
                        </div>

                        <div class="popupFila">
                            <strong>Última conexión:</strong>
                            ${ultimaConexion}
                        </div>

                    </div>

                `;


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

                else {

                    marcadores[
                        colector.device_id
                    ] =
                        L.marker(
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
// BUSCAR COLECTOR
// ==========================================

function buscarColector() {

    const input =
        document.getElementById(
            "buscarColector"
        );

    const mensaje =
        document.getElementById(
            "mensajeBusqueda"
        );


    const busqueda =
        input.value
            .trim()
            .toUpperCase();


    if (!busqueda) {

        mensaje.textContent =
            "⚠️ Ingrese una serie";

        return;
    }


    const series =
        Object.keys(
            marcadores
        );


    let serieEncontrada =
        series.find(
            serie =>
                serie.toUpperCase() ===
                busqueda
        );


    if (!serieEncontrada) {

        const coincidencias =
            series.filter(
                serie =>
                    serie
                        .toUpperCase()
                        .includes(
                            busqueda
                        )
            );


        if (
            coincidencias.length === 1
        ) {

            serieEncontrada =
                coincidencias[0];

        }

        else if (
            coincidencias.length > 1
        ) {

            mensaje.textContent =
                `⚠️ Hay ${coincidencias.length} coincidencias`;

            return;
        }
    }


    if (!serieEncontrada) {

        mensaje.textContent =
            "❌ Colector no encontrado";

        return;
    }


    centrarColector(
        serieEncontrada
    );


    mensaje.textContent =
        `✅ ${serieEncontrada}`;
}


// ==========================================
// ENTER PARA BUSCAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const input =
            document.getElementById(
                "buscarColector"
            );

        if (input) {

            input.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter"
                    ) {

                        buscarColector();
                    }
                }
            );
        }
    }
);


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