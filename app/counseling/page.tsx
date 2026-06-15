import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CounselingDashboardClient from "@/components/counseling-dashboard-client";

type Employee = {
  id: string;
  full_name: string;
  title: string | null;
  role_level: string;
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

  const { data: canAccess } = await supabase.rpc(
    "user_can_access_counseling",
    {
      user_email: user.email,
    }
  );

  if (!canAccess) {
    redirect("/unauthorized");
  }

  let employeesQuery = supabase
    .from("anc_employees")
    .select(`
      id,
      full_name,
      title,
      role_level
    `)
    .eq("is_active", true)
    .order("full_name");

  const { data: isHr } = await supabase.rpc(
    "is_hr_or_president",
    {
      user_email: user.email,
    }
  );

  const { data: allEmployees } = await employeesQuery;

  let employees: Employee[] = [];

  if (isHr) {
    employees = (allEmployees || []) as Employee[];
  } else {
    const filteredEmployees: Employee[] = [];

    for (const employee of allEmployees || []) {
      const { data: allowed } = await supabase.rpc(
        "user_is_in_employee_chain",
        {
          current_user_email: user.email,
          target_employee_id: employee.id,
        }
      );

      if (allowed) {
        filteredEmployees.push(employee as Employee);
      }
    }

    employees = filteredEmployees;
  }

  const { data: draftsData } = await supabase
    .from("counseling_drafts")
    .select(`
      id,
      created_at,
      employee:employee_id (
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  const drafts = (draftsData || []) as Draft[];

  return (
    <CounselingDashboardClient
      employees={employees}
      drafts={drafts}
    />
  );
}