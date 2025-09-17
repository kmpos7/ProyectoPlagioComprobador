import os
import docx
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk

# Descargar stopwords de NLTK (solo la primera vez)
nltk.download("stopwords")
from nltk.corpus import stopwords

# Función para leer texto de un archivo .docx
def read_docx(file_path):
    doc = docx.Document(file_path)
    text = " ".join([para.text for para in doc.paragraphs])
    return text

# Documento a verificar (subido por un estudiante)
student_file = "doc_prueba.docx"
student_text = read_docx(student_file)

# Carpeta con trabajos de referencia (otros estudiantes, años pasados, etc.)
reference_folder = "base_textos"
texts = [student_text]
names = ["Trabajo_prueba"]

for file in os.listdir(reference_folder):
    if file.endswith(".docx"):
        path = os.path.join(reference_folder, file)
        texts.append(read_docx(path))
        names.append(file)

# Vectorizar con TF-IDF
vectorizer = TfidfVectorizer(stop_words=stopwords.words("spanish"))
tfidf_matrix = vectorizer.fit_transform(texts)

# Comparar el documento subido contra todos los de la base
for i in range(1, len(names)):
    sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[i:i+1])[0][0]
    print(f"Similitud con {names[i]}: {sim*100:.2f}%")
