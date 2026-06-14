"use client";
import React, { useEffect, useState } from "react";
import { Plus, Trash2, X, Pencil, Building2, BookOpen, GraduationCap, CalendarDays, Users, ChevronDown, AlertTriangle, Calendar, Printer, Clock, MapPin } from "lucide-react";
import {
    listarFacultades, crearFacultad, actualizarFacultad, eliminarFacultad, Facultad,
    listarProgramas, crearPrograma, actualizarPrograma, eliminarPrograma, Programa,
    listarAsignaturas, crearAsignatura, actualizarAsignatura, eliminarAsignatura, Asignatura,
    listarHorarios, crearHorario, actualizarHorario, eliminarHorario, Horario,
    listarSemestres, crearSemestre, actualizarSemestre, eliminarSemestre, Semestre,
} from "@/services/admin";
import { listarUsuarios, Usuario } from "@/services/usuarios";
import {
    listarMatriculas, crearMatricula, actualizarMatricula, eliminarMatricula, Matricula
} from "@/services/matriculas";
import { obtenerHorarioSemanal } from "@/services/dashboard";
import PrintHeader from "@/components/PrintHeader";

type Tab = "facultades" | "programas" | "asignaturas" | "horarios" | "matriculas" | "semestres";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "facultades", label: "Facultades", icon: <Building2 size={15} /> },
    { id: "programas", label: "Programas", icon: <GraduationCap size={15} /> },
    { id: "asignaturas", label: "Asignaturas", icon: <BookOpen size={15} /> },
    { id: "horarios", label: "Horarios", icon: <CalendarDays size={15} /> },
    { id: "matriculas", label: "Matrículas", icon: <Users size={15} /> },
    { id: "semestres", label: "Semestres", icon: <CalendarDays size={15} /> },
];

const TAB_ACTIONS: Record<Tab, { btn: string; title: string; editTitle: string }> = {
    facultades: { btn: "Agregar Facultad", title: "Nueva Facultad", editTitle: "Editar Facultad" },
    programas: { btn: "Agregar Programa", title: "Nuevo Programa", editTitle: "Editar Programa" },
    asignaturas: { btn: "Agregar Asignatura", title: "Nueva Asignatura", editTitle: "Editar Asignatura" },
    horarios: { btn: "Asignar Horario", title: "Asignar Horario", editTitle: "Editar Horario" },
    matriculas: { btn: "Nueva Matrícula", title: "Nueva Matrícula", editTitle: "Editar Matrícula" },
    semestres: { btn: "Nuevo Semestre", title: "Nuevo Semestre", editTitle: "Editar Semestre" },
};

const DIAS = [
    { val: "lunes", label: "Lunes" }, { val: "martes", label: "Martes" },
    { val: "miercoles", label: "Miércoles" }, { val: "jueves", label: "Jueves" },
    { val: "viernes", label: "Viernes" }, { val: "sabado", label: "Sábado" },
];
const DIA_LABEL: Record<string, string> = Object.fromEntries(DIAS.map(d => [d.val, d.label]));
const HORARIO_VACIO = { asignatura_id: "", docente_id: "", dia_semana: "lunes", hora_inicio: "08:00", hora_fin: "10:00", aula: "", grupo: "A", cupo_maximo: 30 };
type Sesion = { id?: string; dia_semana: string; hora_inicio: string; hora_fin: string; aula: string; grupo: string };
const SESION_VACIA: Sesion = { dia_semana: "lunes", hora_inicio: "06:00", hora_fin: "08:00", aula: "", grupo: "A" };
const DIA_ORDER: Record<string, number> = { lunes: 0, martes: 1, miercoles: 2, jueves: 3, viernes: 4, sabado: 5 };
const MAT_VACIA = { usuario_id: "", programa_id: "", asignatura_id: "", grupo: "", semestre: 1, fecha_inicio: new Date().toISOString().split("T")[0], estado: "activa" };
const ASIGNATURA_VACIA = { nombre: "", codigo: "", creditos: 3, programa_id: "", facultad_id: "" };

const inp = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all";
const lbl = "text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1";

function formatHora(time?: string): string {
    return time ? time.slice(0, 5) : "";
}

