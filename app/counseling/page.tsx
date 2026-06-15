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

  const normalizedUserEmail = user.email.trim().toLowerCase();

  const { data: canAccess } = await supabase.rpc(
    "user_can_access_counseling",
    {
      user_email: normalizedUserEmail,
    }
  );

  if (!canAccess) {
    redirect("/unauthorized");
  }

  const { data: isHr } = await supabase.rpc("is_hr_or_president", {
    user_email: normalizedUserEmail,
  });

  let employees: Employee[] = [];

  if (isHr) {
    const { data } = await supabase
      .from("anc_employees")
      .select(`
        id,
        full_name,
        title,
        role_level
      `)
      .eq("is_active", true)
      .order("full_name");

    employees = (data || []) as Employee[];
  } else {
    // Find the logged-in supervisor's employee record first.
    // The homescreen should show employees whose supervisor_id points to this record.
    const { data: currentEmployee } = await supabase
      .from("anc_employees")
      .select("id")
      .eq("email", normalizedUserEmail)
      .eq("is_active", true)
      .maybeSingle();

    if (currentEmployee?.id) {
      const { data } = await supabase
        .from("anc_employees")
        .select(`
          id,
          full_name,
          title,
          role_level
        `)
        .eq("is_active", true)
        .eq("supervisor_id", currentEmployee.id)
        .order("full_name");

      employees = (data || []) as Employee[];
    }
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

  return <CounselingDashboardClient employees={employees} drafts={drafts} />;
}
