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
    // 1. Obtener todos los datos necesarios en paralelo
    const [asisList, horarios, usuarios] = await Promise.all([
        listarAsistencias(docenteId ? { docente_id: docenteId } : undefined),
        listarHorarios(),
        listarUsuarios()
    ]);

    // 2. Mapear usuarios y horarios para búsquedas rápidas
    const userByDocMap: Record<string, any> = {};
    if (Array.isArray(usuarios)) {
        usuarios.forEach((u: any) => {
            if (u.num_doc) userByDocMap[String(u.num_doc)] = u;
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
    }> = {};

    const processedTeacherSessions = new Set<string>();

    // 4. Procesar cada registro de asistencia
    if (Array.isArray(asisList)) {
        asisList.forEach((a: any) => {
            const sesionId = a.sesion_id ? String(a.sesion_id) : "";
            // Si no hay sesión válida o es clase futura sintética, ignorar
            if (!sesionId || sesionId === "null") return;

            const horarioId = a.horario_id;
            const horario = horarioId ? horariosMap[String(horarioId)] : null;

            const codAsig = horario?.cod_asignatura || a.cod_asignatura || "";
            const asignatura = horario?.asignatura || a.asignatura || "";
            const grupo = horario?.grupo || a.grupo || "";

            if (!codAsig) return;

            // --- PROCESAR ESTUDIANTE ---
            if (a.num_doc) {
                const studentUser = userByDocMap[String(a.num_doc)];
                if (studentUser) {
                    const estadoNorm = (a.estado || "").toLowerCase();
                    const isStudentPresent = estadoNorm === "asistencia" || estadoNorm === "asistencia con retraso" || estadoNorm === "presente" || estadoNorm === "tarde";
                    const isStudentAbsent = estadoNorm === "inasistencia" || estadoNorm === "ausente";

                    if (isStudentPresent || isStudentAbsent) {
                        const studentKey = `${studentUser.num_doc}-${codAsig}`;
                        if (!estudianteMateriaMap[studentKey]) {
                            estudianteMateriaMap[studentKey] = {
                                num_doc: studentUser.num_doc,
                                nombres: studentUser.nombres,
                                apellidos: studentUser.apellidos,
                                asignatura: asignatura,
                                cod_asignatura: codAsig,
                                total: 0,
                                presentes: 0
                            };
                        }
                        estudianteMateriaMap[studentKey].total += 1;
                        if (isStudentPresent) {
                            estudianteMateriaMap[studentKey].presentes += 1;
                        }
                    }
                }
            }

            // --- PROCESAR DOCENTE ---
            if (a.docente_num_doc) {
                const teacherUser = userByDocMap[String(a.docente_num_doc)];
                if (teacherUser) {
                    const sessionKey = `${teacherUser.id}-${sesionId}`;
                    if (!processedTeacherSessions.has(sessionKey)) {
                        const docEstadoNorm = (a.docente_estado_asistencia || "").toLowerCase();
                        const isTeacherPresent = docEstadoNorm === "presente" || docEstadoNorm === "tarde" || docEstadoNorm === "asistencia" || docEstadoNorm === "asistencia con retraso" || a.docente_asistio === true;
                        const isTeacherAbsent = docEstadoNorm === "inasistencia" || docEstadoNorm === "ausente" || a.docente_asistio === false;

                        if (isTeacherPresent || isTeacherAbsent) {
                            processedTeacherSessions.add(sessionKey);
                            const teacherKey = `${teacherUser.num_doc}-${codAsig}-${grupo}`;
                            if (!docenteMateriaMap[teacherKey]) {
                                docenteMateriaMap[teacherKey] = {
                                    docente_num_doc: teacherUser.num_doc,
                                    nombres: teacherUser.nombres,
                                    apellidos: teacherUser.apellidos,
                                    asignatura: asignatura,
                                    cod_asignatura: codAsig,
                                    grupo: grupo,
                                    total: 0,
                                    presentes: 0
                                };
                            }
                            docenteMateriaMap[teacherKey].total += 1;
                            if (isTeacherPresent) {
                                docenteMateriaMap[teacherKey].presentes += 1;
                            }
                        }
                    }
                }
            }
        });
    }

    // 5. Construir alertas: solo usuarios con total > 0 y porcentaje < 80%
    const studentAlertas: AlertaDesercion[] = [];
    Object.values(estudianteMateriaMap).forEach(em => {
        if (em.total > 0) {
            const porcentaje = Math.round((em.presentes / em.total) * 100);
            if (porcentaje < 80) {
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

