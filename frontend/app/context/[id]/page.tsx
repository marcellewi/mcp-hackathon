import LogViewer from "@/components/log-viewer";

type LogFile = {
  id: number;
  name: string;
  content: string;
};

async function getLogById(id: string): Promise<LogFile> {
  const response = await fetch(`${process.env.API_URL}/api/logs/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch log");
  }

  return response.json();
}

export default async function ContextPage({ params }: { params: { id: string } }) {
  const log = await getLogById(params.id);

  return (
    <div className="container mx-auto py-10 px-4">
      <LogViewer log={log} />
    </div>
  );
}
