import api from "./api";

export interface Usuario {
    id: string;
    nombres: string;
    apellidos: string;
    tipo_doc: string;
    num_doc: string;
    email: string;
    activo: boolean;
    autoriza_biometria: boolean;
    rol: string;
    pin?: string;
}

export interface UsuarioCrear {
    rol_id: string;
    nombres: string;
    apellidos: string;
    tipo_doc: string;
    num_doc: string;
    email: string;
    password: string;
    autoriza_biometria: boolean;
}

export async function listarUsuarios(): Promise<Usuario[]> {
    const res = await api.get("/usuarios/");
    return res.data;
}

export async function crearUsuario(datos: UsuarioCrear) {
    const res = await api.post("/usuarios/", datos);
    return res.data;
}

export async function obtenerUsuario(num_doc: string): Promise<Usuario> {
    const res = await api.get(`/usuarios/${num_doc}`);
    return res.data;
}

export async function generarPinSeguro(): Promise<{ pin: string }> {
    const res = await api.get("/usuarios/generar-pin-seguro");
    return res.data;
}

export const actualizarUsuario = async (
    num_doc: string,
    datos: {
        activo?: boolean;
        nombres?: string;
        apellidos?: string;
        email?: string;
        autoriza_biometria?: boolean;
        tipo_doc?: string;
        num_doc?: string;
        password?: string;
        pin?: string;
        solicitante_id?: string;
    }
) => (await api.put(`/usuarios/${num_doc}`, datos)).data;
