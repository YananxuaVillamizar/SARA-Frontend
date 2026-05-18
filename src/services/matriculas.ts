import api from "./api";

export interface Matricula {
    id: string;
    semestre: number;
    estado: string;
    grupo: string;
    fecha_inicio: string;
    estudiante: string;
    apellido_estudiante: string;
    num_doc: string;
    programa: string;
    asignatura: string;
    cod_asignatura: string;
    asignatura_id: string;
    facultad: string;
}

export const listarMatriculas = async (): Promise<Matricula[]> =>
    (await api.get("/matriculas/")).data;

export const crearMatricula = async (data: {
    usuario_id: string;
    programa_id: string;
    asignatura_id: string;
    grupo: string;
    semestre: number;
    fecha_inicio: string;
    estado?: string;
}) => (await api.post("/matriculas/", data)).data;

export const actualizarMatricula = async (id: string, data: { estado?: string; grupo?: string; semestre?: number }) =>
    (await api.put(`/matriculas/${id}`, data)).data;

export const eliminarMatricula = async (id: string) =>
    (await api.delete(`/matriculas/${id}`)).data;