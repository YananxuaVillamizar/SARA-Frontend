import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Decodifica el payload del JWT sin necesitar la clave secreta
// (solo para leer el rol — la verificación real la hace el backend)
function getRolFromToken(token: string): string {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.rol ?? "";
    } catch {
        return "";
    }
}

// Rutas que solo puede ver el Administrador
const SOLO_ADMIN = ["/dashboard/usuarios", "/dashboard/config"];

export function proxy(request: NextRequest) {
    const token = request.cookies.get("sara_token")?.value;
    const { pathname } = request.nextUrl;

    // 1. Sin token intentando entrar al dashboard → login
    if (pathname.startsWith("/dashboard") && !token) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // 2. Con token intentando entrar al login → dashboard
    if (pathname === "/" && token) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // 3. Rutas exclusivas de Administrador
    if (token && SOLO_ADMIN.some(ruta => pathname.startsWith(ruta))) {
        const rol = getRolFromToken(token);
        if (rol !== "Administrativo") {
            // Redirige al panel principal con un mensaje de acceso denegado
            const url = new URL("/dashboard", request.url);
            url.searchParams.set("acceso", "denegado");
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/dashboard/:path*"],
};
