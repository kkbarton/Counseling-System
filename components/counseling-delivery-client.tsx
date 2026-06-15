"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import {
  PDFDocument,
  PDFImage,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import {
  ArrowLeft,
  Download,
  Mail,
  CheckCircle2,
  PenLine,
  X,
} from "lucide-react";
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
  rewrittenIncidentDetails?: string;
  witnessPresent: boolean;
  witnessName: string;
  witnessTitle: string;
  draft: {
    rewrittenIncidentDetails?: string;
    policyViolated: string;
    whyWrong: string;
    expectations: string;
    failureToImprove: string;
  };
  supervisorChain: {
    email: string;
    role_level: string;
  }[];
};

type Props = {
  draftId: string;
  draftData: DraftData;
};

type SignatureType = "employee" | "supervisor" | "witness";

const LOGO_PATH = "/IMG_1342.jpeg";

export default function CounselingDeliveryClient({ draftId, draftData }: Props) {
  const router = useRouter();

  const employeeSignatureRef = useRef<SignatureCanvas | null>(null);
  const supervisorSignatureRef = useRef<SignatureCanvas | null>(null);
  const witnessSignatureRef = useRef<SignatureCanvas | null>(null);

  const [employeeSignature, setEmployeeSignature] = useState("");
  const [supervisorSignature, setSupervisorSignature] = useState("");
  const [witnessSignature, setWitnessSignature] = useState("");
  const [activeSignature, setActiveSignature] = useState<SignatureType | null>(
    null
  );
  const [finalizing, setFinalizing] = useState(false);

  const incidentDetailsForDocument =
    draftData.draft.rewrittenIncidentDetails?.trim() ||
    draftData.rewrittenIncidentDetails?.trim() ||
    draftData.incidentDetails;

  const recipientEmails = useMemo(() => {
    return Array.from(
      new Set(
        [
          draftData.employeeEmail,
          draftData.immediateSupervisorEmail,
          draftData.avpEmail,
          draftData.vpEmail,
          ...draftData.supervisorChain.map((person) => person.email),
          draftData.hrEmail,
        ].filter(Boolean)
      )
    );
  }, [draftData]);

  function openSignature(type: SignatureType) {
    setActiveSignature(type);
  }

  function getActiveSignatureRef() {
    if (activeSignature === "employee") return employeeSignatureRef;
    if (activeSignature === "supervisor") return supervisorSignatureRef;
    return witnessSignatureRef;
  }

  function clearActiveSignature() {
    getActiveSignatureRef().current?.clear();
  }

  function saveActiveSignature() {
    const ref = getActiveSignatureRef();

    if (!ref.current || ref.current.isEmpty()) {
      alert("Please sign before saving.");
      return;
    }

    const signature = ref.current.getTrimmedCanvas().toDataURL("image/png");

    if (activeSignature === "employee") {
      setEmployeeSignature(signature);
    }

    if (activeSignature === "supervisor") {
      setSupervisorSignature(signature);
    }

    if (activeSignature === "witness") {
      setWitnessSignature(signature);
    }

    setActiveSignature(null);
  }

  async function loadLogo(pdf: PDFDocument) {
    const logoResponse = await fetch(LOGO_PATH);

    if (!logoResponse.ok) {
      throw new Error(
        `Logo not found at ${LOGO_PATH}. Make sure it is in the public folder.`
      );
    }

    const logoBytes = await logoResponse.arrayBuffer();

    if (LOGO_PATH.toLowerCase().endsWith(".png")) {
      return await pdf.embedPng(logoBytes);
    }

    return await pdf.embedJpg(logoBytes);
  }

  async function generatePdf() {
    const pdf = await PDFDocument.create();

    const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const logoImage = await loadLogo(pdf);

    const pageSize: [number, number] = [612, 792];
    const margin = 54;
    const maxWidth = pageSize[0] - margin * 2;

    let page = pdf.addPage(pageSize);
    let y = 735;

    function addPage() {
      page = pdf.addPage(pageSize);
      y = drawLetterhead(page, logoImage, pageSize, margin);
    }

    function ensureSpace(height: number) {
      if (y - height < 70) {
        addPage();
      }
    }

    function drawParagraph(
      text: string,
      fontToUse: PDFFont,
      size: number,
      lineHeight: number
    ) {
      const lines = wrapText(text || "-", fontToUse, size, maxWidth);

      for (const line of lines) {
        ensureSpace(lineHeight + 5);

        if (line.trim()) {
          page.drawText(line, {
            x: margin,
            y,
            size,
            font: fontToUse,
            color: rgb(0.08, 0.08, 0.08),
          });
        }

        y -= lineHeight;
      }

      y -= 4;
    }

    function drawSection(title: string, content: string) {
      ensureSpace(90);
      y -= 4;

      page.drawText(title, {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0.02, 0.18, 0.45),
      });

      y -= 18;
      drawParagraph(content || "-", regularFont, 10, 14);
    }

    function drawInfoRow(
      leftLabel: string,
      leftValue: string,
      rightLabel: string,
      rightValue: string
    ) {
      ensureSpace(20);

      page.drawText(`${leftLabel}:`, {
        x: margin,
        y,
        size: 9,
        font: boldFont,
      });

      page.drawText(leftValue || "-", {
        x: margin + 92,
        y,
        size: 9,
        font: regularFont,
      });

      page.drawText(`${rightLabel}:`, {
        x: 330,
        y,
        size: 9,
        font: boldFont,
      });

      page.drawText(rightValue || "-", {
        x: 420,
        y,
        size: 9,
        font: regularFont,
      });

      y -= 16;
    }

    async function drawSignatureBlock({
      x,
      y,
      width,
      signature,
      name,
      label,
    }: {
      x: number;
      y: number;
      width: number;
      signature: string;
      name: string;
      label: string;
    }) {
      if (signature) {
        const png = await pdf.embedPng(signature);

        page.drawImage(png, {
          x: x + 8,
          y: y + 10,
          width: Math.min(width - 26, 145),
          height: 36,
        });
      }

      page.drawLine({
        start: { x, y },
        end: { x: x + width, y },
        thickness: 1,
        color: rgb(0.05, 0.05, 0.05),
      });

      page.drawText(name || "-", {
        x,
        y: y - 14,
        size: 9,
        font: boldFont,
        color: rgb(0.05, 0.05, 0.05),
      });

      page.drawText(label, {
        x,
        y: y - 27,
        size: 8,
        font: regularFont,
        color: rgb(0.35, 0.35, 0.35),
      });
    }

    y = drawLetterhead(page, logoImage, pageSize, margin);

    drawCentered(
      page,
      "EMPLOYEE COUNSELING DOCUMENTATION",
      y,
      14,
      boldFont
    );

    y -= 32;

    drawInfoRow(
      "Employee Name",
      draftData.employeeName,
      "Counseling Date",
      formatDate(draftData.counselingDate)
    );

    drawInfoRow(
      "Employee Title",
      draftData.employeeTitle || "-",
      "Incident Date",
      formatDate(draftData.incidentDate)
    );

    drawInfoRow(
      "Employee Email",
      draftData.employeeEmail,
      "Supervisor",
      draftData.immediateSupervisorName || "-"
    );

    y -= 18;

    drawParagraph(
      "This document is intended to address concerns related to job performance and/or conduct and to outline expectations moving forward. It is not a disciplinary action in itself, but rather a formal documentation of counseling provided to the employee.",
      regularFont,
      10,
      14
    );

    drawSection("INCIDENT DETAILS", incidentDetailsForDocument);
drawSection("POLICY / EXPECTATION INVOLVED", draftData.draft.policyViolated);
drawSection("WHY THIS IS CONSIDERED A CONCERN", draftData.draft.whyWrong);
drawSection("EXPECTATIONS MOVING FORWARD", draftData.draft.expectations);

// Prevent signatures from ending up alone on a new page
ensureSpace(draftData.witnessPresent ? 360 : 300);

drawSection("FAILURE TO IMPROVE", draftData.draft.failureToImprove);

ensureSpace(draftData.witnessPresent ? 245 : 170);

    page.drawLine({
      start: { x: margin, y },
      end: { x: pageSize[0] - margin, y },
      thickness: 1,
      color: rgb(0.15, 0.15, 0.15),
    });

    y -= 24;

    drawParagraph(
      "By signing below, the employee acknowledges receipt of this counseling documentation.",
      regularFont,
      10,
      14
    );

    y -= 30;

    const signatureLineY = y - 52;

    await drawSignatureBlock({
      x: margin,
      y: signatureLineY,
      width: 220,
      signature: employeeSignature,
      name: draftData.employeeName,
      label: "Employee Signature",
    });

    await drawSignatureBlock({
      x: 330,
      y: signatureLineY,
      width: 220,
      signature: supervisorSignature,
      name: draftData.immediateSupervisorName || "Supervisor",
      label: "Supervisor Signature",
    });

    if (draftData.witnessPresent) {
      await drawSignatureBlock({
        x: margin,
        y: signatureLineY - 88,
        width: 220,
        signature: witnessSignature,
        name: draftData.witnessName || "Witness",
        label: draftData.witnessTitle
          ? `Witness Signature - ${draftData.witnessTitle}`
          : "Witness Signature",
      });
    }

    return await pdf.save();
  }

  async function downloadPdf() {
    const bytes = await generatePdf();

    const blob = new Blob([new Uint8Array(bytes)], {
      type: "application/pdf",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${draftData.employeeName}-Counseling.pdf`;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function finalizeCounseling() {
    setFinalizing(true);

    try {
      const bytes = await generatePdf();
      const uint8 = new Uint8Array(bytes);

      let binary = "";

      uint8.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });

      const pdfBase64 = btoa(binary);

      const response = await fetch("/api/counseling/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId,
          pdfBase64,
          fileName: `${draftData.employeeName}-Counseling.pdf`,
          recipients: recipientEmails,
          employeeName: draftData.employeeName,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Finalize failed.");
      }

      alert("Counseling finalized and delivered successfully.");
      router.push("/counseling");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to finalize counseling."
      );
    }

    setFinalizing(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-4 rounded-3xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Deliver & Sign Counseling
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Review the document with the employee. Tap a signature area to
              sign.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/counseling/${draftId}`)}
              className="rounded-2xl"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              variant="outline"
              onClick={downloadPdf}
              className="rounded-2xl"
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>

            <Button
              onClick={finalizeCounseling}
              disabled={finalizing}
              className="rounded-2xl bg-[#0f2e6d] text-white hover:bg-[#163d8f]"
            >
              <Mail className="mr-2 h-4 w-4" />
              {finalizing ? "Finalizing..." : "Finalize & Email"}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border bg-white p-4 shadow-sm md:p-8">
            <article className="mx-auto min-h-[900px] max-w-[850px] bg-white px-4 py-8 text-slate-900 md:px-12">
              <DocumentLetterhead />

              <h2 className="mt-6 text-center text-xl font-bold tracking-wide text-slate-900">
                EMPLOYEE COUNSELING DOCUMENTATION
              </h2>

              <div className="mt-8 grid gap-3 text-sm md:grid-cols-2">
                <Info label="Employee Name" value={draftData.employeeName} />
                <Info
                  label="Counseling Date"
                  value={formatDate(draftData.counselingDate)}
                />
                <Info
                  label="Employee Title"
                  value={draftData.employeeTitle || "-"}
                />
                <Info
                  label="Incident Date"
                  value={formatDate(draftData.incidentDate)}
                />
                <Info label="Employee Email" value={draftData.employeeEmail} />
                <Info
                  label="Supervisor"
                  value={draftData.immediateSupervisorName || "-"}
                />
              </div>

              <p className="mt-8 text-sm leading-6">
                This document is provided to discuss concerns regarding job
                performance and/or conduct and to outline expectations for
                improvement moving forward.
              </p>

              <DocSection
                title="INCIDENT DETAILS"
                content={incidentDetailsForDocument}
              />
              <DocSection
                title="POLICY / EXPECTATION INVOLVED"
                content={draftData.draft.policyViolated}
              />
              <DocSection
                title="WHY THIS IS CONSIDERED A CONCERN"
                content={draftData.draft.whyWrong}
              />
              <DocSection
                title="EXPECTATIONS MOVING FORWARD"
                content={draftData.draft.expectations}
              />
              <DocSection
                title="FAILURE TO IMPROVE"
                content={draftData.draft.failureToImprove}
              />

              <div className="mt-10 border-t pt-6">
                <p className="text-sm leading-6">
                  By signing below, the employee acknowledges receipt of this
                  counseling documentation.
                </p>

                <div className="mt-8 grid gap-8 md:grid-cols-2">
                  <InlineSignature
                    title="Employee Signature"
                    printedName={draftData.employeeName}
                    signature={employeeSignature}
                    onClick={() => openSignature("employee")}
                  />

                  <InlineSignature
                    title="Supervisor Signature"
                    printedName={
                      draftData.immediateSupervisorName || "Supervisor"
                    }
                    signature={supervisorSignature}
                    onClick={() => openSignature("supervisor")}
                  />

                  {draftData.witnessPresent && (
                    <InlineSignature
                      title={
                        draftData.witnessTitle
                          ? `Witness Signature - ${draftData.witnessTitle}`
                          : "Witness Signature"
                      }
                      printedName={draftData.witnessName || "Witness"}
                      signature={witnessSignature}
                      onClick={() => openSignature("witness")}
                    />
                  )}
                </div>
              </div>
            </article>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-[#0f2e6d]">Recipients</h3>

              <div className="mt-3 space-y-2">
                {recipientEmails.map((email) => (
                  <div
                    key={email}
                    className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700"
                  >
                    {email}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-[#0f2e6d]">
                Signature Status
              </h3>

              <div className="mt-3 space-y-2">
                <Status label="Employee" complete={Boolean(employeeSignature)} />
                <Status
                  label="Supervisor"
                  complete={Boolean(supervisorSignature)}
                />
                {draftData.witnessPresent && (
                  <Status
                    label="Witness"
                    complete={Boolean(witnessSignature)}
                  />
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {activeSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {activeSignature === "employee"
                    ? "Employee Signature"
                    : activeSignature === "supervisor"
                      ? "Supervisor Signature"
                      : "Witness Signature"}
                </h2>

                <p className="text-sm text-slate-500">
                  Sign inside the box below. Works with mouse, finger, or stylus.
                </p>
              </div>

              <button onClick={() => setActiveSignature(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-[#0f2e6d] bg-white">
                <SignatureCanvas
                  ref={
                    activeSignature === "employee"
                      ? employeeSignatureRef
                      : activeSignature === "supervisor"
                        ? supervisorSignatureRef
                        : witnessSignatureRef
                  }
                  penColor="black"
                  canvasProps={{
                    className: "h-[280px] w-full touch-none bg-white",
                  }}
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={clearActiveSignature}
                >
                  Clear
                </Button>

                <Button
                  className="rounded-2xl bg-[#0f2e6d] text-white hover:bg-[#163d8f]"
                  onClick={saveActiveSignature}
                >
                  Save Signature
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function DocumentLetterhead() {
  return (
    <div className="text-center">
      <img
        src={LOGO_PATH}
        alt="Arkansas Northeastern College"
        className="mx-auto w-[165px] max-w-full object-contain"
      />

      <div className="mt-4 border-t-2 border-slate-900" />
    </div>
  );
}

function InlineSignature({
  title,
  printedName,
  signature,
  onClick,
}: {
  title: string;
  printedName: string;
  signature: string;
  onClick: () => void;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onClick}
        className="flex h-[110px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-[#0f2e6d]/40 bg-slate-50 transition hover:bg-blue-50"
      >
        {signature ? (
          <img
            src={signature}
            alt={title}
            className="max-h-[75px] max-w-[220px] object-contain"
          />
        ) : (
          <div className="flex items-center gap-2 text-sm font-medium text-[#0f2e6d]">
            <PenLine className="h-4 w-4" />
            Tap to Add Signature
          </div>
        )}
      </button>

      <div>
        <div className="border-b border-slate-900 pb-1" />

        <div className="mt-1">
          <p className="text-sm font-semibold text-slate-900">
            {printedName}
          </p>

          <p className="text-xs text-slate-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-semibold">{label}: </span>
      <span>{value || "-"}</span>
    </div>
  );
}

function DocSection({ title, content }: { title: string; content: string }) {
  return (
    <section className="mt-7">
      <h3 className="text-sm font-bold tracking-wide text-[#0f2e6d]">
        {title}
      </h3>

      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-900">
        {content || "-"}
      </div>
    </section>
  );
}

function Status({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
      <span>{label}</span>

      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          complete ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
        }`}
      >
        {complete && <CheckCircle2 className="mr-1 h-3 w-3" />}
        {complete ? "Signed" : "Pending"}
      </span>
    </div>
  );
}

function drawLetterhead(
  page: PDFPage,
  logoImage: PDFImage,
  pageSize: [number, number],
  margin: number
) {
  const maxLogoWidth = 105;
  const maxLogoHeight = 48;

  const logoScale = Math.min(
    maxLogoWidth / logoImage.width,
    maxLogoHeight / logoImage.height
  );

  const logoWidth = logoImage.width * logoScale;
  const logoHeight = logoImage.height * logoScale;
  const logoX = (pageSize[0] - logoWidth) / 2;
  const topPadding = 28;
  const logoY = pageSize[1] - topPadding - logoHeight;

  page.drawImage(logoImage, {
    x: logoX,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  });

  const lineY = logoY - 12;

  page.drawLine({
    start: { x: margin, y: lineY },
    end: { x: pageSize[0] - margin, y: lineY },
    thickness: 1,
    color: rgb(0.05, 0.05, 0.05),
  });

  return lineY - 26;
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont
) {
  const width = font.widthOfTextAtSize(text, size);

  page.drawText(text, {
    x: (612 - width) / 2,
    y,
    size,
    font,
    color: rgb(0.05, 0.05, 0.05),
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = String(text || "").split(/\n+/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/);
    let line = "";

    if (!words.length || !words[0]) {
      lines.push("");
      continue;
    }

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, size);

      if (width <= maxWidth) {
        line = testLine;
      } else {
        if (line) {
          lines.push(line);
        }

        line = word;
      }
    }

    if (line) {
      lines.push(line);
    }

    lines.push("");
  }

  return lines;
}

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString();
}
