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

export interface AlertaDesercion {
    id: string;
    nombres: string;
    apellidos: string;
    num_doc: string;
    descripcion: string;
    isDocente?: boolean;
}

export async function obtenerAlertasDesercion(docenteId?: string): Promise<AlertaDesercion[]> {
    const asisList = await listarAsistencias(docenteId ? { docente_id: docenteId } : undefined);
    
    // 1. Consolidar información de sesiones por sesion_id o fecha para evitar inconsistencias
    const sessionConsolidation: Record<string, {
        sesion_id: string;
        fecha: string;
        cod_asignatura: string;
        asignatura: string;
        grupo: string;
        docente_num_doc: string;
        nombre_docente: string;
        apellido_docente: string;
        docente_estado: "presente" | "ausente" | null;
    }> = {};

    asisList.forEach((a: any) => {
        const sesionId = a.sesion_id ? String(a.sesion_id) : "";
        const sessionKey = sesionId || `${a.fecha || "sin-fecha"}-${a.cod_asignatura || "sin-asig"}-${a.grupo || "sin-grupo"}`;

        if (!sessionConsolidation[sessionKey]) {
            sessionConsolidation[sessionKey] = {
                sesion_id: sesionId,
                fecha: a.fecha || "",
                cod_asignatura: "",
                asignatura: "",
                grupo: "",
                docente_num_doc: "",
                nombre_docente: "",
                apellido_docente: "",
                docente_estado: null
            };
        }

        const s = sessionConsolidation[sessionKey];

        // Consolidar información no vacía de asignatura y grupo
        if (a.cod_asignatura && !s.cod_asignatura) {
            s.cod_asignatura = a.cod_asignatura;
            s.asignatura = a.asignatura || "";
        }
        if (a.grupo && !s.grupo) {
            s.grupo = a.grupo;
        }

        // Consolidar información de docente
        if (a.docente_num_doc && !s.docente_num_doc) {
            s.docente_num_doc = a.docente_num_doc;
            s.nombre_docente = a.nombre_docente || a.docente_nombre || "";
            s.apellido_docente = a.apellido_docente || a.docente_apellido || "";
        }

        // Determinar estado de asistencia del docente
        const docEstado = (a.docente_estado_asistencia || "").toLowerCase();
        const isDocPresent = docEstado === "presente" || docEstado === "tarde" || docEstado === "asistencia" || docEstado === "asistencia con retraso" || a.docente_asistio === true;
        const isDocAbsent = docEstado === "inasistencia" || docEstado === "ausente" || a.docente_asistio === false;

        if (isDocPresent) {
            s.docente_estado = "presente";
        } else if (isDocAbsent && s.docente_estado !== "presente") {
            s.docente_estado = "ausente";
        }
    });

    // 2. Alertas de Estudiantes
    const estudianteMateriaMap: Record<string, {
        num_doc: string;
        nombres: string;
        apellidos: string;
        asignatura: string;
        cod_asignatura: string;
        total: number;
        presentes: number;
    }> = {};

    asisList.forEach((a: any) => {
        const sesionId = a.sesion_id ? String(a.sesion_id) : "";
        const sessionKey = sesionId || `${a.fecha || "sin-fecha"}-${a.cod_asignatura || "sin-asig"}-${a.grupo || "sin-grupo"}`;
        
        const s = sessionConsolidation[sessionKey];
        if (!s) return;

        // Se usa la información resuelta a partir de la consolidación de la sesión
        const codAsig = s.cod_asignatura || a.cod_asignatura || "";
        const asignatura = s.asignatura || a.asignatura || "";

        // Solo si el estudiante está definido y el docente sí asistió a esa clase
        if (a.num_doc && s.docente_estado === "presente") {
            const key = `${a.num_doc}-${codAsig}`;
            const estadoNorm = (a.estado || "").toLowerCase();
            
            const isPresent = estadoNorm === "asistencia" || estadoNorm === "asistencia con retraso" || estadoNorm === "presente" || estadoNorm === "tarde";
            const isAbsent = estadoNorm === "inasistencia" || estadoNorm === "ausente";
            
            if (isPresent || isAbsent) {
                if (!estudianteMateriaMap[key]) {
                    estudianteMateriaMap[key] = {
                        num_doc: a.num_doc,
                        nombres: a.nombre_estudiante || a.nombre || "",
                        apellidos: a.apellido_estudiante || a.apellido || "",
                        asignatura: asignatura,
                        cod_asignatura: codAsig,
                        total: 0,
                        presentes: 0
                    };
                }
                
                estudianteMateriaMap[key].total += 1;
                if (isPresent) {
                    estudianteMateriaMap[key].presentes += 1;
                }
            }
        }
    });
    
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

    // 3. Alertas de Docentes
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

    Object.values(sessionConsolidation).forEach(s => {
        if (!s.docente_num_doc || !s.cod_asignatura || !s.grupo) return;
        if (s.docente_estado === null) return; // Se omiten sesiones donde no hay registro marcado para el docente

        const groupKey = `${s.docente_num_doc}-${s.cod_asignatura}-${s.grupo}`;

        if (!docenteMateriaMap[groupKey]) {
            docenteMateriaMap[groupKey] = {
                docente_num_doc: s.docente_num_doc,
                nombres: s.nombre_docente,
                apellidos: s.apellido_docente,
                asignatura: s.asignatura,
                cod_asignatura: s.cod_asignatura,
                grupo: s.grupo,
                total: 0,
                presentes: 0
            };
        }

        docenteMateriaMap[groupKey].total += 1;
        if (s.docente_estado === "presente") {
            docenteMateriaMap[groupKey].presentes += 1;
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

