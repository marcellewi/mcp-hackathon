import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!payload.url || !payload.selected_files) {
      return NextResponse.json({ detail: "URL and selected_files are required" }, { status: 400 });
    }

    // Construct the backend API URL
    const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    const backendSaveUrl = `${backendApiUrl}/api/github/save-selection`;

    console.log(`Proxying save selection request to: ${backendSaveUrl}`);

    const backendResponse = await fetch(backendSaveUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`Backend API Error (${backendResponse.status}):`, data);
      return NextResponse.json({ detail: data.detail || "Failed to save selection via backend" }, { status: backendResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GitHub save selection proxy route:", error);
    return NextResponse.json({ detail: "Internal server error proxying save request" }, { status: 500 });
  }
}