function normalizar(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


function THead({ cols }: { cols: string[] }) {
    return (
        <thead>
            <tr className="bg-gray-50">
                {cols.map(c => (
                    <th key={c} className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider">{c}</th>
                ))}
            </tr>
        </thead>
    );
}

const HorariosDropdown = ({ matricula, horarios }: { matricula: { asignatura_id: string; grupo: string }; horarios: Horario[] }) => {
    const [open, setOpen] = useState(false);
    
    // Find matching schedules
    const matches = horarios.filter(h => 
        h.asignatura_id === matricula.asignatura_id && 
        h.grupo === matricula.grupo
    );
    
    return (
        <div className="relative inline-block text-left">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                className="inline-flex items-center justify-center p-1 rounded-lg text-gray-400 hover:text-sara-red hover:bg-gray-50 transition-all cursor-pointer animate-pulse"
                title="Ver Horarios"
            >
                <CalendarDays size={14} className="text-gray-500 hover:text-sara-red" />
            </button>
            
            {open && (
                <div className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-3 animate-in fade-in duration-200">
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2 border-b border-gray-50 pb-1">
                        Horarios del Grupo {matricula.grupo}
                    </p>
                    {matches.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">Sin horarios programados</p>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {matches.map((h, i) => (
                                <div key={i} className="text-xs flex flex-col gap-0.5 p-1.5 rounded-lg bg-gray-50/50 border border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-700 capitalize">{h.dia_semana}</span>
                                        <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.2 rounded-full">
                                            Aula {h.aula}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                        ⏱️ {h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}
                                    </div>
                                    <div className="text-[10px] text-gray-400 italic">
                                        Docente: {h.docente} {h.apellido_docente}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function ConfigPage() {
    const [tab, setTab] = useState<Tab>("facultades");
    const [panel, setPanel] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Listas
    const [facultades, setFacultades] = useState<Facultad[]>([]);
    const [programas, setProgramas] = useState<Programa[]>([]);
    const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [docentes, setDocentes] = useState<Usuario[]>([]);
    const [estudiantes, setEstudiantes] = useState<Usuario[]>([]);
    const [matriculas, setMatriculas] = useState<Matricula[]>([]);
    const [semestres, setSemestres] = useState<Semestre[]>([]);
    const [mostrarHistorial, setMostrarHistorial] = useState(false);
    const [conflictingStudents, setConflictingStudents] = useState<{ id: string; nombre: string; num_doc: string }[]>([]);
    const [conflictDia, setConflictDia] = useState("");

    // Estados para horario semanal e impresión
    const [mostrarHorarioModal, setMostrarHorarioModal] = useState(false);
    const [horarioUsuario, setHorarioUsuario] = useState<any>(null);
    const [horariosData, setHorariosData] = useState<any[]>([]);
    const [cargandoHorario, setCargandoHorario] = useState(false);

    async function openHorarioModal(u: any) {
        setHorarioUsuario(u);
        setMostrarHorarioModal(true);
        setCargandoHorario(true);
        setHorariosData([]);
        try {
            const data = await obtenerHorarioSemanal(u.id, u.rol);
            setHorariosData(data);
        } catch (err) {
            console.error("Error al obtener horario del usuario:", err);
        } finally {
            setCargandoHorario(false);
        }
    }

    // Formularios
    const [fFacultad, setFFacultad] = useState({ nombre: "", codigo: "" });
    const [fPrograma, setFPrograma] = useState({ nombre: "", codigo: "", facultad_id: "" });
    const [fAsig, setFAsig] = useState({ nombre: "", codigo: "", creditos: 0, programa_id: "", facultad_id: "" });
    const [fHorario, setFHorario] = useState(HORARIO_VACIO);
    const [fMat, setFMat] = useState(MAT_VACIA);
    const [fSemestre, setFSemestre] = useState<{ nombre: string; fecha_inicio: string; fecha_fin: string; activo: boolean; estado?: string }>({ nombre: "", fecha_inicio: "", fecha_fin: "", activo: false, estado: "pendiente" });

    // Multi-sesión
    const [sesiones, setSesiones] = useState<Sesion[]>([]);
    const [nuevaSesion, setNuevaSesion] = useState<Sesion>(SESION_VACIA);
    const [errorSesion, setErrorSesion] = useState("");
    const [sesionesAEliminar, setSesionesAEliminar] = useState<string[]>([]);
    const [editandoGrupoNombre, setEditandoGrupoNombre] = useState({ asignatura: "", docente: "" });
    const [confirmingDeleteGrupo, setConfirmingDeleteGrupo] = useState<string | null>(null);
    const [editingSesionIndex, setEditingSesionIndex] = useState<number | null>(null);
    const [confirmingRemoveSesionIndex, setConfirmingRemoveSesionIndex] = useState<number | null>(null);

    // Filtros cascada horarios
    const [filtroHorFacultad, setFiltroHorFacultad] = useState("");
    const [filtroHorPrograma, setFiltroHorPrograma] = useState("");
    const progHor = filtroHorFacultad ? programas.filter(p => p.facultad === filtroHorFacultad) : [];
    const asigFil = filtroHorPrograma ? asignaturas.filter(a => a.programa === filtroHorPrograma) : [];

    // Filtros cascada matrículas
    const [filtroMatFacultad, setFiltroMatFacultad] = useState("");
    const [showFacSugg, setShowFacSugg] = useState(false);
    const [filtroMatPrograma, setFiltroMatPrograma] = useState("");
    const [busqProg, setBusqProg] = useState("");
    const [showProgSugg, setShowProgSugg] = useState(false);
    const [busqEstudiante, setBusqEstudiante] = useState("");
    const [estudianteSel, setEstudianteSel] = useState<Usuario | null>(null);
    const [showEstSugg, setShowEstSugg] = useState(false);
    const [editMatContext, setEditMatContext] = useState({ asignatura: "", estudiante: "" });
    const [asigsMat, setAsigsMat] = useState<{ asignatura_id: string; asignatura: string; grupo: string; id?: string }[]>([]);
    const [horariosExpansibles, setHorariosExpansibles] = useState<Record<string, boolean>>({});
    const [nuevaAsigMat, setNuevaAsigMat] = useState({ asignatura_id: "", grupo: "" });
    const [asigMatAEliminar, setAsigMatAEliminar] = useState<string[]>([]);
    const [errorAsigMat, setErrorAsigMat] = useState("");
    const [editMatStudent, setEditMatStudent] = useState({ id: "", nombre: "", num_doc: "", programa_id: "", programa: "" });
    const [facShowAll, setFacShowAll] = useState(false);
    const [estShowAll, setEstShowAll] = useState(false);
    const [progShowAll, setProgShowAll] = useState(false);
    const progMatFil = filtroMatFacultad ? programas.filter(p => normalizar(p.facultad).includes(normalizar(filtroMatFacultad))) : programas;
    const facSuggestions = facShowAll ? facultades : (filtroMatFacultad.length >= 1 ? facultades.filter(f => normalizar(f.nombre).includes(normalizar(filtroMatFacultad))).slice(0, 8) : []);
    const progSuggestions = progShowAll ? progMatFil : (busqProg.length >= 1 ? progMatFil.filter(p => normalizar(p.nombre).includes(normalizar(busqProg))).slice(0, 8) : []);
    const asigMatFil = (() => { const id = filtroMatPrograma || editMatStudent.programa_id; return id ? asignaturas.filter(a => programas.find(p => p.id === id)?.nombre === a.programa && horarios.some(h => h.asignatura_id === a.id)) : []; })();
    const estSuggestions = estShowAll ? estudiantes.filter(u => u.activo).slice(0, 20) : (busqEstudiante.length >= 2 ? estudiantes.filter(u => u.activo && normalizar(`${u.nombres} ${u.apellidos} ${u.num_doc}`).includes(normalizar(busqEstudiante))).slice(0, 8) : []);
    const gruposNuevaAsig = nuevaAsigMat.asignatura_id ? [...new Set(horarios.filter(h => h.asignatura_id === nuevaAsigMat.asignatura_id).map(h => h.grupo))].filter(Boolean) : [];

    // Filtros tabla matrículas
    const [filtTabEst, setFiltTabEst] = useState("");
    const [filtTabFac, setFiltTabFac] = useState("");
    const [showTabFacSugg, setShowTabFacSugg] = useState(false);
    const [filtTabProg, setFiltTabProg] = useState("");
    const [showTabProgSugg, setShowTabProgSugg] = useState(false);
    const [filtTabAsig, setFiltTabAsig] = useState("");
    const [showTabAsigSugg, setShowTabAsigSugg] = useState(false);
    const [tabFacShowAll, setTabFacShowAll] = useState(false);
    const [tabProgShowAll, setTabProgShowAll] = useState(false);
    const [tabAsigShowAll, setTabAsigShowAll] = useState(false);

    // Filtros Programas
    const [filtProgFac, setFiltProgFac] = useState("");
    const [filtProgCod, setFiltProgCod] = useState("");
    const [showProgFacSugg, setShowProgFacSugg] = useState(false);
    const [progFacShowAll, setProgFacShowAll] = useState(false);

    // Filtros Asignaturas
    const [filtAsigFac, setFiltAsigFac] = useState("");
    const [filtAsigProg, setFiltAsigProg] = useState("");
    const [filtAsigCod, setFiltAsigCod] = useState("");
    const [filtAsigCred, setFiltAsigCred] = useState("");
    const [showAsigFacSugg, setShowAsigFacSugg] = useState(false);
    const [showAsigProgSugg, setShowAsigProgSugg] = useState(false);
    const [asigFacShowAll, setAsigFacShowAll] = useState(false);
    const [asigProgShowAll, setAsigProgShowAll] = useState(false);

    // Filtros Horarios
    const [filtHorFac, setFiltHorFac] = useState("");
    const [filtHorProg, setFiltHorProg] = useState("");
    const [filtHorDoc, setFiltHorDoc] = useState("");
    const [filtHorCupo, setFiltHorCupo] = useState(""); // "disponible" | "lleno"
    const [filtHorIni, setFiltHorIni] = useState("");
    const [filtHorFin, setFiltHorFin] = useState("");
    const [filtHorAula, setFiltHorAula] = useState("");
    const [filtHorAsig, setFiltHorAsig] = useState("");
    const [showHorFacSugg, setShowHorFacSugg] = useState(false);
    const [showHorProgSugg, setShowHorProgSugg] = useState(false);
    const [showHorDocSugg, setShowHorDocSugg] = useState(false);
    const [showHorAulaSugg, setShowHorAulaSugg] = useState(false);
    const [showHorCupoSugg, setShowHorCupoSugg] = useState(false);
    const [showHorIniSugg, setShowHorIniSugg] = useState(false);
    const [showHorFinSugg, setShowHorFinSugg] = useState(false);
    const [horFacShowAll, setHorFacShowAll] = useState(false);
    const [horProgShowAll, setHorProgShowAll] = useState(false);
    const [horDocShowAll, setHorDocShowAll] = useState(false);
    const [horAulaShowAll, setHorAulaShowAll] = useState(false);
    const [showHorAsigSugg, setShowHorAsigSugg] = useState(false);
    const [horAsigShowAll, setHorAsigShowAll] = useState(false);

    // States for Forms (Premium Selects)
    const [formProgFacSearch, setFormProgFacSearch] = useState("");
    const [showFormProgFacSugg, setShowFormProgFacSugg] = useState(false);
    const [formAsigFacSearch, setFormAsigFacSearch] = useState("");
    const [showFormAsigFacSugg, setShowFormAsigFacSugg] = useState(false);
    const [formAsigProgSearch, setFormAsigProgSearch] = useState("");
    const [showFormAsigProgSugg, setShowFormAsigProgSugg] = useState(false);

    // States for Asignar Horario Form
    const [formHorFacSearch, setFormHorFacSearch] = useState("");
    const [showFormHorFacSugg, setShowFormHorFacSugg] = useState(false);
    const [formHorProgSearch, setFormHorProgSearch] = useState("");
    const [showFormHorProgSugg, setShowFormHorProgSugg] = useState(false);
    const [formHorAsigSearch, setFormHorAsigSearch] = useState("");
    const [showFormHorAsigSugg, setShowFormHorAsigSugg] = useState(false);
    const [formHorDocSearch, setFormHorDocSearch] = useState("");
    const [showFormHorDocSugg, setShowFormHorDocSugg] = useState(false);

    const tabFacSugg = tabFacShowAll ? facultades : (filtTabFac.length >= 1 ? facultades.filter(f => normalizar(f.nombre).includes(normalizar(filtTabFac))).slice(0, 8) : facultades.slice(0, 8));
    const tabProgFil = filtTabFac ? programas.filter(p => normalizar(p.facultad).includes(normalizar(filtTabFac))) : programas;
    const tabProgSugg = tabProgShowAll ? tabProgFil : (filtTabProg.length >= 1 ? tabProgFil.filter(p => normalizar(p.nombre).includes(normalizar(filtTabProg))).slice(0, 8) : tabProgFil.slice(0, 8));
    const tabAsigFil = filtTabProg ? asignaturas.filter(a => normalizar(a.programa).includes(normalizar(filtTabProg))) : asignaturas;
    const tabAsigSugg = tabAsigShowAll ? tabAsigFil : (filtTabAsig.length >= 1 ? tabAsigFil.filter(a => normalizar(a.nombre).includes(normalizar(filtTabAsig))).slice(0, 8) : tabAsigFil.slice(0, 8));

    // Programas con filtros
    const progFacSugg = progFacShowAll ? facultades : (filtProgFac.length >= 1 ? facultades.filter(f => normalizar(f.nombre).includes(normalizar(filtProgFac))).slice(0, 8) : facultades.slice(0, 8));
    const programasFiltrados = programas.filter(p => {
        const matchFac = !filtProgFac || normalizar(p.facultad).includes(normalizar(filtProgFac));
        const matchCod = !filtProgCod || normalizar(p.codigo).includes(normalizar(filtProgCod));
        return matchFac && matchCod;
    });

    // Asignaturas con filtros
    const asigFacSugg = asigFacShowAll ? facultades : (filtAsigFac.length >= 1 ? facultades.filter(f => normalizar(f.nombre).includes(normalizar(filtAsigFac))).slice(0, 8) : facultades.slice(0, 8));
    const asigProgFil = filtAsigFac ? programas.filter(p => normalizar(p.facultad).includes(normalizar(filtAsigFac))) : programas;
    const asigProgSugg = asigProgShowAll ? asigProgFil : (filtAsigProg.length >= 1 ? asigProgFil.filter(p => normalizar(p.nombre).includes(normalizar(filtAsigProg))).slice(0, 8) : asigProgFil.slice(0, 8));
    const asignaturasFiltradas = asignaturas.filter(a => {
        const matchFac = !filtAsigFac || normalizar(a.facultad).includes(normalizar(filtAsigFac));
        const matchProg = !filtAsigProg || normalizar(a.programa).includes(normalizar(filtAsigProg));
        const matchCod = !filtAsigCod || normalizar(a.codigo).includes(normalizar(filtAsigCod));
        const matchCred = !filtAsigCred || a.creditos === parseInt(filtAsigCred);
        return matchFac && matchProg && matchCod && matchCred;
    });

    // Horarios con filtros
    const horFacSugg = horFacShowAll ? facultades : (filtHorFac.length >= 1 ? facultades.filter(f => normalizar(f.nombre).includes(normalizar(filtHorFac))).slice(0, 8) : facultades.slice(0, 8));
    const horProgFil = filtHorFac ? programas.filter(p => normalizar(p.facultad).includes(normalizar(filtHorFac))) : programas;
    const horProgSugg = horProgShowAll ? horProgFil : (filtHorProg.length >= 1 ? horProgFil.filter(p => normalizar(p.nombre).includes(normalizar(filtHorProg))).slice(0, 8) : horProgFil.slice(0, 8));
    const docentesNombres = docentes.map(d => ({ id: d.id, nombre: `${d.nombres} ${d.apellidos}` }));
    const horDocSugg = horDocShowAll ? docentesNombres : (filtHorDoc.length >= 1 ? docentesNombres.filter(d => normalizar(d.nombre).includes(normalizar(filtHorDoc))).slice(0, 8) : docentesNombres.slice(0, 8));
    const aulasUnicas = [...new Set(horarios.map(h => h.aula))].filter(Boolean);
    const horAulaSugg = horAulaShowAll ? aulasUnicas : (filtHorAula.length >= 1 ? aulasUnicas.filter(a => normalizar(a).includes(normalizar(filtHorAula))).slice(0, 8) : aulasUnicas.slice(0, 8));
    const asigsUnicas = [...new Set(horarios.map(h => h.asignatura))].filter(Boolean);
    const horAsigSugg = horAsigShowAll ? asigsUnicas : (filtHorAsig.length >= 1 ? asigsUnicas.filter(a => normalizar(a).includes(normalizar(filtHorAsig))).slice(0, 8) : asigsUnicas.slice(0, 8));

    const matriculasFiltradas = matriculas.filter(m => {
        const matchEst = !filtTabEst || normalizar(`${m.estudiante} ${m.apellido_estudiante} ${m.num_doc}`).includes(normalizar(filtTabEst));
        const matchFac = !filtTabFac || normalizar(m.facultad ?? "").includes(normalizar(filtTabFac));
        const matchProg = !filtTabProg || normalizar(m.programa ?? "").includes(normalizar(filtTabProg));
        return matchEst && matchFac && matchProg;
    });

    type GrupoMat = { num_doc: string; estudiante: string; apellido_estudiante: string; facultad: string; programa: string; semestre: number; items: Matricula[] };


    useEffect(() => {
        const init = async () => {
            const [f, p, a, h, u, m, s] = await Promise.all([
                listarFacultades(), listarProgramas(), listarAsignaturas(),
                listarHorarios(), listarUsuarios(), listarMatriculas(), listarSemestres()
            ]);
            setFacultades(f); setProgramas(p); setAsignaturas(a); setHorarios(h);
            setDocentes(u.filter((x: any) => x.rol === "Docente"));
            setEstudiantes(u.filter((x: any) => x.rol === "Estudiante"));
            setMatriculas(m);
            setSemestres(s);
        };
        init();
        const intervalo = setInterval(async () => {
            setHorarios(await listarHorarios());
        }, 10000); // actualiza cupos cada 10 segundos
        return () => clearInterval(intervalo);
    }, []);


    const resetForm = () => {
        setFSemestre({ nombre: "", fecha_inicio: "", fecha_fin: "", activo: false, estado: "pendiente" });
        setFFacultad({ nombre: "", codigo: "" });
        setFPrograma({ nombre: "", codigo: "", facultad_id: "" });
        setFAsig({ nombre: "", codigo: "", creditos: 0, programa_id: "", facultad_id: "" });
        setFormProgFacSearch("");
        setShowFormProgFacSugg(false);
        setFormAsigFacSearch("");
        setShowFormAsigFacSugg(false);
        setFormAsigProgSearch("");
        setShowFormAsigProgSugg(false);
        setFormHorFacSearch("");
        setShowFormHorFacSugg(false);
        setFormHorProgSearch("");
        setShowFormHorProgSugg(false);
        setFormHorAsigSearch("");
        setShowFormHorAsigSugg(false);
        setFormHorDocSearch("");
        setShowFormHorDocSugg(false);
        setFHorario(HORARIO_VACIO);
        setFMat(MAT_VACIA);
        setFiltroMatPrograma("");
        setBusqProg(""); setBusqEstudiante(""); setEstudianteSel(null); setShowEstSugg(false);
        setShowFacSugg(false);
        setShowProgSugg(false);
        setAsigsMat([]); setNuevaAsigMat({ asignatura_id: "", grupo: "" });
        setHorariosExpansibles({});
        setAsigMatAEliminar([]); setErrorAsigMat("");
        setEditMatStudent({ id: "", nombre: "", num_doc: "", programa_id: "", programa: "" });
        setEditMatContext({ asignatura: "", estudiante: "" });
        setFiltroMatFacultad("");
        setSesiones([]);
        setNuevaSesion(SESION_VACIA);
        setSesionesAEliminar([]);
        setEditandoId(null);
        setConfirmingDeleteGrupo(null);
        setEditingSesionIndex(null);
        setConfirmingRemoveSesionIndex(null);
        setError("");
        setErrorSesion("");
        setConflictingStudents([]);
        setConflictDia("");
        setFacShowAll(false);
        setProgShowAll(false);
        setEstShowAll(false);
        setFiltTabEst(""); setFiltTabFac(""); setFiltTabProg(""); setFiltTabAsig("");
        setShowTabFacSugg(false); setShowTabProgSugg(false);
        setTabFacShowAll(false); setTabProgShowAll(false); setShowTabAsigSugg(false);

    };

    function editarFacultad(f: Facultad) {
        setFFacultad({ nombre: f.nombre, codigo: f.codigo });
        setEditandoId(f.id); setTab("facultades"); setPanel(true); setError("");
    }
    function editarPrograma(p: Programa) {
        const fId = facultades.find(f => f.nombre === p.facultad)?.id ?? "";
        setFPrograma({ nombre: p.nombre, codigo: p.codigo, facultad_id: fId });
        setEditandoId(p.id); setTab("programas"); setPanel(true); setError("");
    }

    function editarAsignatura(a: Asignatura) {
        const pId = programas.find(p => p.nombre === a.programa)?.id ?? "";
        const fId = facultades.find(f => f.nombre === a.facultad)?.id ?? "";
        setFAsig({ nombre: a.nombre, codigo: a.codigo, creditos: a.creditos, programa_id: pId, facultad_id: fId });
        setEditandoId(a.id); setTab("asignaturas"); setPanel(true); setError("");
    }

    type GrupoHor = {
        asignatura: string;
        asignatura_id: string;
        docente: string;
        apellido: string;
        docente_id: string;
        sesiones: Horario[];
        grupo: string;
        cupo_maximo: number;
        matriculados: number;
        facultad: string;
        programa: string;
    };

    function editarGrupo(g: GrupoHor) {
        const grupoActual = g.sesiones[0]?.grupo || "A";
        setFHorario({ ...HORARIO_VACIO, asignatura_id: g.asignatura_id, docente_id: g.docente_id, grupo: grupoActual, cupo_maximo: g.sesiones[0]?.cupo_maximo ?? 30 });
        const sorted = [...g.sesiones].sort((a, b) => (DIA_ORDER[a.dia_semana] ?? 6) - (DIA_ORDER[b.dia_semana] ?? 6));
        setSesiones(sorted.map(s => ({
            id: s.id,
            dia_semana: s.dia_semana,
            hora_inicio: s.hora_inicio?.slice(0, 5) ?? "08:00",
            hora_fin: s.hora_fin?.slice(0, 5) ?? "10:00",
            aula: s.aula,
            grupo: s.grupo || "A"
        })));
        setSesionesAEliminar([]);
        setNuevaSesion({ ...SESION_VACIA, grupo: grupoActual });
        setErrorSesion("");
        setEditandoGrupoNombre({ asignatura: g.asignatura, docente: `${g.docente} ${g.apellido}` });
        setEditandoId("grupo"); setTab("horarios"); setPanel(true); setError("");
    }

    function editarGrupoMat(g: GrupoMat) {
        const u = estudiantes.find(e => e.num_doc === g.num_doc);
        const p = programas.find(pr => pr.nombre === g.programa);
        const fecha = g.items[0]?.fecha_inicio || MAT_VACIA.fecha_inicio;
        setEditMatStudent({ id: u?.id ?? "", nombre: `${g.estudiante} ${g.apellido_estudiante}`, num_doc: g.num_doc, programa_id: p?.id ?? "", programa: g.programa });
        setFMat({ ...MAT_VACIA, usuario_id: u?.id ?? "", programa_id: p?.id ?? "", semestre: g.semestre, fecha_inicio: fecha });
        setAsigsMat([...g.items].sort((a, b) => a.asignatura.localeCompare(b.asignatura)).map(m => ({ asignatura_id: m.asignatura_id, asignatura: m.asignatura, grupo: m.grupo, id: m.id, estado: m.estado })));
        setAsigMatAEliminar([]); setNuevaAsigMat({ asignatura_id: "", grupo: "" }); setErrorAsigMat("");
        setEditandoId("grupo_mat"); setTab("matriculas"); setPanel(true); setError("");
    }

    const agregarAsigMat = () => {
        if (!nuevaAsigMat.asignatura_id || !nuevaAsigMat.grupo) { setErrorAsigMat("Selecciona asignatura y grupo."); return; }
        if (asigsMat.some(a => a.asignatura_id === nuevaAsigMat.asignatura_id)) { setErrorAsigMat("Esta asignatura ya fue agregada."); return; }
        const asig = asignaturas.find(a => a.id === nuevaAsigMat.asignatura_id);
        setAsigsMat([...asigsMat, { asignatura_id: nuevaAsigMat.asignatura_id, asignatura: asig?.nombre ?? "", grupo: nuevaAsigMat.grupo }]);
        setNuevaAsigMat({ asignatura_id: "", grupo: "" }); setErrorAsigMat("");
        setError("");
    };

    const quitarAsigMat = (i: number) => {
        const a = asigsMat[i];
        if (a.id) setAsigMatAEliminar([...asigMatAEliminar, a.id]);
        setAsigsMat(asigsMat.filter((_, j) => j !== i));
        setError("");
    };

    function quitarSesion(i: number) {
        const s = sesiones[i];
        if (s.id) setSesionesAEliminar([...sesionesAEliminar, s.id]);
        setSesiones(sesiones.filter((_, j) => j !== i));
    }

    const agregarSesion = () => {
        if (!nuevaSesion.hora_inicio || !nuevaSesion.hora_fin || !nuevaSesion.aula) {
            setErrorSesion("Completa todos los campos de la sesión."); return;
        }
        if (nuevaSesion.hora_inicio >= nuevaSesion.hora_fin) {
            setErrorSesion("La hora de inicio debe ser menor a la de fin."); return;
        }

        const diasUsados = new Set([...sesiones, nuevaSesion].map(s => s.dia_semana));
        const primerDiaLibre = DIAS.find(d => !diasUsados.has(d.val))?.val ?? "lunes";
        setSesiones([...sesiones, nuevaSesion]);
        setNuevaSesion({ ...SESION_VACIA, grupo: fHorario.grupo, dia_semana: primerDiaLibre });
        setErrorSesion("");
    };

    const borrar = async (tipo: string, id: string, callback: () => Promise<any>) => {
        if (!confirm(`¿Estás seguro de eliminar este ${tipo}?`)) return;
        try { await callback(); } catch (e: any) { alert(e.message); }
    };

    const guardar = async (e: React.FormEvent, forceUpdate: boolean = false) => {
        if (e && e.preventDefault) e.preventDefault();
        setLoading(true); setError("");
        try {
            switch (tab) {
                case "facultades":
                    if (!editandoId) {
                        const existCod = facultades.find(f => f.codigo === fFacultad.codigo);
                        const existNom = facultades.find(f => f.nombre === fFacultad.nombre);
                        if (existCod && existNom) throw new Error("Esta facultad ya existe.");
                        if (existCod) throw new Error("Ya hay una facultad con este código.");
                    }
                    editandoId ? await actualizarFacultad(editandoId, fFacultad) : await crearFacultad(fFacultad);
                    setFacultades(await listarFacultades()); break;
                case "programas":
                    if (!editandoId) {
                        const existCod = programas.find(p => p.codigo === fPrograma.codigo);
                        const existNom = programas.find(p => p.nombre === fPrograma.nombre);
                        if (existCod && existNom) throw new Error("Este programa ya existe.");
                        if (existCod) throw new Error("Ya hay un programa con este código.");
                    }
                    editandoId ? await actualizarPrograma(editandoId, fPrograma) : await crearPrograma(fPrograma);
                    setProgramas(await listarProgramas()); break;
                case "asignaturas":
                    if (!editandoId) {
                        const existCod = asignaturas.find(a => a.codigo === fAsig.codigo);
                        const existNom = asignaturas.find(a => a.nombre === fAsig.nombre);
                        if (existCod && existNom) throw new Error("Esta asignatura ya existe.");
                        if (existCod) throw new Error("Ya hay una asignatura con este código.");
                    }
                    editandoId ? await actualizarAsignatura(editandoId, { ...fAsig, facultad_id: fAsig.facultad_id || "" }) : await crearAsignatura({ ...fAsig, facultad_id: fAsig.facultad_id || "" });
                    setAsignaturas(await listarAsignaturas()); break;
                case "horarios":
                    if (!editandoId) {
                        const existe = horarios.find(h => h.asignatura_id === fHorario.asignatura_id && h.grupo === fHorario.grupo);
                        if (existe) throw new Error("Este grupo ya existe y tiene un horario asignado. Use la opción de editar.");
                    }
                    if (editandoId) {
                        try {
                            await Promise.all([
                                ...sesiones.filter(s => s.id).map(s => actualizarHorario(s.id!, { ...s, asignatura_id: fHorario.asignatura_id, docente_id: fHorario.docente_id, grupo: fHorario.grupo, cupo_maximo: fHorario.cupo_maximo }, forceUpdate)),
                                ...sesiones.filter(s => !s.id).map(s => crearHorario({ ...s, asignatura_id: fHorario.asignatura_id, docente_id: fHorario.docente_id, grupo: fHorario.grupo, cupo_maximo: fHorario.cupo_maximo })),
                                ...sesionesAEliminar.map(id => eliminarHorario(id))
                            ]);
                        } catch (err: any) {
                            if (err.response?.status === 409 && err.response?.data?.detail?.tipo === "cruce_estudiantes") {
                                setConflictingStudents(err.response.data.detail.estudiantes);
                                // Guardar el día del horario que causó el cruce (del primer update que falló)
                                const diaConflicto = sesiones.find(s => s.id)?.dia_semana ?? "";
                                setConflictDia(diaConflicto ? (DIA_LABEL[diaConflicto] ?? diaConflicto) : "");
                                return;
                            }
                            throw err;
                        }
                    } else {
                        if (sesiones.length === 0) throw new Error("Agrega al menos una sesión.");
                        await Promise.all(sesiones.map(s => crearHorario({ ...s, asignatura_id: fHorario.asignatura_id, docente_id: fHorario.docente_id, grupo: fHorario.grupo, cupo_maximo: fHorario.cupo_maximo })));
                    }
                    setHorarios(await listarHorarios()); break;
                case "matriculas":
                    if (editandoId) {
                        // 1. Ejecutar primero las eliminaciones de matrícula de manera secuencial/paralela aislada
                        if (asigMatAEliminar.length > 0) {
                            await Promise.all(asigMatAEliminar.map(id => eliminarMatricula(id)));
                        }
                        
                        // 2. Posteriormente, crear y actualizar las matrículas restantes
                        await Promise.all([
                            ...asigsMat.filter(a => !a.id).map(a => crearMatricula({ usuario_id: editMatStudent.id, programa_id: editMatStudent.programa_id, asignatura_id: a.asignatura_id, grupo: a.grupo, semestre: fMat.semestre, fecha_inicio: fMat.fecha_inicio, estado: (a as any).estado || "activa" })),
                            ...asigsMat.filter(a => a.id).map(a => actualizarMatricula(a.id!, { grupo: a.grupo, estado: (a as any).estado || "activa", semestre: fMat.semestre }))
                        ]);
                    } else {
                        if (!fMat.usuario_id || !fMat.programa_id || asigsMat.length === 0)
                            throw new Error("Selecciona estudiante, programa y al menos una asignatura.");
                        await Promise.all(asigsMat.map(a => crearMatricula({ usuario_id: fMat.usuario_id, programa_id: fMat.programa_id, asignatura_id: a.asignatura_id, grupo: a.grupo, semestre: fMat.semestre, fecha_inicio: fMat.fecha_inicio, estado: (a as any).estado || "activa" })));
                    }
                    setMatriculas(await listarMatriculas());
                    break;
                case "semestres":
                    if (!editandoId) {
                        const existNom = semestres.find(s => s.nombre === fSemestre.nombre);
                        if (existNom) throw new Error("Ya existe un semestre con este nombre.");
                    }
                    // Validar fechas (Lunes a Sábado)
                    const ini = new Date(fSemestre.fecha_inicio);
                    const fin = new Date(fSemestre.fecha_fin);
                    if (ini.getUTCDay() !== 1) throw new Error("La fecha de inicio debe ser un Lunes.");
                    if (fin.getUTCDay() !== 6) throw new Error("La fecha de fin debe ser un Sábado.");
                    if (ini >= fin) throw new Error("La fecha de inicio debe ser menor a la de fin.");

                    if (fSemestre.estado === "actual") {
                        const actualExistente = semestres.find(s => s.activo && s.id !== editandoId);
                        if (actualExistente) {
                            const confirmar = window.confirm(`El semestre "${actualExistente.nombre}" ya está marcado como "Actual". Si continúas, cambiará automáticamente a "Terminado". ¿Deseas continuar?`);
                            if (!confirmar) return;
                        }
                    }

                    editandoId ? await actualizarSemestre(editandoId, fSemestre) : await crearSemestre(fSemestre);
                    setSemestres(await listarSemestres());
                    break;
            }
            setPanel(false); resetForm();
        } catch (e: any) { setError(e.response?.data?.detail || e.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black" style={{ color: "#1A1A2E" }}>Configuración Académica</h1>
                    <p className="text-gray-400 text-sm font-medium">Gestiona la estructura básica de la institución</p>
                </div>
                <button onClick={() => { resetForm(); setPanel(true); }} className="px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-lg shadow-sara-gold/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2" style={{ background: "linear-gradient(135deg, #0e5d75, #0a475a)" }}>
                    <Plus size={18} /> {TAB_ACTIONS[tab].btn}
                </button>
            </div>

            <div className="flex gap-2 p-1.5 bg-gray-100/50 rounded-2xl w-fit flex-wrap">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); setPanel(false); resetForm(); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? "bg-white text-sara-red shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm">
                {tab === "facultades" && (
                    facultades.length === 0 ? <div className="py-16 text-center text-gray-400 text-sm">No hay facultades registradas.</div> :
                        <table className="w-full">
                            <thead><tr className="bg-gray-50 font-sans">
                                <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Nombre</th>
                                <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Código</th>
                                <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Acciones</th>
                            </tr></thead>
                            <tbody className="divide-y divide-gray-50 font-sans">
                                {facultades.map(f => (
                                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-sm w-1/2" style={{ color: "#1A1A2E" }}>{f.nombre}</td>
                                        <td className="px-5 py-4 text-sm font-mono text-gray-500 w-28 text-center">{f.codigo}</td>
                                        <td className="px-5 py-4 w-24 text-center">
                                            <div className="flex gap-1 justify-center">
                                                <button onClick={() => editarFacultad(f)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                                                <button onClick={() => borrar("facultad", f.id, async () => { await eliminarFacultad(f.id); setFacultades(await listarFacultades()); })} className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                )}

                {tab === "programas" && (() => {
                    return (
                        <div>
                            <div className="p-4 border-b border-gray-50 space-y-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Facultad..." value={filtProgFac}
                                                onChange={e => { setFiltProgFac(e.target.value); setProgFacShowAll(false); setShowProgFacSugg(true); }}
                                                onFocus={() => setShowProgFacSugg(true)}
                                                onBlur={() => setTimeout(() => setShowProgFacSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtProgFac && <button type="button" onClick={() => { setFiltProgFac(""); setProgFacShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showProgFacSugg && progFacSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {progFacSugg.map(f => <button key={f.id} type="button" onMouseDown={() => { setFiltProgFac(f.nombre); setProgFacShowAll(false); setShowProgFacSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{f.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input type="text" placeholder="Código..." value={filtProgCod}
                                            onChange={e => setFiltProgCod(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                        {filtProgCod && <button type="button" onClick={() => setFiltProgCod("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                    </div>
                                </div>
                                {(filtProgFac || filtProgCod) && (
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => { setFiltProgFac(""); setFiltProgCod(""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-sara-red hover:bg-red-50 transition-colors border border-gray-200">
                                            <X size={12} /> Limpiar filtros
                                        </button>
                                    </div>
                                )}
                            </div>
                            {programasFiltrados.length === 0 ? <div className="py-16 text-center text-gray-400 text-sm">No hay programas registrados.</div> :
                                <table className="w-full">
                                    <thead><tr className="bg-gray-50 font-sans">
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Programa</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Código</th>
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider pl-8 font-sans">Facultad</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Acciones</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-50 font-sans">
                                        {programasFiltrados.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-4 font-semibold text-sm" style={{ color: "#1A1A2E" }}>{p.nombre}</td>
                                                <td className="px-5 py-4 text-sm font-mono text-gray-500 text-center">{p.codigo}</td>
                                                <td className="px-5 py-4 text-sm text-gray-600 pl-8">{p.facultad}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex gap-1 justify-center">
                                                        <button onClick={() => editarPrograma(p)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                                                        <button onClick={() => borrar("programa", p.id, async () => { await eliminarPrograma(p.id); setProgramas(await listarProgramas()); })} className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>}
                        </div>
                    );
                })()}

                {tab === "asignaturas" && (() => {
                    return (
                        <div>
                            <div className="p-4 border-b border-gray-50 space-y-2">
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Facultad..." value={filtAsigFac}
                                                onChange={e => { setFiltAsigFac(e.target.value); setAsigFacShowAll(false); setShowAsigFacSugg(true); }}
                                                onFocus={() => setShowAsigFacSugg(true)}
                                                onBlur={() => setTimeout(() => setShowAsigFacSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtAsigFac && <button type="button" onClick={() => { setFiltAsigFac(""); setAsigFacShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showAsigFacSugg && asigFacSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {asigFacSugg.map(f => <button key={f.id} type="button" onMouseDown={() => { setFiltAsigFac(f.nombre); setAsigFacShowAll(false); setShowAsigFacSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{f.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Programa..." value={filtAsigProg}
                                                onChange={e => { setFiltAsigProg(e.target.value); setAsigProgShowAll(false); setShowAsigProgSugg(true); }}
                                                onFocus={() => setShowAsigProgSugg(true)}
                                                onBlur={() => setTimeout(() => setShowAsigProgSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtAsigProg && <button type="button" onClick={() => { setFiltAsigProg(""); setAsigProgShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showAsigProgSugg && asigProgSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {asigProgSugg.map(p => <button key={p.id} type="button" onMouseDown={() => { setFiltAsigProg(p.nombre); setAsigProgShowAll(false); setShowAsigProgSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{p.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input type="text" placeholder="Código..." value={filtAsigCod}
                                            onChange={e => setFiltAsigCod(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                        {filtAsigCod && <button type="button" onClick={() => setFiltAsigCod("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                    </div>
                                    <input type="number" placeholder="Créditos..." value={filtAsigCred}
                                        onChange={e => setFiltAsigCred(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all" />
                                </div>
                                {(filtAsigFac || filtAsigProg || filtAsigCod || filtAsigCred) && (
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => { setFiltAsigFac(""); setFiltAsigProg(""); setFiltAsigCod(""); setFiltAsigCred(""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-sara-red hover:bg-red-50 transition-colors border border-gray-200">
                                            <X size={12} /> Limpiar filtros
                                        </button>
                                    </div>
                                )}
                            </div>
                            {asignaturasFiltradas.length === 0 ? <div className="py-16 text-center text-gray-400 text-sm">No hay asignaturas registradas.</div> :
                                <table className="w-full">
                                    <thead><tr className="bg-gray-50 font-sans">
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Asignatura</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Código</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Créditos</th>
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Facultad</th>
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Programa</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Acciones</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-50 font-sans">
                                        {asignaturasFiltradas.map(a => (
                                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-4 font-semibold text-sm" style={{ color: "#1A1A2E" }}>{a.nombre}</td>
                                                <td className="px-5 py-4 text-sm font-mono text-gray-500 text-center">{a.codigo}</td>
                                                <td className="px-5 py-4 text-sm text-center font-bold text-gray-700">{a.creditos}</td>
                                                <td className="px-5 py-4 text-sm text-gray-500">{a.facultad}</td>
                                                <td className="px-5 py-4 text-sm text-gray-600">{a.programa}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <div className="flex gap-1 justify-center">
                                                        <button onClick={() => editarAsignatura(a)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                                                        <button onClick={() => borrar("asignatura", a.id, async () => { await eliminarAsignatura(a.id); setAsignaturas(await listarAsignaturas()); })} className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>}
                        </div>
                    );
                })()}

                {tab === "horarios" && (() => {
                    const grupos = new Map<string, GrupoHor>();
                    for (const h of horarios) {
                        const key = `${h.asignatura_id}__${h.docente_id}__${h.grupo}`;
                        if (!grupos.has(key)) grupos.set(key, {
                            asignatura: h.asignatura,
                            asignatura_id: h.asignatura_id,
                            docente: h.docente,
                            apellido: h.apellido_docente,
                            docente_id: h.docente_id,
                            sesiones: [],
                            grupo: h.grupo,
                            cupo_maximo: h.cupo_maximo,
                            matriculados: h.matriculados,
                            facultad: h.facultad,
                            programa: h.programa
                        });
                        grupos.get(key)!.sesiones.push(h);
                    }

                    const lista = Array.from(grupos.values()).filter(g => {
                        const matchFac = !filtHorFac || normalizar(g.facultad || "").includes(normalizar(filtHorFac));
                        const matchProg = !filtHorProg || normalizar(g.programa || "").includes(normalizar(filtHorProg));
                        const matchDoc = !filtHorDoc || normalizar(`${g.docente} ${g.apellido}`).includes(normalizar(filtHorDoc));
                        const matchAsig = !filtHorAsig || normalizar(g.asignatura || "").includes(normalizar(filtHorAsig));
                        const matchCupo = !filtHorCupo || (filtHorCupo === "lleno" ? (g.matriculados ?? 0) >= (g.cupo_maximo ?? 0) : (g.matriculados ?? 0) < (g.cupo_maximo ?? 0));

                        let matchHours = true;
                        if (filtHorIni && filtHorFin) {
                            matchHours = g.sesiones.some(s => (s.hora_inicio?.slice(0, 5) || "") === filtHorIni && (s.hora_fin?.slice(0, 5) || "") === filtHorFin);
                        } else if (filtHorIni) {
                            matchHours = g.sesiones.some(s => (s.hora_inicio?.slice(0, 5) || "") === filtHorIni);
                        } else if (filtHorFin) {
                            matchHours = g.sesiones.some(s => (s.hora_fin?.slice(0, 5) || "") === filtHorFin);
                        }

                        const matchAula = !filtHorAula || g.sesiones.some(s => normalizar(s.aula || "").includes(normalizar(filtHorAula)));

                        return matchFac && matchProg && matchDoc && matchAsig && matchCupo && matchHours && matchAula;
                    }).map(g => ({ ...g, sesiones: [...g.sesiones].sort((a, b) => (DIA_ORDER[a.dia_semana] ?? 6) - (DIA_ORDER[b.dia_semana] ?? 6)) }));
                    return (
                        <div className="max-w-7xl mx-auto w-full px-4">
                            <div className="p-4 border-b border-gray-50 space-y-2">
                                <div className="grid grid-cols-7 gap-3">
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Facultad..." value={filtHorFac}
                                                onChange={e => { setFiltHorFac(e.target.value); setHorFacShowAll(false); setShowHorFacSugg(true); }}
                                                onFocus={() => setShowHorFacSugg(true)}
                                                onBlur={() => setTimeout(() => setShowHorFacSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtHorFac && <button type="button" onClick={() => { setFiltHorFac(""); setHorFacShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showHorFacSugg && horFacSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {horFacSugg.map(f => <button key={f.id} type="button" onMouseDown={() => { setFiltHorFac(f.nombre); setHorFacShowAll(false); setShowHorFacSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{f.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Programa..." value={filtHorProg}
                                                onChange={e => { setFiltHorProg(e.target.value); setHorProgShowAll(false); setShowHorProgSugg(true); }}
                                                onFocus={() => setShowHorProgSugg(true)}
                                                onBlur={() => setTimeout(() => setShowHorProgSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtHorProg && <button type="button" onClick={() => { setFiltHorProg(""); setHorProgShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showHorProgSugg && horProgSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {horProgSugg.map(p => <button key={p.id} type="button" onMouseDown={() => { setFiltHorProg(p.nombre); setHorProgShowAll(false); setShowHorProgSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{p.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Docente..." value={filtHorDoc}
                                                onChange={e => { setFiltHorDoc(e.target.value); setHorDocShowAll(false); setShowHorDocSugg(true); }}
                                                onFocus={() => setShowHorDocSugg(true)}
                                                onBlur={() => setTimeout(() => setShowHorDocSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtHorDoc && <button type="button" onClick={() => { setFiltHorDoc(""); setHorDocShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showHorDocSugg && horDocSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {horDocSugg.map(d => <button key={d.id} type="button" onMouseDown={() => { setFiltHorDoc(d.nombre); setHorDocShowAll(false); setShowHorDocSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{d.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Asignatura..." value={filtHorAsig}
                                                onChange={e => { setFiltHorAsig(e.target.value); setHorAsigShowAll(false); setShowHorAsigSugg(true); }}
                                                onFocus={() => setShowHorAsigSugg(true)}
                                                onBlur={() => setTimeout(() => setShowHorAsigSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtHorAsig && <button type="button" onClick={() => { setFiltHorAsig(""); setHorAsigShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showHorAsigSugg && horAsigSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {horAsigSugg.map(a => <button key={a} type="button" onMouseDown={() => { setFiltHorAsig(a); setHorAsigShowAll(false); setShowHorAsigSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{a}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Cupo..." value={filtHorCupo === "disponible" ? "Disponible" : (filtHorCupo === "lleno" ? "Lleno" : "")}
                                                onChange={e => {
                                                    const val = e.target.value.toLowerCase();
                                                    if (val.includes("dis")) setFiltHorCupo("disponible");
                                                    else if (val.includes("lle")) setFiltHorCupo("lleno");
                                                    else if (val === "") setFiltHorCupo("");
                                                    setShowHorCupoSugg(true);
                                                }}
                                                onFocus={() => setShowHorCupoSugg(true)}
                                                onBlur={() => setTimeout(() => setShowHorCupoSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtHorCupo && <button type="button" onClick={() => { setFiltHorCupo(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showHorCupoSugg && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                <button type="button" onMouseDown={() => { setFiltHorCupo(""); setShowHorCupoSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">Cualquier Cupo</button>
                                                <button type="button" onMouseDown={() => { setFiltHorCupo("disponible"); setShowHorCupoSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">Disponible</button>
                                                <button type="button" onMouseDown={() => { setFiltHorCupo("lleno"); setShowHorCupoSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">Lleno</button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="relative flex-1">
                                            <div className="relative flex-1">
                                                <input type="text" placeholder="Inicio..." value={filtHorIni}
                                                    onChange={e => { setFiltHorIni(e.target.value); setShowHorIniSugg(true); }}
                                                    onFocus={() => setShowHorIniSugg(true)}
                                                    onBlur={() => setTimeout(() => setShowHorIniSugg(false), 200)}
                                                    className="w-full px-2 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                                {filtHorIni && <button type="button" onClick={() => { setFiltHorIni(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                            </div>
                                            {showHorIniSugg && (
                                                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                    <button type="button" onMouseDown={() => { setFiltHorIni(""); setShowHorIniSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">Inicio</button>
                                                    {Array.from({ length: 15 }, (_, i) => {
                                                        const h = (i + 6).toString().padStart(2, "0");
                                                        const hourVal = `${h}:00`;
                                                        if (filtHorFin) {
                                                            const finHour = parseInt(filtHorFin.split(":")[0]);
                                                            const curHour = i + 6;
                                                            if (curHour >= finHour || curHour < finHour - 4) return null;
                                                        }
                                                        if (filtHorIni && !hourVal.includes(filtHorIni)) return null;
                                                        return <button key={h} type="button" onMouseDown={() => { setFiltHorIni(hourVal); setShowHorIniSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{hourVal}</button>;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div className="relative flex-1">
                                            <div className="relative flex-1">
                                                <input type="text" placeholder="Fin..." value={filtHorFin}
                                                    onChange={e => { setFiltHorFin(e.target.value); setShowHorFinSugg(true); }}
                                                    onFocus={() => setShowHorFinSugg(true)}
                                                    onBlur={() => setTimeout(() => setShowHorFinSugg(false), 200)}
                                                    className="w-full px-2 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                                {filtHorFin && <button type="button" onClick={() => { setFiltHorFin(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                            </div>
                                            {showHorFinSugg && (
                                                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                    <button type="button" onMouseDown={() => { setFiltHorFin(""); setShowHorFinSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">Fin</button>
                                                    {Array.from({ length: 15 }, (_, i) => {
                                                        const h = (i + 8).toString().padStart(2, "0");
                                                        const hourVal = `${h}:00`;
                                                        if (filtHorIni) {
                                                            const iniHour = parseInt(filtHorIni.split(":")[0]);
                                                            const curHour = i + 8;
                                                            if (curHour <= iniHour || curHour > iniHour + 4) return null;
                                                        }
                                                        if (filtHorFin && !hourVal.includes(filtHorFin)) return null;
                                                        return <button key={h} type="button" onMouseDown={() => { setFiltHorFin(hourVal); setShowHorFinSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{hourVal}</button>;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Aula..." value={filtHorAula}
                                                onChange={e => { setFiltHorAula(e.target.value); setHorAulaShowAll(false); setShowHorAulaSugg(true); }}
                                                onFocus={() => setShowHorAulaSugg(true)}
                                                onBlur={() => setTimeout(() => setShowHorAulaSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtHorAula && <button type="button" onClick={() => { setFiltHorAula(""); setHorAulaShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showHorAulaSugg && horAulaSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {horAulaSugg.map(a => <button key={a} type="button" onMouseDown={() => { setFiltHorAula(a); setHorAulaShowAll(false); setShowHorAulaSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{a}</button>)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {(filtHorFac || filtHorProg || filtHorDoc || filtHorAsig || filtHorCupo || filtHorIni || filtHorFin || filtHorAula) && (
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => { setFiltHorFac(""); setFiltHorProg(""); setFiltHorDoc(""); setFiltHorAsig(""); setFiltHorCupo(""); setFiltHorIni(""); setFiltHorFin(""); setFiltHorAula(""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-sara-red hover:bg-red-50 transition-colors border border-gray-200">
                                            <X size={12} /> Limpiar filtros
                                        </button>
                                    </div>
                                )}
                            </div>
                            {lista.length === 0
                                ? <div className="py-16 text-center text-gray-400 text-sm">No hay horarios registrados.</div>
                                : <table className="w-full min-w-[1000px]">
                                    <thead><tr className="bg-gray-50 font-sans">
                                        <th className="pl-5 pr-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans w-[200px]">Facultad</th>
                                        <th className="pl-2 pr-1 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Programa</th>
                                        <th className="pl-1 pr-2 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans w-[180px]">Asignatura</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Grupo</th>
                                        <th className="px-2 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans w-[150px]">Docente</th>
                                        <th className="px-2 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Cupo</th>
                                        <th className="px-2 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Días</th>
                                        <th className="px-2 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Inicio</th>
                                        <th className="px-2 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Fin</th>
                                        <th className="px-2 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Aula</th>
                                        <th className="pr-5 pl-0 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Acciones</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-50 font-sans">
                                        {lista.map((g, i) => {
                                            const key = `${g.asignatura_id}__${g.docente_id}__${g.grupo}`;
                                            return (
                                                <tr key={i} className="hover:bg-gray-50 transition-colors align-top">
                                                    <td className="pl-5 pr-5 py-4 text-sm text-gray-500 max-w-[200px]">{g.facultad}</td>
                                                    <td className="pl-2 pr-1 py-4 text-sm text-gray-600">{g.programa}</td>
                                                    <td className="pl-1 pr-2 py-4 font-semibold text-sm max-w-[180px]" style={{ color: "#1A1A2E" }}>{g.asignatura}</td>
                                                    <td className="px-5 py-4 text-sm font-bold text-red-700 text-center">{g.grupo}</td>
                                                    <td className="px-2 py-4 text-sm text-gray-600 max-w-[150px]">{g.docente} {g.apellido}</td>
                                                    <td className="px-2 py-4 text-center">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className={`text-sm font-black ${g.matriculados >= g.cupo_maximo ? "text-red-600" : "text-green-600"}`}>{g.matriculados}/{g.cupo_maximo}</span>
                                                            {g.matriculados >= g.cupo_maximo && <span className="text-[10px] font-bold text-red-400 whitespace-nowrap">CUPO LLENO</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-4 text-center"><div className="flex flex-col items-center">
                                                        {g.sesiones.map(s => <div key={s.id} className="h-8 flex items-center"><span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-50 text-purple-700 whitespace-nowrap">{DIA_LABEL[s.dia_semana] ?? s.dia_semana}</span></div>)}
                                                    </div></td>
                                                    <td className="px-2 py-4 text-center"><div className="flex flex-col items-center">
                                                        {g.sesiones.map(s => <div key={s.id} className="h-8 flex items-center"><span className="text-sm text-gray-600 font-medium whitespace-nowrap">{formatHora(s.hora_inicio)}</span></div>)}
                                                    </div></td>
                                                    <td className="px-2 py-4 text-center"><div className="flex flex-col items-center">
                                                        {g.sesiones.map(s => <div key={s.id} className="h-8 flex items-center"><span className="text-sm text-gray-600 font-medium whitespace-nowrap">{formatHora(s.hora_fin)}</span></div>)}
                                                    </div></td>
                                                    <td className="px-2 py-4 text-center"><div className="flex flex-col items-center">
                                                        {g.sesiones.map(s => <div key={s.id} className="h-8 flex items-center"><span className="text-sm text-gray-600 font-medium whitespace-nowrap">{s.aula}</span></div>)}
                                                    </div></td>
                                                    <td className="pr-5 pl-0 py-4 text-center">
                                                        {confirmingDeleteGrupo !== key ? (
                                                            <div className="flex gap-1 justify-center items-center">
                                                                <button onClick={() => editarGrupo(g)} className="p-2 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors"><Pencil size={14} /></button>
                                                                <button onClick={() => setConfirmingDeleteGrupo(key)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1.5 p-1.5 bg-amber-50 border border-amber-100 rounded-xl animate-pulse">
                                                                <span className="text-[9px] font-extrabold text-amber-900 text-center leading-normal max-w-[120px]">
                                                                    ¿Borrar clase? Se eliminarán también las sesiones y asistencias asociadas.
                                                                </span>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await Promise.all(g.sesiones.map(s => eliminarHorario(s.id)));
                                                                                setHorarios(await listarHorarios());
                                                                            } catch (err: any) {
                                                                                alert(err.message);
                                                                            } finally {
                                                                                setConfirmingDeleteGrupo(null);
                                                                            }
                                                                        }}
                                                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-bold transition-all"
                                                                    >
                                                                        Sí
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfirmingDeleteGrupo(null)}
                                                                        className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-[10px] font-bold transition-all"
                                                                    >
                                                                        No
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>}
                        </div>
                    );
                })()}

                {tab === "matriculas" && (() => {
                    const gruposMat = new Map<string, GrupoMat>();
                    for (const m of matriculasFiltradas) {
                        const key = `${m.num_doc}__${m.programa}`;
                        if (!gruposMat.has(key)) gruposMat.set(key, { num_doc: m.num_doc, estudiante: m.estudiante, apellido_estudiante: m.apellido_estudiante, facultad: m.facultad, programa: m.programa, semestre: m.semestre, items: [] });
                        gruposMat.get(key)!.items.push(m);
                    }
                    const listaGrupos = Array.from(gruposMat.values())
                        .filter(g => !filtTabAsig || g.items.some(m => normalizar(m.asignatura).includes(normalizar(filtTabAsig))));
                    const estadoColor = (e: string) => e === "activa" ? "bg-green-50 text-green-700" : e === "cancelada" ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600";
                    return (
                        <div>
                            {/*Barra de búsqueda de matrículas por esta de 4 secciones */}
                            <div className="p-4 border-b border-gray-50 space-y-2">
                                <div className="grid grid-cols-4 gap-3">
                                    {/* Estudiante */}
                                    <div className="relative">
                                        <input type="text" placeholder="Estudiante o documento..." value={filtTabEst}
                                            onChange={e => setFiltTabEst(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                        {filtTabEst && <button type="button" onClick={() => setFiltTabEst("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                    </div>
                                    {/* Facultad */}
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Facultad..." value={filtTabFac}
                                                onChange={e => { setFiltTabFac(e.target.value); setTabFacShowAll(false); setShowTabFacSugg(true); }}
                                                onFocus={() => setShowTabFacSugg(true)}
                                                onBlur={() => setTimeout(() => setShowTabFacSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtTabFac && <button type="button" onClick={() => { setFiltTabFac(""); setTabFacShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showTabFacSugg && tabFacSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {tabFacSugg.map(f => <button key={f.id} type="button" onMouseDown={() => { setFiltTabFac(f.nombre); setTabFacShowAll(false); setShowTabFacSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{f.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    {/* Programa */}
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Programa..." value={filtTabProg}
                                                onChange={e => { setFiltTabProg(e.target.value); setTabProgShowAll(false); setShowTabProgSugg(true); }}
                                                onFocus={() => setShowTabProgSugg(true)}
                                                onBlur={() => setTimeout(() => setShowTabProgSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtTabProg && <button type="button" onClick={() => { setFiltTabProg(""); setTabProgShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showTabProgSugg && tabProgSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {tabProgSugg.map(p => <button key={p.id} type="button" onMouseDown={() => { setFiltTabProg(p.nombre); setTabProgShowAll(false); setShowTabProgSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{p.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    {/* Asignatura */}
                                    <div className="relative">
                                        <div className="relative flex-1">
                                            <input type="text" placeholder="Asignatura..." value={filtTabAsig}
                                                onChange={e => { setFiltTabAsig(e.target.value); setTabAsigShowAll(false); setShowTabAsigSugg(true); }}
                                                onFocus={() => setShowTabAsigSugg(true)}
                                                onBlur={() => setTimeout(() => setShowTabAsigSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {filtTabAsig && <button type="button" onClick={() => { setFiltTabAsig(""); setTabAsigShowAll(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        </div>
                                        {showTabAsigSugg && tabAsigSugg.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {tabAsigSugg.map(a => <button key={a.id} type="button" onMouseDown={() => { setFiltTabAsig(a.nombre); setTabAsigShowAll(false); setShowTabAsigSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{a.nombre}</button>)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Botón de resetear filtros */}
                                {(filtTabEst || filtTabFac || filtTabProg || filtTabAsig) && (
                                    <div className="flex justify-end">
                                        <button type="button" onClick={() => { setFiltTabEst(""); setFiltTabFac(""); setFiltTabProg(""); setFiltTabAsig(""); setTabFacShowAll(false); setTabProgShowAll(false); setTabAsigShowAll(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:text-sara-red hover:bg-red-50 transition-colors border border-gray-200">
                                            <X size={12} /> Limpiar filtros
                                        </button>
                                    </div>
                                )}
                            </div>

                            {listaGrupos.length === 0
                                ? <div className="py-16 text-center text-gray-400 text-sm">No hay matrículas registradas.</div>
                                : <table className="w-full">
                                    <thead><tr className="bg-gray-50 font-sans">
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Estudiante</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Documento</th>
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Facultad</th>
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Programa</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Sem.</th>
                                        <th className="px-5 py-3 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Asignatura</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Grupo</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Estado</th>
                                        <th className="px-5 py-3 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Acciones</th>
                                    </tr></thead>
                                    <tbody className="divide-y divide-gray-50 font-sans">
                                        {listaGrupos.map((g, i) => {
                                            const sorted = [...g.items].sort((a, b) => a.asignatura.localeCompare(b.asignatura));
                                            return (
                                                <tr key={i} className="hover:bg-gray-50 transition-colors align-top">
                                                    <td className="px-5 py-4 font-semibold text-sm" style={{ color: "#1A1A2E" }}>{g.estudiante} {g.apellido_estudiante}</td>
                                                    <td className="px-5 py-4 text-sm font-mono text-gray-500 text-center">{g.num_doc}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-500">{g.facultad}</td>
                                                    <td className="px-2 py-4 text-sm text-gray-600">{g.programa}</td>
                                                    <td className="px-5 py-4 text-sm text-center font-bold text-gray-700">{g.semestre}</td>
                                                    <td className="px-5 py-4"><div className="flex flex-col gap-2">
                                                        {sorted.map(m => (
                                                            <div key={m.id} className="min-h-8 flex items-center gap-2 relative">
                                                                <span className="text-sm text-gray-700">{m.asignatura}</span>
                                                            </div>
                                                        ))}
                                                    </div></td>
                                                    <td className="px-5 py-4"><div className="flex flex-col gap-2">
                                                        {sorted.map(m => <div key={m.id} className="min-h-8 flex items-center justify-center"><span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-50 text-purple-700">{m.grupo}</span></div>)}
                                                    </div></td>
                                                    <td className="px-5 py-4"><div className="flex flex-col gap-2">
                                                        {sorted.map(m => <div key={m.id} className="min-h-8 flex items-center justify-center"><span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${estadoColor(m.estado)}`}>{m.estado.charAt(0).toUpperCase() + m.estado.slice(1)}</span></div>)}
                                                    </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            {sorted.map((m, mi) => (
                                                                <div key={m.id} className="h-8 flex items-center gap-1">
                                                                    {mi === 0 && <div className="flex gap-1 justify-center items-center">
                                                                        <button 
                                                                            onClick={() => {
                                                                                const est = estudiantes.find(e => e.num_doc === g.num_doc);
                                                                                if (est) {
                                                                                    openHorarioModal(est);
                                                                                } else {
                                                                                    openHorarioModal({
                                                                                        id: "",
                                                                                        nombres: g.estudiante,
                                                                                        apellidos: g.apellido_estudiante,
                                                                                        num_doc: g.num_doc,
                                                                                        rol: "Estudiante"
                                                                                    });
                                                                                }
                                                                            }} 
                                                                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                                                                            title="Ver Horario Semanal Completo"
                                                                        >
                                                                            <Calendar size={13} />
                                                                        </button>
                                                                        <button onClick={() => editarGrupoMat(g)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors"><Pencil size={13} /></button>
                                                                        <button onClick={() => { if (!confirm(`¿Eliminar todas las matrículas de ${g.estudiante} en ${g.programa}?`)) return; Promise.all(g.items.map(x => eliminarMatricula(x.id))).then(() => listarMatriculas().then(setMatriculas)); }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                                                                    </div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            }
                        </div>
                    );
                })()}

                {tab === "semestres" && (() => {
                    const activosOPendientes = semestres.filter(s => s.estado === "actual" || s.estado === "pendiente" || (!s.estado && s.activo));
                    const terminados = semestres.filter(s => s.estado === "terminado" || (!s.estado && !s.activo));

                    return (
                        <div className="p-6 space-y-6 font-sans">
                            {/* Nota de protección de datos */}
                            <div className="p-3.5 bg-amber-50/50 border border-amber-100/70 rounded-xl text-[11px] text-amber-950 leading-relaxed">
                                <span className="font-black block uppercase mb-0.5 text-amber-900">⚠️ Nota de integridad de datos</span>
                                Al cambiar la fecha del semestre, los registros existentes fuera del nuevo rango de fechas no se eliminarán de la base de datos, pero se ocultarán y se excluirán automáticamente de los cálculos de inasistencia, reportes y tableros en todo el sistema.
                            </div>

                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Semestres Activos y Pendientes</h3>
                                {activosOPendientes.length === 0 ? (
                                    <div className="p-8 border border-dashed border-gray-200 rounded-2xl text-center space-y-3 bg-gray-50/50">
                                        <CalendarDays className="mx-auto text-gray-300 animate-pulse" size={36} />
                                        <div>
                                            <h3 className="font-bold text-gray-700">No hay semestres activos o pendientes</h3>
                                            <p className="text-xs text-gray-400 mt-1">Puedes agregar un nuevo semestre usando el botón superior.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {activosOPendientes.map(s => {
                                            const esActual = s.estado === "actual" || s.activo;
                                            return (
                                                <div key={s.id} className={`p-5 rounded-2xl border transition-all ${esActual ? "border-green-100 bg-green-50/10 shadow-sm" : "border-gray-100 bg-white"}`}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <CalendarDays className={esActual ? "text-green-600 animate-pulse" : "text-gray-400"} size={18} />
                                                            <span className="font-bold text-sm text-gray-800">{s.nombre}</span>
                                                        </div>
                                                        {esActual ? (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-green-50 text-green-700 flex items-center gap-1 border border-green-100">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                                                                ACTUAL
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100">
                                                                PENDIENTE
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <div>
                                                            <span className="block text-[9px] font-black text-gray-400 uppercase">Inicio</span>
                                                            <span className="font-semibold text-gray-700">{s.fecha_inicio}</span>
                                                        </div>
                                                        <div className="border-l border-gray-100 h-6"></div>
                                                        <div>
                                                            <span className="block text-[9px] font-black text-gray-400 uppercase">Fin</span>
                                                            <span className="font-semibold text-gray-700">{s.fecha_fin}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => {
                                                                    setEditandoId(s.id);
                                                                    setFSemestre({
                                                                        nombre: s.nombre,
                                                                        fecha_inicio: s.fecha_inicio,
                                                                        fecha_fin: s.fecha_fin,
                                                                        activo: s.activo,
                                                                        estado: s.estado || (s.activo ? "actual" : "pendiente")
                                                                    });
                                                                    setPanel(true);
                                                                }}
                                                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-all"
                                                                title="Editar Semestre"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (!confirm(`¿Eliminar semestre "${s.nombre}"?`)) return;
                                                                    eliminarSemestre(s.id).then(() => listarSemestres().then(setSemestres));
                                                                }}
                                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                                                                title="Eliminar Semestre"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>

                                                        {!esActual && (
                                                            <button
                                                                onClick={async () => {
                                                                    const actualExistente = semestres.find(x => x.activo);
                                                                    if (actualExistente) {
                                                                        const confirmar = window.confirm(`El semestre "${actualExistente.nombre}" ya está marcado como "Actual". Si continúas, cambiará automáticamente a "Terminado". ¿Deseas continuar?`);
                                                                        if (!confirmar) return;
                                                                    }
                                                                    try {
                                                                        setLoading(true);
                                                                        await actualizarSemestre(s.id, {
                                                                            nombre: s.nombre,
                                                                            fecha_inicio: s.fecha_inicio,
                                                                            fecha_fin: s.fecha_fin,
                                                                            activo: true,
                                                                            estado: "actual"
                                                                        });
                                                                        setSemestres(await listarSemestres());
                                                                    } catch (err: any) {
                                                                        alert(err.response?.data?.detail || err.message);
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }}
                                                                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded-lg transition-all"
                                                            >
                                                                Marcar como Actual
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Historial de Semestres Terminados */}
                            <div className="pt-2">
                                <button
                                    onClick={() => setMostrarHistorial(!mostrarHistorial)}
                                    className="flex items-center gap-1.5 text-xs font-black text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider cursor-pointer"
                                >
                                    <ChevronDown size={14} className={`transform transition-transform ${mostrarHistorial ? "rotate-180" : ""}`} />
                                    {mostrarHistorial ? "Ocultar Historial" : `Ver Historial (${terminados.length} semestres terminados)`}
                                </button>

                                {mostrarHistorial && (
                                    <div className="mt-3 overflow-hidden border border-gray-100 rounded-2xl">
                                        {terminados.length === 0 ? (
                                            <div className="py-8 text-center text-xs text-gray-400 bg-gray-50/50">No hay semestres terminados registrados.</div>
                                        ) : (
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50/70 border-b border-gray-100">
                                                        <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Nombre</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Inicio</th>
                                                        <th className="px-5 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">Fin</th>
                                                        <th className="px-5 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Estado</th>
                                                        <th className="px-5 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 bg-white">
                                                    {terminados.map(s => (
                                                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-5 py-3 font-semibold text-xs text-gray-700">{s.nombre}</td>
                                                            <td className="px-5 py-3 text-xs text-gray-500 font-mono">{s.fecha_inicio}</td>
                                                            <td className="px-5 py-3 text-xs text-gray-500 font-mono">{s.fecha_fin}</td>
                                                            <td className="px-5 py-3 text-center">
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gray-100 text-gray-500 border border-gray-200">
                                                                    TERMINADO
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3 text-center">
                                                                <div className="flex gap-1.5 justify-center items-center">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditandoId(s.id);
                                                                            setFSemestre({
                                                                                nombre: s.nombre,
                                                                                fecha_inicio: s.fecha_inicio,
                                                                                fecha_fin: s.fecha_fin,
                                                                                activo: s.activo,
                                                                                estado: s.estado || "terminado"
                                                                            });
                                                                            setPanel(true);
                                                                        }}
                                                                        className="p-1 rounded text-blue-400 hover:bg-blue-50 transition-colors"
                                                                        title="Editar"
                                                                    >
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            if (!confirm(`¿Eliminar semestre "${s.nombre}"?`)) return;
                                                                            eliminarSemestre(s.id).then(() => listarSemestres().then(setSemestres));
                                                                        }}
                                                                        className="p-1 rounded text-red-400 hover:bg-red-50 transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

            </div>

            {panel && (
                <>
                    <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setPanel(false)} />
                    <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
                        <div className="p-6 border-b flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0e5d75, #0a475a)" }}>
                            <h3 className="text-white font-bold">{editandoId ? TAB_ACTIONS[tab].editTitle : TAB_ACTIONS[tab].title}</h3>
                            <button onClick={() => setPanel(false)} className="text-white/80 hover:text-white transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={guardar} className="flex-1 overflow-y-auto p-6 space-y-5">
                        {/* El bloque de error se ubica en el footer (ver más abajo) para garantizar visibilidad */}

                            {tab === "facultades" && <>
                                <div><label className={lbl}>Nombre</label><input type="text" className={inp} value={fFacultad.nombre} onChange={e => setFFacultad({ ...fFacultad, nombre: e.target.value })} required /></div>
                                <div><label className={lbl}>Código</label><input type="text" className={inp} value={fFacultad.codigo} onChange={e => setFFacultad({ ...fFacultad, codigo: e.target.value })} required /></div>
                            </>}

                            {tab === "programas" && <>
                                <div><label className={lbl}>Nombre</label><input type="text" className={inp} value={fPrograma.nombre} onChange={e => setFPrograma({ ...fPrograma, nombre: e.target.value })} required /></div>
                                <div><label className={lbl}>Código</label><input type="text" className={inp} value={fPrograma.codigo} onChange={e => setFPrograma({ ...fPrograma, codigo: e.target.value })} required /></div>
                                <div><label className={lbl}>Facultad</label>
                                    <div className="relative">
                                        <input type="text" placeholder="Selecciona Facultad..."
                                            value={formProgFacSearch || facultades.find(f => f.id === fPrograma.facultad_id)?.nombre || ""}
                                            onChange={e => { setFormProgFacSearch(e.target.value); setShowFormProgFacSugg(true); }}
                                            onFocus={() => setShowFormProgFacSugg(true)}
                                            onBlur={() => setTimeout(() => setShowFormProgFacSugg(false), 200)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                        {(formProgFacSearch || fPrograma.facultad_id) && <button type="button" onClick={() => { setFormProgFacSearch(""); setFPrograma({ ...fPrograma, facultad_id: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        {showFormProgFacSugg && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {facultades.filter(f => normalizar(f.nombre).includes(normalizar(formProgFacSearch))).map(f => (
                                                    <button key={f.id} type="button" onMouseDown={() => { setFPrograma({ ...fPrograma, facultad_id: f.id }); setFormProgFacSearch(f.nombre); setShowFormProgFacSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{f.nombre}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>}

                            {tab === "asignaturas" && <>
                                <div><label className={lbl}>Nombre</label><input type="text" className={inp} value={fAsig.nombre} onChange={e => setFAsig({ ...fAsig, nombre: e.target.value })} required /></div>
                                <div><label className={lbl}>Código</label><input type="text" className={inp} value={fAsig.codigo} onChange={e => setFAsig({ ...fAsig, codigo: e.target.value })} required /></div>
                                <div><label className={lbl}>Facultad</label>
                                    <div className="relative">
                                        <input type="text" placeholder="Selecciona Facultad..."
                                            value={formAsigFacSearch || facultades.find(f => f.id === fAsig.facultad_id)?.nombre || ""}
                                            onChange={e => { setFormAsigFacSearch(e.target.value); setShowFormAsigFacSugg(true); }}
                                            onFocus={() => setShowFormAsigFacSugg(true)}
                                            onBlur={() => setTimeout(() => setShowFormAsigFacSugg(false), 200)}
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                        {(formAsigFacSearch || fAsig.facultad_id) && <button type="button" onClick={() => { setFormAsigFacSearch(""); setFAsig({ ...fAsig, facultad_id: "", programa_id: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                        {showFormAsigFacSugg && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                {facultades.filter(f => normalizar(f.nombre).includes(normalizar(formAsigFacSearch))).map(f => (
                                                    <button key={f.id} type="button" onMouseDown={() => { setFAsig({ ...fAsig, facultad_id: f.id, programa_id: "" }); setFormAsigFacSearch(f.nombre); setShowFormAsigFacSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{f.nombre}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className={lbl}>Programa</label>
                                        <div className="relative">
                                            <input type="text" placeholder="Selecciona Programa..."
                                                value={formAsigProgSearch || programas.find(p => p.id === fAsig.programa_id)?.nombre || ""}
                                                onChange={e => { setFormAsigProgSearch(e.target.value); setShowFormAsigProgSugg(true); }}
                                                onFocus={() => setShowFormAsigProgSugg(true)}
                                                onBlur={() => setTimeout(() => setShowFormAsigProgSugg(false), 200)}
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                            {(formAsigProgSearch || fAsig.programa_id) && <button type="button" onClick={() => { setFormAsigProgSearch(""); setFAsig({ ...fAsig, programa_id: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                            {showFormAsigProgSugg && (
                                                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                    {programas.filter(p => (!fAsig.facultad_id || p.facultad_id === fAsig.facultad_id) && normalizar(p.nombre).includes(normalizar(formAsigProgSearch))).map(p => (
                                                        <button key={p.id} type="button" onMouseDown={() => { setFAsig({ ...fAsig, programa_id: p.id }); setFormAsigProgSearch(p.nombre); setShowFormAsigProgSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{p.nombre}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <label className={lbl}>Créditos</label>
                                        <input type="number" className={inp} value={fAsig.creditos} onChange={e => setFAsig({ ...fAsig, creditos: parseInt(e.target.value) || 0 })} required />
                                    </div>
                                </div>
                            </>}

                            {tab === "horarios" && (
                                <>
                                    {editandoId ? (
                                        <>
                                            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                                <p className={lbl}>Asignatura</p>
                                                <p className="text-sm font-semibold text-gray-800">{editandoGrupoNombre.asignatura}</p>
                                                <p className={lbl + " mt-2"}>Docente</p>
                                                <p className="text-sm font-semibold text-gray-800">{editandoGrupoNombre.docente}</p>
                                            </div>
                                            <div>
                                                <label className={lbl}>Grupo</label>
                                                <input className={inp} placeholder="Ej: A, B..." value={fHorario.grupo}
                                                    onChange={e => { const val = e.target.value.toUpperCase(); setFHorario({ ...fHorario, grupo: val }); setSesiones(sesiones.map(s => ({ ...s, grupo: val }))); setNuevaSesion({ ...nuevaSesion, grupo: val }); }}
                                                />
                                            </div>
                                            <div>
                                                <label className={lbl}>Cupo Máximo</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className={inp}
                                                    value={fHorario.cupo_maximo}
                                                    onChange={e => setFHorario({ ...fHorario, cupo_maximo: parseInt(e.target.value) || 30 })}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div><label className={lbl}>Filtrar por Facultad</label>
                                                <div className="relative">
                                                    <input type="text" placeholder="Selecciona Facultad..."
                                                        value={formHorFacSearch || filtroHorFacultad || ""}
                                                        onChange={e => { setFormHorFacSearch(e.target.value); setShowFormHorFacSugg(true); }}
                                                        onFocus={() => setShowFormHorFacSugg(true)}
                                                        onBlur={() => setTimeout(() => setShowFormHorFacSugg(false), 200)}
                                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                                    {(formHorFacSearch || filtroHorFacultad) && <button type="button" onClick={() => { setFormHorFacSearch(""); setFiltroHorFacultad(""); setFiltroHorPrograma(""); setFHorario({ ...fHorario, asignatura_id: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                                    {showFormHorFacSugg && (
                                                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                            <button type="button" onMouseDown={() => { setFiltroHorFacultad(""); setFiltroHorPrograma(""); setFHorario({ ...fHorario, asignatura_id: "" }); setFormHorFacSearch(""); setShowFormHorFacSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">— Todas —</button>
                                                            {facultades.filter(f => normalizar(f.nombre).includes(normalizar(formHorFacSearch))).map(f => (
                                                                <button key={f.id} type="button" onMouseDown={() => { setFiltroHorFacultad(f.nombre); setFiltroHorPrograma(""); setFHorario({ ...fHorario, asignatura_id: "" }); setFormHorFacSearch(f.nombre); setShowFormHorFacSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{f.nombre}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div><label className={lbl}>Filtrar por Programa</label>
                                                <div className="relative">
                                                    <input type="text" placeholder="Selecciona Programa..."
                                                        value={formHorProgSearch || filtroHorPrograma || ""}
                                                        onChange={e => { setFormHorProgSearch(e.target.value); setShowFormHorProgSugg(true); }}
                                                        onFocus={() => setShowFormHorProgSugg(true)}
                                                        onBlur={() => setTimeout(() => setShowFormHorProgSugg(false), 200)}
                                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                                    {(formHorProgSearch || filtroHorPrograma) && <button type="button" onClick={() => { setFormHorProgSearch(""); setFiltroHorPrograma(""); setFHorario({ ...fHorario, asignatura_id: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                                    {showFormHorProgSugg && (
                                                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                            <button type="button" onMouseDown={() => { setFiltroHorPrograma(""); setFHorario({ ...fHorario, asignatura_id: "" }); setFormHorProgSearch(""); setShowFormHorProgSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">— Todos —</button>
                                                            {progHor.filter(p => normalizar(p.nombre).includes(normalizar(formHorProgSearch))).map(p => (
                                                                <button key={p.id} type="button" onMouseDown={() => { setFiltroHorPrograma(p.nombre); setFHorario({ ...fHorario, asignatura_id: "" }); setFormHorProgSearch(p.nombre); setShowFormHorProgSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{p.nombre}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div><label className={lbl}>Asignatura</label>
                                                <div className="relative">
                                                    <input type="text" placeholder="Selecciona Asignatura..."
                                                        value={formHorAsigSearch || asignaturas.find(a => a.id === fHorario.asignatura_id)?.nombre || ""}
                                                        onChange={e => { setFormHorAsigSearch(e.target.value); setShowFormHorAsigSugg(true); }}
                                                        onFocus={() => setShowFormHorAsigSugg(true)}
                                                        onBlur={() => setTimeout(() => setShowFormHorAsigSugg(false), 200)}
                                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                                    {(formHorAsigSearch || fHorario.asignatura_id) && <button type="button" onClick={() => { setFormHorAsigSearch(""); setFHorario({ ...fHorario, asignatura_id: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                                    {showFormHorAsigSugg && (
                                                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                            <button type="button" onMouseDown={() => { setFHorario({ ...fHorario, asignatura_id: "" }); setFormHorAsigSearch(""); setShowFormHorAsigSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">— Selecciona —</button>
                                                            {asigFil.filter(a => normalizar(a.nombre).includes(normalizar(formHorAsigSearch))).map(a => (
                                                                <button key={a.id} type="button" onMouseDown={() => { setFHorario({ ...fHorario, asignatura_id: a.id }); setFormHorAsigSearch(a.nombre); setShowFormHorAsigSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{a.nombre}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div><label className={lbl}>Docente</label>
                                                <div className="relative">
                                                    <input type="text" placeholder="Selecciona Docente..."
                                                        value={formHorDocSearch || (() => { const d = docentes.find(x => x.id === fHorario.docente_id); return d ? `${d.nombres} ${d.apellidos}` : ""; })() || ""}
                                                        onChange={e => { setFormHorDocSearch(e.target.value); setShowFormHorDocSugg(true); }}
                                                        onFocus={() => setShowFormHorDocSugg(true)}
                                                        onBlur={() => setTimeout(() => setShowFormHorDocSugg(false), 200)}
                                                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all pr-8" />
                                                    {(formHorDocSearch || fHorario.docente_id) && <button type="button" onClick={() => { setFormHorDocSearch(""); setFHorario({ ...fHorario, docente_id: "" }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
                                                    {showFormHorDocSugg && (
                                                        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-36 overflow-y-auto">
                                                            <button type="button" onMouseDown={() => { setFHorario({ ...fHorario, docente_id: "" }); setFormHorDocSearch(""); setShowFormHorDocSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">— Selecciona —</button>
                                                            {docentes.filter(d => normalizar(`${d.nombres} ${d.apellidos}`).includes(normalizar(formHorDocSearch))).map(d => (
                                                                <button key={d.id} type="button" onMouseDown={() => { setFHorario({ ...fHorario, docente_id: d.id }); setFormHorDocSearch(`${d.nombres} ${d.apellidos}`); setShowFormHorDocSugg(false); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer">{d.nombres} {d.apellidos}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div><label className={lbl}>Grupo</label>
                                                <input className={inp} placeholder="Ej: A" value={fHorario.grupo} onChange={e => { const val = e.target.value.toUpperCase(); setFHorario({ ...fHorario, grupo: val }); setNuevaSesion({ ...nuevaSesion, grupo: val }); }} />
                                            </div>
                                            <div>
                                                <label className={lbl}>Cupo Máximo</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className={inp}
                                                    value={fHorario.cupo_maximo}
                                                    onChange={e => setFHorario({ ...fHorario, cupo_maximo: parseInt(e.target.value) || 30 })}
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="flex items-center justify-between py-1">
                                        <span className={lbl}>Clases a la semana</span>
                                        <span className="text-xl font-black text-sara-red">{sesiones.length}</span>
                                    </div>
                                    {sesiones.length > 0 && (
                                        <div className="space-y-2">
                                            {sesiones.map((s, i) => (
                                                <div key={i}>
                                                    {editingSesionIndex === i ? (
                                                        <div className="p-3 bg-red-50/30 border border-red-100/50 rounded-xl space-y-2.5">
                                                             <div className="grid grid-cols-2 gap-2">
                                                                 <div>
                                                                     <label className="text-[9px] font-bold text-gray-400 uppercase">Día</label>
                                                                     <select
                                                                         className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs outline-none focus:border-sara-red transition-all"
                                                                         value={s.dia_semana}
                                                                         onChange={e => {
                                                                             const updated = [...sesiones];
                                                                             updated[i].dia_semana = e.target.value;
                                                                             setSesiones(updated);
                                                                         }}
                                                                     >
                                                                         {DIAS.filter(d => d.val === s.dia_semana || !sesiones.some((other, idx) => idx !== i && other.dia_semana === d.val)).map(d => (
                                                                             <option key={d.val} value={d.val}>{d.label}</option>
                                                                         ))}
                                                                     </select>
                                                                 </div>
                                                                 <div>
                                                                     <label className="text-[9px] font-bold text-gray-400 uppercase">Aula</label>
                                                                     <input
                                                                         className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs outline-none focus:border-sara-red transition-all"
                                                                         value={s.aula}
                                                                         onChange={e => {
                                                                             const updated = [...sesiones];
                                                                             updated[i].aula = e.target.value;
                                                                             setSesiones(updated);
                                                                         }}
                                                                     />
                                                                 </div>
                                                             </div>
                                                             <div className="grid grid-cols-2 gap-2">
                                                                 <div>
                                                                     <label className="text-[9px] font-bold text-gray-400 uppercase">Inicio</label>
                                                                     <select
                                                                         className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs outline-none focus:border-sara-red transition-all"
                                                                         value={s.hora_inicio}
                                                                         onChange={e => {
                                                                             const updated = [...sesiones];
                                                                             updated[i].hora_inicio = e.target.value;
                                                                             const newIniHour = parseInt(e.target.value.split(":")[0]);
                                                                             const currentFinHour = parseInt(updated[i].hora_fin.split(":")[0]);
                                                                             if (currentFinHour <= newIniHour || currentFinHour > newIniHour + 4) {
                                                                                 updated[i].hora_fin = `${(newIniHour + 2).toString().padStart(2, "0")}:00`;
                                                                             }
                                                                             setSesiones(updated);
                                                                         }}
                                                                     >
                                                                         {Array.from({ length: 15 }, (_, idx) => {
                                                                             const h = (idx + 6).toString().padStart(2, "0");
                                                                             return <option key={h} value={`${h}:00`}>{h}:00</option>;
                                                                         })}
                                                                     </select>
                                                                 </div>
                                                                 <div>
                                                                     <label className="text-[9px] font-bold text-gray-400 uppercase">Fin</label>
                                                                     <select
                                                                         className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs outline-none focus:border-sara-red transition-all"
                                                                         value={s.hora_fin}
                                                                         onChange={e => {
                                                                             const updated = [...sesiones];
                                                                             updated[i].hora_fin = e.target.value;
                                                                             setSesiones(updated);
                                                                         }}
                                                                     >
                                                                         {Array.from({ length: 17 }, (_, idx) => {
                                                                             const h = (idx + 6).toString().padStart(2, "0");
                                                                             const hourVal = `${h}:00`;
                                                                             if (s.hora_inicio) {
                                                                                 const iniHour = parseInt(s.hora_inicio.split(":")[0]);
                                                                                 const curHour = idx + 6;
                                                                                 if (curHour <= iniHour || curHour > iniHour + 4) return null;
                                                                             }
                                                                             return <option key={h} value={hourVal}>{hourVal}</option>;
                                                                         })}
                                                                     </select>
                                                                 </div>
                                                             </div>
                                                             <div className="flex justify-end gap-1.5">
                                                                 <button
                                                                     type="button"
                                                                     onClick={() => setEditingSesionIndex(null)}
                                                                     className="px-3 py-1 bg-red-800 hover:bg-red-900 text-white rounded-lg text-xs font-bold transition-all"
                                                                 >
                                                                     Listo
                                                                 </button>
                                                             </div>
                                                         </div>
                                                    ) : confirmingRemoveSesionIndex === i ? (
                                                        <div className="flex flex-col items-start gap-1.5 p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-sm animate-pulse w-full">
                                                            <span className="font-extrabold text-amber-900 text-[10px] leading-tight">
                                                                ¿Quitar clase del horario? Se eliminarán las sesiones y asistencias asociadas a este día al guardar cambios.
                                                            </span>
                                                            <div className="flex gap-1.5 self-end mt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        quitarSesion(i);
                                                                        setConfirmingRemoveSesionIndex(null);
                                                                    }}
                                                                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-bold transition-all"
                                                                >
                                                                    Sí
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setConfirmingRemoveSesionIndex(null)}
                                                                    className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-[10px] font-bold transition-all"
                                                                >
                                                                    No
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-sm hover:bg-gray-100/70 transition-colors group">
                                                            <span className="font-bold text-gray-700 w-24">{DIA_LABEL[s.dia_semana] ?? s.dia_semana}</span>
                                                            <span className="text-gray-500 font-mono">{formatHora(s.hora_inicio)}–{formatHora(s.hora_fin)}</span>
                                                            <span className="text-gray-400 flex-1">{s.aula}</span>
                                                            <button type="button" onClick={() => { setEditingSesionIndex(i); setConfirmingRemoveSesionIndex(null); }} className="text-gray-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={13} /></button>
                                                            <button type="button" onClick={() => { setConfirmingRemoveSesionIndex(i); setEditingSesionIndex(null); }} className="text-gray-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={13} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                         </div>
                                     )}
                                    {sesiones.length < 6 && (
                                        <div className="p-4 rounded-xl border border-dashed border-gray-300 space-y-3 bg-gray-50/50">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nueva Sesión</p>
                                            {errorSesion && <p className="text-xs font-semibold text-sara-red">{errorSesion}</p>}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className={lbl}>Día de la Semana</label>
                                                    <select className={inp} value={nuevaSesion.dia_semana} onChange={e => setNuevaSesion({ ...nuevaSesion, dia_semana: e.target.value })}>
                                                        {(() => { const dias = DIAS.filter(d => !sesiones.some(s => s.dia_semana === d.val)); if (!dias.find(d => d.val === nuevaSesion.dia_semana) && dias.length > 0) { setTimeout(() => setNuevaSesion(prev => ({ ...prev, dia_semana: dias[0].val })), 0); } return dias.map(d => <option key={d.val} value={d.val}>{d.label}</option>); })()}
                                                    </select></div>
                                                <div><label className={lbl}>Aula</label>
                                                    <input className={inp} placeholder="Ej: Aula 201" value={nuevaSesion.aula} onChange={e => setNuevaSesion({ ...nuevaSesion, aula: e.target.value })} /></div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div><label className={lbl}>Hora Inicio</label>
                                                    <select className={inp} value={nuevaSesion.hora_inicio} onChange={e => setNuevaSesion({ ...nuevaSesion, hora_inicio: e.target.value })}>
                                                        <option value="">Selecciona</option>
                                                        {Array.from({ length: 15 }, (_, i) => { const h = (i + 6).toString().padStart(2, "0"); return <option key={h} value={`${h}:00`}>{h}:00</option>; })}
                                                    </select></div>
                                                <div><label className={lbl}>Hora Fin</label>
                                                    <select className={inp} value={nuevaSesion.hora_fin} onChange={e => setNuevaSesion({ ...nuevaSesion, hora_fin: e.target.value })}>
                                                        <option value="">Selecciona</option>
                                                        {Array.from({ length: 17 }, (_, i) => {
                                                            const h = (i + 6).toString().padStart(2, "0");
                                                            const hourVal = `${h}:00`;
                                                            if (nuevaSesion.hora_inicio) {
                                                                const iniHour = parseInt(nuevaSesion.hora_inicio.split(":")[0]);
                                                                const curHour = i + 6;
                                                                if (curHour <= iniHour || curHour > iniHour + 4) return null;
                                                            }
                                                            return <option key={h} value={hourVal}>{hourVal}</option>;
                                                        })}
                                                    </select></div>
                                            </div>
                                            <button type="button" onClick={agregarSesion} className="w-full py-2 rounded-xl border-2 border-dashed text-sm font-bold transition-colors flex items-center justify-center gap-2 hover:bg-blue-50/50" style={{ borderColor: "var(--color-sara-red)", color: "var(--color-sara-red)" }}>
                                                <Plus size={15} /> Agregar Sesión
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {tab === "matriculas" && <>
                                {editandoId ? <>
                                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <p className={lbl}>Estudiante</p>
                                        <p className="text-sm font-semibold text-gray-800">{editMatStudent.nombre}</p>
                                        <p className="text-xs font-mono text-gray-500 mt-0.5">{editMatStudent.num_doc}</p>
                                        <p className={lbl + " mt-2"}>Facultad</p>
                                        <p className="text-sm font-semibold text-gray-800">{programas.find(p => p.id === editMatStudent.programa_id)?.facultad || ""}</p>
                                        <p className={lbl + " mt-2"}>Programa</p>
                                        <p className="text-sm font-semibold text-gray-800">{editMatStudent.programa}</p>
                                    </div>
                                    <div><label className={lbl}>Semestre</label>
                                        <input type="number" min="1" max="10" className={inp} value={fMat.semestre || ""} onChange={e => setFMat({ ...fMat, semestre: parseInt(e.target.value) || 1 })} />
                                    </div>
                                </> : <>
                                    {/* Estudiante con botón desplegable */}
                                    <div className="relative">
                                        <label className={lbl}>Estudiante</label>
                                        <input className={inp} placeholder="Buscar por nombre o documento..."
                                            value={estudianteSel ? `${estudianteSel.nombres} ${estudianteSel.apellidos} (${estudianteSel.num_doc})` : busqEstudiante}
                                            onChange={e => { setBusqEstudiante(e.target.value); setEstShowAll(false); setEstudianteSel(null); setFMat({ ...fMat, usuario_id: "" }); setShowEstSugg(true); }}
                                            onFocus={() => { setShowEstSugg(true); setEstShowAll(true); }}
                                            onBlur={() => setTimeout(() => { setShowEstSugg(false); setEstShowAll(false); }, 200)} />
                                        {showEstSugg && estSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                {estSuggestions.map(u => (
                                                    <button key={u.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer"
                                                        onMouseDown={() => { setEstudianteSel(u); setFMat({ ...fMat, usuario_id: u.id }); setShowEstSugg(false); setEstShowAll(false); setBusqEstudiante(""); }}>
                                                        <span className="font-semibold">{u.nombres} {u.apellidos}</span>
                                                        <span className="text-gray-400 ml-2 text-xs font-mono">{u.num_doc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {(() => {
                                            const inactivoMatch = estudiantes.find(e => !e.activo && busqEstudiante.length > 2 && (
                                                normalizar(`${e.nombres} ${e.apellidos}`).includes(normalizar(busqEstudiante)) ||
                                                e.num_doc.includes(busqEstudiante)
                                            ));
                                            if (inactivoMatch) return <p className="text-[10px] font-bold text-sara-red mt-1">Este estudiante está inactivo, no es posible matricularlo</p>;
                                            return null;
                                        })()}
                                    </div>
                                    {/* Facultad */}
                                    <div className="relative">
                                        <label className={lbl}>Facultad</label>
                                        <input className={inp} placeholder="Buscar facultad..." value={filtroMatFacultad}
                                            onChange={e => { setFiltroMatFacultad(e.target.value); setFacShowAll(false); setFiltroMatPrograma(""); setBusqProg(""); setFMat({ ...fMat, programa_id: "" }); setShowFacSugg(true); }}
                                            onFocus={() => { setShowFacSugg(true); setFacShowAll(true); }} onBlur={() => setTimeout(() => { setShowFacSugg(false); setFacShowAll(false); }, 200)} />
                                        {showFacSugg && facSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                {facSuggestions.map(f => (
                                                    <button key={f.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer"
                                                        onMouseDown={() => { setFiltroMatFacultad(f.nombre); setShowFacSugg(false); setFacShowAll(false); }}>
                                                        {f.nombre}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Programa */}
                                    <div className="relative">
                                        <label className={lbl}>Programa</label>
                                        <input className={inp} placeholder="Buscar programa..." value={busqProg}
                                            onChange={e => { setBusqProg(e.target.value); setProgShowAll(false); const f = progMatFil.find(p => p.nombre === e.target.value); if (f) { setFiltroMatPrograma(f.id); setFMat({ ...fMat, programa_id: f.id }); } else { setFiltroMatPrograma(""); setFMat({ ...fMat, programa_id: "" }); } setShowProgSugg(true); }}
                                            onFocus={() => { setShowProgSugg(true); setProgShowAll(true); }} onBlur={() => setTimeout(() => { setShowProgSugg(false); setProgShowAll(false); }, 200)} />
                                        {showProgSugg && progSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
                                                {progSuggestions.map(p => (
                                                    <button key={p.id} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0 cursor-pointer"
                                                        onMouseDown={() => { setBusqProg(p.nombre); setFiltroMatPrograma(p.id); setFMat({ ...fMat, programa_id: p.id }); setShowProgSugg(false); setProgShowAll(false); }}>
                                                        {p.nombre}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div><label className={lbl}>Semestre</label>
                                        <input type="number" min="1" max="10" className={inp} value={fMat.semestre || ""} onChange={e => setFMat({ ...fMat, semestre: parseInt(e.target.value) || 1 })} />
                                    </div>
                                    <div><label className={lbl}>Fecha Inicio</label>
                                        <input type="date" className={inp} value={fMat.fecha_inicio} onChange={e => setFMat({ ...fMat, fecha_inicio: e.target.value })} />
                                    </div>
                                </>}

                                {/* Contador y lista de asignaturas */}
                                <div className="flex items-center justify-between py-1">
                                    <span className={lbl}>Asignaturas matriculadas</span>
                                    <span className="text-xl font-black text-sara-red">{asigsMat.length}</span>
                                </div>
                                {asigsMat.length > 0 && (
                                    <div className="space-y-2">
                                        {asigsMat.map((a, i) => (
                                            <div key={i} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-gray-700 text-sm flex-1">{a.asignatura}</span>
                                                    <div className="flex items-center gap-1">
                                                        <button type="button" onClick={() => quitarAsigMat(i)} className="text-red-400 hover:text-red-600 p-1"><X size={16} /></button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Grupo</p>
                                                        <select className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                                                            value={a.grupo} onChange={e => setAsigsMat(asigsMat.map((x, j) => j === i ? { ...x, grupo: e.target.value } : x))}>
                                                            <option value={a.grupo}>{a.grupo}</option>
                                                            {[...new Set(horarios.filter(h => h.asignatura_id === a.asignatura_id).map(h => h.grupo))].filter(g => g !== a.grupo).map(g => <option key={g} value={g}>{g}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Estado</p>
                                                        <select className="w-full p-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                                                            value={(a as any).estado || "activa"}
                                                            onChange={e => setAsigsMat(asigsMat.map((x, j) => j === i ? { ...x, estado: e.target.value } : x))}>
                                                            <option value="activa">Activa</option>
                                                            <option value="cancelada">Cancelada</option>
                                                            <option value="perdida">Perdida</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {(() => {
                                                    const h = horarios.find(h => h.asignatura_id === a.asignatura_id && h.grupo === a.grupo);
                                                    if (h && (h.matriculados ?? 0) >= (h.cupo_maximo ?? 0)) {
                                                        return <p className="text-[10px] font-bold text-amber-600 mt-1 leading-tight">⚠️ Este grupo ya ha alcanzado su cupo máximo.</p>;
                                                    }
                                                    return null;
                                                })()}
                                                {(() => {
                                                    const matches = horarios.filter(h => h.asignatura_id === a.asignatura_id && h.grupo === a.grupo);
                                                    const sortedMatches = [...matches].sort((x, y) => (DIA_ORDER[x.dia_semana] ?? 6) - (DIA_ORDER[y.dia_semana] ?? 6));
                                                    if (sortedMatches.length === 0) return null;
                                                    const isExpanded = horariosExpansibles[a.asignatura_id] || false;
                                                    return (
                                                        <div className="mt-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => setHorariosExpansibles(prev => ({ ...prev, [a.asignatura_id]: !prev[a.asignatura_id] }))}
                                                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-500 hover:text-sara-red hover:bg-blue-50/50 hover:border-blue-100 transition-all cursor-pointer"
                                                            >
                                                                <span>Horarios programados</span>
                                                                <ChevronDown size={14} className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                                            </button>
                                                            
                                                            {isExpanded && (
                                                                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                    {sortedMatches.map((h, idx) => (
                                                                        <div key={idx} className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-1">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="font-extrabold text-gray-800 capitalize text-xs">{DIA_LABEL[h.dia_semana] || h.dia_semana}</span>
                                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-50 text-purple-700">
                                                                                    Aula {h.aula}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1 text-[11px] text-gray-500 font-semibold mt-0.5">
                                                                                ⏱️ {h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}
                                                                            </div>
                                                                            <div className="text-[10px] text-gray-400 italic">
                                                                                Docente: {h.docente} {h.apellido_docente}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                )}


                                {/* Nueva Asignatura */}
                                <div className="p-4 rounded-xl border border-dashed border-gray-300 space-y-3 bg-gray-50/50">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Nueva Asignatura</p>
                                    {errorAsigMat && <p className="text-xs font-semibold text-sara-red">{errorAsigMat}</p>}
                                    <div><label className={lbl}>Asignatura</label>
                                        <select className={inp} value={nuevaAsigMat.asignatura_id} onChange={e => setNuevaAsigMat({ asignatura_id: e.target.value, grupo: "" })}>
                                            <option value="">— Selecciona —</option>
                                            {asigMatFil.filter(a => !asigsMat.some(x => x.asignatura_id === a.id)).map(a => <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>)}
                                        </select>
                                    </div>
                                    <div><label className={lbl}>Grupo</label>
                                        <select className={inp} value={nuevaAsigMat.grupo} onChange={e => setNuevaAsigMat({ ...nuevaAsigMat, grupo: e.target.value })}>
                                            <option value="">— Selecciona grupo —</option>
                                            {gruposNuevaAsig.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        {(() => {
                                            if (nuevaAsigMat.asignatura_id && nuevaAsigMat.grupo) {
                                                const h = horarios.find(h => h.asignatura_id === nuevaAsigMat.asignatura_id && h.grupo === nuevaAsigMat.grupo);
                                                if (h && (h.matriculados ?? 0) >= (h.cupo_maximo ?? 0)) {
                                                    return <p className="text-[10px] font-bold text-amber-600 mt-1 leading-tight">⚠️ Este grupo ya ha alcanzado su cupo máximo.</p>;
                                                }
                                            }
                                            return null;
                                        })()}
                                    </div>
                                    <button type="button" onClick={agregarAsigMat} className="w-full py-2 rounded-xl border-2 border-dashed text-sm font-bold transition-colors flex items-center justify-center gap-2 hover:bg-blue-50/50" style={{ borderColor: "var(--color-sara-red)", color: "var(--color-sara-red)" }}>
                                        <Plus size={15} /> Agregar Asignatura
                                    </button>
                                </div>
                            </>}

                             {tab === "semestres" && <>
                                <div><label className={lbl}>Nombre</label><input type="text" className={inp} value={fSemestre.nombre} onChange={e => setFSemestre({ ...fSemestre, nombre: e.target.value })} required placeholder="Ej: 2026-1" /></div>
                                <div><label className={lbl}>Fecha Inicio (Lunes)</label><input type="date" className={inp} value={fSemestre.fecha_inicio} onChange={e => setFSemestre({ ...fSemestre, fecha_inicio: e.target.value })} required /></div>
                                <div><label className={lbl}>Fecha Fin (Sábado)</label><input type="date" className={inp} value={fSemestre.fecha_fin} onChange={e => setFSemestre({ ...fSemestre, fecha_fin: e.target.value })} required /></div>
                                <div>
                                    <label className={lbl}>Estado del Semestre</label>
                                    <select
                                        className={inp}
                                        value={fSemestre.estado || "pendiente"}
                                        onChange={e => {
                                            const newVal = e.target.value;
                                            setFSemestre({
                                                ...fSemestre,
                                                estado: newVal,
                                                activo: newVal === "actual"
                                            });
                                        }}
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="actual">Actual (Activo)</option>
                                        <option value="terminado">Terminado</option>
                                    </select>
                                </div>
                            </>}

                        </form>

                        <div className="p-6 border-t bg-gray-50 rounded-b-3xl space-y-3">
                            {/* Mensajes de error/cruce al pie del panel, siempre visibles antes del botón */}
                            {error && !(tab === "matriculas" && error.toLowerCase().includes("cupo máximo")) && (
                                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100 flex items-start gap-2">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                            <button onClick={guardar} disabled={loading} className="w-full py-4 rounded-2xl text-white font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100" style={{ background: "linear-gradient(135deg, var(--color-sara-red), var(--color-sara-red-dark))" }}>
                                {loading ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </>
            )}
            {conflictingStudents.length > 0 && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-red-100 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 text-red-600">
                                <div className="p-3 bg-red-50 rounded-2xl">
                                    <AlertTriangle size={24} />
                                </div>
                                <h4 className="font-black text-lg">Conflicto de Horarios</h4>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                De guardar los cambios, se eliminará el grupo para la matrícula de los siguientes estudiantes por cruce de horarios{conflictDia ? ` el día ${conflictDia}` : ""}:
                            </p>
                            <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-2xl p-4 divide-y divide-gray-100">
                                {conflictingStudents.map(student => (
                                    <div key={student.id} className="py-2 text-xs font-bold text-gray-700 flex justify-between items-center">
                                        <span>{student.nombre}</span>
                                        <span className="text-gray-400 font-mono">{student.num_doc}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-gray-600 text-xs font-semibold">
                                Se eliminarán también sus registros de asistencia y permanencia asociados a este grupo. ¿Desea continuar?
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setConflictingStudents([])}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm transition-all"
                                >
                                    No, cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setConflictingStudents([]);
                                        await guardar(undefined as any, true);
                                    }}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-red-600/10"
                                >
                                    Sí, continuar
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* MODAL DE HORARIO SEMANAL */}
            {mostrarHorarioModal && horarioUsuario && (() => {
                const DIAS_SEMANA = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
                const DIA_MAP_SEMANAL: Record<string, string> = {
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

                return (
                    <>
                        {/* Overlay */}
                        <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm no-print"
                            onClick={() => setMostrarHorarioModal(false)} />

                        {/* Contenedor del Modal */}
                        <div className="fixed inset-4 md:inset-10 bg-white z-50 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 print:absolute print:inset-0 print:rounded-none print:shadow-none print:border-0 print:h-screen print:w-screen">
                            
                            {/* Header del Modal (Oculto al imprimir) */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between no-print"
                                style={{ background: "linear-gradient(135deg, #0e5d75, #0a475a)" }}>
                                <div>
                                    <h2 className="text-white font-black text-lg flex items-center gap-2">
                                        <Calendar size={20} /> Horario Semanal de Clases
                                    </h2>
                                    <p className="text-white/70 text-xs mt-0.5 font-medium">
                                        {horarioUsuario.rol}: {horarioUsuario.nombres} {horarioUsuario.apellidos} ({horarioUsuario.num_doc})
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => window.print()}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                    >
                                        <Printer size={13} /> Imprimir
                                    </button>
                                    <button onClick={() => setMostrarHorarioModal(false)}
                                        className="text-white/70 hover:text-white transition-colors">
                                        <X size={22} />
                                    </button>
                                </div>
                            </div>

                            <PrintHeader 
                                titulo="Horario Semanal de Clases"
                                nombreUsuario={`${horarioUsuario.nombres} ${horarioUsuario.apellidos}`}
                                rol={horarioUsuario.rol}
                                documento={horarioUsuario.num_doc}
                            />

                            {/* Contenido / Tabla del Horario */}
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 print:bg-white print:p-0">
                                {cargandoHorario ? (
                                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                        <div className="w-10 h-10 border-4 border-[#0e5d75] border-t-transparent rounded-full animate-spin" />
                                        <p className="text-gray-400 text-sm font-medium animate-pulse">Cargando horario semanal...</p>
                                    </div>
                                ) : (() => {
                                    // Agrupar horarios por Asignatura + Grupo para formar las filas de la tabla
                                    const filasMap: Record<string, any> = {};

                                    horariosData.forEach(h => {
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
                                        
                                        const diaNorm = DIA_MAP_SEMANAL[h.dia_semana.toLowerCase()] || "Lunes";
                                        if (filasMap[key].clasesPorDia[diaNorm]) {
                                            filasMap[key].clasesPorDia[diaNorm].push({
                                                hora_inicio: h.hora_inicio,
                                                hora_fin: h.hora_fin,
                                                aula: h.aula
                                            });
                                        }
                                    });

                                    const filas = Object.values(filasMap);

                                    if (filas.length === 0) {
                                        return (
                                            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-4 shadow-sm flex flex-col items-center justify-center h-64 print:border-0 print:shadow-none">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                                    <Calendar size={32} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-lg text-[#0e5d75]">No se encontraron clases programadas</h3>
                                                    <p className="text-xs text-gray-400 mt-1">El estudiante no registra clases activas para este semestre o no se han programado.</p>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="w-full overflow-x-auto rounded-3xl border border-gray-200/80 shadow-md bg-white print:border-gray-300 print:shadow-none">
                                            <table className="w-full border-collapse min-w-[1000px] print:min-w-full">
                                                <thead>
                                                    <tr className="bg-[#0e5d75] border-b-[3px] border-[#c9a84c] text-white text-[11px] font-black uppercase tracking-wider print:bg-[#0e5d75] print:border-b-[3px] print:border-[#c9a84c] print:text-white">
                                                        <th className="py-3 px-4 text-center border-r border-gray-300/40 w-[220px]">Materia</th>
                                                        {DIAS_SEMANA.map(dia => (
                                                            <th key={dia} className="py-3 px-3 text-center border-r border-gray-300/40 last:border-r-0 font-bold">{dia}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filas.map((fila: any, idx) => {
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
                                                                        {horarioUsuario.rol === "Estudiante" && (
                                                                            <p className="text-[9px] text-gray-800 font-bold mt-1 uppercase" title={fila.docente}>
                                                                                Docente: {fila.docente}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                
                                                                {/* Columnas de Días */}
                                                                {DIAS_SEMANA.map(dia => {
                                                                    const clases = fila.clasesPorDia[dia] || [];
                                                                    return (
                                                                        <td key={dia} className="p-2 border border-gray-200/80 align-top w-[110px] min-w-[110px]">
                                                                            <div className="flex flex-col gap-2">
                                                                                {clases.map((clase: any, cIdx: number) => (
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
                                    );
                                })()}
                            </div>
                        </div>
                    </>
                );
            })()}
        </div>
    );
}