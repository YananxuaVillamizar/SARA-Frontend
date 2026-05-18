// src/services/auth.ts
import api from "./api";

export interface LoginResponse {
    access_token: string;
    token_type: string;
    rol: string;
    nombres: string;
    num_doc: string;
    id: string;
}

export async function loginUsuario(
    email: string,
    password: string
): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
    });
    return response.data;
}

export function guardarSesion(data: LoginResponse) {
    // localStorage para el frontend
    localStorage.setItem("sara_token", data.access_token);
    localStorage.setItem("sara_rol", data.rol);
    localStorage.setItem("sara_nombre", data.nombres);
    localStorage.setItem("sara_num_doc", data.num_doc);
    localStorage.setItem("sara_id", data.id);
    // Cookie para que el Middleware del servidor pueda verificarla
    document.cookie = `sara_token=${data.access_token}; path=/; max-age=28800; SameSite=Strict`;
}

export function cerrarSesion() {
    localStorage.removeItem("sara_token");
    localStorage.removeItem("sara_rol");
    localStorage.removeItem("sara_nombre");
    localStorage.removeItem("sara_num_doc");
    localStorage.removeItem("sara_id");
    // Eliminar la cookie también
    document.cookie = "sara_token=; path=/; max-age=0";
}

export const getSesion = () => {
    if (typeof window === "undefined") return { token: null, rol: null, nombre: null, num_doc: null, id: null };
    return {
        token: localStorage.getItem("sara_token"),
        rol: localStorage.getItem("sara_rol"),
        nombre: localStorage.getItem("sara_nombre"),
        num_doc: localStorage.getItem("sara_num_doc"),
        id: localStorage.getItem("sara_id"),
    };
};
