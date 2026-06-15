"use client";



import React, { Suspense, useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import {

    Users, TrendingUp, AlertTriangle, UserCheck, ShieldAlert,

    Calendar, BookOpen, Clock, Award, CheckCircle2, ChevronRight, Activity

} from "lucide-react";

import {

    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,

    Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,

    RadialBarChart, RadialBar, PolarAngleAxis

} from "recharts";

import { getSesion } from "@/services/auth";

import { listarHorarios, Horario } from "@/services/admin";

import { crearSesion } from "@/services/contingencias";

import {

    obtenerAdminStats, obtenerEstudianteStats, obtenerDocenteStats, AdminStats, EstudianteStats, DocenteStats,

    obtenerUsuariosFiltro, obtenerAsignaturasFiltro, obtenerPermanenciaStats,

    UsuarioFiltro, AsignaturaFiltro, PermanenciaStats

} from "@/services/dashboard";

import PrintHeader from "@/components/PrintHeader";



// ── Tooltip personalizado para la gráfica de barras ──────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {

    if (active && payload && payload.length) {

        return (

            <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-sm">

                <p className="font-bold text-sidebar-bg mb-2">{label}</p>

                {payload.map((entry: any, i: number) => (

                    <p key={i} style={{ color: entry.color }} className="font-medium">

                        {entry.name}: <strong>{entry.value}</strong>

                    </p>

                ))}

            </div>

        );

    }

    return null;

};



function AccesoDenegadoBanner() {

    const searchParams = useSearchParams();

    if (searchParams.get("acceso") !== "denegado") return null;

    return (

        <div className="flex items-center gap-4 p-4 rounded-2xl border border-red-200 bg-red-50">

            <ShieldAlert size={20} className="shrink-0 text-red-600" />

            <p className="text-sm font-semibold text-red-700">

                No tienes permiso para acceder a esa sección.

            </p>

        </div>

    );

}



const quickWeeks = [

    { label: "Semana Actual", val: "actual" },

    { label: "Últimas 5", val: "ultimas_5" },

    { label: "Últimas 10", val: "ultimas_10" },

    { label: "Todo", val: "todo" }

];



