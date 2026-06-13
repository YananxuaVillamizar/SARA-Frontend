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
    // sessionStorage para el frontend (aislado por pestaña)
    sessionStorage.setItem("sara_token", data.access_token);
    sessionStorage.setItem("sara_rol", data.rol);
    sessionStorage.setItem("sara_nombre", data.nombres);
    sessionStorage.setItem("sara_num_doc", data.num_doc);
    sessionStorage.setItem("sara_id", data.id);
    // Cookie para que el Middleware del servidor pueda verificarla
    document.cookie = `sara_token=${data.access_token}; path=/; max-age=28800; SameSite=Strict`;
}

export function cerrarSesion() {
    sessionStorage.removeItem("sara_token");
    sessionStorage.removeItem("sara_rol");
    sessionStorage.removeItem("sara_nombre");
    sessionStorage.removeItem("sara_num_doc");
    sessionStorage.removeItem("sara_id");
    // Eliminar la cookie también
    document.cookie = "sara_token=; path=/; max-age=0";
}

export const getSesion = () => {
    if (typeof window === "undefined") return { token: null, rol: null, nombre: null, num_doc: null, id: null };
    return {
        token: sessionStorage.getItem("sara_token"),
        rol: sessionStorage.getItem("sara_rol"),
        nombre: sessionStorage.getItem("sara_nombre"),
        num_doc: sessionStorage.getItem("sara_num_doc"),
        id: sessionStorage.getItem("sara_id"),
    };
};
