// Dev helper: which FreeLLMAPI models answer a tool call quickly right now?
const models = process.argv.slice(2);
const body = (model) => ({
  model, max_tokens: 300,
  messages: [{ role: "system", content: "You are a salon receptionist. Use tools for availability." }, { role: "user", content: "Any free times for a haircut tomorrow afternoon?" }],
  tools: [{ type: "function", function: { name: "checkAvailability", description: "Open times for a service on a date", parameters: { type: "object", properties: { service: { type: "string" }, date: { type: "string" } }, required: ["service", "date"] } } }],
});
await Promise.all(models.map(async (m) => {
  const out = [];
  for (let i = 0; i < 2; i++) {
    const t = Date.now();
    try {
      const r = await fetch(process.env.AI_BASE_URL + "/chat/completions", { method: "POST", signal: AbortSignal.timeout(20000), headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.AI_API_KEY }, body: JSON.stringify(body(m)) });
      const j = await r.json();
      out.push(j.choices?.[0]?.message?.tool_calls ? `OK ${Date.now() - t}ms` : `NO(${r.status})`);
    } catch { out.push("TIMEOUT"); }
  }
  console.log(m.padEnd(28), out.join("  "));
}));
