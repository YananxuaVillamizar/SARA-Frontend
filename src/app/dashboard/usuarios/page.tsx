"use client";

import React, { useEffect, useState } from "react";
import { Users, Plus, Search, X, CheckCircle, XCircle, Shield, GraduationCap, BookOpen, Pencil, Eye, EyeOff, Key, RefreshCw } from "lucide-react";
import { listarUsuarios, crearUsuario, actualizarUsuario, obtenerUsuario, generarPinSeguro, Usuario } from "@/services/usuarios";
import { listarRoles, Rol } from "@/services/admin";

// ── Helpers visuales ──────────────────────────────────────────
const RolBadge = ({ rol }: { rol: string }) => {
    const config: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
        Administrativo: { color: "#8B1A1A", bg: "#FFF5F5", icon: <Shield size={11} /> },
        Docente: { color: "#1D4ED8", bg: "#EFF6FF", icon: <BookOpen size={11} /> },
        Estudiante: { color: "#065F46", bg: "#ECFDF5", icon: <GraduationCap size={11} /> },
    };
    const c = config[rol] ?? { color: "#6B7280", bg: "#F3F4F6", icon: null };
    return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold"
            style={{ color: c.color, background: c.bg }}>
            {c.icon} {rol}
        </span>
    );
};

const EstadoBadge = ({ activo }: { activo: boolean }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${activo ? "text-green-700 bg-green-50" : "text-red-600 bg-red-50"
        }`}>
        {activo ? <CheckCircle size={11} /> : <XCircle size={11} />}
        {activo ? "Activo" : "Inactivo"}
    </span>
);


// ── Formulario de creación ────────────────────────────────────
const FORM_INICIAL = {
    rol_id: "", nombres: "", apellidos: "",
    tipo_doc: "CC", num_doc: "", email: "", password: "",
    autoriza_biometria: false,
};

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [mostrarForm, setMostrarForm] = useState(false);
    const [form, setForm] = useState(FORM_INICIAL);
    const [guardando, setGuardando] = useState(false);
    const [errorForm, setErrorForm] = useState("");
    const [exitoMsg, setExitoMsg] = useState("");
    const [roles, setRoles] = useState<Rol[]>([]);

    const [mostrarFormEdit, setMostrarFormEdit] = useState(false);
    const [editUsuario, setEditUsuario] = useState<Usuario | null>(null);
    const [formEdit, setFormEdit] = useState({
        nombres: "", apellidos: "", tipo_doc: "CC", num_doc: "", email: "", password: "",
        activo: true, autoriza_biometria: false, pin: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [editConfirmWarning, setEditConfirmWarning] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [confirmingPinRegen, setConfirmingPinRegen] = useState(false);
    const [isGeneratingPin, setIsGeneratingPin] = useState(false);

    // Cargar usuarios al montar
    useEffect(() => {
        cargarUsuarios();
        listarRoles().then(r => {
            setRoles(r);
            if (r.length > 0) setForm(f => ({ ...f, rol_id: r[0].id }));
        }).catch(() => { });
    }, []);

    async function cargarUsuarios() {
        setCargando(true);
        try {
            const data = await listarUsuarios();
            setUsuarios(data);
        } catch {
            console.error("Error al cargar usuarios");
        } finally {
            setCargando(false);
        }
    }

    // Filtro de búsqueda local
    const usuariosFiltrados = usuarios.filter(u =>
        `${u.nombres} ${u.apellidos} ${u.num_doc} ${u.email}`
            .toLowerCase()
            .includes(busqueda.toLowerCase())
    );

    async function handleCrear(e: React.FormEvent) {
        e.preventDefault();
        setGuardando(true);
        setErrorForm("");
        try {
            const res = await crearUsuario({ ...form, autoriza_biometria: form.autoriza_biometria });
            if (res.pin) {
                setExitoMsg(`✅ Usuario creado correctamente. El PIN de acceso asignado es: ${res.pin}. Compártelo de forma segura.`);
            } else {
                setExitoMsg("✅ Usuario creado correctamente.");
            }
            setForm(FORM_INICIAL);
            setMostrarForm(false);
            cargarUsuarios(); // Recargar tabla
            setTimeout(() => setExitoMsg(""), 7000);
        } catch (err: any) {
            setErrorForm(err?.response?.data?.detail || "Error al crear el usuario.");
        } finally {
            setGuardando(false);
        }
    }

    async function handleEditarSubmit(e: React.FormEvent, force: boolean = false) {
        if (e) e.preventDefault();
        if (!editUsuario) return;

        // Validaciones de advertencia
        if (!force) {
            let warnings = [];
            if (editUsuario.activo && !formEdit.activo) {
                warnings.push("Al desactivar al usuario se eliminarán las matrículas u horarios asignados a él de forma permanente. Sus registros de asistencia previos prevalecerán.");
            }
            if (editUsuario.autoriza_biometria && !formEdit.autoriza_biometria) {
                warnings.push("Al revocar este permiso se eliminarán los templates biométricos registrados de la base de datos de forma irreversible.");
            }

            if (warnings.length > 0) {
                setEditConfirmWarning(warnings.join("\n\n"));
                return;
            }
        }

        setGuardando(true);
        setErrorForm("");
        try {
            const payload: any = {
                nombres: formEdit.nombres,
                apellidos: formEdit.apellidos,
                tipo_doc: formEdit.tipo_doc,
                num_doc: formEdit.num_doc,
                email: formEdit.email,
                activo: formEdit.activo,
                autoriza_biometria: formEdit.autoriza_biometria
            };
            if (formEdit.password && formEdit.password.trim() !== "") {
                payload.password = formEdit.password;
            }
            if (editUsuario.rol === "Docente" || editUsuario.rol === "Administrativo") {
                payload.pin = formEdit.pin;
            }
            await actualizarUsuario(editUsuario.num_doc, payload);
            setExitoMsg("✅ Usuario actualizado correctamente.");
            setEditConfirmWarning("");
            setMostrarFormEdit(false);
            cargarUsuarios();
            setTimeout(() => setExitoMsg(""), 4000);
        } catch (err: any) {
            setErrorForm(err?.response?.data?.detail || "Error al actualizar el usuario.");
        } finally {
            setGuardando(false);
        }
    }

    async function openEditModal(u: Usuario) {
        setEditUsuario(u);
        setFormEdit({
            nombres: u.nombres,
            apellidos: u.apellidos,
            tipo_doc: u.tipo_doc || "CC",
            num_doc: u.num_doc,
            email: u.email,
            password: "",
            activo: u.activo,
            autoriza_biometria: u.autoriza_biometria,
            pin: u.rol === "Docente" || u.rol === "Administrativo" ? "Cargando..." : ""
        });
        setErrorForm("");
        setEditConfirmWarning("");
        setShowPin(false);
        setConfirmingPinRegen(false);
        setMostrarFormEdit(true);

        if (u.rol === "Docente" || u.rol === "Administrativo") {
            try {
                const fullUser = await obtenerUsuario(u.num_doc);
                setFormEdit(f => ({ ...f, pin: fullUser.pin || "Sin PIN asignado" }));
            } catch (err) {
                console.error("Error al obtener PIN del usuario", err);
                setFormEdit(f => ({ ...f, pin: "Error al cargar PIN" }));
            }
        }
    }

    async function handleRegenerarPin() {
        setIsGeneratingPin(true);
        try {
            const res = await generarPinSeguro();
            setFormEdit(f => ({ ...f, pin: res.pin }));
            setShowPin(true);
            setConfirmingPinRegen(false);
        } catch (err) {
            console.error("Error al generar PIN libre", err);
            setErrorForm("No se pudo generar un PIN seguro. Inténtalo de nuevo.");
        } finally {
            setIsGeneratingPin(false);
        }
    }

    const inputClass = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-sara-red transition-all";

    return (
        <div className="space-y-6">

            {/* Mensaje de éxito */}
            {exitoMsg && (
                <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                    {exitoMsg}
                </div>
            )}

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold" style={{ color: "#1A1A2E" }}>Gestión de Usuarios</h1>
                    <p className="text-gray-400 text-sm mt-1">{usuarios.length} usuarios registrados en el sistema</p>
                </div>
                <button
                    onClick={() => { setMostrarForm(true); setErrorForm(""); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
                    style={{ background: "#8B1A1A", boxShadow: "0 4px 12px #8B1A1A40" }}
                >
                    <Plus size={18} /> Nuevo Usuario
                </button>
            </div>

            {/* Barra de búsqueda */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nombre, documento o correo..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-gray-100 text-sm outline-none focus:border-sara-red transition-all"
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                />
                {busqueda && (
                    <button onClick={() => setBusqueda("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

                {cargando ? (
                    <div className="p-16 text-center text-gray-400 text-sm">Cargando usuarios...</div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="p-16 text-center">
                        <Users size={40} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-400 text-sm">No se encontraron usuarios.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr style={{ background: "#F9FAFB" }}>
                                <th className="px-4 py-4 text-left text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Usuario</th>
                                <th className="px-2 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Tipo de Documento</th>
                                <th className="px-4 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Documento</th>
                                <th className="px-6 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Correo</th>
                                <th className="px-6 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Rol</th>
                                <th className="px-6 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Estado</th>
                                <th className="px-6 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Biometría</th>
                                <th className="px-6 py-4 text-center text-[11px] font-black text-gray-400 uppercase tracking-wider font-sans">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {usuariosFiltrados.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors font-sans">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                style={{
                                                    background: 
                                                        u.rol === "Administrativo" ? "#8B1A1A" : 
                                                        u.rol === "Docente" ? "#1D4ED8" : 
                                                        u.rol === "Estudiante" ? "#065F46" : "#6B7280"
                                                }}>
                                                {(u.nombres?.[0] || "").toUpperCase()}{(u.apellidos?.[0] || "").toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold" style={{ color: "#1A1A2E" }}>
                                                    {u.nombres} {u.apellidos}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-4 text-sm text-gray-500 font-bold text-center whitespace-nowrap">{u.tipo_doc || "CC"}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500 font-mono text-center whitespace-nowrap">{u.num_doc}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 text-center">{u.email}</td>
                                    <td className="px-6 py-4 text-center"><RolBadge rol={u.rol} /></td>
                                    <td className="px-6 py-4 text-center"><EstadoBadge activo={u.activo} /></td>
                                    <td className="px-6 py-4 text-center">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${u.autoriza_biometria
                                                ? "text-purple-700 bg-purple-50"
                                                : "text-gray-500 bg-gray-100"
                                                }`}
                                        >
                                            {u.autoriza_biometria ? "Autorizada" : "No Autorizada"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => openEditModal(u)}
                                            className="p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors mx-auto"
                                            title="Editar Usuario"
                                        >
                                            <Pencil size={14} strokeWidth={2.5} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* PANEL LATERAL: Crear Usuario */}
            {mostrarForm && (
                <>
                    {/* Overlay */}
                    <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                        onClick={() => setMostrarForm(false)} />

                    {/* Panel */}
                    <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
                        {/* Header del panel */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between"
                            style={{ background: "linear-gradient(135deg, #8B1A1A, #6B1212)" }}>
                            <div>
                                <h2 className="text-white font-bold text-lg">Nuevo Usuario</h2>
                                <p className="text-white/60 text-xs mt-0.5">Completa todos los campos obligatorios</p>
                            </div>
                            <button onClick={() => setMostrarForm(false)}
                                className="text-white/70 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleCrear} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {errorForm && (
                                <p className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm font-medium"
                                    style={{ color: "#8B1A1A" }}>{errorForm}</p>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Rol</label>
                                <select value={form.rol_id} onChange={e => setForm({ ...form, rol_id: e.target.value })}
                                    className={inputClass} required>
                                    <option value="">— Selecciona un rol —</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Nombres</label>
                                    <input type="text" required placeholder="Ej: Juan" value={form.nombres}
                                        onChange={e => setForm({ ...form, nombres: e.target.value })} className={inputClass} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Apellidos</label>
                                    <input type="text" required placeholder="Ej: Pérez" value={form.apellidos}
                                        onChange={e => setForm({ ...form, apellidos: e.target.value })} className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Tipo Doc.</label>
                                    <select value={form.tipo_doc} onChange={e => setForm({ ...form, tipo_doc: e.target.value })}
                                        className={inputClass}>
                                        <option value="CC">CC — Cédula de Ciudadanía</option>
                                        <option value="TI">TI — Tarjeta de Identidad</option>
                                        <option value="CE">CE — Cédula de Extranjería</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">N° Documento</label>
                                    <input type="text" required placeholder="Ej: 1094247000" value={form.num_doc}
                                        onChange={e => setForm({ ...form, num_doc: e.target.value })} className={inputClass} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Correo Institucional</label>
                                <input type="email" required placeholder="usuario@unipamplona.edu.co" value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Contraseña Temporal</label>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} required placeholder="Mínimo 6 caracteres" value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })} className={`${inputClass} pr-10`} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                <input type="checkbox" id="biometria" checked={form.autoriza_biometria}
                                    onChange={e => setForm({ ...form, autoriza_biometria: e.target.checked })}
                                    className="w-4 h-4 accent-sara-red" />
                                <label htmlFor="biometria" className="text-sm text-gray-600 cursor-pointer">
                                    Autoriza registro biométrico (Ley 1581/2012)
                                </label>
                            </div>
                        </form>

                        {/* Footer del panel */}
                        <div className="p-6 border-t border-gray-100 flex gap-3">
                            <button type="button" onClick={() => setMostrarForm(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleCrear} disabled={guardando}
                                className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
                                style={{ background: "#8B1A1A" }}>
                                {guardando ? "Guardando..." : "Crear Usuario"}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* PANEL LATERAL: Editar Usuario */}
            {mostrarFormEdit && editUsuario && (
                <>
                    {/* Overlay */}
                    <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                        onClick={() => setMostrarFormEdit(false)} />

                    {/* Panel */}
                    <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
                        {/* Header del panel */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600">
                            <div>
                                <h2 className="text-white font-bold text-lg">Editar Usuario</h2>
                                <p className="text-white/60 text-xs mt-0.5">Modifica los campos necesarios</p>
                            </div>
                            <button onClick={() => setMostrarFormEdit(false)}
                                className="text-white/70 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleEditarSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {errorForm && (
                                <p className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm font-medium"
                                    style={{ color: "#8B1A1A" }}>{errorForm}</p>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Nombres</label>
                                    <input type="text" required placeholder="Ej: Juan" value={formEdit.nombres}
                                        onChange={e => setFormEdit({ ...formEdit, nombres: e.target.value })} className={inputClass} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Apellidos</label>
                                    <input type="text" required placeholder="Ej: Pérez" value={formEdit.apellidos}
                                        onChange={e => setFormEdit({ ...formEdit, apellidos: e.target.value })} className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Tipo Doc.</label>
                                    <select value={formEdit.tipo_doc} onChange={e => setFormEdit({ ...formEdit, tipo_doc: e.target.value })}
                                        className={inputClass}>
                                        <option value="CC">CC — Cédula</option>
                                        <option value="TI">TI — Tarjeta de Identidad</option>
                                        <option value="CE">CE — Cédula de Extranjería</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">N° Documento</label>
                                    <input type="text" required placeholder="Ej: 1094247000" value={formEdit.num_doc}
                                        onChange={e => setFormEdit({ ...formEdit, num_doc: e.target.value })} className={inputClass} />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Correo Institucional</label>
                                <input type="email" required placeholder="usuario@unipamplona.edu.co" value={formEdit.email}
                                    onChange={e => setFormEdit({ ...formEdit, email: e.target.value })} className={inputClass} />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Cambiar Contraseña (Opcional)</label>
                                <div className="relative">
                                    <input type={showEditPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={formEdit.password}
                                        onChange={e => setFormEdit({ ...formEdit, password: e.target.value })} className={`${inputClass} pr-10`} />
                                    <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* PIN de Acceso Rápido (Solo Docente o Administrativo) */}
                            {(editUsuario.rol === "Docente" || editUsuario.rol === "Administrativo") && (
                                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Key size={16} className="text-amber-700" />
                                            <span className="text-xs font-black text-amber-900 uppercase tracking-wider">PIN de Acceso Rápido</span>
                                        </div>
                                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                                            4 Dígitos
                                        </span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type={showPin ? "text" : "password"}
                                                readOnly
                                                value={formEdit.pin}
                                                className="w-full pl-3 pr-10 py-2 rounded-xl border border-amber-200 bg-white text-sm font-mono font-bold tracking-widest text-amber-900 outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPin(!showPin)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-800"
                                            >
                                                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>

                                        {!confirmingPinRegen ? (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmingPinRegen(true)}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all"
                                            >
                                                <RefreshCw size={13} className={isGeneratingPin ? "animate-spin" : ""} />
                                                Regenerar
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={handleRegenerarPin}
                                                    disabled={isGeneratingPin}
                                                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all animate-pulse"
                                                >
                                                    {isGeneratingPin ? "..." : "Sí"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingPinRegen(false)}
                                                    className="px-2 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-all"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {confirmingPinRegen && (
                                        <p className="text-[10px] text-amber-800 font-bold">
                                            ⚠️ ¿Estás seguro? Se pre-generará un PIN aleatorio libre que solo se guardará al presionar "Guardar Cambios".
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="p-3 bg-gray-50 rounded-xl space-y-4 border border-gray-100">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Estado del Usuario</label>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="editActivo" checked={formEdit.activo}
                                            disabled={editUsuario.rol === "Administrativo"}
                                            onChange={e => setFormEdit({ ...formEdit, activo: e.target.checked })}
                                            className="w-4 h-4 accent-green-600 disabled:opacity-50" />
                                        <label htmlFor="editActivo" className={`text-sm ${editUsuario.rol === "Administrativo" ? 'text-gray-400' : 'text-gray-600 cursor-pointer font-bold'}`}>
                                            {formEdit.activo ? "Usuario Activo" : "Usuario Inactivo"}
                                        </label>
                                    </div>
                                    {editUsuario.activo && !formEdit.activo && (
                                        <p className="text-[10px] text-red-600 font-bold mt-2 leading-tight">
                                            Se eliminarán matrículas/horarios. Se requiere confirmación al guardar.
                                        </p>
                                    )}
                                </div>

                                <div className="border-t border-gray-200 pt-3">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Biometría</label>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="editBiometria" checked={formEdit.autoriza_biometria}
                                            disabled={editUsuario.rol === "Administrativo"}
                                            onChange={e => setFormEdit({ ...formEdit, autoriza_biometria: e.target.checked })}
                                            className="w-4 h-4 accent-purple-600 disabled:opacity-50" />
                                        <label htmlFor="editBiometria" className={`text-sm ${editUsuario.rol === "Administrativo" ? 'text-gray-400' : 'text-gray-600 cursor-pointer font-bold'}`}>
                                            Autoriza registro biométrico
                                        </label>
                                    </div>
                                    {editUsuario.autoriza_biometria && !formEdit.autoriza_biometria && (
                                        <p className="text-[10px] text-red-600 font-bold mt-2 leading-tight">
                                            Se eliminarán los templates biométricos. Se requiere confirmación al guardar.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </form>

                        {/* Footer del panel */}
                        <div className="p-6 border-t border-gray-100 flex flex-col gap-3">
                            {editConfirmWarning ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200">
                                        <p className="font-bold text-sm mb-2 text-amber-900">⚠️ Advertencia de seguridad</p>
                                        <p className="text-xs whitespace-pre-line leading-relaxed">{editConfirmWarning}</p>
                                        <p className="font-bold text-xs mt-3">¿Estás seguro de continuar?</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setEditConfirmWarning("")}
                                            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
                                            No, cancelar
                                        </button>
                                        <button onClick={(e) => handleEditarSubmit(e, true)} disabled={guardando}
                                            className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60 bg-amber-600">
                                            {guardando ? "Guardando..." : "Sí, continuar"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setMostrarFormEdit(false)}
                                        className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={(e) => handleEditarSubmit(e)} disabled={guardando}
                                        className="flex-1 py-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60 bg-blue-600">
                                        {guardando ? "Guardando..." : "Guardar Cambios"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
