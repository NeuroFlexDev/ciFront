// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { diagramSource, renderDiagram, sanitizeDiagram } from "./diagrams";
import { plantUmlToMermaid } from "./plantUml";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return 1600;
    },
  });
  // JSDOM has no layout engine. Supply geometry only; the actual Mermaid parser,
  // layout algorithms, SVG renderer and sanitizer run unchanged in these tests.
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value() {
      return {
        x: 0,
        y: 0,
        width: Math.min(600, Math.max(30, (this.textContent?.length ?? 0) * 7)),
        height: 24,
      };
    },
  });
  Object.defineProperty(SVGElement.prototype, "getComputedTextLength", {
    configurable: true,
    value() {
      return (this.textContent?.length ?? 0) * 7;
    },
  });
});

describe("local diagram safety", () => {
  it.each([
    'flowchart LR\nclick A "https://example.com"',
    "%%{init: {securityLevel: loose}}%%\nflowchart LR\nA-->B",
    'flowchart LR\nA["<img src=x onerror=alert(1)>"]',
    'flowchart LR\nA@{img:"https://evil.invalid"}',
    "flowchart LR\nclassDef x fill:url(https://evil.invalid)",
    "---\nconfig:\n---\nflowchart LR\nA-->B",
    "flowchart LR;A-->B;classDef x fill:url(//evil.invalid)",
    "@startuml\n!include https://evil.invalid\n@enduml",
    "flowchart LR\n" + "A-->B\n".repeat(161),
  ])("rejects executable, remote or unbounded source: %s", (input) => {
    expect(() => diagramSource(input)).toThrow();
  });

  it("rejects invalid or unsupported PlantUML without dropping content", () => {
    expect(() =>
      plantUmlToMermaid(
        "@startuml\nAlice -> Bob: Test\nskinparam backgroundColor red\n@enduml",
      ),
    ).toThrow();
    expect(() => plantUmlToMermaid("@startuml\nclass A {\n@enduml")).toThrow();
  });

  it("strips executable nodes, foreignObject, external references and CSS from SVG", () => {
    const { svg } = sanitizeDiagram(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" onload="alert(1)"><script>alert(1)</script><foreignObject><div>HTML</div></foreignObject><image href="https://evil.invalid"/><a href="javascript:alert(1)">link</a><style>@import url(https://evil.invalid)</style><rect width="30" height="20" style="fill:url(https://evil.invalid)"/><path marker-end="url(#arrow)" d="M0 0L30 20"/></svg>',
    );
    expect(svg).not.toMatch(
      /foreignObject|onload|script|href|style|evil\.invalid|<image|<a[ >]/i,
    );
    expect(svg).toContain("<rect");
    expect(svg).toContain("url(#arrow)");
  });
});

describe("actual Mermaid render", () => {
  it.each([
    [
      "flow",
      "mermaid",
      'flowchart LR\nA["Начало"] --> B["Проверка"]',
      "Начало",
    ],
    [
      "sequence",
      "mermaid",
      "sequenceDiagram\nparticipant A as Автор\nparticipant B as Курс\nA->>B: Сохранить",
      "Сохранить",
    ],
    [
      "class",
      "uml",
      "classDiagram\nclass Course {\n+title\n}\nclass Lesson\nCourse --> Lesson",
      "Course",
    ],
    [
      "state",
      "mermaid",
      "stateDiagram-v2\n[*] --> Draft\nDraft --> Published\nPublished --> [*]",
      "Published",
    ],
    ["ER", "mermaid", "erDiagram\nCOURSE ||--o{ LESSON : contains", "LESSON"],
    ["pie", "mermaid", 'pie title Results\n"Done" : 12\n"Review" : 4', "Done"],
    [
      "gantt",
      "mermaid",
      "gantt\n dateFormat YYYY-MM-DD\n section Course\n Review :a1, 2026-10-22, 1d",
      "Review",
    ],
    [
      "journey",
      "mermaid",
      "journey\n title Learning\n section Course\n Read lesson: 5: Learner",
      "Read lesson",
    ],
    [
      "timeline",
      "mermaid",
      "timeline\n title Learning\n 2026 : Course\n 2027 : Review",
      "Course",
    ],
    [
      "mindmap",
      "mermaid",
      "mindmap\n root((Course))\n  Lesson\n  Review",
      "Lesson",
    ],
    [
      "quadrant",
      "mermaid",
      "quadrantChart\n title Priority\n x-axis Low --> High\n y-axis Low --> High\n Task: [0.3, 0.6]",
      "Task",
    ],
    [
      "xychart",
      "mermaid",
      "xychart-beta\n x-axis [a, b, c]\n y-axis 0 --> 10\n bar [2, 5, 8]",
      "a",
    ],
    [
      "PlantUML sequence",
      "plantuml",
      '@startuml\nparticipant "Ученик" as U\nparticipant Course\nU -> Course: Читать\nCourse --> U: Урок\n@enduml',
      "Читать",
    ],
    [
      "PlantUML class",
      "plantuml",
      "@startuml\nclass Course {\n+title\n}\nclass Lesson\nCourse --> Lesson\n@enduml",
      "Course",
    ],
  ])(
    "renders %s without browser automation",
    async (_, kind, source, label) => {
      const result = await renderDiagram(source, kind, { theme: "print" });
      expect(result.svg).toContain(label);
      expect(result.svg).toMatch(/<(?:path|rect|circle)/);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
      expect(result.svg).not.toMatch(
        /<foreignObject|<script|<style|onload=|href=/i,
      );
      expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
    },
    15000,
  );

  it("invalid syntax leaves no leaked offscreen DOM and the next diagram still works", async () => {
    await expect(
      renderDiagram('flowchart LR\nA["unterminated'),
    ).rejects.toThrow("синтаксис");
    expect(document.querySelector('[aria-hidden="true"]')).toBeNull();
    expect((await renderDiagram("flowchart LR\nA --> B")).svg).toContain(
      "<svg",
    );
  });
});
