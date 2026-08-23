from flask import Flask, request, jsonify, render_template
from datetime import datetime, timezone
import sqlite3

app = Flask(__name__)

DB = "rastreo.db"


# ==========================================
# CREAR BASE DE DATOS
# ==========================================

def crear_base_datos():

    conexion = sqlite3.connect(DB)

    cursor = conexion.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ubicaciones (
            device_id TEXT PRIMARY KEY,
            latitud REAL NOT NULL,
            longitud REAL NOT NULL,
            bateria INTEGER,
            ultima_conexion TEXT NOT NULL
        )
    """)

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
        "mensaje": "Servidor de rastreo de colectores funcionando"
    })


# ==========================================
# RECIBIR UBICACIÓN
# ==========================================

@app.route("/api/ubicacion", methods=["POST"])
def recibir_ubicacion():

    datos = request.get_json(silent=True)

    if not datos:

        return jsonify({
            "error": "No se recibieron datos"
        }), 400


    device_id = datos.get("device_id")
    latitud = datos.get("latitud")
    longitud = datos.get("longitud")
    bateria = datos.get("bateria")


    if not device_id:

        return jsonify({
            "error": "Falta device_id"
        }), 400


    if latitud is None or longitud is None:

        return jsonify({
            "error": "Falta latitud o longitud"
        }), 400


    # Hora UTC con zona horaria explícita
    ultima_conexion = datetime.now(
        timezone.utc
    ).isoformat()


    conexion = sqlite3.connect(DB)

    cursor = conexion.cursor()


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

            latitud = excluded.latitud,
            longitud = excluded.longitud,
            bateria = excluded.bateria,
            ultima_conexion = excluded.ultima_conexion

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

        "estado": "ok",

        "mensaje": "Ubicacion recibida",

        "colector": {

            "device_id": device_id,
            "latitud": latitud,
            "longitud": longitud,
            "bateria": bateria,
            "ultima_conexion": ultima_conexion
        }

    })


# ==========================================
# OBTENER TODOS LOS COLECTORES
# ==========================================

@app.route("/api/ubicaciones", methods=["GET"])
def ver_ubicaciones():

    conexion = sqlite3.connect(DB)

    conexion.row_factory = sqlite3.Row

    cursor = conexion.cursor()


    cursor.execute("""
        SELECT
            device_id,
            latitud,
            longitud,
            bateria,
            ultima_conexion
        FROM ubicaciones
        ORDER BY device_id
    """)


    filas = cursor.fetchall()

    conexion.close()


    colectores = []

    for fila in filas:

        colectores.append({

            "device_id":
                fila["device_id"],

            "latitud":
                fila["latitud"],

            "longitud":
                fila["longitud"],

            "bateria":
                fila["bateria"],

            "ultima_conexion":
                fila["ultima_conexion"]

        })


    return jsonify(colectores)


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