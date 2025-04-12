import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";

const server = new McpServer({
  name: "Log Retrieval MCP",
  version: "1.0.0",
});

const API_BASE_URL = `${process.env.API_URL ?? "http://localhost:8001"}/api/logs`;
const maxContentLines = 20;

// Helper function to create the standard prompt format
const createLogPrompt = (logs) => {
  const promptHeader = [
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
  ].join("\n");

  const logEntries = Array.isArray(logs) ? logs : [logs];

  const logContents = logEntries
    .map((log) => {
      const contentLines = log.content.split("\n");
      const limitedContent = contentLines.length > maxContentLines ? contentLines.slice(0, maxContentLines).join("\n") : log.content;

      return [`\n--- LOG START ---\n`, `id: ${log.id}\n`, `filename: ${log.name || log.filename}\n`, `content:\n${limitedContent}\n`, `--- LOG END ---\n`].join("");
    })
    .join("");

  return promptHeader + logContents;
};

// Helper function to fetch a log by ID
const fetchLogById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/${id}`);
  console.log(`Response status for log ID ${id}: ${response.status}`);

  if (response.status === 404) {
    console.log(`Log with ID ${id} not found`);
    return null;
  }

  if (!response.ok) {
    console.error(`Failed to fetch log with ID ${id}: ${response.statusText}`);
    return null;
  }

  const log = await response.json();
  console.log(`Successfully retrieved log ID ${id}, Filename: ${log.name || log.filename}`);
  return log;
};

// Tool to get the latest log
server.tool(
  "getLatestLog",
  {},
  async () => {
    console.log("Fetching latest log...");
    try {
      const response = await fetch(`${API_BASE_URL}/latest`);

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const logs = await response.json();
      console.log(`Retrieved ${logs.length} logs`);

      if (!logs || logs.length === 0) {
        return {
          content: [{ type: "text", text: "No logs found." }],
        };
      }

      const latestLog = logs[logs.length - 1];
      const prompt = createLogPrompt(latestLog);

      return {
        content: [{ type: "text", text: prompt }],
      };
    } catch (error) {
      console.error(`Error in getLatestLog: ${error.message}`);
      return {
        content: [{ type: "text", text: `Error fetching latest log: ${error.message}` }],
      };
    }
  },
  {
    description: "Get the last uploaded log file",
  }
);

// Tool to get a log by ID
server.tool(
  "getLogById",
  { id: z.number() },
  async ({ id }) => {
    console.log(`Fetching log with ID: ${id}`);
    try {
      const log = await fetchLogById(id);

      if (!log) {
        return {
          content: [{ type: "text", text: `Log with ID ${id} not found.` }],
        };
      }

      const prompt = createLogPrompt(log);

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
  },
  {
    description: "Get a log file by its ID",
  }
);

// Tool to get multiple logs by IDs
server.tool(
  "getMultipleLogs",
  { ids: z.array(z.number()) },
  async ({ ids }) => {
    console.log(`Fetching multiple logs with IDs: ${ids.join(", ")}`);
    try {
      const logPromises = ids.map(fetchLogById);
      const logs = await Promise.all(logPromises);
      const validLogs = logs.filter((log) => log !== null);

      console.log(`Successfully retrieved ${validLogs.length} out of ${ids.length} requested logs`);

      if (validLogs.length === 0) {
        return {
          content: [{ type: "text", text: "None of the requested logs were found." }],
        };
      }

      const prompt = createLogPrompt(validLogs);

      return {
        content: [{ type: "text", text: prompt }],
      };
    } catch (error) {
      console.error(`Error in getMultipleLogs: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching multiple logs: ${error.message}`,
          },
        ],
      };
    }
  },
  {
    description: "Get multiple log files by their IDs",
  }
);

console.log("Starting Log Retrieval MCP server...");
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("Log Retrieval MCP server connected");
