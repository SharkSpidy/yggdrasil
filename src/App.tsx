import { useState } from 'react';
import type { FamilyGraph, OnboardingDraft } from './types';
import { dummyGraph, ROOT_ID } from './data/dummyData';
import { useYggdrasilTree } from './hooks/useYggdrasilTree';
import { Layout } from './components/Layout';
import { OnboardingWizard } from './components/OnboardingWizard';

/**
 * Toggle this to `true` to preview the Onboarding wizard flow.
 * Set to `false` (default) to jump straight into the 4-generation dummy tree.
 */
const START_WITH_ONBOARDING = false;

export default function App() {
  const [graph, setGraph] = useState<FamilyGraph>(dummyGraph);
  const [rootId, setRootId] = useState<string | null>(START_WITH_ONBOARDING ? null : ROOT_ID);

  const tree = useYggdrasilTree({ graph, rootId });

  function handleOnboardingComplete(draft: OnboardingDraft) {
    const newId = 'root_' + Date.now();
    setGraph((prev) => ({
      ...prev,
      [newId]: {
        id: newId,
        firstName: draft.firstName,
        lastName: draft.lastName,
        gender: draft.gender,
        photoUrl: draft.photoUrl,
        birthDate: draft.birthDate,
        unions: [],
        parentIds: [],
        childIds: [],
        isRoot: true,
        lifeEvents: draft.birthDate
          ? [{ id: 'e_root', date: draft.birthDate, title: `Born`, icon: 'birth' }]
          : [],
      },
    }));
    setRootId(newId);
  }

  if (!rootId) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return <Layout tree={tree} />;
}
