import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CounselingDashboardClient from "@/components/counseling-dashboard-client";

type Employee = {
  id: string;
  full_name: string;
  title: string | null;
  role_level: string;
  supervisor_id?: string | null;
};

type Draft = {
  id: string;
  created_at: string;
  employee:
    | {
        full_name: string;
      }[]
    | null;
};

export default async function CounselingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  // Keep the existing security check. This controls whether the user
  // is allowed into the counseling dashboard at all.
  const { data: canAccess } = await supabase.rpc("user_can_access_counseling", {
    user_email: user.email,
  });

  if (!canAccess) {
    redirect("/unauthorized");
  }

  // IMPORTANT:
  // Do NOT use the profiles table to determine supervisor relationships.
  // Not every ANC employee will have a website account/profile.
  // anc_employees is the source of truth for the employee hierarchy.
  const { data: currentEmployee, error: currentEmployeeError } = await supabase
    .from("anc_employees")
    .select("id, full_name, email, title, role_level, supervisor_id")
    .ilike("email", user.email)
    .eq("is_active", true)
    .maybeSingle();

  if (currentEmployeeError || !currentEmployee) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Employee Lookup Failed</h1>
      <p>Login Email: {user.email}</p>
      <pre>
        {JSON.stringify(
          {
            currentEmployee,
            currentEmployeeError,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}

  const roleLevel = (currentEmployee.role_level || "").toLowerCase();
  const isHrOrPresident = roleLevel === "hr_admin" || roleLevel === "president";

  let employees: Employee[] = [];

  if (isHrOrPresident) {
    // HR and President can see all active employees.
    const { data: allEmployees, error: allEmployeesError } = await supabase
      .from("anc_employees")
      .select("id, full_name, title, role_level, supervisor_id")
      .eq("is_active", true)
      .order("full_name");

    if (allEmployeesError) {
      console.error("Could not load all active employees", allEmployeesError);
    }

    employees = (allEmployees || []) as Employee[];
  } else {
    // Supervisors see employees whose supervisor_id points to their
    // anc_employees.id value.
    const { data: directReports, error: directReportsError } = await supabase
      .from("anc_employees")
      .select("id, full_name, title, role_level, supervisor_id")
      .eq("is_active", true)
      .eq("supervisor_id", currentEmployee.id)
      .order("full_name");

    if (directReportsError) {
      console.error("Could not load direct reports", directReportsError);
    }

    employees = (directReports || []) as Employee[];
  }

  const { data: draftsData, error: draftsError } = await supabase
    .from("counseling_drafts")
    .select(`
      id,
      created_at,
      employee:employee_id (
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  if (draftsError) {
    console.error("Could not load counseling drafts", draftsError);
  }

  const drafts = (draftsData || []) as Draft[];

console.log("COUNSELING PAGE LOADED");
console.log("USER:", user?.email);
console.log("CAN ACCESS:", canAccess);
console.log("CURRENT EMPLOYEE:", currentEmployee);
console.log("EMPLOYEE COUNT:", employees.length);

  return <CounselingDashboardClient employees={employees} drafts={drafts} />;
}
