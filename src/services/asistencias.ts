import api from "./api";

export const obtenerReporteEstudiante = async (num_doc: string) => {
    const res = await api.get(`/asistencias/reporte/${num_doc}`);
    return res.data;
};

export const obtenerReporteDocente = async (num_doc: string) => {
    const res = await api.get(`/asistencias/docente/${num_doc}`);
    return res.data;
};

export const listarAsistencias = async (params?: { docente_id?: string, usuario_id?: string }) => {
    const res = await api.get(`/asistencias/`, { params });
    return res.data;
};

export const crearAsistencia = async (datos: any) => {
    const res = await api.post(`/asistencias/`, datos);
    return res.data;
};

export const actualizarAsistencia = async (id: string, datos: any) => {
    const res = await api.put(`/asistencias/${id}`, datos);
    return res.data;
};
