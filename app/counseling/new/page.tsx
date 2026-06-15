"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Sparkles,
  Upload,
  ArrowLeft,
  Save,
  Send,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type GeneratedDraft = {
  rewrittenIncidentDetails?: string;
  policyViolated: string;
  whyWrong: string;
  expectations: string;
  failureToImprove: string;
};

type ChainPerson = {
  id: string;
  full_name: string;
  email: string;
  title: string | null;
  role_level: string;
  depth: number;
};

type EmployeeOption = {
  id: string;
  full_name: string;
  email: string;
  title: string | null;
  role_level: string;
  supervisor_id: string | null;
  supervisor_chain: ChainPerson[];
};

type CounselingDraftData = {
  employeeId: string;
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
  supervisorChain: ChainPerson[];
  incidentDate: string;
  counselingDate: string;
  incidentDetails: string;
  witnessPresent: boolean;
  witnessName: string;
  witnessTitle: string;
  jobDescriptionName: string;
  draft: GeneratedDraft;
};

const defaultDraft: GeneratedDraft = {
  rewrittenIncidentDetails: "",
  policyViolated: "",
  whyWrong: "",
  expectations: "",
  failureToImprove:
    "Failure to improve could lead to further disciplinary action up to and including termination.",
};

const PRIMARY_HR_EMAIL =
  process.env.NEXT_PUBLIC_PRIMARY_HR_EMAIL || "thampton@smail.anc.edu";

