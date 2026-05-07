function richTextToHtml(text: string): string {
  const lines = text.split("\n");
  const htmlLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h4>${inline(trimmed.slice(4))}</h4>`);
    } else if (trimmed.startsWith("## ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<h3>${inline(trimmed.slice(3))}</h3>`);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { htmlLines.push("<ul>"); inList = true; }
      htmlLines.push(`<li>${inline(trimmed.slice(2))}</li>`);
    } else if (trimmed === "") {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
    } else {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(`<p>${inline(trimmed)}</p>`);
    }
  }

  if (inList) htmlLines.push("</ul>");

  return htmlLines.join("");
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export default function RichText({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={`rich-text text-sm leading-7${className ? ` ${className}` : ""}`}
      style={{ color: "var(--color-muted)" }}
      dangerouslySetInnerHTML={{ __html: richTextToHtml(children) }}
    />
  );
}
