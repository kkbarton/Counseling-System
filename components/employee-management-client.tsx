"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  title: string | null;
  role_level: string;
  supervisor_id: string | null;
  is_active: boolean;
  supervisor:
    | {
        full_name: string;
      }[]
    | null;
};

type Props = {
  initialEmployees: Employee[];
};

const ROLE_OPTIONS = [
  "employee",
  "supervisor",
  "avp",
  "vp",
  "president",
  "hr_admin",
];

export default function EmployeeManagementClient({
  initialEmployees,
}: Props) {
  const supabase = createClient();

  const [employees, setEmployees] = useState(initialEmployees);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    title: "",
    role_level: "employee",
    supervisor_id: "",
    is_active: true,
  });

  const filteredEmployees = useMemo(() => {
    const value = search.toLowerCase();

    if (!value) return employees;

    return employees.filter((employee) => {
      return (
        employee.full_name.toLowerCase().includes(value) ||
        employee.email.toLowerCase().includes(value) ||
        (employee.title || "").toLowerCase().includes(value)
      );
    });
  }, [employees, search]);

  function openAddDrawer() {
    setEditingEmployee(null);
    setForm({
      full_name: "",
      email: "",
      title: "",
      role_level: "employee",
      supervisor_id: "",
      is_active: true,
    });
    setDrawerOpen(true);
  }

  function openEditDrawer(employee: Employee) {
    setEditingEmployee(employee);
    setForm({
      full_name: employee.full_name,
      email: employee.email,
      title: employee.title || "",
      role_level: employee.role_level,
      supervisor_id: employee.supervisor_id || "",
      is_active: employee.is_active,
    });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingEmployee(null);
  }

  async function saveEmployee() {
    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      title: form.title.trim() || null,
      role_level: form.role_level,
      supervisor_id: form.supervisor_id || null,
      is_active: form.is_active,
    };

    if (editingEmployee) {
      const { error } = await supabase
        .from("anc_employees")
        .update(payload)
        .eq("id", editingEmployee.id);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("anc_employees").insert(payload);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                ANC Employee Structure
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                HR-only organizational structure management.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-64 rounded-lg border px-3 py-2 text-sm"
              />

              <button
                onClick={openAddDrawer}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Add Employee
              </button>
            </div>
          </div>

          <div className="max-h-[75vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Supervisor
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Active</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {employee.full_name}
                    </td>

                    <td className="px-4 py-3">{employee.email}</td>

                    <td className="px-4 py-3">{employee.title || "-"}</td>

                    <td className="px-4 py-3 capitalize">
                      {employee.role_level.replace("_", " ")}
                    </td>

                    <td className="px-4 py-3">
                      {employee.supervisor?.[0]?.full_name || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          employee.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {employee.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditDrawer(employee)}
                        className="text-sm font-medium text-blue-700 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {!filteredEmployees.length && (
                  <tr>
                    <td
                      className="px-4 py-10 text-center text-slate-500"
                      colSpan={7}
                    >
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-lg bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingEmployee ? "Edit Employee" : "Add Employee"}
              </h2>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  value={form.full_name}
                  onChange={(event) =>
                    setForm({ ...form, full_name: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Role
                </label>
                <select
                  value={form.role_level}
                  onChange={(event) =>
                    setForm({ ...form, role_level: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Supervisor
                </label>
                <select
                  value={form.supervisor_id}
                  onChange={(event) =>
                    setForm({ ...form, supervisor_id: event.target.value })
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">No supervisor</option>
                  {employees
                    .filter((employee) => employee.id !== editingEmployee?.id)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                />
                Active employee
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <button
                onClick={closeDrawer}
                className="rounded-lg border px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                onClick={saveEmployee}
                disabled={saving}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}