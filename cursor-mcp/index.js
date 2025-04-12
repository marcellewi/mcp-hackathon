import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

const server = new McpServer({
  name: "Log Retrieval MCP",
  version: "1.0.0",
});

const API_BASE_URL = `${process.env.API_URL ?? "http://localhost:8001"}/api/logs`;
const maxContentLines = 500;

server.tool("getLatestLog", {}, async () => {
  console.log("Fetching latest log...");
  try {
    const response = await fetch(`${API_BASE_URL}/latest`);
    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      console.error(`Failed to fetch logs: ${response.statusText}`);
      throw new Error(`Failed to fetch logs: ${response.statusText}`);
    }

    const logs = await response.json();
    console.log(`Retrieved ${logs.length} logs`);

    if (!logs || logs.length === 0) {
      console.log("No logs found");
      return {
        content: [{ type: "text", text: "No logs found." }],
      };
    }

    // Assuming logs are returned in order, get the last one
    const latestLog = logs[logs.length - 1];
    console.log(`Latest log ID: ${latestLog.id}, Filename: ${latestLog.filename}`);

    // Limit content to 10k lines if needed
    const contentLines = latestLog.content.split("\n");
    const limitedContent = contentLines.length > maxContentLines ? contentLines.slice(0, maxContentLines).join("\n") : latestLog.content;

    const prompt = [
      "You are an expert data engineer.",
      "I will provide you with several logs from different files.",
      "Your task is to analyze them and identify any issues or suggest improvements based on the content.",
      "",
      "Each log has the following structure:",
      "- id: a numeric identifier for the file",
      "- filename: the name of the file",
      "- content: the actual log or data from the file",
      "",
      "You might receive multiple files at once. Please analyze **all of them** before responding.",
      "Here are the logs:\n",
      `\n--- LOG START ---\n`,
      `id: ${latestLog.id}\n`,
      `filename: ${latestLog.filename}\n`,
      `content:\n${limitedContent}\n`,
      `--- LOG END ---`,
    ].join("\n");

    return {
      content: [{ type: "text", text: prompt }],
    };
  } catch (error) {
    console.error(`Error in getLatestLog: ${error.message}`);
    return {
      content: [{ type: "text", text: `Error fetching latest log: ${error.message}` }],
    };
  }
});

server.tool("getLogById", { id: z.number() }, async ({ id }) => {
  console.log(`Fetching log with ID: ${id}`);
  try {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    console.log(`Response status for log ID ${id}: ${response.status}`);

    if (response.status === 404) {
      console.log(`Log with ID ${id} not found`);
      return {
        content: [{ type: "text", text: `Log with ID ${id} not found.` }],
      };
    }

    if (!response.ok) {
      console.error(`Failed to fetch log with ID ${id}: ${response.statusText}`);
      throw new Error(`Failed to fetch log: ${response.statusText}`);
    }

    const log = await response.json();
    console.log(`Successfully retrieved log ID ${id}, Filename: ${log.name}`);

    // Limit content to 10k lines if needed
    const contentLines = log.content.split("\n");
    const limitedContent = contentLines.length > maxContentLines ? contentLines.slice(0, maxContentLines).join("\n") : log.content;

    const prompt = [
      "You are an expert data engineer.",
      "I will provide you with several logs from different files.",
      "Your task is to analyze them and identify any issues or suggest improvements based on the content.",
      "",
      "Each log has the following structure:",
      "- id: a numeric identifier for the file",
      "- filename: the name of the file",
      "- content: the actual log or data from the file",
      "",
      "You might receive multiple files at once. Please analyze **all of them** before responding.",
      "Here are the logs:\n",
      `\n--- LOG START ---\n`,
      `id: ${log.id}\n`,
      `filename: ${log.name}\n`,
      `content:\n${limitedContent}\n`,
      `--- LOG END ---`,
    ].join("\n");

    return {
      content: [{ type: "text", text: prompt }],
    };
  } catch (error) {
    console.error(`Error in getLogById for ID ${id}: ${error.message}`);
    return {
      content: [
        {
          type: "text",
          text: `Error fetching log with ID ${id}: ${error.message}`,
        },
      ],
    };
  }
});

console.log("Starting Log Retrieval MCP server...");
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("Log Retrieval MCP server connected");
