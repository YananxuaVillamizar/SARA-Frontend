"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
    ClipboardCheck, AlertCircle, CheckCircle2, XCircle,
    Clock, Calendar, FileText, Send, User, BookOpen, School, GraduationCap, Printer
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
    const [estudianteSearch, setEstudianteSearch] = useState("");
    const [filtAAsignatura, setFiltAAsignatura] = useState("");
    const [filtAMetodo, setFiltAMetodo] = useState("");
    const [filtAEstado, setFiltAEstado] = useState("");
    const [showAMetodoSugg, setShowAMetodoSugg] = useState(false);
    const [showAEstadoSugg, setShowAEstadoSugg] = useState(false);
    // Edición de estado
    const [editingEstadoId, setEditingEstadoId] = useState<string | null>(null);

    const normalizarEstados = (lista: any[]) => {
        return (lista || []).map((a: any) => {
            let estadoNormalizado = a.estado;
            if (a.estado === "presente") estadoNormalizado = "asistencia";
            if (a.estado === "tarde") estadoNormalizado = "asistencia con retraso";
            return { ...a, estado: estadoNormalizado };
        });
    };

    const handleCambiarEstado = async (asistenciaId: string, nuevoEstado: string) => {
        try {
            let dbEstado = nuevoEstado;
            if (nuevoEstado === "asistencia") dbEstado = "presente";
            if (nuevoEstado === "asistencia con retraso") dbEstado = "tarde";
            
            await actualizarAsistencia(asistenciaId, { estado: dbEstado });
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
                    setAsistenciasRaw(normalizarEstados(asis));
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
                    setAsistenciasRaw(normalizarEstados(asis));
                } else {
                    // Admin
                    const [cont, ses, asis] = await Promise.all([
                        listarTodasContingencias(),
                        listarSesiones(),
                        listarAsistencias()
                    ]);
                    setContingencias(cont);
                    setReporte(ses); // Reutilizamos el estado reporte para sesiones en Admin
                    setAsistenciasRaw(normalizarEstados(asis));
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        init();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setFiltAEstudiante(estudianteSearch);
        }, 400);
        return () => clearTimeout(handler);
    }, [estudianteSearch]);

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
    // --- OPTIMIZACIONES DE RENDIMIENTO (useMemo) PARA PREVENIR CRASHES Y EXCESO DE MEMORIA ---
    const normalizar = (s: string) => s ? s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : "";

    const currentWeek = useMemo(() => {
        if (fechaInicioSemestre) {
            try {
                const today = new Date();
                const [sy, sm, sd] = fechaInicioSemestre.split('-').map(Number);
                const startObj = new Date(sy, sm - 1, sd);
                
                const diff = today.getTime() - startObj.getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                if (days >= 0) {
                    const week = Math.floor(days / 7) + 1;
                    return Math.min(Math.max(week, 1), semanasSemestre);
                }
            } catch (e) {
                console.error("Error calculating current week:", e);
            }
        }
        return asistenciasRaw.reduce((max, a) => {
            const sem = typeof a.semana === 'string' ? parseInt(a.semana) : a.semana;
            return sem > max ? sem : max;
        }, 0) || 1;
    }, [asistenciasRaw, fechaInicioSemestre, semanasSemestre]);

    const allGroups = useMemo(() => {
        const groups: any = {};
        asistenciasRaw.forEach(a => {
            const fac = a.facultad || "Sin Facultad";
            const prog = a.programa || "Sin Programa";
            const asig = a.asignatura || "Sin Asignatura";
            const grup = a.grupo || "Sin Grupo";
            const sesionKey = a.sesion_id || a.fecha || "sin-sesion";

            if (!groups[fac]) groups[fac] = {};
            if (!groups[fac][prog]) groups[fac][prog] = {};
            if (!groups[fac][prog][asig]) groups[fac][prog][asig] = {};
            if (!groups[fac][prog][asig][grup]) {
                groups[fac][prog][asig][grup] = {
                    aula: a.aula,
                    docente: `${a.nombre_docente} ${a.apellido_docente}`,
                    horarios: [],
                    sesiones: {},
                    codAsig: a.cod_asignatura,
                    asignatura: asig,
                    grupo: grup
                };
            }

            const horObj = { id: a.horario_id, dia: a.dia_semana, horas: `${a.hora_inicio}–${a.hora_fin}`, aula: a.aula };
            const exists = groups[fac][prog][asig][grup].horarios.some((h: any) => h.dia === a.dia_semana && h.horas === horObj.horas && h.aula === a.aula);
            if (a.dia_semana && !exists) {
                groups[fac][prog][asig][grup].horarios.push(horObj);
            }

            if (!groups[fac][prog][asig][grup].sesiones[sesionKey]) {
                const docEstado = a.docente_estado_asistencia === 'presente' ? 'asistencia' :
                                  a.docente_estado_asistencia === 'tarde' ? 'asistencia con retraso' :
                                  a.docente_estado_asistencia === 'inasistencia' ? 'inasistencia' :
                                  (a.docente_asistio ? 'asistencia' : 'inasistencia');
                
                groups[fac][prog][asig][grup].sesiones[sesionKey] = {
                    sesion_id: a.sesion_id,
                    horario_id: a.horario_id,
                    fecha: a.fecha,
                    aula_sesion: a.aula_sesion || a.aula,
                    docente_asistio: a.docente_asistio,
                    semana: a.semana,
                    docente_num_doc: a.docente_num_doc,
                    docente_tipo_doc: a.docente_tipo_doc,
                    docente_hora_entrada: a.docente_hora_entrada,
                    docente_hora_salida: a.docente_hora_salida,
                    docente_metodo_verificacion: a.docente_metodo_verificacion,
                    docente_estado_asistencia: docEstado,
                    estado_sesion: a.estado_sesion,
                    tipo_sesion: a.tipo_sesion,
                    records: []
                };
            }

            if (a.num_doc) {
                groups[fac][prog][asig][grup].sesiones[sesionKey].records.push({
                    id: a.id,
                    num_doc: a.num_doc,
                    tipo_doc: a.tipo_doc,
                    nombre: a.nombre_estudiante,
                    apellido: a.apellido_estudiante,
                    nombre_estudiante: a.nombre_estudiante,
                    apellido_estudiante: a.apellido_estudiante,
                    estado: a.estado,
                    metodo_verificacion: a.metodo_verificacion,
                    programa: a.programa || prog,
                    hora_entrada: a.hora_entrada,
                    hora_salida: a.hora_salida,
                    cod_asignatura: a.cod_asignatura
                });
            }
        });

        // Precalcular estadísticas y ordenar colecciones para evitar recalculaciones en el render path
        const daysOrder = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
        
        for (const fac in groups) {
            for (const prog in groups[fac]) {
                for (const asig in groups[fac][prog]) {
                    const asigGrupos = groups[fac][prog][asig];
                    const asigRecords: any[] = [];
                    
                    for (const grup in asigGrupos) {
                        const grupoData = asigGrupos[grup];
                        
                        // 1. Ordenar horarios
                        grupoData.horariosSorted = [...grupoData.horarios].sort((a: any, b: any) => {
                            return daysOrder.indexOf(a.dia.toLowerCase()) - daysOrder.indexOf(b.dia.toLowerCase());
                        });
                        
                        // 2. Extraer todos los records del grupo
                        const grupoRecords = Object.values(grupoData.sesiones).flatMap((s: any) => 
                            s.docente_asistio ? s.records : []
                        );
                        
                        asigRecords.push(...grupoRecords);
                        
                        // 3. Estadísticas del grupo
                        const totalRecords = grupoRecords.length;
                        const presentesRecords = grupoRecords.filter((r: any) => 
                            r.estado === "asistencia" || r.estado === "asistencia con retraso"
                        ).length;
                        grupoData.stats = {
                            totalRecords,
                            presentesRecords,
                            attendancePercentage: totalRecords > 0 ? Math.round((presentesRecords / totalRecords) * 100) : 0
                        };
                        
                        // 4. Progreso de sesiones
                        const totalSemana = semanasSemestre || 16;
                        const totalProgramadas = grupoData.horarios.length * totalSemana;
                        const sesionesDictadas = Object.values(grupoData.sesiones).filter((s: any) => 
                            s.docente_asistio && !s.isVirtual
                        ).length;
                        grupoData.sessionProgress = {
                            totalProgramadas,
                            sesionesDictadas,
                            percentage: totalProgramadas > 0 ? Math.round((sesionesDictadas / totalProgramadas) * 100) : 0
                        };
                        
                        // 5. Sesiones ordenadas por fecha con sus propias estadísticas precalculadas
                        const sessionsEntries = Object.entries(grupoData.sesiones).filter(([key]) => key !== 'sin-sesion');
                        sessionsEntries.forEach(([, sData]: [string, any]) => {
                            const sTotal = sData.records.length;
                            const sPresentes = sData.records.filter((r: any) => 
                                r.estado === "asistencia" || r.estado === "asistencia con retraso"
                            ).length;
                            sData.stats = {
                                total: sTotal,
                                presentes: sPresentes,
                                percentage: sTotal > 0 ? Math.round((sPresentes / sTotal) * 100) : 0
                            };
                        });
                        
                        grupoData.sesionesSorted = sessionsEntries.sort(([, valA]: [string, any], [, valB]: [string, any]) => 
                            (valA.fecha || "").localeCompare(valB.fecha || "")
                        );
                    }
                    
                    // Estadísticas de la asignatura
                    const totalAsig = asigRecords.length;
                    const presAsig = asigRecords.filter((r: any) => 
                        r.estado === "asistencia" || r.estado === "asistencia con retraso"
                    ).length;
                    const pctAsig = totalAsig > 0 ? Math.round((presAsig / totalAsig) * 100) : 0;
                    
                    for (const grup in asigGrupos) {
                        asigGrupos[grup].asigPercentage = pctAsig;
                    }
                }
            }
        }

        return groups;
    }, [asistenciasRaw, semanasSemestre]);

    const facultades = useMemo(() => {
        return Array.from(new Set(asistenciasRaw.map(a => a.facultad).filter(Boolean)));
    }, [asistenciasRaw]);

    const programas = useMemo(() => {
        return Array.from(new Set(
            asistenciasRaw
                .filter(a => !filtAFacultad || a.facultad === filtAFacultad)
                .map(a => a.programa)
                .filter(Boolean)
        ));
    }, [asistenciasRaw, filtAFacultad]);

    const asignaturas = useMemo(() => {
        return Array.from(new Set(
            asistenciasRaw
                .filter(a => (!filtAFacultad || a.facultad === filtAFacultad) && (!filtAPrograma || a.programa === filtAPrograma))
                .map(a => a.asignatura)
                .filter(Boolean)
        ));
    }, [asistenciasRaw, filtAFacultad, filtAPrograma]);

    const aulas = useMemo(() => {
        return Array.from(new Set(
            asistenciasRaw
                .filter(a => (!filtAFacultad || a.facultad === filtAFacultad) && (!filtAPrograma || a.programa === filtAPrograma) && (!filtAAsignatura || a.asignatura === filtAAsignatura))
                .map(a => a.aula_sesion || a.aula)
                .filter(Boolean)
        ));
    }, [asistenciasRaw, filtAFacultad, filtAPrograma, filtAAsignatura]);

    const getDiaDeLaSemana = (fechaStr: string) => {
        if (!fechaStr) return "";
        const [y, m, d] = fechaStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
        return dias[date.getDay()];
    };

    const getWeekFromFecha = (fechaStr: string) => {
        if (!fechaStr || !fechaInicioSemestre) return null;
        try {
            const [sy, sm, sd] = fechaInicioSemestre.split('-').map(Number);
            const startObj = new Date(sy, sm - 1, sd);
            
            const [fy, fm, fd] = fechaStr.split('-').map(Number);
            const targetObj = new Date(fy, fm - 1, fd);
            
            const diff = targetObj.getTime() - startObj.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            if (days < 0) return 1;
            const week = Math.floor(days / 7) + 1;
            return Math.min(Math.max(week, 1), semanasSemestre);
        } catch (e) {
            return null;
        }
    };

    const normalizeDia = (dia: string) => {
        return dia ? dia.toLowerCase()
                        .normalize("NFD")
                        .replace(/[̀-ͯ]/g, "")
                        .replace("miercoles", "miercoles")
                        .replace("sabado", "sabado") : "";
    };

    const { filteredFaculties, filteredCount } = useMemo(() => {
        const filteredFacs: any = {};
        let count = 0;

        for (const fac in allGroups) {
            for (const prog in allGroups[fac]) {
                for (const asig in allGroups[fac][prog]) {
                    for (const grup in allGroups[fac][prog][asig]) {
                        const grupoData = allGroups[fac][prog][asig][grup];

                        const fechaDiaName = filtAFecha ? getDiaDeLaSemana(filtAFecha) : "";
                        const normalizedFechaDia = normalizeDia(fechaDiaName);

                        const matchDia = !filtADia || 
                            grupoData.horarios.some((h: any) => normalizeDia(h.dia) === normalizeDia(filtADia)) ||
                            Object.values(grupoData.sesiones).some((sData: any) => {
                                return sData.fecha && normalizeDia(getDiaDeLaSemana(sData.fecha)) === normalizeDia(filtADia);
                            });
                        const matchFac = !filtAFacultad || fac === filtAFacultad;
                        const matchProg = !filtAPrograma || prog === filtAPrograma;
                        const matchAsig = !filtAAsignatura || asig === filtAAsignatura;
                        const matchAula = !filtAAula || grupoData.aula === filtAAula || Object.values(grupoData.sesiones).some((s: any) => s.aula_sesion === filtAAula);
                        
                        const matchFechaGroup = !filtAFecha || 
                            Object.values(grupoData.sesiones).some((sData: any) => sData.fecha && sData.fecha === filtAFecha) ||
                            grupoData.horarios.some((h: any) => normalizeDia(h.dia) === normalizedFechaDia);

                        if (matchDia && matchFac && matchProg && matchAsig && matchAula && matchFechaGroup) {
                            const filteredSessions: any = {};
                            const weekFromFecha = filtAFecha ? getWeekFromFecha(filtAFecha) : null;
                            const hasWeekOrDateFilter = !!(filtASemana || filtAFecha);
                            const hasCrossWeekFilter = !!(filtAMetodo || filtAEstado || filtAEstudiante);
                            const targetWeekStr = filtASemana || weekFromFecha?.toString() || ((hasWeekOrDateFilter || !hasCrossWeekFilter) ? currentWeek.toString() : "");

                            for (const sKey in grupoData.sesiones) {
                                const sData = grupoData.sesiones[sKey];

                                // Skip uncompleted sessions whose day of week doesn't match the current schedule days
                                const isUncompleted = sData.estado_sesion === 'no_completada';
                                const sessionDia = sData.fecha ? normalizeDia(getDiaDeLaSemana(sData.fecha)) : "";
                                const dayMatchesSchedule = grupoData.horarios.some((h: any) => normalizeDia(h.dia) === sessionDia);
                                if (isUncompleted && !dayMatchesSchedule) {
                                    continue;
                                }

                                const isEstudiante = sesion.rol === "Estudiante";
                                if (isEstudiante && filtAEstado === "inasistencia" && !sData.docente_asistio) {
                                    continue;
                                }

                                const matchSemana = !targetWeekStr || sData.semana?.toString() === targetWeekStr;
                                const matchFecha = !filtAFecha || (sData.fecha && sData.fecha === filtAFecha);
                                const actualSessionDia = sData.fecha ? getDiaDeLaSemana(sData.fecha) : (sData.dia_virtual || "");
                                const matchDiaSesion = !filtADia || normalizeDia(actualSessionDia) === normalizeDia(filtADia);

                                const filteredRecords = sData.records.filter((r: any) => {
                                    const matchEst = !filtAEstudiante || normalizar(`${r.nombre} ${r.apellido} ${r.num_doc}`).includes(normalizar(filtAEstudiante));
                                    const matchMetodo = !filtAMetodo || (r.metodo_verificacion && r.metodo_verificacion.toLowerCase() === filtAMetodo.toLowerCase());
                                    const matchEstado = !filtAEstado || (r.estado && r.estado.toLowerCase() === filtAEstado.toLowerCase());
                                    return matchEst && matchMetodo && matchEstado;
                                });

                                const hasStudentFilters = filtAEstudiante || filtAMetodo || filtAEstado;
                                if (matchSemana && matchFecha && matchDiaSesion && (filteredRecords.length > 0 || !hasStudentFilters)) {
                                    const sTotal = filteredRecords.length;
                                    const sPresentes = filteredRecords.filter((r: any) => r.estado === "asistencia" || r.estado === "asistencia con retraso").length;
                                    const sPct = sTotal > 0 ? Math.round((sPresentes / sTotal) * 100) : 0;

                                    filteredSessions[sKey] = { 
                                        ...sData, 
                                        records: filteredRecords,
                                        filteredStats: { total: sTotal, presentes: sPresentes, percentage: sPct }
                                    };
                                    count += filteredRecords.length;
                                }
                            }

                            if (!filtAEstudiante && !filtAMetodo && !filtAEstado) {
                                const weekNum = parseInt(targetWeekStr);

                                grupoData.horarios.forEach((h: any) => {
                                    if (filtADia && normalizeDia(h.dia) !== normalizeDia(filtADia)) return;
                                    if (filtAFecha && normalizeDia(h.dia) !== normalizedFechaDia) return;

                                    // Check if there is already a completed/opened session for this specific day of the week
                                    const alreadyCompleted = Object.values(filteredSessions).some((sData: any) => {
                                        return !sData.isVirtual && sData.fecha && normalizeDia(getDiaDeLaSemana(sData.fecha)) === normalizeDia(h.dia);
                                    });
                                    if (alreadyCompleted) return;

                                    const sKey = `virtual-${targetWeekStr}-${h.dia}`;
                                    let reason = "";

                                    let calculatedFecha = filtAFecha || `2026-01-01`;
                                    if (!filtAFecha && fechaInicioSemestre) {
                                        const [sy, sm, sd] = fechaInicioSemestre.split('-').map(Number);
                                        const startObj = new Date(sy, sm - 1, sd);
                                        const getJSMap = (day: number) => (day === 0 ? 6 : day - 1);
                                        const dStart = getJSMap(startObj.getDay());

                                        const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
                                        const dTarget = days.indexOf(normalizeDia(h.dia));
                                        const offset = (dTarget - dStart + 7) % 7;
                                        const diasToAdd = (weekNum - 1) * 7 + offset;

                                        const targetDate = new Date(startObj);
                                        targetDate.setDate(startObj.getDate() + diasToAdd);

                                        const yyyy = targetDate.getFullYear();
                                        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
                                        const dd = String(targetDate.getDate()).padStart(2, '0');
                                        calculatedFecha = `${yyyy}-${mm}-${dd}`;
                                    }

                                    // Get today's day index (Monday = 0, Sunday = 6) and compare using academic week and day index to be 100% hydration & timezone proof
                                    const days = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
                                    const dTarget = days.indexOf(normalizeDia(h.dia));
                                    const dToday = new Date();
                                    const getJSMap = (day: number) => (day === 0 ? 6 : day - 1);
                                    const dTodayIndex = getJSMap(dToday.getDay());

                                    if (weekNum < currentWeek) {
                                        reason = "Docente no asistió";
                                    } else if (weekNum > currentWeek) {
                                        reason = "No completada por fecha";
                                    } else {
                                        // Same week: compare day index
                                        if (dTarget > dTodayIndex) {
                                            reason = "No completada por fecha";
                                        } else {
                                            reason = "Docente no asistió";
                                        }
                                    }

                                    filteredSessions[sKey] = {
                                        fecha: calculatedFecha,
                                        dia_virtual: h.dia,
                                        semana: weekNum,
                                        docente_asistio: false,
                                        isVirtual: true,
                                        reason: reason,
                                        records: [],
                                        filteredStats: { total: 0, presentes: 0, percentage: 0 }
                                    };
                                });
                            }

                            if (Object.keys(filteredSessions).length > 0) {
                                if (!filteredFacs[fac]) filteredFacs[fac] = {};
                                if (!filteredFacs[fac][prog]) filteredFacs[fac][prog] = {};
                                if (!filteredFacs[fac][prog][asig]) filteredFacs[fac][prog][asig] = {};
                                filteredFacs[fac][prog][asig][grup] = { 
                                    ...grupoData, 
                                    sesiones: filteredSessions,
                                    sesionesSorted: Object.entries(filteredSessions)
                                        .filter(([key]) => key !== 'sin-sesion')
                                        .sort(([, valA]: [string, any], [, valB]: [string, any]) => 
                                            (valA.fecha || "").localeCompare(valB.fecha || "")
                                        )
                                };
                            }
                        }
                    }
                }
            }
        }

        return { filteredFaculties: filteredFacs, filteredCount: count };
    }, [allGroups, filtADia, filtAFacultad, filtAPrograma, filtAAsignatura, filtAAula, filtAFecha, filtASemana, filtAEstudiante, filtAMetodo, filtAEstado, currentWeek, fechaInicioSemestre, semanasSemestre, sesion]);

    const handleExportarPDF = (grupoData: any, sesionData: any, progName?: string, facName?: string) => {
        // Dynamic academic filename
        const cleanAsig = (grupoData.asignatura || 'Curso').replace(/[^a-zA-Z0-9]/g, '_');
        const cleanGrupo = (grupoData.grupo || 'SinGrupo').replace(/[^a-zA-Z0-9]/g, '_');
        const cleanFecha = (sesionData.fecha || 'SinFecha');
        const filename = `Asistencia_${cleanAsig}_Grupo_${cleanGrupo}_${cleanFecha}`;

        const calculateStudentPermanence = (rec: any) => {
            if (rec.estado !== "asistencia" && rec.estado !== "asistencia con retraso") {
                return 0;
            }
            if (!rec.hora_entrada || !rec.hora_salida || !sesionData.fecha || !grupoData.horarios || grupoData.horarios.length === 0) {
                return 0;
            }
            
            const getDiaDeLaSemana = (fechaStr: string) => {
                if (!fechaStr) return "";
                const [y, m, d] = fechaStr.split('-').map(Number);
                const date = new Date(y, m - 1, d);
                const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
                return dias[date.getDay()];
            };
            
            const normalizeDia = (dia: string) => {
                return dia ? dia.toLowerCase()
                                .normalize("NFD")
                                .replace(/[̀-ͯ]/g, "")
                                .replace("miercoles", "miercoles")
                                .replace("sabado", "sabado") : "";
            };

            const sessionDia = getDiaDeLaSemana(sesionData.fecha);
            const schedule = grupoData.horarios.find((h: any) => normalizeDia(h.dia) === normalizeDia(sessionDia)) || grupoData.horarios[0];

            if (!schedule || !schedule.horas) return 0;
            const [horaInicioRaw, horaFinRaw] = schedule.horas.split(/[–-]/);
            
            const toDatetime = (val: any) => {
                if (!val) return null;
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            };

            const combineDateTime = (fechaStr: string, timeStr: string) => {
                if (!fechaStr || !timeStr) return null;
                const [y, m, d] = fechaStr.split('-').map(Number);
                const parts = timeStr.trim().split(':');
                const h = parseInt(parts[0] || '0') % 24;
                const min = parts.length > 1 ? parseInt(parts[1] || '0') : 0;
                const sec = parts.length > 2 ? parseInt(parts[2] || '0') : 0;
                return new Date(y, m - 1, d, h, min, sec);
            };

            const horaEntrada = toDatetime(rec.hora_entrada);
            const horaSalida = toDatetime(rec.hora_salida);
            const horaInicioDt = combineDateTime(sesionData.fecha, horaInicioRaw);
            const horaFinDt = combineDateTime(sesionData.fecha, horaFinRaw);
            const docIn = toDatetime(sesionData.docente_hora_entrada);
            const docOut = toDatetime(sesionData.docente_hora_salida);

            if (!horaEntrada || !horaSalida || !horaInicioDt || !horaFinDt || !docIn) {
                return 0;
            }

            const docOutEffective = docOut || horaFinDt;
            const duracionProgramadaSec = (horaFinDt.getTime() - horaInicioDt.getTime()) / 1000;
            if (duracionProgramadaSec <= 0) return 0;

            const actStart = docIn;
            const actEnd = docOutEffective;

            const overlapStart = new Date(Math.max(actStart.getTime(), horaInicioDt.getTime()));
            const overlapEnd = new Date(Math.min(actEnd.getTime(), horaFinDt.getTime()));
            const hasOverlap = overlapStart.getTime() < overlapEnd.getTime();

            let pct = 0;
            if (hasOverlap) {
                const clampedDocIn = new Date(Math.max(docIn.getTime(), horaInicioDt.getTime()));
                const clampedDocOut = new Date(Math.min(docOutEffective.getTime(), horaFinDt.getTime()));
                const dSesionSec = Math.max(0, (clampedDocOut.getTime() - clampedDocIn.getTime()) / 1000);

                const clampedEstIn = new Date(Math.max(horaEntrada.getTime(), clampedDocIn.getTime()));
                const clampedEstOut = new Date(Math.min(horaSalida.getTime(), clampedDocOut.getTime()));
                const dEstSec = Math.max(0, (clampedEstOut.getTime() - clampedEstIn.getTime()) / 1000);

                if (dSesionSec > 0) {
                    pct = (dEstSec / dSesionSec) * 100;
                }
            } else {
                const dSesionSec = (docOutEffective.getTime() - docIn.getTime()) / 1000;
                if (dSesionSec > 0) {
                    const estStart = new Date(Math.max(horaEntrada.getTime(), docIn.getTime()));
                    const estEnd = new Date(Math.min(horaSalida.getTime(), docOutEffective.getTime()));
                    const dEstSec = Math.max(0, (estEnd.getTime() - estStart.getTime()) / 1000);
                    pct = (dEstSec / dSesionSec) * 100;
                }
            }

            return Math.min(100, Math.max(0, Math.round(pct)));
        };

        const fechaFormateadaLarga = (() => {
            if (!sesionData.fecha) return '—';
            const [y, m, d] = sesionData.fecha.split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
            const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            
            const dayNum = String(d).padStart(2, '0');
            
            const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            
            return `${capitalizedDay} ${dayNum} de ${capitalizedMonth} de ${y}`;
        })();

        const generationDateStrFormatted = (() => {
            const date = new Date();
            const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
            const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            
            const dayNum = String(date.getDate()).padStart(2, '0');
            
            const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            
            const year = date.getFullYear();
            
            const hours = date.getHours();
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            
            const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
            const displayHours = String(hours % 12 || 12).padStart(2, '0');
            
            return `${capitalizedDay} ${dayNum} de ${capitalizedMonth} de ${year}, ${displayHours}:${minutes}:${seconds} ${ampm}`;
        })();

        const formatMetodoVerificacion = (metodo: string) => {
            if (!metodo || metodo === 'N/A') return '—';
            if (metodo.toLowerCase().includes('biometr')) return 'Biométrico';
            if (metodo.toLowerCase().includes('supervis')) return 'Supervisado';
            return metodo;
        };

        const getEstadoText = (rec: any) => {
            const perm = calculateStudentPermanence(rec);
            if (rec.estado === 'asistencia con retraso') {
                return `Tarde.<br/>${perm}% de permanencia`;
            }
            return `A tiempo.<br/>${perm}% de permanencia`;
        };

        const attendedRecords = sesionData.records.filter((r: any) => 
            r.estado === 'asistencia' || r.estado === 'asistencia con retraso'
        );

        const tipoSesionFormatted = (sesionData.tipo_sesion || '').toLowerCase() === 'extraordinaria' ? 'Extraordinaria' : 'Ordinaria';

        const logoUrl = window.location.origin + '/logo_unipamplona.png';

        const htmlContent = `
            <html>
                <head>
                    <title>${filename}</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                        
                        @page {
                            size: letter;
                            margin: 0mm;
                        }
                        
                        body {
                            font-family: 'Inter', sans-serif;
                            color: #000000;
                            margin: 0;
                            padding: 1.5cm;
                            background: #ffffff;
                            font-size: 11px;
                            line-height: 1.4;
                        }
                        
                        .header {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding-bottom: 12px;
                            margin-bottom: 25px;
                            border-bottom: 2.5px solid #ad3333;
                        }
                        
                        .header-logo {
                            display: flex;
                            align-items: center;
                            gap: 15px;
                        }
                        
                        .header-logo img {
                            height: 75px;
                            width: auto;
                        }
                        
                        .header-title-container {
                            display: flex;
                            flex-direction: column;
                        }
                        
                        .header-title-main {
                            font-size: 18px;
                            font-weight: 800;
                            color: #ad3333;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin: 0;
                        }
                        
                        .header-title-sub {
                            font-size: 10.5px;
                            font-weight: 600;
                            color: #eab308;
                            text-transform: uppercase;
                            margin: 2px 0 0 0;
                            letter-spacing: 0.5px;
                        }
                        
                        .header-meta {
                            text-align: right;
                        }
                        
                        .header-meta-doc {
                            font-size: 13px;
                            font-weight: 800;
                            color: #ad3333;
                            text-transform: uppercase;
                            margin: 0 0 4px 0;
                        }
                        
                        .header-meta-date {
                            font-size: 10px;
                            color: #000000;
                            font-weight: 500;
                            margin: 0 0 8px 0;
                        }
                        
                        .header-meta-by {
                            font-size: 10px;
                            color: #000000;
                            font-weight: 500;
                            margin: 0;
                            line-height: 1.3;
                        }
                        
                        .meta-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 25px;
                        }
                        
                        .meta-table td {
                            border: none !important;
                            padding: 10px 0 !important;
                            vertical-align: middle !important;
                        }
                        
                        .underline-text {
                            border-bottom: 0.75px solid #000000;
                            padding-bottom: 3px;
                            display: inline-block;
                            width: 95%;
                            font-size: 13px;
                            color: #000000;
                            line-height: 1.2;
                        }
                        
                        .horizontal-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 25px;
                            background: #ffffff;
                        }
                        
                        .horizontal-table th {
                            background: #CCCCCC;
                            color: #000000;
                            font-size: 10.5px;
                            font-weight: 800;
                            text-transform: uppercase;
                            padding: 8px 6px;
                            border: 0.5px solid #333333;
                            text-align: center;
                        }
                        
                        .horizontal-table td {
                            padding: 8px 6px;
                            font-size: 10px;
                            color: #000000;
                            border: 0.5px solid #333333;
                            font-weight: 500;
                            text-align: center;
                            vertical-align: middle;
                        }
                    </style>
                </head>
                <body>
                    <div class='header'>
                        <div class='header-logo'>
                            <img src='${logoUrl}' alt='Universidad de Pamplona' />
                            <div class='header-title-container'>
                                <h1 class='header-title-main'>Universidad de Pamplona</h1>
                                <p class='header-title-sub'>Sistema Automatizado de Registro de Asistencia (SARA)</p>
                            </div>
                        </div>
                        <div class='header-meta'>
                            <h2 class='header-meta-doc'>Reporte Oficial de Asistencia</h2>
                            <p class='header-meta-date'>${generationDateStrFormatted}</p>
                            <p class='header-meta-by'>Generado por:<br/>${sesion.nombre} (${sesion.rol})</p>
                        </div>
                    </div>
                    
                    <table class='meta-table'>
                        <tr>
                            <td style="width: 48%; padding-right: 2%;">
                                <span class="underline-text"><strong>DOCENTE:</strong> ${grupoData.docente || ''}</span>
                            </td>
                            <td style="width: 50%;">
                                <span class="underline-text"><strong>ASIGNATURA:</strong> ${grupoData.asignatura || 'Sin Asignatura'} ${grupoData.codAsig ? `(${grupoData.codAsig})` : ''}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-right: 2%;">
                                <span class="underline-text"><strong>FECHA:</strong> ${fechaFormateadaLarga}</span>
                            </td>
                            <td>
                                <span class="underline-text"><strong>GRUPO:</strong> ${grupoData.grupo || ''}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-right: 2%;">
                                <span class="underline-text"><strong>TIPO DE SESIÓN:</strong> ${tipoSesionFormatted}</span>
                            </td>
                            <td>
                                <span class="underline-text"><strong>AULA:</strong> ${sesionData.aula_sesion || 'Sin Aula'}</span>
                            </td>
                        </tr>
                    </table>
                    
                    <table class='horizontal-table'>
                        <thead>
                            <tr>
                                <th style='width: 5%;'>No</th>
                                <th style='width: 30%;'>Nombre</th>
                                <th style='width: 12%;'>Documento</th>
                                <th style='width: 18%;'>Programa</th>
                                <th style='width: 17%;'>Método Verificación</th>
                                <th style='width: 18%;'>Estado Asistencia</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${attendedRecords.map((a: any, idx: number) => `
                                <tr>
                                    <td>${idx + 1}</td>
                                    <td>${a.nombre_estudiante || ''} ${a.apellido_estudiante || ''}</td>
                                    <td>${a.num_doc || '—'}</td>
                                    <td>${a.programa || progName || ''}</td>
                                    <td>${formatMetodoVerificacion(a.metodo_verificacion)}</td>
                                    <td style='line-height: 1.3;'>${getEstadoText(a)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
            </html>
        `;

        // Print using a hidden iframe to prevent about:blank from appearing as the URL footer
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
            
            // Ask user for confirmation to solve the native browser print/cancel detection limitation
            const guardado = confirm("¿Confirmar que el archivo fue guardado?");
            if (guardado) {
                alert("Registro guardado");
            }
        }, 300);
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
                {/* Ocultado temporalmente */ false && sesion.rol === "Estudiante" && (
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
                {/* Ocultado temporalmente */ false && (
                <button onClick={() => setActiveTab("contingencias")} className={`pb-4 text-sm font-black uppercase tracking-wider transition-colors ${activeTab === "contingencias" ? "text-sara-red border-b-2 border-sara-red" : "text-gray-400 hover:text-gray-600"}`}>
                    Contingencias {contingencias.length > 0 && <span className="ml-1 bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full text-[10px]">{contingencias.length}</span>}
                </button>
                )}
            </div>

            {activeTab === "asistencias" && (
                <div className="space-y-6">
                    {/* SECCIÓN REGISTROS DE ASISTENCIA */}
                    {(sesion.rol === "Administrativo" || sesion.rol === "Docente" || sesion.rol === "Estudiante") && (() => {
                        const isEstudiante = sesion.rol === "Estudiante";
                        return (
                            <div className="space-y-4">
                                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <ClipboardCheck size={16} /> {isEstudiante ? "Mis Asignaturas y Asistencia" : "Registros de Asistencia"}
                                    {!isEstudiante && (
                                        <span className="ml-auto text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{filteredCount} registros</span>
                                    )}
                                </h2>

                                {/* FILTROS */}
                                {/* FILTROS */}
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {!isEstudiante && (
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
                                        )}
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
                                        {!isEstudiante && (
                                            <div className="relative">
                                                <input type="text" placeholder="Estudiante..." value={estudianteSearch} onChange={e => setEstudianteSearch(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all" />
                                                {estudianteSearch && <button type="button" onClick={() => { setEstudianteSearch(""); setFiltAEstudiante(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <input type="text" placeholder="Método..." readOnly value={filtAMetodo} onFocus={() => setShowAMetodoSugg(true)} onBlur={() => setTimeout(() => setShowAMetodoSugg(false), 200)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all cursor-pointer" />
                                            {filtAMetodo && <button type="button" onClick={() => setFiltAMetodo("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><XCircle size={13} /></button>}
                                            {showAMetodoSugg && (
                                                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1">
                                                    {["Biometría", "Firma Electrónica", "Supervisado"].map(m => (
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
                                            setEstudianteSearch("");
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
                                                    <School size={20} className="text-sara-gold" /> {facultad}
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
                                                                                const firstGrupo = Object.values(grupos)[0] as any;
                                                                                const pctAsig = firstGrupo?.asigPercentage || 0;
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
                                                                                    const originalGrupoData = allGroups[facultad]?.[programa]?.[asignatura]?.[grupoName] || grupoData;
                                                                                    const total = originalGrupoData.stats?.totalRecords || 0;
                                                                                    const presentes = originalGrupoData.stats?.presentesRecords || 0;
                                                                                    const pct = originalGrupoData.stats?.attendancePercentage || 0;
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
                                                                                                            {(grupoData.horariosSorted || []).map((h: any, idx: number) => (
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
                                                                                                                const totalProgramadas = originalGrupoData.sessionProgress?.totalProgramadas || 0;
                                                                                                                const sesionesDictadas = originalGrupoData.sessionProgress?.sesionesDictadas || 0;
                                                                                                                const progresoSesiones = originalGrupoData.sessionProgress?.percentage || 0;

                                                                                                                return (
                                                                                                                    <div className="flex flex-col items-center justify-center bg-gray-50/80 px-2 py-1.5 rounded-xl border border-gray-100 min-w-[85px] shadow-sm text-center">
                                                                                                                        <p className="text-[8px] font-black text-black uppercase tracking-wider mb-1">Sesiones</p>
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
                                                                                                                <p className="text-[8px] font-black text-black uppercase tracking-wider mb-1">Asistencia</p>
                                                                                                                <div className="relative w-9 h-9 shrink-0">
                                                                                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                                                                                                                        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" fill="transparent" className="text-gray-100" />
                                                                                                                        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" fill="transparent" strokeDasharray={81.68} strokeDashoffset={81.68 - (81.68 * pct) / 100} className="text-emerald-500 transition-all duration-500" />
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
                                                                                                    {(grupoData.sesionesSorted || []).map(([sesionKey, sesionData]: [string, any]) => {
                                                                                                        if (sesionKey === 'sin-sesion') return null;
                                                                                                        const isSessionOpen = expandedSessions.has(sesionKey);
                                                                                                        const isSessionCompleta = sesionData.docente_asistio && sesionData.estado_sesion !== "abierta";
                                                                                                        const isSessionAbierta = sesionData.estado_sesion === "abierta";
                                                                                                        return (
                                                                                                             <div key={sesionKey} className="space-y-2">
                                                                                                                 {(() => {
                                                                                                                     const sTotal = sesionData.filteredStats?.total || 0;
                                                                                                                     const sPresentes = sesionData.filteredStats?.presentes || 0;
                                                                                                                     const sPct = sesionData.filteredStats?.percentage || 0;
                                                                                                                     
                                                                                                                     return (
                                                                                                                         <div 
                                                                                                                            onClick={() => !isEstudiante && (isSessionCompleta || isSessionAbierta) && toggleSession(sesionKey)} 
                                                                                                                            className={`flex flex-col md:flex-row justify-between items-start md:items-center p-3 rounded-xl gap-3 transition-all border-l-4 ${
                                                                                                                                isSessionAbierta 
                                                                                                                                    ? "bg-blue-50/50 border-blue-500 hover:bg-blue-100/60" 
                                                                                                                                    : isSessionCompleta 
                                                                                                                                        ? "bg-emerald-50/40 border-emerald-500 hover:bg-emerald-100/40" 
                                                                                                                                        : (sesionData.isVirtual && sesionData.reason === "No completada por fecha")
                                                                                                                                            ? "bg-amber-50/30 border-amber-400 hover:bg-amber-100/30"
                                                                                                                                            : "bg-red-50/20 border-red-400 hover:bg-red-100/20"
                                                                                                                            } ${(!isEstudiante && (isSessionCompleta || isSessionAbierta)) ? 'cursor-pointer' : ''}`}
                                                                                                                         >
                                                                                                                              <div className="flex items-center gap-3">
                                                                                                                                  {isEstudiante ? (
                                                                                                                                      (() => {
                                                                                                                                          const myRecord = sesionData.records[0];
                                                                                                                                          const estado = myRecord ? myRecord.estado : "inasistencia";
                                                                                                                                          if (isSessionAbierta) {
                                                                                                                                              return (
                                                                                                                                                  <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-blue-50 rounded-full text-blue-600 animate-pulse relative">
                                                                                                                                                      <Clock size={14} />
                                                                                                                                                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                                                                                                                                                  </div>
                                                                                                                                              );
                                                                                                                                          }
                                                                                                                                          if (!isSessionCompleta) {
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
                                                                                                                                      isSessionAbierta ? (
                                                                                                                                          <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-blue-50 rounded-full text-blue-600 animate-pulse relative">
                                                                                                                                              <Clock size={14} />
                                                                                                                                              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                                                                                                                                          </div>
                                                                                                                                      ) : isSessionCompleta ? (
                                                                                                                                          <div className="flex flex-col items-center gap-1 shrink-0">
                                                                                                                                              <div className="relative w-8 h-8 shrink-0">
                                                                                                                                                  <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                                                                                                                                                      <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                                                                                                                                                      <circle cx="22" cy="22" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={113.1} strokeDashoffset={113.1 - (113.1 * sPct) / 100} className="text-emerald-500 transition-all duration-500" />
                                                                                                                                                  </svg>
                                                                                                                                                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-gray-600">{sPct}%</span>
                                                                                                                                              </div>
                                                                                                                                              {!isEstudiante && (
                                                                                                                                                  <button
                                                                                                                                                      onClick={(e) => {
                                                                                                                                                          e.stopPropagation();
                                                                                                                                                          handleExportarPDF(grupoData, sesionData, programa, facultad);
                                                                                                                                                      }}
                                                                                                                                                      title="Exportar Reporte de Asistencia a PDF"
                                                                                                                                                      className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-sm hover:scale-105 transition-all cursor-pointer"
                                                                                                                                                  >
                                                                                                                                                      <Printer size={10} strokeWidth={2.5} />
                                                                                                                                                  </button>
                                                                                                                                              )}
                                                                                                                                          </div>
                                                                                                                                      ) : (
                                                                                                                                          <div className="w-8 h-8 shrink-0 flex items-center justify-center bg-red-50 rounded-full text-sara-red">
                                                                                                                                              <XCircle size={14} />
                                                                                                                                          </div>
                                                                                                                                      )
                                                                                                                                  )}
                                                                                                                                  <div>
                                                                                                                                      <span className="text-xs font-black text-black block">
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
 
                                                                                                                                              if (isSessionAbierta) {
                                                                                                                                                  return (
                                                                                                                                                      <>
                                                                                                                                                          Sesión Abierta: {formattedDate} (Semana {sesionData.semana})
                                                                                                                                                          {sesionData.tipo_sesion === 'extraordinaria' && (
                                                                                                                                                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200 align-middle">
                                                                                                                                                                  Sesión Extraordinaria
                                                                                                                                                              </span>
                                                                                                                                                          )}
                                                                                                                                                          <br />
                                                                                                                                                          <span className="text-blue-500 font-bold">Aula: {sesionData.aula_sesion || "Sin Aula"}</span>
                                                                                                                                                      </>
                                                                                                                                                  );
                                                                                                                                              }
 
                                                                                                                                              return isSessionCompleta ? (
                                                                                                                                                  <>
                                                                                                                                                      Sesión Completada: {formattedDate} (Semana {sesionData.semana})
                                                                                                                                                      {sesionData.tipo_sesion === 'extraordinaria' && (
                                                                                                                                                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200 align-middle">
                                                                                                                                                              Sesión Extraordinaria
                                                                                                                                                          </span>
                                                                                                                                                      )}
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
                                                                                                                                                  if (isSessionAbierta) {
                                                                                                                                                      return "Sesión abierta: Clase actualmente en curso";
                                                                                                                                                  }
                                                                                                                                                  if (!isSessionCompleta) {
                                                                                                                                                      return sesionData.isVirtual && sesionData.reason === "No completada por fecha" ? "Sesión programada" : "Clase cancelada por ausencia del docente";
                                                                                                                                                  }
                                                                                                                                                  if (estado === "asistencia") return "Asististe a tiempo";
                                                                                                                                                  if (estado === "asistencia con retraso") return `Registrado con retraso (${myRecord.hora_entrada ? new Date(myRecord.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})`;
                                                                                                                                                  return "Inasistencia registrada";
                                                                                                                                              })()
                                                                                                                                          ) : (
                                                                                                                                              isSessionAbierta
                                                                                                                                                  ? "Sesión abierta: Clase activa con docente en aula"
                                                                                                                                                  : sesionData.isVirtual
                                                                                                                                                      ? sesionData.reason === "No completada por fecha" ? "Sesión futura" : "Sesión no completada por ausencia"
                                                                                                                                                      : isSessionCompleta
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
                                                                                                                                          if (isSessionAbierta) {
                                                                                                                                              return (
                                                                                                                                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                                                                                                                                                      En Curso
                                                                                                                                                  </span>
                                                                                                                                              );
                                                                                                                                          }
                                                                                                                                          if (!isSessionCompleta) {
                                                                                                                                              return (
                                                                                                                                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-center border ${
                                                                                                                                                      sesionData.isVirtual && sesionData.reason === "No completada por fecha" 
                                                                                                                                                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                                                                                                                                                          : "bg-red-50 text-red-700 border-red-200"
                                                                                                                                                  }`}>
                                                                                                                                                      {sesionData.isVirtual && sesionData.reason === "No completada por fecha" ? "Pendiente" : "Clase Cancelada"}
                                                                                                                                                  </span>
                                                                                                                                              );
                                                                                                                                          }
                                                                                                                                          return (
                                                                                                                                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                                                                                                                  estado === "asistencia" 
                                                                                                                                                      ? "bg-green-50 text-green-700 border-green-200" 
                                                                                                                                                      : estado === "asistencia con retraso" 
                                                                                                                                                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                                                                                                                                                          : "bg-red-50 text-red-700 border-red-200"
                                                                                                                                              }`}>
                                                                                                                                                  {estado === "asistencia" ? "Presente" : estado === "asistencia con retraso" ? "Tarde" : "Ausente"}
                                                                                                                                              </span>
                                                                                                                                          );
                                                                                                                                      })()
                                                                                                                                  ) : (
                                                                                                                                      <>
                                                                                                                                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full text-center flex flex-col items-center justify-center border ${
                                                                                                                                              isSessionAbierta 
                                                                                                                                                  ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" 
                                                                                                                                                  : sesionData.isVirtual 
                                                                                                                                                      ? (sesionData.reason === "No completada por fecha" 
                                                                                                                                                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                                                                                                                                                          : "bg-red-50 text-red-700 border-red-200") 
                                                                                                                                                      : isSessionCompleta 
                                                                                                                                                          ? "bg-green-50 text-green-700 border-green-200" 
                                                                                                                                                          : "bg-red-50 text-red-700 border-red-200"
                                                                                                                                          }`}>
                                                                                                                                              {isSessionAbierta ? "En Curso" : sesionData.isVirtual ? (sesionData.reason === "No completada por fecha" ? "Pendiente" : "Clase Cancelada") : isSessionCompleta ? "Docente Asistió" : "Clase Cancelada"}
                                                                                                                                          </span>
                                                                                                                                          {(isSessionCompleta || isSessionAbierta) && (
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
                                                                                                                  
                                                                                                                  {!isEstudiante && (isSessionCompleta || isSessionAbierta) && isSessionOpen && (
                                                                                                                       <div className="space-y-3 mt-1">
                                                                                                                           {/* PANEL PREMIUM DE DOCENTE */}
                                                                                                                           <div className="bg-[#fafaf7] border border-[#f3efe7] shadow-sm rounded-2xl p-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                                                                                                              <div className="md:col-span-4 flex items-center gap-3">
                                                                                                                                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-700 font-black text-xs shrink-0 border border-amber-100 shadow-sm">
                                                                                                                                      DO
                                                                                                                                  </div>
                                                                                                                                  <div>
                                                                                                                                      <h4 className="text-xs font-black text-gray-800 leading-snug">{grupoData.docente}</h4>
                                                                                                                                      <p className="text-[10px] text-gray-500 font-bold mt-0.5 whitespace-nowrap">C.C. {sesionData.docente_num_doc || "—"}</p>
                                                                                                                                  </div>
                                                                                                                              </div>
                                                                                                                              <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
                                                                                                                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Entrada</span>
                                                                                                                                  <span className="font-bold text-gray-800 text-[10px] mt-0.5 whitespace-nowrap">
                                                                                                                                      {sesionData.docente_hora_entrada ? new Date(sesionData.docente_hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                                                                                  </span>
                                                                                                                              </div>
                                                                                                                              <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
                                                                                                                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Salida</span>
                                                                                                                                  <span className="font-bold text-gray-800 text-[10px] mt-0.5 whitespace-nowrap">
                                                                                                                                      {sesionData.docente_hora_salida ? new Date(sesionData.docente_hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                                                                                  </span>
                                                                                                                              </div>
                                                                                                                              <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
                                                                                                                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Método</span>
                                                                                                                                  <div className="mt-0.5 whitespace-nowrap">
                                                                                                                                      {!sesionData.docente_metodo_verificacion || sesionData.docente_metodo_verificacion === "N/A" || sesionData.docente_metodo_verificacion === "None" || sesionData.docente_metodo_verificacion.trim() === "" ? (
                                                                                                                                           "—"
                                                                                                                                      ) : (
                                                                                                                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                                                                                                              sesionData.docente_metodo_verificacion === "Biometría" ? "bg-purple-50 text-purple-600" :
                                                                                                                                              sesionData.docente_metodo_verificacion === "Supervisado" ? "bg-blue-50 text-blue-600" :
                                                                                                                                              "bg-emerald-50 text-emerald-600"
                                                                                                                                          }`}>
                                                                                                                                              {sesionData.docente_metodo_verificacion}
                                                                                                                                          </span>
                                                                                                                                      )}
                                                                                                                                  </div>
                                                                                                                              </div>
                                                                                                                              <div className="md:col-span-2 flex flex-col items-center justify-center text-center">
                                                                                                                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider">Estado</span>
                                                                                                                                  <span className={`mt-0.5 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full transition-all whitespace-nowrap ${
                                                                                                                                      sesionData.docente_estado_asistencia === "asistencia" ? "bg-green-50 text-green-700" :
                                                                                                                                      sesionData.docente_estado_asistencia === "asistencia con retraso" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                                                                                                                                  }`}>
                                                                                                                                      {sesionData.docente_estado_asistencia === "asistencia" ? "Presente" :
                                                                                                                                       sesionData.docente_estado_asistencia === "asistencia con retraso" ? "Tarde" : "Ausente"}
                                                                                                                                  </span>
                                                                                                                              </div>
                                                                                                                          </div>                                              
  
                                                                                                                          {/* LISTA DE ESTUDIANTES (Solo si no es sesión abierta/en curso) */}
                                                                                                                          {!isSessionAbierta ? (
                                                                                                                              <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                                                                                                                                  {/* Header Row */}
                                                                                                                                  <div className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black tracking-wider px-4 py-2.5 hidden md:grid grid-cols-12 gap-4 items-center border-b border-gray-100">
                                                                                                                                      <div className="col-span-4 text-left">Estudiante</div>
                                                                                                                                      <div className="col-span-2 text-center">Entrada</div>
                                                                                                                                      <div className="col-span-2 text-center">Salida</div>
                                                                                                                                      <div className="col-span-2 text-center">Método</div>
                                                                                                                                      <div className="col-span-2 text-center">Estado</div>
                                                                                                                                  </div>
                                                                                                                                  
                                                                                                                                  {/* Body Rows */}
                                                                                                                                  <div className="divide-y divide-gray-50">
                                                                                                                                      {sesionData.records.map((a: any) => (
                                                                                                                                          <div key={a.num_doc} className="px-4 py-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-gray-50/40 transition-colors">
                                                                                                                                              {/* Estudiante */}
                                                                                                                                              <div className="md:col-span-4 flex items-center gap-3">
                                                                                                                                                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-black text-[10px] shrink-0 border border-blue-100 shadow-sm">
                                                                                                                                                      ES
                                                                                                                                                  </div>
                                                                                                                                                  <div>
                                                                                                                                                      <h4 className="text-xs font-black text-gray-800 leading-snug">{a.nombre_estudiante} {a.apellido_estudiante}</h4>
                                                                                                                                                      <p className="text-[10px] text-gray-500 font-bold mt-0.5 whitespace-nowrap">C.C. {a.num_doc}</p>
                                                                                                                                                  </div>
                                                                                                                                              </div>
                                                                                                                                              
                                                                                                                                              {/* Entrada */}
                                                                                                                                              <div className="md:col-span-2 text-center text-[10px] text-gray-800 font-bold flex justify-between md:justify-center items-center">
                                                                                                                                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider md:hidden">Entrada</span>
                                                                                                                                                  <span className="whitespace-nowrap">{a.hora_entrada ? new Date(a.hora_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                                                                                                              </div>
                                                                                                                                              
                                                                                                                                              {/* Salida */}
                                                                                                                                              <div className="md:col-span-2 text-center text-[10px] text-gray-800 font-bold flex justify-between md:justify-center items-center">
                                                                                                                                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider md:hidden">Salida</span>
                                                                                                                                                  <span className="whitespace-nowrap">{a.hora_salida ? new Date(a.hora_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                                                                                                              </div>
                                                                                                                                              
                                                                                                                                              {/* Método */}
                                                                                                                                              <div className="md:col-span-2 text-center flex justify-between md:justify-center items-center">
                                                                                                                                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider md:hidden">Método</span>
                                                                                                                                                  <div className="whitespace-nowrap">
                                                                                                                                                      {!a.metodo_verificacion || a.metodo_verificacion === "N/A" || a.metodo_verificacion === "None" || a.metodo_verificacion.trim() === "" ? (
                                                                                                                                                           "—"
                                                                                                                                                      ) : (
                                                                                                                                                           <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                                                                                                                               a.metodo_verificacion === "Biometría" ? "bg-purple-50 text-purple-600" :
                                                                                                                                                               a.metodo_verificacion === "Supervisado" ? "bg-blue-50 text-blue-600" :
                                                                                                                                                               "bg-emerald-50 text-emerald-600"
                                                                                                                                                           }`}>
                                                                                                                                                               {a.metodo_verificacion}
                                                                                                                                                           </span>
                                                                                                                                                      )}
                                                                                                                                                  </div>
                                                                                                                                              </div>
                                                                                                                                              
                                                                                                                                              {/* Estado */}
                                                                                                                                              <div className="md:col-span-2 text-center flex justify-between md:justify-center items-center">
                                                                                                                                                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-wider md:hidden">Estado</span>
                                                                                                                                                  <div className="whitespace-nowrap">
                                                                                                                                                      {editingEstadoId === a.id ? (
                                                                                                                                                          <select value={a.estado} onChange={e => handleCambiarEstado(a.id, e.target.value)} onBlur={() => setEditingEstadoId(null)} autoFocus className="text-[10px] font-bold p-1 bg-white border border-gray-200 rounded-lg">
                                                                                                                                                              {["asistencia", "asistencia con retraso", "inasistencia"].map(e => <option key={e} value={e}>{e}</option>)}
                                                                                                                                                          </select>
                                                                                                                                                      ) : (
                                                                                                                                                          <button onClick={() => setEditingEstadoId(a.id)} className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full transition-all whitespace-nowrap ${a.estado === "asistencia" ? "bg-green-50 text-green-700 hover:bg-green-100" : a.estado === "asistencia con retraso" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-red-50 text-red-700 hover:bg-red-100"}`}>
                                                                                                                                                              {a.estado === "asistencia" ? "Presente" : a.estado === "asistencia con retraso" ? "Tarde" : "Ausente"}
                                                                                                                                                          </button>
                                                                                                                                                      )}
                                                                                                                                                  </div>
                                                                                                                                              </div>
                                                                                                                                          </div>
                                                                                                                                      ))}
                                                                                                                                                                </div>
                                                                                                                              </div>
                                                                                                                          ) : (
                                                                                                                              <div className="bg-blue-50/50 rounded-2xl p-6 border border-dashed border-blue-100 text-center">
                                                                                                                                  <p className="text-xs font-extrabold text-blue-800 uppercase tracking-widest flex items-center justify-center gap-2">
                                                                                                                                      <Clock className="animate-spin text-blue-500" size={14} /> Sesión en Curso
                                                                                                                                  </p>
                                                                                                                                  <p className="text-[11px] text-gray-500 font-medium mt-1">Los registros de asistencia de los estudiantes se visualizarán una vez el docente complete y cierre la sesión de clase.</p>
                                                                                                                              </div>
                                                                                                                          )}
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
