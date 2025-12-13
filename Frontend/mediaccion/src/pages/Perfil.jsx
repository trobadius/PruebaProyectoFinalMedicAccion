import { useState, useEffect } from 'react';
import api from "../api";
import { validarCamposRepetidos } from "../utils/Validaciones";
import { FaUserCircle, FaPencilAlt } from 'react-icons/fa';
import '../styles/Perfil.css';
import { Link } from "react-router-dom";
import '../App.css';
import { MessageCircle, LogOut } from 'lucide-react';
import logo from "../assets/logo.svg";

export default function Perfil() {
  const [loading, setLoading] = useState(false);
  const [userProfile, setGetUserData] = useState({
    id_user: '',
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    id: '',
    date_birth: '',
    roles: '',
    genero: '',
    pais: '',
    telefono: ''
  })

  const [userProfileCopy, setGetUserDataCopy] = useState({
    id_user: '',
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    id: '',
    date_birth: '',
    roles: '',
    genero: '',
    pais: '',
    telefono: ''
  })

  const [errors, setErrors] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    date_birth: "",
    telefono: "",
  });

  const [editing, setEditing] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);

  // Recuperamos el perfil del usuario
  const fetchUserData = async () => {
    try {
      const res = await api.get("/api/users/profile/me");
      setGetUserData(res.data)
      setGetUserDataCopy(res.data)
    } catch (error) {
      alert(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData()
  }, []);

  useEffect(() => {
    const hasErrors = Object.values(errors).some(e => e !== "");
    const hasChanges = JSON.stringify(userProfile) !== JSON.stringify(userProfileCopy);

    setIsDisabled(hasErrors || !hasChanges || loading);
  }, [errors, userProfileCopy, loading, userProfile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGetUserDataCopy(prev => ({
      ...prev,
      [name]: value
    }))

    let errorMsg = "";
    if (name === "first_name") {
      errorMsg = validarCamposRepetidos(name, value, userProfile.first_name)
    }
    if (name === "last_name") {
      errorMsg = validarCamposRepetidos(name, value, userProfile.last_name)
    }
    if (name === "email") {
      errorMsg = validarCamposRepetidos(name, value, userProfile.email)
    }
    if (name === "fecha_nacimiento") {
      errorMsg = validarCamposRepetidos(name, value, userProfile.date_birth)
    }
    if (name === "telefono") {
      const numeros = value.replace(/[^0-9  ]/g, ""); // filtra todo lo que no sea número
      // Si se añaden mas paises, necesario pasar para validar telefono
      //const countryCode = userProfile.pais || "+34"; // default si no hay
      errorMsg = validarCamposRepetidos(name, numeros, userProfile.telefono)
    }

    // Actualizar errores
    setErrors(prev => ({
      ...prev,
      [name]: errorMsg
    }));

  };

  const handleSave = async () => {

    try {
      setLoading(true);

      // Construimos el formData usando userProfileCopy
      const formData = {
        username: userProfileCopy.username,
        first_name: userProfileCopy.first_name,
        last_name: userProfileCopy.last_name,
        email: userProfileCopy.email,
        profile: {
          date_birth: userProfileCopy.date_birth,
          roles: userProfileCopy.roles,
          genero: userProfileCopy.genero,
          pais: userProfileCopy.pais,
          telefono: userProfileCopy.telefono
        }
      };

      // ---- Enviar a la API ----
      const res = await api.put("/api/users/profile/me", formData);

      // Actualizamos los datos originales
      setGetUserData(userProfileCopy);

      setEditing(false);
      alert('Datos actualizados correctamente 🩺');

    } catch (error) {
      console.log(error);
      alert("Error al guardar los cambios ❌");
    } finally {
      setLoading(false);
    }
  };

  // Probar conexión de WhatsApp (primero intenta ejecutar script servidor, luego fallback API directa)
  const handleTestWhatsApp = async () => {
    // Validar que haya teléfono
    if (!userProfile.telefono) {
      alert('⚠️ Primero debes guardar un número de teléfono');
      return;
    }
    if (!userProfile.pais) {
      alert('⚠️ Primero debes guardar un prefijo de teléfono');
      return;
    }

    const telefonoCompleto = userProfile.pais + userProfile.telefono;

    setTestingWhatsApp(true);
    try {
      console.log('[WhatsApp Test] Enviando a:', userProfile.telefono);

      // Usar solo el endpoint directo que funciona
      const response = await api.post('/api/notificaciones/whats/', { telefonoCompleto });
      const data = response.data || {};

      console.log('[WhatsApp Test] Respuesta:', data);

      if (data.success) {
        alert(
          '✅ Mensaje de prueba enviado!\n\n' +
          `📱 Número: ${data.telefono_usado || userProfile.telefono}\n` +
          `📬 SID: ${data.message_sid || '—'}\n` +
          `📊 Estado: ${data.status || '—'}\n\n` +
          'Revisa tu WhatsApp en unos segundos.'
        );
      } else {
        alert(`❌ Error: ${data.error || data.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('[WhatsApp Test] Error:', error);
      const status = error?.response?.status;
      const serverMsg = error?.response?.data?.error || error?.response?.data?.message || error.message;

      if (status === 401) {
        alert('🔐 Sesión expirada. Inicia sesión nuevamente.');
      } else if (status === 403) {
        alert('🛡️ CSRF inválido. Recarga la página.');
      } else {
        alert(`❌ Error al conectar:\n\n${serverMsg}`);
      }
    } finally {
      setTestingWhatsApp(false);
    }
  };

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
        <div className="perfil-card">
          <div className="perfil-header">
            <FaUserCircle className="perfil-icon" />
            <h2 className="perfil-title">Mi Perfil</h2>
          </div>

          <div className="perfil-section">
            {!editing ? (
              <>
                <p><strong>Usuario:</strong> {userProfile.username || '—'}</p>
                <p><strong>Nombre:</strong> {userProfile.first_name || '—'}</p>
                <p><strong>Apellidos:</strong> {userProfile.last_name || '—'}</p>
                <p><strong>Email:</strong> {userProfile.email || '—'}</p>
                <p><strong>Fecha nacimiento:</strong> {userProfile.date_birth || '—'}</p>
                <p><strong>Roles:</strong> {userProfile.roles || '—'}</p>
                <p><strong>Genero:</strong> {userProfile.genero || '—'}</p>
                <p><strong>Pais:</strong> {userProfile.pais || '—'}</p>
                <p><strong>Telefono:</strong> {userProfile.telefono || '—'}</p>
                {userProfile.telefono && (
                  <button
                    className="whatsapp-test-btn"
                    onClick={handleTestWhatsApp}
                    disabled={testingWhatsApp}
                    style={{
                      backgroundColor: '#25D366',
                      color: 'white',
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: testingWhatsApp ? 'not-allowed' : 'pointer',
                      marginTop: '10px',
                      fontSize: '14px'
                    }}
                  >
                    {testingWhatsApp ? '⏳ Enviando...' : '📱 Probar Conexión WhatsApp'}
                  </button>
                )}

                <button className="edit-btn" onClick={() => setEditing(true)}>
                  <FaPencilAlt /> Editar perfil
                </button>
              </>
            ) : (
              <>
                <p><strong>Usuario:</strong> {userProfile.username || '—'}</p>
                <p><strong>Nombre:</strong></p>
                <input
                  type="text"
                  name="first_name"
                  value={userProfileCopy.first_name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  required
                />
                {errors.first_name && (
                  <label style={{ color: "red", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    {errors.first_name}
                  </label>
                )}

                <p><strong>Apellidos:</strong></p>
                <input
                  type="text"
                  name="last_name"
                  value={userProfileCopy.last_name}
                  onChange={handleChange}
                  placeholder="Tus apellidos"
                  required
                />
                {errors.last_name && (
                  <label style={{ color: "red", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    {errors.last_name}
                  </label>
                )}
                <p><strong>Email:</strong> {userProfile.email || '—'}</p>
                <input
                  type="date"
                  name="date_birth"
                  value={userProfileCopy.date_birth}
                  onChange={handleChange}
                  required
                />
                {errors.date_birth && (
                  <label style={{ color: "red", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    {errors.date_birth}
                  </label>
                )}
                <p><strong>Apellidos:</strong></p>
                <input
                  type="text"
                  name="last_name"
                  value={userProfileCopy.last_name}
                  onChange={handleChange}
                  placeholder="Tus apellidos"
                  required
                />
                {errors.last_name && (
                  <label style={{ color: "red", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    {errors.last_name}
                  </label>
                )}
                <p><strong>Email:</strong> {userProfile.email || '—'}</p>
                <p><strong>Fecha de nacimiento:</strong></p>
                <input
                  type="date"
                  name="date_birth"
                  value={userProfileCopy.date_birth}
                  onChange={handleChange}
                  required
                />
                {errors.date_birth && (
                  <label style={{ color: "red", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    {errors.date_birth}
                  </label>
                )}

                <p><strong>Roles:</strong> {userProfile.roles || '—'}</p>
                <p><strong>Genero:</strong></p>
                <select
                  className="genero"
                  name="genero"
                  id="genero"
                  value={(userProfileCopy.genero ?? "") || "no_decir"}
                  onChange={handleChange}
                >
                  <option value="" disabled>Selecciona genero...</option>
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                  <option value="no_decir">Prefiero no decirlo</option>
                </select>
                <p><strong>Email:</strong></p>
                <input
                  type="email"
                  name="email"
                  value={userProfileCopy.email}
                  onChange={handleChange}
                  placeholder="ejemplo@correo.com"
                  required
                />
                {errors.email && (
                  <label style={{ color: "red", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    {errors.email}
                  </label>
                )}
                <p><strong>Telefono:</strong></p>
                <div className="phone-combo" id="phone">
                  <div className="select-wrap" aria-hidden="false">
                    <select
                      name="pais"
                      id="pais"
                      aria-label="Seleccionar país"
                      value={(userProfileCopy.pais ?? "+34")}
                      onChange={handleChange}
                    >
                      <option value="+34">🇪🇸 +34</option>
                    </select>
                  </div>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={userProfileCopy.telefono}
                    onChange={handleChange}
                    placeholder="Número de teléfono"
                    required
                  />
                </div>
                {/* Mensaje de error debajo del input */}
                {errors.telefono && (
                  <label style={{ color: "red", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    {errors.telefono}
                  </label>
                )}

                <button className="save-btn" id="enviar" onClick={handleSave} disabled={isDisabled}>Guardar cambios</button>
                <button className="edit-btn" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
