import { useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, TreePine } from 'lucide-react';
import type { Gender, OnboardingDraft } from '../types';

interface OnboardingWizardProps {
  onComplete: (draft: OnboardingDraft) => void;
}

const STEPS = ['Name', 'Details', 'Photo'] as const;

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OnboardingDraft>({
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'unspecified',
    photoUrl: '',
  });

  const isLastStep = step === STEPS.length - 1;
  const canAdvance = step === 0 ? draft.firstName.trim().length > 0 && draft.lastName.trim().length > 0 : true;

  function next() {
    if (isLastStep) {
      onComplete(draft);
    } else {
      setStep((s) => s + 1);
    }
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-parchment px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-mahogany-deep/10 bg-white/70 p-8 shadow-heirloom">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mahogany-deep text-linen">
            <TreePine className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-mahogany">Plant your Yggdrasil</h1>
          <p className="text-sm text-mahogany-deep/60">
            Every family tree needs a root. Tell us about the first person in your archive.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300',
                  idx < step
                    ? 'border-mahogany-deep bg-mahogany-deep text-linen'
                    : idx === step
                      ? 'border-mahogany-deep text-mahogany-deep'
                      : 'border-mahogany-deep/20 text-mahogany-deep/30',
                ].join(' ')}
              >
                {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < STEPS.length - 1 && (
                <div className={['h-px w-8', idx < step ? 'bg-mahogany-deep' : 'bg-mahogany-deep/15'].join(' ')} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="mb-8 min-h-[180px]">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <Field label="First Name">
                <input
                  autoFocus
                  value={draft.firstName}
                  onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
                  placeholder="Augustus"
                  className={inputClass}
                />
              </Field>
              <Field label="Last Name">
                <input
                  value={draft.lastName}
                  onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
                  placeholder="Whitfield"
                  className={inputClass}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <Field label="Date of Birth">
                <input
                  type="date"
                  value={draft.birthDate}
                  onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Gender">
                <select
                  value={draft.gender}
                  onChange={(e) => setDraft({ ...draft, gender: e.target.value as Gender })}
                  className={inputClass}
                >
                  <option value="unspecified">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Non-binary</option>
                </select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-mahogany-deep/25 bg-mahogany-deep/5 text-mahogany-deep/40">
                <Camera className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, photoUrl: 'https://i.pravatar.cc/300?img=51' })}
                className="rounded-full border border-mahogany-deep/15 px-4 py-2 text-sm font-medium text-mahogany-deep/70 transition-colors hover:bg-mahogany-deep/5"
              >
                Upload a portrait (placeholder)
              </button>
              <p className="text-center text-xs text-mahogany-deep/40">
                You can always add or change this photo later from the profile drawer.
              </p>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-mahogany-deep/60 transition-colors disabled:opacity-0 hover:bg-mahogany-deep/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={next}
            disabled={!canAdvance}
            className="flex items-center gap-1.5 rounded-full bg-mahogany-deep px-5 py-2.5 text-sm font-semibold text-linen shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            {isLastStep ? 'Plant the Root' : 'Continue'} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-mahogany-deep/15 bg-white px-4 py-3 text-sm text-mahogany outline-none transition-colors focus:border-mahogany-deep/40 focus:ring-2 focus:ring-mahogany-deep/10';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-mahogany-deep/50">{label}</span>
      {children}
    </label>
  );
}
