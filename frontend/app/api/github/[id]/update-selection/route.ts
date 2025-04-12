import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const selectionId = params.id;

  if (!selectionId) {
    return NextResponse.json({ detail: "Selection ID is required" }, { status: 400 });
  }

  try {
    const payload = await request.json();

    if (!payload.selected_files) {
      return NextResponse.json({ detail: "selected_files are required" }, { status: 400 });
    }

    // Construct the backend API URL
    const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
    const backendUpdateUrl = `${backendApiUrl}/api/github/${selectionId}/update-selection`;

    console.log(`Proxying PUT request to: ${backendUpdateUrl}`);

    const backendResponse = await fetch(backendUpdateUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`Backend API Error (${backendResponse.status}):`, data);
      return NextResponse.json({ detail: data.detail || "Failed to update selection via backend" }, { status: backendResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GitHub update selection proxy route:", error);
    return NextResponse.json({ detail: "Internal server error proxying PUT request" }, { status: 500 });
  }
}
