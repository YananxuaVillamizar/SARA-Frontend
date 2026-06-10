"use client";

import React, { useEffect, useState } from "react";
import { getSesion } from "@/services/auth";
import { obtenerHorarioSemanal, HorarioSemanal } from "@/services/dashboard";
import { Calendar, Clock, MapPin, Printer } from "lucide-react";

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const DIA_MAP: Record<string, string> = {
    "lunes": "Lunes",
    "martes": "Martes",
    "miercoles": "Miercoles",
    "miércoles": "Miercoles",
    "jueves": "Jueves",
    "viernes": "Viernes",
    "sabado": "Sabado",
    "sábado": "Sabado",
    "domingo": "Domingo"
};

interface FilaHorario {
    cod_asignatura: string;
    asignatura: string;
    grupo: string;
    docente: string;
    clasesPorDia: Record<string, {
        hora_inicio: string;
        hora_fin: string;
        aula: string;
    }[]>;
}

function obtenerIniciales(nombreCompleto: string): string {
    if (!nombreCompleto) return "DO";
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length >= 2) {
        return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return partes[0].slice(0, 2).toUpperCase();
}

export default function HorarioPage() {
    const [sesion, setSesion] = useState({ id: "", rol: "", nombre: "" });
    const [horarios, setHorarios] = useState<HorarioSemanal[]>([]);
    const [loading, setLoading] = useState(true);

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

    // Agrupar horarios por Asignatura + Grupo para formar las filas de la tabla
    const filasMap: Record<string, FilaHorario> = {};

    horarios.forEach(h => {
        const key = `${h.cod_asignatura}-${h.grupo}`;
        if (!filasMap[key]) {
            filasMap[key] = {
                cod_asignatura: h.cod_asignatura,
                asignatura: h.asignatura,
                grupo: h.grupo,
                docente: h.docente,
                clasesPorDia: {
                    "Lunes": [],
                    "Martes": [],
                    "Miercoles": [],
                    "Jueves": [],
                    "Viernes": [],
                    "Sabado": [],
                    "Domingo": []
                }
            };
        }
        
        const diaNorm = DIA_MAP[h.dia_semana.toLowerCase()] || "Lunes";
        if (filasMap[key].clasesPorDia[diaNorm]) {
            filasMap[key].clasesPorDia[diaNorm].push({
                hora_inicio: h.hora_inicio,
                hora_fin: h.hora_fin,
                aula: h.aula
            });
        }
    });

    const filas = Object.values(filasMap);

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
            {/* Cabecera (Oculta al imprimir) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm no-print">
                <div>
                    <h1 className="text-2xl font-black text-sidebar-bg flex items-center gap-3">
                        <Calendar className="text-[#8B1A1A]" size={28} /> Mi Horario Semanal
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                        Formato oficial e institucional de asignación académica semanal.
                    </p>
                </div>
                <div>
                    <button
                        onClick={() => window.print()}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                        <Printer size={14} /> Imprimir Horario
                    </button>
                </div>
            </div>

            {/* Cabecera institucional al imprimir (Oculta en pantalla) */}
            <div className="only-print w-full bg-white pb-4 mb-6 border-b-2 border-[#8B1A1A] flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <img src="/logo_unipamplona.png" alt="Logo UniPamplona" className="h-14 w-auto" />
                    <div>
                        <h2 className="text-md font-black text-sidebar-bg">UNIVERSIDAD DE PAMPLONA</h2>
                        <p className="text-[10px] text-[#C9A84C] font-bold tracking-widest uppercase">SARA - REGISTRO DE ASISTENCIA</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs font-black text-sidebar-bg uppercase">{sesion.rol}: {sesion.nombre}</p>
                    <p className="text-[9px] text-gray-500 font-medium">Semestre Activo • {new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* Tabla Principal */}
            {filas.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                        <Calendar size={32} />
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-sidebar-bg">No se encontraron clases programadas</h3>
                        <p className="text-xs text-gray-400 mt-1">Tu horario académico no registra clases activas para este semestre.</p>
                    </div>
                </div>
            ) : (
                <div className="w-full overflow-x-auto rounded-3xl border border-gray-200/80 shadow-md bg-white print:border-gray-300 print:shadow-none">
                    <table className="w-full border-collapse min-w-[1000px] print:min-w-full">
                        <thead>
                            <tr className="bg-[#5A6268] text-white text-[11px] font-black uppercase tracking-wider print:bg-[#5A6268] print:text-white">
                                <th className="py-3 px-4 text-center border border-gray-300/40 w-[220px]">Materia</th>
                                {DIAS.map(dia => (
                                    <th key={dia} className="py-3 px-3 text-center border border-gray-300/40 font-bold">{dia}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filas.map((fila, idx) => {
                                const esPar = idx % 2 === 1;
                                return (
                                    <tr 
                                        key={idx} 
                                        className={`text-[10px] border-b border-gray-200/80 transition-colors hover:bg-red-50/10 ${
                                            esPar ? "bg-gray-100/70" : "bg-white"
                                        } print:bg-white`}
                                    >
                                        {/* Columna Materia */}
                                        <td className="py-4 px-4 font-bold text-gray-700 border border-gray-200/80 bg-gray-50/30 print:bg-white w-[220px]">
                                            <div className="space-y-1">
                                                <p className="text-gray-400 font-extrabold tracking-wider text-[9px]">{fila.cod_asignatura}</p>
                                                <p className="text-[11px] font-black text-sidebar-bg uppercase leading-tight print:text-black">{fila.asignatura}</p>
                                                <p className="text-[10px] text-gray-500 font-semibold">Grupo : {fila.grupo}</p>
                                            </div>
                                        </td>
                                        
                                        {/* Columnas de Días */}
                                        {DIAS.map(dia => {
                                            const clases = fila.clasesPorDia[dia] || [];
                                            return (
                                                <td key={dia} className="p-2 text-center border border-gray-200/80 align-middle w-[110px] min-h-[60px]">
                                                    {clases.map((clase, cIdx) => (
                                                        <div key={cIdx} className="space-y-1 py-1">
                                                            <p className="font-extrabold text-sidebar-bg text-[10px] tracking-tight print:text-black">
                                                                {clase.hora_inicio}-{clase.hora_fin}
                                                            </p>
                                                            <p className="text-[9px] text-gray-500 font-semibold leading-tight">
                                                                {clase.aula}
                                                            </p>
                                                            <div 
                                                                className="inline-block px-1.5 py-0.5 bg-gray-200/60 rounded-md text-[8px] font-black text-gray-600 uppercase tracking-widest mt-0.5 cursor-help"
                                                                title={fila.docente}
                                                            >
                                                                {obtenerIniciales(fila.docente)}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
