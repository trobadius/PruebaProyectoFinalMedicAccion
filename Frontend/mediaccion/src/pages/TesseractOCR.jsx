import { useRef, useState, useEffect } from "react";
import { createWorker } from "tesseract.js";
import ScanerImg from "../assets/scanner.png";
import { chatCerrado } from "../components/OpenAiApi";
import { cleanOcrText } from "../components/LimpiarTexto.jsx";
import api from "../api";
import { useNavigate, Link } from "react-router-dom";
import '../App.css';
import '../styles/Tesseract.css'
import { MessageCircle, LogOut } from 'lucide-react';
import logo from "../assets/logo.svg";

export default function TesseractOCR() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const workerRef = useRef(null);

  const [workerReady, setWorkerReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState("");
  const [autoScanOnce, setAutoScanOnce] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  //ventana modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [showResultChat, setShowResultChat] = useState(false);
  const [chatText, setChatText] = useState("");

  const [ocrResult, setOcrResult] = useState({
    original: "",
    limpio: "",
    normalizado: "",
    medicamento: "",
    dosis: null,
    via: null,
  });

  const navigate = useNavigate();

  // ============================================================
  // Inicializar worker
  // ============================================================
  useEffect(() => {
    const initWorker = async () => {
      const worker = await createWorker();
      workerRef.current = worker;
      setWorkerReady(true);
      console.log("Worker listo");
    };

    initWorker();
    return () => workerRef.current && workerRef.current.terminate();
  }, []);

  // ============================================================
  // Auto-scan continuo
  // ============================================================
  useEffect(() => {
    if (autoScanOnce && workerReady && started) {
      captureAndScan();
      setAutoScanOnce(false);   // <-- Se desactiva automáticamente
    }
  }, [autoScanOnce, workerReady, started]);


  // ============================================================
  // Cámara
  // ============================================================
  const handleActivateCamera = async (mode = "environment") => {
    const ok = window.confirm(
      "Esta aplicación necesita acceder a tu cámara. ¿Deseas continuar?"
    );
    if (ok) {
      await startCamera(mode);
      setCameraActive(true);
      setStarted(true);
    }
  };

  const apagarCamara = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop()); // detiene cada track
      videoRef.current.pause();
      videoRef.current.srcObject = null;    // limpiar video
    }
    setStarted(false);
    setShowResultModal(false);
  };

  const startCamera = async (mode = "environment") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode }
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStarted(true);
    } catch (err) {
      alert("Error al activar la cámara");
      console.error(err);
    }
  };

  // ============================================================
  // FUNCIONES AUXILIARES
  // ============================================================

  function cannyEdgeDetection(data, width, height) {
    const out = new Uint8ClampedArray(data.length);

    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sumX = 0, sumY = 0, idx = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixel = data[((y + ky) * width + (x + kx)) * 4];
            sumX += pixel * gx[idx];
            sumY += pixel * gy[idx];
            idx++;
          }
        }

        const mag = Math.sqrt(sumX * sumX + sumY * sumY);
        const i = (y * width + x) * 4;
        out[i] = out[i + 1] = out[i + 2] = mag > 60 ? 255 : 0;
      }
    }

    return out;
  }

  function deskewCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    let pts = [];
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        if (data[idx] === 0) pts.push({ x, y });
      }
    }

    if (pts.length < 10) return;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const p of pts) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }

    const n = pts.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const angle = Math.atan(slope) * (180 / Math.PI);

    const temp = document.createElement("canvas");
    temp.width = canvas.width;
    temp.height = canvas.height;

    const tctx = temp.getContext("2d");
    tctx.translate(canvas.width / 2, canvas.height / 2);
    tctx.rotate((-angle * Math.PI) / 180);
    tctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(temp, 0, 0);
  }

  // ============================================================
  // PROCESO COMPLETO DE OCR MEJORADO
  // ============================================================
  const captureAndScan = async () => {
    if (!workerReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    const w = canvas.width, h = canvas.height;
    const totalPixels = w * h;

    // 1) Grayscale
    for (let i = 0; i < data.length; i += 4) {
      const g = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      data[i] = data[i + 1] = data[i + 2] = g;
    }
    const originalGray = new Uint8ClampedArray(data);

    // 2) Mediana
    const median = arr => arr.sort((a, b) => a - b)[4];
    let filtered = new Uint8ClampedArray(data);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        let neighbors = [];
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            neighbors.push(originalGray[((y + ky) * w + (x + kx)) * 4]);
          }
        }
        const med = median(neighbors);
        const i = (y * w + x) * 4;
        filtered[i] = filtered[i + 1] = filtered[i + 2] = med;
      }
    }
    data.set(filtered);

    // 3) Aumento Contraste
    let mn = 255, mx = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < mn) mn = data[i];
      if (data[i] > mx) mx = data[i];
    }
    const range = mx - mn;
    if (range > 0) {
      for (let i = 0; i < data.length; i += 4) {
        const v = ((data[i] - mn) / range) * 255;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
    }

    // 4) Canny
    const edges = cannyEdgeDetection(data, w, h);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + 1] = data[i + 2] = edges[i];
    }
    ctx.putImageData(imageData, 0, 0);

    // 5) Deskew
    deskewCanvas(canvas);

    // recargar datos tras deskew
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    data = imageData.data;

    // 6) Bounding Box
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === 0) {
        const idx = i / 4;
        const x = idx % w, y = Math.floor(idx / w);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    if (maxX > minX && maxY > minY) {
      const crop = ctx.getImageData(minX, minY, maxX - minX, maxY - minY);
      canvas.width = maxX - minX;
      canvas.height = maxY - minY;
      ctx.putImageData(crop, 0, 0);
    }

    // 7) OCR final
    const { data: ocrData } = await workerRef.current.recognize(canvas);
    setResult(ocrData.text);
    setScanned(true);   // Marca que ya terminó

    console.log("OCR:", ocrData.text);
    if (ocrData.text) {
      const cleanText = cleanOcrText(ocrData.text)
      setOcrResult(cleanText);
      console.log(cleanText)
      //const laia = chatCerrado(ocrResult);
      //setModalText(ocrResult);
      setShowResultModal(true);
    }


  };

  const buscarMecicamento = async () => {
    const texto = `${ocrResult.medicamento} ${ocrResult.dosis ? ocrResult.dosis.join(', ') : ''} ${ocrResult.via ? ocrResult.via.join(', ') : ''}`;

    try {
      const laiaJSON = await chatCerrado(texto);

      setShowResultModal(false);
      setShowResultChat(true);

      if (!laiaJSON.error) {
        setChatText(laiaJSON);
      } else {
        // Si hubo error en la respuesta JSON
        setChatText(`Error: ${laiaJSON.error}\n${laiaJSON.raw || ""}`);
      }

    } catch (error) {
      console.error("Error al buscar medicamento:", error);
      setChatText("Ocurrió un error al procesar la información.");
    }
  };

  const guardarMedicamento = async () => {
    const medicamento = chatText.medicamento || "Desconocido";
    const descripcion = chatText.descripcion || "Sin descripción";
    localStorage.setItem("medicamentoActual", medicamento);

    try {
      const res = await api.post("/api/medicamentos/", { medicamento, descripcion })
      alert("Medicamento registrado con éxito 🩺");
      apagarCamara();
      navigate("/calendario")
    } catch (error) {
      alert(error)

    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <div className="waves"></div>
      <div className="main-app">
        <header className="main-header">
          <div className="header-components">
            <Link to="/Chatbot"
              state={{ from: location.pathname }} className="header-icon-chat">
              <MessageCircle size={26} className="message-circle" />
            </Link>
            <Link to="/" className="header-logo-wrapper">
              <img src={logo} alt="Medicacción Logo" className="header-logo" />
            </Link>
            <Link to="/logout">
              <button className="header-icon-logout">
                <LogOut size={26} className="header-logout" />
              </button>
            </Link>
          </div>
        </header>
        {/* Si NO estamos mostrando el modal del chat → mostramos todo lo demás */}
        {!(showResultChat && chatText) && (
          <>
            <div className="camera-ocr-video-container">
              <video ref={videoRef} className="camera-ocr-video" />

              {!started && (
                <div className="overlay-img">
                  <img src={ScanerImg} alt="scanner" className="scanner-image" />
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="camera-ocr-canvas" />
            <div className="modal-buttons">
              {!cameraActive ? (
                <button
                  onClick={() => handleActivateCamera("environment")}
                  className="camera-ocr-button-activate"
                >
                  Activar
                </button>
              ) : (
                <button
                  onClick={() => {
                    apagarCamara();
                    setCameraActive(false);
                  }}
                  className="camera-ocr-button"
                >
                  Desactivar
                </button>
              )}
              {cameraActive && (
                <>
                  {!scanned ? (
                    <button
                      onClick={() => setAutoScanOnce(true)}
                      className="camera-ocr-button"
                    >
                      Escaneo automático
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setScanned(false);
                        setResult("");
                        setAutoScanOnce(true);
                      }}
                      className="camera-ocr-button"
                    >
                      Volver a escanear
                    </button>
                  )}
                </>
              )}
            </div>
            {showResultModal && (
              <div className="camera-ocr-video-container">
                <div className="camera-ocr-result">
                  <p>Resultado:</p>
                  <p>{ocrResult.medicamento}</p>
                  <p>{ocrResult.dosis}</p>
                  <p>{ocrResult.via}</p>
                  <hr />

                  <p>¿Quieres buscar este medicamento?</p>
                  <div className="modal-buttons">
                    <button
                      onClick={() => buscarMecicamento()}
                      className="camera-ocr-button"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => setShowResultModal(false)}
                      className="camera-ocr-button"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {showResultChat && chatText && (
          <div className="camera-ocr-video-container">
            <div className="camera-ocr-result">

              {!chatText.error ? (
                <div style={{ whiteSpace: "pre-line" }}>

                  <p><strong>Medicamento:</strong> {chatText.medicamento || "N/A"}</p>

                  <p><strong>Descripción:</strong> {chatText.descripcion || "N/A"}</p>

                  <p><strong>Uso:</strong></p>
                  {Array.isArray(chatText.uso) ? (
                    chatText.uso.map((item, index) => (
                      <p key={index}> - {item}</p>
                    ))
                  ) : (
                    <p>N/A</p>
                  )}

                  <p><strong>Dosis recomendada:</strong></p>
                  {chatText.dosis_recomendada && typeof chatText.dosis_recomendada === "object" ? (
                    Object.entries(chatText.dosis_recomendada).map(([key, value]) => (
                      <p key={key}>{key.charAt(0).toUpperCase() + key.slice(1)}: {value}</p>
                    ))
                  ) : (
                    <p>N/A</p>
                  )}

                  <p><strong>Precauciones:</strong></p>
                  {Array.isArray(chatText.precauciones) ? (
                    chatText.precauciones.map((item, index) => (
                      <p key={index}> - {item}</p>
                    ))
                  ) : (
                    <p>N/A</p>
                  )}

                  <p><strong>Efectos secundarios:</strong></p>
                  {Array.isArray(chatText.efectos_secundarios) ? (
                    chatText.efectos_secundarios.map((item, index) => (
                      <p key={index}> - {item}</p>
                    ))
                  ) : (
                    <p>N/A</p>
                  )}

                </div>
              ) : (
                <p style={{ color: 'red' }}>
                  Error: {chatText.error}<br />{chatText.raw || ""}
                </p>
              )}

              <hr />

              <p>¿Quieres guardar este medicamento?</p>
              <div className="modal-buttons">
                <button onClick={() => guardarMedicamento()} className="camera-ocr-button">Aceptar</button>
                <button onClick={() => {
                  setShowResultChat(false);
                  startCamera();
                }} className="camera-ocr-button">Cancelar</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}
