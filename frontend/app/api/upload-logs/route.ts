import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get("zip_file") as File;

    if (!zipFile) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const externalApiUrl = "http://localhost:8000/api/logs/upload-logs";

    const externalFormData = new FormData();
    externalFormData.append("zip_file", zipFile);

    const externalApiResponse = await fetch(externalApiUrl, {
      method: "POST",
      headers: {},
      body: externalFormData,
    });

    if (!externalApiResponse.ok) {
      const errorData = await externalApiResponse.json().catch(() => null);
      throw new Error(
        `External API responded with status: ${externalApiResponse.status}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ""
        }`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Logs uploaded successfully",
    });
  } catch (error) {
    console.error("Error processing logs:", error);
    return NextResponse.json(
      {
        error: "Failed to process logs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
