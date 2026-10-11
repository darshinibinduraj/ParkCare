import { Card } from "@/components/ui/card";
import { messageHeading } from "@/lib/plan-text";
import type { AgentMessage } from "@/lib/schemas";

export function AgentMessageLog({ messages }: { messages: AgentMessage[] }) {
  return (
    <Card className="grid gap-4">
      <h2 className="text-2xl font-bold">Agent collaboration</h2>
      <p>The helpers work in rounds. Round 1 is independent. Round 2 is their notes to each other. Round 3 writes the plan.</p>
      <ol className="grid gap-4">
        {messages.map((message, index) => (
          <li key={`${message.round}-${message.sender}-${index}`} className="rounded-2xl border-2 border-line p-4">
            <p className="font-bold">
              Round {message.round}: {messageHeading(message)}
            </p>
            <p>{message.content}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
