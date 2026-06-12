"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";
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
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = email.toLowerCase().endsWith("@unipamplona.edu.co");

  return (
    /* Fondo oscuro institucional premium con patrón de circuitos impresos sutil */
    <div
      className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-br from-[#0a475a] via-[#0e5d75] to-[#052833] overflow-hidden"
    >
      {/* Círculos difuminados con colores de identidad para dar brillo y profundidad premium */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#c9a84c] opacity-[0.12] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#0ea5e9] opacity-[0.1] blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[35%] h-[35%] rounded-full bg-[#187e9e] opacity-[0.25] blur-[100px] pointer-events-none" />

      {/* Patrón de circuitos impresos de fondo como marca de agua */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="text-white/[0.035]">
          <pattern id="circuito-fondo" width="240" height="240" patternUnits="userSpaceOnUse">
            <path d="M 10 10 L 80 10 L 100 30 L 160 30 L 180 50 L 240 50" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="10" cy="10" r="4.5" fill="currentColor" />
            <circle cx="240" cy="50" r="4.5" fill="currentColor" />
            
            <path d="M 40 100 L 40 160 L 70 190 L 140 190 L 160 210 M 140 190 L 140 230" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="160" cy="210" r="4" fill="currentColor" />
            
            <path d="M 150 110 L 190 150 L 190 220" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="150" cy="110" r="4" fill="currentColor" />
            <circle cx="190" cy="220" r="4" fill="currentColor" />

            <path d="M 80 70 L 120 70 L 140 90 L 180 90" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="80" cy="70" r="3" fill="currentColor" />
            <circle cx="180" cy="90" r="3" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#circuito-fondo)" />
        </svg>
      </div>

      {/* Tarjeta Principal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100/50 z-10 transition-all duration-300">

        {/* Encabezado Institucional Premium a ancho completo sin recortar */}
        <div className="w-full bg-[#0a475a]">
          <img 
            src="/banner_sara.png" 
            alt="SARA Banner Logo" 
            className="w-full h-auto select-none block" 
          />
        </div>

        {/* Formulario corrido más abajo con padding-top extra para dar aire y espacio al banner */}
        <div className="pt-10 pb-8 px-8 bg-white">
          <h2 className="text-2xl font-bold mb-6 text-[#0e5d75]">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Campo Email */}
            <div>
              <label className="text-sm font-medium text-[#1e6177] block mb-1.5">
                Correo Institucional
              </label>
              <div className="relative group">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c9a84c] transition-colors"
                  size={18}
                />
                <input
                  type="email"
                  required
                  placeholder="usuario@unipamplona.edu.co"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 outline-none transition-all focus:border-[#0e5d75] text-[#1a1a2e]"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                {isEmailValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#10b981] text-white rounded-full p-0.5 flex items-center justify-center w-5 h-5 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Campo Password */}
            <div>
              <label className="text-sm font-medium text-[#1e6177] block mb-1.5">
                Contraseña
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c9a84c] transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 outline-none transition-all focus:border-[#0e5d75] text-[#1a1a2e]"
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
              <p className="text-sm bg-red-50 p-3 rounded-lg border border-red-100 text-[#8B1A1A]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 font-semibold tracking-wide"
              style={{ 
                background: "linear-gradient(to right, #0a475a, #0e5d75)",
                color: "#c9a84c"
              }}
              onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = "linear-gradient(to right, #0e5d75, #187e9e)")}
              onMouseLeave={e => !loading && ((e.target as HTMLElement).style.background = "linear-gradient(to right, #0a475a, #0e5d75)")}
            >
              {loading ? (
                <span>Verificando...</span>
              ) : (
                <>
                  <span>Entrar al Sistema</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-xs font-medium">
              © 2026 SARA - Facultad de Ingenierías y Arquitectura
            </p>
            <p className="text-gray-400 text-[11px] mt-1">
              Protegido bajo la Ley 1581 de 2012
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
