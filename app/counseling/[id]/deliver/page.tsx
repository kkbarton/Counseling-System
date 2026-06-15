import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CounselingDeliveryClient from "@/components/counseling-delivery-client";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CounselingDeliverPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data: draft, error } = await supabase
    .from("counseling_drafts")
    .select(`
      id,
      employee_id,
      draft_data
    `)
    .eq("id", id)
    .single();

  if (error || !draft) {
    redirect("/counseling");
  }

  const { data: allowed } = await supabase.rpc(
    "user_is_in_employee_chain",
    {
      current_user_email: user.email,
      target_employee_id: draft.employee_id,
    }
  );

  const { data: isHr } = await supabase.rpc(
    "is_hr_or_president",
    {
      user_email: user.email,
    }
  );

  if (!allowed && !isHr) {
    redirect("/unauthorized");
  }

  return (
    <CounselingDeliveryClient
      draftId={draft.id}
      draftData={draft.draft_data}
    />
  );
}