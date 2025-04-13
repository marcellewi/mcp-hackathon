import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import { Buffer } from "buffer";
import fs from "fs";
import path from "path";

const server = new McpServer({
  name: "Log & GitHub Retrieval MCP",
  version: "1.0.0",
});

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8001";

const LOG_API_BASE_URL = `${process.env.LOG_API_URL ?? "http://localhost:8001"}/api/logs`;
const GITHUB_API_BASE_URL = `${process.env.MAIN_BACKEND_API_URL ?? "http://localhost:8001"}/api/github`;

// Define headers globally
const GITHUB_API_TOKEN = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github.v3+json",
  "X-GitHub-Api-Version": "2022-11-28",
};
if (GITHUB_API_TOKEN) {
  headers["Authorization"] = `Bearer ${GITHUB_API_TOKEN}`;
}

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
    "Consider searching for where these logs appear in the codebase to understand their context and purpose.",
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
  const response = await fetch(`${LOG_API_BASE_URL}/${id}`);
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

// Helper function to create the standard prompt format for GitHub Selections
const createGitHubSelectionPrompt = (selection) => {
  const promptHeader = [
    "You are an expert software engineer.",
    "I will provide you with details of a saved GitHub repository selection.",
    "Your task is to understand the context provided by the selected files from this repository.",
    "",
    "The selection has the following structure:",
    "- id: a unique identifier for the selection",
    "- name: the name of the repository (owner/repo)",
    "- url: the URL of the repository",
    "- selected_files: a list of file paths selected from the repository",
    "",
    "Use this information, especially the list of selected files, to understand the relevant parts of the codebase.",
    "Here are the details:\n",
  ].join("\n");

  const selectionDetails = [
    `\n--- GITHUB SELECTION START ---\n`,
    `id: ${selection.id}\n`,
    `name: ${selection.name}\n`,
    `url: ${selection.url}\n`,
    `selected_files: \n  - ${selection.selected_files?.join("\n  - ") || "No files selected yet."}\n`,
    `--- GITHUB SELECTION END ---\n`,
  ].join("");

  return promptHeader + selectionDetails;
};

