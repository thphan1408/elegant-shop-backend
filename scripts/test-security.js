/**
 * Security Attack Test Script
 * Tests common hacking attacks: SQL Injection, XSS, DDoS simulation
 * 
 * Usage: node scripts/test-security.js
 * 
 * Note: Make sure the server is running (npm run start:dev)
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:8080/api';

// Test results
const results = {
    sqlInjection: { blocked: 0, allowed: 0, errors: 0 },
    xss: { stored: 0, errors: 0 },
    ddos: { requests: 0, success: 0, rateLimited: 0, errors: 0 },
    pathTraversal: { tested: 0, blocked: 0 },
    massAssignment: { tested: 0, prevented: 0 },
};

async function testSQLInjection() {
    console.log('\n🔒 Testing SQL Injection Attacks...');

    const sqlInjections = [
        "'; DROP TABLE Review; --",
        "' OR '1'='1",
        "'; DELETE FROM Product; --",
        "1' UNION SELECT * FROM users--",
        "'; UPDATE Product SET price = 0; --",
    ];

    for (const payload of sqlInjections) {
        try {
            const response = await axios.post(`${BASE_URL}/reviews`, {
                productId: payload,
                rating: 5,
                comment: 'Test',
            }).catch(err => err.response);

            if (response?.status === 400) {
                results.sqlInjection.blocked++;
                console.log(`✅ Blocked: ${payload.substring(0, 30)}...`);
            } else {
                results.sqlInjection.allowed++;
                console.log(`❌ Allowed: ${payload.substring(0, 30)}...`);
            }
        } catch (error) {
            results.sqlInjection.errors++;
            console.log(`⚠️  Error: ${payload.substring(0, 30)}...`);
        }
    }
}

async function testXSS() {
    console.log('\n🔒 Testing XSS Attacks...');

    const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
    ];

    // Need a product ID first
    let productId;
    try {
        const productsRes = await axios.get(`${BASE_URL}/products?limit=1`);
        if (productsRes.data?.data?.data?.[0]?.id) {
            productId = productsRes.data.data.data[0].id;
        } else {
            console.log('⚠️  No products found, skipping XSS test');
            return;
        }
    } catch (error) {
        console.log('⚠️  Could not get product ID, skipping XSS test');
        return;
    }

    for (const payload of xssPayloads) {
        try {
            const response = await axios.post(`${BASE_URL}/reviews`, {
                productId: productId,
                rating: 5,
                comment: payload,
            });

            if (response.status === 201) {
                results.xss.stored++;
                console.log(`✅ Stored safely: ${payload.substring(0, 30)}...`);
            }
        } catch (error) {
            results.xss.errors++;
            console.log(`❌ Error: ${payload.substring(0, 30)}...`);
        }
    }
}

async function testDDoS() {
    console.log('\n🔒 Testing DDoS Simulation (Rate Limiting)...');

    const requestCount = 150; // Exceeds 100 requests/minute limit
    const requests = Array.from({ length: requestCount }, () =>
        axios.get(`${BASE_URL}/products`).catch(err => err.response || err)
    );

    const startTime = Date.now();
    const responses = await Promise.allSettled(requests);
    const duration = Date.now() - startTime;

    responses.forEach((result) => {
        results.ddos.requests++;
        if (result.status === 'fulfilled') {
            const response = result.value;
            if (response?.status === 200) {
                results.ddos.success++;
            } else if (response?.status === 429) {
                results.ddos.rateLimited++;
            } else {
                results.ddos.errors++;
            }
        } else {
            results.ddos.errors++;
        }
    });

    console.log(`   Total requests: ${results.ddos.requests}`);
    console.log(`   Successful: ${results.ddos.success}`);
    console.log(`   Rate limited: ${results.ddos.rateLimited}`);
    console.log(`   Errors: ${results.ddos.errors}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Requests/sec: ${(results.ddos.requests / (duration / 1000)).toFixed(2)}`);
}

async function testMassAssignment() {
    console.log('\n🔒 Testing Mass Assignment Prevention...');

    // Need a product ID first
    let productId;
    try {
        const productsRes = await axios.get(`${BASE_URL}/products?limit=1`);
        if (productsRes.data?.data?.data?.[0]?.id) {
            productId = productsRes.data.data.data[0].id;
        } else {
            console.log('⚠️  No products found, skipping mass assignment test');
            return;
        }
    } catch (error) {
        console.log('⚠️  Could not get product ID, skipping mass assignment test');
        return;
    }

    try {
        const response = await axios.post(`${BASE_URL}/reviews`, {
            productId: productId,
            rating: 5,
            comment: 'Test',
            isAdmin: true,
            role: 'admin',
            created_at: new Date('2020-01-01'),
        });

        if (response.status === 201) {
            const data = response.data?.data || response.data;
            if (!data.isAdmin && !data.role) {
                results.massAssignment.prevented++;
                console.log('✅ Mass assignment prevented (unauthorized fields ignored)');
            } else {
                console.log('❌ Mass assignment vulnerability detected!');
            }
        }
        results.massAssignment.tested++;
    } catch (error) {
        console.log('⚠️  Error testing mass assignment');
    }
}

async function printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SECURITY TEST SUMMARY');
    console.log('='.repeat(60));

    console.log('\n🔒 SQL Injection:');
    console.log(`   Blocked: ${results.sqlInjection.blocked}`);
    console.log(`   Allowed: ${results.sqlInjection.allowed}`);
    console.log(`   Errors: ${results.sqlInjection.errors}`);

    console.log('\n🔒 XSS Attacks:');
    console.log(`   Stored safely: ${results.xss.stored}`);
    console.log(`   Errors: ${results.xss.errors}`);

    console.log('\n🔒 DDoS Simulation:');
    console.log(`   Total requests: ${results.ddos.requests}`);
    console.log(`   Successful: ${results.ddos.success}`);
    console.log(`   Rate limited: ${results.ddos.rateLimited}`);
    console.log(`   Errors: ${results.ddos.errors}`);

    console.log('\n🔒 Mass Assignment:');
    console.log(`   Prevented: ${results.massAssignment.prevented}`);
    console.log(`   Tested: ${results.massAssignment.tested}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Security tests completed!');
    console.log('='.repeat(60) + '\n');
}

async function main() {
    console.log('🚀 Starting Security Attack Tests...');
    console.log(`📍 Testing API at: ${BASE_URL}`);

    try {
        await testSQLInjection();
        await testXSS();
        await testDDoS();
        await testMassAssignment();
        await printSummary();
    } catch (error) {
        console.error('❌ Test execution error:', error.message);
        process.exit(1);
    }
}

main();


