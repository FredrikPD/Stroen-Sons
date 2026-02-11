const https = require('https');

function testUrl(name, url) {
    console.log(`Testing connection to ${name} (${url})...`);
    const req = https.get(url, (res) => {
        console.log(`✅ ${name}: Status Code ${res.statusCode}`);
        res.resume();
    });

    req.on('error', (e) => {
        console.error(`❌ ${name}: Error: ${e.message}`);
    });
}

// Test general internet
testUrl('Google', 'https://www.google.com');

// Test Clerk API (base URL)
testUrl('Clerk API', 'https://api.clerk.com');

// Test Prisma Data Proxy (generic endpoint)
testUrl('Prisma Accelerate', 'https://accelerate.prisma-data.net');
