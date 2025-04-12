def get_logs(uri="http://127.0.0.1:8001/api/logs"):
    import requests
    import json

    try:
        response = requests.get(uri)
        response.raise_for_status()
        logs = response.json()
    except Exception as e:
        return f"Failed to fetch logs: {e}"

    prompt = [
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
        "Here are the logs:\n"
    ]

    for log in logs:
        prompt.append(
            f"\n--- LOG START ---\n"
            f"id: {log.get('id')}\n"
            f"filename: {log.get('filename')}\n"
            f"content:\n{log.get('content')}\n"
            f"--- LOG END ---"
        )

    return "\n".join(prompt)