export default function DashboardPage() {

    const [sesion, setSesion] = useState({ id: "", num_doc: "", rol: "", nombre: "" });

    const [loading, setLoading] = useState(true);

    const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

    const [estudianteStats, setEstudianteStats] = useState<EstudianteStats | null>(null);

    const [docenteStats, setDocenteStats] = useState<DocenteStats | null>(null);

    const [horarios, setHorarios] = useState<Horario[]>([]);

    const [filtroRol, setFiltroRol] = useState<string>("todos");

    const [filtroSemana, setFiltroSemana] = useState<string>("actual");

    const [fechaImpresion, setFechaImpresion] = useState<string>("");

    const [showCharts, setShowCharts] = useState(false);

    const [openWeekDropdown, setOpenWeekDropdown] = useState(false);

    const [openWeekDropdownEstudiante, setOpenWeekDropdownEstudiante] = useState(false);



    const handlePrint = () => {

        const now = new Date();

        const options: Intl.DateTimeFormatOptions = { 

            weekday: 'long', 

            year: 'numeric', 

            month: 'long', 

            day: 'numeric',

            hour: '2-digit',

            minute: '2-digit',

            second: '2-digit',

            hour12: true 

        };

        setFechaImpresion(now.toLocaleDateString('es-ES', options));

        setTimeout(() => {

            window.print();

        }, 150);

    };



    // Estados para la gráfica de permanencia detallada

    const [usuariosFiltro, setUsuariosFiltro] = useState<UsuarioFiltro[]>([]);

    const [asignaturasFiltro, setAsignaturasFiltro] = useState<AsignaturaFiltro[]>([]);

    const [permanenciaStats, setPermanenciaStats] = useState<PermanenciaStats[]>([]);

    const [selectedRolPerm, setSelectedRolPerm] = useState<string>("todos");

    const [selectedUsuarioPerm, setSelectedUsuarioPerm] = useState<string>("todos");

    const [selectedAsignaturaPerm, setSelectedAsignaturaPerm] = useState<string>("todos");

    const [loadingPermanencia, setLoadingPermanencia] = useState<boolean>(false);



    // Cargar lista de usuarios al cambiar el rol del filtro

    useEffect(() => {

        const fetchUsers = async () => {

            try {

                const users = await obtenerUsuariosFiltro(selectedRolPerm, sesion.rol === "Docente" ? sesion.id : undefined);

                setUsuariosFiltro(users);

                setSelectedUsuarioPerm("todos");

                setSelectedAsignaturaPerm("todos");

            } catch (err) {

                console.error("Error al cargar usuarios para filtro de permanencia:", err);

            }

        };

        if (!loading && (sesion.rol === "Administrativo" || sesion.rol === "Docente")) {

            fetchUsers();

        }

    }, [selectedRolPerm, loading, sesion.rol, sesion.id]);



    // Cargar lista de asignaturas al cambiar el usuario seleccionado o al montar la sesión

    useEffect(() => {

        const fetchAsignaturas = async () => {

            try {

                const uId = sesion.rol === "Estudiante"

                    ? sesion.id

                    : (selectedUsuarioPerm === "todos"

                        ? (sesion.rol === "Docente" ? sesion.id : undefined)

                        : selectedUsuarioPerm);

                const subjects = await obtenerAsignaturasFiltro(uId, sesion.rol === "Docente" ? sesion.id : undefined);

                setAsignaturasFiltro(subjects);

                setSelectedAsignaturaPerm("todos");

            } catch (err) {

                console.error("Error al cargar asignaturas para filtro de permanencia:", err);

            }

        };

        if (!loading && (sesion.rol === "Administrativo" || sesion.rol === "Docente" || sesion.rol === "Estudiante")) {

            fetchAsignaturas();

        }

    }, [selectedUsuarioPerm, loading, sesion.rol, sesion.id]);



    // Cargar estadísticas de permanencia al cambiar cualquiera de los 3 filtros

    useEffect(() => {

        const fetchPermanenciaStats = async () => {

            setLoadingPermanencia(true);

            try {

                const uId = sesion.rol === "Estudiante"

                    ? sesion.id

                    : (selectedUsuarioPerm === "todos" ? undefined : selectedUsuarioPerm);

                const aId = selectedAsignaturaPerm === "todos" ? undefined : selectedAsignaturaPerm;

                const activeRol = sesion.rol === "Estudiante" ? "estudiante" : selectedRolPerm;

                const stats = await obtenerPermanenciaStats(activeRol, uId, aId, sesion.id, sesion.rol);

                setPermanenciaStats(stats);

            } catch (err) {

                console.error("Error al cargar estadísticas de permanencia:", err);

            } finally {

                setLoadingPermanencia(false);

            }

        };

        if (!loading && (sesion.rol === "Administrativo" || sesion.rol === "Docente" || sesion.rol === "Estudiante")) {

            fetchPermanenciaStats();

        }

    }, [selectedRolPerm, selectedUsuarioPerm, selectedAsignaturaPerm, loading, sesion.rol, sesion.id]);







    // Suppress Recharts container dimension warnings on mount

    useEffect(() => {

        const originalWarn = console.warn;

        console.warn = (...args) => {

            if (

                args[0] &&

                typeof args[0] === "string" &&

                args[0].includes("should be greater than 0")

            ) {

                return;

            }

            originalWarn(...args);

        };

        return () => {

            console.warn = originalWarn;

        };

    }, []);



    useEffect(() => {

        const init = async () => {

            try {

                const s = getSesion();

                const currentSession = { id: s.id || "", num_doc: s.num_doc || "", rol: s.rol || "", nombre: s.nombre || "" };

                setSesion(currentSession);



                if (currentSession.rol === "Administrativo" || currentSession.rol === "Docente") {

                    const stats = await obtenerAdminStats(filtroRol, filtroSemana, currentSession.id, currentSession.rol);

                    setAdminStats(stats);

                    if (currentSession.rol === "Docente") {

                        const hor = await listarHorarios();

                        setHorarios(hor.filter((h: Horario) => h.docente_id === currentSession.id));

                        const docStats = await obtenerDocenteStats(currentSession.id);

                        setDocenteStats(docStats);

                    }

                } else if (currentSession.rol === "Estudiante") {

                    const stats = await obtenerEstudianteStats(currentSession.id);

                    setEstudianteStats(stats);

                    const adminStatsForStudent = await obtenerAdminStats("estudiante", filtroSemana, currentSession.id, "Estudiante");

                    setAdminStats(adminStatsForStudent);

                }

            } catch (e) {

                console.error("Error cargando estadísticas del dashboard", e);

            } finally {

                setLoading(false);

            }

        };

        init();

    }, [filtroRol, filtroSemana]);



    useEffect(() => {

        if (!loading) {

            const timer = setTimeout(() => {

                setShowCharts(true);

            }, 150);

            return () => clearTimeout(timer);

        } else {

            setShowCharts(false);

        }

    }, [loading]);







    if (loading) {

        return (

            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">

                <div className="w-12 h-12 border-4 border-[#0e5d75] border-t-transparent rounded-full animate-spin" />

                <p className="text-gray-400 text-sm font-medium animate-pulse">Cargando estadísticas en tiempo real...</p>

            </div>

        );

    }



    // ── VISTA ADMINISTRATIVO Y DOCENTE ─────────────────────────────────────────

    if (sesion.rol === "Administrativo" || sesion.rol === "Docente") {

        const metricasGrid = sesion.rol === "Docente" ? [

            {

                label: "Estudiantes a cargo",

                value: adminStats?.metricas.estudiantes_activos.includes("/")

                    ? adminStats.metricas.estudiantes_activos.split("/")[1].trim()

                    : (adminStats?.metricas.estudiantes_activos ?? "0"),

                icon: <Users size={26} />,

                bg: "#3B82F6",

                trend: "Alumnos matriculados",

                trendColor: "#3B82F6",

            },

            {

                label: "Asignaturas a cargo",

                value: String(new Set(horarios.map(h => h.asignatura)).size),

                icon: <BookOpen size={26} />,

                bg: "#C9A84C",

                trend: "Materias asignadas",

                trendColor: "#C9A84C",

            },

            {

                label: "Asistencia promedio",

                value: adminStats?.metricas.asistencia_promedio ?? "0%",

                icon: <TrendingUp size={26} />,

                bg: "#10B981",

                trend: "Asistencia general",

                trendColor: "#10B981",

            },

            {

                label: "Cumplimiento Docente",

                value: adminStats?.metricas.cumplimiento_docente ?? "100%",

                icon: <UserCheck size={26} />,

                bg: "#0e5d75",

                trend: "Tasa de clases dictadas",

                trendColor: "#0e5d75",

            },

        ] : [

            {

                label: "Estudiantes activos",

                value: adminStats?.metricas.estudiantes_activos ?? "0 / 0",

                icon: <Users size={26} />,

                bg: "#3B82F6",

                trend: adminStats?.semestre_actual ? `Semestre: ${adminStats.semestre_actual}` : "Semestre en curso",

                trendColor: "#3B82F6",

            },

            {

                label: "Docentes activos",

                value: adminStats?.metricas.docentes_activos ?? "0 / 0",

                icon: <Users size={26} />,

                bg: "#C9A84C",

                trend: "Docentes registrados",

                trendColor: "#C9A84C",

            },

            {

                label: "Asistencia promedio",

                value: adminStats?.metricas.asistencia_promedio ?? "0%",

                icon: <TrendingUp size={26} />,

                bg: "#10B981",

                trend: "Asistencia general",

                trendColor: "#10B981",

            },

            {

                label: "Cumplimiento Docente",

                value: adminStats?.metricas.cumplimiento_docente ?? "100%",

                icon: <UserCheck size={26} />,

                bg: "#0e5d75",

                trend: "Tasa de clases dictadas",

                trendColor: "#0e5d75",

            },

        ];



        return (

            <div className="space-y-6">

                <Suspense fallback={null}>

                    <AccesoDenegadoBanner />

                </Suspense>



                {/* REPORTE PRINT HEADER */}

                <PrintHeader 

                    titulo="Reporte Oficial de Estadísticas y Asistencia"

                    propietarioNombre={sesion.nombre}

                    propietarioRol={sesion.rol}

                    generadoPorNombre={sesion.nombre}

                    generadoPorRol={sesion.rol}

                    semestre={adminStats?.semestre_actual}

                    fecha={fechaImpresion}

                />





                {/* BIENVENIDA */}

                <div className="welcome-card bg-gradient-to-r from-sidebar-bg to-black text-white p-6 rounded-3xl relative overflow-hidden shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print" style={{ background: "linear-gradient(135deg, #1e1e30 0%, #11111d 100%)" }}>

                    <div className="relative z-10 space-y-1">

                        <span className="text-xs uppercase font-extrabold text-sara-gold tracking-widest" style={{ color: "#C9A84C" }}>

                            {sesion.rol === "Administrativo" ? "Panel Administrativo" : "Panel de Docente"}

                            {adminStats?.semestre_actual ? ` • Semestre ${adminStats.semestre_actual}` : ""}

                        </span>

                        <h1 className="text-2xl font-black">¡Hola, {sesion.nombre}!</h1>

                        <p className="text-xs text-gray-400 max-w-xl">Supervisa el ausentismo, detecta riesgos de deserción escolar temprana y gestiona las contingencias académicas de SARA.</p>

                    </div>

                    <button

                        onClick={handlePrint}

                        className="no-print px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-2"

                        style={{ border: "none" }}

                    >

                        <Award size={14} /> Guardar Reporte (PDF)

                    </button>

                    <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient opacity-10 pointer-events-none" />

                </div>



                {/* FILA DE RESUMEN: KPIs (Matriz 2x2) + ALERTAS DE DESERCIÓN (con ancho de cuadrícula ajustado) */}

                <div className="grid grid-cols-1 lg:grid-cols-[540px_1fr] print:grid-cols-[1.25fr_1fr] gap-6">

                    {/* Matriz 2x2 de KPIs (ocupa exactamente 540px de ancho) */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 w-full">

                        {metricasGrid.map((stat, i) => (

                            <div

                                key={i}

                                className="relative overflow-hidden bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex justify-between items-center h-[140px] w-full max-w-[255px] mx-auto group/card"

                                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}

                            >

                                {/* Decorative background glow on hover */}

                                <div

                                    className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 blur-xl"

                                    style={{ background: stat.bg }}

                                />



                                <div className="flex flex-col justify-center items-center text-center gap-2.5 z-10">

                                    <p className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider leading-none">{stat.label}</p>

                                    <p className="text-3xl font-black leading-none" style={{ color: "#1A1A2E" }}>{stat.value}</p>

                                    <p className="text-[10px] font-bold flex items-center justify-center gap-1 leading-none" style={{ color: stat.trendColor }}>

                                        <Activity size={10} className="animate-pulse" /> {stat.trend}

                                    </p>

                                </div>



                                <div

                                    className="w-14 h-14 rounded-full text-white shadow-md transition-all duration-300 group-hover/card:scale-105 flex items-center justify-center shrink-0 z-10"

                                    style={{

                                        background: `linear-gradient(135deg, ${stat.bg}, ${stat.bg}DD)`,

                                        boxShadow: `0 6px 12px ${stat.bg}20`

                                    }}

                                >

                                    {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 24 })}

                                </div>

                            </div>

                        ))}

                    </div>



                    {/* Alertas Críticas de Deserción (ocupa la mitad derecha, alineada a 296px de alto) */}

                    <div

                        className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between h-auto md:h-[296px] landscape:h-[296px] w-full"

                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}

                    >

                        <div>

                            <h3 className="font-bold text-base mb-1 flex items-center gap-2 text-[#1A1A2E]">

                                <AlertTriangle size={16} className="text-red-600" /> Alertas de Deserción

                            </h3>

                            <p className="text-xs text-gray-400 mb-4">Riesgos y ausentismo crítico detectados</p>

                        </div>



                        <div className="space-y-3 overflow-visible md:overflow-y-auto landscape:overflow-y-auto pr-1 flex-1 max-h-none md:max-h-[160px] landscape:max-h-[160px] print:max-h-none print:overflow-visible scrollbar-thin">

                            {!adminStats || adminStats.alertas_desercion.length === 0 ? (

                                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">

                                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />

                                    <p className="text-[10px] font-bold">No se detectan alertas en el sistema.</p>

                                </div>

                            ) : (

                                adminStats.alertas_desercion.map((al, idx) => (

                                    <div

                                        key={idx}

                                        className="flex flex-col gap-1.5 p-3 rounded-xl border border-red-200 bg-red-50/50 transition-all"

                                    >

                                        <div className="flex justify-between items-center">

                                            <p className="font-extrabold text-xs text-red-700">

                                                {al.apellidos}, {al.nombres}

                                            </p>

                                            <span className="text-[8px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full uppercase">Crítico</span>

                                        </div>

                                        <p className="text-[10px] text-gray-500 leading-normal">

                                            Doc: {al.num_doc} · <span className="font-medium text-red-700">{al.descripcion}</span>

                                        </p>

                                    </div>

                                ))

                            )}

                        </div>

                    </div>

                </div>



                {/* HORARIO DEL DÍA (DOCENTE) */}

                {sesion.rol === "Docente" && docenteStats && (

                    <div className="space-y-3 mt-6">

                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">

                            <Calendar size={15} /> Tus Clases de Hoy

                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                            {docenteStats.horarios_hoy.length === 0 ? (

                                <div className="flex items-center gap-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl col-span-full">

                                    <Clock size={16} className="text-gray-400" />

                                    <p className="text-xs text-gray-400 italic">No tienes clases agendadas para el día de hoy.</p>

                                </div>

                            ) : (

                                docenteStats.horarios_hoy.map((h, i) => {

                                    const badges = (() => {

                                        const now = new Date();

                                        const [hiHours, hiMinutes] = h.hora_inicio.split(":").map(Number);

                                        const [hfHours, hfMinutes] = h.hora_fin.split(":").map(Number);

                                        

                                        const start = new Date(now);

                                        start.setHours(hiHours, hiMinutes, 0, 0);

                                        

                                        const end = new Date(now);

                                        end.setHours(hfHours, hfMinutes, 0, 0);



                                        const hasSession = !!h.sesion_id;

                                        const sesionEstado = h.sesion_estado;

                                        const docenteAsistio = h.docente_asistio;

                                        const hasExit = !!h.hora_salida;



                                        // 1. Caso Cancelado (Any time condition, session exists, state 'no_completada', docente_asistio is False)

                                        if (hasSession && sesionEstado === "no_completada" && docenteAsistio === false) {

                                            return {

                                                clase: { label: "Clase cancelada: Reportaste inasistencia", bg: "bg-red-50 text-red-600 border border-red-100 font-bold w-full text-center text-[10px] py-1" },

                                                asistencia: null

                                            };

                                        }



                                        // 2. Caso Antes de la clase

                                        if (now < start) {

                                            return {

                                                clase: { label: "Pendiente: Por iniciar", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" },

                                                asistencia: { label: "Registro de inicio pendiente", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" }

                                            };

                                        }



                                        // 3. Caso Durante la clase (start <= now <= end)

                                        if (now >= start && now <= end) {

                                            if (!hasSession) {

                                                return {

                                                    clase: { label: "Pendiente: Por iniciar", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" },

                                                    asistencia: { label: "Registro de inicio pendiente", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" }

                                                };

                                            } else if (sesionEstado === "abierta") {

                                                return {

                                                    clase: { label: "Clase en curso", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse font-bold" },

                                                    asistencia: { label: "Inicio registrado", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" }

                                                };

                                            } else if (sesionEstado === "completa") {

                                                if (!hasExit) {

                                                    return {

                                                        clase: { label: "Clase terminada", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" },

                                                        asistencia: { label: "Asistencia incompleta (Sin salida)", bg: "bg-red-50 text-red-600 border border-red-200/60 font-bold" }

                                                    };

                                                } else {

                                                    return {

                                                        clase: { label: "Clase terminada", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" },

                                                        asistencia: { label: "Clase dictada con éxito", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" }

                                                    };

                                                }

                                            }

                                        }



                                        // 4. Caso Después de la clase (now > end)

                                        if (now > end) {

                                            if (!hasSession) {

                                                return {

                                                    clase: { label: "Clase no dictada: Sin registro", bg: "bg-red-50 text-red-600 border border-red-100 font-bold w-full text-center text-[10px] py-1" },

                                                    asistencia: null

                                                };

                                            } else if (sesionEstado === "abierta") {

                                                return {

                                                    clase: { label: "Clase en curso (Hora finalizada)", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse font-bold" },

                                                    asistencia: { label: "Inicio registrado", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" }

                                                };

                                            } else if (sesionEstado === "completa") {

                                                if (!hasExit) {

                                                    return {

                                                        clase: { label: "Clase terminada", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" },

                                                        asistencia: { label: "Asistencia incompleta (Sin salida)", bg: "bg-red-50 text-red-600 border border-red-200/60 font-bold" }

                                                    };

                                                } else {

                                                    return {

                                                        clase: { label: "Clase terminada", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" },

                                                        asistencia: { label: "Clase dictada con éxito", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" }

                                                    };

                                                }

                                            }

                                        }



                                        return { clase: null, asistencia: null };

                                    })();



                                    return (

                                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.02)" }}>

                                            <div>

                                                <div className="flex justify-between items-start gap-2">

                                                    <p className="font-bold text-sm text-[#1A1A2E] leading-tight truncate" title={h.asignatura}>{h.asignatura}</p>

                                                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-gray-100/80 text-gray-500 shrink-0">

                                                        Aula {h.aula}

                                                    </span>

                                                </div>

                                                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Grupo {h.grupo} • {h.hora_inicio} - {h.hora_fin}</p>

                                            </div>

                                            <div className="border-t border-gray-50 pt-3 flex flex-wrap gap-2 justify-between items-center w-full">

                                                {badges.clase && (

                                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${badges.clase.bg}`}>

                                                        {badges.clase.label}

                                                    </span>

                                                )}

                                                {badges.asistencia && (

                                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${badges.asistencia.bg}`}>

                                                        {badges.asistencia.label}

                                                    </span>

                                                )}

                                            </div>

                                        </div>

                                    );

                                })

                            )}

                        </div>

                    </div>

                )}







                {/* FILA DE GRÁFICO SEMANAL (A ANCHO COMPLETO CON CONCENTRIC RADIAL BARCHART EN PROPORCIÓN 3:2 Y ENLAZADO A SABADO) */}

                <div

                    className="bg-white p-6 rounded-2xl border border-gray-100"

                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)", breakInside: "avoid", pageBreakInside: "avoid" }}

                >

                    {/* Header general de la tarjeta con títulos divididos */}

                    <div className="flex justify-between items-start mb-6">

                        <div>

                            <h3 className="font-bold text-base" style={{ color: "#1A1A2E" }}>

                                Tasa de asistencia semanal

                            </h3>

                            <p className="text-xs text-gray-400 mt-0.5">

                                Porcentaje de asistencias y fallas promedio por día laboral.

                            </p>

                        </div>

                        {/* Título de la gráfica circular alineado en el header para ganar espacio vertical */}

                        <div className="hidden lg:block print:block w-[40%] text-right pr-6">

                            <h3 className="font-bold text-xs uppercase tracking-widest text-gray-400">

                                TASA DE ASISTENCIA DIARIA (%)

                            </h3>

                            <p className="text-[10px] text-gray-400 mt-0.5">Distribución porcentual acumulada de lunes a sábado</p>

                        </div>

                    </div>



                    <div className="grid grid-cols-1 lg:grid-cols-5 print:grid-cols-5 gap-6 items-start">

                        {/* Lado izquierdo: Filtros + Gráfico de Barras (3/5 de ancho) */}

                        <div className="lg:col-span-3 print:col-span-3 space-y-4">

                            {/* Filtros colocados directamente sobre la gráfica de barras */}

                            <div className="flex flex-wrap items-center gap-3">

                                {/* Filtro de Rol */}

                                {/* Filtro de Rol para Administrativo y Docente */}

                                {sesion.rol === "Administrativo" ? (

                                    <>

                                        <select

                                            value={filtroRol}

                                            onChange={(e) => setFiltroRol(e.target.value)}

                                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-sara-red transition-all cursor-pointer h-8 print:hidden"

                                            style={{ color: "#1A1A2E" }}

                                        >

                                            <option value="todos">Todos los Roles</option>

                                            <option value="estudiante">Estudiantes</option>

                                            <option value="docente">Docentes</option>

                                        </select>

                                        <div className="hidden print:block text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 bg-white h-8 flex items-center" style={{ color: "#1A1A2E" }}>

                                            {filtroRol === "todos" ? "Todos los Roles" : filtroRol === "estudiante" ? "Estudiantes" : "Docentes"}

                                        </div>

                                    </>

                                ) : sesion.rol === "Docente" ? (

                                    <>

                                        <select

                                            value={filtroRol}

                                            onChange={(e) => setFiltroRol(e.target.value)}

                                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-sara-red transition-all cursor-pointer h-8 print:hidden"

                                            style={{ color: "#1A1A2E" }}

                                        >

                                            <option value="todos">Ambas (Mi Asistencia y Estudiantes)</option>

                                            <option value="estudiante">Mis Estudiantes</option>

                                            <option value="docente">Mi Asistencia</option>

                                        </select>

                                        <div className="hidden print:block text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 bg-white h-8 flex items-center" style={{ color: "#1A1A2E" }}>

                                            {filtroRol === "todos" ? "Ambas (Mi Asistencia y Estudiantes)" : filtroRol === "estudiante" ? "Mis Estudiantes" : "Mi Asistencia"}

                                        </div>

                                    </>

                                ) : null}



                                {/* Filtro de Semanas */}

                                <div className="flex flex-wrap items-center gap-1 bg-gray-100/60 p-1 rounded-xl border border-gray-200/50 h-auto min-h-8 print:hidden">

                                    {quickWeeks.map(qw => (

                                        <button

                                            key={qw.val}

                                            type="button"

                                            onClick={() => setFiltroSemana(qw.val)}

                                            className={`text-[10px] font-extrabold px-2.5 h-6 rounded-lg transition-all ${filtroSemana === qw.val

                                                    ? "bg-white text-sara-red shadow-sm"

                                                    : "text-gray-500 hover:text-gray-700"

                                                }`}

                                        >

                                            {qw.label}

                                        </button>

                                    ))}



                                                                        <div className="relative h-6">

                                         <button

                                             type="button"

                                             onClick={() => setOpenWeekDropdown(!openWeekDropdown)}

                                             className={`text-[10px] font-extrabold px-2.5 h-6 rounded-lg transition-all flex items-center gap-1 ${filtroSemana !== "actual" && filtroSemana !== "ultimas_5" && filtroSemana !== "ultimas_10" && filtroSemana !== "todo"

                                                     ? "bg-white text-sara-red shadow-sm"

                                                     : "text-gray-500 hover:text-gray-700"

                                                 }`}

                                         >

                                             {filtroSemana !== "actual" && filtroSemana !== "ultimas_5" && filtroSemana !== "ultimas_10" && filtroSemana !== "todo"

                                                 ? `Sem. ${filtroSemana}`

                                                 : "Otra..."}

                                         </button>

                                         {openWeekDropdown && (

                                             <>

                                                 <div className="fixed inset-0 z-20" onClick={() => setOpenWeekDropdown(false)} />

                                                 <div className="absolute left-0 md:left-auto md:right-0 top-full pt-1.5 z-30">

                                                     <div className="bg-white border border-gray-100 rounded-xl shadow-lg py-1 max-h-40 overflow-y-auto w-28 scrollbar-thin">

                                                         {Array.from({ length: adminStats?.semana_actual ?? 1 }, (_, i) => {

                                                             const w = i + 1;

                                                             return (

                                                                 <button

                                                                     key={w}

                                                                     type="button"

                                                                     onClick={() => {

                                                                         setFiltroSemana(String(w));

                                                                         setOpenWeekDropdown(false);

                                                                     }}

                                                                     className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 text-[10px] font-bold border-b border-gray-50 last:border-0 ${filtroSemana === String(w) ? "text-sara-red" : "text-gray-600"

                                                                         }`}

                                                                 >

                                                                     Semana {w}

                                                                 </button>

                                                             );

                                                         })}

                                                     </div>

                                                 </div>

                                             </>

                                         )}

                                     </div>

                                </div>

                                <div className="hidden print:flex items-center gap-1 bg-gray-100/60 p-1 rounded-xl border border-gray-200/50 h-8">

                                    <div className="bg-white text-sara-red shadow-sm text-[10px] font-extrabold px-2.5 h-6 rounded-lg flex items-center justify-center">

                                        {filtroSemana === "actual" ? "Semana Actual"

                                         : filtroSemana === "ultimas_5" ? "Últimas 5"

                                         : filtroSemana === "ultimas_10" ? "Últimas 10"

                                         : filtroSemana === "todo" ? "Todo"

                                         : `Semana ${filtroSemana}`}

                                    </div>

                                </div>

                            </div>



                            {showCharts && (

                                <ResponsiveContainer width="100%" height={240} minWidth={0}>

                                    <BarChart data={adminStats?.asistencia_semanal ?? []} barGap={6} barCategoryGap="30%">

                                        <CartesianGrid strokeDasharray="3 3" stroke="#F9FAFB" vertical={false} />

                                        <XAxis

                                            dataKey="dia"

                                            tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}

                                            axisLine={false}

                                            tickLine={false}

                                        />

                                        <YAxis

                                            tick={{ fontSize: 10, fill: "#9CA3AF" }}

                                            axisLine={false}

                                            tickLine={false}

                                            width={25}

                                        />

                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB", radius: 8 }} />

                                        <Legend

                                            iconType="circle"

                                            iconSize={8}

                                            wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}

                                        />

                                        <Bar dataKey="a_tiempo" stackId="asistencia" name="A tiempo" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={16} />

                                        <Bar dataKey="tardes" stackId="asistencia" name="Tarde" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={16} />

                                        <Bar dataKey="ausentes" name="Inasistencias" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={16} />

                                    </BarChart>

                                </ResponsiveContainer>

                            )}

                        </div>



                        {/* Lado derecho: Gráfico Radial Concéntrico (2/5 de ancho, ampliado masivamente al quitar el titulo interno) */}

                        <div className="lg:col-span-2 print:col-span-2 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 w-full">

                            {/* RadialBarChart con Recharts - Ampliado a height: 270 para máximo aprovechamiento de espacio */}

                            <div className="relative w-full flex items-center justify-center" style={{ height: 270 }}>

                                {showCharts && (

                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>

                                        <RadialBarChart

                                            cx="50%"

                                            cy="50%"

                                            innerRadius="20%"

                                            outerRadius="95%"

                                            barSize={12}

                                            startAngle={90}

                                            endAngle={-270}

                                            data={

                                                (adminStats?.asistencia_semanal ?? []).map((d, index) => {

                                                    const total = d.presentes + d.ausentes;

                                                    const pct = total > 0 ? Math.round((d.presentes / total) * 100) : 0;

                                                    // Paleta de 6 colores premium para Lunes, Martes, Miércoles, Jueves, Viernes y Sábado

                                                    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#84CC16", "#8B5CF6"];

                                                    return {

                                                        name: d.dia,

                                                        uv: pct,

                                                        fill: colors[index % colors.length]

                                                    };

                                                }).reverse()

                                            }

                                        >

                                            <PolarAngleAxis

                                                type="number"

                                                domain={[0, 100]}

                                                angleAxisId={0}

                                                tick={false}

                                            />

                                            <RadialBar

                                                background={{ fill: "#F3F4F6" }}

                                                dataKey="uv"

                                                cornerRadius={6}

                                            />

                                            <Tooltip

                                                labelFormatter={() => "Asistencia Semanal"}

                                                formatter={(value, name, entry: any) => {

                                                    const rawName = entry?.payload?.name || name;

                                                    const nameStr = String(rawName);

                                                    const capitalized = nameStr ? nameStr.charAt(0).toUpperCase() + nameStr.slice(1) : nameStr;

                                                    return [`${value}%`, capitalized];

                                                }}

                                                contentStyle={{ fontSize: 10, borderRadius: 8 }}

                                            />

                                        </RadialBarChart>

                                    </ResponsiveContainer>

                                )}

                            </div>



                            {/* Leyenda Personalizada Concéntrica en la base (6 columnas para Lun - Sab) */}

                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-2 text-[9px] font-bold text-gray-500 w-full px-2 justify-center mt-3">

                                {(adminStats?.asistencia_semanal ?? []).map((d, index) => {

                                    const total = d.presentes + d.ausentes;

                                    const pct = total > 0 ? Math.round((d.presentes / total) * 100) : 0;

                                    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#84CC16", "#8B5CF6"];

                                    return (

                                        <div key={index} className="flex flex-col items-center justify-center text-center">

                                            <div className="flex items-center gap-1">

                                                <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: colors[index % colors.length] }} />

                                                <span>{d.dia}</span>

                                            </div>

                                            <span className="text-gray-700 font-extrabold mt-0.5">{pct}%</span>

                                        </div>

                                    );

                                })}

                            </div>

                        </div>

                    </div>

                </div>







                {/* NUEVA FILA DE DETALLE DE PERMANENCIA REAL (Full Width) */}

                <div

                    className="bg-white p-6 rounded-2xl border border-gray-100 mt-6"

                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)", breakInside: "avoid", pageBreakInside: "avoid" }}

                >

                    <div className="flex flex-col xl:flex-row justify-start items-start xl:items-center gap-6 xl:gap-10 mb-6">

                        <div className="max-w-[280px] shrink-0">

                            <h3 className="font-bold text-base" style={{ color: "#1A1A2E" }}>

                                Detalle de Permanencia en Clase

                            </h3>

                            <p className="text-xs text-gray-400 mt-0.5">

                                Analiza el porcentaje de tiempo real de permanencia de estudiantes o docentes en el aula

                            </p>

                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full">

                            {/* Filtro de Rol */}

                            {sesion.rol === "Administrativo" ? (

                                <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[200px] lg:max-w-[240px]">

                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rol</label>

                                    <select

                                        value={selectedRolPerm}

                                        onChange={(e) => setSelectedRolPerm(e.target.value)}

                                        className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer w-full print:hidden"

                                    >

                                        <option value="todos">Ambos (Docentes y Estudiantes)</option>

                                        <option value="estudiante">Estudiantes</option>

                                        <option value="docente">Docentes</option>

                                    </select>

                                    <div className="hidden print:block text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-semibold w-full">

                                        {selectedRolPerm === "todos" ? "Ambos (Docentes y Estudiantes)" : selectedRolPerm === "estudiante" ? "Estudiantes" : "Docentes"}

                                    </div>

                                </div>

                            ) : sesion.rol === "Docente" ? (

                                <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[200px] lg:max-w-[240px]">

                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rol</label>

                                    <select

                                        value={selectedRolPerm}

                                        onChange={(e) => setSelectedRolPerm(e.target.value)}

                                        className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer w-full print:hidden"

                                    >

                                        <option value="todos">Ambas (Mi Asistencia y Estudiantes)</option>

                                        <option value="estudiante">Mis Estudiantes</option>

                                        <option value="docente">Mi Asistencia</option>

                                    </select>

                                    <div className="hidden print:block text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-semibold w-full">

                                        {selectedRolPerm === "todos" ? "Ambas (Mi Asistencia y Estudiantes)" : selectedRolPerm === "estudiante" ? "Mis Estudiantes" : "Mi Asistencia"}

                                    </div>

                                </div>

                            ) : null}



                            {/* Filtro de Persona/Usuario */}

                            <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[240px]">

                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Persona</label>

                                <select

                                    value={selectedUsuarioPerm}

                                    onChange={(e) => setSelectedUsuarioPerm(e.target.value)}

                                    className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer w-full print:hidden"

                                >

                                    <option value="todos">Todos los usuarios</option>

                                    {usuariosFiltro.map((u) => (

                                        <option key={u.id} value={u.id}>

                                            {u.apellidos}, {u.nombres} ({u.rol})

                                        </option>

                                    ))}

                                </select>

                                <div className="hidden print:block text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-semibold w-full truncate">

                                    {selectedUsuarioPerm === "todos" ? "Todos los usuarios" : (usuariosFiltro.find(u => u.id === selectedUsuarioPerm) ? `${usuariosFiltro.find(u => u.id === selectedUsuarioPerm)?.apellidos}, ${usuariosFiltro.find(u => u.id === selectedUsuarioPerm)?.nombres}` : selectedUsuarioPerm)}

                                </div>

                            </div>



                            {/* Filtro de Asignatura */}

                            <div className="flex flex-col gap-1 w-full sm:flex-1 sm:min-w-[240px]">

                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asignatura</label>

                                <select

                                    value={selectedAsignaturaPerm}

                                    onChange={(e) => setSelectedAsignaturaPerm(e.target.value)}

                                    className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer w-full print:hidden"

                                >

                                    <option value="todos">Todas las asignaturas</option>

                                    {asignaturasFiltro.map((a) => (

                                        <option key={a.id} value={a.id}>

                                            {a.nombre}

                                        </option>

                                    ))}

                                </select>

                                <div className="hidden print:block text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-semibold w-full truncate">

                                    {selectedAsignaturaPerm === "todos" ? "Todas las asignaturas" : (asignaturasFiltro.find(a => a.id === selectedAsignaturaPerm)?.nombre || selectedAsignaturaPerm)}

                                </div>

                            </div>

                        </div>

                    </div>



                    <div className="relative">

                        {loadingPermanencia && (

                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">

                                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />

                            </div>

                        )}

                        {showCharts && (

                            <ResponsiveContainer width="100%" height={220} minWidth={0}>

                                <AreaChart data={permanenciaStats} margin={{ left: 5, right: 5, top: 10 }}>

                                    <defs>

                                        <linearGradient id="colorPermDetalle" x1="0" y1="0" x2="0" y2="1">

                                            <stop offset="5%" stopColor="#D97706" stopOpacity={0.15} />

                                            <stop offset="95%" stopColor="#D97706" stopOpacity={0} />

                                        </linearGradient>

                                    </defs>

                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />

                                    <XAxis

                                        dataKey="semana"

                                        tick={{ fontSize: 10, fill: "#9CA3AF" }}

                                        axisLine={false}

                                        tickLine={false}

                                        padding={{ left: 20, right: 20 }}

                                    />

                                    <YAxis

                                        tick={{ fontSize: 10, fill: "#9CA3AF" }}

                                        axisLine={false}

                                        tickLine={false}

                                        domain={[0, 100]}

                                        width={25}

                                    />

                                    <Tooltip

                                        content={({ active, payload, label }) => {

                                            if (active && payload && payload.length) {

                                                const data = payload[0].payload;

                                                return (

                                                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-xs space-y-1">

                                                        <p className="font-bold text-gray-700">{label}</p>

                                                        <p className="text-amber-600 font-semibold">

                                                            Permanencia Promedio: <strong className="font-extrabold">{Number(data.permanencia).toFixed(2)}%</strong>

                                                        </p>

                                                        <p className="text-gray-500 font-medium">

                                                            Asistencias evaluadas: <strong className="font-bold text-gray-700">{data.total_asistencias ?? 0}</strong>

                                                        </p>

                                                    </div>

                                                );

                                            }

                                            return null;

                                        }}

                                    />

                                    <Area

                                        type="monotone"

                                        dataKey="permanencia"

                                        stroke="#D97706"

                                        strokeWidth={2}

                                        fill="url(#colorPermDetalle)"

                                        dot={{ fill: "#D97706", r: 3 }}

                                    />

                                </AreaChart>

                            </ResponsiveContainer>

                        )}

                    </div>

                </div>

            </div>

        );

    }



    // ── VISTA ESTUDIANTE ───────────────────────────────────────────────────────

    if (sesion.rol === "Estudiante" && estudianteStats) {

        const studentMetricas = [

            {

                label: "Asistencia General",

                value: estudianteStats.asistencia_general,

                icon: <Award size={22} />,

                bg: "#10B981",

                trend: "Cumplimiento del reglamento",

                trendColor: "#10B981"

            },

            {

                label: "Asignaturas Matriculadas",

                value: estudianteStats.asignaturas_asistencias.length,

                icon: <BookOpen size={22} />,

                bg: "#3B82F6",

                trend: "Cursos activos",

                trendColor: "#3B82F6"

            }

        ];



        const studentAlerts = estudianteStats.asignaturas_asistencias

            .filter(asig => asig.dictadas > 0 && asig.porcentaje < 80)

            .map(asig => {

                const isCritical = asig.porcentaje < 70;

                return {

                    materia: asig.nombre,

                    porcentaje: asig.porcentaje,

                    isCritical,

                    descripcion: isCritical 

                        ? "Riesgo crítico de reprobar la materia por inasistencia."

                        : "Tu asistencia está por debajo del límite sugerido (80%)."

                };

            });



        return (

            <div className="space-y-6">

                {/* REPORTE PRINT HEADER */}

                <PrintHeader 

                    titulo="Reporte Oficial de Rendimiento y Asistencia"

                    propietarioNombre={sesion.nombre}

                    propietarioRol={sesion.rol}

                    propietarioDocumento={sesion.num_doc}

                    generadoPorNombre={sesion.nombre}

                    generadoPorRol={sesion.rol}

                    semestre={estudianteStats?.semestre_actual}

                    fecha={fechaImpresion}

                />

                {/* BIENVENIDA ESTUDIANTE */}

                <div className="welcome-card bg-gradient-to-r from-sidebar-bg to-black text-white p-6 rounded-3xl relative overflow-hidden shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print" style={{ background: "linear-gradient(135deg, #1e1e30 0%, #11111d 100%)" }}>

                    <div className="relative z-10 space-y-1">

                        <span className="text-xs uppercase font-extrabold text-sara-gold tracking-widest" style={{ color: "#C9A84C" }}>

                            Portal del Estudiante

                            {estudianteStats?.semestre_actual ? ` • Semestre ${estudianteStats.semestre_actual}` : ""}

                        </span>

                        <h1 className="text-2xl font-black">¡Hola, {sesion.nombre}!</h1>

                        <p className="text-xs text-gray-400 max-w-xl">Revisa tu porcentaje de asistencia en cada materia. Recuerda que no debes superar el 20% de inasistencias en el periodo académico.</p>

                    </div>

                    <button

                        onClick={handlePrint}

                        className="no-print px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-2"

                        style={{ border: "none" }}

                    >

                        <Award size={14} /> Guardar Reporte (PDF)

                    </button>

                </div>



                {/* FILA DE RESUMEN DEL ESTUDIANTE: KPIs + Alertas de Asistencia */}

                <div className="grid grid-cols-1 lg:grid-cols-[540px_1fr] print:grid-cols-[1.25fr_1fr] gap-6">

                    {/* KPIs (ancho aproximado de 540px) */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 w-full">

                        {studentMetricas.map((stat, i) => (

                            <div

                                key={i}

                                className="relative overflow-hidden bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex justify-between items-center h-[140px] w-full max-w-[255px] mx-auto group/card"

                                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}

                            >

                                {/* Decorative background glow on hover */}

                                <div

                                    className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 blur-xl"

                                    style={{ background: stat.bg }}

                                />



                                <div className="flex flex-col justify-center items-center text-center gap-2.5 z-10 w-full">

                                    <p className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider leading-none">{stat.label}</p>

                                    <p className="text-3xl font-black leading-none" style={{ color: "#1A1A2E" }}>{stat.value}</p>

                                    <p className="text-[10px] font-bold flex items-center justify-center gap-1 leading-none" style={{ color: stat.trendColor }}>

                                        <Activity size={10} className="animate-pulse" /> {stat.trend}

                                    </p>

                                </div>



                                <div

                                    className="w-14 h-14 rounded-full text-white shadow-md transition-all duration-300 group-hover/card:scale-105 flex items-center justify-center shrink-0 z-10"

                                    style={{

                                        background: `linear-gradient(135deg, ${stat.bg}, ${stat.bg}DD)`,

                                        boxShadow: `0 6px 12px ${stat.bg}20`

                                    }}

                                >

                                    {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 24 })}

                                </div>

                            </div>

                        ))}

                    </div>



                    {/* Alertas del Estudiante (altura fija de 140px a juego con los KPIs) */}

                    <div

                        className="bg-white p-5 rounded-3xl border border-gray-100 flex flex-col justify-between h-auto md:h-[140px] landscape:h-[140px] w-full"

                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}

                    >

                        <div className="flex justify-between items-center mb-1">

                            <h3 className="font-bold text-xs flex items-center gap-2 text-[#1A1A2E]">

                                <AlertTriangle size={14} className="text-red-600" /> Mis Alertas de Asistencia

                            </h3>

                            <span className="text-[9px] text-gray-400 font-bold">Límite permitido: 80%</span>

                        </div>



                        <div className="space-y-2 overflow-visible md:overflow-y-auto landscape:overflow-y-auto pr-1 flex-1 max-h-none md:max-h-[85px] landscape:max-h-[85px] print:max-h-none print:overflow-visible scrollbar-thin font-semibold">

                            {studentAlerts.length === 0 ? (

                                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 h-full">

                                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />

                                    <p className="text-[9px] font-bold">Tu asistencia está al día en todas las materias.</p>

                                </div>

                            ) : (

                                studentAlerts.map((al, idx) => (

                                    <div

                                        key={idx}

                                        className="flex flex-col gap-1 p-2 rounded-xl border border-red-200 bg-red-50/50 transition-all"

                                    >

                                        <div className="flex justify-between items-center">

                                            <p className="font-extrabold text-[11px] truncate max-w-[70%] text-red-700">

                                                {al.materia}

                                            </p>

                                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase ${al.isCritical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>

                                                {al.isCritical ? "Crítico" : "Advertencia"}

                                            </span>

                                        </div>

                                        <p className="text-[9px] text-gray-500 leading-normal">

                                            Asistencia: <span className="font-bold text-red-700">{al.porcentaje}%</span> · {al.descripcion}

                                        </p>

                                    </div>

                                ))

                            )}

                        </div>

                    </div>

                </div>



                {/* FILA DE DETALLES DEL RENDIMIENTO: Rendimiento por Asignatura + Desglose de puntualidad */}

                <div className="grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-6 mt-6">

                    {/* Columna 1: Rendimiento por Asignatura */}

                    <div

                        className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between h-[296px] w-full"

                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}

                    >

                        <div className="w-full">

                            <h3 className="font-bold text-sm tracking-tight" style={{ color: "#1A1A2E" }}>

                                Rendimiento por Asignatura

                            </h3>

                            <p className="text-[11px] text-gray-400 mt-0.5 mb-4">Porcentaje de asistencia por materia.</p>



                            <div className="space-y-3 max-h-[170px] print:max-h-none overflow-y-auto print:overflow-visible pr-1 scrollbar-thin">

                                {estudianteStats.asignaturas_asistencias.map((asig, i) => {

                                    const isRisk = asig.porcentaje < 80;

                                    const isCritical = asig.porcentaje < 70;

                                    const colorBar = isCritical ? "#EF4444" : isRisk ? "#F59E0B" : "#10B981";



                                    return (

                                        <div key={i} className="space-y-1">

                                            <div className="flex justify-between text-[11px] font-semibold">

                                                <span className="truncate max-w-[70%]" style={{ color: "#1A1A2E" }}>{asig.nombre}</span>

                                                <span style={{ color: colorBar }}>

                                                    {asig.porcentaje}% ({asig.asistidas}/{asig.dictadas})

                                                </span>

                                            </div>

                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">

                                                <div

                                                    className="h-full rounded-full transition-all duration-500"

                                                    style={{ width: `${asig.porcentaje}%`, backgroundColor: colorBar }}

                                                />

                                            </div>

                                        </div>

                                    );

                                })}

                            </div>

                        </div>

                        <div className="text-[10px] text-gray-400 font-bold border-t border-gray-50 pt-2 flex justify-between items-center mt-2 w-full">

                            <span>Asistencia mínima: 80%</span>

                            <span className="text-amber-500">Alerta &lt; 80%</span>

                        </div>

                    </div>



                    {/* Columna 2: Desglose de Puntualidad */}

                    <div

                        className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between h-[296px] w-full"

                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}

                    >

                        <div>

                            <h3 className="font-bold text-sm tracking-tight" style={{ color: "#1A1A2E" }}>

                                Desglose de Puntualidad

                            </h3>

                            <p className="text-[11px] text-gray-400 mt-0.5 mb-2">Frecuencia de estados en el semestre.</p>

                        </div>



                        {(() => {

                            const sumValues = estudianteStats.desglose_puntualidad.reduce((acc, curr) => acc + curr.value, 0);

                            const pieData = sumValues > 0 

                                ? estudianteStats.desglose_puntualidad 

                                : [{ name: "Sin registros", value: 1, color: "#E5E7EB" }];

                            return (

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12 h-full w-full">

                                    {/* Referencias al lado izquierdo */}

                                    <div className="flex flex-row sm:flex-col gap-4 sm:gap-3 justify-center shrink-0">

                                        {estudianteStats.desglose_puntualidad.map((entry, i) => (

                                            <div key={i} className="flex items-center gap-2">

                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />

                                                <div className="flex flex-col">

                                                    <span className="text-[9px] text-gray-400 font-bold uppercase leading-none">{entry.name}</span>

                                                    <span className="text-xs font-black mt-0.5" style={{ color: entry.color }}>

                                                        {entry.value}

                                                    </span>

                                                </div>

                                            </div>

                                        ))}

                                    </div>



                                    {/* Gráfico a la derecha (más grande) */}

                                    <div className="w-36 h-36 sm:w-48 sm:h-48 relative flex justify-center items-center shrink-0">

                                        {showCharts && (

                                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>

                                                <PieChart>

                                                    <Pie

                                                        data={pieData}

                                                        cx="50%"

                                                        cy="50%"

                                                        innerRadius="60%"

                                                        outerRadius="90%"

                                                        paddingAngle={sumValues > 0 ? 4 : 0}

                                                        dataKey="value"

                                                    >

                                                        {pieData.map((entry, index) => (

                                                            <Cell key={`cell-${index}`} fill={entry.color} />

                                                        ))}

                                                    </Pie>

                                                    {sumValues > 0 && (

                                                        <Tooltip

                                                            contentStyle={{ borderRadius: 10, fontSize: 10, border: "1px solid #F3F4F6" }}

                                                        />

                                                    )}

                                                </PieChart>

                                            </ResponsiveContainer>

                                        )}

                                    </div>

                                </div>

                            );

                        })()}

                    </div>

                </div>



                {/* HORARIO DEL DÍA */}

                <div className="space-y-3">

                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">

                        <Calendar size={15} /> Tus Clases de Hoy

                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        {estudianteStats.horarios_hoy.length === 0 ? (

                            <div className="flex items-center gap-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl col-span-full">

                                <Clock size={16} className="text-gray-400" />

                                <p className="text-xs text-gray-400 italic">No tienes clases agendadas para el día de hoy.</p>

                            </div>

                        ) : (

                            estudianteStats.horarios_hoy.map((h, i) => {

                                const badges = (() => {

                                    if (h.docente_asistio === false) {

                                        return {

                                            clase: { label: "Clase cancelada: Docente no asistió", bg: "bg-red-50 text-red-600 border border-red-100 font-bold w-full text-center text-[10px] py-1" },

                                            asistencia: null

                                        };

                                    }



                                    const now = new Date();

                                    const [hiHours, hiMinutes] = h.hora_inicio.split(":").map(Number);

                                    const [hfHours, hfMinutes] = h.hora_fin.split(":").map(Number);

                                    

                                    const start = new Date(now);

                                    start.setHours(hiHours, hiMinutes, 0, 0);

                                    

                                    const end = new Date(now);

                                    end.setHours(hfHours, hfMinutes, 0, 0);



                                    const hasSession = !!(h.sesion_id && h.sesion_id !== "null" && h.sesion_id !== "undefined");

                                    const sesionEstado = h.sesion_estado;

                                    const hasEntry = !!h.hora_entrada;

                                    const hasExit = !!h.hora_salida;



                                    if (now < start) {

                                        // Antes de la hora teórica: no mostrar badges

                                        return { clase: null, asistencia: null };

                                    } else if (now >= start && now <= end) {

                                        // Durante la clase

                                        if (!hasSession) {

                                            return {

                                                clase: { label: "Pendiente", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" },

                                                asistencia: { label: "Asistencia pendiente", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" }

                                            };

                                        } else {

                                            const asistenciaBadge = (() => {

                                                if (!hasEntry) {

                                                    return { label: "Asistencia pendiente", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" };

                                                } else if (!hasExit) {

                                                    return { label: "Asistencia no completada", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" };

                                                } else {

                                                    return { label: "Asistencia completada", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" };

                                                }

                                            })();

                                            return {

                                                clase: { label: "Clase en curso", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse font-bold" },

                                                asistencia: asistenciaBadge

                                            };

                                        }

                                    } else {

                                        // Después de la clase (now > end)

                                        if (!hasSession) {

                                            return {

                                                clase: { label: "Clase cancelada: Docente no asistió", bg: "bg-red-50 text-red-600 border border-red-100 font-bold w-full text-center text-[10px] py-1" },

                                                asistencia: null

                                            };

                                        } else if (sesionEstado === "abierta") {

                                            const asistenciaBadge = (() => {

                                                if (!hasEntry) {

                                                    return { label: "Asistencia pendiente", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" };

                                                } else if (!hasExit) {

                                                    return { label: "Asistencia no completada", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold" };

                                                } else {

                                                    return { label: "Asistencia completada", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" };

                                                }

                                            })();

                                            return {

                                                clase: { label: "Clase en curso", bg: "bg-amber-50 text-amber-700 border border-amber-200/60 animate-pulse font-bold" },

                                                asistencia: asistenciaBadge

                                            };

                                        } else {

                                            // Sesión completa

                                            const asistenciaBadge = (() => {

                                                if (!hasEntry) {

                                                    return { label: "Inasistencia", bg: "bg-red-50 text-red-600 border border-red-200/60 font-bold" };

                                                } else if (!hasExit) {

                                                    return { label: "Asistencia no completa: Inasistencia", bg: "bg-red-50 text-red-600 border border-red-200/60 font-bold" };

                                                } else {

                                                    return { label: "Asistencia completada", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" };

                                                }

                                            })();

                                            return {

                                                clase: { label: "Clase terminada", bg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold" },

                                                asistencia: asistenciaBadge

                                            };

                                        }

                                    }

                                })();



                                return (

                                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.02)" }}>

                                        <div>

                                            <div className="flex justify-between items-start gap-2">

                                                <p className="font-bold text-sm text-[#1A1A2E] leading-tight truncate" title={h.asignatura}>{h.asignatura}</p>

                                                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg bg-gray-100/80 text-gray-500 shrink-0">

                                                    Aula {h.aula}

                                                </span>

                                            </div>

                                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Grupo {h.grupo} • {h.hora_inicio} - {h.hora_fin}</p>

                                        </div>

                                        <div className="border-t border-gray-50 pt-3 flex flex-wrap gap-2 justify-between items-center w-full">

                                            {badges.clase && (

                                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${badges.clase.bg}`}>

                                                    {badges.clase.label}

                                                </span>

                                            )}

                                            {badges.asistencia && (

                                                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${badges.asistencia.bg}`}>

                                                    {badges.asistencia.label}

                                                </span>

                                            )}

                                        </div>

                                    </div>

                                );

                            })

                        )}

                    </div>

                </div>



                {/* FILA DE GRÁFICO SEMANAL PARA ESTUDIANTE */}

                <div

                    className="bg-white p-6 rounded-2xl border border-gray-100 mt-6"

                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)", breakInside: "avoid", pageBreakInside: "avoid" }}

                >

                    <div className="flex justify-between items-start mb-6">

                        <div>

                            <h3 className="font-bold text-base" style={{ color: "#1A1A2E" }}>

                                Mi Tasa de Asistencia Semanal

                            </h3>

                            <p className="text-xs text-gray-400 mt-0.5">

                                Histórico de tus asistencias e inasistencias promedio por día de clase.

                            </p>

                        </div>

                        <div className="hidden lg:block print:block w-[40%] text-right pr-6">

                            <h3 className="font-bold text-xs uppercase tracking-widest text-gray-400">

                                MI TASA DE ASISTENCIA DIARIA (%)

                            </h3>

                            <p className="text-[10px] text-gray-400 mt-0.5">Distribución porcentual acumulada de lunes a sábado</p>

                        </div>

                    </div>



                    <div className="grid grid-cols-1 lg:grid-cols-5 print:grid-cols-5 gap-6 items-start">

                        {/* Lado izquierdo: Filtro + Gráfico de Barras */}

                        <div className="lg:col-span-3 print:col-span-3 space-y-4">

                            <div className="flex flex-wrap items-center gap-3">

                                {/* Filtro de Semanas */}

                                <div className="flex flex-wrap items-center gap-1 bg-gray-100/60 p-1 rounded-xl border border-gray-200/50 h-auto min-h-8 print:hidden">

                                    {quickWeeks.map(qw => (

                                        <button

                                            key={qw.val}

                                            type="button"

                                            onClick={() => setFiltroSemana(qw.val)}

                                            className={`text-[10px] font-extrabold px-2.5 h-6 rounded-lg transition-all ${filtroSemana === qw.val

                                                    ? "bg-white text-sara-red shadow-sm"

                                                    : "text-gray-500 hover:text-gray-700"

                                                }`}

                                        >

                                            {qw.label}

                                        </button>

                                    ))}



                                                                        <div className="relative h-6">

                                         <button

                                             type="button"

                                             onClick={() => setOpenWeekDropdownEstudiante(!openWeekDropdownEstudiante)}

                                             className={`text-[10px] font-extrabold px-2.5 h-6 rounded-lg transition-all flex items-center gap-1 ${filtroSemana !== "actual" && filtroSemana !== "ultimas_5" && filtroSemana !== "ultimas_10" && filtroSemana !== "todo"

                                                     ? "bg-white text-sara-red shadow-sm"

                                                     : "text-gray-500 hover:text-gray-700"

                                                 }`}

                                         >

                                             {filtroSemana !== "actual" && filtroSemana !== "ultimas_5" && filtroSemana !== "ultimas_10" && filtroSemana !== "todo"

                                                 ? `Sem. ${filtroSemana}`

                                                 : "Otra..."}

                                         </button>

                                         {openWeekDropdownEstudiante && (

                                             <>

                                                 <div className="fixed inset-0 z-20" onClick={() => setOpenWeekDropdownEstudiante(false)} />

                                                 <div className="absolute left-0 md:left-auto md:right-0 top-full pt-1.5 z-30">

                                                     <div className="bg-white border border-gray-100 rounded-xl shadow-lg py-1 max-h-40 overflow-y-auto w-28 scrollbar-thin">

                                                         {Array.from({ length: adminStats?.semana_actual ?? 1 }, (_, i) => {

                                                             const w = i + 1;

                                                             return (

                                                                 <button

                                                                     key={w}

                                                                     type="button"

                                                                     onClick={() => {

                                                                         setFiltroSemana(String(w));

                                                                         setOpenWeekDropdownEstudiante(false);

                                                                     }}

                                                                     className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 text-[10px] font-bold border-b border-gray-50 last:border-0 ${filtroSemana === String(w) ? "text-sara-red" : "text-gray-600"

                                                                         }`}

                                                                 >

                                                                     Semana {w}

                                                                 </button>

                                                             );

                                                         })}

                                                     </div>

                                                 </div>

                                             </>

                                         )}

                                     </div>

                                </div>

                                <div className="hidden print:flex items-center gap-1 bg-gray-100/60 p-1 rounded-xl border border-gray-200/50 h-8">

                                    <div className="bg-white text-sara-red shadow-sm text-[10px] font-extrabold px-2.5 h-6 rounded-lg flex items-center justify-center">

                                        {filtroSemana === "actual" ? "Semana Actual"

                                         : filtroSemana === "ultimas_5" ? "Últimas 5"

                                         : filtroSemana === "ultimas_10" ? "Últimas 10"

                                         : filtroSemana === "todo" ? "Todo"

                                         : `Semana ${filtroSemana}`}

                                    </div>

                                </div>

                            </div>



                            {showCharts && (

                                <ResponsiveContainer width="100%" height={240} minWidth={0}>

                                    <BarChart data={adminStats?.asistencia_semanal ?? []} barGap={6} barCategoryGap="30%">

                                        <CartesianGrid strokeDasharray="3 3" stroke="#F9FAFB" vertical={false} />

                                        <XAxis

                                            dataKey="dia"

                                            tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}

                                            axisLine={false}

                                            tickLine={false}

                                        />

                                        <YAxis

                                            tick={{ fontSize: 10, fill: "#9CA3AF" }}

                                            axisLine={false}

                                            tickLine={false}

                                            width={25}

                                        />

                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB", radius: 8 }} />

                                        <Legend

                                            iconType="circle"

                                            iconSize={8}

                                            wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}

                                        />

                                        <Bar dataKey="a_tiempo" stackId="asistencia" name="A tiempo" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={16} />

                                        <Bar dataKey="tardes" stackId="asistencia" name="Tarde" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={16} />

                                        <Bar dataKey="ausentes" name="Inasistencias" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={16} />

                                    </BarChart>

                                </ResponsiveContainer>

                            )}

                        </div>



                        {/* Lado derecho: Radial concéntrico */}

                        <div className="lg:col-span-2 print:col-span-2 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 w-full">

                            <div className="relative w-full flex items-center justify-center" style={{ height: 270 }}>

                                {showCharts && (

                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>

                                        <RadialBarChart

                                            cx="50%"

                                            cy="50%"

                                            innerRadius="20%"

                                            outerRadius="95%"

                                            barSize={12}

                                            startAngle={90}

                                            endAngle={-270}

                                            data={

                                                (adminStats?.asistencia_semanal ?? []).map((d, index) => {

                                                    const total = d.presentes + d.ausentes;

                                                    const pct = total > 0 ? Math.round((d.presentes / total) * 100) : 0;

                                                    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#84CC16", "#8B5CF6"];

                                                    return {

                                                        name: d.dia,

                                                        uv: pct,

                                                        fill: colors[index % colors.length]

                                                    };

                                                }).reverse()

                                            }

                                        >

                                            <PolarAngleAxis

                                                type="number"

                                                domain={[0, 100]}

                                                angleAxisId={0}

                                                tick={false}

                                            />

                                            <RadialBar

                                                background={{ fill: "#F3F4F6" }}

                                                dataKey="uv"

                                                cornerRadius={6}

                                            />

                                            <Tooltip

                                                labelFormatter={() => "Asistencia Semanal"}

                                                formatter={(value, name, entry: any) => {

                                                    const rawName = entry?.payload?.name || name;

                                                    const nameStr = String(rawName);

                                                    const capitalized = nameStr ? nameStr.charAt(0).toUpperCase() + nameStr.slice(1) : nameStr;

                                                    return [`${value}%`, capitalized];

                                                }}

                                                contentStyle={{ fontSize: 10, borderRadius: 8 }}

                                            />

                                        </RadialBarChart>

                                    </ResponsiveContainer>

                                )}

                            </div>



                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-2 gap-y-2 text-[9px] font-bold text-gray-500 w-full px-2 justify-center mt-3">

                                {(adminStats?.asistencia_semanal ?? []).map((d, index) => {

                                    const total = d.presentes + d.ausentes;

                                    const pct = total > 0 ? Math.round((d.presentes / total) * 100) : 0;

                                    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EC4899", "#84CC16", "#8B5CF6"];

                                    return (

                                        <div key={index} className="flex flex-col items-center justify-center text-center">

                                            <div className="flex items-center gap-1">

                                                <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: colors[index % colors.length] }} />

                                                <span>{d.dia}</span>

                                            </div>

                                            <span className="text-gray-700 font-extrabold mt-0.5">{pct}%</span>

                                        </div>

                                    );

                                })}

                            </div>

                        </div>

                    </div>

                </div>



                {/* FILA DE DETALLE DE PERMANENCIA PARA ESTUDIANTE */}

                <div

                    className="bg-white p-6 rounded-2xl border border-gray-100 mt-6"

                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)", breakInside: "avoid", pageBreakInside: "avoid" }}

                >

                    <div className="flex flex-col xl:flex-row justify-start items-start xl:items-center gap-6 xl:gap-10 mb-6">

                        <div className="max-w-[280px] shrink-0">

                            <h3 className="font-bold text-base" style={{ color: "#1A1A2E" }}>

                                Mi Permanencia en Clase

                            </h3>

                            <p className="text-xs text-gray-400 mt-0.5">

                                Porcentaje de permanencia real en el aula por asignatura y semana.

                            </p>

                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">





                            {/* Filtro de Asignatura */}

                            <div className="flex flex-col gap-1 w-full sm:w-[300px]">

                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asignatura</label>

                                <select

                                    value={selectedAsignaturaPerm}

                                    onChange={(e) => setSelectedAsignaturaPerm(e.target.value)}

                                    className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer w-full print:hidden"

                                >

                                    <option value="todos">Todas las asignaturas</option>

                                    {asignaturasFiltro.map((a) => (

                                        <option key={a.id} value={a.id}>

                                            {a.nombre}

                                        </option>

                                    ))}

                                </select>

                                <div className="hidden print:block text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 font-semibold w-full truncate">

                                    {selectedAsignaturaPerm === "todos" ? "Todas las asignaturas" : (asignaturasFiltro.find(a => a.id === selectedAsignaturaPerm)?.nombre || selectedAsignaturaPerm)}

                                </div>

                            </div>

                        </div>

                    </div>



                    <div className="relative">

                        {loadingPermanencia && (

                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">

                                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />

                            </div>

                        )}

                        {showCharts && (

                            <ResponsiveContainer width="100%" height={220} minWidth={0}>

                                <AreaChart data={permanenciaStats} margin={{ left: 5, right: 5, top: 10 }}>

                                    <defs>

                                        <linearGradient id="colorPermDetalleEst" x1="0" y1="0" x2="0" y2="1">

                                            <stop offset="5%" stopColor="#D97706" stopOpacity={0.15} />

                                            <stop offset="95%" stopColor="#D97706" stopOpacity={0} />

                                        </linearGradient>

                                    </defs>

                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />

                                    <XAxis

                                        dataKey="semana"

                                        tick={{ fontSize: 10, fill: "#9CA3AF" }}

                                        axisLine={false}

                                        tickLine={false}

                                    />

                                    <YAxis

                                        domain={[0, 100]}

                                        tick={{ fontSize: 10, fill: "#9CA3AF" }}

                                        axisLine={false}

                                        tickLine={false}

                                        width={25}

                                    />

                                    <Tooltip

                                        content={({ active, payload, label }) => {

                                            if (active && payload && payload.length) {

                                                const data = payload[0].payload;

                                                return (

                                                    <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-lg text-xs space-y-1">

                                                        <p className="font-bold text-gray-700">{label}</p>

                                                        <p className="text-amber-600 font-semibold">

                                                            Permanencia Promedio: <strong className="font-extrabold">{Number(data.permanencia).toFixed(2)}%</strong>

                                                        </p>

                                                        <p className="text-gray-500 font-medium">

                                                            Asistencias evaluadas: <strong className="font-bold text-gray-700">{data.total_asistencias ?? 0}</strong>

                                                        </p>

                                                    </div>

                                                );

                                            }

                                            return null;

                                        }}

                                    />

                                    <Area

                                        type="monotone"

                                        dataKey="permanencia"

                                        stroke="#D97706"

                                        strokeWidth={2}

                                        fill="url(#colorPermDetalleEst)"

                                        dot={{ fill: "#D97706", r: 3 }}

                                    />

                                </AreaChart>

                            </ResponsiveContainer>

                        )}

                    </div>

                </div>

            </div>

        );

    }



    return null;

}



// Auxiliares

function strTime(t: any): string {

    if (!t) return "";

    return String(t).substring(0, 5);

}

