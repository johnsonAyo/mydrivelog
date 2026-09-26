export type SkillAssessment = { skill: string; outcome: "introduced" | "developing" | "confident" };
export type SharedRecap = {
  whatWeWorkedOn: string;
  whatToPractise: string;
  nextLessonFocus: string;
  skills: SkillAssessment[];
};

export function hasSharedRecap(recap: SharedRecap): boolean {
  return Boolean(recap.whatWeWorkedOn.trim() || recap.whatToPractise.trim() || recap.nextLessonFocus.trim() || recap.skills.length);
}

export function formatLessonEmail(input: {
  kind: "recap" | "follow_up";
  learnerName: string;
  instructorName: string;
  recap?: SharedRecap;
  correction?: string;
}): { subject: string; body: string } {
  if (input.kind === "follow_up") {
    return {
      subject: `Follow-up from ${input.instructorName} about your driving lesson`,
      body: `Hi ${input.learnerName},\n\nA follow-up to your driving lesson recap:\n\n${input.correction?.trim() ?? ""}\n\n${input.instructorName}`,
    };
  }
  const recap = input.recap!;
  const sections = [
    ["What we worked on", recap.whatWeWorkedOn],
    ["What to practise", recap.whatToPractise],
    ["Next lesson focus", recap.nextLessonFocus],
  ].filter(([, value]) => value.trim()).map(([label, value]) => `${label}:\n${value.trim()}`);
  if (recap.skills.length) sections.push(`Skills covered:\n${recap.skills.map(({ skill, outcome }) => `• ${skill}: ${outcome[0].toUpperCase()}${outcome.slice(1)}`).join("\n")}`);
  return {
    subject: `Your driving lesson recap from ${input.instructorName}`,
    body: `Hi ${input.learnerName},\n\nHere is your driving lesson recap.\n\n${sections.join("\n\n")}\n\n${input.instructorName}`,
  };
}
