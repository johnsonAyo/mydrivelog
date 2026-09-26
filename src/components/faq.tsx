"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const questions = [
  {
    question: "Can I offer two lessons on the same day?",
    answer:
      "Yes. Add each lesson time separately. They’ll appear together in the same day of your teaching week.",
  },
  {
    question: "Can someone new use a booking link?",
    answer:
      "Yes. Create a general link for new enquiries. They’ll enter their name and confirm their email before booking.",
  },
  {
    question: "Do I have to send a recap after every lesson?",
    answer:
      "No. You can complete a lesson without emailing the learner. If you write a recap, you review it and choose whether to send it after the lesson ends.",
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
