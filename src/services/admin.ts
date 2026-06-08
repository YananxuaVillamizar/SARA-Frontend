import api from "./api";

export interface Facultad { id: string; nombre: string; codigo: string; }
export interface Programa { id: string; nombre: string; codigo: string; facultad: string; facultad_id: string; }
export interface Asignatura { id: string; nombre: string; codigo: string; creditos: number; programa: string; facultad: string; programa_id: string; facultad_id: string; }
export interface Horario {
    id: string;
    asignatura_id: string;
    docente_id: string;
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
    aula: string;
    asignatura: string;
    cod_asignatura: string;
    docente: string;
    apellido_docente: string;
    grupo: string;
    cupo_maximo: number;
    matriculados: number;
    facultad: string;
    programa: string;
}

export const listarFacultades = async (): Promise<Facultad[]> => (await api.get("/admin/facultades")).data;
export const crearFacultad = async (d: { nombre: string; codigo: string }) => (await api.post("/admin/facultades", d)).data;
export const actualizarFacultad = async (id: string, d: { nombre: string; codigo: string }) => (await api.put(`/admin/facultades/${id}`, d)).data;
export const eliminarFacultad = async (id: string) => (await api.delete(`/admin/facultades/${id}`)).data;

export const listarProgramas = async (): Promise<Programa[]> => (await api.get("/admin/programas")).data;
export const crearPrograma = async (d: { nombre: string; codigo: string; facultad_id: string }) => (await api.post("/admin/programas", d)).data;
export const actualizarPrograma = async (id: string, d: { nombre: string; codigo: string; facultad_id: string }) => (await api.put(`/admin/programas/${id}`, d)).data;
export const eliminarPrograma = async (id: string) => (await api.delete(`/admin/programas/${id}`)).data;

export const listarAsignaturas = async (): Promise<Asignatura[]> => (await api.get("/admin/asignaturas")).data;
export const crearAsignatura = async (d: { nombre: string; codigo: string; creditos: number; programa_id: string; facultad_id: string }) => (await api.post("/admin/asignaturas", d)).data;
export const actualizarAsignatura = async (id: string, d: { nombre: string; codigo: string; creditos: number; programa_id: string; facultad_id: string }) => (await api.put(`/admin/asignaturas/${id}`, d)).data;
export const eliminarAsignatura = async (id: string) => (await api.delete(`/admin/asignaturas/${id}`)).data;

export const listarHorarios = async (): Promise<Horario[]> => (await api.get("/admin/horarios")).data;
export const crearHorario = async (d: { asignatura_id: string; docente_id: string; dia_semana: string; hora_inicio: string; hora_fin: string; aula: string; grupo: string; cupo_maximo: number }) => (await api.post("/admin/horarios", d)).data;
export const actualizarHorario = async (id: string, d: { asignatura_id: string; docente_id: string; dia_semana: string; hora_inicio: string; hora_fin: string; aula: string; grupo: string; cupo_maximo: number }, force?: boolean) => (await api.put(`/admin/horarios/${id}${force ? "?force=true" : ""}`, d)).data;
export const eliminarHorario = async (id: string) => (await api.delete(`/admin/horarios/${id}`)).data;

export interface Rol { id: string; nombre: string; }
export const listarRoles = async (): Promise<Rol[]> => (await api.get("/admin/roles")).data;

export interface Semestre { id: string; nombre: string; fecha_inicio: string; fecha_fin: string; activo: boolean; estado?: string; }
export const listarSemestres = async (): Promise<Semestre[]> => (await api.get("/admin/semestres")).data;
export const crearSemestre = async (d: { nombre: string; fecha_inicio: string; fecha_fin: string; activo: boolean; estado?: string }) => (await api.post("/admin/semestres", d)).data;
export const actualizarSemestre = async (id: string, d: { nombre: string; fecha_inicio: string; fecha_fin: string; activo: boolean; estado?: string }) => (await api.put(`/admin/semestres/${id}`, d)).data;
export const eliminarSemestre = async (id: string) => (await api.delete(`/admin/semestres/${id}`)).data;

