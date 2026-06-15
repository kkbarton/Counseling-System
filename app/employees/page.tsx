import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeeManagementClient from "@/components/employee-management-client";

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

export default async function EmployeesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data: isHr } = await supabase.rpc("is_hr_or_president", {
    user_email: user.email,
  });

  if (!isHr) {
    redirect("/unauthorized");
  }

  const { data } = await supabase
    .from("anc_employees")
    .select(`
      id,
      full_name,
      email,
      title,
      role_level,
      supervisor_id,
      is_active,
      supervisor:supervisor_id (
        full_name
      )
    `)
    .order("full_name");

  const employees = (data || []) as Employee[];

  return (
    <EmployeeManagementClient
      initialEmployees={employees}
    />
  );
}