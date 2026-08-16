import type { FamilyDataset, FamilyMember, Marriage } from '../types/family';

/**
 * Deterministically generates a multi-generation dataset so the tree
 * viewer's performance (100+ nodes, 5 generations, multiple marriages) can
 * be exercised without hand-authoring every record. The real app would
 * fetch an equivalent flat array from an API — this generator is only a
 * stand-in data source for the demo build.
 */

const FIRST_NAMES_M = [
  'Arthur', 'Henry', 'Walter', 'Frederick', 'George', 'Charles', 'Edward',
  'Albert', 'Samuel', 'Theodore', 'James', 'William', 'Robert', 'Thomas',
  'Michael', 'Daniel', 'Joseph', 'Benjamin', 'Nathaniel', 'Oliver',
];
const FIRST_NAMES_F = [
  'Eleanor', 'Margaret', 'Alice', 'Beatrice', 'Florence', 'Charlotte',
  'Elizabeth', 'Catherine', 'Josephine', 'Louisa', 'Clara', 'Rose',
  'Evelyn', 'Marion', 'Harriet', 'Agnes', 'Vera', 'Grace', 'Edith', 'Anne',
];
const LAST_NAMES = [
  'Avery', 'Thompson', 'Whitfield', 'Ashworth', 'Kensington', 'Merriweather',
  'Holloway', 'Sinclair', 'Pemberton', 'Fairweather',
];
const CITIES = [
  'Boston, Massachusetts', 'Portland, Maine', 'Providence, Rhode Island',
  'Hartford, Connecticut', 'Albany, New York', 'Concord, New Hampshire',
];
const OCCUPATIONS = [
  'Shipwright', 'Schoolteacher', 'Physician', 'Merchant', 'Librarian',
  'Cabinetmaker', 'Journalist', 'Attorney', 'Farmer', 'Clockmaker',
];

let seedCounter = 1;
/** Small deterministic PRNG so the generated dataset is stable across runs. */
function seededRandom() {
  seedCounter = (seedCounter * 9301 + 49297) % 233280;
  return seedCounter / 233280;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}
function yearsAgo(years: number, offset = 0) {
  const base = new Date();
  base.setFullYear(base.getFullYear() - years - offset);
  return base.toISOString().slice(0, 10);
}

let idCounter = 1;
function nextId() {
  return `m${idCounter++}`;
}

interface GenOptions {
  generations?: number; // how many generations deep
  childrenPerCouplePerGeneration?: number;
}

export function generateSampleData(options: GenOptions = {}): FamilyDataset {
  const { generations = 5, childrenPerCouplePerGeneration = 3 } = options;
  idCounter = 1;
  seedCounter = 1;

  const members: FamilyMember[] = [];
  const lastName = LAST_NAMES[0];

  function makeMember(
    genderHint: 'male' | 'female',
    generation: number,
    parentIds: string[],
    surname: string,
  ): FamilyMember {
    const id = nextId();
    const firstName = genderHint === 'male' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
    const age = 90 - generation * 18 + Math.floor(seededRandom() * 6);
    const birthDate = yearsAgo(age);
    const isDeceased = generation < generations - 2 && seededRandom() > 0.4;

    const member: FamilyMember = {
      id,
      firstName,
      lastName: surname,
      gender: genderHint,
      photoUrl: `https://i.pravatar.cc/160?u=${id}`,
      birthDate,
      birthDateApprox: generation === 0,
      deathDate: isDeceased ? yearsAgo(age - (60 + Math.floor(seededRandom() * 25))) : undefined,
      birthPlace: pick(CITIES),
      occupation: pick(OCCUPATIONS),
      biography: `${firstName} ${surname} was born in ${pick(CITIES)} and is remembered as a ${pick(
        OCCUPATIONS,
      ).toLowerCase()} of great local standing within the family's ${generation === 0 ? 'founding' : 'later'} generation.`,
      events: [
        {
          id: `${id}-birth`,
          date: birthDate,
          title: 'Birth',
          location: pick(CITIES),
          icon: 'child_care',
        },
      ],
      parentIds,
      relationshipToParents: 'biological',
      marriages: [],
      generation,
      isRoot: generation === 0 && parentIds.length === 0,
    };
    members.push(member);
    return member;
  }

  function marry(a: FamilyMember, b: FamilyMember): Marriage {
    const marriageId = `${a.id}-${b.id}`;
    const startYear = 20 + Math.floor(seededRandom() * 6);
    const marriageA: Marriage = {
      id: marriageId,
      spouseId: b.id,
      status: 'married',
      startDate: yearsAgo(90 - a.generation * 18 - startYear),
      childIds: [],
    };
    const marriageB: Marriage = { ...marriageA, id: marriageId, spouseId: a.id };
    a.marriages.push(marriageA);
    b.marriages.push(marriageB);
    return marriageA;
  }

  function addChildren(parentA: FamilyMember, parentB: FamilyMember, generation: number): FamilyMember[] {
    const marriage = parentA.marriages.find((m) => m.spouseId === parentB.id)!;
    const marriageOnB = parentB.marriages.find((m) => m.spouseId === parentA.id)!;
    const kids: FamilyMember[] = [];
    for (let i = 0; i < childrenPerCouplePerGeneration; i++) {
      const genderHint = seededRandom() > 0.5 ? 'male' : 'female';
      const child = makeMember(genderHint, generation, [parentA.id, parentB.id], parentA.lastName);
      kids.push(child);
      marriage.childIds.push(child.id);
      marriageOnB.childIds.push(child.id);
    }
    return kids;
  }

  // Generation 0: the founding couple.
  const founderM = makeMember('male', 0, [], lastName);
  const founderF = makeMember('female', 0, [], pick(LAST_NAMES));
  marry(founderM, founderF);

  let currentCouples: [FamilyMember, FamilyMember][] = [[founderM, founderF]];

  for (let gen = 1; gen < generations; gen++) {
    const nextCouples: [FamilyMember, FamilyMember][] = [];
    currentCouples.forEach(([a, b]) => {
      const children = addChildren(a, b, gen);
      children.forEach((child) => {
        // Marry each child into the family (except leave the very last
        // generation as unmarried "current day" members for realism).
        if (gen < generations - 1) {
          const spouseGender = child.gender === 'male' ? 'female' : 'male';
          const spouse = makeMember(spouseGender, gen, [], pick(LAST_NAMES));
          marry(child, spouse);
          nextCouples.push([child, spouse]);
        }
      });
    });
    currentCouples = nextCouples;
  }

  return members;
}

export const FAMILY_TREE_TITLE = 'The Avery Lineage';
