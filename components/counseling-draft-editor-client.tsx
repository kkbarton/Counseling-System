"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type DraftData = {
  employeeName: string;
  employeeEmail: string;
  employeeTitle: string;
  immediateSupervisorName: string;
  immediateSupervisorEmail: string;
  avpName: string;
  avpEmail: string;
  vpName: string;
  vpEmail: string;
  hrEmail: string;
  incidentDate: string;
  counselingDate: string;
  incidentDetails: string;
  witnessPresent: boolean;
  witnessName: string;
  witnessTitle: string;
  jobDescriptionName: string;
  draft: {
    policyViolated: string;
    whyWrong: string;
    expectations: string;
    failureToImprove: string;
  };
};

type Props = {
  draftId: string;
  initialDraftData: DraftData;
};

export default function CounselingDraftEditorClient({
  draftId,
  initialDraftData,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [draftData, setDraftData] = useState<DraftData>(initialDraftData);
  const [saving, setSaving] = useState(false);

  function updateDraftField(
    key: keyof DraftData["draft"],
    value: string
  ) {
    setDraftData((previous) => ({
      ...previous,
      draft: {
        ...previous.draft,
        [key]: value,
      },
    }));
  }

  async function saveDraft() {
    setSaving(true);

    const { error } = await supabase
      .from("counseling_drafts")
      .update({
        draft_data: draftData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Draft saved.");
  }

  async function continueToDelivery() {
    await saveDraft();
    router.push(`/counseling/${draftId}/deliver`);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              Counseling Draft
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Review and edit the counseling wording before delivery.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/counseling")}
              className="rounded-2xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Button>

            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving}
              className="rounded-2xl"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>

            <Button
              onClick={continueToDelivery}
              disabled={saving}
              className="rounded-2xl bg-[#0f2e6d] text-white hover:bg-[#163d8f]"
            >
              <Send className="mr-2 h-4 w-4" />
              Continue to Delivery
            </Button>
          </div>
        </div>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0f2e6d]">
            Employee and Routing
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ReadOnly label="Employee" value={draftData.employeeName} />
            <ReadOnly label="Employee Email" value={draftData.employeeEmail} />
            <ReadOnly label="Title" value={draftData.employeeTitle} />
            <ReadOnly
              label="Immediate Supervisor"
              value={draftData.immediateSupervisorName}
            />
            <ReadOnly label="AVP" value={draftData.avpName} />
            <ReadOnly label="VP" value={draftData.vpName} />
            <ReadOnly label="Primary HR Email" value={draftData.hrEmail} />
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0f2e6d]">
            Incident Details
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ReadOnly label="Incident Date" value={draftData.incidentDate} />
            <ReadOnly
              label="Counseling Date"
              value={draftData.counselingDate}
            />
            <ReadOnly
              label="Job Description"
              value={draftData.jobDescriptionName}
            />
            <ReadOnly
              label="Witness"
              value={
                draftData.witnessPresent
                  ? `${draftData.witnessName || "-"} ${
                      draftData.witnessTitle
                        ? `(${draftData.witnessTitle})`
                        : ""
                    }`
                  : "No witness"
              }
            />
          </div>

          <div className="mt-4">
            <ReadOnly label="Incident Details" value={draftData.incidentDetails} />
          </div>
        </section>

        <section className="rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0f2e6d]">
            Editable Counseling Wording
          </h2>

          <div className="mt-5 space-y-5">
            <DraftField
              label="Policy Violated"
              value={draftData.draft.policyViolated}
              onChange={(value) => updateDraftField("policyViolated", value)}
            />

            <DraftField
              label="Why the Behavior Was Wrong"
              value={draftData.draft.whyWrong}
              onChange={(value) => updateDraftField("whyWrong", value)}
            />

            <DraftField
              label="Expectations Moving Forward"
              value={draftData.draft.expectations}
              onChange={(value) => updateDraftField("expectations", value)}
            />

            <DraftField
              label="Failure to Improve"
              value={draftData.draft.failureToImprove}
              onChange={(value) => updateDraftField("failureToImprove", value)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ReadOnly({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 rounded-2xl border bg-slate-50 px-4 py-3 text-sm text-slate-800">
        {value || "-"}
      </div>
    </div>
  );
}

function DraftField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-[#0f2e6d]"
      />
    </div>
  );
}