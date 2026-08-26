// ==========================================
// CREAR MAPA
// ==========================================

const mapa = L.map("map", {
    zoomControl: true
}).setView(
    [-25.2867, -57.3333],
    13
);


// ==========================================
// CAPA MAPA NORMAL
// ==========================================

const capaNormal = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }
);


// ==========================================
// CAPA SATELITAL
// ==========================================

const capaSatelite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        maxZoom: 19,
        attribution: "Esri World Imagery"
    }
);


// ==========================================
// MAPA INICIAL
// ==========================================

capaNormal.addTo(mapa);


// ==========================================
// CAMBIAR MAPA / SATÉLITE
// ==========================================

function cambiarMapa(tipo) {

    const botonMapa =
        document.getElementById("botonMapa");

    const botonSatelite =
        document.getElementById("botonSatelite");


    if (tipo === "satelite") {

        if (mapa.hasLayer(capaNormal)) {
            mapa.removeLayer(capaNormal);
        }

        if (!mapa.hasLayer(capaSatelite)) {
            capaSatelite.addTo(mapa);
        }

        botonMapa?.classList.remove("activo");
        botonSatelite?.classList.add("activo");

    } else {

        if (mapa.hasLayer(capaSatelite)) {
            mapa.removeLayer(capaSatelite);
        }

        if (!mapa.hasLayer(capaNormal)) {
            capaNormal.addTo(mapa);
        }

        botonSatelite?.classList.remove("activo");
        botonMapa?.classList.add("activo");
    }
}


// ==========================================
// MARCADORES
// ==========================================

const marcadores = {};

let datosColectores = [];


// ==========================================
// ESCAPAR TEXTO
// ==========================================

function escapar(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto ?? "";

    return div.innerHTML;
}


// ==========================================
// ESTADO DEL COLECTOR
// ==========================================

