/**
 * Test script for the /api/generate-quiz endpoint
 * 
 * This demonstrates how to call the endpoint with sample data
 * Run this after starting your backend server
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5000';
const API_KEY = 'quizrush123';

// Test data for quiz generation
const testPayload = {
  text: `
    JavaScript is a programming language that is primarily used for web development.
    It allows developers to create interactive and dynamic web pages.
    JavaScript supports both object-oriented and functional programming paradigms.
    Variables in JavaScript can be declared using var, let, or const keywords.
    The let keyword provides block scope, while var provides function scope.
    Functions in JavaScript can be declared using function declarations or arrow functions.
    JavaScript has several built-in data types including strings, numbers, booleans, objects, and arrays.
    The typeof operator can be used to check the type of a variable.
  `,
  quizType: ['mc', 'tf'],
  mcQuestions: 3,
  tfQuestions: 2,
  difficulty: 'Medium',
  topic: 'JavaScript Fundamentals',
  subtopic: 'Variables and Data Types',
  bloomCounts: {
    bt1: 2,  // Remember
    bt2: 2,  // Understand
    bt3: 1,  // Apply
    bt4: 0,  // Analyze
    bt5: 0,  // Evaluate
    bt6: 0   // Create
  },
  created_by: 'test-user-123'
};

async function testGenerateQuiz() {
  console.log('\n🧪 Testing /api/generate-quiz endpoint...\n');
  console.log('📤 Request URL:', `${API_URL}/api/generate-quiz`);
  console.log('📤 Request payload:', JSON.stringify(testPayload, null, 2));
  console.log('\n⏳ Sending request...\n');

  try {
    const response = await axios.post(
      `${API_URL}/api/generate-quiz`,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log('✅ SUCCESS! Response received:\n');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('\n📥 Response data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Validate response structure
    console.log('\n🔍 Validating response structure...\n');
    
    let questions = [];
    if (Array.isArray(response.data)) {
      questions = response.data;
    } else if (response.data.questions) {
      questions = response.data.questions;
    } else if (response.data.quiz?.questions) {
      questions = response.data.quiz.questions;
    }

    if (questions.length === 0) {
      console.log('❌ No questions found in response');
      return;
    }

    console.log(`✅ Found ${questions.length} questions`);
    
    // Validate each question
    questions.forEach((q, idx) => {
      console.log(`\n📝 Question ${idx + 1}:`);
      console.log('  - Question text:', q.question || q.text || '❌ MISSING');
      console.log('  - Type:', q.question_type || q.questionType || '❌ MISSING');
      console.log('  - Bloom level:', q.bloom_level || q.bloomLevel || '❌ MISSING');
      
      if (q.question_type === 'mc' || q.questionType === 'mc') {
        console.log('  - Options count:', (q.options || []).length);
        console.log('  - Correct answer:', q.correct_answer ?? q.correctAnswer ?? '❌ MISSING');
      } else {
        console.log('  - Correct answer:', q.correct_answer ?? q.correctAnswer ?? '❌ MISSING');
      }
    });

    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ ERROR occurred:\n');
    
    if (error.response) {
      // Server responded with error status
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Request made but no response received
      console.error('❌ No response received from server');
      console.error('Is the backend server running at', API_URL, '?');
      console.error('Error details:', error.message);
    } else {
      // Error setting up the request
      console.error('Request setup error:', error.message);
    }

    console.log('\n💡 Troubleshooting tips:');
    console.log('  1. Make sure your backend server is running');
    console.log('  2. Check if the API_URL is correct:', API_URL);
    console.log('  3. Verify the API_KEY matches your backend:', API_KEY);
    console.log('  4. Check backend logs for error details');
    console.log('  5. Ensure your backend has the /api/generate-quiz route defined\n');
  }
}

// Run the test
console.log('╔════════════════════════════════════════════════════════╗');
console.log('║   QuizRush Generate-Quiz Endpoint Test Script         ║');
console.log('╚════════════════════════════════════════════════════════╝');

testGenerateQuiz();
