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
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
    firstName: string;
    email: string;
    password?: string;
    loginUrl?: string;
}

export const WelcomeEmail = ({
    firstName = "Medlem",
    email = "medlem@eksempel.no",
    password,
    loginUrl = "https://stroen-sons.com/sign-in",
}: WelcomeEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Velkommen til Strøen Søns</Preview>
            <Tailwind>
                <Body className="bg-gray-100 my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px] bg-white">
                        <Section className="mt-[32px]">
                            <Heading className="text-gray-900 text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                Velkommen til <strong>Strøen Søns</strong>
                            </Heading>
                        </Section>

                        <Text className="text-black text-[14px] leading-[24px]">
                            Hei {firstName},
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Du har blitt invitert til å bli medlem av Strøen Søns.
                            Her er din innloggingsinformasjon:
                        </Text>

                        <Section className="bg-gray-50 rounded p-4 border border-gray-200 my-[24px]">
                            <Text className="text-gray-500 text-[12px] uppercase tracking-wider font-bold m-0 mb-1">
                                E-post
                            </Text>
                            <Text className="text-gray-900 text-[16px] font-medium m-0 mb-4">
                                {email}
                            </Text>

                            {password && (
                                <>
                                    <Text className="text-gray-500 text-[12px] uppercase tracking-wider font-bold m-0 mb-1">
                                        Midlertidig passord
                                    </Text>
                                    <Text className="text-gray-900 text-[16px] font-medium m-0 font-mono bg-white inline-block px-2 py-1 rounded border border-gray-200">
                                        {password}
                                    </Text>
                                </>
                            )}
                        </Section>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Link
                                className="px-5 py-3 bg-gray-900 text-white rounded text-[14px] font-bold no-underline"
                                href={loginUrl}
                            >
                                Logg inn
                            </Link>
                        </Section>

                        <Text className="text-black text-[14px] leading-[24px]">
                            Vi anbefaler at du endrer passordet ditt ved første innlogging.
                        </Text>
                        <Text className="text-gray-500 text-[12px] leading-[24px] mt-8 text-center border-t border-gray-100 pt-4">
                            Strøen Søns
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WelcomeEmail;
