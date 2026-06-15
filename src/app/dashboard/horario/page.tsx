"use client";

import React, { useEffect, useState } from "react";
import { getSesion } from "@/services/auth";
import { obtenerHorarioSemanal, HorarioSemanal } from "@/services/dashboard";
import { Calendar, Clock, MapPin, Printer, ChevronDown, ChevronUp } from "lucide-react";
import PrintHeader from "@/components/PrintHeader";

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



export default function HorarioPage() {
    const [sesion, setSesion] = useState({ id: "", rol: "", nombre: "", num_doc: "" });
    const [horarios, setHorarios] = useState<HorarioSemanal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const s = getSesion();
        setSesion({ id: s.id || "", rol: s.rol || "", nombre: s.nombre || "", num_doc: s.num_doc || "" });
        
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

    const handleImprimirHorario = () => {
        if (!sesion.nombre) return;

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
        const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

        const filasMap: Record<string, any> = {};

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
                    hora_inicio: h.hora_inicio.slice(0, 5),
                    hora_fin: h.hora_fin.slice(0, 5),
                    aula: h.aula
                });
            }
        });

        const filas = Object.values(filasMap);
        const logoUrl = window.location.origin + '/logo_unipamplona.png';
        const fechaPrintFormatted = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const propNombre = sesion.nombre;
        const propRol = sesion.rol;
        const propDoc = sesion.num_doc;
        const genNombre = sesion.nombre;
        const genRol = sesion.rol;

        const htmlContent = `
            <html>
                <head>
                    <title>Horario Semanal - ${propNombre}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                        
                        @page {
                            size: letter landscape;
                            margin: 0mm;
                        }
                                             body {
                            font-family: 'Inter', sans-serif;
                            color: #000000;
                            margin: 0;
                            padding: 15mm 10mm;
                            background: #ffffff;
                            font-size: 11px;
                            line-height: 1.3;
                        }
                        
                        .header {
                            width: 100%;
                            margin-bottom: 20px;
                            padding-bottom: 12px;
                            border-bottom: 2.5px solid #0e5d75;
                        }
                        
                        .header-row {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        }
                        
                        .accent-bar {
                            width: 100%;
                            height: 4px;
                            background-color: #c9a84c;
                            margin-top: 8px;
                            border-radius: 9999px;
                        }
                        
                        .header-logo {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        }
                        
                        .header-logo img {
                            height: 80px;
                            width: auto;
                        }
                        
                        .header-title-container {
                            display: flex;
                            flex-direction: column;
                        }
                        
                        .header-title-main {
                            font-size: 22px;
                            font-weight: 800;
                            color: #0e5d75;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin: 0;
                        }
                        
                        .header-title-sub {
                            font-size: 12px;
                            font-weight: 600;
                            color: #c9a84c;
                            text-transform: uppercase;
                            margin: 2px 0 0 0;
                            letter-spacing: 0.5px;
                        }
                        
                        .header-meta {
                            text-align: right;
                        }
                        
                        .header-meta-doc {
                            font-size: 16px;
                            font-weight: 800;
                            color: #0e5d75;
                            text-transform: uppercase;
                            margin: 0 0 3px 0;
                        }
                        
                        .header-meta-date {
                            font-size: 11px;
                            color: #000000;
                            font-weight: 500;
                            margin: 0 0 6px 0;
                        }
                        
                        .header-meta-by {
                            font-size: 11px;
                            color: #000000;
                            font-weight: 500;
                            margin: 0;
                            line-height: 1.25;
                        }
                        
                        .schedule-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 15px;
                            background: #ffffff;
                            border: 1px solid #000000;
                        }
                        
                        .schedule-table th {
                            background: #0e5d75 !important;
                            color: #ffffff !important;
                            font-size: 12px;
                            font-weight: 800;
                            text-transform: uppercase;
                            padding: 6px 4px;
                            border: 1px solid #000000;
                            border-bottom: 3px solid #c9a84c !important;
                            text-align: center;
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                        }
                        
                        .schedule-table td {
                            padding: 6px 4px;
                            font-size: 11px;
                            color: #000000;
                            border: 1px solid #000000;
                            font-weight: 500;
                            vertical-align: top;
                        }

                        .materia-cell {
                            font-weight: bold;
                        }
                        
                        .materia-code {
                            font-size: 11px;
                            color: #666;
                            font-weight: bold;
                            text-transform: uppercase;
                        }

                        .materia-name {
                            font-size: 9.5px;
                            font-weight: 800;
                            text-transform: uppercase;
                            color: #000;
                            margin: 2px 0;
                        }

                        .materia-info {
                            font-size: 11px;
                            color: #555;
                        }
                        
                        .class-card {
                            background: #f8fafc;
                            border-left: 3px solid #0e5d75;
                            padding: 4px;
                            margin-bottom: 4px;
                            border-radius: 0 4px 4px 0;
                        }
                        
                        .class-time {
                            font-weight: 800;
                            font-size: 11px;
                            color: #000;
                        }
                        
                        .class-aula {
                            font-size: 11px;
                            color: #555;
                            margin-top: 1px;
                        }
                    </style>
                </head>
                <body>
                    <div class='header'>
                        <div class='header-row'>
                            <div class='header-logo'>
                                <img src='${logoUrl}' alt='Universidad de Pamplona' />
                                <div class='header-title-container'>
                                    <h1 class='header-title-main'>Universidad de Pamplona</h1>
                                    <p class='header-title-sub'>Sistema Automatizado de Registro de Asistencia (SARA)</p>
                                </div>
                            </div>
                            <div class='header-meta'>
                                <h2 class='header-meta-doc'>Horario Semanal de Clases</h2>
                                <p class='header-meta-date'>${fechaPrintFormatted}</p>
                                <p class='header-meta-by'>
                                    Generado por: <strong>${genNombre}</strong> (${genRol})
                                    <br/>
                                    <strong>${propRol}:</strong> ${propNombre} ${propDoc ? `(C.C. ${propDoc})` : ''}
                                </p>
                            </div>
                        </div>
                        <div class='accent-bar'></div>
                    </div>
                    
                    <table class='schedule-table'>
                        <thead>
                            <tr>
                                <th style="width: 20%;">Materia</th>
                                ${DIAS.map(d => `<th style="width: 11.4%;">${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${filas.map((fila: any) => `
                                <tr>
                                    <td class="materia-cell">
                                        <div class="materia-code">${fila.cod_asignatura}</div>
                                        <div class="materia-name">${fila.asignatura}</div>
                                        <div class="materia-info">Grupo: ${fila.grupo}</div>
                                        ${fila.docente ? `<div class="materia-info">Docente: ${fila.docente}</div>` : ''}
                                    </td>
                                    ${DIAS.map(dia => {
                                        const clases = fila.clasesPorDia[dia] || [];
                                        return `
                                            <td>
                                                ${clases.map((clase: any) => `
                                                    <div class="class-card">
                                                        <div class="class-time">⏱️ ${clase.hora_inicio} - ${clase.hora_fin}</div>
                                                        <div class="class-aula">📍 Aula: ${clase.aula}</div>
                                                    </div>
                                                `).join('')}
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!iframeDoc) return;

        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        }, 300);
    };

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

    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({
        "Lunes": true,
        "Martes": true,
        "Miercoles": true,
        "Jueves": true,
        "Viernes": true,
        "Sabado": true,
        "Domingo": true
    });

    const toggleDay = (dia: string) => {
        setExpandedDays(prev => ({ ...prev, [dia]: !prev[dia] }));
    };

    const clasesPorDiaMovi: Record<string, {
        cod_asignatura: string;
        asignatura: string;
        grupo: string;
        docente: string;
        hora_inicio: string;
        hora_fin: string;
        aula: string;
    }[]> = {
        "Lunes": [],
        "Martes": [],
        "Miercoles": [],
        "Jueves": [],
        "Viernes": [],
        "Sabado": [],
        "Domingo": []
    };

    horarios.forEach(h => {
        const diaNorm = DIA_MAP[h.dia_semana.toLowerCase()] || "Lunes";
        if (clasesPorDiaMovi[diaNorm]) {
            clasesPorDiaMovi[diaNorm].push({
                cod_asignatura: h.cod_asignatura,
                asignatura: h.asignatura,
                grupo: h.grupo,
                docente: h.docente,
                hora_inicio: h.hora_inicio,
                hora_fin: h.hora_fin,
                aula: h.aula
            });
        }
    });

    Object.keys(clasesPorDiaMovi).forEach(dia => {
        clasesPorDiaMovi[dia].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    });

    const formatHora = (h: string) => h && h.length > 5 ? h.slice(0, 5) : h;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-12 h-12 border-4 border-[#0e5d75] border-t-transparent rounded-full animate-spin" />
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
                        <Calendar className="text-[#c9a84c]" size={28} /> Mi Horario Semanal
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">
                        Formato oficial e institucional de asignación académica semanal.
                    </p>
                </div>
                <div>
                    <button
                        onClick={handleImprimirHorario}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                        <Printer size={14} /> Imprimir Horario
                    </button>
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
                <>
                    {/* Vista Escritorio (Tabla original) */}
                    <div className="hidden md:block w-full overflow-x-auto rounded-3xl border border-gray-200/80 shadow-md bg-white print:border-gray-300 print:shadow-none">
                        <table className="w-full border-collapse min-w-[1000px] print:min-w-full">
                            <thead>
                                <tr className="bg-[#0e5d75] border-b-[3px] border-[#c9a84c] text-white text-[11px] font-black uppercase tracking-wider print:bg-[#0e5d75] print:border-b-[3px] print:border-[#c9a84c] print:text-white">
                                    <th className="py-3 px-4 text-center border-r border-gray-300/40 w-[220px]">Materia</th>
                                    {DIAS.map(dia => (
                                        <th key={dia} className="py-3 px-3 text-center border-r border-gray-300/40 last:border-r-0 font-bold">{dia}</th>
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
                                                    <p className="text-[11px] font-black text-black uppercase leading-tight print:text-black">{fila.asignatura}</p>
                                                    <p className="text-[10px] text-gray-500 font-semibold">Grupo : {fila.grupo}</p>
                                                    {sesion.rol === "Estudiante" && (
                                                        <p className="text-[9px] text-gray-800 font-bold mt-1 uppercase" title={fila.docente}>
                                                            Docente: {fila.docente}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            
                                            {/* Columnas de Días */}
                                            {DIAS.map(dia => {
                                                const clases = fila.clasesPorDia[dia] || [];
                                                return (
                                                    <td key={dia} className="p-2 border border-gray-200/80 align-top w-[110px] min-w-[110px]">
                                                        <div className="flex flex-col gap-2">
                                                            {clases.map((clase, cIdx) => (
                                                                <div 
                                                                    key={cIdx} 
                                                                    className="bg-slate-50 border-l-4 border-[#0e5d75] p-2 rounded-r-lg shadow-sm text-left flex flex-col gap-1 transition-all hover:bg-slate-100/80 print:bg-slate-50 print:border-[#0e5d75]"
                                                                >
                                                                    <div className="flex items-center gap-1 text-black font-extrabold text-[9px] tracking-tight print:text-black">
                                                                        <Clock size={10} className="text-[#0e5d75] shrink-0" />
                                                                        <span>{clase.hora_inicio} - {clase.hora_fin}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[9px] text-gray-600 font-bold leading-tight">
                                                                        <MapPin size={10} className="text-gray-400 shrink-0" />
                                                                        <span>{clase.aula}</span>
                                                                    </div>
                                                                    <div 
                                                                        className="inline-block self-start px-1.5 py-0.5 bg-gray-200/60 rounded-md text-[8px] font-black text-gray-600 tracking-wider mt-0.5 print:bg-gray-100"
                                                                        title={fila.docente}
                                                                    >
                                                                        {fila.cod_asignatura}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista Móvil (Acordeón de Clases por Día) */}
                    <div className="block md:hidden space-y-4 no-print">
                        {DIAS.map(dia => {
                            const clases = clasesPorDiaMovi[dia] || [];
                            if (clases.length === 0) return null;

                            const isExpanded = !!expandedDays[dia];

                            return (
                                <div key={dia} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                                    {/* Cabecera del Día (Acordeón) */}
                                    <button
                                        type="button"
                                        onClick={() => toggleDay(dia)}
                                        className="w-full flex justify-between items-center p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors border-b border-gray-100/50 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#0e5d75]" />
                                            <span className="font-black text-sm text-[#1A1A2E]">{dia}</span>
                                            <span className="px-2 py-0.5 bg-gray-200/60 text-gray-600 rounded-md text-[10px] font-black tracking-wide">
                                                {clases.length} {clases.length === 1 ? 'clase' : 'clases'}
                                            </span>
                                        </div>
                                        <div>
                                            {isExpanded ? (
                                                <ChevronUp size={16} className="text-gray-400" />
                                            ) : (
                                                <ChevronDown size={16} className="text-gray-400" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Contenido Colapsable */}
                                    {isExpanded && (
                                        <div className="p-4 space-y-3 bg-white divide-y divide-gray-50">
                                            {clases.map((clase, cIdx) => (
                                                <div key={cIdx} className="pt-3 first:pt-0 space-y-2">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div>
                                                            <p className="text-[10px] text-gray-400 font-extrabold tracking-wider">{clase.cod_asignatura}</p>
                                                            <p className="text-xs font-black text-black uppercase leading-snug">{clase.asignatura}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold mt-0.5">Grupo: {clase.grupo}</p>
                                                        </div>
                                                        <span className="px-2 py-0.5 bg-slate-50 border-l-2 border-[#0e5d75] rounded text-[9px] font-black text-gray-600 tracking-wider">
                                                            Aula: {clase.aula}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                                                        <div className="flex items-center gap-1.5 text-gray-700 font-bold">
                                                            <Clock size={12} className="text-[#0e5d75] shrink-0" />
                                                            <span>{formatHora(clase.hora_inicio)} - {formatHora(clase.hora_fin)}</span>
                                                        </div>
                                                        {sesion.rol === "Estudiante" && clase.docente && (
                                                            <div className="flex items-center gap-1.5 text-gray-500 font-bold">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                                <span>Docente: {clase.docente}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
