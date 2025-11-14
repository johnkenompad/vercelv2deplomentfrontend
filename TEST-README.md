# Testing the Generate-Quiz Endpoint

This directory contains test scripts to validate the `/api/generate-quiz` endpoint.

## Prerequisites

1. **Backend server must be running** at `http://localhost:5000`
2. Backend must have the `/api/generate-quiz` route implemented
3. API key should match: `quizrush123`

## Test Files

- `test-generate-quiz.js` - Node.js test script
- `test-generate-quiz.ps1` - PowerShell test script
- `test-generate-quiz.http` - VS Code REST Client test

## Running Tests

### Option 1: PowerShell Script (Recommended for Windows)

```powershell
.\test-generate-quiz.ps1
```

### Option 2: Node.js Script

First install axios if not already installed:
```powershell
npm install axios
```

Then run:
```powershell
node test-generate-quiz.js
```

### Option 3: Manual curl test

```powershell
$body = @{
    text = "JavaScript is a programming language used for web development."
    quizType = @('mc', 'tf')
    mcQuestions = 2
    tfQuestions = 2
    difficulty = 'Easy'
    topic = 'JavaScript'
    subtopic = 'Basics'
    bloomCounts = @{
        bt1 = 2
        bt2 = 2
        bt3 = 0
        bt4 = 0
        bt5 = 0
        bt6 = 0
    }
    created_by = 'test-user'
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "http://localhost:5000/api/generate-quiz" -Method Post -Body $body -ContentType "application/json" -Headers @{"x-api-key"="quizrush123"}
```

## Expected Response Format

The endpoint should return an array of questions or an object containing a questions array:

```json
{
  "questions": [
    {
      "question": "What is JavaScript primarily used for?",
      "question_type": "mc",
      "bloom_level": "bt1",
      "options": [
        "Web development",
        "Mobile development",
        "Desktop applications",
        "Game development"
      ],
      "correct_answer": 0
    },
    {
      "question": "JavaScript supports functional programming.",
      "question_type": "tf",
      "bloom_level": "bt2",
      "correct_answer": true
    }
  ]
}
```

## Validation Checks

The test scripts will validate:
- ✅ Response contains questions array
- ✅ Each question has required fields:
  - `question` or `text` (question text)
  - `question_type` or `questionType` (mc or tf)
  - `bloom_level` or `bloomLevel` (bt1-bt6)
  - `correct_answer` or `correctAnswer`
- ✅ Multiple choice questions have `options` array
- ✅ All required fields are non-empty

## Troubleshooting

### "Unable to connect to the remote server"
- ❌ Backend server is not running
- ✅ Start your backend server first

### "401 Unauthorized" or "403 Forbidden"
- ❌ API key mismatch
- ✅ Check that backend expects API key: `quizrush123`

### "404 Not Found"
- ❌ Route not implemented
- ✅ Ensure backend has `/api/generate-quiz` POST route

### "500 Internal Server Error"
- ❌ Backend error processing request
- ✅ Check backend console logs for error details

### Questions array is empty
- ❌ Backend AI/generation logic failed
- ✅ Check if backend has proper AI integration (OpenAI, etc.)
- ✅ Verify backend environment variables are set

## Backend Requirements

Your backend should:
1. Accept POST requests to `/api/generate-quiz`
2. Validate the API key in `x-api-key` header
3. Accept the following request body parameters:
   - `text` (string) - Source text for quiz generation
   - `quizType` (array) - ['mc', 'tf']
   - `mcQuestions` (number) - Count of multiple choice questions
   - `tfQuestions` (number) - Count of true/false questions
   - `difficulty` (string) - 'Easy', 'Medium', or 'Hard'
   - `topic` (string) - Main topic
   - `subtopic` (string) - Sub-topic
   - `bloomCounts` (object) - Distribution across Bloom's Taxonomy levels
   - `created_by` (string) - User ID

4. Return a response with questions array matching the format above
