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
    obtenerAdminStats, obtenerEstudianteStats, AdminStats, EstudianteStats,
    obtenerUsuariosFiltro, obtenerAsignaturasFiltro, obtenerPermanenciaStats,
    UsuarioFiltro, AsignaturaFiltro, PermanenciaStats 
} from "@/services/dashboard";

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
        <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ background: "#FFF5F5", borderColor: "#8B1A1A40" }}>
            <ShieldAlert size={20} style={{ color: "#8B1A1A" }} className="shrink-0" />
            <p className="text-sm font-semibold" style={{ color: "#8B1A1A" }}>
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
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [filtroRol, setFiltroRol] = useState<string>("todos");
    const [filtroSemana, setFiltroSemana] = useState<string>("actual");
    const [showCharts, setShowCharts] = useState(false);

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
                const users = await obtenerUsuariosFiltro(selectedRolPerm);
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
    }, [selectedRolPerm, loading, sesion.rol]);

    // Cargar lista de asignaturas al cambiar el usuario seleccionado
    useEffect(() => {
        const fetchAsignaturas = async () => {
            try {
                const uId = selectedUsuarioPerm === "todos" ? undefined : selectedUsuarioPerm;
                const subjects = await obtenerAsignaturasFiltro(uId);
                setAsignaturasFiltro(subjects);
                setSelectedAsignaturaPerm("todos");
            } catch (err) {
                console.error("Error al cargar asignaturas para filtro de permanencia:", err);
            }
        };
        if (!loading && (sesion.rol === "Administrativo" || sesion.rol === "Docente")) {
            fetchAsignaturas();
        }
    }, [selectedUsuarioPerm, loading, sesion.rol]);

    // Cargar estadísticas de permanencia al cambiar cualquiera de los 3 filtros
    useEffect(() => {
        const fetchPermanenciaStats = async () => {
            setLoadingPermanencia(true);
            try {
                const uId = selectedUsuarioPerm === "todos" ? undefined : selectedUsuarioPerm;
                const aId = selectedAsignaturaPerm === "todos" ? undefined : selectedAsignaturaPerm;
                const stats = await obtenerPermanenciaStats(selectedRolPerm, uId, aId);
                setPermanenciaStats(stats);
            } catch (err) {
                console.error("Error al cargar estadísticas de permanencia:", err);
            } finally {
                setLoadingPermanencia(false);
            }
        };
        if (!loading && (sesion.rol === "Administrativo" || sesion.rol === "Docente")) {
            fetchPermanenciaStats();
        }
    }, [selectedRolPerm, selectedUsuarioPerm, selectedAsignaturaPerm, loading, sesion.rol]);



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
                    const stats = await obtenerAdminStats(filtroRol, filtroSemana);
                    setAdminStats(stats);
                    if (currentSession.rol === "Docente") {
                        const hor = await listarHorarios();
                        setHorarios(hor.filter((h: Horario) => h.docente_id === currentSession.id));
                    }
                } else if (currentSession.rol === "Estudiante") {
                    const stats = await obtenerEstudianteStats(currentSession.id);
                    setEstudianteStats(stats);
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

    const registrarClase = async (h: Horario) => {
        if (!confirm(`¿Confirmar que dictaste la clase de ${h.asignatura}?`)) return;
        try {
            await crearSesion({
                horario_id: h.id,
                fecha: new Date().toISOString().split('T')[0],
                docente_asistio: true,
                creado_por: sesion.id
            });
            alert("Sesión registrada con éxito");
            // Refrescar estadísticas
            const stats = await obtenerAdminStats(filtroRol, filtroSemana);
            setAdminStats(stats);
        } catch (e: any) { 
            alert("Error: Posiblemente ya registraste esta sesión hoy."); 
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-12 h-12 border-4 border-sara-red border-t-transparent rounded-full animate-spin" style={{ borderColor: "#8B1A1A", borderTopColor: "transparent" }} />
                <p className="text-gray-400 text-sm font-medium animate-pulse">Cargando estadísticas en tiempo real...</p>
            </div>
        );
    }

    // ── VISTA ADMINISTRATIVO Y DOCENTE ─────────────────────────────────────────
    if (sesion.rol === "Administrativo" || sesion.rol === "Docente") {
        const metricasGrid = [
            {
                label: "Estudiantes activos",
                value: adminStats?.metricas.estudiantes_activos ?? "0 / 0",
                icon: <Users size={18} />,
                bg: "#3B82F6",
                trend: "Semestre en curso",
                trendColor: "#3B82F6",
            },
            {
                label: "Docentes activos",
                value: adminStats?.metricas.docentes_activos ?? "0 / 0",
                icon: <Users size={18} />,
                bg: "#C9A84C",
                trend: "Docentes registrados",
                trendColor: "#C9A84C",
            },
            {
                label: "Asistencia promedio",
                value: adminStats?.metricas.asistencia_promedio ?? "0%",
                icon: <TrendingUp size={18} />,
                bg: "#10B981",
                trend: "Asistencia general",
                trendColor: "#10B981",
            },
            {
                label: "Cumplimiento Docente",
                value: adminStats?.metricas.cumplimiento_docente ?? "100%",
                icon: <UserCheck size={18} />,
                bg: "#8B1A1A",
                trend: "Tasa de clases dictadas",
                trendColor: "#8B1A1A",
            },
        ];

        return (
            <div className="space-y-6">
                <Suspense fallback={null}>
                    <AccesoDenegadoBanner />
                </Suspense>

                {/* BIENVENIDA */}
                <div className="bg-gradient-to-r from-sidebar-bg to-black text-white p-6 rounded-3xl relative overflow-hidden shadow-sm" style={{ background: "linear-gradient(135deg, #1e1e30 0%, #11111d 100%)" }}>
                    <div className="relative z-10 space-y-1">
                        <span className="text-xs uppercase font-extrabold text-sara-gold tracking-widest" style={{ color: "#C9A84C" }}>Panel Administrativo</span>
                        <h1 className="text-2xl font-black">¡Hola, {sesion.nombre}!</h1>
                        <p className="text-xs text-gray-400 max-w-xl">Supervisa el ausentismo, detecta riesgos de deserción escolar temprana y gestiona las contingencias académicas de SARA.</p>
                    </div>
                    <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial-gradient opacity-10 pointer-events-none" />
                </div>

                {/* FILA DE RESUMEN: KPIs (Matriz 2x2) + ALERTAS DE DESERCIÓN en disposición 50/50 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Matriz 2x2 de KPIs (ocupa la mitad izquierda) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {metricasGrid.map((stat, i) => (
                            <div
                                key={i}
                                className="relative overflow-hidden bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex justify-between items-center h-[140px] group/card"
                                style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}
                            >
                                {/* Decorative background glow on hover */}
                                <div 
                                    className="absolute -right-10 -bottom-10 w-24 h-24 rounded-full opacity-0 group-hover/card:opacity-10 transition-opacity duration-500 blur-xl"
                                    style={{ background: stat.bg }}
                                />

                                <div className="flex flex-col justify-between h-full py-1">
                                    <p className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider">{stat.label}</p>
                                    <p className="text-3xl font-black mt-2 leading-none" style={{ color: "#1A1A2E" }}>{stat.value}</p>
                                    <p className="text-[10px] font-bold flex items-center gap-1 mt-2" style={{ color: stat.trendColor }}>
                                        <Activity size={10} className="animate-pulse" /> {stat.trend}
                                    </p>
                                </div>

                                <div
                                    className="p-3.5 rounded-full text-white shadow-md transition-all duration-300 group-hover/card:scale-105"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${stat.bg}, ${stat.bg}DD)`, 
                                        boxShadow: `0 6px 12px ${stat.bg}20` 
                                    }}
                                >
                                    {stat.icon}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Alertas Críticas de Deserción (ocupa la mitad derecha, alineada a 296px de alto) */}
                    <div
                        className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between h-[296px]"
                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
                    >
                        <div>
                            <h3 className="font-bold text-base mb-1 flex items-center gap-2" style={{ color: "#1A1A2E" }}>
                                <AlertTriangle size={16} className="text-sara-red" style={{ color: "#8B1A1A" }} /> Alertas de Deserción
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Riesgos y ausentismo crítico detectados</p>
                        </div>
                        
                        <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[160px] scrollbar-thin">
                            {!adminStats || adminStats.alertas_desercion.length === 0 ? (
                                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                                    <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                                    <p className="text-[10px] font-bold">No se detectan alertas en el sistema.</p>
                                </div>
                            ) : (
                                adminStats.alertas_desercion.map((al, idx) => (
                                    <div
                                        key={idx}
                                        className="flex flex-col gap-1.5 p-3 rounded-xl border transition-all"
                                        style={{ background: "#FFF5F5", borderColor: "#8B1A1A20" }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <p className="font-extrabold text-xs" style={{ color: "#8B1A1A" }}>
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

                {/* CLASES DEL DOCENTE (Solo si rol === Docente) */}
                {sesion.rol === "Docente" && (
                    <div className="space-y-4">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={15} /> Tus Clases de Hoy
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {horarios.length === 0 ? (
                                <p className="text-gray-400 text-xs italic col-span-full bg-white p-4 rounded-2xl border text-center border-gray-100">No tienes horarios asignados para hoy.</p>
                            ) : (
                                horarios.map(h => (
                                    <div key={h.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-sidebar-bg leading-none" style={{ color: "#1A1A2E" }}>{h.asignatura}</p>
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-sara-red/10 text-sara-red" style={{ background: "rgba(139,26,26,0.08)", color: "#8B1A1A" }}>
                                                    {h.aula}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium">{h.dia_semana} | {strTime(h.hora_inicio)} - {strTime(h.hora_fin)}</p>
                                            <p className="text-[9px] text-gray-400 font-extrabold mt-1">GRUPO {h.grupo}</p>
                                        </div>
                                        <button onClick={() => registrarClase(h)} className="px-3 py-1.5 bg-sidebar-bg text-white text-xs font-bold rounded-xl hover:bg-black transition-colors shrink-0" style={{ background: "#1e1e30" }}>
                                            Confirmar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* FILA DE GRÁFICO SEMANAL (A ANCHO COMPLETO CON CONCENTRIC RADIAL BARCHART EN PROPORCIÓN 3:2 Y ENLAZADO A SABADO) */}
                <div
                    className="bg-white p-6 rounded-2xl border border-gray-100"
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
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
                        <div className="hidden lg:block w-[40%] text-right pr-6">
                            <h3 className="font-bold text-xs uppercase tracking-widest text-gray-400">
                                TASA DE ASISTENCIA DIARIA (%)
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Distribución porcentual acumulada de lunes a sábado</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                        {/* Lado izquierdo: Filtros + Gráfico de Barras (3/5 de ancho) */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Filtros colocados directamente sobre la gráfica de barras */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Filtro de Rol */}
                                <select
                                    value={filtroRol}
                                    onChange={(e) => setFiltroRol(e.target.value)}
                                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-sara-red transition-all cursor-pointer h-8"
                                    style={{ color: "#1A1A2E" }}
                                >
                                    <option value="todos">Todos los Roles</option>
                                    <option value="estudiante">Estudiantes</option>
                                    <option value="docente">Docentes</option>
                                </select>

                                {/* Filtro de Semanas */}
                                <div className="flex flex-wrap items-center gap-1 bg-gray-100/60 p-1 rounded-xl border border-gray-200/50 h-8">
                                    {quickWeeks.map(qw => (
                                        <button
                                            key={qw.val}
                                            type="button"
                                            onClick={() => setFiltroSemana(qw.val)}
                                            className={`text-[10px] font-extrabold px-2.5 h-6 rounded-lg transition-all ${
                                                filtroSemana === qw.val
                                                    ? "bg-white text-sara-red shadow-sm"
                                                    : "text-gray-500 hover:text-gray-700"
                                            }`}
                                        >
                                            {qw.label}
                                        </button>
                                    ))}
                                    
                                    <div className="relative group/week h-6">
                                        <button
                                            type="button"
                                            className={`text-[10px] font-extrabold px-2.5 h-6 rounded-lg transition-all flex items-center gap-1 ${
                                                filtroSemana !== "actual" && filtroSemana !== "ultimas_5" && filtroSemana !== "ultimas_10" && filtroSemana !== "todo"
                                                    ? "bg-white text-sara-red shadow-sm"
                                                    : "text-gray-500 hover:text-gray-700"
                                            }`}
                                        >
                                            {filtroSemana !== "actual" && filtroSemana !== "ultimas_5" && filtroSemana !== "ultimas_10" && filtroSemana !== "todo"
                                                ? `Sem. ${filtroSemana}`
                                                : "Otra..."}
                                        </button>
                                        <div className="absolute right-0 top-full pt-1.5 hidden group-hover/week:block z-30">
                                            <div className="bg-white border border-gray-100 rounded-xl shadow-lg py-1 max-h-40 overflow-y-auto w-28 scrollbar-thin">
                                                {Array.from({ length: adminStats?.semana_actual ?? 1 }, (_, i) => {
                                                    const w = i + 1;
                                                    return (
                                                        <button
                                                            key={w}
                                                            type="button"
                                                            onClick={() => setFiltroSemana(String(w))}
                                                            className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 text-[10px] font-bold border-b border-gray-50 last:border-0 ${
                                                                filtroSemana === String(w) ? "text-sara-red" : "text-gray-600"
                                                            }`}
                                                        >
                                                            Semana {w}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
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
                                        <Bar dataKey="presentes" name="Asistencias" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="ausentes" name="Inasistencias" fill="#8B1A1A" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Lado derecho: Gráfico Radial Concéntrico (2/5 de ancho, ampliado masivamente al quitar el titulo interno) */}
                        <div className="lg:col-span-2 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-6 w-full">
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
                                                formatter={(value) => [`${value}%`, "Asistencia"]}
                                                contentStyle={{ fontSize: 10, borderRadius: 8 }}
                                            />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Leyenda Personalizada Concéntrica en la base (6 columnas para Lun - Sab) */}
                            <div className="grid grid-cols-6 gap-x-2 gap-y-2 text-[9px] font-bold text-gray-500 w-full px-2 justify-center mt-3">
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
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
                >
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                        <div>
                            <h3 className="font-bold text-base" style={{ color: "#1A1A2E" }}>
                                Detalle de Permanencia en Clase
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Analiza el porcentaje de tiempo real de permanencia de estudiantes o docentes en el aula
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                            {/* Filtro de Rol */}
                            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[180px]">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rol</label>
                                <select 
                                    value={selectedRolPerm}
                                    onChange={(e) => setSelectedRolPerm(e.target.value)}
                                    className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer"
                                >
                                    <option value="todos">Ambos (Docentes y Estudiantes)</option>
                                    <option value="estudiante">Estudiantes</option>
                                    <option value="docente">Docentes</option>
                                </select>
                            </div>

                            {/* Filtro de Persona/Usuario */}
                            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[200px]">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Persona</label>
                                <select 
                                    value={selectedUsuarioPerm}
                                    onChange={(e) => setSelectedUsuarioPerm(e.target.value)}
                                    className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer"
                                >
                                    <option value="todos">Todos los usuarios</option>
                                    {usuariosFiltro.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.apellidos}, {u.nombres} ({u.rol})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtro de Asignatura */}
                            <div className="flex flex-col gap-1 w-full sm:w-auto sm:min-w-[200px]">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asignatura</label>
                                <select 
                                    value={selectedAsignaturaPerm}
                                    onChange={(e) => setSelectedAsignaturaPerm(e.target.value)}
                                    className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer"
                                >
                                    <option value="todos">Todas las asignaturas</option>
                                    {asignaturasFiltro.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.nombre}
                                        </option>
                                    ))}
                                </select>
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
            },
            {
                label: "Horarios programados hoy",
                value: estudianteStats.horarios_hoy.length,
                icon: <Clock size={22} />,
                bg: "#8B1A1A",
                trend: "Clases para el día",
                trendColor: "#8B1A1A"
            }
        ];

        return (
            <div className="space-y-6">
                {/* BIENVENIDA ESTUDIANTE */}
                <div className="bg-gradient-to-r from-sidebar-bg to-black text-white p-6 rounded-3xl relative overflow-hidden shadow-sm" style={{ background: "linear-gradient(135deg, #1e1e30 0%, #11111d 100%)" }}>
                    <div className="relative z-10 space-y-1">
                        <span className="text-xs uppercase font-extrabold text-sara-gold tracking-widest" style={{ color: "#C9A84C" }}>Portal del Estudiante</span>
                        <h1 className="text-2xl font-black">¡Hola, {sesion.nombre}!</h1>
                        <p className="text-xs text-gray-400 max-w-xl">Revisa tu porcentaje de asistencia en cada materia. Recuerda que no debes superar el 20% de inasistencias en el periodo académico.</p>
                    </div>
                </div>

                {/* GRID ESTUDIANTE */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {studentMetricas.map((stat, i) => (
                        <div
                            key={i}
                            className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300"
                            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div
                                    className="p-3 rounded-xl text-white"
                                    style={{ background: stat.bg, boxShadow: `0 4px 12px ${stat.bg}25` }}
                                >
                                    {stat.icon}
                                </div>
                            </div>
                            <p className="text-gray-400 text-xs font-semibold">{stat.label}</p>
                            <p className="text-3xl font-black mt-1" style={{ color: "#1A1A2E" }}>{stat.value}</p>
                            <p className="text-[10px] font-bold mt-2" style={{ color: stat.trendColor }}>
                                {stat.trend}
                            </p>
                        </div>
                    ))}
                </div>

                {/* HORARIO DEL DÍA */}
                <div className="space-y-3">
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={15} /> Tus Clases para Hoy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {estudianteStats.horarios_hoy.length === 0 ? (
                            <div className="flex items-center gap-2 p-4 bg-gray-50 border border-gray-100 rounded-2xl col-span-full">
                                <Clock size={16} className="text-gray-400" />
                                <p className="text-xs text-gray-400 italic">No tienes clases agendadas para el día de hoy.</p>
                            </div>
                        ) : (
                            estudianteStats.horarios_hoy.map((h, i) => (
                                <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-2">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-sm text-sidebar-bg" style={{ color: "#1A1A2E" }}>{h.asignatura}</p>
                                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                                                Aula {h.aula}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-semibold">{h.hora_inicio} - {h.hora_fin}</p>
                                    </div>
                                    <div className="border-t border-gray-50 pt-2 flex justify-between items-center text-[9px] font-extrabold text-gray-400">
                                        <span>GRUPO {h.grupo}</span>
                                        <span className="text-emerald-600 uppercase flex items-center gap-1">
                                            <Activity size={10} /> Activa
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* GRÁFICOS DEL ESTUDIANTE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Lista de asignaturas y barras horizontales */}
                    <div
                        className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100"
                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
                    >
                        <h3 className="font-bold text-base mb-1" style={{ color: "#1A1A2E" }}>
                            Rendimiento por Asignatura
                        </h3>
                        <p className="text-xs text-gray-400 mb-5">Porcentaje de asistencia en cada materia matriculada.</p>

                        <div className="space-y-4">
                            {estudianteStats.asignaturas_asistencias.map((asig, i) => {
                                const isRisk = asig.porcentaje < 80;
                                const isCritical = asig.porcentaje < 70;
                                const colorBar = isCritical ? "#EF4444" : isRisk ? "#F59E0B" : "#10B981";

                                return (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span style={{ color: "#1A1A2E" }}>{asig.nombre}</span>
                                            <span style={{ color: colorBar }}>
                                                {asig.porcentaje}% ({asig.asistidas}/{asig.dictadas})
                                            </span>
                                        </div>
                                        <div className="h-2 w-100 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-500" 
                                                style={{ width: `${asig.porcentaje}%`, backgroundColor: colorBar }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] text-gray-400">
                                            <span>Asistencia mínima reglamentaria: 80%</span>
                                            {isCritical ? (
                                                <span className="text-red-500 font-bold">Riesgo de pérdida</span>
                                            ) : isRisk ? (
                                                <span className="text-amber-500 font-bold">Alerta de inasistencias</span>
                                            ) : (
                                                <span className="text-emerald-500 font-bold">Estado seguro</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Desglose de puntualidad */}
                    <div
                        className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col justify-between"
                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.03)" }}
                    >
                        <div>
                            <h3 className="font-bold text-base mb-1" style={{ color: "#1A1A2E" }}>
                                Desglose de Puntualidad
                            </h3>
                            <p className="text-xs text-gray-400 mb-6">Frecuencia de estados registrados en el semestre.</p>
                        </div>

                        <div className="flex justify-center items-center h-40">
                            {showCharts && (
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <PieChart>
                                        <Pie
                                            data={estudianteStats.desglose_puntualidad}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {estudianteStats.desglose_puntualidad.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: 10, fontSize: 11, border: "1px solid #F3F4F6" }} 
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                            {estudianteStats.desglose_puntualidad.map((entry, i) => (
                                <div key={i} className="space-y-0.5">
                                    <p className="text-[10px] text-gray-400 font-semibold">{entry.name}</p>
                                    <p className="text-sm font-black" style={{ color: entry.color }}>
                                        {entry.value}
                                    </p>
                                </div>
                            ))}
                        </div>
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
