import api from "./api";

export interface AdminStats {
    metricas: {
        estudiantes_activos: string;
        docentes_activos: string;
        contingencias_pendientes: number;
        asistencia_promedio: string;
        cumplimiento_docente?: string;
    };
    asistencia_semanal: {
        dia: string;
        presentes: number;
        ausentes: number;
    }[];

    alertas_desercion: {
        id: string;
        nombres: string;
        apellidos: string;
        num_doc: string;
        descripcion: string;
    }[];
    semana_actual?: number;
    semanas_semestre?: number;
    semestre_actual?: string;
}

export interface EstudianteStats {
    asistencia_general: string;
    asignaturas_asistencias: {
        nombre: string;
        porcentaje: number;
        dictadas: number;
        asistidas: number;
    }[];
    desglose_puntualidad: {
        name: string;
        value: number;
        color: string;
    }[];
    horarios_hoy: {
        id: string;
        asignatura: string;
        aula: string;
        dia_semana: string;
        hora_inicio: string;
        hora_fin: string;
        grupo: string;
        sesion_id?: string | null;
        sesion_estado?: string | null;
        docente_asistio?: boolean | null;
        asistencia_estado?: string | null;
        hora_entrada?: string | null;
        hora_salida?: string | null;
    }[];
    semestre_actual?: string;
}

export async function obtenerAdminStats(rol?: string, semana?: string, usuarioAutenticadoId?: string, rolUsuario?: string): Promise<AdminStats> {
    const response = await api.get("/dashboard/admin-stats", {
        params: {
            rol,
            semana,
            usuario_autenticado_id: usuarioAutenticadoId,
            rol_usuario: rolUsuario
        }
    });
    return response.data;
}

import { listarAsistencias } from "./asistencias";
import { listarHorarios } from "./admin";
import { listarSesiones } from "./contingencias";

export interface AlertaDesercion {
    id: string;
    nombres: string;
    apellidos: string;
    num_doc: string;
    descripcion: string;
    isDocente?: boolean;
}

export async function obtenerAlertasDesercion(docenteId?: string): Promise<AlertaDesercion[]> {
    // Cuando docenteId está presente (dashboard de docente), necesitamos dos llamadas:
    // - asistencias de SUS estudiantes (para alertas de estudiantes)
    // - TODAS las asistencias para encontrar el registro del propio docente
    const requests: Promise<any>[] = [
        listarAsistencias(docenteId ? { docente_id: docenteId } : undefined),
        listarHorarios(),
    ];
    if (docenteId) {
        requests.push(listarAsistencias()); // para encontrar registros del docente
    }

    const results = await Promise.all(requests);
    const asisList: any[] = results[0] || [];
    const horarios: any[] = results[1] || [];
    // Si es docente, la lista completa contiene sus propios registros; si admin, asisList ya tiene todo
    const allAsisList: any[] = docenteId ? (results[2] || []) : asisList;

    // Mapa rápido de horarios por id
    const horariosMap: Record<string, any> = {};
    horarios.forEach((h: any) => { if (h.id) horariosMap[String(h.id)] = h; });

    // Helpers para resolver asignatura/grupo de un registro
    function resolveInfo(a: any) {
        const horario = a.horario_id ? horariosMap[String(a.horario_id)] : null;
        return {
            codAsig: horario?.cod_asignatura || a.cod_asignatura || "",
            asignatura: horario?.asignatura || a.asignatura || "",
            grupo: horario?.grupo || a.grupo || "",
        };
    }

    // ── ALERTAS DE DOCENTES ──────────────────────────────────────────────────
    // Un registro pertenece al docente cuando su num_doc coincide con docente_num_doc
    // (el docente tiene su propio registro de asistencia en la tabla asistencias)
    const docenteMap: Record<string, {
        num_doc: string; nombres: string; apellidos: string;
        asignatura: string; cod_asignatura: string; grupo: string;
        total: number; presentes: number;
    }> = {};

    allAsisList.forEach((a: any) => {
        if (!a.num_doc || !a.docente_num_doc) return;
        if (a.num_doc !== a.docente_num_doc) return; // no es registro del docente

        const { codAsig, asignatura, grupo } = resolveInfo(a);
        if (!codAsig || !grupo) return;

        const estadoNorm = (a.estado || "").toLowerCase();
        const isPresent = estadoNorm === "asistencia" || estadoNorm === "asistencia con retraso"
            || estadoNorm === "presente" || estadoNorm === "tarde";
        const isAbsent = estadoNorm === "inasistencia" || estadoNorm === "ausente";
        if (!isPresent && !isAbsent) return;

        const key = `${a.num_doc}-${codAsig}-${grupo}`;
        if (!docenteMap[key]) {
            docenteMap[key] = {
                num_doc: a.num_doc,
                nombres: a.nombre_docente || a.nombre || a.nombres || "",
                apellidos: a.apellido_docente || a.apellido || a.apellidos || "",
                asignatura, cod_asignatura: codAsig, grupo,
                total: 0, presentes: 0,
            };
        }
        docenteMap[key].total += 1;
        if (isPresent) docenteMap[key].presentes += 1;
    });

    // ── ALERTAS DE ESTUDIANTES ───────────────────────────────────────────────
    // Un registro pertenece a un estudiante cuando su num_doc es distinto del docente
    const estudianteMap: Record<string, {
        num_doc: string; nombres: string; apellidos: string;
        asignatura: string; cod_asignatura: string;
        total: number; presentes: number;
    }> = {};

    asisList.forEach((a: any) => {
        if (!a.num_doc) return;
        // Excluir registros del docente
        if (a.docente_num_doc && a.num_doc === a.docente_num_doc) return;

        const estadoNorm = (a.estado || "").toLowerCase();
        const isPresent = estadoNorm === "asistencia" || estadoNorm === "asistencia con retraso"
            || estadoNorm === "presente" || estadoNorm === "tarde";
        const isAbsent = estadoNorm === "inasistencia" || estadoNorm === "ausente";
        if (!isPresent && !isAbsent) return;

        const { codAsig, asignatura } = resolveInfo(a);
        if (!codAsig) return;

        const key = `${a.num_doc}-${codAsig}`;
        if (!estudianteMap[key]) {
            estudianteMap[key] = {
                num_doc: a.num_doc,
                nombres: a.nombre_estudiante || a.nombre || a.nombres || "",
                apellidos: a.apellido_estudiante || a.apellido || a.apellidos || "",
                asignatura, cod_asignatura: codAsig,
                total: 0, presentes: 0,
            };
        }
        estudianteMap[key].total += 1;
        if (isPresent) estudianteMap[key].presentes += 1;
    });

    // ── CONSTRUIR ALERTAS ────────────────────────────────────────────────────
    const alertas: AlertaDesercion[] = [];

    Object.values(estudianteMap).forEach(em => {
        if (em.total === 0) return;
        const pct = Math.round((em.presentes / em.total) * 100);
        if (pct < 80) {
            alertas.push({
                id: `est-${em.num_doc}-${em.cod_asignatura}`,
                nombres: em.nombres, apellidos: em.apellidos, num_doc: em.num_doc,
                descripcion: `Asistencia de estudiante: ${pct}% en ${em.asignatura} (${em.cod_asignatura})`,
                isDocente: false,
            });
        }
    });

    Object.values(docenteMap).forEach(dm => {
        if (dm.total === 0) return;
        const pct = Math.round((dm.presentes / dm.total) * 100);
        if (pct < 80) {
            alertas.push({
                id: `doc-${dm.num_doc}-${dm.cod_asignatura}-${dm.grupo}`,
                nombres: dm.nombres, apellidos: dm.apellidos, num_doc: dm.num_doc,
                descripcion: `Asistencia de docente: ${pct}% en ${dm.asignatura} (Grupo ${dm.grupo})`,
                isDocente: true,
            });
        }
    });

    return alertas;
}


