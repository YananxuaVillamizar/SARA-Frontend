"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    ClipboardCheck,
    Settings,
    LogOut,
    Bell,
    Calendar
} from "lucide-react";
import Link from "next/link";
import { getSesion, cerrarSesion } from "@/services/auth";
import api from "@/services/api";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {

    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isChecking, setIsChecking] = useState(true); // Bloquea el render inicial
    const pathname = usePathname();
    const router = useRouter();
    const [sesion, setSesion] = useState({ nombre: "", rol: "" });
    const [alertas, setAlertas] = useState<{ tipo: string; titulo: string; descripcion: string }[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    // Protección de ruta: si no hay token, vuelve al login
    useEffect(() => {
        const { token, nombre, rol, id } = getSesion();
        if (!token) {
            router.push("/");
            return; // No desactivamos isChecking — la pantalla queda en blanco hasta que redirige
        }
        setSesion({
            nombre: nombre || "Usuario",
            rol: rol || "Sin rol",
        });
        setIsChecking(false); // Solo mostramos el dashboard si hay sesión válida

        if (id) {
            const fetchAlertas = async () => {
                try {
                    const res = await api.get(`/dashboard/alertas/${id}`);
                    setAlertas(res.data);
                } catch (err) {
                    console.error("Error cargando alertas:", err);
                }
            };
            fetchAlertas();
            const interval = setInterval(fetchAlertas, 60000); // Refrescar cada minuto
            return () => clearInterval(interval);
        }
    }, []);


    const MENU_ROL: Record<string, string[]> = {
        "Administrativo": ["/dashboard", "/dashboard/usuarios", "/dashboard/asistencias", "/dashboard/config"],
        "Docente":        ["/dashboard", "/dashboard/asistencias", "/dashboard/horario"],
        "Estudiante":     ["/dashboard", "/dashboard/asistencias", "/dashboard/horario"],
    };

    const todosLosItems = [
        { icon: <LayoutDashboard size={20} />, label: "Panel General",  href: "/dashboard"             },
        { icon: <Users size={20} />,           label: "Usuarios",        href: "/dashboard/usuarios"    },
        { icon: <ClipboardCheck size={20} />,  label: "Asistencias",     href: "/dashboard/asistencias" },
        { icon: <Calendar size={20} />,        label: "Mi Horario",      href: "/dashboard/horario"     },
        { icon: <Settings size={20} />,        label: "Configuración",   href: "/dashboard/config"      },
    ];

    const menuItems = todosLosItems.filter(item =>
        (MENU_ROL[sesion.rol] ?? ["/dashboard"]).includes(item.href)
    );


    // Pantalla de espera mientras verificamos la sesión
    if (isChecking) {
        return (
            <div className="h-screen flex items-center justify-center bg-page-bg">
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold animate-pulse"
                        style={{ background: "#8B1A1A" }}
                    >
                        S
                    </div>
                    <p className="text-gray-400 text-sm font-medium">Verificando sesión...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="flex h-screen bg-page-bg">
            {/* SIDEBAR CON HOVER EXPAND */}
            <aside
                onMouseEnter={() => setIsCollapsed(false)}
                onMouseLeave={() => setIsCollapsed(true)}
                className={`bg-sidebar-bg text-white transition-[width] duration-300 ease-in-out flex flex-col z-30 shadow-2xl ${isCollapsed ? "w-[70px]" : "w-64"
                    }`}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-center border-b border-white/5 overflow-hidden relative">
                    <div className={`absolute transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100 delay-150'}`}>
                        <h1 className="text-2xl font-bold text-white tracking-tighter">
                            SARA<span className="text-sara-gold">.</span>
                        </h1>
                    </div>
                    <div className={`absolute transition-opacity duration-300 ${isCollapsed ? 'opacity-100 delay-150' : 'opacity-0'}`}>
                        <div className="w-10 h-10 bg-sara-red rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-sara-red/20">
                            S
                        </div>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 mt-6 px-3 space-y-2">
                    {menuItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={`flex items-center p-3 rounded-xl transition-all duration-200 group relative ${isActive
                                    ? "bg-sara-red text-white shadow-lg shadow-sara-red/30"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                {/* Indicador visual para modo colapsado */}
                                {isActive && isCollapsed && (
                                    <div className="absolute left-0 w-1 h-6 bg-sara-gold rounded-r-full" />
                                )}

                                <div className={`${isActive ? "text-white" : "group-hover:text-sara-gold"} shrink-0`}>
                                    {item.icon}
                                </div>

                                <span className={`ml-4 font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                                    isCollapsed 
                                        ? "opacity-0 w-0 overflow-hidden pointer-events-none ml-0" 
                                        : "opacity-100 w-auto"
                                }`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={() => { cerrarSesion(); router.push("/"); }}
                        className="w-full flex items-center p-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all group"
                    >
                        <div className="shrink-0"><LogOut size={20} /></div>
                        <span className={`ml-4 text-sm font-medium transition-all duration-300 ${
                            isCollapsed 
                                ? "opacity-0 w-0 overflow-hidden pointer-events-none ml-0" 
                                : "opacity-100 w-auto"
                        }`}>
                            Cerrar Sesión
                        </span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 z-10">
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">SARA Ecosystem</p>
                        <h2 className="text-xl font-extrabold text-sidebar-bg tracking-tight">Panel de Control</h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-400 hover:bg-page-bg rounded-full transition-colors focus:outline-none"
                            >
                                <Bell size={20} />
                                {alertas.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-sara-red rounded-full border-2 border-white animate-pulse"></span>
                                )}
                            </button>

                            {showNotifications && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowNotifications(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden transition-all duration-300">
                                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                            <h3 className="font-bold text-gray-800 text-sm">Notificaciones</h3>
                                            {alertas.length > 0 && (
                                                <span className="text-[10px] bg-sara-red/10 text-sara-red font-black px-2 py-0.5 rounded-full">
                                                    {alertas.length}
                                                </span>
                                            )}
                                        </div>
                                        <div className="max-h-72 overflow-y-auto">
                                            {alertas.length === 0 ? (
                                                <div className="p-8 text-center text-gray-400 text-xs">
                                                    No tienes alertas o notificaciones pendientes.
                                                </div>
                                            ) : (
                                                alertas.map((alerta, index) => {
                                                    return (
                                                        <div 
                                                            key={index} 
                                                            className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors"
                                                        >
                                                            <div className="flex gap-2">
                                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                                                    alerta.tipo === 'critical' ? 'bg-red-500' : alerta.tipo === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                                                }`} />
                                                                <div>
                                                                    <p className="text-xs font-bold text-gray-800">{alerta.titulo}</p>
                                                                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{alerta.descripcion}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pl-4 border-l border-gray-100">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-sidebar-bg">{sesion.nombre}</p>
                                <p className="text-[9px] text-sara-red font-black uppercase">{sesion.rol}</p>
                            </div>
                            {(() => {
                                const config: Record<string, { color: string; bg: string }> = {
                                    Administrativo: { color: "#8B1A1A", bg: "#FFF5F5" },
                                    Docente: { color: "#1D4ED8", bg: "#EFF6FF" },
                                    Estudiante: { color: "#065F46", bg: "#ECFDF5" },
                                };
                                const c = config[sesion.rol] ?? { color: "#374151", bg: "#F3F4F6" };
                                return (
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shadow-inner border border-gray-100/50 shrink-0"
                                        style={{ color: c.color, background: c.bg }}>
                                        {sesion.nombre.substring(0, 2).toUpperCase()}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <section className="flex-1 overflow-y-auto p-8 bg-page-bg">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </section>
            </main>
        </div>
    );
}