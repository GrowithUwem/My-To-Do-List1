module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { task } = req.body || {};

  if (!task || typeof task !== "string") {
    res.status(400).json({ error: "Task text is required" });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it in your Vercel project settings." });
    return;
  }

  try {
    const model = "gemini-3.5-flash-lite";
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      model +
      ":generateContent?key=" +
      process.env.GEMINI_API_KEY;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  'Break this task into 3 to 6 small, actionable subtasks: "' +
                  task +
                  '". Respond ONLY with a JSON array of strings. No markdown, no extra text, just the array.',
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: (data.error && data.error.message) || "AI request failed" });
      return;
    }

    const rawText =
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text;

    let subtasks = [];

    if (rawText) {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      try {
        subtasks = JSON.parse(cleaned);
      } catch (parseErr) {
        subtasks = cleaned
          .split("\n")
          .map((line) => line.replace(/^[-*\d.]+\s*/, "").trim())
          .filter(Boolean);
      }
    }

    res.status(200).json({ subtasks });
  } catch (err) {
    res.status(500).json({ error: "Server error: " + err.message });
  }
};
