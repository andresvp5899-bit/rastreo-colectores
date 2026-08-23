from flask import Flask, request, jsonify, render_template
from datetime import datetime, timezone
import sqlite3


app = Flask(__name__)

DB = "rastreo.db"


# ==========================================
# CONEXIÓN BASE DE DATOS
# ==========================================

def conectar_db():

    conexion = sqlite3.connect(DB)

    conexion.row_factory = sqlite3.Row

    return conexion


# ==========================================
# CREAR / ACTUALIZAR BASE DE DATOS
# ==========================================

def crear_base_datos():

    conexion = conectar_db()
    cursor = conexion.cursor()


    # ======================================
    # UBICACIÓN ACTUAL
    # ======================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ubicaciones (

            device_id TEXT PRIMARY KEY,

            latitud REAL NOT NULL,

            longitud REAL NOT NULL,

            bateria INTEGER,

            ultima_conexion TEXT NOT NULL

        )
    """)


    # ======================================
    # REGISTRO DE COLECTORES
    # ======================================

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS colectores (

            device_id TEXT PRIMARY KEY,

            serie TEXT UNIQUE NOT NULL,

            activo INTEGER NOT NULL DEFAULT 1,

            fecha_registro TEXT NOT NULL

        )
    """)


    # ======================================
    # MIGRAR COLECTORES QUE YA EXISTÍAN
    # ======================================

    cursor.execute("""
        SELECT device_id
        FROM ubicaciones
    """)

    existentes = cursor.fetchall()


    for fila in existentes:

        device_id = fila["device_id"]

        cursor.execute("""
            INSERT OR IGNORE INTO colectores (

                device_id,
                serie,
                activo,
                fecha_registro

            )

            VALUES (?, ?, 1, ?)

        """, (

            device_id,
            device_id,

            datetime.now(
                timezone.utc
            ).isoformat()

        ))


    conexion.commit()
    conexion.close()


crear_base_datos()


# ==========================================
# PÁGINA PRINCIPAL
# ==========================================

@app.route("/")
def inicio():

    return jsonify({

        "estado": "ok",

        "mensaje":
            "Servidor de rastreo de colectores funcionando"

    })


# ==========================================
# RECIBIR UBICACIÓN DESDE APK
# ==========================================

@app.route(
    "/api/ubicacion",
    methods=["POST"]
)
def recibir_ubicacion():

    datos = request.get_json(
        silent=True
    )


    if not datos:

        return jsonify({

            "error":
                "No se recibieron datos"

        }), 400


    device_id = datos.get(
        "device_id"
    )

    latitud = datos.get(
        "latitud"
    )

    longitud = datos.get(
        "longitud"
    )

    bateria = datos.get(
        "bateria"
    )


    if not device_id:

        return jsonify({

            "error":
                "Falta device_id"

        }), 400


    if (
        latitud is None or
        longitud is None
    ):

        return jsonify({

            "error":
                "Falta latitud o longitud"

        }), 400


    device_id = str(
        device_id
    ).strip()


    ultima_conexion = datetime.now(
        timezone.utc
    ).isoformat()


    conexion = conectar_db()
    cursor = conexion.cursor()


    # ======================================
    # REGISTRAR COLECTOR SI ES NUEVO
    # ======================================

    cursor.execute("""
        INSERT OR IGNORE INTO colectores (

            device_id,
            serie,
            activo,
            fecha_registro

        )

        VALUES (?, ?, 1, ?)

    """, (

        device_id,
        device_id,
        ultima_conexion

    ))


    # ======================================
    # GUARDAR UBICACIÓN ACTUAL
    # ======================================

    cursor.execute("""
        INSERT INTO ubicaciones (

            device_id,
            latitud,
            longitud,
            bateria,
            ultima_conexion

        )

        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(device_id)

        DO UPDATE SET

            latitud =
                excluded.latitud,

            longitud =
                excluded.longitud,

            bateria =
                excluded.bateria,

            ultima_conexion =
                excluded.ultima_conexion

    """, (

        device_id,
        latitud,
        longitud,
        bateria,
        ultima_conexion

    ))


    conexion.commit()
    conexion.close()


    return jsonify({

        "estado":
            "ok",

        "mensaje":
            "Ubicacion recibida",

        "device_id":
            device_id

    })


# ==========================================
# OBTENER COLECTORES ACTIVOS
# ==========================================

@app.route(
    "/api/ubicaciones",
    methods=["GET"]
)
def ver_ubicaciones():

    conexion = conectar_db()
    cursor = conexion.cursor()


    cursor.execute("""
        SELECT

            u.device_id,

            c.serie,

            u.latitud,

            u.longitud,

            u.bateria,

            u.ultima_conexion

        FROM ubicaciones u

        INNER JOIN colectores c

            ON c.device_id =
               u.device_id

        WHERE c.activo = 1

        ORDER BY c.serie
    """)


    filas = cursor.fetchall()
    conexion.close()


    colectores = []


    for fila in filas:

        colectores.append({

            "device_id":
                fila["device_id"],

            "serie":
                fila["serie"],

            "latitud":
                fila["latitud"],

            "longitud":
                fila["longitud"],

            "bateria":
                fila["bateria"],

            "ultima_conexion":
                fila["ultima_conexion"]

        })


    return jsonify(
        colectores
    )


# ==========================================
# OBTENER TODOS LOS COLECTORES REGISTRADOS
# ==========================================

