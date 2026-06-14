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
    const [alertas, setAlertas] = useState<{ tipo: string; titulo: string; descripcion: string; persistente?: boolean }[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showSessionMenu, setShowSessionMenu] = useState(false);

    const handleLimpiarNotificaciones = async () => {
        const { id } = getSesion();
        if (!id) return;
        try {
            await api.post(`/dashboard/alertas/${id}/limpiar`);
            setAlertas(prev => prev.filter(al => !al.persistente));
        } catch (err) {
            console.error("Error al limpiar notificaciones:", err);
        }
    };

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
                    <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 animate-pulse flex items-center justify-center">
                        <img 
                            src="/logo_sara.png" 
                            alt="SARA Logo" 
                            className="h-16 w-auto object-contain" 
                        />
                    </div>
                    <p className="text-gray-400 text-sm font-medium mt-2">Verificando sesión...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="flex h-screen bg-page-bg">
            {/* SIDEBAR CON HOVER EXPAND CON ESTILO DE INICIO DE SESIÓN */}
            <aside
                onMouseEnter={() => setIsCollapsed(false)}
                onMouseLeave={() => setIsCollapsed(true)}
                className={`bg-sidebar-bg text-white transition-[width] duration-300 ease-in-out hidden md:flex flex-col z-30 shadow-2xl ${isCollapsed ? "w-[70px]" : "w-64"
                    }`}
            >
                {/* Logo Section */}
                <div className="h-20 flex items-center justify-center border-b border-white/10 overflow-hidden px-4">
                    <div className="w-full flex items-center justify-center">
                        {isCollapsed ? (
                            <div className="bg-white p-1.5 rounded-xl shadow-lg border border-white/10 flex items-center justify-center w-11 h-11 transition-all duration-300">
                                <img 
                                    src="/logo_sara_mini.png" 
                                    alt="SARA" 
                                    className="h-7 w-auto object-contain transition-all duration-300" 
                                />
                            </div>
                        ) : (
                            <div className="bg-white/95 backdrop-blur-sm py-1.5 px-4 rounded-xl shadow-lg border border-white/10 flex items-center justify-center w-full max-w-[180px] transition-all duration-300">
                                <img 
                                    src="/logo_sara.png" 
                                    alt="SARA Logo" 
                                    className="h-9 w-auto object-contain transition-all duration-300" 
                                />
                            </div>
                        )}
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
                                    ? "bg-[#187e9e]/20 text-[#c9a84c] border-l-4 border-[#c9a84c] rounded-r-xl rounded-l-none shadow-md shadow-black/10"
                                    : "text-gray-300 hover:bg-white/5 hover:text-[#c9a84c]"
                                    }`}
                            >
                                {/* Indicador visual para modo colapsado */}
                                {isActive && isCollapsed && (
                                    <div className="absolute left-0 w-1 h-6 bg-[#c9a84c] rounded-r-full" />
                                )}

                                <div className={`${isActive ? "text-[#c9a84c]" : "group-hover:text-[#c9a84c]"} shrink-0`}>
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
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => { cerrarSesion(); router.push("/"); }}
                        className="w-full flex items-center p-3 rounded-xl text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all group"
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
            <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
                {/* Top Header */}
                <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 z-10">
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
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
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
                                             <div className="flex items-center gap-2">
                                                 <h3 className="font-bold text-gray-800 text-sm">Notificaciones</h3>
                                                 {alertas.length > 0 && (
                                                     <span className="text-[10px] bg-red-100 text-red-700 font-black px-2 py-0.5 rounded-full">
                                                         {alertas.length}
                                                     </span>
                                                 )}
                                             </div>
                                             {alertas.length > 0 && (
                                                 <button 
                                                     onClick={handleLimpiarNotificaciones}
                                                     className="text-[10px] text-red-600 font-bold hover:underline bg-transparent border-0 cursor-pointer focus:outline-none flex items-center gap-1 transition-all"
                                                 >
                                                     Limpiar todo
                                                 </button>
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

                        <div className="relative">
                            <button
                                onClick={() => setShowSessionMenu(!showSessionMenu)}
                                className="flex items-center gap-3 pl-4 border-l border-gray-100 focus:outline-none cursor-pointer text-left"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold text-sidebar-bg">{sesion.nombre}</p>
                                    <p className="text-[9px] text-[#c9a84c] font-black uppercase">{sesion.rol}</p>
                                </div>
                                {(() => {
                                    const config: Record<string, { color: string; bg: string }> = {
                                        Administrativo: { color: "#0e5d75", bg: "#E2F1F4" },
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
                            </button>

                            {showSessionMenu && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setShowSessionMenu(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                        <div className="p-4 border-b border-gray-50 bg-gray-50/30 text-left">
                                            <p className="text-xs font-bold text-gray-800 break-words">{sesion.nombre}</p>
                                            <p className="text-[10px] text-[#c9a84c] font-black uppercase mt-0.5">{sesion.rol}</p>
                                        </div>
                                        <button
                                            onClick={() => { cerrarSesion(); router.push("/"); }}
                                            className="w-full flex items-center gap-2 p-3 text-left text-xs font-bold text-red-600 hover:bg-red-50/50 transition-colors focus:outline-none"
                                        >
                                            <LogOut size={14} />
                                            <span>Cerrar Sesión</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <section className="flex-1 overflow-y-auto p-4 md:p-8 bg-page-bg">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </section>
            </main>

            {/* BOTTOM NAVIGATION FOR MOBILE */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar-bg border-t border-white/10 flex items-center justify-around z-30 px-2 shadow-[0_-4px_16px_rgba(0,0,0,0.15)]">
                {menuItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={index}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all duration-200 ${
                                isActive ? "text-[#c9a84c]" : "text-gray-400 hover:text-gray-200"
                            }`}
                        >
                            <div className="shrink-0">{item.icon}</div>
                            <span className="text-[10px] font-medium mt-1 select-none">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}