export async function obtenerEstudianteStats(usuarioId: string): Promise<EstudianteStats> {
    const response = await api.get(`/dashboard/estudiante-stats/${usuarioId}`);
    return response.data;
}

export interface DocenteStats {
    horarios_hoy: {
        id: string;
        asignatura: string;
        aula: string;
        dia_semana: string;
        hora_inicio: string;
        hora_fin: string;
        grupo: string;
        sesion_id?: string | null;
        sesion_estado?: string | null;
        docente_asistio?: boolean | null;
        asistencia_estado?: string | null;
        hora_entrada?: string | null;
        hora_salida?: string | null;
    }[];
    semestre_actual?: string;
}

export async function obtenerDocenteStats(usuarioId: string): Promise<DocenteStats> {
    const response = await api.get(`/dashboard/docente-stats/${usuarioId}`);
    return response.data;
}


export interface UsuarioFiltro {
    id: string;
    nombres: string;
    apellidos: string;
    rol: string;
}

export interface AsignaturaFiltro {
    id: string;
    nombre: string;
}

export interface PermanenciaStats {
    semana: string;
    permanencia: number;
    total_asistencias: number;
}

export async function obtenerUsuariosFiltro(rol?: string, docenteId?: string): Promise<UsuarioFiltro[]> {
    const response = await api.get("/dashboard/usuarios-filtro", { params: { rol, docente_id: docenteId } });
    return response.data;
}

export async function obtenerAsignaturasFiltro(usuarioId?: string, docenteId?: string): Promise<AsignaturaFiltro[]> {
    const response = await api.get("/dashboard/asignaturas-filtro", { params: { usuario_id: usuarioId, docente_id: docenteId } });
    return response.data;
}

export async function obtenerPermanenciaStats(rol?: string, usuarioId?: string, asignaturaId?: string, usuarioAutenticadoId?: string, rolUsuario?: string): Promise<PermanenciaStats[]> {
    const response = await api.get("/dashboard/permanencia-stats", {
        params: {
            rol,
            usuario_id: usuarioId,
            asignatura_id: asignaturaId,
            usuario_autenticado_id: usuarioAutenticadoId,
            rol_usuario: rolUsuario
        }
    });
    return response.data;
}

export interface HorarioSemanal {
    id: string;
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    aula: string;
    grupo: string;
    asignatura: string;
    cod_asignatura: string;
    docente: string;
}

export async function obtenerHorarioSemanal(usuarioId: string, rol: string): Promise<HorarioSemanal[]> {
    const response = await api.get(`/dashboard/horario-semanal/${usuarioId}`, {
        params: { rol }
    });
    return response.data;
}

