
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Medicine from "./pages/Medicine";
import "./App.css";

function Home() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>CareConnect</h1>
        <p>Simple, compassionate care for everyone.</p>
        <Link to="/register">Register</Link>
        {" | "}
        <Link to="/login">Login</Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/medicine" element={<Medicine />} />
      </Routes>
    </BrowserRouter>
  );
}
