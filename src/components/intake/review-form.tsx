"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  BUDGET_LABEL,
  FREQUENCY_LABEL,
  LIVING_LABEL,
  SUPPORT_LABEL,
  SYMPTOM_LABEL,
} from "@/lib/copy";
import { profileEditSchema, type PatientProfile, type ProfileEdit, type Symptom } from "@/lib/schemas";

const symptoms = Object.entries(SYMPTOM_LABEL) as [Symptom, string][];

function Choice({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="font-bold">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex min-h-14 items-center gap-4 rounded-2xl border-2 border-line bg-card px-4 has-[:checked]:border-primary"
        >
          <input
            className="size-7"
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

function TextField({
  label,
  name,
  register,
}: {
  label: string;
  name: "stage" | "falls.frequency" | "homeEnvironment" | "currentMobilitySupport" | "location.cityOrZip" | "preferences.caregiverGender" | "preferences.language" | "preferences.schedule" | "preferences.other";
  register: UseFormRegister<ProfileEdit>;
}) {
  return (
    <label className="grid gap-2 font-bold">
      {label}
      <input className="min-h-14 rounded-2xl border-2 border-line bg-card px-4 font-normal" {...register(name)} />
    </label>
  );
}

export function ReviewForm({ initial }: { initial: PatientProfile }) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const form = useForm<ProfileEdit>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      respondentType: initial.respondentType,
      stage: initial.stage,
      symptoms: initial.symptoms,
      symptomFrequency: initial.symptomFrequency,
      falls: { reported: initial.falls.reported, frequency: initial.falls.frequency ?? "" },
      homeEnvironment: initial.homeEnvironment ?? "",
      currentMobilitySupport: initial.currentMobilitySupport ?? "",
      livingSituation: initial.livingSituation,
      supportNeeds: initial.supportNeeds,
      location: { cityOrZip: initial.location.cityOrZip ?? "" },
      budget: initial.budget,
      preferences: {
        caregiverGender: initial.preferences.caregiverGender ?? "",
        language: initial.preferences.language ?? "",
        schedule: initial.preferences.schedule ?? "",
        other: initial.preferences.other ?? "",
      },
    },
  });

  async function submit(values: ProfileEdit, intent: "save" | "run") {
    setError("");
    setStatus(intent === "run" ? "The helpers are working on your plan." : "Saving");
    const save = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, confirm: intent === "run" }),
    });
    const saved = (await save.json()) as { error?: string };
    if (!save.ok) {
      setStatus("");
      setError(saved.error ?? "Could not save. Please try again.");
      return;
    }
    if (intent === "save") {
      setStatus("Saved");
      return;
    }
    const run = await fetch("/api/care-plan/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const result = (await run.json()) as { error?: string; sessionId?: string };
    if (!run.ok || !result.sessionId) {
      setStatus("");
      setError(result.error ?? "The plan could not be made. Please try again.");
      return;
    }
    window.location.assign(`/results/${result.sessionId}`);
  }

  const selectedSymptoms = form.watch("symptoms");

  return (
    <form
      className="grid gap-6"
      onSubmit={form.handleSubmit((values) => submit(values, "run"))}
      noValidate
    >
      <p role="status" aria-live="polite">
        {status}
      </p>
      {error ? (
        <p role="alert" className="rounded-2xl border-2 border-danger p-4 text-danger">
          {error}
        </p>
      ) : null}
      <Choice
        legend="Who the plan is for"
        name="respondentType"
        value={form.watch("respondentType")}
        onChange={(value) => form.setValue("respondentType", value as ProfileEdit["respondentType"])}
        options={[
          { value: "patient", label: "Me" },
          { value: "caregiver", label: "Someone I care for" },
          { value: "unknown", label: "Not provided" },
        ]}
      />
      <TextField label="Stage. Type unknown if you are not sure." name="stage" register={form.register} />
      <fieldset className="grid gap-3">
        <legend className="font-bold">Changes noted</legend>
        <div className="flex flex-wrap gap-4">
          {symptoms.map(([value, label]) => (
            <label
              key={value}
              className="inline-flex min-h-14 items-center gap-3 rounded-full border-2 border-line bg-chip px-4"
            >
              <input
                className="size-7"
                type="checkbox"
                checked={selectedSymptoms.includes(value)}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selectedSymptoms, value]
                    : selectedSymptoms.filter((item) => item !== value);
                  form.setValue("symptoms", next, { shouldValidate: true });
                }}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Choice
        legend="How often"
        name="symptomFrequency"
        value={form.watch("symptomFrequency")}
        onChange={(value) => form.setValue("symptomFrequency", value as ProfileEdit["symptomFrequency"])}
        options={Object.entries(FREQUENCY_LABEL).map(([value, label]) => ({ value, label }))}
      />
      <fieldset className="grid gap-3">
        <legend className="font-bold">Falls</legend>
        <label className="flex min-h-14 items-center gap-4 rounded-2xl border-2 border-line px-4">
          <input
            className="size-7"
            type="radio"
            name="fallsReported"
            checked={form.watch("falls.reported") === true}
            onChange={() => form.setValue("falls.reported", true)}
          />
          Falls were reported
        </label>
        <label className="flex min-h-14 items-center gap-4 rounded-2xl border-2 border-line px-4">
          <input
            className="size-7"
            type="radio"
            name="fallsReported"
            checked={form.watch("falls.reported") === false}
            onChange={() => form.setValue("falls.reported", false)}
          />
          Falls were not reported
        </label>
      </fieldset>
      <TextField label="Fall details. Leave blank if none." name="falls.frequency" register={form.register} />
      <TextField label="Home notes" name="homeEnvironment" register={form.register} />
      <TextField label="Mobility support now" name="currentMobilitySupport" register={form.register} />
      <Choice
        legend="Who is at home"
        name="livingSituation"
        value={form.watch("livingSituation")}
        onChange={(value) => form.setValue("livingSituation", value as ProfileEdit["livingSituation"])}
        options={Object.entries(LIVING_LABEL).map(([value, label]) => ({ value, label }))}
      />
      <Choice
        legend="How much help"
        name="supportNeeds"
        value={form.watch("supportNeeds")}
        onChange={(value) => form.setValue("supportNeeds", value as ProfileEdit["supportNeeds"])}
        options={Object.entries(SUPPORT_LABEL).map(([value, label]) => ({ value, label }))}
      />
      <TextField label="City or ZIP" name="location.cityOrZip" register={form.register} />
      <Choice
        legend="Budget"
        name="budget"
        value={form.watch("budget")}
        onChange={(value) => form.setValue("budget", value as ProfileEdit["budget"])}
        options={Object.entries(BUDGET_LABEL).map(([value, label]) => ({ value, label }))}
      />
      <TextField label="Caregiver gender preference" name="preferences.caregiverGender" register={form.register} />
      <TextField label="Language" name="preferences.language" register={form.register} />
      <TextField label="Schedule" name="preferences.schedule" register={form.register} />
      <label className="grid gap-2 font-bold">
        Other notes
        <textarea
          className="min-h-32 rounded-2xl border-2 border-line bg-card px-4 py-3 font-normal"
          {...form.register("preferences.other")}
        />
      </label>
      {form.formState.errors.root ? <p role="alert">{form.formState.errors.root.message}</p> : null}
      <div className="flex flex-wrap gap-4">
        <Button type="button" variant="secondary" onClick={form.handleSubmit((values) => submit(values, "save"))}>
          Save edits
        </Button>
        <Button type="submit">This looks right. Make my care plan</Button>
      </div>
    </form>
  );
}
