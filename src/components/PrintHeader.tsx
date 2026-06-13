"use client";

import React from "react";

interface PrintHeaderProps {
    tituloReporte: string;
    nombreUsuario: string;
    rolUsuario: string;
    identificadorUsuario?: string;
    semestreActual?: string;
    fechaImpresion?: string;
}

export default function PrintHeader({
    tituloReporte,
    nombreUsuario,
    rolUsuario,
    identificadorUsuario,
    semestreActual,
    fechaImpresion,
}: PrintHeaderProps) {
    const fecha = fechaImpresion || new Date().toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short"
    });

    return (
        <div className="only-print w-full bg-white border-b-2 pb-4 mb-6" style={{ borderColor: "#0e5d75" }}>
            {/* Barra de color superior */}
            <div className="h-1.5 bg-gradient-to-r from-[#0e5d75] via-[#C9A84C] to-[#1e1e30] mb-6 -mx-6" />
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <img 
                        src="/logo_unipamplona.png" 
                        alt="Logo Universidad de Pamplona" 
                        className="h-16 w-auto shrink-0" 
                    />
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black tracking-tight uppercase animate-fade-in" style={{ color: "#0e5d75", fontFamily: "Inter, sans-serif" }}>
                            UNIVERSIDAD DE PAMPLONA
                        </h1>
                        <p className="text-[9px] font-extrabold uppercase tracking-widest mt-0.5" style={{ color: "#C9A84C", fontFamily: "Inter, sans-serif" }}>
                            SISTEMA AUTOMATIZADO DE REGISTRO DE ASISTENCIA (SARA)
                        </p>
                    </div>
                </div>
                <div className="text-right flex flex-col justify-end items-end">
                    <h2 className="text-xs font-black uppercase tracking-wider max-w-[320px]" style={{ color: "#0e5d75", fontFamily: "Inter, sans-serif" }}>
                        {tituloReporte}
                    </h2>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">
                        Generado el {fecha}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                        {identificadorUsuario 
                            ? `${rolUsuario}: ${nombreUsuario} (${identificadorUsuario})` 
                            : `${rolUsuario}: ${nombreUsuario}`}
                    </p>
                    {semestreActual && (
                        <p className="text-[9px] text-[#C9A84C] font-extrabold uppercase tracking-wider mt-0.5">
                            Semestre Activo • {semestreActual}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
