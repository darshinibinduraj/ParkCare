"use client";

import * as Tabs from "@radix-ui/react-tabs";

const triggerClass =
  "motion-color min-h-14 rounded-2xl border-2 border-line bg-card px-4 font-bold text-ink underline data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-on-primary data-[state=active]:no-underline";

export function SourceTabs() {
  return (
    <Tabs.Root defaultValue="medical" className="grid gap-4">
      <Tabs.List aria-label="Data sources" className="flex flex-wrap gap-4">
        <Tabs.Trigger className={triggerClass} value="medical">
          Medical sources
        </Tabs.Trigger>
        <Tabs.Trigger className={triggerClass} value="equipment">
          Equipment sources
        </Tabs.Trigger>
        <Tabs.Trigger className={triggerClass} value="caregiver">
          Caregiver sources
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="medical" className="grid max-w-measure gap-3">
        <p>
          The medical helper can point to the public{" "}
          <a className="underline" href="https://data.cms.gov/provider-data/dataset/6jpm-sxkc">
            CMS Doctors and Clinicians dataset
          </a>{" "}
          and{" "}
          <a className="underline" href="https://findahealthcenter.hrsa.gov/">
            HRSA Find a Health Center
          </a>
          . Those tools do not show who is taking new patients.
        </p>
        <p>
          Local clinic cards in the demo are fictional. They are marked Simulated example. ParkCare does not invent
          real doctors, openings, or insurance.
        </p>
      </Tabs.Content>
      <Tabs.Content value="equipment" className="grid max-w-measure gap-3">
        <p>
          Home-safety notes are paraphrased from the{" "}
          <a
            className="underline"
            href="https://www.parkinson.org/living-with-parkinsons/management/activities-daily-living/home-safety"
          >
            Parkinson&apos;s Foundation Home Safety page
          </a>
          . Daily-living notes are paraphrased from the{" "}
          <a
            className="underline"
            href="https://www.parkinson.org/living-with-parkinsons/management/activities-daily-living/assistive-tech-devices"
          >
            Assistive Tech Devices page
          </a>
          . Please read the original pages.
        </p>
        <p>
          Example products and prices are simulated. Verified guidance has no invented price. A therapist should help
          you choose any device.
        </p>
      </Tabs.Content>
      <Tabs.Content value="caregiver" className="grid max-w-measure gap-3">
        <p>
          National cards include the{" "}
          <a className="underline" href="https://www.parkinson.org/">
            Parkinson&apos;s Foundation Helpline
          </a>{" "}
          and the{" "}
          <a className="underline" href="https://eldercare.acl.gov/">
            Eldercare Locator
          </a>
          . They are public information services, not assigned caregivers.
        </p>
        <p>
          Named agencies in the demo are fictional and marked Simulated example. Credentials, schedules, and prices on
          those cards were not checked.
        </p>
      </Tabs.Content>
    </Tabs.Root>
  );
}
