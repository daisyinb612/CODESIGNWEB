const MAX_EXPORT_BYTES = 2_000_000;

function safeFilename(value: string) {
  const cleaned = Array.from(value, (character) => character.charCodeAt(0) < 32 ? "-" : character)
    .join("")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
  return cleaned || "brickbuddy-export.json";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const requestedName = String(form.get("name") ?? "brickbuddy-export.json");
  const content = String(form.get("content") ?? "");
  const requestedType = String(form.get("type") ?? "");

  const filename = safeFilename(requestedName);
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const isJson = filename.toLowerCase().endsWith(".json");
  if (!isCsv && !isJson) return new Response("Unsupported export type", { status: 400 });

  const bytes = new TextEncoder().encode(content);
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_EXPORT_BYTES) {
    return new Response("Invalid export size", { status: 400 });
  }

  const contentType = isCsv
    ? "text/csv; charset=utf-8"
    : "application/json; charset=utf-8";
  const expectedType = isCsv ? "text/csv" : "application/json";
  if (!requestedType.startsWith(expectedType)) {
    return new Response("Mismatched export type", { status: 400 });
  }

  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_");
  const disposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": disposition,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
