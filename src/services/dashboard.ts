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
    // 1. Obtener todos los datos del backend en paralelo
    const [asisList, sessions, horarios] = await Promise.all([
        listarAsistencias(docenteId ? { docente_id: docenteId } : undefined),
        listarSesiones(),
        listarHorarios()
    ]);

    // 2. Mapear sesiones y horarios para búsquedas rápidas
    const sessionsMap: Record<string, any> = {};
    if (Array.isArray(sessions)) {
        sessions.forEach((s: any) => {
            const id = s.id || s.sesion_id;
            if (id) sessionsMap[String(id)] = s;
        });
    }

    const horariosMap: Record<string, any> = {};
    if (Array.isArray(horarios)) {
        horarios.forEach((h: any) => {
            if (h.id) horariosMap[String(h.id)] = h;
        });
    }

    // ---------------------------------------------------------------------------
    // ALERTAS DE DOCENTES
    // Los registros de asistencia del docente están en la tabla sesiones_clase
    // a través del campo docente_asistio. Cada sesión = 1 clase del docente.
    // ---------------------------------------------------------------------------
    const docenteMateriaMap: Record<string, {
        docente_num_doc: string;
        nombres: string;
        apellidos: string;
        asignatura: string;
        cod_asignatura: string;
        grupo: string;
        total: number;     // sesiones pasadas con registro
        presentes: number; // sesiones donde docente_asistio === true
    }> = {};

    if (Array.isArray(sessions)) {
        sessions.forEach((s: any) => {
            // Solo sesiones donde ya se registró si el docente asistió o no
            if (s.docente_asistio === null || s.docente_asistio === undefined) return;

            const horario = s.horario_id ? horariosMap[String(s.horario_id)] : null;
            if (!horario) return; // Sin horario no podemos saber a qué asignatura/grupo pertenece

            const codAsig = horario.cod_asignatura || "";
            const asignatura = horario.asignatura || "";
            const grupo = horario.grupo || "";
            const docenteNumDoc = horario.docente_num_doc || horario.docente_id || "";
            const docenteNombre = horario.docente || "";
            const docenteApellido = horario.apellido_docente || "";

            if (!docenteNumDoc || !codAsig || !grupo) return;

            const groupKey = `${docenteNumDoc}-${codAsig}-${grupo}`;

            if (!docenteMateriaMap[groupKey]) {
                docenteMateriaMap[groupKey] = {
                    docente_num_doc: docenteNumDoc,
                    nombres: docenteNombre,
                    apellidos: docenteApellido,
                    asignatura,
                    cod_asignatura: codAsig,
                    grupo,
                    total: 0,
                    presentes: 0
                };
            }

            docenteMateriaMap[groupKey].total += 1;
            if (s.docente_asistio === true) {
                docenteMateriaMap[groupKey].presentes += 1;
            }
        });
    }

    // ---------------------------------------------------------------------------
    // ALERTAS DE ESTUDIANTES
    // Los registros de asistencia de los estudiantes están en la tabla asistencias.
    // Cada registro con estado presente/ausente = 1 clase para ese estudiante.
    // ---------------------------------------------------------------------------
    const estudianteMateriaMap: Record<string, {
        num_doc: string;
        nombres: string;
        apellidos: string;
        asignatura: string;
        cod_asignatura: string;
        total: number;     // registros con estado definido (presente + ausente)
        presentes: number; // registros donde estado = presente/asistencia/etc.
    }> = {};

    asisList.forEach((a: any) => {
        if (!a.num_doc) return;
        const sesionId = a.sesion_id ? String(a.sesion_id) : "";
        if (!sesionId) return;

        // Estado del estudiante en este registro
        const estadoNorm = (a.estado || "").toLowerCase();
        const isPresent = estadoNorm === "asistencia" || estadoNorm === "asistencia con retraso" || estadoNorm === "presente" || estadoNorm === "tarde";
        const isAbsent = estadoNorm === "inasistencia" || estadoNorm === "ausente";

        if (!isPresent && !isAbsent) return; // Estado no reconocido, se ignora

        // Resolver asignatura y grupo desde sesión → horario
        const session = sessionsMap[sesionId];
        const horarioId = session?.horario_id || a.horario_id;
        const horario = horarioId ? horariosMap[String(horarioId)] : null;

        const codAsig = horario?.cod_asignatura || a.cod_asignatura || "";
        const asignatura = horario?.asignatura || a.asignatura || "";

        if (!codAsig) return; // Sin asignatura no podemos agrupar

        const key = `${a.num_doc}-${codAsig}`;

        if (!estudianteMateriaMap[key]) {
            estudianteMateriaMap[key] = {
                num_doc: a.num_doc,
                nombres: a.nombre_estudiante || a.nombre || a.nombres || "",
                apellidos: a.apellido_estudiante || a.apellido || a.apellidos || "",
                asignatura,
                cod_asignatura: codAsig,
                total: 0,
                presentes: 0
            };
        }

        estudianteMateriaMap[key].total += 1;
        if (isPresent) {
            estudianteMateriaMap[key].presentes += 1;
        }
    });

    // ---------------------------------------------------------------------------
    // Construir alertas: solo usuarios con total > 0 y porcentaje < 80%
    // ---------------------------------------------------------------------------
    const alertas: AlertaDesercion[] = [];

    Object.values(estudianteMateriaMap).forEach(em => {
        if (em.total === 0) return; // Sin registros → no es deserción, es nuevo
        const porcentaje = Math.round((em.presentes / em.total) * 100);
        if (porcentaje < 80) {
            alertas.push({
                id: `est-${em.num_doc}-${em.cod_asignatura}`,
                nombres: em.nombres,
                apellidos: em.apellidos,
                num_doc: em.num_doc,
                descripcion: `Asistencia de estudiante: ${porcentaje}% en ${em.asignatura} (${em.cod_asignatura})`,
                isDocente: false
            });
        }
    });

    Object.values(docenteMateriaMap).forEach(dm => {
        if (dm.total === 0) return; // Sin registros → no es deserción, es nuevo
        const porcentaje = Math.round((dm.presentes / dm.total) * 100);
        if (porcentaje < 80) {
            alertas.push({
                id: `doc-${dm.docente_num_doc}-${dm.cod_asignatura}-${dm.grupo}`,
                nombres: dm.nombres,
                apellidos: dm.apellidos,
                num_doc: dm.docente_num_doc,
                descripcion: `Asistencia de docente: ${porcentaje}% en ${dm.asignatura} (Grupo ${dm.grupo})`,
                isDocente: true
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

