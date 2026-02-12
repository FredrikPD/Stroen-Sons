import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Text,
    Tailwind,
    Hr,
    Column,
    Row,
} from "@react-email/components";
import * as React from "react";

interface InvoiceItem {
    id: string;
    title: string;
    amount: number;
    dueDate: string | null;
}

interface PaymentReminderEmailProps {
    memberName: string;
    invoices: InvoiceItem[];
    paymentUrl: string;
}

export const PaymentReminderEmail = ({
    memberName = "Medlem",
    invoices = [],
    paymentUrl = "https://stroen-sons.com/dashboard",
}: PaymentReminderEmailProps) => {

    const totalAmount = invoices.reduce((sum, item) => sum + item.amount, 0);

    return (
        <Html>
            <Head />
            <Preview>Betalingspåminnelse: Du har ubetalte fakturaer</Preview>
            <Tailwind>
                <Body className="bg-gray-100 my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px] bg-white">
                        <Section className="mt-[32px]">
                            <Heading className="text-gray-900 text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                Betalingspåminnelse
                            </Heading>
                        </Section>

                        <Text className="text-black text-[14px] leading-[24px]">
                            Hei {memberName},
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Dette er en vennlig påminnelse om at du har {invoices.length} ubetalt(e) krav hos Strøen Søns.
                        </Text>

                        <Section className="bg-gray-50 rounded p-4 border border-gray-200 my-[24px]">
                            {invoices.map((invoice, index) => (
                                <Row key={invoice.id} className={`border-gray-200 ${index !== invoices.length - 1 ? "border-b pb-2 mb-2" : ""}`}>
                                    <Column>
                                        <Text className="text-gray-900 text-[14px] font-bold m-0">
                                            {invoice.title}
                                        </Text>
                                        <Text className="text-gray-500 text-[12px] m-0">
                                            Forfall: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('nb-NO') : 'Ingen dato'}
                                        </Text>
                                    </Column>
                                    <Column className="text-right align-top">
                                        <Text className="text-gray-900 text-[14px] font-bold m-0">
                                            {new Intl.NumberFormat('nb-NO', {
                                                style: 'currency',
                                                currency: 'NOK',
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            }).format(invoice.amount)}
                                        </Text>
                                    </Column>
                                </Row>
                            ))}
                            <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between">
                                <Text className="text-gray-900 text-[14px] font-bold m-0">
                                    Totalt å betale:
                                </Text>
                                <Text className="text-emerald-600 text-[16px] font-bold m-0 text-right float-right">
                                    {new Intl.NumberFormat('nb-NO', {
                                        style: 'currency',
                                        currency: 'NOK',
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }).format(totalAmount)}
                                </Text>
                            </div>
                        </Section>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Link
                                className="px-5 py-3 bg-[#4F46E5] text-white rounded-xl text-[14px] font-bold no-underline"
                                href={paymentUrl}
                            >
                                Gå til betaling
                            </Link>
                        </Section>

                        <Hr className="border-[#eaeaea] my-[26px] mx-0 w-full" />

                        <Text className="text-gray-500 text-[12px] leading-[24px] text-center">
                            Strøen Søns<br />
                            Hvis du allerede har betalt, vennligst se bort fra denne e-posten.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default PaymentReminderEmail;
