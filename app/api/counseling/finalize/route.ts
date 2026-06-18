import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type FinalizePayload = {
  draftId: string;
  pdfBase64: string;
  fileName: string;
  recipients: string[];
  employeeName: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as FinalizePayload;

    if (!body.draftId || !body.pdfBase64 || !body.recipients?.length) {
      return NextResponse.json(
        { ok: false, error: "Missing finalize payload." },
        { status: 400 }
      );
    }

    const { data: draft, error: draftError } = await supabase
      .from("counseling_drafts")
      .select("id, employee_id")
      .eq("id", body.draftId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { ok: false, error: "Draft not found." },
        { status: 404 }
      );
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
      return NextResponse.json(
        { ok: false, error: "Access denied." },
        { status: 403 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing RESEND_API_KEY environment variable.",
        },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailResult = await resend.emails.send({
      from:
        process.env.COUNSELING_FROM_EMAIL ||
        "ANC Counseling <onboarding@resend.dev>",
      to: body.recipients,
      subject: `Employee Counseling Documentation - ${body.employeeName}`,
      html: `
        <p>Please see the attached employee counseling documentation for ${body.employeeName}.</p>
        <p>This counseling has been finalized and delivered through the ANC Counseling System.</p>
      `,
      attachments: [
        {
          filename:
            body.fileName ||
            `${body.employeeName}-Counseling.pdf`,
          content: body.pdfBase64,
        },
      ],
    });

    if (emailResult.error) {
      throw new Error(emailResult.error.message);
    }

    const { error: deleteError } = await supabase
      .from("counseling_drafts")
      .delete()
      .eq("id", body.draftId);

    if (deleteError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email was sent, but the draft could not be deleted. Please contact HR.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      emailId: emailResult.data?.id,
    });
  } catch (error) {
    console.error("Finalize counseling error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while finalizing counseling.",
      },
      { status: 500 }
    );
  }
}