import api from "./api";

export const listarTodasContingencias = async () => (await api.get("/contingencias/")).data;
export const listarContingenciasPendientes = async () => (await api.get("/contingencias/pendientes")).data;
export const listarContingenciasEstudiante = async (num_doc: string) => (await api.get(`/contingencias/estudiante/${num_doc}`)).data;

export const crearContingencia = async (data: {
    asistencia_id?: string;
    solicitante_id: string;
    tipo: string;
    descripcion: string;
    archivo_url?: string;
}) => (await api.post("/contingencias/", data)).data;

export const revisarContingencia = async (id: string, data: {
    revisor_id: string;
    estado: string; // "aprobada" o "rechazada"
}) => (await api.put(`/contingencias/${id}/revisar`, data)).data;

export const listarSesiones = async () => (await api.get("/contingencias/sesiones")).data;

export const crearSesion = async (data: {
    horario_id: string;
    fecha: string;
    docente_asistio: boolean;
    motivo_ausencia_docente?: string;
    creado_por: string;
}) => (await api.post("/contingencias/sesiones", data)).data;
