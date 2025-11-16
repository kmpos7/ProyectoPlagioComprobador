from flask import Flask, request, jsonify
import os, docx, nltk, shutil
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize

# Inicializar Flask
app = Flask(__name__)
CORS(app)

# Asegurar carpeta temporal
BASE_FOLDER = "base_textos"
os.makedirs(BASE_FOLDER, exist_ok=True)

# Limpiar carpeta base_textos al iniciar (archivos temporales)
for f in os.listdir(BASE_FOLDER):
    os.remove(os.path.join(BASE_FOLDER, f))

# Descargar recursos NLTK
for pkg in ["punkt", "punkt_tab", "stopwords"]:
    try:
        nltk.data.find(f"tokenizers/{pkg}")
    except LookupError:
        nltk.download(pkg)


# Función para leer texto desde archivo .docx
def read_docx(path):
    doc = docx.Document(path)
    return " ".join([para.text for para in doc.paragraphs])


# 🔹 Función: comparar por oraciones con matriz global
def comparar_por_oraciones(texto_est, nombres_ref, vectorizer_global, tfidf_ref, umbral=0.4):
    oraciones_est = sent_tokenize(texto_est, language="spanish")
    fragmentos_sospechosos = []

    for oracion in oraciones_est:
        tfidf_oracion = vectorizer_global.transform([oracion])
        sims = cosine_similarity(tfidf_oracion, tfidf_ref).flatten()
        max_sim = sims.max()

        if max_sim >= umbral:
            ref_idx = sims.argmax()
            fragmentos_sospechosos.append({
                "oracion": oracion,
                "archivo": nombres_ref[ref_idx],
                "similitud": round(max_sim * 100, 2)
            })

    return fragmentos_sospechosos


@app.route("/compare", methods=["POST"])
def compare():
    import time
    inicio = time.time()   # ⏳ INICIO DEL TIEMPO

    if "file" not in request.files:
        return jsonify({"error": "No se encontró un archivo con la clave 'file'"}), 400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":
        return jsonify({"error": "Archivo vacío"}), 400

    # Leer archivo subido desde memoria
    doc_est = docx.Document(uploaded_file)
    student_text = " ".join([para.text for para in doc_est.paragraphs])

    # Cargar archivos de referencia
    textos_ref, nombres_ref = [], []
    for file in os.listdir(BASE_FOLDER):
        if file.endswith(".docx"):
            path = os.path.join(BASE_FOLDER, file)
            textos_ref.append(read_docx(path))
            nombres_ref.append(file)

    if not textos_ref:
        return jsonify({"error": "No hay archivos base para comparar"}), 400

    # TF-IDF global
    vectorizer = TfidfVectorizer(stop_words=stopwords.words("spanish"))
    tfidf_matrix = vectorizer.fit_transform([student_text] + textos_ref)
    tfidf_ref = tfidf_matrix[1:]

    # Similitud global por archivo
    resumen = []
    similitudes = []

    for i, nombre in enumerate(nombres_ref):
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_ref[i:i + 1])[0][0]
        porcentaje = round(sim * 100, 2)
        similitudes.append(porcentaje)

        resumen.append({
            "archivo": nombre,
            "similitud": porcentaje
        })

    # ORDENAR
    resumen.sort(key=lambda x: x["similitud"], reverse=True)

    # Calcular plagio global: promedio de similitudes
    if len(similitudes) > 0:
        plagio_global = round(sum(similitudes) / len(similitudes), 2)
    else:
        plagio_global = 0

    # Fragmentos sospechosos
    fragmentos = comparar_por_oraciones(student_text, nombres_ref, vectorizer, tfidf_ref, umbral=0.4)
    fragmentos.sort(key=lambda x: x["similitud"], reverse=True)

    # Tiempo final
    tiempo_total = round(time.time() - inicio, 3)

    return jsonify({
        "resumen": resumen,
        "fragmentos": fragmentos,
        "texto": student_text,
        "plagio_global": plagio_global,
        "tiempo": tiempo_total
    })




@app.route("/upload-base", methods=["POST"])
def upload_base():
    if "files" not in request.files:
        return jsonify({"error": "No se encontraron archivos"}), 400

    files = request.files.getlist("files")
    saved_files = []

    for file in files:
        if file.filename.endswith(".docx"):
            path = os.path.join(BASE_FOLDER, file.filename)
            file.save(path)
            saved_files.append(file.filename)

    return jsonify({
        "mensaje": f"{len(saved_files)} archivo(s) guardado(s) correctamente (temporal)",
        "archivos": saved_files
    })


@app.route("/listar-base", methods=["GET"])
def listar_base():
    archivos = [f for f in os.listdir(BASE_FOLDER) if f.endswith(".docx")]
    return jsonify({"archivos": archivos})


@app.route("/reset-base", methods=["POST"])
def reset_base():
    """Elimina todos los archivos de la base temporal"""
    for archivo in os.listdir(BASE_FOLDER):
        ruta = os.path.join(BASE_FOLDER, archivo)
        if os.path.isfile(ruta):
            os.remove(ruta)
    return jsonify({"mensaje": "Base temporal reiniciada correctamente"})


@app.route('/eliminar-base', methods=['POST'])
def eliminar_base():
    data = request.get_json()
    nombre = data.get('nombre')

    if not nombre:
        return jsonify({"error": "No se proporcionó un nombre de archivo"}), 400

    path = os.path.join('base_textos', nombre)
    if os.path.exists(path):
        os.remove(path)
        return jsonify({"mensaje": f"Archivo '{nombre}' eliminado correctamente"})
    else:
        return jsonify({"error": "Archivo no encontrado"}), 404


if __name__ == "__main__":
    app.run(debug=True)
