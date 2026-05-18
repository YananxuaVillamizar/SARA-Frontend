"use client";
import React, { useEffect, useState } from "react";
import {
    ClipboardCheck, AlertCircle, CheckCircle2, XCircle,
    Clock, Calendar, FileText, Send, User, BookOpen, School, GraduationCap
} from "lucide-react";
import { getSesion } from "@/services/auth";
import { obtenerReporteEstudiante, obtenerReporteDocente, listarAsistencias, actualizarAsistencia } from "@/services/asistencias";
import {
    listarContingenciasEstudiante, crearContingencia,
    listarContingenciasPendientes, revisarContingencia,
    listarSesiones, crearSesion, listarTodasContingencias
} from "@/services/contingencias";
import { listarHorarios, Horario, listarSemestres } from "@/services/admin";

// Componentes Reutilizables de Estilo
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-3xl border border-gray-100 p-6 shadow-sm ${className}`}>
        {children}
    </div>
);

const Badge = ({ children, color }: { children: React.ReactNode, color: string }) => (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${color}`}>
        {children}
    </span>
);

export default function AsistenciasPage() {
    const [sesion, setSesion] = useState({ id: "", num_doc: "", rol: "", nombre: "" });
    const [loading, setLoading] = useState(true);
    const [reporte, setReporte] = useState<any[]>([]);
    const [contingencias, setContingencias] = useState<any[]>([]);
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [modal, setModal] = useState(false);
    const [error, setError] = useState("");

    // Formulario Nueva Contingencia
    const [fCont, setFCont] = useState({ tipo: "justificacion", descripcion: "", archivo_url: "" });
    const [asistenciasRaw, setAsistenciasRaw] = useState<any[]>([]);

    // Filtros tabla asistencias
    const [filtAEstudiante, setFiltAEstudiante] = useState("");
    const [filtAAsignatura, setFiltAAsignatura] = useState("");
    const [filtAMetodo, setFiltAMetodo] = useState("");
    const [filtAEstado, setFiltAEstado] = useState("");
    const [showAMetodoSugg, setShowAMetodoSugg] = useState(false);
    const [showAEstadoSugg, setShowAEstadoSugg] = useState(false);
    // Edición de estado
    const [editingEstadoId, setEditingEstadoId] = useState<string | null>(null);

    const handleCambiarEstado = async (asistenciaId: string, nuevoEstado: string) => {
        try {
            await actualizarAsistencia(asistenciaId, { estado: nuevoEstado });
            setAsistenciasRaw(prev => prev.map(a => a.id === asistenciaId ? { ...a, estado: nuevoEstado } : a));
            setEditingEstadoId(null);
        } catch (error) {
            console.error("Error al actualizar estado:", error);
            setError("Hubo un error al actualizar la asistencia");
        }
    };
    // Grupos expandidos
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const toggleGroup = (key: string) => setExpandedGroups(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
    const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
    const toggleSession = (key: string) => setExpandedSessions(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
    const [activeTab, setActiveTab] = useState("asistencias");
    const [filtAFacultad, setFiltAFacultad] = useState("");
    const [filtAPrograma, setFiltAPrograma] = useState("");
    const [filtASemana, setFiltASemana] = useState("");
    const [filtADia, setFiltADia] = useState("");
    const [filtAFecha, setFiltAFecha] = useState("");
    const [filtAAula, setFiltAAula] = useState("");
    const [showADiaSugg, setShowADiaSugg] = useState(false);
    const [showAFacultadSugg, setShowAFacultadSugg] = useState(false);
    const [showAProgramaSugg, setShowAProgramaSugg] = useState(false);
    const [showAAsignaturaSugg, setShowAAsignaturaSugg] = useState(false);
    const [showASemanaSugg, setShowASemanaSugg] = useState(false);
    const [showAAulaSugg, setShowAAulaSugg] = useState(false);
    const [dateError, setDateError] = useState("");
    const [semanasSemestre, setSemanasSemestre] = useState(16);
    const [fechaInicioSemestre, setFechaInicioSemestre] = useState<string | null>(null);


    useEffect(() => {
        const init = async () => {
            const s = getSesion();
            setSesion({ id: s.id || "", num_doc: s.num_doc || "", rol: s.rol || "", nombre: s.nombre || "" });

            try {
                // Calcular semanas del semestre
                const sems = await listarSemestres();
                const act = sems.find((x: any) => x.activo);
                if (act) {
                    const inicio = new Date(act.fecha_inicio);
                    const fin = new Date(act.fecha_fin);
                    const diff = fin.getTime() - inicio.getTime();
                    const weeks = Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
                    setSemanasSemestre(weeks);
                    setFechaInicioSemestre(act.fecha_inicio);
                }

                if (s.rol === "Estudiante") {
                    const [rep, cont, asis] = await Promise.all([
                        obtenerReporteEstudiante(s.num_doc!),
                        listarContingenciasEstudiante(s.num_doc!),
                        listarAsistencias({ usuario_id: s.id || undefined })
                    ]);
                    setReporte(Array.isArray(rep) ? rep : []);
                    setContingencias(cont);
                    setAsistenciasRaw(asis);
                } else if (s.rol === "Docente") {
                    const [rep, pend, hor, asis] = await Promise.all([
                        obtenerReporteDocente(s.num_doc!),
                        listarContingenciasPendientes(),
                        listarHorarios(),
                        listarAsistencias({ docente_id: s.id || undefined })
                    ]);
                    setReporte(Array.isArray(rep) ? rep : []);
                    setContingencias(pend);
                    // Solo horarios de este docente
                    setHorarios(hor.filter(h => h.docente_id === s.id));
                    setAsistenciasRaw(asis);
                } else {
                    // Admin
                    const [cont, ses, asis] = await Promise.all([
                        listarTodasContingencias(),
                        listarSesiones(),
                        listarAsistencias()
                    ]);
                    setContingencias(cont);
                    setReporte(ses); // Reutilizamos el estado reporte para sesiones en Admin
                    setAsistenciasRaw(asis);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        init();
    }, []);

    const handleCrearContingencia = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await crearContingencia({ ...fCont, solicitante_id: sesion.id });
            setContingencias(await listarContingenciasEstudiante(sesion.num_doc));
            setModal(false);
            setFCont({ tipo: "justificacion", descripcion: "", archivo_url: "" });
        } catch (e: any) { setError(e.message); }
    };

    const handleRevisar = async (id: string, estado: string) => {
        try {
            await revisarContingencia(id, { revisor_id: sesion.id, estado });
            setContingencias(await listarContingenciasPendientes());
        } catch (e: any) { alert(e.message); }
    };



    if (loading) return <div className="p-10 text-center animate-pulse font-bold text-gray-400">Cargando módulo de asistencias...</div>;

    return (
        <div className="space-y-8">
            {/* CABECERA */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-sidebar-bg">Gestión de Asistencias</h1>
                    <p className="text-gray-400 font-medium">Panel de control y seguimiento académico</p>
                </div>
                {sesion.rol === "Estudiante" && (
                    <button onClick={() => setModal(true)} className="px-6 py-3 bg-sara-red text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-sara-red/20">
                        <Send size={18} /> Nueva Justificación
                    </button>
                )}
            </div>

            {/* TABS DE NAVEGACIÓN */}
            <div className="flex gap-6 border-b border-gray-100">
                <button onClick={() => setActiveTab("asistencias")} className={`pb-4 text-sm font-black uppercase tracking-wider transition-colors ${activeTab === "asistencias" ? "text-sara-red border-b-2 border-sara-red" : "text-gray-400 hover:text-gray-600"}`}>
                    Asistencias
                </button>
                <button onClick={() => setActiveTab("contingencias")} className={`pb-4 text-sm font-black uppercase tracking-wider transition-colors ${activeTab === "contingencias" ? "text-sara-red border-b-2 border-sara-red" : "text-gray-400 hover:text-gray-600"}`}>
                    Contingencias {contingencias.length > 0 && <span className="ml-1 bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full text-[10px]">{contingencias.length}</span>}
                </button>
            </div>

            {activeTab === "asistencias" && (
                <div className="space-y-6">
                    {/* SECCIÓN REGISTROS DE ASISTENCIA */}
                    {(sesion.rol === "Administrativo" || sesion.rol === "Docente" || sesion.rol === "Estudiante") && (() => {
                        const isEstudiante = sesion.rol === "Estudiante";
                        const normalizar = (s: string) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
                        const currentWeek = asistenciasRaw.reduce((max, a) => {
                            const sem = typeof a.semana === 'string' ? parseInt(a.semana) : a.semana;
                            return sem > max ? sem : max;
                        }, 0) || 14;
                        const facultades = Array.from(new Set(asistenciasRaw.map(a => a.facultad).filter(Boolean)));
                        const programas = Array.from(new Set(
                            asistenciasRaw
                                .filter(a => !filtAFacultad || a.facultad === filtAFacultad)
                                .map(a => a.programa)
                                .filter(Boolean)
                        ));
                        const asignaturas = Array.from(new Set(
                            asistenciasRaw
                                .filter(a => (!filtAFacultad || a.facultad === filtAFacultad) && (!filtAPrograma || a.programa === filtAPrograma))
                                .map(a => a.asignatura)
                                .filter(Boolean)
                        ));
                        const aulas = Array.from(new Set(
                            asistenciasRaw
                                .filter(a => (!filtAFacultad || a.facultad === filtAFacultad) && (!filtAPrograma || a.programa === filtAPrograma) && (!filtAAsignatura || a.asignatura === filtAAsignatura))
                                .map(a => a.aula_sesion || a.aula)
                                .filter(Boolean)
                        ));
                        // 1. Agrupar TODO primero
                        const allGroups: any = {};
                        asistenciasRaw.forEach(a => {
                            const fac = a.facultad || "Sin Facultad";
                            const prog = a.programa || "Sin Programa";
                            const asig = a.asignatura || "Sin Asignatura";
                            const grup = a.grupo || "Sin Grupo";
                            const sesionKey = a.sesion_id || a.fecha || "sin-sesion";

                            if (!allGroups[fac]) allGroups[fac] = {};
                            if (!allGroups[fac][prog]) allGroups[fac][prog] = {};
                            if (!allGroups[fac][prog][asig]) allGroups[fac][prog][asig] = {};
                            if (!allGroups[fac][prog][asig][grup]) {
                                allGroups[fac][prog][asig][grup] = {
                                    aula: a.aula,
                                    docente: `${a.nombre_docente} ${a.apellido_docente}`,
                                    horarios: [],
                                    sesiones: {},
                                    codAsig: a.cod_asignatura
                                };
                            }

                            const horObj = { dia: a.dia_semana, horas: `${a.hora_inicio}–${a.hora_fin}`, aula: a.aula };
                            const exists = allGroups[fac][prog][asig][grup].horarios.some((h: any) => h.dia === a.dia_semana && h.horas === horObj.horas && h.aula === a.aula);
                            if (a.dia_semana && !exists) {
                                allGroups[fac][prog][asig][grup].horarios.push(horObj);
                            }

                            if (!allGroups[fac][prog][asig][grup].sesiones[sesionKey]) {
                                allGroups[fac][prog][asig][grup].sesiones[sesionKey] = {
                                    sesion_id: a.sesion_id,
                                    fecha: a.fecha,
                                    aula_sesion: a.aula_sesion || a.aula,
                                    docente_asistio: a.docente_asistio,
                                    semana: a.semana,
                                    records: []
                                };
                            }

                            if (a.num_doc) {
                                allGroups[fac][prog][asig][grup].sesiones[sesionKey].records.push({
                                    id: a.id,
                                    num_doc: a.num_doc,
                                    nombre: a.nombre,
                                    apellido: a.apellido,
                                    estado: a.estado,
                                    metodo_verificacion: a.metodo_verificacion,
                                    hora_entrada: a.hora_entrada,
                                    hora_salida: a.hora_salida,
                                    cod_asignatura: a.cod_asignatura
                                });
                            }
                        });

                        // 2. Filtrar grupos
                        const filteredFaculties: any = {};
                        let filteredCount = 0;

                        for (const fac in allGroups) {
                            for (const prog in allGroups[fac]) {
                                for (const asig in allGroups[fac][prog]) {
                                    for (const grup in allGroups[fac][prog][asig]) {
                                        const grupoData = allGroups[fac][prog][asig][grup];

                                        // Filtro de día: Verifica si el grupo tiene al menos una sesión en ese día
                                        const matchDia = !filtADia || grupoData.horarios.some((h: any) => h.dia && h.dia.toLowerCase().includes(filtADia.toLowerCase()));
                                        const matchFac = !filtAFacultad || fac === filtAFacultad;
                                        const matchProg = !filtAPrograma || prog === filtAPrograma;
                                        const matchAsig = !filtAAsignatura || asig === filtAAsignatura;
                                        const matchAula = !filtAAula || grupoData.aula === filtAAula || Object.values(grupoData.sesiones).some((s: any) => s.aula_sesion === filtAAula);

                                        if (matchDia && matchFac && matchProg && matchAsig && matchAula) {
                                            if (!filteredFaculties[fac]) filteredFaculties[fac] = {};
                                            if (!filteredFaculties[fac][prog]) filteredFaculties[fac][prog] = {};
                                            if (!filteredFaculties[fac][prog][asig]) filteredFaculties[fac][prog][asig] = {};

                                            // Filtrar sesiones y registros
                                            const filteredSessions: any = {};
                                            for (const sKey in grupoData.sesiones) {
                                                const sData = grupoData.sesiones[sKey];

                                                const matchSemana = !filtASemana || sData.semana?.toString() === filtASemana;
                                                // Handle date match (sData.fecha might be ISO or YYYY-MM-DD)
                                                const matchFecha = !filtAFecha || (sData.fecha && sData.fecha.includes(filtAFecha));

                                                const filteredRecords = sData.records.filter((r: any) => {
                                                    const matchEst = !filtAEstudiante || normalizar(`${r.nombre} ${r.apellido} ${r.num_doc}`).includes(normalizar(filtAEstudiante));
                                                    return matchEst;
                                                });

                                                if (matchSemana && matchFecha && (filteredRecords.length > 0 || !filtAEstudiante)) {
                                                    filteredSessions[sKey] = { ...sData, records: filteredRecords };
                                                    // Only count records if the session matches!
                                                    filteredCount += filteredRecords.length;
                                                }
                                            }
                                            console.log(`Grupo ${grup}, filtASemana=${filtASemana}, filteredSessions keys=${Object.keys(filteredSessions)}`);

                                            // Generate virtual sessions if filtering by week and no sessions found
                                            // Generate virtual sessions if filtering by week and no sessions found
                                            const validSessions = Object.keys(filteredSessions).filter(k => k !== 'sin-sesion');
                                            if (filtASemana && validSessions.length === 0 && !filtAEstudiante) {
                                                const weekNum = parseInt(filtASemana);

                                                grupoData.horarios.forEach((h: any) => {
                                                    const sKey = `virtual-${filtASemana}-${h.dia}`;
                                                    let reason = "";
                                                    if (weekNum < currentWeek) {
                                                        reason = "Docente no asistió";
                                                    } else if (weekNum > currentWeek) {
                                                        reason = "No completada por fecha";
                                                    } else {
                                                        reason = "Docente no asistió"; // Fallback for current week if missing
                                                    }

                                                    let calculatedFecha = `2026-01-01`; // Fallback
                                                    if (fechaInicioSemestre) {
                                                        const [sy, sm, sd] = fechaInicioSemestre.split('-').map(Number);
                                                        const startObj = new Date(sy, sm - 1, sd);
                                                        const getJSMap = (day: number) => (day === 0 ? 6 : day - 1);
                                                        const dStart = getJSMap(startObj.getDay());

                                                        const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
                                                        const dTarget = days.indexOf(h.dia.toLowerCase());
                                                        const offset = (dTarget - dStart + 7) % 7;
                                                        const diasToAdd = (weekNum - 1) * 7 + offset;

                                                        const targetDate = new Date(startObj);
                                                        targetDate.setDate(startObj.getDate() + diasToAdd);

                                                        const yyyy = targetDate.getFullYear();
                                                        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
                                                        const dd = String(targetDate.getDate()).padStart(2, '0');
                                                        calculatedFecha = `${yyyy}-${mm}-${dd}`;
                                                    }

                                                    filteredSessions[sKey] = {
                                                        fecha: calculatedFecha,
                                                        dia_virtual: h.dia,
                                                        semana: weekNum,
                                                        docente_asistio: false,
                                                        isVirtual: true,
                                                        reason: reason,
                                                        records: []
                                                    };
                                                });
                                            }

                                            if (Object.keys(filteredSessions).length > 0) {
                                                filteredFaculties[fac][prog][asig][grup] = { ...grupoData, sesiones: filteredSessions };
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        return (
                            <div className="space-y-4">
                                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <ClipboardCheck size={16} /> {isEstudiante ? "Mis Asignaturas y Asistencia" : "Registros de Asistencia"}
                                    {!isEstudiante && (
                                        <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{filteredCount} registros</span>
                                    )}
                                </h2>

                                {/* FILTROS */}
                                {!isEstudiante && (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            <div className="relative">
                                                <input type="text" placeholder="Facultad..." readOnly value={filtAFacultad} onFocus={() => setShowAFacultadSugg(true)} onBlur={() => setTimeout(() => setShowAFacultadSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                                {filtAFacultad && <button type="button" onClick={() => setFiltAFacultad("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {showAFacultadSugg && (
                                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                        {facultades.map(f => (
                                                            <button key={f} type="button" onMouseDown={() => { setFiltAFacultad(f); setShowAFacultadSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{f}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input type="text" placeholder="Programa..." readOnly value={filtAPrograma} onFocus={() => setShowAProgramaSugg(true)} onBlur={() => setTimeout(() => setShowAProgramaSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                                {filtAPrograma && <button type="button" onClick={() => setFiltAPrograma("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {showAProgramaSugg && (
                                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                        {programas.map(p => (
                                                            <button key={p} type="button" onMouseDown={() => { setFiltAPrograma(p); setShowAProgramaSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{p}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input type="text" placeholder="Asignatura..." readOnly value={filtAAsignatura} onFocus={() => setShowAAsignaturaSugg(true)} onBlur={() => setTimeout(() => setShowAAsignaturaSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                                {filtAAsignatura && <button type="button" onClick={() => setFiltAAsignatura("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {showAAsignaturaSugg && (
                                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                        {asignaturas.map(a => (
                                                            <button key={a} type="button" onMouseDown={() => { setFiltAAsignatura(a); setShowAAsignaturaSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{a}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input type="text" placeholder="Aula..." readOnly value={filtAAula} onFocus={() => setShowAAulaSugg(true)} onBlur={() => setTimeout(() => setShowAAulaSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                                {filtAAula && <button type="button" onClick={() => setFiltAAula("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {showAAulaSugg && (
                                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                        {aulas.map(a => (
                                                            <button key={a} type="button" onMouseDown={() => { setFiltAAula(a); setShowAAulaSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{a}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input type="text" placeholder="Estudiante..." value={filtAEstudiante} onChange={e => setFiltAEstudiante(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all" />
                                                {filtAEstudiante && <button type="button" onClick={() => setFiltAEstudiante("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                            </div>

                                            <div className="relative">
                                                <input type="text" placeholder="Método..." readOnly value={filtAMetodo} onFocus={() => setShowAMetodoSugg(true)} onBlur={() => setTimeout(() => setShowAMetodoSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                                {filtAMetodo && <button type="button" onClick={() => setFiltAMetodo("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {showAMetodoSugg && (
                                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1">
                                                        {["Biometría", "Firma Electrónica"].map(m => (
                                                            <button key={m} type="button" onMouseDown={() => { setFiltAMetodo(m); setShowAMetodoSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{m}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input type="text" placeholder="Estado..." readOnly value={filtAEstado} onFocus={() => setShowAEstadoSugg(true)} onBlur={() => setTimeout(() => setShowAEstadoSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                                {filtAEstado && <button type="button" onClick={() => setFiltAEstado("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {showAEstadoSugg && (
                                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1">
                                                        {["asistencia", "asistencia con retraso", "inasistencia"].map(e => (
                                                            <button key={e} type="button" onMouseDown={() => { setFiltAEstado(e); setShowAEstadoSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer capitalize">{e}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <input type="text" placeholder="Semana..." readOnly value={filtASemana ? `Semana ${filtASemana}` : ""} onFocus={() => setShowASemanaSugg(true)} onBlur={() => setTimeout(() => setShowASemanaSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                                {filtASemana && <button type="button" onClick={() => setFiltASemana("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {showASemanaSugg && (
                                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                        {Array.from({ length: semanasSemestre }, (_, i) => i + 1).map(w => (
                                                            <button key={w} type="button" onMouseDown={() => { setFiltASemana(w.toString()); setShowASemanaSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">Semana {w}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <input type="text" placeholder="Día..." readOnly value={filtADia} onFocus={() => setShowADiaSugg(true)} onBlur={() => setTimeout(() => setShowADiaSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                                {filtADia && <button type="button" onClick={() => setFiltADia("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {showADiaSugg && (
                                                    <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1">
                                                        {["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"].map(d => (
                                                            <button key={d} type="button" onMouseDown={() => { setFiltADia(d.charAt(0).toUpperCase() + d.slice(1)); setShowADiaSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer capitalize">{d}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="relative">
                                                <input type="date" value={filtAFecha} onChange={e => {
                                                    const date = new Date(e.target.value);
                                                    if (date.getUTCDay() === 0) {
                                                        setDateError("No hay clases los domingos.");
                                                        setFiltAFecha("");
                                                    } else {
                                                        setDateError("");
                                                        setFiltAFecha(e.target.value);
                                                    }
                                                }} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all" />
                                                {filtAFecha && <button type="button" onClick={() => setFiltAFecha("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                                {dateError && <p className="text-red-500 text-[10px] mt-0.5 absolute">{dateError}</p>}
                                            </div>
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <button type="button" onClick={() => {
                                                setFiltAFacultad("");
                                                setFiltAPrograma("");
                                                setFiltAAsignatura("");
                                                setFiltAEstudiante("");
                                                setFiltAMetodo("");
                                                setFiltAEstado("");
                                                setFiltASemana("");
                                                setFiltADia("");
                                                setFiltAFecha("");
                                                setFiltAAula("");
                                            }} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                                                <XCircle size={14} /> Limpiar Todos los Filtros
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* TARJETAS AGRUPADAS POR FACULTAD Y PROGRAMA */}
                                <div className="space-y-6">
                                    {(() => {
                                        const grouped = filteredFaculties;

                                        const facEntries = Object.entries(grouped);
                                        if (facEntries.length === 0) {
                                            return <p className="text-gray-400 text-sm italic text-center py-10">No hay registros que coincidan.</p>;
                                        }

                                        return facEntries.map(([facultad, programas]: [string, any]) => (
                                            <div key={facultad} className="space-y-4">
                                                <h3 className="text-lg font-black text-sidebar-bg flex items-center gap-2 border-b border-gray-100 pb-2">
                                                    <School size={20} className="text-sara-red" /> {facultad}
                                                </h3>

                                                <div className="space-y-6 ml-2 md:ml-6">
                                                    {Object.entries(programas).map(([programa, asignaturas]: [string, any]) => (
                                                        <div key={programa} className="space-y-3">
                                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                                <GraduationCap size={14} /> {programa}
                                                            </h4>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {Object.entries(asignaturas).map(([asignatura, grupos]: [string, any]) => {
                                                                    const codAsig = (Object.values(grupos)[0] as any)?.codAsig || "S/C";
                                                                    return (
                                                                        <div key={asignatura} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
                                                                            {(() => {
                                                                                const allGrupRecords = Object.values(grupos).flatMap((g: any) => Object.values(g.sesiones).flatMap((s: any) => s.docente_asistio ? s.records : []));
                                                                                const totalAsig = allGrupRecords.length;
                                                                                const presAsig = allGrupRecords.filter((r: any) => r.estado === "asistencia" || r.estado === "asistencia con retraso").length;
                                                                                const pctAsig = totalAsig > 0 ? Math.round((presAsig / totalAsig) * 100) : 0;
                                                                                return (
                                                                                    <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                                                                        <p className="font-black text-sidebar-bg text-sm">
                                                                                            {asignatura} <span className="text-xs font-bold text-gray-400">({codAsig})</span>
                                                                                        </p>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${pctAsig >= 80 ? "bg-green-50 text-green-700" : pctAsig >= 60 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                                                                                                {pctAsig}% Asist.
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })()}

                                                                            <div className="divide-y divide-gray-50">
                                                                                {Object.entries(grupos).map(([grupoName, grupoData]: [string, any]) => {
                                                                                    const recordsArray = Object.values(grupoData.sesiones).flatMap((s: any) => s.docente_asistio ? s.records : []);
                                                                                    const total = recordsArray.length;
                                                                                    const presentes = recordsArray.filter((r: any) => r.estado === "asistencia" || r.estado === "asistencia con retraso").length;
                                                                                    const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
                                                                                    const key = `${asignatura}||${grupoName}`;
                                                                                    const isOpen = expandedGroups.has(key);

                                                                                    return (
                                                                                        <div key={grupoName}>
                                                                                            <button type="button" onClick={() => toggleGroup(key)} className="w-full flex items-center justify-between gap-4 px-4 py-2 hover:bg-gray-50/60 transition-colors text-left">
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                                                                                        <span className="text-xs font-bold text-gray-700">Grupo {grupoName}</span>
                                                                                                        <span className="text-[10px] text-gray-400 self-center">Docente: {grupoData.docente}</span>
                                                                                                    </div>
                                                                                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4 mt-1.5 justify-between">
                                                                                                        <div className="space-y-1">
                                                                                                            {grupoData.horarios.sort((a: any, b: any) => {
                                                                                                                const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
                                                                                                                return days.indexOf(a.dia.toLowerCase()) - days.indexOf(b.dia.toLowerCase());
                                                                                                            }).map((h: any, idx: number) => (
                                                                                                                <div key={idx} className="flex items-center gap-3 text-[10px] text-gray-400">
                                                                                                                    <span className="font-bold text-gray-600 w-16">{h.dia.charAt(0).toUpperCase() + h.dia.slice(1)}</span>
                                                                                                                    <span className="w-24">{h.horas}</span>
                                                                                                                    <span className="bg-gray-100 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-gray-500">Aula {h.aula}</span>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>

                                                                                                        {/* Contenedores de Progreso Circulares Premium Horizontales con Layout Vertical */}
                                                                                                        <div className="flex flex-col sm:flex-row gap-2 shrink-0 items-center">
                                                                                                            {/* Card 1: Progreso de Sesiones */}
                                                                                                            {(() => {
                                                                                                                const totalSemana = semanasSemestre;
                                                                                                                const totalProgramadas = grupoData.horarios.length * totalSemana;
                                                                                                                const sesionesDictadas = Object.values(grupoData.sesiones).filter((s: any) => s.docente_asistio && !s.isVirtual).length;
                                                                                                                const progresoSesiones = totalProgramadas > 0 ? Math.round((sesionesDictadas / totalProgramadas) * 100) : 0;

                                                                                                                return (
                                                                                                                    <div className="flex flex-col items-center justify-center bg-gray-50/80 px-2 py-1.5 rounded-xl border border-gray-100 min-w-[85px] shadow-sm text-center">
                                                                                                                        <p className="text-[8px] font-black text-sidebar-bg uppercase tracking-wider mb-1">Sesiones</p>
                                                                                                                        <div className="relative w-9 h-9 shrink-0">
                                                                                                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                                                                                                                                <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-gray-100" />
                                                                                                                                <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" fill="transparent" strokeDasharray={81.68} strokeDashoffset={81.68 - (81.68 * progresoSesiones) / 100} className="text-sara-red transition-all duration-500" />
                                                                                                                            </svg>
                                                                                                                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-gray-700">{progresoSesiones}%</span>
                                                                                                                        </div>
                                                                                                                        <p className="text-[9px] text-gray-400 font-bold mt-1 whitespace-nowrap">{sesionesDictadas} de {totalProgramadas}</p>
                                                                                                                    </div>
                                                                                                                );
                                                                                                            })()}

                                                                                                            {/* Card 2: Progreso de Asistencia */}
                                                                                                            <div className="flex flex-col items-center justify-center bg-gray-50/80 px-2 py-1.5 rounded-xl border border-gray-100 min-w-[85px] shadow-sm text-center">
                                                                                                                <p className="text-[8px] font-black text-sidebar-bg uppercase tracking-wider mb-1">Asistencia</p>
                                                                                                                <div className="relative w-9 h-9 shrink-0">
                                                                                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                                                                                                                        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-gray-100" />
                                                                                                                        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" fill="transparent" strokeDasharray={81.68} strokeDashoffset={81.68 - (81.68 * pct) / 100} className={pct >= 80 ? "text-green-500" : pct >= 60 ? "text-amber-400" : "text-sara-red"} />
                                                                                                                    </svg>
                                                                                                                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-gray-700">{pct}%</span>
                                                                                                                </div>
                                                                                                                <p className="text-[9px] text-gray-400 font-bold mt-1 whitespace-nowrap">
                                                                                                                    {isEstudiante ? `${presentes} de ${total}` : `${presentes} de ${total}`}
                                                                                                                </p>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2 shrink-0 ml-auto">
                                                                                                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                                                                    </svg>
                                                                                                </div>
                                                                                            </button>

                                                                                            {isOpen && (
                                                                                                <div className="border-t border-gray-100 bg-gray-50/30 p-4 space-y-4">
                                                                                                    {Object.entries(grupoData.sesiones).sort(([, valA]: [string, any], [, valB]: [string, any]) => (valA.fecha || "").localeCompare(valB.fecha || "")).map(([sesionKey, sesionData]: [string, any]) => {
                                                                                                        if (sesionKey === 'sin-sesion') return null;
                                                                                                        const isSessionOpen = expandedSessions.has(sesionKey);
                                                                                                        return (
                                                                                                            <div key={sesionKey} className="space-y-2">
                                                                                                                {(() => {
                                                                                                                    const sTotal = sesionData.records.length;
                                                                                                                    const sPresentes = sesionData.records.filter((r: any) => r.estado === "asistencia" || r.estado === "asistencia con retraso").length;
                                                                                                                    const sPct = sTotal > 0 ? Math.round((sPresentes / sTotal) * 100) : 0;
                                                                                                                    return (
                                                                                                                        <div onClick={() => !isEstudiante && sesionData.docente_asistio && toggleSession(sesionKey)} className={`flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-100 p-2 rounded-lg gap-2 ${(!isEstudiante && sesionData.docente_asistio) ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}`}>
                                                                                                                            <div className="flex items-center gap-3">
                                                                                                                                {isEstudiante ? (
                                                                                                                                    (() => {
                                                                                                                                        const myRecord = sesionData.records[0];
                                                                                                                                        const estado = myRecord ? myRecord.estado : "inasistencia";
                                                                                                                                        if (!sesionData.docente_asistio) {
                                                                                                                                            return (
                                                                                                                                                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-red-50 rounded-full text-sara-red">
                                                                                                                                                    <XCircle size={14} />
                                                                                                                                                </div>
                                                                                                                                            );
                                                                                                                                        }
                                                                                                                                        if (estado === "asistencia") {
                                                                                                                                            return (
                                                                                                                                                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-green-50 rounded-full text-green-600">
                                                                                                                                                    <CheckCircle2 size={14} />
                                                                                                                                                </div>
                                                                                                                                            );
                                                                                                                                        } else if (estado === "asistencia con retraso") {
                                                                                                                                            return (
                                                                                                                                                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-amber-50 rounded-full text-amber-500">
                                                                                                                                                    <Clock size={14} />
                                                                                                                                                </div>
                                                                                                                                            );
                                                                                                                                        } else {
                                                                                                                                            return (
                                                                                                                                                <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-red-50 rounded-full text-sara-red">
                                                                                                                                                    <XCircle size={14} />
                                                                                                                                                </div>
                                                                                                                                            );
                                                                                                                                        }
                                                                                                                                    })()
                                                                                                                                ) : (
                                                                                                                                    sesionData.docente_asistio ? (
                                                                                                                                        <div className="relative w-8 h-8 shrink-0">
                                                                                                                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                                                                                                                                                <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                                                                                                                                                <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={113.1} strokeDashoffset={113.1 - (113.1 * sPct) / 100} className={sPct >= 80 ? "text-green-500" : sPct >= 60 ? "text-amber-400" : "text-sara-red"} />
                                                                                                                                            </svg>
                                                                                                                                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-gray-600">{sPct}%</span>
                                                                                                                                        </div>
                                                                                                                                    ) : (
                                                                                                                                        <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-red-50 rounded-full text-sara-red">
                                                                                                                                            <XCircle size={14} />
                                                                                                                                        </div>
                                                                                                                                    )
                                                                                                                                )}
                                                                                                                                <div>
                                                                                                                                    <span className="text-xs font-black text-sidebar-bg block">
                                                                                                                                        {(() => {
                                                                                                                                            const dateObj = sesionData.fecha ? (() => {
                                                                                                                                                const [y, m, d] = sesionData.fecha.split('-').map(Number);
                                                                                                                                                return new Date(y, m - 1, d);
                                                                                                                                            })() : null;
                                                                                                                                            const dateStr = dateObj ? dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "Sin Fecha";
                                                                                                                                            const parts = dateStr.split(' ');
                                                                                                                                            if (parts.length >= 4) {
                                                                                                                                                parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                                                                                                                                                parts[3] = parts[3].charAt(0).toUpperCase() + parts[3].slice(1);
                                                                                                                                            }
                                                                                                                                            const formattedDate = parts.join(' ');

                                                                                                                                            return sesionData.docente_asistio ? (
                                                                                                                                                <>
                                                                                                                                                    Sesión Completada: {formattedDate} (Semana {sesionData.semana})
                                                                                                                                                    <br />
                                                                                                                                                    <span className="text-gray-500 font-medium">Aula: {sesionData.aula_sesion || "Sin Aula"}</span>
                                                                                                                                                </>
                                                                                                                                            ) : (
                                                                                                                                                <>
                                                                                                                                                    Sesión No Completada: {formattedDate} (Semana {sesionData.semana})
                                                                                                                                                    <br />
                                                                                                                                                    <span className="text-gray-500">Motivo: {sesionData.isVirtual ? sesionData.reason : "Docente no asistió"}</span>
                                                                                                                                                </>
                                                                                                                                            );
                                                                                                                                        })()}
                                                                                                                                    </span>
                                                                                                                                    <span className="text-[10px] text-gray-500 font-bold">
                                                                                                                                        {isEstudiante ? (
                                                                                                                                            (() => {
                                                                                                                                                const myRecord = sesionData.records[0];
                                                                                                                                                const estado = myRecord ? myRecord.estado : "inasistencia";
                                                                                                                                                if (!sesionData.docente_asistio) {
                                                                                                                                                    return sesionData.isVirtual && sesionData.reason === "No completada por fecha" ? "Sesión programada" : "Clase cancelada por ausencia del docente";
                                                                                                                                                }
                                                                                                                                                if (estado === "asistencia") return "Asististe a tiempo";
                                                                                                                                                if (estado === "asistencia con retraso") return `Registrado con retraso (${myRecord.hora_entrada ? new Date(myRecord.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})`;
                                                                                                                                                return "Inasistencia registrada";
                                                                                                                                            })()
                                                                                                                                        ) : (
                                                                                                                                            sesionData.isVirtual
                                                                                                                                                ? sesionData.reason === "No completada por fecha" ? "Sesión futura" : "Sesión no completada por ausencia"
                                                                                                                                                : sesionData.docente_asistio
                                                                                                                                                    ? `${sPresentes} presentes, ${sTotal - sPresentes} ausentes (${sPct}%)`
                                                                                                                                                    : `Sesión no completada por ausencia del docente`
                                                                                                                                        )}
                                                                                                                                    </span>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <div className="flex items-center gap-2">
                                                                                                                                {isEstudiante ? (
                                                                                                                                    (() => {
                                                                                                                                        const myRecord = sesionData.records[0];
                                                                                                                                        const estado = myRecord ? myRecord.estado : "inasistencia";
                                                                                                                                        if (!sesionData.docente_asistio) {
                                                                                                                                            return (
                                                                                                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-center ${sesionData.isVirtual && sesionData.reason === "No completada por fecha" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                                                                                                                                                    {sesionData.isVirtual && sesionData.reason === "No completada por fecha" ? "Pendiente" : "Clase Cancelada"}
                                                                                                                                                </span>
                                                                                                                                            );
                                                                                                                                        }
                                                                                                                                        return (
                                                                                                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${estado === "asistencia" ? "bg-green-50 text-green-700" : estado === "asistencia con retraso" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                                                                                                                                                {estado === "asistencia" ? "Presente" : estado === "asistencia con retraso" ? "Tarde" : "Ausente"}
                                                                                                                                            </span>
                                                                                                                                        );
                                                                                                                                    })()
                                                                                                                                ) : (
                                                                                                                                    <>
                                                                                                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-center flex flex-col items-center justify-center ${sesionData.isVirtual ? (sesionData.reason === "No completada por fecha" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700") : sesionData.docente_asistio ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                                                                                                                            {sesionData.isVirtual ? (sesionData.reason === "No completada por fecha" ? "Pendiente" : "Clase Cancelada") : sesionData.docente_asistio ? "Docente Asistió" : "Clase Cancelada"}
                                                                                                                                        </span>
                                                                                                                                        {sesionData.docente_asistio && (
                                                                                                                                            <svg className={`w-3 h-3 text-gray-400 transition-transform ${isSessionOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                                                                                                                            </svg>
                                                                                                                                        )}
                                                                                                                                    </>
                                                                                                                                )}
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    );
                                                                                                                })()}
                                                                                                                {!isEstudiante && sesionData.docente_asistio && isSessionOpen && (
                                                                                                                    <div className="bg-white rounded-lg overflow-hidden border border-gray-100 shadow-sm mt-1">
                                                                                                                        <table className="w-full text-sm">
                                                                                                                            <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black">
                                                                                                                                <tr>
                                                                                                                                    <th className="px-3 py-1.5 text-left">Estudiante</th>
                                                                                                                                    <th className="px-3 py-1.5 text-center">Entrada</th>
                                                                                                                                    <th className="px-3 py-1.5 text-center">Salida</th>
                                                                                                                                    <th className="px-3 py-1.5">Método</th>
                                                                                                                                    <th className="px-3 py-1.5 text-center">Estado</th>
                                                                                                                                </tr>
                                                                                                                            </thead>
                                                                                                                            <tbody className="divide-y divide-gray-50">
                                                                                                                                {sesionData.records.map((a: any) => (
                                                                                                                                    <tr key={a.num_doc} className="hover:bg-gray-50/40 transition-colors">
                                                                                                                                        <td className="px-3 py-2">
                                                                                                                                            <p className="font-bold text-gray-800 text-[11px]">{a.nombre_estudiante} {a.apellido_estudiante}</p>
                                                                                                                                            <p className="text-[9px] text-gray-400 font-mono">{a.num_doc}</p>
                                                                                                                                        </td>
                                                                                                                                        <td className="px-3 py-2 text-[10px] text-gray-600 text-center">
                                                                                                                                            {a.hora_entrada ? new Date(a.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                                                                                        </td>
                                                                                                                                        <td className="px-3 py-2 text-[10px] text-gray-600 text-center">
                                                                                                                                            {a.hora_salida ? new Date(a.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                                                                                        </td>
                                                                                                                                        <td className="px-3 py-2 text-center">
                                                                                                                                            <Badge color={a.metodo_verificacion === "Biometría" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}>
                                                                                                                                                {a.metodo_verificacion}
                                                                                                                                            </Badge>
                                                                                                                                        </td>
                                                                                                                                        <td className="px-3 py-2 text-center">
                                                                                                                                            {editingEstadoId === a.id ? (
                                                                                                                                                <select value={a.estado} onChange={e => handleCambiarEstado(a.id, e.target.value)} onBlur={() => setEditingEstadoId(null)} autoFocus className="text-[10px] font-bold p-1 bg-white border border-gray-200 rounded-lg">
                                                                                                                                                    {["asistencia", "asistencia con retraso", "inasistencia"].map(e => <option key={e} value={e}>{e}</option>)}
                                                                                                                                                </select>
                                                                                                                                            ) : (
                                                                                                                                                <button onClick={() => setEditingEstadoId(a.id)} className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${a.estado === "asistencia" ? "bg-green-50 text-green-700" : a.estado === "asistencia con retraso" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                                                                                                                                                    {a.estado}
                                                                                                                                                </button>
                                                                                                                                            )}
                                                                                                                                        </td>
                                                                                                                                    </tr>
                                                                                                                                ))}
                                                                                                                            </tbody>
                                                                                                                        </table>
                                                                                                                    </div>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {activeTab === "contingencias" && (
                <div className="space-y-6">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle size={16} /> {sesion.rol === "Docente" ? "Por Revisar" : "Justificaciones"}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {contingencias.length === 0 ? (
                            <div className="md:col-span-3 text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <p className="text-xs text-gray-400 font-bold">No hay contingencias pendientes</p>
                            </div>
                        ) : contingencias.map((c) => (
                            <Card key={c.id} className="border-l-4 border-l-sara-red">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge color={c.estado === "pendiente" ? "bg-amber-50 text-amber-600" : c.estado === "aprobada" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}>
                                        {c.estado}
                                    </Badge>
                                    <span className="text-[10px] text-gray-300 font-mono">{new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-xs font-black text-gray-400 uppercase mb-1">{c.tipo}</p>
                                {sesion.rol !== "Estudiante" && (
                                    <p className="text-sm font-bold text-sidebar-bg mb-2">{c.solicitante} {c.apellido_solicitante}</p>
                                )}
                                <p className="text-sm text-gray-600 line-clamp-3 mb-4 italic">"{c.descripcion}"</p>
                                {c.archivo_url && (
                                    <a href={c.archivo_url} target="_blank" className="flex items-center gap-2 text-xs font-bold text-blue-500 hover:underline mb-4">
                                        <FileText size={14} /> Ver Adjunto
                                    </a>
                                )}
                                {sesion.rol === "Docente" && c.estado === "pendiente" && (
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRevisar(c.id, "aprobada")} className="flex-1 py-2 bg-green-500 text-white rounded-xl text-[10px] font-black hover:bg-green-600 transition-colors flex items-center justify-center gap-1">
                                            <CheckCircle2 size={12} /> APROBAR
                                        </button>
                                        <button onClick={() => handleRevisar(c.id, "rechazada")} className="flex-1 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black hover:bg-red-600 transition-colors flex items-center justify-center gap-1">
                                            <XCircle size={12} /> RECHAZAR
                                        </button>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL NUEVA CONTINGENCIA (ESTUDIANTE) */}
            {modal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="p-6 bg-sidebar-bg text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold">Enviar Justificación</h3>
                            <button onClick={() => setModal(false)}><XCircle /></button>
                        </div>
                        <form onSubmit={handleCrearContingencia} className="p-6 space-y-4">
                            {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Tipo de Contingencia</label>
                                <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm font-bold" value={fCont.tipo} onChange={e => setFCont({ ...fCont, tipo: e.target.value })}>
                                    <option value="justificacion">Inasistencia (Médica/Personal)</option>
                                    <option value="fallo_sistema">Fallo de Huella / Sistema</option>
                                    <option value="manual">Registro Manual solicitado</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Descripción / Motivo</label>
                                <textarea required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm min-h-32" placeholder="Explica brevemente lo ocurrido..." value={fCont.descripcion} onChange={e => setFCont({ ...fCont, descripcion: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">URL del Soporte (Opcional)</label>
                                <input type="url" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none text-sm" placeholder="https://drive.google.com/..." value={fCont.archivo_url} onChange={e => setFCont({ ...fCont, archivo_url: e.target.value })} />
                            </div>
                            <button className="w-full py-4 bg-sara-red text-white rounded-2xl font-black shadow-lg hover:opacity-90 transition-opacity">
                                ENVIAR SOLICITUD
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
