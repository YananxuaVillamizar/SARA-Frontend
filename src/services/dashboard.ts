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
import { listarUsuarios } from "./usuarios";

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
    const [asisList, sessions, horarios, usuarios] = await Promise.all([
        listarAsistencias(),
        listarSesiones(),
        listarHorarios(),
        listarUsuarios()
    ]);

    // 2. Mapear usuarios, sesiones y horarios para búsquedas rápidas
    const usuariosMap: Record<string, any> = {};
    if (Array.isArray(usuarios)) {
        usuarios.forEach((u: any) => {
            if (u.id) usuariosMap[String(u.id)] = u;
        });
    }

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

    // 3. Estructuras para almacenar los contadores de asistencia
    const estudianteMateriaMap: Record<string, {
        num_doc: string;
        nombres: string;
        apellidos: string;
        asignatura: string;
        cod_asignatura: string;
        total: number;
        presentes: number;
        docentesAsociados: Set<string>;
    }> = {};

    const docenteMateriaMap: Record<string, {
        docente_num_doc: string;
        nombres: string;
        apellidos: string;
        asignatura: string;
        cod_asignatura: string;
        grupo: string;
        total: number;
        presentes: number;
        docenteId: string;
    }> = {};

    // 4. Procesar cada registro de asistencia
    if (Array.isArray(asisList)) {
        asisList.forEach((a: any) => {
            const usuarioId = a.usuario_id ? String(a.usuario_id) : "";
            const sesionId = a.sesion_id ? String(a.sesion_id) : "";
            if (!usuarioId || !sesionId) return;

            const user = usuariosMap[usuarioId];
            if (!user) return;

            const session = sessionsMap[sesionId];
            const horarioId = session?.horario_id || a.horario_id;
            const horario = horarioId ? horariosMap[String(horarioId)] : null;
            if (!horario) return;

            const codAsig = horario.cod_asignatura || "";
            const asignatura = horario.asignatura || "";
            const grupo = horario.grupo || "";
            const docenteIdClass = String(horario.docente_id || "");

            // Determinar si es asistencia o inasistencia
            const estadoNorm = (a.estado || "").toLowerCase();
            const isPresent = estadoNorm === "asistencia" || estadoNorm === "asistencia con retraso" || estadoNorm === "presente" || estadoNorm === "tarde";
            const isAbsent = estadoNorm === "inasistencia" || estadoNorm === "ausente";

            if (!isPresent && !isAbsent) return;

            const rol = (user.rol || "").toLowerCase();

            if (rol === "docente") {
                const groupKey = `${user.id}-${codAsig}-${grupo}`;
                if (!docenteMateriaMap[groupKey]) {
                    docenteMateriaMap[groupKey] = {
                        docente_num_doc: user.num_doc,
                        nombres: user.nombres,
                        apellidos: user.apellidos,
                        asignatura: asignatura,
                        cod_asignatura: codAsig,
                        grupo: grupo,
                        total: 0,
                        presentes: 0,
                        docenteId: user.id
                    };
                }
                docenteMateriaMap[groupKey].total += 1;
                if (isPresent) {
                    docenteMateriaMap[groupKey].presentes += 1;
                }
            } else if (rol === "estudiante") {
                const studentKey = `${user.num_doc}-${codAsig}`;
                if (!estudianteMateriaMap[studentKey]) {
                    estudianteMateriaMap[studentKey] = {
                        num_doc: user.num_doc,
                        nombres: user.nombres,
                        apellidos: user.apellidos,
                        asignatura: asignatura,
                        cod_asignatura: codAsig,
                        total: 0,
                        presentes: 0,
                        docentesAsociados: new Set<string>()
                    };
                }
                estudianteMateriaMap[studentKey].total += 1;
                if (isPresent) {
                    estudianteMateriaMap[studentKey].presentes += 1;
                }
                if (docenteIdClass) {
                    estudianteMateriaMap[studentKey].docentesAsociados.add(docenteIdClass);
                }
            }
        });
    }

    // 5. Construir alertas filtrando según el rol que solicita (docenteId)
    const studentAlertas: AlertaDesercion[] = [];
    Object.values(estudianteMateriaMap).forEach(em => {
        if (em.total > 0) {
            const porcentaje = Math.round((em.presentes / em.total) * 100);
            if (porcentaje < 80) {
                // Si viene docenteId, solo mostramos si este docente le da clase al estudiante
                if (docenteId && !em.docentesAsociados.has(String(docenteId))) {
                    return;
                }
                studentAlertas.push({
                    id: `est-${em.num_doc}-${em.cod_asignatura}`,
                    nombres: em.nombres,
                    apellidos: em.apellidos,
                    num_doc: em.num_doc,
                    descripcion: `Asistencia de estudiante: ${porcentaje}% en ${em.asignatura} (${em.cod_asignatura})`,
                    isDocente: false
                });
            }
        }
    });

    const docenteAlertas: AlertaDesercion[] = [];
    Object.values(docenteMateriaMap).forEach(dm => {
        if (dm.total > 0) {
            const porcentaje = Math.round((dm.presentes / dm.total) * 100);
            if (porcentaje < 80) {
                // Si viene docenteId, solo mostramos la alerta de este docente
                if (docenteId && String(dm.docenteId) !== String(docenteId)) {
                    return;
                }
                docenteAlertas.push({
                    id: `doc-${dm.docente_num_doc}-${dm.cod_asignatura}-${dm.grupo}`,
                    nombres: dm.nombres,
                    apellidos: dm.apellidos,
                    num_doc: dm.docente_num_doc,
                    descripcion: `Asistencia de docente: ${porcentaje}% en ${dm.asignatura} (Grupo ${dm.grupo})`,
                    isDocente: true
                });
            }
        }
    });

    return [...studentAlertas, ...docenteAlertas];
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

