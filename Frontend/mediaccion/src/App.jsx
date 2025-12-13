import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Calendario from './pages/Calendario.jsx';
import Perfil from './pages/Perfil.jsx';
import Login from './pages/Login.jsx';
import Progresos from "./pages/Progresos.jsx";
import Logout from './components/Logout.jsx';
import NotFound from './pages/NotFound.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Register from './pages/Register.jsx';
import NavbarOutlet from './components/NavbarOutlet.jsx';
import TesseractOCR from './pages/TesseractOCR.jsx';
import Chatbot from './pages/Chatbot.jsx';


export default function App() {
  return (
    /*
    <div className="app-root min-h-screen"
      style={{

        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh'
      }}
    >
    */
    <div>
      <main>
        <Routes>
          <Route element={<ProtectedRoute />} >
            <Route element={<NavbarOutlet />} >
              <Route path="/" element={<Home />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/tesseractOCR" element={<TesseractOCR />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/progresos" element={<Progresos />} />
            </Route>
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/register" element={<Logout metodo="register" />} />
          <Route path="/registration" element={<Register />} />
          <Route path="/chatbot" element={<Chatbot />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>


    </div>
  );
}







