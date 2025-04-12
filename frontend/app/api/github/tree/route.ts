import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get("repo_url");

  if (!repoUrl) {
    return NextResponse.json({ detail: "Repository URL is required" }, { status: 400 });
  }

  // Construct the backend API URL
  const backendApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
  const backendTreeUrl = `${backendApiUrl}/api/github/tree?repo_url=${encodeURIComponent(repoUrl)}`;

  console.log(`Proxying request to: ${backendTreeUrl}`);

  try {
    const backendResponse = await fetch(backendTreeUrl, {
      method: "GET",
      headers: {
        // Pass any necessary headers, e.g., potential auth tokens in the future
        Accept: "application/json",
      },
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error(`Backend API Error (${backendResponse.status}):`, data);
      // Forward the backend error message and status
      return NextResponse.json({ detail: data.detail || "Failed to fetch from backend" }, { status: backendResponse.status });
    }

    // Forward the successful response from the backend
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GitHub tree proxy route:", error);
    return NextResponse.json({ detail: "Internal server error proxying request" }, { status: 500 });
  }
}
