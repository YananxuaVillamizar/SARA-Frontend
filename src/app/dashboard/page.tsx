"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Users, TrendingUp, AlertTriangle, UserCheck, ShieldAlert, Calendar, Construction } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart
} from "recharts";
import { getSesion } from "@/services/auth";
import { listarHorarios, Horario } from "@/services/admin";
import { crearSesion } from "@/services/contingencias";

// ── Datos de ejemplo (luego vendrán del backend) ──────────────────────────────
const asistenciaSemanal = [
    { dia: "Lun", presentes: 28, ausentes: 8 },
    { dia: "Mar", presentes: 32, ausentes: 4 },
    { dia: "Mié", presentes: 24, ausentes: 12 },
    { dia: "Jue", presentes: 30, ausentes: 6 },
    { dia: "Vie", presentes: 20, ausentes: 10 },
];

const permanenciaEstudiantil = [
    { semestre: "S1", porcentaje: 92 },
    { semestre: "S2", porcentaje: 88 },
    { semestre: "S3", porcentaje: 85 },
    { semestre: "S4", porcentaje: 87 },
    { semestre: "S5", porcentaje: 76 },
    { semestre: "S6", porcentaje: 72 },
    { semestre: "S7", porcentaje: 60 },
];

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

// useSearchParams requiere Suspense en Next.js App Router
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

