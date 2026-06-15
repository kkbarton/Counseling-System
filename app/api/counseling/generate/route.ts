import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

type GeneratePayload = {
  employeeName: string;
  employeeTitle: string;
  incidentDetails: string;
  incidentDate?: string;
  jobDescriptionText?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeneratePayload;

    if (!body.incidentDetails?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Incident details are required." },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing GEMINI_API_KEY in .env.local." },
        { status: 500 }
      );
    }

    const policyPath = path.join(
      process.cwd(),
      "public",
      "Policy manual for AI tool (Arledge).pdf"
    );

    if (!fs.existsSync(policyPath)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Policy manual not found at: ${policyPath}`,
        },
        { status: 500 }
      );
    }

    const policyPdfBase64 = fs.readFileSync(policyPath).toString("base64");

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const prompt = `
You are assisting Arkansas Northeastern College HR in drafting formal employee counseling wording.

Use the attached ANC policy manual as the primary policy reference.

Employee:
${body.employeeName}
${body.employeeTitle || "Title not provided"}

Incident Details:
Rewrite the following incident details into a professional HR documentation tone BEFORE generating the counseling draft.

IMPORTANT RULES:
- Do NOT add any facts, assumptions, dates, names, policy violations, or consequences that were not provided.
- Do NOT exaggerate or soften the meaning.
- Keep the same meaning and intent.
- Preserve uncertainty if the original wording is uncertain.
- If the original incident details are written as a fragment, convert them into a complete professional sentence without adding new facts.
- Use objective, factual, professional wording only.
- The rewritten wording must remain editable by HR before delivery.

Incident Date:
${body.incidentDate || "Not provided"}

Original Incident Details:
${body.incidentDetails}

Job Description Context:
${body.jobDescriptionText || "No job description text provided."}

This document should read like a professionally written HR corrective action form created by an experienced HR department.

Return ONLY valid JSON with this exact structure:
{
  "rewrittenIncidentDetails": "",
  "policyViolated": "",
  "whyWrong": "",
  "expectations": "",
  "failureToImprove": ""
}

WRITING REQUIREMENTS:
- Responses should be professionally written and sufficiently detailed.
- Each section should typically contain 3-6 complete sentences unless the situation truly requires less.
- Avoid extremely short or generic responses.
- Avoid repetitive wording between sections.
- Use objective, factual, professional HR-style language.
- Keep wording corrective and professional rather than emotional or aggressive.
- "Policy Violated" should identify the exact policy, rule, procedure, or workplace expectation involved when it can be determined from the information provided. It should not invent a policy name or policy number. If the exact policy is not provided, state the specific workplace expectation involved in professional wording.
- "Why Wrong" should clearly explain the impact of the behavior or issue on operations, professionalism, students, coworkers, safety, service, expectations, or the workplace environment as applicable.
- "Expectations" should clearly explain the expected improvement and future conduct requirements.
- "Failure To Improve" should clearly explain that additional corrective action, up to and including termination, may occur if improvement does not occur.
- Do not use bullet points.
- Do not use markdown.
- Do not use quotation marks around responses.
- Do not overly summarize.
- Maintain a formal HR counseling tone appropriate for official employee documentation.
- Include the incident date naturally in the rewritten incident details if a date was provided.
`;

    const modelFallbacks = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ];

    let rawText = "";
    let lastError: unknown = null;

    for (const model of modelFallbacks) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: policyPdfBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });

        rawText = result.text || "";

        if (rawText.trim()) {
          break;
        }
      } catch (error) {
        lastError = error;
        console.warn(`Gemini model failed: ${model}`, error);
      }
    }

    if (!rawText.trim()) {
      throw new Error(
        lastError instanceof Error
          ? lastError.message
          : "All Gemini model fallbacks failed."
      );
    }

    const parsed = JSON.parse(rawText);

    return NextResponse.json({
      ok: true,
      draft: parsed,
    });
  } catch (error) {
    console.error("Gemini counseling generation error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate counseling wording.",
      },
      { status: 500 }
    );
  }
}