export default function NewCounselingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  const [incidentDate, setIncidentDate] = useState("");
  const [counselingDate, setCounselingDate] = useState("");
  const [incidentDetails, setIncidentDetails] = useState("");
  const [witnessPresent, setWitnessPresent] = useState(false);
  const [witnessName, setWitnessName] = useState("");
  const [witnessTitle, setWitnessTitle] = useState("");
  const [jobDescriptionName, setJobDescriptionName] = useState("");
  const [hrEmail, setHrEmail] = useState(PRIMARY_HR_EMAIL);
  const [draft, setDraft] = useState<GeneratedDraft>(defaultDraft);

  useEffect(() => {
    async function loadEmployees() {
      setLoadingEmployees(true);

      const { data, error } = await supabase.rpc(
        "get_counseling_employee_options"
      );

      if (error) {
        alert(error.message);
        setLoadingEmployees(false);
        return;
      }

      setEmployeeOptions((data || []) as EmployeeOption[]);
      setLoadingEmployees(false);
    }

    loadEmployees();
  }, [supabase]);

  const selectedEmployee = useMemo(() => {
    return (
      employeeOptions.find((employee) => employee.id === selectedEmployeeId) ||
      null
    );
  }, [employeeOptions, selectedEmployeeId]);

    function normalizeText(value?: string | null) {
    return String(value || "").toLowerCase().trim();
  }

  function isAvp(person: ChainPerson) {
    const roleLevel = normalizeText(person.role_level);
    const title = normalizeText(person.title);

    return (
      roleLevel === "avp" ||
      title.includes("associate vp") ||
      title.includes("assoc vp") ||
      title.includes("associate vice president")
    );
  }

  function isVp(person: ChainPerson) {
    const roleLevel = normalizeText(person.role_level);
    const title = normalizeText(person.title);

    return (
      roleLevel === "vp" ||
      title.includes("vice president")
    );
  }

  const immediateSupervisor = useMemo(() => {
    return selectedEmployee?.supervisor_chain?.[0] || null;
  }, [selectedEmployee]);

  const chainAboveImmediateSupervisor = useMemo(() => {
    return selectedEmployee?.supervisor_chain?.slice(1) || [];
  }, [selectedEmployee]);

  const avp = useMemo(() => {
    return chainAboveImmediateSupervisor.find(isAvp) || null;
  }, [chainAboveImmediateSupervisor]);

  const vp = useMemo(() => {
    const avpIndex = chainAboveImmediateSupervisor.findIndex(isAvp);

    if (avpIndex >= 0) {
      return chainAboveImmediateSupervisor.slice(avpIndex + 1).find(isVp) || null;
    }

    return chainAboveImmediateSupervisor.find(isVp) || null;
  }, [chainAboveImmediateSupervisor]);

  const president = useMemo(() => {
    return (
      selectedEmployee?.supervisor_chain?.find(
        (person) => normalizeText(person.role_level) === "president"
      ) || null
    );
  }, [selectedEmployee]);

  const canGenerate = useMemo(() => {
    return Boolean(selectedEmployee && incidentDetails.trim());
  }, [selectedEmployee, incidentDetails]);

  async function handleFakeGenerate() {
    if (!selectedEmployee) {
      alert("Please select an employee first.");
      return;
    }

    if (!incidentDetails.trim()) {
      alert("Please enter incident details first.");
      return;
    }

    try {
      const response = await fetch("/api/counseling/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeName: selectedEmployee.full_name,
          employeeTitle: selectedEmployee.title || "",
          incidentDate,
          incidentDetails,
          jobDescriptionText: jobDescriptionName
            ? `Job description uploaded: ${jobDescriptionName}`
            : "",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "Failed to generate counseling wording."
        );
      }

      const rewrittenIncidentDetails =
        typeof result.draft?.rewrittenIncidentDetails === "string"
          ? result.draft.rewrittenIncidentDetails.trim()
          : "";

      setDraft({
        rewrittenIncidentDetails,
        policyViolated: result.draft?.policyViolated || "",
        whyWrong: result.draft?.whyWrong || "",
        expectations: result.draft?.expectations || "",
        failureToImprove:
          result.draft?.failureToImprove ||
          "Failure to improve could lead to further disciplinary action up to and including termination.",
      });

      if (rewrittenIncidentDetails) {
        setIncidentDetails(rewrittenIncidentDetails);
      }
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to generate counseling wording."
      );
    }
  }

  function updateDraftField<K extends keyof GeneratedDraft>(
    key: K,
    value: GeneratedDraft[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function buildDraftData(): CounselingDraftData {
    return {
      employeeId: selectedEmployee?.id || "",
      employeeName: selectedEmployee?.full_name || "",
      employeeEmail: selectedEmployee?.email || "",
      employeeTitle: selectedEmployee?.title || "",
      immediateSupervisorName: immediateSupervisor?.full_name || "",
      immediateSupervisorEmail: immediateSupervisor?.email || "",
      avpName: avp?.full_name || "",
      avpEmail: avp?.email || "",
      vpName: vp?.full_name || "",
      vpEmail: vp?.email || "",
      hrEmail,
      supervisorChain: selectedEmployee?.supervisor_chain || [],
      incidentDate,
      counselingDate,
      incidentDetails,
      witnessPresent,
      witnessName,
      witnessTitle,
      jobDescriptionName,
      draft,
    };
  }

  async function saveDraft() {
    if (!selectedEmployee) {
      alert("Please select an employee first.");
      return null;
    }

    setSaving(true);

    const draftData = buildDraftData();

    const { data, error } = await supabase
      .from("counseling_drafts")
      .insert({
        employee_id: selectedEmployee.id,
        draft_data: draftData,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      setSaving(false);
      return null;
    }

    setSaving(false);
    return data.id as string;
  }

  async function handleSaveDraft() {
    const draftId = await saveDraft();

    if (draftId) {
      router.push(`/counseling/${draftId}`);
    }
  }

  async function handleDeliver() {
    const draftId = await saveDraft();

    if (draftId) {
      router.push(`/counseling/${draftId}/deliver`);
    }
  }

  const recipientPreview = useMemo(() => {
    if (!selectedEmployee) return [];

    if (selectedEmployee.role_level === "vp") {
      return [selectedEmployee.email, hrEmail, president?.email || ""].filter(
        Boolean
      );
    }

    const chainEmails = (selectedEmployee.supervisor_chain || [])
      .filter((person) => person.role_level !== "president")
      .map((person) => person.email);

    return Array.from(
      new Set([selectedEmployee.email, ...chainEmails, hrEmail].filter(Boolean))
    );
  }, [selectedEmployee, hrEmail, president]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f2e6d] text-white">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c9a227]">
                Arkansas Northeastern College
              </p>

              <h1 className="text-lg font-semibold text-[#0f2e6d]">
                New Counseling
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => router.push("/counseling")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Draft"}
            </Button>

            <Button
              className="rounded-2xl bg-[#c9a227] text-[#10223d] hover:bg-[#b7941f]"
              onClick={handleDeliver}
              disabled={saving}
            >
              <Send className="mr-2 h-4 w-4" />
              Deliver Counseling
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="space-y-6">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#0f2e6d]">
                Employee details
              </CardTitle>

              <CardDescription>
                Select an employee. Their information and chain of command will
                autofill from the HR employee structure table.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Employee
                </label>

                <select
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                  disabled={loadingEmployees}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f2e6d]"
                >
                  <option value="">
                    {loadingEmployees ? "Loading employees..." : "Select an employee"}
                  </option>

                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.full_name}
                      {employee.title ? ` — ${employee.title}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyField
                  label="Employee Name"
                  value={selectedEmployee?.full_name || ""}
                />
                <ReadOnlyField
                  label="Employee Email"
                  value={selectedEmployee?.email || ""}
                />
                <ReadOnlyField
                  label="Employee Title / Position"
                  value={selectedEmployee?.title || ""}
                />
                <ReadOnlyField
                  label="Role Level"
                  value={selectedEmployee?.role_level?.replace("_", " ") || ""}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#0f2e6d]">
                Chain of command and recipients
              </CardTitle>

              <CardDescription>
                These fields are calculated from the employee structure. HR email
                may be adjusted if needed.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <ReadOnlyField
                  label="Immediate Supervisor"
                  value={immediateSupervisor?.full_name || ""}
                />
                <ReadOnlyField
                  label="Supervisor Email"
                  value={immediateSupervisor?.email || ""}
                />
                <ReadOnlyField label="AVP" value={avp?.full_name || ""} />
                <ReadOnlyField label="AVP Email" value={avp?.email || ""} />
                <ReadOnlyField label="VP" value={vp?.full_name || ""} />
                <ReadOnlyField label="VP Email" value={vp?.email || ""} />
                <Field
                  label="Primary HR Email"
                  value={hrEmail}
                  onChange={setHrEmail}
                  type="email"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  Delivery Preview
                </p>

                {recipientPreview.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recipientPreview.map((email) => (
                      <span
                        key={email}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Select an employee to preview recipients.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#0f2e6d]">Incident details</CardTitle>

              <CardDescription>
                Describe the incident as thoroughly as possible.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Date of Incident"
                  value={incidentDate}
                  onChange={setIncidentDate}
                  type="date"
                />

                <Field
                  label="Date of Counseling"
                  value={counselingDate}
                  onChange={setCounselingDate}
                  type="date"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Incident Details
                </label>

                <textarea
                  value={incidentDetails}
                  onChange={(event) => setIncidentDetails(event.target.value)}
                  rows={8}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f2e6d]"
                  placeholder="Enter the incident with as much detail as possible..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-[#0f2e6d]">
                Witness and job description
              </CardTitle>

              <CardDescription>
                Witness information is optional. A job description PDF may also
                be attached for reference.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={witnessPresent}
                  onChange={(event) => setWitnessPresent(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />

                <span className="text-sm font-medium text-slate-700">
                  Witness was present during the counseling
                </span>
              </label>

              {witnessPresent && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Witness Name"
                    value={witnessName}
                    onChange={setWitnessName}
                  />

                  <Field
                    label="Witness Title"
                    value={witnessTitle}
                    onChange={setWitnessTitle}
                  />
                </div>
              )}

              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Job Description PDF
                    </p>

                    <p className="text-sm text-slate-500">
                      Optional upload for Gemini to reference against employee
                      responsibilities.
                    </p>

                    {jobDescriptionName && (
                      <p className="mt-2 text-sm font-medium text-[#0f2e6d]">
                        {jobDescriptionName}
                      </p>
                    )}
                  </div>

                  <label className="inline-flex cursor-pointer items-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose PDF
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setJobDescriptionName(file?.name || "");
                      }}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-3xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-[#0f2e6d]">AI Draft</CardTitle>

                  <CardDescription>
                    Generate suggested wording, then edit it however you need.
                  </CardDescription>
                </div>

                <Badge className="border-0 bg-[#e8eefb] text-[#0f2e6d] hover:bg-[#e8eefb]">
                  Gemini Ready
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                onClick={handleFakeGenerate}
                disabled={!canGenerate}
                className="w-full rounded-2xl bg-[#0f2e6d] text-white hover:bg-[#163d8f] disabled:opacity-50"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Draft
              </Button>

              <DraftField
                label="Policy Violated"
                value={draft.policyViolated}
                onChange={(value) => updateDraftField("policyViolated", value)}
              />

              <DraftField
                label="Why the Behavior Was Wrong"
                value={draft.whyWrong}
                onChange={(value) => updateDraftField("whyWrong", value)}
              />

              <DraftField
                label="Expectations Moving Forward"
                value={draft.expectations}
                onChange={(value) => updateDraftField("expectations", value)}
              />

              <DraftField
                label="Failure to Improve"
                value={draft.failureToImprove}
                onChange={(value) => updateDraftField("failureToImprove", value)}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f2e6d]"
      />
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <div className="min-h-[46px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
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
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0f2e6d]"
      />
    </div>
  );
}