export default function DashboardPage() {
    const EN_CONSTRUCCION = true; // Activar para ocultar el panel general temporalmente
    const [sesion, setSesion] = useState({ id: "", num_doc: "", rol: "", nombre: "" });
    const [horarios, setHorarios] = useState<Horario[]>([]);

    useEffect(() => {
        const init = async () => {
            const s = getSesion();
            setSesion({ id: s.id || "", num_doc: s.num_doc || "", rol: s.rol || "", nombre: s.nombre || "" });
            if (s.rol === "Docente") {
                try {
                    const hor = await listarHorarios();
                    setHorarios(hor.filter((h: Horario) => h.docente_id === s.id));
                } catch (e) {
                    console.error("Error cargando horarios", e);
                }
            }
        };
        init();
    }, []);

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
        } catch (e: any) { alert("Error: Posiblemente ya registraste esta sesión hoy."); }
    };

    const stats = [
        {
            label: "Estudiantes activos",
            value: "1",
            icon: <Users size={22} />,
            bg: "#3B82F6",
            trend: "↑ Sistema iniciando",
            trendColor: "#22C55E",
        },
        {
            label: "Asistencia promedio",
            value: "—",
            icon: <TrendingUp size={22} />,
            bg: "#10B981",
            trend: "Sin sesiones aún",
            trendColor: "#9CA3AF",
        },
        {
            label: "Contingencias",
            value: "0",
            icon: <AlertTriangle size={22} />,
            bg: "#C9A84C",
            trend: "Pendientes",
            trendColor: "#F59E0B",
        },
        {
            label: "Docentes activos",
            value: "1",
            icon: <UserCheck size={22} />,
            bg: "#8B1A1A",
            trend: "↑ En línea",
            trendColor: "#22C55E",
        },
    ];

    if (EN_CONSTRUCCION) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-6" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
                    <Construction size={40} />
                </div>
                <div className="max-w-md space-y-2">
                    <h2 className="text-2xl font-extrabold text-sidebar-bg" style={{ color: "#1A1A2E" }}>Panel General en Desarrollo</h2>
                    <p className="text-sm text-gray-500">Estamos diseñando un panel interactivo con estadísticas avanzadas y análisis de rendimiento en tiempo real para el SARA.</p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-sara-red/10 text-sara-red rounded-full text-xs font-black uppercase tracking-wider" style={{ background: "rgba(139, 26, 26, 0.08)", color: "#8B1A1A" }}>
                    🚧 Próximamente
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* BANNER ACCESO DENEGADO — envuelto en Suspense */}
            <Suspense fallback={null}>
                <AccesoDenegadoBanner />
            </Suspense>

            {/* GRID DE ESTADÍSTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        className="bg-white p-5 rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-200"
                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div
                                className="p-3 rounded-xl text-white"
                                style={{ background: stat.bg, boxShadow: `0 4px 12px ${stat.bg}40` }}
                            >
                                {stat.icon}
                            </div>
                        </div>
                        <p className="text-gray-400 text-xs font-medium">{stat.label}</p>
                        <p className="text-3xl font-black mt-1" style={{ color: "#1A1A2E" }}>{stat.value}</p>
                        <p className="text-xs font-semibold mt-2" style={{ color: stat.trendColor }}>
                            {stat.trend}
                        </p>
                    </div>
                ))}
            </div>

            {/* ALERTA DE DESERCIÓN */}
            <div
                className="flex items-center gap-5 p-5 rounded-2xl border"
                style={{ background: "#FFF5F5", borderColor: "#8B1A1A30" }}
            >
                <div
                    className="p-3 rounded-xl text-white shrink-0"
                    style={{ background: "#8B1A1A" }}
                >
                    <AlertTriangle size={22} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: "#8B1A1A" }}>
                        Sistema listo para operar
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#A52020" }}>
                        Base de datos configurada · API activa en puerto 8000 · 1 programa académico registrado · Listo para registrar sesiones y asistencia
                    </p>
                </div>
            </div>

            {/* SECCIÓN DOCENTE: REGISTRAR CLASE */}
            {sesion.rol === "Docente" && (
                <div className="space-y-4">
                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={16} /> Tus Clases de Hoy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {horarios.length === 0 ? <p className="text-gray-400 text-sm italic col-span-full">No tienes horarios asignados.</p> : horarios.map(h => (
                            <div key={h.id} className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-sidebar-bg leading-none">{h.asignatura}</p>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-sara-red/10 text-sara-red">
                                            {h.aula}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">{h.dia_semana} | {h.hora_inicio} - {h.hora_fin}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1">GRUPO {h.grupo}</p>
                                </div>
                                <button onClick={() => registrarClase(h)} className="px-4 py-2 bg-sidebar-bg text-white text-xs font-bold rounded-xl hover:bg-black transition-colors shrink-0">
                                    Confirmar
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FILA DE GRÁFICAS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* GRÁFICA DE BARRAS — Asistencia Semanal */}
                <div
                    className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100"
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                >
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-base" style={{ color: "#1A1A2E" }}>
                                Tasa de asistencia semanal
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Ingeniería de Sistemas · Semestre 6
                            </p>
                        </div>
                        <span
                            className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                            style={{ color: "#1A1A2E", borderColor: "#E5E7EB" }}
                        >
                            Esta semana
                        </span>
                    </div>

                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={asistenciaSemanal} barGap={6} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                            <XAxis
                                dataKey="dia"
                                tick={{ fontSize: 12, fill: "#9CA3AF", fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                                axisLine={false}
                                tickLine={false}
                                width={30}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F9FAFB", radius: 8 }} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                            />
                            <Bar dataKey="presentes" name="Presentes" fill="#8B1A1A" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="ausentes" name="Ausentes" fill="#C9A84C" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* PANEL DE ESTUDIANTES — % Asistencia */}
                <div
                    className="bg-white p-6 rounded-2xl border border-gray-100"
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                >
                    <h3 className="font-bold text-base mb-1" style={{ color: "#1A1A2E" }}>
                        Estudiantes
                    </h3>
                    <p className="text-xs text-gray-400 mb-5">% asistencia acumulada</p>

                    {/* Estudiante 1 */}
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: "#8B1A1A" }}
                        >
                            YV
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-none" style={{ color: "#1A1A2E" }}>
                                Yananxua Villamizar
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">1094247377</p>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-100">
                                    <div className="h-1.5 rounded-full" style={{ width: "100%", background: "#22C55E" }} />
                                </div>
                                <span className="text-[10px] font-bold" style={{ color: "#22C55E" }}>100%</span>
                            </div>
                        </div>
                    </div>

                    {/* Slot vacío */}
                    <div className="flex items-center gap-3 opacity-40">
                        <div className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0">
                            <span className="text-gray-300 text-lg leading-none">+</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-400">Pendiente registro</p>
                            <p className="text-[10px] text-gray-300">Agregar más estudiantes</p>
                        </div>
                    </div>

                    {/* Separador */}
                    <div className="my-5 border-t border-gray-50" />

                    {/* Gráfica de permanencia mini */}
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Permanencia por Semestre
                    </h4>
                    <ResponsiveContainer width="100%" height={100}>
                        <AreaChart data={permanenciaEstudiantil} margin={{ left: 5, right: 5 }}>
                            <defs>
                                <linearGradient id="colorPerm" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B1A1A" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#8B1A1A" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="semestre"
                                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                                axisLine={false}
                                tickLine={false}
                                padding={{ left: 15, right: 15 }}
                            />

                            <Tooltip
                                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #F3F4F6" }}
                                formatter={(val) => [`${val}%`, "Permanencia"]}
                            />
                            <Area
                                type="monotone"
                                dataKey="porcentaje"
                                stroke="#8B1A1A"
                                strokeWidth={2}
                                fill="url(#colorPerm)"
                                dot={{ fill: "#8B1A1A", r: 3 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
