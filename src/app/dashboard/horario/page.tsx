"use client";

import React, { useEffect, useState } from "react";
import { getSesion } from "@/services/auth";
import { obtenerHorarioSemanal, HorarioSemanal } from "@/services/dashboard";
import { Calendar, Clock, BookOpen, MapPin, Users, Printer, FileText } from "lucide-react";

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const DIA_MAP: Record<string, string> = {
    "lunes": "Lunes",
    "martes": "Martes",
    "miercoles": "Miercoles",
    "miércoles": "Miercoles",
    "jueves": "Jueves",
    "viernes": "Viernes",
    "sabado": "Sabado",
    "sábado": "Sabado"
};

export default function HorarioPage() {
    const [sesion, setSesion] = useState({ id: "", rol: "", nombre: "" });
    const [horarios, setHorarios] = useState<HorarioSemanal[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<"cuadricula" | "lista">("cuadricula");
    const [diaMovilActivo, setDiaMovilActivo] = useState("Lunes");

    useEffect(() => {
        const s = getSesion();
        setSesion({ id: s.id || "", rol: s.rol || "", nombre: s.nombre || "" });
        
        if (s.id && s.rol) {
            obtenerHorarioSemanal(s.id, s.rol)
                .then(data => {
                    setHorarios(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error al obtener horario semanal:", err);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, []);

    // Agrupar horarios por día normalizado
    const horariosPorDia: Record<string, HorarioSemanal[]> = {
        "Lunes": [], "Martes": [], "Miercoles": [], "Jueves": [], "Viernes": [], "Sabado": []
    };

    horarios.forEach(h => {
        const diaNorm = DIA_MAP[h.dia_semana.toLowerCase()] || "Lunes";
        if (horariosPorDia[diaNorm]) {
            horariosPorDia[diaNorm].push(h);
        }
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-12 h-12 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm font-medium animate-pulse">Cargando tu horario semanal...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm no-print">
                <div>
                    <h1 className="text-2xl font-black text-sidebar-bg flex items-center gap-3">
                        <Calendar className="text-[#8B1A1A]" size={28} /> Mi Horario Semanal
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                        Visualiza y planifica tus clases distribuidas a lo largo de la semana.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Selector de vista */}
                    <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200/50">
                        <button
                            onClick={() => setVista("cuadricula")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                vista === "cuadricula"
                                    ? "bg-white text-sidebar-bg shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <Calendar size={14} /> Vista Semanal
                        </button>
                        <button
                            onClick={() => setVista("lista")}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                vista === "lista"
                                    ? "bg-white text-sidebar-bg shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <FileText size={14} /> Vista Lista
                        </button>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                        <Printer size={14} /> Imprimir
                    </button>
                </div>
            </div>

            {/* VISTA PARA IMPRESIÓN (Oculta en web, visible al imprimir) */}
            <div className="only-print w-full bg-white p-6 border border-gray-200 rounded-3xl">
                <div className="flex items-center justify-between border-b-2 border-[#8B1A1A] pb-4 mb-6">
                    <div className="flex items-center gap-4">
                        <img src="/logo_unipamplona.png" alt="Logo UniPamplona" className="h-16 w-auto" />
                        <div>
                            <h2 className="text-lg font-black text-sidebar-bg">UNIVERSIDAD DE PAMPLONA</h2>
                            <p className="text-xs text-[#C9A84C] font-bold tracking-widest">SARA - HORARIO SEMANAL DE {sesion.rol.toUpperCase()}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black">{sesion.nombre}</p>
                        <p className="text-xs text-gray-500">Generado el: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {DIAS.map(dia => {
                        const clases = horariosPorDia[dia] || [];
                        if (clases.length === 0) return null;
                        return (
                            <div key={dia} className="space-y-3 break-inside-avoid">
                                <h3 className="text-sm font-extrabold text-sidebar-bg border-b border-gray-200 pb-1 uppercase tracking-wider">{dia}</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {clases.map((c, i) => (
                                        <div key={i} className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                                            <p className="font-bold text-xs text-sidebar-bg">{c.asignatura}</p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-1">Grupo {c.grupo} • Aula {c.aula}</p>
                                            <p className="text-[10px] text-[#8B1A1A] font-bold mt-1 flex items-center gap-1">
                                                <Clock size={10} /> {c.hora_inicio} - {c.hora_fin}
                                            </p>
                                            {sesion.rol === "Estudiante" && (
                                                <p className="text-[10px] text-gray-500 mt-1">Docente: {c.docente}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* VISTA EN PANTALLA */}
            <div className="no-print">
                {horarios.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4 shadow-sm flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                            <Calendar size={32} />
                        </div>
                        <div>
                            <h3 className="font-black text-lg text-sidebar-bg">No se encontraron clases programadas</h3>
                            <p className="text-xs text-gray-400 mt-1">Tu horario semanal está vacío. Si consideras que es un error, contacta al administrador.</p>
                        </div>
                    </div>
                ) : vista === "cuadricula" ? (
                    <>
                        {/* Selector de día para pantallas móviles (oculto en desktop) */}
                        <div className="lg:hidden flex overflow-x-auto gap-2 pb-4 scrollbar-none">
                            {DIAS.map(dia => {
                                const count = horariosPorDia[dia]?.length || 0;
                                const isActivo = diaMovilActivo === dia;
                                return (
                                    <button
                                        key={dia}
                                        onClick={() => setDiaMovilActivo(dia)}
                                        className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                                            isActivo
                                                ? "bg-[#8B1A1A] text-white shadow-md"
                                                : "bg-white text-gray-500 border border-gray-100 hover:border-gray-200"
                                        }`}
                                    >
                                        {dia}
                                        {count > 0 && (
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                                isActivo ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Cuadrícula semanal para Desktop / Contenido activo para móvil */}
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                            {DIAS.map(dia => {
                                const clases = horariosPorDia[dia] || [];
                                const esDiaActivoMovil = diaMovilActivo === dia;

                                return (
                                    <div
                                        key={dia}
                                        className={`bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col p-5 space-y-4 transition-all duration-300 ${
                                            esDiaActivoMovil ? "block" : "hidden lg:flex"
                                        }`}
                                    >
                                        <div className="border-b border-gray-50 pb-3 flex justify-between items-center">
                                            <h3 className="font-extrabold text-sm text-sidebar-bg uppercase tracking-wider">{dia}</h3>
                                            <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-2 py-0.5 rounded-md">
                                                {clases.length} {clases.length === 1 ? "clase" : "clases"}
                                            </span>
                                        </div>

                                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin">
                                            {clases.length === 0 ? (
                                                <div className="h-full flex items-center justify-center py-12 text-center">
                                                    <p className="text-gray-300 text-xs italic">Sin clases programadas</p>
                                                </div>
                                            ) : (
                                                clases.map((c, i) => (
                                                    <div
                                                        key={i}
                                                        className="group/card relative overflow-hidden bg-gradient-to-br from-gray-50 to-white hover:from-white hover:to-white border border-gray-100 hover:border-[#8B1A1A]/20 p-4 rounded-2xl hover:shadow-md transition-all duration-300 space-y-3 flex flex-col justify-between"
                                                    >
                                                        {/* Efecto Glow lateral en hover */}
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#8B1A1A] to-[#8B1A1A]/60 opacity-60 group-hover/card:w-1.5 transition-all" />
                                                        
                                                        <div className="space-y-1 pl-1">
                                                            <h4 className="font-black text-xs text-sidebar-bg leading-snug group-hover/card:text-[#8B1A1A] transition-colors line-clamp-2" title={c.asignatura}>
                                                                {c.asignatura}
                                                            </h4>
                                                            <p className="text-[9px] text-gray-400 font-extrabold uppercase">Cod: {c.cod_asignatura}</p>
                                                        </div>

                                                        <div className="space-y-1.5 pt-2 border-t border-gray-100/60 pl-1 text-[10px]">
                                                            <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                                                                <Clock size={12} className="text-[#8B1A1A]" />
                                                                <span>{c.hora_inicio} - {c.hora_fin}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                                                                <MapPin size={12} className="text-[#C9A84C]" />
                                                                <span>Aula {c.aula} • Grupo {c.grupo}</span>
                                                            </div>
                                                            {sesion.rol === "Estudiante" && (
                                                                <div className="flex items-center gap-1.5 text-gray-500 font-semibold pt-1 border-t border-dashed border-gray-100">
                                                                    <Users size={12} className="text-blue-500" />
                                                                    <span className="truncate" title={c.docente}>{c.docente}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* Vista de Lista organizada cronológicamente */
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
                        {DIAS.map(dia => {
                            const clases = horariosPorDia[dia] || [];
                            if (clases.length === 0) return null;
                            return (
                                <div key={dia} className="space-y-3 border-b border-gray-50 last:border-0 pb-6 last:pb-0">
                                    <h3 className="font-extrabold text-sm text-[#8B1A1A] uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#8B1A1A] animate-pulse" /> {dia}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {clases.map((c, i) => (
                                            <div
                                                key={i}
                                                className="group/card relative overflow-hidden bg-gray-50/50 hover:bg-white border border-gray-100 hover:border-gray-200 p-5 rounded-2xl hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-4"
                                            >
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#8B1A1A] to-[#8B1A1A]/40" />
                                                <div className="space-y-1">
                                                    <h4 className="font-black text-sm text-sidebar-bg group-hover/card:text-[#8B1A1A] transition-colors">{c.asignatura}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Cod: {c.cod_asignatura} • Grupo {c.grupo}</p>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-500 font-bold border-t border-gray-100 pt-3 flex-wrap gap-2">
                                                    <span className="flex items-center gap-1"><Clock size={13} className="text-[#8B1A1A]" /> {c.hora_inicio} - {c.hora_fin}</span>
                                                    <span className="flex items-center gap-1"><MapPin size={13} className="text-[#C9A84C]" /> Aula {c.aula}</span>
                                                </div>
                                                {sesion.rol === "Estudiante" && (
                                                    <div className="text-[10px] text-gray-400 border-t border-dashed border-gray-100 pt-2 flex items-center gap-1.5">
                                                        <Users size={12} className="text-blue-500" />
                                                        <span>Docente: <strong className="font-extrabold text-gray-600">{c.docente}</strong></span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
