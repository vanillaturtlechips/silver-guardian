package gemini

import (
    "context"
    "encoding/json"
    "fmt"
    "strings"

    "github.com/google/generative-ai-go/genai"
    "google.golang.org/api/option"
)

type Client struct {
    client *genai.Client
    model  string
}

type AnalysisRequest struct {
    Title       string
    Description string
    Channel     string
    Captions    string
    Comments    []CommentData
}

type CommentData struct {
    Author string
    Text   string
    Likes  int64
}

type AnalysisResponse struct {
    SafetyScore int      `json:"safety_score"`
    Categories  []string `json:"categories"`
    Reasoning   string   `json:"reasoning"`
    Concerns    []string `json:"concerns"`
}

func NewClient(ctx context.Context, apiKey, model string) (*Client, error) {
    client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
    if err != nil {
        return nil, fmt.Errorf("failed to create Gemini client: %w", err)
    }

    return &Client{
        client: client,
        model:  model,
    }, nil
}

func (c *Client) Close() error {
    return c.client.Close()
}

// AnalyzeContent analyzes video content for safety
func (c *Client) AnalyzeContent(ctx context.Context, req *AnalysisRequest) (*AnalysisResponse, error) {
    model := c.client.GenerativeModel(c.model)
    model.SetTemperature(0.3)
    model.SetTopK(40)
    model.SetTopP(0.95)

    prompt := buildPrompt(req)

    resp, err := model.GenerateContent(ctx, genai.Text(prompt))
    if err != nil {
        return nil, fmt.Errorf("failed to generate content: %w", err)
    }

    if len(resp.Candidates) == 0 {
        return nil, fmt.Errorf("no response from Gemini")
    }

    // Extract text from response
    var responseText string
    for _, part := range resp.Candidates[0].Content.Parts {
        if txt, ok := part.(genai.Text); ok {
            responseText += string(txt)
        }
    }

    // Parse JSON response
    result, err := parseGeminiResponse(responseText)
    if err != nil {
        return nil, fmt.Errorf("failed to parse Gemini response: %w", err)
    }

    return result, nil
}

func buildPrompt(req *AnalysisRequest) string {
    var sb strings.Builder

    sb.WriteString("You are an AI content safety analyzer for YouTube videos. ")
    sb.WriteString("Analyze the following content and provide a safety assessment.\n\n")

    sb.WriteString("VIDEO INFORMATION:\n")
    sb.WriteString(fmt.Sprintf("Title: %s\n", req.Title))
    sb.WriteString(fmt.Sprintf("Channel: %s\n", req.Channel))
    if req.Description != "" {
        desc := req.Description
        if len(desc) > 500 {
            desc = desc[:500] + "..."
        }
        sb.WriteString(fmt.Sprintf("Description: %s\n", desc))
    }
    sb.WriteString("\n")

    if req.Captions != "" {
        captions := req.Captions
        if len(captions) > 3000 {
            captions = captions[:3000] + "..."
        }
        sb.WriteString("CAPTIONS/TRANSCRIPT:\n")
        sb.WriteString(captions)
        sb.WriteString("\n\n")
    }

    if len(req.Comments) > 0 {
        sb.WriteString("TOP COMMENTS:\n")
        for i, comment := range req.Comments {
            if i >= 10 {
                break
            }
            sb.WriteString(fmt.Sprintf("%d. %s (by %s, %d likes): %s\n",
                i+1, comment.Author, comment.Author, comment.Likes, comment.Text))
        }
        sb.WriteString("\n")
    }

    sb.WriteString("TASK:\n")
    sb.WriteString("Analyze the content for potential safety concerns. Consider:\n")
    sb.WriteString("- Violence, hate speech, harassment\n")
    sb.WriteString("- Misinformation or harmful content\n")
    sb.WriteString("- Child safety concerns\n")
    sb.WriteString("- Sexual or adult content\n")
    sb.WriteString("- Dangerous acts or self-harm\n\n")

    sb.WriteString("Provide your analysis in the following JSON format:\n")
    sb.WriteString("{\n")
    sb.WriteString(`  "safety_score": <0-100, where 100 is completely safe>,` + "\n")
    sb.WriteString(`  "categories": [<list of concern categories if any>],` + "\n")
    sb.WriteString(`  "reasoning": "<brief explanation of your assessment>",` + "\n")
    sb.WriteString(`  "concerns": [<specific concerns found, if any>]` + "\n")
    sb.WriteString("}\n\n")
    sb.WriteString("Respond ONLY with valid JSON, no additional text.")

    return sb.String()
}

func parseGeminiResponse(text string) (*AnalysisResponse, error) {
    // Try to extract JSON from response
    text = strings.TrimSpace(text)
    
    // Remove markdown code blocks if present
    text = strings.TrimPrefix(text, "```json")
    text = strings.TrimPrefix(text, "```")
    text = strings.TrimSuffix(text, "```")
    text = strings.TrimSpace(text)

    var result AnalysisResponse
    if err := json.Unmarshal([]byte(text), &result); err != nil {
        return nil, fmt.Errorf("invalid JSON response: %w - Response: %s", err, text)
    }

    // Validate safety score
    if result.SafetyScore < 0 || result.SafetyScore > 100 {
        result.SafetyScore = 50 // Default to neutral if invalid
    }

    return &result, nil
}