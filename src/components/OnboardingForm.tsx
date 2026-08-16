import { useRef, useState } from 'react';
import type { FamilyMember, Gender } from '../types/family';

interface OnboardingFormProps {
  /** Existing members, offered as optional parent selections. */
  members: FamilyMember[];
  onCreate: (member: FamilyMember) => void;
  onCancel?: () => void;
}

interface FormState {
  fullName: string;
  birthDate: string;
  gender: Gender;
  parentId: string;
  occupation: string;
  photoDataUrl: string | null;
}

const INITIAL_STATE: FormState = {
  fullName: '',
  birthDate: '',
  gender: 'unspecified',
  parentId: '',
  occupation: '',
  photoDataUrl: null,
};

export function OnboardingForm({ members, onCreate, onCancel }: OnboardingFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update('photoDataUrl', reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = form.fullName.trim();
    if (!trimmed) {
      setError('Full name is required.');
      return;
    }
    const [firstName, ...rest] = trimmed.split(' ');
    const lastName = rest.join(' ') || 'Unknown';

    const newMember: FamilyMember = {
      id: `m-${crypto.randomUUID()}`,
      firstName,
      lastName,
      gender: form.gender,
      photoUrl: form.photoDataUrl ?? undefined,
      birthDate: form.birthDate || undefined,
      occupation: form.occupation || undefined,
      parentIds: form.parentId ? [form.parentId] : [],
      marriages: [],
      generation: form.parentId
        ? (members.find((m) => m.id === form.parentId)?.generation ?? 0) + 1
        : 0,
      isRoot: !form.parentId,
    };

    onCreate(newMember);
    setForm(INITIAL_STATE);
    setError(null);
  }

  return (
    <main className="flex-grow flex items-center justify-center py-16 px-5 md:px-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[800px] bg-paper shadow-sm shadow-umber/10 rounded-lg p-8 md:p-12 relative overflow-hidden border border-umber/5"
      >
        <div className="text-center mb-10">
          <h1 className="font-display text-[28px] text-umber-dark mb-2 font-semibold">Begin Your Legacy</h1>
          <p className="text-[16px] text-slate">Establish the foundational details of your personal archive.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="font-sans text-[14px] text-ink font-semibold" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                className="bg-panel border border-umber/10 rounded px-4 py-3"
                placeholder="e.g., Eleanor Vance"
                type="text"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-sans text-[14px] text-ink font-semibold" htmlFor="birthDate">
                Date of Birth
              </label>
              <input
                id="birthDate"
                className="bg-panel border border-umber/10 rounded px-4 py-3"
                type="date"
                value={form.birthDate}
                onChange={(e) => update('birthDate', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-sans text-[14px] text-ink font-semibold" htmlFor="gender">
                Gender
              </label>
              <select
                id="gender"
                className="bg-panel border border-umber/10 rounded px-4 py-3"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value as Gender)}
              >
                <option value="unspecified">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="nonbinary">Nonbinary</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-sans text-[14px] text-ink font-semibold" htmlFor="occupation">
                Occupation
              </label>
              <input
                id="occupation"
                className="bg-panel border border-umber/10 rounded px-4 py-3"
                placeholder="e.g., Schoolteacher"
                type="text"
                value={form.occupation}
                onChange={(e) => update('occupation', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-sans text-[14px] text-ink font-semibold" htmlFor="parentId">
                Parent (optional)
              </label>
              <select
                id="parentId"
                className="bg-panel border border-umber/10 rounded px-4 py-3"
                value={form.parentId}
                onChange={(e) => update('parentId', e.target.value)}
              >
                <option value="">None — new root ancestor</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <label className="font-sans text-[14px] text-ink font-semibold mb-4">Primary Portrait</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files[0]);
              }}
              className="w-full max-w-[240px] aspect-[3/4] vintage-frame bg-panel relative group cursor-pointer overflow-hidden flex flex-col items-center justify-center"
            >
              {form.photoDataUrl ? (
                <img src={form.photoDataUrl} alt="Portrait preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6 text-slate flex flex-col items-center z-0">
                  <span className="material-symbols-outlined mb-3 text-4xl opacity-50">image</span>
                  <span className="text-sm">Drag &amp; drop or click to browse</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                type="file"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-700">{error}</p>}

        <div className="mt-12 pt-8 border-t border-umber/10 flex justify-between items-center">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 text-slate font-sans text-[14px] font-semibold hover:text-umber-dark transition-colors"
            >
              Cancel
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="px-8 py-3 btn-primary font-sans text-[14px] font-semibold rounded flex items-center gap-2"
          >
            Continue <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </form>
    </main>
  );
}
