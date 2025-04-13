import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const selectionId = await params.id;

  if (!selectionId) {
    return NextResponse.json({ detail: "Selection ID is required" }, { status: 400 });
  }

  // Construct the backend API URL
  const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
  const backendDetailsUrl = `${backendApiUrl}/api/github/${selectionId}`;

  console.log(`Proxying GET request to: ${backendDetailsUrl}`);

  try {
    const backendResponse = await fetch(backendDetailsUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`Backend API Error (${backendResponse.status}):`, data);
      return NextResponse.json({ detail: data.detail || "Failed to fetch from backend" }, { status: backendResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GitHub details proxy route:", error);
    return NextResponse.json({ detail: "Internal server error proxying GET request" }, { status: 500 });
  }
}
