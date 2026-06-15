"use client";

import Link from "next/link";

type Employee = {
  id: string;
  full_name: string;
  title: string | null;
  role_level: string;
};

type Draft = {
  id: string;
  created_at: string;
  employee: {
    full_name: string;
  }[] | null;
};

type Props = {
  employees: Employee[];
  drafts: Draft[];
};

export default function CounselingDashboardClient({
  employees,
  drafts,
}: Props) {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              ANC Counseling Dashboard
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Manage employee counselings and drafts.
            </p>
          </div>

          <Link
            href="/counseling/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            New Counseling
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Employees You Supervise
              </h2>
            </div>

            <div className="max-h-[500px] overflow-auto">
              {employees.length ? (
                <div className="divide-y">
                  {employees.map((employee) => (
                    <div
                      key={employee.id}
                      className="px-5 py-4 hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">
                        {employee.full_name}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        {employee.title || employee.role_level}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-sm text-slate-500">
                  No supervised employees found.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm lg:col-span-2">
            <div className="border-b px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Draft Counselings
              </h2>
            </div>

            <div className="overflow-auto">
              {drafts.length ? (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left font-medium">
                        Employee
                      </th>

                      <th className="px-4 py-3 text-left font-medium">
                        Created
                      </th>

                      <th className="px-4 py-3 text-left font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {drafts.map((draft) => (
                      <tr
                        key={draft.id}
                        className="border-b last:border-b-0 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-medium">
                          {draft.employee?.[0]?.full_name || "-"}
                        </td>

                        <td className="px-4 py-3">
                          {new Date(
                            draft.created_at
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3">
                          <Link
                            href={`/counseling/${draft.id}`}
                            className="text-sm font-medium text-blue-700 hover:text-blue-900"
                          >
                            Open Draft
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-5 py-10 text-sm text-slate-500">
                  No draft counselings found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}