// Helper function to extract owner/repo from selection name or URL
const getRepoInfoFromSelection = (selection) => {
  if (selection.name && selection.name.includes("/")) {
    const [owner, repo] = selection.name.split("/");
    return { owner, repo };
  }
  // Fallback: Try parsing from URL (less reliable)
  try {
    const url = new URL(selection.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (url.hostname === "github.com" && pathParts.length >= 2) {
      return { owner: pathParts[0], repo: pathParts[1] };
    }
  } catch (e) {
    console.error("Could not parse owner/repo from URL:", selection.url);
  }
  return { owner: null, repo: null };
};

// Helper function to fetch content of a single file from GitHub - Added headers parameter
const fetchGitHubFileContent = async (owner, repo, filePath, requestHeaders) => {
  if (!owner || !repo) return { path: filePath, error: "Could not determine repository owner/name." };

  // Log if Authorization header is missing from the request
  if (!requestHeaders || !requestHeaders["Authorization"]) {
    console.warn(`[fetchGitHubFileContent] Warning: Authorization header is missing for ${owner}/${repo}/${filePath}. Requests may fail or be rate-limited.`);
  }

  const GITHUB_CONTENTS_API_BASE = "https://api.github.com";
  const apiUrl = `${GITHUB_CONTENTS_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`;

  console.log(`Fetching content for: ${owner}/${repo}/${filePath} from ${apiUrl}`);
  // Add detailed logging for headers
  console.log(`[fetchGitHubFileContent] Headers sent for ${filePath}:`, JSON.stringify(requestHeaders));

  try {
    // Use the passed headers
    const response = await fetch(apiUrl, { headers: requestHeaders });
    if (response.status === 404) {
      console.warn(`[fetchGitHubFileContent] File not found (404) for ${filePath}`);
      return { path: filePath, error: "File not found in repository." };
    }
    if (!response.ok) {
      // Log the full error response text
      const errorText = await response.text();
      console.error(`[fetchGitHubFileContent] GitHub API error for ${filePath}. Status: ${response.status}, Response: ${errorText}`);
      const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
      const rateLimitReset = response.headers.get("x-ratelimit-reset");
      let rateLimitInfo = "";
      if (rateLimitRemaining !== null) {
        rateLimitInfo = ` (Rate Limit Remaining: ${rateLimitRemaining})`;
      }
      if (rateLimitReset !== null) {
        const resetTime = new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString();
        rateLimitInfo += ` (Resets at: ${resetTime})`;
      }
      // Include full error text in the thrown error
      throw new Error(`GitHub API error (${response.status}): ${errorText}${rateLimitInfo}`);
    }
    const data = await response.json();
    if (data.type !== "file" || typeof data.content !== "string") {
      console.warn(`[fetchGitHubFileContent] Path is not a file or content is invalid for ${filePath}`);
      return { path: filePath, error: "Path does not point to a valid file." };
    }
    const decodedContent = Buffer.from(data.content, "base64").toString("utf8");
    console.log(`Successfully fetched content for ${filePath} (${decodedContent.length} chars)`);
    return { path: filePath, content: decodedContent };
  } catch (error) {
    console.error(`Error fetching content for ${filePath}:`, error);
    return { path: filePath, error: error.message };
  }
};

// Updated helper function to format prompt with file content
const createGitHubContentPrompt = (selection, fileResults) => {
  const { owner, repo } = getRepoInfoFromSelection(selection);
  const repoName = owner && repo ? `${owner}/${repo}` : selection.name;

  const promptHeader = [
    "You are an expert software engineer.",
    `I will provide you with the content of selected files from the GitHub repository: ${repoName}`,
    `Repository URL: ${selection.url}`,
    "Your task is to analyze the provided file contents to understand the relevant parts of the codebase.",
    "",
    "Here is the content of the selected files:",
    "",
  ].join("\n");

  const fileContents = fileResults
    .map((result) => {
      const fileHeader = `--- FILE START: ${result.path} ---`;
      const fileFooter = `--- FILE END: ${result.path} ---\n`;
      let fileBody;
      if (result.content) {
        // Limit content lines if necessary (optional, can be very long)
        const lines = result.content.split("\n");
        fileBody =
          lines.length > maxContentLines * 5 // Allow more lines for code files
            ? lines.slice(0, maxContentLines * 5).join("\n") + "\n... [TRUNCATED] ..."
            : result.content;
      } else {
        fileBody = `[Error fetching file: ${result.error || "Unknown error"}]`;
      }
      return `${fileHeader}\n${fileBody}\n${fileFooter}`;
    })
    .join("\n"); // Add a newline between file blocks

  return promptHeader + fileContents;
};

// Tool to get the latest log
server.tool(
  "getLatestLog",
  {},
  async () => {
    console.log("Fetching latest log...");
    try {
      const response = await fetch(`${LOG_API_BASE_URL}/latest`);

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

// Tool to upload logs from a local folder
server.tool(
  "getFolderLogLocal",
  {
    folderPath: z.string().default("logs"),
    uriGet: z.string().default(`${API_BASE_URL}/api/logs`),
    uriPost: z.string().default(`${API_BASE_URL}/api/logs/upload-json-logs/`),
  },
  async ({ folderPath, uriGet, uriPost }) => {
    console.log(`Processing logs from folder: ${folderPath}`);
    try {
      // Get existing logs
      const response = await fetch(uriGet);
      if (!response.ok) {
        throw new Error(`Failed to retrieve existing logs: ${response.statusText}`);
      }
      const existingLogs = await response.json();
      console.log(`Retrieved ${existingLogs.length} existing logs`);

      // Prepare logs to upload
      const logsToUpload = [];

      // Read directory and process each .txt file
      const files = fs.readdirSync(folderPath);
      for (const filename of files) {
        if (filename.endsWith(".txt")) {
          const filePath = path.join(folderPath, filename);
          try {
            const content = fs.readFileSync(filePath, { encoding: "utf-8" });
            logsToUpload.push({
              filename: filename,
              content: content,
            });
            console.log(`Prepared log for upload: ${filename} (${content.length} characters)`);
          } catch (fileError) {
            console.error(`Error reading ${filename}: ${fileError.message}`);
          }
        }
      }

      // Upload logs
      if (logsToUpload.length > 0) {
        const postResponse = await fetch(uriPost, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(logsToUpload),
        });

        if (!postResponse.ok) {
          const errorText = await postResponse.text();
          throw new Error(`Error while uploading logs to ${uriPost}: ${postResponse.status} ${postResponse.statusText} | Response: ${errorText}`);
        }

        const uploadResult = await postResponse.json();
        console.log(`✅ Successfully uploaded ${logsToUpload.length} logs.`);

        // Return both the upload result and the log data as context
        return {
          content: [
            {
              type: "text",
              text: `Successfully uploaded ${logsToUpload.length} logs from folder ${folderPath}.\n\nUploaded logs:\n${JSON.stringify(logsToUpload, null, 2)}\n\nServer response:\n${JSON.stringify(uploadResult, null, 2)}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `No .txt files found in folder ${folderPath}.`,
            },
          ],
        };
      }
    } catch (error) {
      console.error(`Error in getFolderLogLocal: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error processing logs from folder: ${error.message}`,
          },
        ],
      };
    }
  },
  {
    description: "Upload log files from a local folder to the logs API",
  }
);

// Tool to get a GitHub selection by ID (Updated)
server.tool(
  "getGithubSelectionById",
  { id: z.string().uuid({ message: "Invalid UUID format" }) },
  async ({ id }) => {
    console.log(`Fetching GitHub selection with ID: ${id}`);
    try {
      // 1. Fetch selection details (Doesn't need specific GitHub API headers)
      const detailsResponse = await fetch(`${GITHUB_API_BASE_URL}/${id}`);
      console.log(`Response status for GitHub selection ID ${id}: ${detailsResponse.status}`);
      if (detailsResponse.status === 404) {
        return { content: [{ type: "text", text: `GitHub selection with ID ${id} not found.` }] };
      }
      if (!detailsResponse.ok) {
        const errorText = await detailsResponse.text();
        throw new Error(`Failed to fetch GitHub selection details ${id}: ${detailsResponse.status} - ${errorText}`);
      }
      const selection = await detailsResponse.json();
      console.log(`Successfully retrieved GitHub selection ID ${id}, Name: ${selection.name}`);

      // 2. Check if files are selected
      if (!selection.selected_files || selection.selected_files.length === 0) {
        console.log("No files selected for this GitHub entry.");
        const prompt = createGitHubSelectionPrompt(selection);
        return { content: [{ type: "text", text: prompt }] };
      }

      // 3. Fetch content for each selected file
      const { owner, repo } = getRepoInfoFromSelection(selection);
      if (!owner || !repo) {
        throw new Error("Could not determine repository owner/name from selection details.");
      }

      console.log(`Fetching content for ${selection.selected_files.length} files from ${owner}/${repo}...`);
      // Pass the globally defined headers object to the fetch function
      const contentPromises = selection.selected_files.map(
        (filePath) => fetchGitHubFileContent(owner, repo, filePath, headers) // Pass headers here
      );
      const fileResults = await Promise.all(contentPromises);

      // 4. Format the prompt with the fetched content
      const prompt = createGitHubContentPrompt(selection, fileResults);

      return {
        content: [{ type: "text", text: prompt }],
      };
    } catch (error) {
      console.error(`Error in getGithubSelectionById for ID ${id}: ${error.message}`);
      return {
        content: [
          {
            type: "text",
            text: `Error processing GitHub selection with ID ${id}: ${error.message}`,
          },
        ],
      };
    }
  },
  {
    description: "Fetches the content of selected files from a saved GitHub repository selection.",
  }
);

console.log("Starting MCP server...");
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server connected");
