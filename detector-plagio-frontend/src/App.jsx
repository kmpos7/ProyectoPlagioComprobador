import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function App() {
  const [file, setFile] = useState(null);
  const [resumen, setResumen] = useState([]);
  const [fragmentos, setFragmentos] = useState([]);
  const [textoAnalizado, setTextoAnalizado] = useState("");
  const [archivosBase, setArchivosBase] = useState([]);
  const [baseCargada, setBaseCargada] = useState(false);
  const [cargando, setCargando] = useState(false);

  const [tiempoAnalisis, setTiempoAnalisis] = useState(null);
  const [plagioGlobal, setPlagioGlobal] = useState(null);

  const API_BASE = "https://proyectoplagiocomprobador-backend.onrender.com";

  const truncarNombre = (nombre, max = 30) => {
    if (!nombre) return "";
    return nombre.length > max ? nombre.slice(0, max) + "..." : nombre;
  };

  const cargarArchivosBase = async () => {
    try {
      const res = await axios.get(`${API_BASE}/listar-base`);
      setArchivosBase(res.data.archivos);
      setBaseCargada(res.data.archivos.length > 0);
    } catch (err) {
      console.error("Error al listar base:", err);
    }
  };

  useEffect(() => {
    const limpiarYRecargar = async () => {
      try {
        await axios.post(`${API_BASE}/reset-base`);
      } catch (err) {
        console.error("Error al reiniciar la base:", err);
      } finally {
        await cargarArchivosBase();
      }
    };
    limpiarYRecargar();
  }, []);

  const handleBaseUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    const formData = new FormData();
    for (let f of files) formData.append("files", f);

    try {
      const res = await axios.post(`${API_BASE}/upload-base`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(res.data.mensaje);
      cargarArchivosBase();
    } catch (err) {
      console.error(err);
      alert("Error al subir la base de archivos.");
    }
  };

  const eliminarArchivoBase = async (nombre) => {
    if (!window.confirm(`¿Eliminar el archivo "${nombre}" de la base?"`))
      return;

    try {
      const res = await axios.post(`${API_BASE}/eliminar-base`, { nombre });
      alert(res.data.mensaje);
      cargarArchivosBase();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el archivo.");
    }
  };

  const limpiarBaseManualmente = async () => {
    if (!window.confirm("¿Seguro que deseas limpiar toda la base?")) return;
    try {
      const res = await axios.post(`${API_BASE}/reset-base`);
      alert(res.data.mensaje);
      cargarArchivosBase();
    } catch (err) {
      console.error(err);
      alert("Error al limpiar la base.");
    }
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Selecciona un documento para analizar.");
      return;
    }

    setCargando(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_BASE}/compare`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResumen(res.data.resumen);
      setFragmentos(res.data.fragmentos);
      setTextoAnalizado(res.data.texto);

      // NUEVO
      setTiempoAnalisis(res.data.tiempo);
      setPlagioGlobal(res.data.plagio_global);
    } catch (err) {
      console.error(err);
      alert("Error al analizar el documento.");
    } finally {
      setCargando(false);
    }
  };

  const generarPDF = async () => {
    const doc = new jsPDF("p", "mm", "a4");
    const contenedor = document.getElementById("resultados");

    const canvas = await html2canvas(contenedor);
    const imgData = canvas.toDataURL("image/png");

    const imgWidth = 190;
    const pageHeight = 280;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10;

    doc.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    doc.save("reporte_comparacion.pdf");
  };

  const handleReset = () => {
    setFile(null);
    setResumen([]);
    setFragmentos([]);
    setTextoAnalizado("");
    setTiempoAnalisis(null);
    setPlagioGlobal(null);
  };

  return (
    <div
      style={{
        fontFamily: "'Poppins', sans-serif",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc, #eef2f7)",
        color: "#1f2937",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "3rem 1rem",
      }}
    >
      <h1
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: "2.2rem",
          fontWeight: 700,
          color: "#1e40af",
          marginBottom: "1rem",
        }}
      >
        Analizador de Similitud de Documentos v.1
      </h1>
      <p
        style={{ maxWidth: "600px", textAlign: "center", marginBottom: "2rem" }}
      >
        Sube una base de documentos para comparar y luego analiza un nuevo
        archivo para detectar similitudes y fragmentos coincidentes.
      </p>

      {/* Panel de base */}
      <div
        style={{
          background: "#fff",
          padding: "1.5rem",
          borderRadius: "1rem",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          marginBottom: "2rem",
          width: "100%",
          maxWidth: "600px",
        }}
      >
        <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>
          <i className="fas fa-database"></i> Base de documentos
        </h3>

        <input
          type="file"
          accept=".docx"
          multiple
          onChange={handleBaseUpload}
        />

        {baseCargada && (
          <>
            <ul
              style={{
                marginTop: "1rem",
                fontSize: "0.9rem",
                listStyle: "none",
                padding: 0,
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {archivosBase.map((a, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.3rem 0",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                  title={a}
                >
                  <div>
                    <i
                      className="fas fa-file-word"
                      style={{ color: "#2563eb" }}
                    ></i>{" "}
                    {truncarNombre(a, 28)}
                  </div>
                  <button
                    onClick={() => eliminarArchivoBase(a)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: "1rem",
                    }}
                    title="Eliminar archivo"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={limpiarBaseManualmente}
              style={{
                marginTop: "1rem",
                background: "#dc2626",
                color: "#fff",
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              <i className="fas fa-broom"></i> Limpiar base
            </button>
          </>
        )}
      </div>

      {/* Panel de análisis */}
      <div
        style={{
          background: "#fff",
          padding: "1.5rem",
          borderRadius: "1rem",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "600px",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>
          <i className="fas fa-file-upload"></i> Analizar nuevo documento
        </h3>
        <form onSubmit={handleSubmit}>
          <input type="file" accept=".docx" onChange={handleFileChange} />
          <button
            type="submit"
            style={{
              marginTop: "1rem",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "0.6rem 1.2rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
            disabled={cargando}
          >
            {cargando ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <>
                <i className="fas fa-magnifying-glass"></i> Analizar
              </>
            )}
          </button>
        </form>
      </div>

      {/* Resultados */}
      {resumen.length > 0 && (
        <div
          id="resultados"
          style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "1rem",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            width: "100%",
            maxWidth: "800px",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{ color: "#1e3a8a", fontFamily: "'Montserrat', sans-serif" }}
          >
            <i className="fas fa-chart-simple"></i> Resultados del análisis
          </h2>

          {/* NUEVO: plagio global + tiempo */}
          <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "1.1rem" }}>
              <strong>Plagio global:</strong>{" "}
              <span style={{ color: "#dc2626", fontWeight: 700 }}>
                {plagioGlobal}%
              </span>
            </p>
            <p style={{ fontSize: "1.1rem" }}>
              <strong>Tiempo de análisis:</strong>{" "}
              <span style={{ color: "#2563eb", fontWeight: 700 }}>
                {tiempoAnalisis} segundos
              </span>
            </p>
          </div>

          <h3 style={{ marginTop: "1rem" }}>Resumen de similitud</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "0.5rem",
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "8px" }}>Archivo</th>
                <th style={{ padding: "8px" }}>Similitud (%)</th>
              </tr>
            </thead>
            <tbody>
              {resumen.map((r, i) => (
                <tr key={i} title={r.archivo}>
                  <td style={{ padding: "8px" }}>
                    {truncarNombre(r.archivo, 35)}
                  </td>
                  <td style={{ padding: "8px" }}>{r.similitud}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: "1.5rem" }}>Fragmentos sospechosos</h3>
          {fragmentos.length > 0 ? (
            <ul>
              {fragmentos.map((f, i) => (
                <li key={i} style={{ marginBottom: "0.6rem" }}>
                  <strong>{f.similitud}%</strong> — "{f.oracion}"
                  <br />
                  <small>Fuente: {truncarNombre(f.archivo, 40)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No se detectaron fragmentos sospechosos.</p>
          )}
        </div>
      )}

      {resumen.length > 0 && (
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={generarPDF}
            style={{
              background: "#059669",
              color: "#fff",
              padding: "0.6rem 1.2rem",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            <i className="fas fa-file-pdf"></i> Descargar PDF
          </button>
          <button
            onClick={handleReset}
            style={{
              background: "#dc2626",
              color: "#fff",
              padding: "0.6rem 1.2rem",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            <i className="fas fa-rotate-left"></i> Reiniciar
          </button>
        </div>
      )}
    </div>
  );
}
