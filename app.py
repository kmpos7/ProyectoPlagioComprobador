from flask import Flask, request, jsonify
import os, docx
from flask_cors import CORS

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nltk.corpus import stopwords

app = Flask(__name__)
CORS(app)
def read_docx(path):
    doc = docx.Document(path)
    return " ".join([para.text for para in doc.paragraphs])

@app.route('/compare', methods=['POST'])
def compare():
    print("Archivos recibidos:", request.files)
    if 'file' not in request.files:
        return jsonify({"error": "No se encontró un archivo con la clave 'file'"}), 400

    uploaded_file = request.files['file']
    print("Archivo subido:", uploaded_file.filename)

    if uploaded_file.filename == '':
        return jsonify({"error": "Archivo vacío"}), 400

    # Leer archivo del estudiante desde memoria
    doc = docx.Document(uploaded_file)
    student_text = " ".join([para.text for para in doc.paragraphs])

    # Carpeta de referencia
    reference_folder = "base_textos"
    texts = [student_text]
    names = ["Trabajo_subido"]

    for file in os.listdir(reference_folder):
        if file.endswith(".docx"):
            path = os.path.join(reference_folder, file)
            texts.append(read_docx(path))
            names.append(file)

    # Vectorizar y calcular similitud
    vectorizer = TfidfVectorizer(stop_words=stopwords.words("spanish"))
    tfidf_matrix = vectorizer.fit_transform(texts)

    resultados = []
    for i in range(1, len(names)):
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[i:i+1])[0][0]
        resultados.append({"archivo": names[i], "similitud": round(sim*100, 2)})

    return jsonify(resultados)

if __name__ == "__main__":
    app.run(debug=True)
