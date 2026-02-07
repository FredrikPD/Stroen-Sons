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

interface NewEventEmailProps {
    eventTitle: string;
    eventDescription: string;
    eventDate: string;
    eventLocation?: string;
    eventUrl: string;
}

export const NewEventEmail = ({
    eventTitle = "Nytt arrangement",
    eventDescription = "Det har kommet et nytt arrangement i kalenderen.",
    eventDate = "",
    eventLocation = "",
    eventUrl = "https://stroen-sons.com/events",
}: NewEventEmailProps) => {
    // Truncate description for preview if it's too long
    const previewText = eventDescription.length > 150
        ? `${eventDescription.substring(0, 150)}...`
        : eventDescription;

    return (
        <Html>
            <Head />
            <Preview>Nytt arrangement: {eventTitle}</Preview>
            <Tailwind>
                <Body className="bg-gray-100 my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px] bg-white">
                        <Section className="mt-[32px]">
                            <Heading className="text-gray-900 text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                Nytt arrangement: <strong>{eventTitle}</strong>
                            </Heading>
                        </Section>

                        <Text className="text-black text-[14px] leading-[24px]">
                            Hei,
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Det har blitt lagt til et nytt arrangement i kalenderen.
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
                                Se arrangement og meld deg på
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

export default NewEventEmail;
