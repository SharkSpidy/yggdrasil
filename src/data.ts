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
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const latestByGeneration = new Map<number, Person>();
  let root: Person | null = null;
  let nextId = 1;

  const makeId = (generation: number): string => `g${generation}-${String(nextId++).padStart(3, "0")}`;

  for (const line of lines) {
    const match = line.match(/^G-(\d+)(?:[A-Z]+)?\s*(.*)$/i);
    if (!match) continue;

    const generation = Number(match[1]);
    const rest = normalizeText(match[2]).replace(/^-+\s*/, "");

    if (!rest) continue;

    if (/^(children?|child)\s*[-:]/i.test(rest)) {
      const parent = latestByGeneration.get(generation - 1) ?? root;
      if (!parent) continue;

      const names = rest
        .replace(/^(children?|child)\s*[-:]\s*/i, "")
        .split(/\s*,\s*|\s+and\s+/i)
        .map((value) => normalizeText(value))
        .filter(Boolean);

      for (const name of names) {
        const child = makePerson(name);
        child.id = makeId(generation);
        attachChild(parent, child);
      }
      continue;
    }

    const spouseMatch = rest.match(/^(.*?)(?:\s*\(([^)]*)\))?$/);
    const personName = normalizeText(spouseMatch?.[1] ?? rest);
    const spouseName = spouseMatch?.[2] ? normalizeText(spouseMatch[2]) : undefined;
    const person = makePerson(personName, spouseName);
    person.id = makeId(generation);

    if (generation === 1) {
      root = person;
    } else {
      const parent = latestByGeneration.get(generation - 1) ?? root;
      if (parent) {
        attachChild(parent, person);
      }
    }

    latestByGeneration.set(generation, person);
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
