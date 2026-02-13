import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("API Error:", status, data || err.message);
    return Promise.reject(err);
  }
);

const CONFIG_ESTADOS = {
  ACTIVO_ID_FIJO: 1,
  ONLEAVE_ID_FIJO: 4,
};

const StatCard = ({ title, value, loading, color = "bg-blue-600" }) => (
  <div className={`p-4 rounded-xl text-white shadow ${color}`}>
    <div className="text-xs uppercase opacity-80">{title}</div>
    <div className="text-2xl font-bold mt-1">{loading ? "…" : value}</div>
  </div>
);

const Select = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Seleccione...",
  className = "",
}) => (
  <div className={`flex flex-col ${className}`}>
    <label className="text-xs text-gray-600 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default function Dashboard() {
  const [areas, setAreas] = useState([]);
  const [clinicas, setClinicas] = useState([]);
  const [estados, setEstados] = useState([]);

  const [areaId, setAreaId] = useState("");
  const [clinicaId, setClinicaId] = useState("");

  const [loading, setLoading] = useState(false);
  const [activos, setActivos] = useState(0);
  const [onLeave, setOnLeave] = useState(0);

  const clinicasCount = clinicas.length;

  const estadoIds = useMemo(() => {
    if (CONFIG_ESTADOS.ACTIVO_ID_FIJO && CONFIG_ESTADOS.ONLEAVE_ID_FIJO) {
      return {
        activo: CONFIG_ESTADOS.ACTIVO_ID_FIJO,
        onLeave: CONFIG_ESTADOS.ONLEAVE_ID_FIJO,
      };
    }
    const byDesc = (d) =>
      estados.find(
        (e) => (e.descripcion || "").toLowerCase() === d.toLowerCase()
      );
    const byIncludes = (arr) =>
      estados.find((e) => {
        const d = (e.descripcion || "").toLowerCase();
        return arr.some((x) => d.includes(x));
      });

    return {
      activo: byDesc("activo")?.id_estado ?? null,
      onLeave:
        byDesc("on leave")?.id_estado ??
        byDesc("permiso")?.id_estado ??
        byIncludes(["leave", "permiso", "licencia", "vacaciones"])?.id_estado ??
        null,
    };
  }, [estados]);

  useEffect(() => {
    const loadLists = async () => {
      try {
        const [areasRes, clinicasRes, estadosRes] = await Promise.all([
          api.get("/empleados/areas/lista"),
          api.get("/empleados/clinicas/lista"),
          api.get("/empleados/estados/lista"),
        ]);

        setAreas(
          (areasRes.data?.data || []).map((a) => ({
            value: a.id_area,
            label: a.nombre_area,
          }))
        );

        const clinicasData = clinicasRes.data?.data || [];
        setClinicas(
          clinicasData.map((c) => ({
            value: c.id_clinica,
            label: c.nombre_clinica,
          }))
        );

        setEstados(estadosRes.data?.data || []);
      } catch (e) {
        console.error("Error cargando catálogos:", e);
      }
    };
    loadLists();
  }, []);

  const getCount = async ({ estado, clinica, area }) => {
    const params = { page: 1, limit: 1 };
    if (estado) params.estado = Number(estado);
    if (clinica) params.clinica = Number(clinica);
    if (area) params.area = Number(area);

    const res = await api.get("/empleados", { params });
    return res.data?.pagination?.total ?? 0;
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [activosTotal, onLeaveTotal] = await Promise.all([
        estadoIds.activo
          ? getCount({
              estado: estadoIds.activo,
              clinica: clinicaId || undefined,
              area: areaId || undefined,
            })
          : Promise.resolve(0),

        estadoIds.onLeave
          ? getCount({
              estado: estadoIds.onLeave,
              clinica: clinicaId || undefined,
              area: areaId || undefined,
            })
          : Promise.resolve(0),
      ]);

      setActivos(activosTotal);
      setOnLeave(onLeaveTotal);
    } catch (e) {
      console.error("Error cargando métricas:", e);
      setActivos(0);
      setOnLeave(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (estados.length > 0) loadMetrics();
  }, [areaId, clinicaId, estados]);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Dashboard</h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select
          label="Área"
          value={areaId}
          onChange={setAreaId}
          options={areas}
          placeholder="Todas las áreas"
        />
        <Select
          label="Clínica"
          value={clinicaId}
          onChange={setClinicaId}
          options={clinicas}
          placeholder="Todas las clínicas"
        />
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={loadMetrics}
            className="px-3 py-2 bg-gray-800 text-white rounded"
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={() => {
              setAreaId("");
              setClinicaId("");
            }}
            className="px-3 py-2 bg-gray-200 rounded"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          title="Usuarios Activos"
          value={activos}
          loading={loading}
          color="bg-emerald-600"
        />
        <StatCard
          title="Usuarios On Leave"
          value={onLeave}
          loading={loading}
          color="bg-amber-600"
        />
        <StatCard
          title="Clínicas"
          value={clinicasCount}
          loading={loading}
          color="bg-indigo-600"
        />
      </div>
    </div>
  );
}