@app.route(
    "/api/colectores",
    methods=["GET"]
)
def obtener_colectores():

    conexion = conectar_db()
    cursor = conexion.cursor()


    cursor.execute("""
        SELECT

            c.device_id,

            c.serie,

            c.activo,

            c.fecha_registro,

            u.latitud,

            u.longitud,

            u.bateria,

            u.ultima_conexion

        FROM colectores c

        LEFT JOIN ubicaciones u

            ON u.device_id =
               c.device_id

        ORDER BY c.serie
    """)


    filas = cursor.fetchall()
    conexion.close()


    resultado = []


    for fila in filas:

        resultado.append({

            "device_id":
                fila["device_id"],

            "serie":
                fila["serie"],

            "activo":
                bool(fila["activo"]),

            "fecha_registro":
                fila["fecha_registro"],

            "latitud":
                fila["latitud"],

            "longitud":
                fila["longitud"],

            "bateria":
                fila["bateria"],

            "ultima_conexion":
                fila["ultima_conexion"]

        })


    return jsonify(
        resultado
    )


# ==========================================
# EDITAR SERIE
# ==========================================

@app.route(
    "/api/colectores/<device_id>",
    methods=["PUT"]
)
def editar_colector(device_id):

    datos = request.get_json(
        silent=True
    )


    if not datos:

        return jsonify({

            "error":
                "No se recibieron datos"

        }), 400


    nueva_serie = datos.get(
        "serie"
    )


    if not nueva_serie:

        return jsonify({

            "error":
                "Falta la nueva serie"

        }), 400


    nueva_serie = str(
        nueva_serie
    ).strip()


    conexion = conectar_db()
    cursor = conexion.cursor()


    # ======================================
    # VERIFICAR COLECTOR
    # ======================================

    cursor.execute("""
        SELECT device_id

        FROM colectores

        WHERE device_id = ?
    """, (

        device_id,

    ))


    colector = cursor.fetchone()


    if not colector:

        conexion.close()

        return jsonify({

            "error":
                "Colector no encontrado"

        }), 404


    # ======================================
    # VERIFICAR SERIE DUPLICADA
    # ======================================

    cursor.execute("""
        SELECT device_id

        FROM colectores

        WHERE serie = ?

        AND device_id != ?
    """, (

        nueva_serie,
        device_id

    ))


    duplicado = cursor.fetchone()


    if duplicado:

        conexion.close()

        return jsonify({

            "error":
                "Ya existe un colector con esa serie"

        }), 409


    # ======================================
    # ACTUALIZAR
    # ======================================

    cursor.execute("""
        UPDATE colectores

        SET serie = ?

        WHERE device_id = ?
    """, (

        nueva_serie,
        device_id

    ))


    conexion.commit()
    conexion.close()


    return jsonify({

        "estado":
            "ok",

        "mensaje":
            "Serie actualizada",

        "device_id":
            device_id,

        "serie":
            nueva_serie

    })


# ==========================================
# DESACTIVAR / ELIMINAR COLECTOR
# ==========================================

@app.route(
    "/api/colectores/<device_id>",
    methods=["DELETE"]
)
def eliminar_colector(device_id):

    conexion = conectar_db()
    cursor = conexion.cursor()


    cursor.execute("""
        UPDATE colectores

        SET activo = 0

        WHERE device_id = ?
    """, (

        device_id,

    ))


    if cursor.rowcount == 0:

        conexion.close()

        return jsonify({

            "error":
                "Colector no encontrado"

        }), 404


    conexion.commit()
    conexion.close()


    return jsonify({

        "estado":
            "ok",

        "mensaje":
            "Colector desactivado correctamente"

    })


# ==========================================
# REACTIVAR COLECTOR
# ==========================================

@app.route(
    "/api/colectores/<device_id>/activar",
    methods=["PUT"]
)
def activar_colector(device_id):

    conexion = conectar_db()
    cursor = conexion.cursor()


    cursor.execute("""
        UPDATE colectores

        SET activo = 1

        WHERE device_id = ?
    """, (

        device_id,

    ))


    if cursor.rowcount == 0:

        conexion.close()

        return jsonify({

            "error":
                "Colector no encontrado"

        }), 404


    conexion.commit()
    conexion.close()


    return jsonify({

        "estado":
            "ok",

        "mensaje":
            "Colector activado correctamente"

    })


# ==========================================
# OBTENER COLECTORES ELIMINADOS
# ==========================================

@app.route(
    "/api/colectores/eliminados",
    methods=["GET"]
)
def colectores_eliminados():

    conexion = conectar_db()
    cursor = conexion.cursor()


    cursor.execute("""
        SELECT

            c.device_id,

            c.serie,

            c.fecha_registro,

            u.latitud,

            u.longitud,

            u.bateria,

            u.ultima_conexion

        FROM colectores c

        LEFT JOIN ubicaciones u

            ON u.device_id =
               c.device_id

        WHERE c.activo = 0

        ORDER BY c.serie
    """)


    filas = cursor.fetchall()
    conexion.close()


    resultado = []


    for fila in filas:

        resultado.append({

            "device_id":
                fila["device_id"],

            "serie":
                fila["serie"],

            "fecha_registro":
                fila["fecha_registro"],

            "latitud":
                fila["latitud"],

            "longitud":
                fila["longitud"],

            "bateria":
                fila["bateria"],

            "ultima_conexion":
                fila["ultima_conexion"]

        })


    return jsonify(
        resultado
    )


# ==========================================
# PÁGINA DE COLECTORES ELIMINADOS
# ==========================================

@app.route(
    "/colectores/eliminados"
)
def pagina_colectores_eliminados():

    return render_template(
        "eliminados.html"
    )


# ==========================================
# MAPA
# ==========================================

@app.route("/mapa")
def mapa():

    return render_template(
        "mapa.html"
    )


# ==========================================
# EJECUTAR LOCALMENTE
# ==========================================

if __name__ == "__main__":

    app.run(

        host="0.0.0.0",

        port=5000,

        debug=True

    )