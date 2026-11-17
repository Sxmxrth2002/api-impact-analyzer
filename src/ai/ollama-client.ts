const OLLAMA_URL = "http://localhost:11434/api/generate";
const MODEL = "llama3.2";

export async function generateExplanation(prompt: string): Promise<string> {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status}`);
      }

      const data: unknown = await response.json();

      if (
        typeof data !== "object" ||
        data === null ||
        !("response" in data) ||
        typeof data.response !== "string"
      ) {
        throw new Error("Invalid Ollama response");
      }

      return data.response.trim();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn("Ollama request failed. Retrying...", error);
    }
  }

  throw new Error("Ollama generation failed");
}
