"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, ShieldCheck, GraduationCap, Eye, EyeOff } from "lucide-react";
import { loginUsuario, guardarSesion } from "@/services/auth";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // Solo limpiamos el error, NO el email ni password

    try {
      const data = await loginUsuario(email, password);
      guardarSesion(data);
      router.push("/dashboard");
    } catch (err: any) {
      // Mostramos el mensaje del backend si existe
      const msg = err?.response?.data?.detail;
      setError("Correo institucional o contraseña incorrectos.");
      // email y password NO se tocan, el usuario no pierde lo que escribió
    } finally {
      setLoading(false);
    }
  };



  return (
    /* Fondo con degradado institucional sutil */
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #1A1A2E 0%, #2d1515 50%, #1A1A2E 100%)",
      }}
    >
      {/* Círculos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "#8B1A1A" }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "#C9A84C" }} />
      </div>

      {/* Tarjeta Principal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}>

        {/* Encabezado Institucional */}
        <div className="p-8 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #8B1A1A 0%, #6B1212 100%)" }}>

          {/* Icono decorativo de fondo */}
          <div className="absolute -right-6 -top-6 opacity-10">
            <ShieldCheck size={120} color="white" />
          </div>

          {/* Logo / Escudo universitario */}
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center border-2"
              style={{ background: "rgba(201,168,76,0.15)", borderColor: "#C9A84C" }}>
              <GraduationCap size={32} color="#C9A84C" />
            </div>
          </div>

          {/* Nombre de la institución */}
          <p className="text-white/70 text-xs uppercase tracking-[0.2em] font-medium mb-1">
            Universidad de Pamplona
          </p>
          <h1 className="text-4xl font-bold text-white tracking-tight">SARA</h1>
          <p style={{ color: "#C9A84C" }} className="text-xs mt-1 font-medium">
            Sistema de Asistencia con Reconocimiento Automático
          </p>
        </div>

        {/* Formulario */}
        <div className="p-8 bg-white">
          <h2 className="text-xl font-semibold mb-6" style={{ color: "#1A1A2E" }}>
            Iniciar Sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Campo Email */}
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">
                Correo Institucional
              </label>
              <div className="relative group">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors"
                  size={18}
                />
                <input
                  type="email"
                  required
                  placeholder="usuario@unipamplona.edu.co"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none transition-all"
                  style={{ color: "#1A1A2E" }}
                  onFocus={e => e.target.style.borderColor = "#8B1A1A"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Campo Password */}
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">
                Contraseña
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 outline-none transition-all"
                  style={{ color: "#1A1A2E" }}
                  onFocus={e => e.target.style.borderColor = "#8B1A1A"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm bg-red-50 p-3 rounded-lg border border-red-100"
                style={{ color: "#8B1A1A" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70"
              style={{ background: loading ? "#A52020" : "#8B1A1A" }}
              onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = "#6B1212")}
              onMouseLeave={e => !loading && ((e.target as HTMLElement).style.background = "#8B1A1A")}
            >
              {loading ? "Verificando..." : "Entrar al Sistema"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-xs">
              © 2024 SARA · Facultad de Ingenierías y Arquitectura
            </p>
            <p className="text-gray-300 text-xs mt-1">
              Protegido bajo la Ley 1581 de 2012
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
