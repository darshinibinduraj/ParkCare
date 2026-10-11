export type DemoScenario = {
  id: "falls-alone" | "mild-tremor" | "care-facility";
  title: string;
  summary: string;
  answers: Record<string, string>;
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "falls-alone",
    title: "Frequent falls, lives alone, limited budget",
    summary:
      "Alex lives alone in Austin, falls often, and needs to keep costs low. Alex is fictional.",
    answers: {
      q1: "Me",
      q2: "I don't know the stage.",
      q3: "I feel unsteady and I fall often.\nSelected: Balance problems, Falls, Trouble walking",
      q4: "These problems happen every day.\nSelected: Every day",
      q5: "I have fallen several times this year. The house has stairs and a loose rug.\nSelected: More than one fall",
      q6: "I live alone in a house.\nSelected: I live alone, House",
      q7: "I need help most days.\nSelected: Help most days",
      q8: "Austin, TX 78701",
      q9: "I need to keep costs low.\nSelected: Keeping costs low",
      q10: "Morning visits would help.",
    },
  },
  {
    id: "mild-tremor",
    title: "Mild tremor, family at home, flexible budget",
    summary:
      "Jordan has a mild tremor, lives with family in Seattle, and has more room in the budget. Jordan is fictional.",
    answers: {
      q1: "Me",
      q2: "Early or mild",
      q3: "Mild tremor in my right hand. Handwriting is smaller.",
      q4: "It happens sometimes.",
      q6: "I live with my spouse and daughter.",
      q7: "A little help sometimes.",
      q8: "Seattle, WA 98101",
      q9: "Cost is not our main limit. We have flexibility.",
      q10: "English. Evening visits.",
    },
  },
  {
    id: "care-facility",
    title: "Care community and frequent help",
    summary:
      "Sam's father lives in a Chicago care community and needs help many times a day. This family is fictional.",
    answers: {
      q1: "Someone I care for",
      q2: "Later or advanced",
      q3: "Stiffness and daily tasks are harder. Trouble walking.",
      q4: "Many times a day.",
      q5: "One fall last year.",
      q6: "He lives in a care community.",
      q7: "Needs help many times a day.",
      q8: "Chicago, IL 60601",
      q9: "A middle range is fine.",
      q10: "A woman caregiver, please. Spanish and English.",
    },
  },
];

export function scenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}
