"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

export function HelpDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary">Help</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(100%-2rem,42rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border-2 border-line bg-card p-6 text-ink">
          <Dialog.Title className="text-2xl font-bold">Help</Dialog.Title>
          <Dialog.Description className="mt-3 max-w-measure">
            ParkCare gives general information. It does not diagnose, prescribe equipment, or decide treatment.
          </Dialog.Description>
          <ul className="mt-4 grid list-disc gap-3 pl-6">
            <li>One question shows at a time. Go back whenever you want.</li>
            <li>Type, tap a short answer, or use Tap to speak. It keeps listening until you tap to stop. Voice is optional.</li>
            <li>You can edit the speech text. Recognition can miss soft speech.</li>
            <li>Skip any question. There is no timer.</li>
            <li>Answers are saved on this device as you go.</li>
            <li>Use Text size and Theme in the header. Contrast is the brightest option.</li>
            <li>Check the summary before the helpers write a plan. Fix anything we got wrong.</li>
          </ul>
          <Dialog.Close asChild>
            <Button className="mt-6" variant="primary">
              Close help
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
