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
} from "@react-email/components";
import * as React from "react";

interface UpdatedEventEmailProps {
    eventTitle: string;
    eventDescription: string;
    eventDate: string;
    eventLocation?: string;
    eventUrl: string;
}

export const UpdatedEventEmail = ({
    eventTitle = "Oppdatert arrangement",
    eventDescription = "Det har kommet oppdateringer til arrangementet i kalenderen.",
    eventDate = "",
    eventLocation = "",
    eventUrl = "https://stroen-sons.com/events",
}: UpdatedEventEmailProps) => {
    const previewText = eventDescription.length > 150
        ? `${eventDescription.substring(0, 150)}...`
        : eventDescription;

    return (
        <Html>
            <Head />
            <Preview>Oppdatert arrangement: {eventTitle}</Preview>
            <Tailwind>
                <Body className="bg-gray-100 my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px] bg-white">
                        <Section className="mt-[32px]">
                            <Heading className="text-gray-900 text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                Oppdatert arrangement: <strong>{eventTitle}</strong>
                            </Heading>
                        </Section>

                        <Text className="text-black text-[14px] leading-[24px]">
                            Hei,
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Det har kommet oppdateringer til arrangementet i kalenderen.
                        </Text>

                        <Section className="bg-gray-50 rounded p-4 border border-gray-200 my-[24px]">
                            <Text className="text-gray-900 text-[18px] font-bold m-0 mb-2">
                                {eventTitle}
                            </Text>

                            <div className="mb-4">
                                <Text className="text-gray-900 font-bold m-0 text-[14px]">
                                    📅 {eventDate}
                                </Text>
                                {eventLocation && (
                                    <Text className="text-gray-900 font-bold m-0 text-[14px]">
                                        📍 {eventLocation}
                                    </Text>
                                )}
                            </div>

                            <Text className="text-gray-600 text-[14px] leading-[24px] m-0">
                                {previewText}
                            </Text>
                        </Section>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Link
                                className="px-5 py-3 bg-gray-900 text-white rounded text-[14px] font-bold no-underline"
                                href={eventUrl}
                            >
                                Se oppdatert arrangement
                            </Link>
                        </Section>

                        <Hr className="border-[#eaeaea] my-[26px] mx-0 w-full" />

                        <Text className="text-gray-500 text-[12px] leading-[24px] text-center">
                            Strøen Søns
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default UpdatedEventEmail;
