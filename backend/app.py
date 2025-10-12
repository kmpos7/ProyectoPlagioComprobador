from flask import Flask, request, jsonify
import os, docx, nltk
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize

# Inicializar Flask
app = Flask(__name__)
CORS(app)

# Descargar recursos de NLTK automáticamente
for pkg in ['punkt', 'punkt_tab', 'stopwords']:
    try:
        nltk.data.find(f'tokenizers/{pkg}')
    except LookupError:
        nltk.download(pkg)

# Función para leer texto desde un archivo .docx
def read_docx(path):
    doc = docx.Document(path)
    return " ".join([para.text for para in doc.paragraphs])

# 🔹 Función: comparar por oraciones (para detectar fragmentos de plagio)
def comparar_por_oraciones(texto_est, textos_ref, nombres_ref, umbral=0.4):
    oraciones_est = sent_tokenize(texto_est, language='spanish')
    fragmentos_sospechosos = []

    for oracion in oraciones_est:
        corpus = [oracion] + textos_ref
        vectorizer = TfidfVectorizer(stop_words=stopwords.words("spanish"))
        tfidf = vectorizer.fit_transform(corpus)
        sims = cosine_similarity(tfidf[0:1], tfidf[1:]).flatten()
        max_sim = sims.max()

        if max_sim >= umbral:
            ref_idx = sims.argmax()
            fragmentos_sospechosos.append({
                "oracion": oracion,
                "archivo": nombres_ref[ref_idx],
                "similitud": round(max_sim * 100, 2)
            })
    return fragmentos_sospechosos


@app.route('/compare', methods=['POST'])
def compare():
    print("Archivos recibidos:", request.files)
    if 'file' not in request.files:
        return jsonify({"error": "No se encontró un archivo con la clave 'file'"}), 400

    uploaded_file = request.files['file']
    print("Archivo subido:", uploaded_file.filename)

    if uploaded_file.filename == '':
        return jsonify({"error": "Archivo vacío"}), 400

    # Leer archivo subido desde memoria
    doc_est = docx.Document(uploaded_file)
    student_text = " ".join([para.text for para in doc_est.paragraphs])

    # Carpeta con archivos de referencia
    reference_folder = "base_textos"
    textos_ref = []
    nombres_ref = []

    for file in os.listdir(reference_folder):
        if file.endswith(".docx"):
            path = os.path.join(reference_folder, file)
            textos_ref.append(read_docx(path))
            nombres_ref.append(file)

    # 🔹 Similitud global (comparación general)
    textos = [student_text] + textos_ref
    vectorizer = TfidfVectorizer(stop_words=stopwords.words("spanish"))
    tfidf_matrix = vectorizer.fit_transform(textos)

    resumen = []
    for i, nombre in enumerate(nombres_ref):
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[i + 1:i + 2])[0][0]
        resumen.append({
            "archivo": nombre,
            "similitud": round(sim * 100, 2)
        })

    # 🔹 Fragmentos sospechosos (por oraciones)
    fragmentos = comparar_por_oraciones(student_text, textos_ref, nombres_ref, umbral=0.4)

    # Ordenar resultados
    resumen.sort(key=lambda x: x["similitud"], reverse=True)
    fragmentos.sort(key=lambda x: x["similitud"], reverse=True)

    # 🔹 Respuesta final con texto incluido
    return jsonify({
        "resumen": resumen,
        "fragmentos": fragmentos,
        "texto": student_text
    })

@app.route('/upload-base', methods=['POST'])
def upload_base():
    if 'files' not in request.files:
        return jsonify({"error": "No se encontraron archivos"}), 400

    files = request.files.getlist('files')
    saved_files = []

    for file in files:
        if file.filename.endswith('.docx'):
            path = os.path.join('base_textos', file.filename)
            file.save(path)
            saved_files.append(file.filename)

    return jsonify({
        "mensaje": f"{len(saved_files)} archivo(s) guardado(s) correctamente",
        "archivos": saved_files
    })

@app.route('/listar-base', methods=['GET'])
def listar_base():
    archivos = [
        f for f in os.listdir('base_textos') if f.endswith('.docx')
    ]
    return jsonify({"archivos": archivos})

@app.route('/limpiar-base', methods=['POST'])
def limpiar_base():
    folder = 'base_textos'
    if os.path.exists(folder):
        for file in os.listdir(folder):
            file_path = os.path.join(folder, file)
            if os.path.isfile(file_path):
                os.remove(file_path)
    return jsonify({"mensaje": "Carpeta base_textos vaciada correctamente"})


if __name__ == "__main__":
    app.run(debug=True)
