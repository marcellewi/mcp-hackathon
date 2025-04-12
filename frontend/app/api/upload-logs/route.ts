import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const zipFile = formData.get("zip_file") as File;

    if (!zipFile) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Get the API URL from environment variables
    const externalApiUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const logsEndpoint = `${externalApiUrl}/api/logs/upload-logs/`;

    // Create a new FormData to send the file
    const externalFormData = new FormData();
    externalFormData.append("zip_file", zipFile);

    console.log("Sending request to:", logsEndpoint);

    const externalApiResponse = await fetch(logsEndpoint, {
      method: "POST",
      body: externalFormData,
    });

    if (!externalApiResponse.ok) {
      const errorText = await externalApiResponse.text();
      console.error("API Error:", externalApiResponse.status, errorText);
      throw new Error(
        `External API responded with status: ${externalApiResponse.status} - ${errorText}`
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
