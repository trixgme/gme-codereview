// Test script for Korean language code review
const developerConfigs = require('../src/config/developerConfigs');
const codeReviewer = require('../src/utils/codeReviewer');

async function testKoreanReview() {
  console.log('🧪 Testing Korean Code Review Feature\n');
  
  // Test 1: Developer configuration detection
  console.log('1. Testing developer configuration:');
  console.log('-----------------------------------');
  
  const testAuthors = ['Eugene', 'eugene', 'Fred', 'fred', '한세희(Trix)', 'Trix', 'trixh', 'John', 'Unknown Developer'];
  
  for (const author of testAuthors) {
    const config = developerConfigs.getConfig(author);
    console.log(`Author: ${author}`);
    console.log(`  - Language: ${config.reviewLanguage}`);
    console.log(`  - Matched Name: ${config.matchedName || 'default'}`);
    console.log(`  - Review Enabled: ${config.enableReview}`);
  }
  
  console.log('\n2. Testing unified prompt with language:');
  console.log('------------------------------------');
  const koreanPrompt = developerConfigs.getReviewPrompt('ko');
  const englishPrompt = developerConfigs.getReviewPrompt('en');
  
  console.log('Korean prompt instruction:');
  const koInstruction = koreanPrompt.match(/\*\*IMPORTANT\*\*: ([^\n]+)/);
  console.log(koInstruction ? koInstruction[1] : 'Not found');
  
  console.log('\nEnglish prompt instruction:');
  const enInstruction = englishPrompt.match(/\*\*IMPORTANT\*\*: ([^\n]+)/);
  console.log(enInstruction ? enInstruction[1] : 'Not found');
  console.log();
  
  // Test 3: Sample code review
  console.log('3. Testing sample code review:');
  console.log('------------------------------');
  
  const sampleDiff = `
--- a/src/test.js
+++ b/src/test.js
@@ -1,5 +1,8 @@
 function calculateTotal(items) {
-  let total = 0;
-  for (item of items) {
-    total += item.price;
+  // Bug: SQL injection vulnerability
+  const query = "SELECT * FROM users WHERE id = " + userId;
+  db.query(query);
+  
+  // Memory leak
+  globalArray.push(items);
+  return items.reduce((sum, item) => sum + item.price, 0);
 }
`;
  
  console.log('Testing review for Eugene (Korean):');
  try {
    // Note: This will only work if OpenAI API is configured
    const review = await codeReviewer.reviewCode(
      sampleDiff,
      'src/test.js',
      'Fix calculation logic',
      'Eugene'
    );
    console.log('Review generated successfully!');
    console.log('Review preview (first 300 chars):');
    console.log(review.substring(0, 300) + '...');
  } catch (error) {
    console.log('⚠️ Review generation skipped (OpenAI API not configured or error occurred)');
    console.log('Error:', error.message);
  }
  
  console.log('\n4. Language detection for various author formats:');
  console.log('------------------------------------------------');
  
  const authorVariants = [
    'Eugene Lee',
    'eugene.lee',
    'eugene@gmeremit.com',
    'Fred Kim',
    'fred.kim',
    'fred@gmeremit.com',
    '한세희',
    'Trix Han',
    'trixh@gmeremit.com'
  ];
  
  for (const variant of authorVariants) {
    const config = developerConfigs.getConfig(variant);
    console.log(`${variant}: ${config.reviewLanguage} (matched: ${config.matchedName || 'none'})`);
  }
  
  console.log('\n✅ Korean review feature testing complete!');
}

// Run the test
testKoreanReview().catch(console.error);