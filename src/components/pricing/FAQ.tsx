import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
    {
        question: "What is a 'Monitor'?",
        answer: "A monitor targets a specific competitor product or keyword signal. One monitor tracks one specific query (e.g., 'companies using Salesforce') and continuously scans for new intent signals."
    },
    {
        question: "Can I upgrade or downgrade later?",
        answer: "Yes, you can change your plan at any time. When you upgrade, you'll be prorated for the remainder of the cycle. Downgrades take effect at the end of the current billing period."
    },
    {
        question: "Do you offer enterprise custom plans?",
        answer: "Absolutely. For teams needing more than 10 monitors or custom integrations, please contact our sales team for a tailored solution."
    },
    {
        question: "How accurate is the data?",
        answer: "We aggregate data from multiple premium sources including public web data, social signals, and technician certifications. We verifiy signals using AI to ensure high improved relevance."
    },
    {
        question: "Is there a free trial?",
        answer: "Yes! Our Starter plan is completely free forever. You can try out the core features with 1 active monitor to see the value before upgrading."
    }
];

export function FAQ() {
    return (
        <div className="w-full max-w-3xl mx-auto py-12">
            <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                        <AccordionContent>
                            {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
