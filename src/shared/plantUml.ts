/** Deliberately small, local PlantUML subset. Unsupported lines fail, never disappear. */
export function plantUmlToMermaid(input: string): string {
  const lines = input
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("'"));
  const unsupported = () =>
    new Error(
      "Этот синтаксис PlantUML не поддерживается. Доступны class, participant/actor, связи, сообщения и alt/loop/opt/par. Используйте Mermaid для других схем.",
    );
  if (
    lines.shift()?.toLowerCase() !== "@startuml" ||
    lines.pop()?.toLowerCase() !== "@enduml"
  )
    throw unsupported();
  const classes = lines.some((line) => /^(?:abstract\s+)?class\s/.test(line));
  const output = [classes ? "classDiagram" : "sequenceDiagram"];
  let inClass = false;
  for (const line of lines) {
    if (classes) {
      if (inClass) {
        if (line === "}") inClass = false;
        else if (!/^[+#~-]?[\w\s(),:<.>[\]?-]+$/.test(line))
          throw unsupported();
        output.push(line);
        continue;
      }
      const declaration = /^class\s+([A-Za-z_]\w*)(\s*\{)?$/.exec(line);
      if (declaration) {
        output.push(line);
        inClass = !!declaration[2];
        continue;
      }
      if (
        /^[A-Za-z_]\w*(?:\s+"[^"\n]+")?\s*(?:<\|--|--\|>|<\|\.\.|\.\.\|>|\*--|--\*|o--|--o|-->|<--|\.\.>|<\.\.|--)\s*(?:"[^"\n]+"\s+)?[A-Za-z_]\w*(?:\s*:\s*[^<>]+)?$/.test(
          line,
        )
      ) {
        output.push(line);
        continue;
      }
      throw unsupported();
    }
    const participant =
      /^(participant|actor)\s+(?:"([^"\n]+)"\s+as\s+)?([A-Za-z_]\w*)$/.exec(
        line,
      );
    if (participant) {
      output.push(
        `${participant[1]} ${participant[3]}${participant[2] ? ` as ${participant[2]}` : ""}`,
      );
      continue;
    }
    const arrow =
      /^([A-Za-z_]\w*)\s*(--?>|<--?)\s*([A-Za-z_]\w*)\s*:\s*(.+)$/.exec(line);
    if (arrow) {
      const reverse = arrow[2].startsWith("<");
      output.push(
        `${reverse ? arrow[3] : arrow[1]}${arrow[2].includes("--") ? "-->>" : "->>"}${reverse ? arrow[1] : arrow[3]}: ${arrow[4]}`,
      );
      continue;
    }
    if (
      /^(?:activate|deactivate)\s+[A-Za-z_]\w*$/.test(line) ||
      /^(?:alt|else|loop|opt|par|and)\s+[^<>]+$/.test(line) ||
      line === "end" ||
      /^note\s+(?:over\s+[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)?|(?:left|right)\s+of\s+[A-Za-z_]\w*)\s*:\s*.+$/i.test(
        line,
      )
    ) {
      output.push(line);
      continue;
    }
    throw unsupported();
  }
  if (inClass) throw unsupported();
  return output.join("\n");
}
