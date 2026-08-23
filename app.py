from flask import Flask, request, jsonify, render_template
from datetime import datetime

app = Flask(__name__)

# ==========================================
# ALMACENAMIENTO TEMPORAL DE COLECTORES
# ==========================================

ubicaciones = {}


# ==========================================
# PÁGINA PRINCIPAL / ESTADO DEL SERVIDOR
# ==========================================

@app.route("/")
def inicio():
    return jsonify({
        "estado": "ok",
        "mensaje": "Servidor de rastreo de colectores funcionando"
    })


# ==========================================
# RECIBIR UBICACIÓN DEL COLECTOR
# ==========================================

@app.route("/api/ubicacion", methods=["POST"])
def recibir_ubicacion():

    datos = request.get_json()

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

    ubicaciones[device_id] = {
        "device_id": device_id,
        "latitud": latitud,
        "longitud": longitud,
        "bateria": bateria,
        "ultima_conexion": datetime.now().isoformat()
    }

    return jsonify({
        "estado": "ok",
        "mensaje": "Ubicacion recibida",
        "colector": ubicaciones[device_id]
    })


# ==========================================
# OBTENER TODOS LOS COLECTORES
# ==========================================

@app.route("/api/ubicaciones", methods=["GET"])
def ver_ubicaciones():

    return jsonify(
        list(ubicaciones.values())
    )


# ==========================================
# MAPA DE RASTREO
# ==========================================

@app.route("/mapa")
def mapa():

    return render_template("mapa.html")


# ==========================================
# EJECUTAR SERVIDOR
# ==========================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )