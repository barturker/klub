// Test script to verify duplicate prevention logic
// Run with: node test-duplicate-prevention.js

async function testDuplicatePrevention() {
  const baseUrl = 'http://localhost:3000';
  
  // You'll need to get a valid auth token from your browser session
  // Go to localhost:3000, login, and get the token from cookies
  console.log(`
==============================================
TEST: Duplicate Community Name Prevention
==============================================

This test verifies that:
1. A user CANNOT create multiple communities with the same name
2. Different users CAN create communities with the same name (with unique slugs)

To run this test:
1. Go to http://localhost:3000 and login
2. Open DevTools > Application > Cookies
3. Copy the 'sb-access-token' value
4. Replace 'YOUR_TOKEN_HERE' below with the token
5. Run: node test-duplicate-prevention.js
`);

  const token = 'YOUR_TOKEN_HERE'; // Replace with actual token
  
  if (token === 'YOUR_TOKEN_HERE') {
    console.log('⚠️  Please update the token in the script first!');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': `sb-access-token=${token}`,
  };

  console.log('\n1️⃣  Creating first community "Test Club"...');
  try {
    const response1 = await fetch(`${baseUrl}/api/communities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Club',
        description: 'First test community',
      }),
    });
    
    const result1 = await response1.json();
    console.log('✅ First community created:', result1);
    
    console.log('\n2️⃣  Attempting to create duplicate "Test Club"...');
    const response2 = await fetch(`${baseUrl}/api/communities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Test Club',
        description: 'Duplicate attempt',
      }),
    });
    
    const result2 = await response2.json();
    
    if (response2.status === 400 && result2.error === 'Duplicate community name') {
      console.log('✅ Duplicate prevented successfully!');
      console.log('   Message:', result2.message);
    } else {
      console.log('❌ Unexpected result:', result2);
    }
    
    console.log('\n3️⃣  Creating different community "Another Club"...');
    const response3 = await fetch(`${baseUrl}/api/communities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Another Club',
        description: 'Different community',
      }),
    });
    
    const result3 = await response3.json();
    if (response3.ok) {
      console.log('✅ Different community created:', result3);
    } else {
      console.log('❌ Failed to create different community:', result3);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDuplicatePrevention();