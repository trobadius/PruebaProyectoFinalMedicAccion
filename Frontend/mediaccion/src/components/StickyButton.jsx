import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import '../styles/Stickybutton.css';
import { House, CalendarDays, Camera, Trophy, UserRound } from 'lucide-react';

export default function StickyButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const [hidden, setHidden] = useState(false);
  const [firstScrollDone, setFirstScrollDone] = useState(false);

  const isActive = (path) => location.pathname === path;

  // 🔥 Cada vez que cambia la ruta, reiniciamos todo
  useEffect(() => {
    setHidden(false);
    setFirstScrollDone(false);
  }, [location.pathname]);

  // 🔥 La primera vez que haces scroll → se esconde
  useEffect(() => {
    const handleScroll = () => {
      if (!firstScrollDone && window.scrollY > 20) {
        setHidden(true);          // esconder
        setFirstScrollDone(true); // marcar que ya pasó el primer scroll
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [firstScrollDone]);

  return (
    <div
      className={`sticky-button-container ${hidden ? "hide" : ""}`}
    >
      <button
        className={`sticky-btn ${isActive("/") ? "active" : ""}`}
        onClick={() => navigate("/")}
        aria-label="Inicio"
      >
        <House />
      </button>

      <button
        className={`sticky-btn ${isActive("/calendario") ? "active" : ""}`}
        onClick={() => navigate("/calendario")}
        aria-label="Calendario"
      >
        <CalendarDays />
      </button>

      <button
        className={`sticky-btn camera-btn ${isActive("/tesseractOCR") ? "active" : ""}`}
        onClick={() => navigate("/tesseractOCR")}
        aria-label="Cámara"
      >
        <Camera />
        <span className="corner-bl"></span>
        <span className="corner-br"></span>
      </button>

      <button
        className={`sticky-btn ${isActive("/progresos") ? "active" : ""}`}
        onClick={() => navigate("/progresos")}
        aria-label="Progresos"
      >
        <Trophy />
      </button>

      <button
        className={`sticky-btn ${isActive("/perfil") ? "active" : ""}`}
        onClick={() => navigate("/perfil")}
        aria-label="Perfil"
      >
        <UserRound />
      </button>
    </div>
  );
}
