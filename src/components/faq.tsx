"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const questions = [
  {
    question: "Is MyDriveLog built for independent instructors?",
    answer:
      "Yes. The workspace is designed around one instructor managing their teaching week, lesson availability, bookings, and debriefs.",
  },
  {
    question: "How do learner booking links work?",
    answer:
      "Send each learner a personal link that shows only the lesson slots you have chosen to release. Your wider calendar stays out of view.",
  },
  {
    question: "Can I keep notes private?",
    answer:
      "Yes. Debriefs can include learner-facing notes and separate private context for your own preparation.",
  },
  {
    question: "Does it replace my calendar?",
    answer:
      "MyDriveLog gives you a teaching-focused calendar so availability, bookings, travel gaps, and lesson context stay connected.",
  },
];

export function Faq() {
  return (
    <Accordion className="faq-list">
      {questions.map((item) => (
        <AccordionItem value={item.question} key={item.question} className="faq-item">
          <AccordionTrigger className="faq-trigger">{item.question}</AccordionTrigger>
          <AccordionContent className="faq-content">{item.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
