import { useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function App() {
  const [file, setFile] = useState(null);
  const [resultados, setResultados] = useState([]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Selecciona un archivo .docx");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/compare",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const ordenados = response.data.sort((a, b) => b.similitud - a.similitud);
      setResultados(ordenados);
    } catch (error) {
      console.error(error);
      alert("Error al enviar archivo");
    }
  };

  const getColor = (similitud) => {
    if (similitud >= 70) return "red";
    if (similitud >= 40) return "orange";
    return "green";
  };

  // 🔹 Descargar como CSV
  const descargarCSV = () => {
    const csv = Papa.unparse(resultados);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "reporte_plagio.csv");
  };

  const descargarPDF = () => {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleString();

    // Título
    doc.setFontSize(16);
    doc.text("Reporte de Plagio", 14, 20);

    // Subtítulo
    doc.setFontSize(10);
    doc.text(`Generado: ${fecha}`, 14, 28);

    // Tabla usando autoTable
    autoTable(doc, {
      startY: 35,
      head: [["Archivo", "Similitud (%)"]],
      body: resultados.map((r) => [r.archivo, r.similitud + "%"]),
    });

    doc.save("reporte_plagio.pdf");
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>📄 Detector de Plagio</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
        <input type="file" accept=".docx" onChange={handleFileChange} />
        <button type="submit" style={{ marginLeft: "1rem" }}>
          Analizar
        </button>
      </form>

      {resultados.length > 0 && (
        <div>
          <table
            border="1"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead style={{ backgroundColor: "#f4f4f4" }}>
              <tr>
                <th style={{ padding: "8px" }}>Archivo</th>
                <th style={{ padding: "8px" }}>Similitud (%)</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((r, index) => (
                <tr key={index}>
                  <td style={{ padding: "8px" }}>{r.archivo}</td>
                  <td
                    style={{
                      padding: "8px",
                      fontWeight: "bold",
                      color: getColor(r.similitud),
                    }}
                  >
                    {r.similitud}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Botones de descarga */}
          <div style={{ marginTop: "1rem" }}>
            <button onClick={descargarCSV} style={{ marginRight: "1rem" }}>
              Descargar CSV
            </button>
            <button onClick={descargarPDF}>Descargar PDF</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