function obtenerEstado(
    ultimaConexion
) {

    if (!ultimaConexion) {

        return {
            texto: "🔴 DESCONECTADO",
            online: false
        };
    }


    let fechaTexto =
        ultimaConexion;


    if (
        !fechaTexto.endsWith("Z") &&
        !fechaTexto.includes("+")
    ) {

        fechaTexto += "Z";
    }


    const fechaUltimaConexion =
        new Date(fechaTexto);


    if (
        isNaN(
            fechaUltimaConexion.getTime()
        )
    ) {

        return {
            texto: "🔴 DESCONECTADO",
            online: false
        };
    }


    const ahora =
        new Date();


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
// FORMATEAR ÚLTIMA CONEXIÓN
// ==========================================

function formatearUltimaConexion(
    ultimaConexion
) {

    if (!ultimaConexion) {
        return "Sin datos";
    }


    let fechaTexto =
        ultimaConexion;


    if (
        !fechaTexto.endsWith("Z") &&
        !fechaTexto.includes("+")
    ) {

        fechaTexto += "Z";
    }


    const fecha =
        new Date(fechaTexto);


    if (
        isNaN(
            fecha.getTime()
        )
    ) {

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
// CENTRAR COLECTOR
// ==========================================

function centrarColector(
    deviceId
) {

    const marcador =
        marcadores[
            deviceId
        ];


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
// EDITAR SERIE
// ==========================================

async function editarSerie(
    deviceId,
    serieActual
) {

    const nuevaSerie =
        prompt(
            "Ingrese la nueva serie del colector:",
            serieActual
        );


    if (
        nuevaSerie === null
    ) {
        return;
    }


    const serieLimpia =
        nuevaSerie.trim();


    if (!serieLimpia) {

        alert(
            "❌ La serie no puede quedar vacía."
        );

        return;
    }


    if (
        serieLimpia ===
        serieActual
    ) {

        return;
    }


    try {

        const respuesta =
            await fetch(
                "/api/colectores/" +
                encodeURIComponent(
                    deviceId
                ),
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        serie:
                            serieLimpia
                    })
                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            alert(
                "❌ " +
                (
                    resultado.error ||
                    "No se pudo editar la serie"
                )
            );

            return;
        }


        alert(
            "✅ Serie actualizada correctamente."
        );


        await actualizarColectores();

    }

    catch (error) {

        console.error(
            "Error editando serie:",
            error
        );


        alert(
            "❌ Error de conexión con el servidor."
        );
    }
}


// ==========================================
// ELIMINAR COLECTOR
// ==========================================

async function eliminarColector(
    deviceId,
    serie
) {

    const confirmar =
        confirm(
            "¿Seguro que desea eliminar el colector?\n\n" +
            "Serie: " +
            serie +
            "\n\n" +
            "Podrá restaurarlo después desde Colectores eliminados."
        );


    if (!confirmar) {
        return;
    }


    try {

        const respuesta =
            await fetch(
                "/api/colectores/" +
                encodeURIComponent(
                    deviceId
                ),
                {
                    method: "DELETE"
                }
            );


        const resultado =
            await respuesta.json();


        if (!respuesta.ok) {

            alert(
                "❌ " +
                (
                    resultado.error ||
                    "No se pudo eliminar"
                )
            );

            return;
        }


        // Quitar marcador del mapa
        if (
            marcadores[
                deviceId
            ]
        ) {

            mapa.removeLayer(
                marcadores[
                    deviceId
                ]
            );

            delete marcadores[
                deviceId
            ];
        }


        alert(
            "✅ Colector enviado a Eliminados."
        );


        await actualizarColectores();

    }

    catch (error) {

        console.error(
            "Error eliminando colector:",
            error
        );


        alert(
            "❌ Error de conexión con el servidor."
        );
    }
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
                (
                    a.serie ||
                    a.device_id
                ).localeCompare(
                    b.serie ||
                    b.device_id
                )
        );


    ordenados.forEach(
        colector => {

            const estado =
                obtenerEstado(
                    colector.ultima_conexion
                );


            const serie =
                colector.serie ||
                colector.device_id;


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
                        ${
                            estado.online
                                ? "🟢"
                                : "🔴"
                        }
                    </span>

                    <strong>
                        ${escapar(serie)}
                    </strong>

                </div>


                <div class="colectorInfo">

                    🔋 ${
                        colector.bateria ??
                        "-"
                    }%

                </div>


                <div class="accionesColector">

                    <button
                        class="botonEditar"
                        type="button"
                    >
                        ✏️ Editar
                    </button>


                    <button
                        class="botonEliminar"
                        type="button"
                    >
                        🗑️ Eliminar
                    </button>

                </div>

            `;


            // ==================================
            // CLIC EN EL COLECTOR
            // ==================================

            item.addEventListener(
                "click",
                function () {

                    centrarColector(
                        colector.device_id
                    );
                }
            );


            // ==================================
            // BOTÓN EDITAR
            // ==================================

            const botonEditar =
                item.querySelector(
                    ".botonEditar"
                );


            botonEditar.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();


                    editarSerie(
                        colector.device_id,
                        serie
                    );
                }
            );


            // ==================================
            // BOTÓN ELIMINAR
            // ==================================

            const botonEliminar =
                item.querySelector(
                    ".botonEliminar"
                );


            botonEliminar.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();


                    eliminarColector(
                        colector.device_id,
                        serie
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
// ELIMINAR MARCADORES QUE YA NO ESTÁN ACTIVOS
// ==========================================

function limpiarMarcadores(
    colectores
) {

    const idsActivos =
        new Set(
            colectores.map(
                colector =>
                    colector.device_id
            )
        );


    Object.keys(
        marcadores
    ).forEach(
        deviceId => {

            if (
                !idsActivos.has(
                    deviceId
                )
            ) {

                mapa.removeLayer(
                    marcadores[
                        deviceId
                    ]
                );


                delete marcadores[
                    deviceId
                ];
            }
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
                    cache:
                        "no-store"
                }
            );


        if (
            !respuesta.ok
        ) {

            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }


        const colectores =
            await respuesta.json();


        datosColectores =
            colectores;


        // ==================================
        // LIMPIAR MARCADORES DESACTIVADOS
        // ==================================

        limpiarMarcadores(
            colectores
        );


        // ==================================
        // ESTADÍSTICAS
        // ==================================

        actualizarEstadisticas(
            colectores
        );


        // ==================================
        // LISTA
        // ==================================

        actualizarLista(
            colectores
        );


        // ==================================
        // MARCADORES
        // ==================================

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


                const serie =
                    colector.serie ||
                    colector.device_id;


                const texto = `

                    <div class="popupColector">

                        <div class="popupTitulo">

                            📱
                            ${escapar(serie)}

                        </div>


                        <div class="popupFila">

                            <strong>
                                Estado:
                            </strong>

                            ${estado.texto}

                        </div>


                        <div class="popupFila">

                            <strong>
                                Batería:
                            </strong>

                            🔋 ${
                                colector.bateria ??
                                "Sin datos"
                            }%

                        </div>


                        <div class="popupFila">

                            <strong>
                                Última conexión:
                            </strong>

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
                        .addTo(
                            mapa
                        )
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
// BUSCAR COLECTOR POR SERIE
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


    // ======================================
    // COINCIDENCIA EXACTA
    // ======================================

    let colectorEncontrado =
        datosColectores.find(
            colector =>

                (
                    colector.serie ||
                    colector.device_id
                )
                .toUpperCase() ===
                busqueda
        );


    // ======================================
    // COINCIDENCIA PARCIAL
    // ======================================

    if (
        !colectorEncontrado
    ) {

        const coincidencias =
            datosColectores.filter(
                colector =>

                    (
                        colector.serie ||
                        colector.device_id
                    )
                    .toUpperCase()
                    .includes(
                        busqueda
                    )
            );


        if (
            coincidencias.length ===
            1
        ) {

            colectorEncontrado =
                coincidencias[0];

        }

        else if (
            coincidencias.length >
            1
        ) {

            mensaje.textContent =
                `⚠️ Hay ${coincidencias.length} coincidencias`;

            return;
        }
    }


    // ======================================
    // NO ENCONTRADO
    // ======================================

    if (
        !colectorEncontrado
    ) {

        mensaje.textContent =
            "❌ Colector no encontrado";

        return;
    }


    const serie =
        colectorEncontrado.serie ||
        colectorEncontrado.device_id;


    centrarColector(
        colectorEncontrado.device_id
    );


    mensaje.textContent =
        `✅ ${serie}`;
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
                        event.key ===
                        "Enter"
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