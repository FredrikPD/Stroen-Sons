import { PrismaClient, Role, PaymentStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('Start seeding ...')

    // 1. Create/Update Admin User
    const admin = await prisma.member.upsert({
        where: { clerkId: 'user_36lUyta0SC1QLaXgYP8egnMuuYs' },
        update: {
            firstName: 'Fredrik',
            lastName: 'Admin',
        },
        create: {
            clerkId: 'user_36lUyta0SC1QLaXgYP8egnMuuYs',
            email: 'test@test.no',
            firstName: 'Fredrik',
            lastName: 'Admin',
            role: 'ADMIN',
            balance: 1000.00,
        },
    })
    console.log(`Created admin user: ${admin.firstName}`)

    // 1b. Create/Update Second Admin User (Fredrik Preus Dovland)
    const admin2 = await prisma.member.upsert({
        where: { clerkId: 'user_36rIQl4IUqrtnL1kI2JBFSSdckk' },
        update: {
            firstName: 'Fredrik Preus',
            lastName: 'Dovland',
            role: 'ADMIN',
        },
        create: {
            clerkId: 'user_36rIQl4IUqrtnL1kI2JBFSSdckk',
            email: 'fpd@live.no',
            firstName: 'Fredrik Preus',
            lastName: 'Dovland',
            role: 'ADMIN',
            balance: 1000.00,
        },
    })
    console.log(`Created admin user: ${admin2.firstName}`)

    // 2. Create Mock Members
    const memberData = [
        { firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', clerkId: 'user_alice123' },
        { firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com', clerkId: 'user_bob456' },
        { firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', clerkId: 'user_charlie789' },
        { firstName: 'Diana', lastName: 'Prince', email: 'diana@example.com', clerkId: 'user_diana101' },
        { firstName: 'Evan', lastName: 'Wright', email: 'evan@example.com', clerkId: 'user_evan202' },
    ]

    const members = []
    for (const m of memberData) {
        const member = await prisma.member.upsert({
            where: { email: m.email },
            update: {
                firstName: m.firstName,
                lastName: m.lastName,
            },
            create: {
                clerkId: m.clerkId,
                email: m.email,
                firstName: m.firstName,
                lastName: m.lastName,
                role: 'MEMBER',
                balance: Math.floor(Math.random() * 500),
            },
        })
        members.push(member)
        console.log(`Created member: ${member.firstName} ${member.lastName}`)
    }

    // 3. Create Events
    const events = [
        {
            title: 'Grand Opening Gala',
            description: 'The official opening of the Stroen Sons club. Black tie event.',
            plan: '18:00 - Arrival, 19:00 - Dinner, 21:00 - Party',
            location: 'Grand Hall',
            startAt: new Date('2025-06-15T18:00:00Z'), // Past event
            coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865',
        },
        {
            title: 'Summer BBQ',
            description: 'Casual gathering with grill and drinks.',
            plan: 'Bring your own drinks (BYOD). Grill provided.',
            location: 'The Garden',
            startAt: new Date('2025-07-20T14:00:00Z'), // Upcoming event
            coverImage: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9',
        },
        {
            title: 'Winter Formal',
            description: 'End of year celebration.',
            plan: 'Food, music, and awards ceremony.',
            location: 'Downtown Hotel',
            startAt: new Date('2025-12-20T19:00:00Z'), // Upcoming event
            coverImage: 'https://images.unsplash.com/photo-1519671482538-518b760640b0',
        },
    ]

    for (const e of events) {
        const event = await prisma.event.create({
            data: {
                ...e,
                createdBy: { connect: { id: admin.id } },
                attendees: {
                    connect: [
                        { id: admin.id },
                        { id: members[0].id }, // Alice attending all
                        { id: members[1].id }, // Bob attending all
                    ],
                },
            },
        })
        console.log(`Created event: ${event.title}`)
    }

    // 4. Create Posts
    const posts = [
        {
            title: 'Welcome to the new portal!',
            content: 'We are excited to launch the new members-only area. Check out your dashboard for updates.',
        },
        {
            title: 'Membership Fees Due',
            content: 'Please remember to pay your monthly dues by the 5th.',
        },
    ]

    for (const p of posts) {
        await prisma.post.create({
            data: {
                ...p,
                author: { connect: { id: admin.id } },
            },
        })
        console.log(`Created post: ${p.title}`)
    }

    // 5. Create Payments (Mock)
    const currentMonth = new Date().toISOString().slice(0, 7) // e.g. "2025-12"

    for (const m of members) {
        await prisma.payment.upsert({
            where: {
                memberId_period: {
                    memberId: m.id,
                    period: currentMonth
                }
            },
            update: {},
            create: {
                status: Math.random() > 0.5 ? 'PAID' : 'UNPAID',
                memberId: m.id,
                period: currentMonth,
            }
        })
    }
    console.log('Created mock payments')

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
