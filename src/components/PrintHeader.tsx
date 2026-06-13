import React from "react";

interface PrintHeaderProps {
    titulo: string;
    nombreUsuario: string;
    rol: string;
    documento?: string;
    semestre?: string;
    fecha?: string;
}

export default function PrintHeader({
    titulo,
    nombreUsuario,
    rol,
    documento,
    semestre,
    fecha
}: PrintHeaderProps) {
    const defaultFecha = fecha || new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    // Capitalize first letter of date
    const formattedFecha = defaultFecha.charAt(0).toUpperCase() + defaultFecha.slice(1);

    return (
        <div className="only-print w-full mb-6 pb-4 border-b-[2.5px] border-[#0e5d75]">
            <div className="flex justify-between items-center">
                {/* Logo and Institution Info */}
                <div className="flex items-center gap-4">
                    <img 
                        src="/logo_unipamplona.png" 
                        alt="Universidad de Pamplona" 
                        className="h-16 w-auto object-contain"
                    />
                    <div className="flex flex-col">
                        <h1 className="text-base font-extrabold text-[#0e5d75] uppercase tracking-wide leading-tight">
                            Universidad de Pamplona
                        </h1>
                        <p className="text-[10px] font-bold text-[#c9a84c] uppercase tracking-wider mt-0.5">
                            Sistema Automatizado de Registro de Asistencia (SARA)
                        </p>
                    </div>
                </div>

                {/* Report Metadata */}
                <div className="text-right">
                    <h2 className="text-sm font-black text-[#0e5d75] uppercase tracking-wide">
                        {titulo}
                    </h2>
                    <p className="text-[10px] text-gray-600 font-medium mt-1">
                        {formattedFecha}
                    </p>
                    <p className="text-[9px] text-gray-500 font-medium mt-0.5 leading-tight">
                        Generado por: <span className="font-bold text-gray-800">{nombreUsuario}</span> ({rol})
                        {documento && <><br />Documento: <span className="font-bold text-gray-800">{documento}</span></>}
                        {semestre && <><br />Semestre: <span className="font-bold text-gray-800">{semestre}</span></>}
                    </p>
                </div>
            </div>
            
            {/* Elegant institutional double line accent */}
            <div className="w-full h-1 bg-[#c9a84c] mt-2.5 rounded-full" />
        </div>
    );
}
