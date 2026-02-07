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

interface NewPostEmailProps {
    postTitle: string;
    postContent: string;
    authorName: string;
    postUrl: string;
    category: string;
}

export const NewPostEmail = ({
    postTitle = "Nytt innlegg",
    postContent = "Det har kommet et nytt innlegg på Strøen Søns.",
    authorName = "Styret",
    postUrl = "https://stroen-sons.com/posts",
    category = "NYHET",
}: NewPostEmailProps) => {
    // Truncate content for preview if it's too long
    const previewText = postContent.length > 150
        ? `${postContent.substring(0, 150)}...`
        : postContent;

    return (
        <Html>
            <Head />
            <Preview>Nytt innlegg: {postTitle}</Preview>
            <Tailwind>
                <Body className="bg-gray-100 my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px] bg-white">
                        <Section className="mt-[32px]">
                            <Heading className="text-gray-900 text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                Nytt innlegg på <strong>Strøen Søns</strong>
                            </Heading>
                        </Section>

                        <Text className="text-black text-[14px] leading-[24px]">
                            Hei,
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            {authorName} har publisert et nytt innlegg i kategorien <strong>{category}</strong>:
                        </Text>

                        <Section className="bg-gray-50 rounded p-4 border border-gray-200 my-[24px]">
                            <Text className="text-gray-900 text-[18px] font-bold m-0 mb-2">
                                {postTitle}
                            </Text>
                            <Text className="text-gray-600 text-[14px] leading-[24px] m-0">
                                {previewText}
                            </Text>
                        </Section>

                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Link
                                className="px-5 py-3 bg-gray-900 text-white rounded text-[14px] font-bold no-underline"
                                href={postUrl}
                            >
                                Les hele innlegget
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

export default NewPostEmail;
