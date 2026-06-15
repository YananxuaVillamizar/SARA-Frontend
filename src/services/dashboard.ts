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
}

export async function obtenerAlertasDesercion(docenteId?: string): Promise<AlertaDesercion[]> {
    const asisList = await listarAsistencias(docenteId ? { docente_id: docenteId } : undefined);
    
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
        if (!a.num_doc) return;
        if (a.docente_asistio === false) return;
        
        const key = `${a.num_doc}-${a.cod_asignatura}`;
        if (!estudianteMateriaMap[key]) {
            estudianteMateriaMap[key] = {
                num_doc: a.num_doc,
                nombres: a.nombre_estudiante || a.nombre || "",
                apellidos: a.apellido_estudiante || a.apellido || "",
                asignatura: a.asignatura || "",
                cod_asignatura: a.cod_asignatura || "",
                total: 0,
                presentes: 0
            };
        }
        
        estudianteMateriaMap[key].total += 1;
        const estadoNorm = (a.estado || "").toLowerCase();
        if (estadoNorm === "asistencia" || estadoNorm === "asistencia con retraso" || estadoNorm === "presente" || estadoNorm === "tarde") {
            estudianteMateriaMap[key].presentes += 1;
        }
    });
    
    const alertas: AlertaDesercion[] = [];
    Object.values(estudianteMateriaMap).forEach(em => {
        if (em.total > 0) {
            const porcentaje = Math.round((em.presentes / em.total) * 100);
            if (porcentaje < 80) {
                alertas.push({
                    id: `${em.num_doc}-${em.cod_asignatura}`,
                    nombres: em.nombres,
                    apellidos: em.apellidos,
                    num_doc: em.num_doc,
                    descripcion: `Asistencia de ${porcentaje}% en ${em.asignatura} (${em.cod_asignatura})`
                });
            }
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

