# PowerShell script to test /api/generate-quiz endpoint

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   QuizRush Generate-Quiz Endpoint Test (PowerShell)      " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$API_URL = "https://vercel-deployment-bq6q-cmo6mdhi8-john-ken-ompads-projects.vercel.app"
$API_KEY = "quizrush123"

# Test payload
$testPayload = @{
    text = @"
JavaScript is a programming language that is primarily used for web development.
It allows developers to create interactive and dynamic web pages.
JavaScript supports both object-oriented and functional programming paradigms.
Variables in JavaScript can be declared using var, let, or const keywords.
The let keyword provides block scope, while var provides function scope.
Functions in JavaScript can be declared using function declarations or arrow functions.
JavaScript has several built-in data types including strings, numbers, booleans, objects, and arrays.
The typeof operator can be used to check the type of a variable.
"@
    quizType = @('mc', 'tf')
    mcQuestions = 3
    tfQuestions = 2
    difficulty = 'Medium'
    topic = 'JavaScript Fundamentals'
    subtopic = 'Variables and Data Types'
    bloomCounts = @{
        bt1 = 2
        bt2 = 2
        bt3 = 1
        bt4 = 0
        bt5 = 0
        bt6 = 0
    }
    created_by = 'test-user-123'
} | ConvertTo-Json -Depth 10

Write-Host "Testing /api/generate-quiz endpoint..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Request URL: $API_URL/api/generate-quiz" -ForegroundColor Green
Write-Host "Request payload:" -ForegroundColor Green
Write-Host ""
Write-Host $testPayload -ForegroundColor Gray
Write-Host ""
Write-Host "Sending request..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod `
        -Uri "$API_URL/api/generate-quiz" `
        -Method Post `
        -Body $testPayload `
        -ContentType "application/json" `
        -Headers @{
            "x-api-key" = $API_KEY
        } `
        -TimeoutSec 30

    Write-Host "SUCCESS! Response received:" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response data:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Gray

    # Validate response
    Write-Host ""
    Write-Host "Validating response structure..." -ForegroundColor Yellow
    Write-Host ""

    $questions = @()
    if ($response -is [Array]) {
        $questions = $response
    } elseif ($response.questions) {
        $questions = $response.questions
    } elseif ($response.quiz.questions) {
        $questions = $response.quiz.questions
    }

    if ($questions.Count -eq 0) {
        Write-Host "ERROR: No questions found in response" -ForegroundColor Red
        exit 1
    }

    Write-Host "Found $($questions.Count) questions" -ForegroundColor Green

    # Validate each question
    for ($i = 0; $i -lt $questions.Count; $i++) {
        $q = $questions[$i]
        Write-Host ""
        Write-Host "Question $($i + 1):" -ForegroundColor Cyan
        
        $questionText = if ($q.question) { $q.question } elseif ($q.text) { $q.text } else { "MISSING" }
        $questionType = if ($q.question_type) { $q.question_type } elseif ($q.questionType) { $q.questionType } else { "MISSING" }
        $bloomLevel = if ($q.bloom_level) { $q.bloom_level } elseif ($q.bloomLevel) { $q.bloomLevel } else { "MISSING" }
        
        Write-Host "  - Question text: $questionText"
        Write-Host "  - Type: $questionType"
        Write-Host "  - Bloom level: $bloomLevel"
        
        if ($questionType -eq 'mc') {
            Write-Host "  - Options count: $($q.options.Count)"
            $correctAns = if ($null -ne $q.correct_answer) { $q.correct_answer } elseif ($null -ne $q.correctAnswer) { $q.correctAnswer } else { "MISSING" }
            Write-Host "  - Correct answer: $correctAns"
        } else {
            $correctAns = if ($null -ne $q.correct_answer) { $q.correct_answer } elseif ($null -ne $q.correctAnswer) { $q.correctAnswer } else { "MISSING" }
            Write-Host "  - Correct answer: $correctAns"
        }
    }

    Write-Host ""
    Write-Host "Test completed successfully!" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "ERROR occurred:" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        Write-Host "Status Text: $($_.Exception.Response.StatusDescription)" -ForegroundColor Red
        
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Error data: $responseBody" -ForegroundColor Red
    } else {
        Write-Host "No response received from server" -ForegroundColor Red
        Write-Host "Is the backend server running at $API_URL ?" -ForegroundColor Yellow
        Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "  1. Make sure your backend server is running"
    Write-Host "  2. Check if the API_URL is correct: $API_URL"
    Write-Host "  3. Verify the API_KEY matches your backend: $API_KEY"
    Write-Host "  4. Check backend logs for error details"
    Write-Host "  5. Ensure your backend has the /api/generate-quiz route defined"
    Write-Host ""
    
    exit 1
}
