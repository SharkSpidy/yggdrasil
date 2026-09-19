import type { Person } from "./types";

function normalizeText(value: string): string {
  return value.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}

function makePerson(name: string, spouseName?: string): Person {
  const person: Person = {
    id: "",
    name: normalizeText(name),
  };

  if (spouseName && spouseName.trim()) {
    person.spouse = { name: normalizeText(spouseName) };
  }

  return person;
}

function attachChild(parent: Person, child: Person): void {
  parent.children = parent.children ?? [];
  parent.children.push(child);
}

export function parseFamilyText(raw: string): Person {
  const lines = raw.split(/\r?\n/);
  const generationStack: Array<{ generation: number; person: Person }> = [];
  let root: Person | null = null;
  let nextId = 1;

  const makeId = (generation: number): string => `g${generation}-${String(nextId++).padStart(3, "0")}`;

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) continue;

    const generationMatch = trimmedLine.match(/^G-(\d+)(?:[A-Z]+)?\s*(.*)$/i);
    if (!generationMatch) continue;

    const generation = Number(generationMatch[1]);
    let content = normalizeText(generationMatch[2] || "");
    content = content.replace(/^-+\s*/, "");

    if (!content) continue;

    if (/^(children?|child)\b/i.test(content)) {
      const parent = generationStack[generationStack.length - 1]?.person ?? root;
      if (!parent) continue;

      const namesText = content.replace(/^(children?|child)\s*[-:]\s*/i, "");
      const childNames = namesText
        .split(/\s*,\s*|\s+and\s+/i)
        .map((value) => normalizeText(value))
        .filter(Boolean);

      for (const childName of childNames) {
        const child = makePerson(childName);
        child.id = makeId(generation);
        attachChild(parent, child);
      }
      continue;
    }

    while (generationStack.length && generationStack[generationStack.length - 1].generation >= generation) {
      generationStack.pop();
    }

    const spouseMatch = content.match(/^(.*?)(?:\s*\(([^)]*)\))?$/);
    const personName = normalizeText(spouseMatch?.[1] ?? content);
    const spouseName = spouseMatch?.[2] ? normalizeText(spouseMatch[2]) : undefined;
    const person = makePerson(personName, spouseName);
    person.id = makeId(generation);

    if (!root) {
      root = person;
    } else {
      const parent = generationStack[generationStack.length - 1]?.person ?? root;
      attachChild(parent, person);
    }

    generationStack.push({ generation, person });
  }

  if (!root) {
    throw new Error("No root member was found in the family data file.");
  }

  return root;
}

export async function loadFamilyData(): Promise<Person> {
  const response = await fetch("/data.txt");
  if (!response.ok) {
    throw new Error(`Unable to load family data: ${response.status}`);
  }

  return parseFamilyText(await response.text());
}
