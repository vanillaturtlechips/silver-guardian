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

// AnalysisResponse: 최종 반환할 구조체 (Reasoning은 string으로 유지)
type AnalysisResponse struct {
	SafetyScore int      `json:"safety_score"`
	Summary     string   `json:"summary"`
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

func (c *Client) AnalyzeContent(ctx context.Context, req *AnalysisRequest) (*AnalysisResponse, error) {
	model := c.client.GenerativeModel(c.model)
	model.SetTemperature(0.1)
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

	var responseText string
	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			responseText += string(txt)
		}
	}

	result, err := parseGeminiResponse(responseText)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Gemini response: %w", err)
	}

	return result, nil
}

func buildPrompt(req *AnalysisRequest) string {
	var sb strings.Builder

	sb.WriteString("You are an expert AI Detective specializing in detecting Deepfakes, AI-generated voices, and Financial Scams targeting elderly people.\n")
	sb.WriteString("Your goal is to analyze the video metadata to determine if it is 'Real/Safe' or a 'Deepfake/Scam'.\n\n")

	sb.WriteString("VIDEO INFORMATION:\n")
	sb.WriteString(fmt.Sprintf("Title: %s\n", req.Title))
	sb.WriteString(fmt.Sprintf("Channel: %s\n", req.Channel))
	if req.Description != "" {
		desc := req.Description
		if len(desc) > 1000 {
			desc = desc[:1000] + "..."
		}
		sb.WriteString(fmt.Sprintf("Description: %s\n", desc))
	}
	sb.WriteString("\n")

	if req.Captions != "" {
		captions := req.Captions
		if len(captions) > 3000 {
			captions = captions[:3000] + "..."
		}
		sb.WriteString("TRANSCRIPT (Spoken content):\n")
		sb.WriteString(captions)
		sb.WriteString("\n\n")
	}

	if len(req.Comments) > 0 {
		sb.WriteString("USER COMMENTS (Check for warnings from other users):\n")
		for i, comment := range req.Comments {
			if i >= 15 {
				break
			}
			sb.WriteString(fmt.Sprintf("- %s: %s\n", comment.Author, comment.Text))
		}
		sb.WriteString("\n")
	}

	sb.WriteString("ANALYSIS TASKS:\n")
	sb.WriteString("1. Check for Deepfake signs: Unnatural speech, robotic voices, or famous people (Elon Musk, President) promoting crypto/investment.\n")
	sb.WriteString("2. Check for Scams: 'Guaranteed returns', 'Urgent wire transfer', suspicious links.\n")
	sb.WriteString("3. Check Sentiment: Are users calling it 'Fake', 'Scam', or 'Lie'?\n\n")

	sb.WriteString("RESPONSE FORMAT (Strict JSON):\n")
	sb.WriteString("{\n")
	sb.WriteString(`  "safety_score": <0-100 integer. 0 = Definite Scam/Deepfake, 100 = Completely Real/Safe>,` + "\n")
	sb.WriteString(`  "summary": "<A very short, single sentence in KOREAN for a popup modal. Simple language. Example: '이 영상은 딥페이크로 의심됩니다.' or '안전한 영상입니다.'>",` + "\n")
	sb.WriteString(`  "reasoning": "<A detailed explanation in KOREAN. Explain WHY. Use polite, large-print friendly language.>",` + "\n")
	sb.WriteString(`  "concerns": ["<List specific suspicious keywords in Korean e.g., '투자 권유', 'AI 목소리'>"]` + "\n")
	sb.WriteString("}\n\n")

	sb.WriteString("IMPORTANT: Respond ONLY with valid JSON. Do not include markdown formatting. All text values MUST be in KOREAN.")

	return sb.String()
}

// parseGeminiResponse 함수 수정: Reasoning 필드의 타입 유연성 확보
func parseGeminiResponse(text string) (*AnalysisResponse, error) {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	// 중간 단계 구조체 정의: Reasoning을 interface{}로 받음
	type RawAnalysisResponse struct {
		SafetyScore int         `json:"safety_score"`
		Summary     string      `json:"summary"`
		Reasoning   interface{} `json:"reasoning"` // 문자열일 수도 있고, 배열일 수도 있음
		Concerns    []string    `json:"concerns"`
	}

	var raw RawAnalysisResponse
	if err := json.Unmarshal([]byte(text), &raw); err != nil {
		return nil, fmt.Errorf("invalid JSON response: %w - Response: %s", err, text)
	}

	// 최종 결과 구조체로 변환
	result := &AnalysisResponse{
		SafetyScore: raw.SafetyScore,
		Summary:     raw.Summary,
		Concerns:    raw.Concerns,
	}

	// Reasoning 타입 체크 및 변환
	switch v := raw.Reasoning.(type) {
	case string:
		// 이미 문자열이면 그대로 사용
		result.Reasoning = v
	case []interface{}:
		// 배열이면 문자열로 합치기
		var parts []string
		for _, item := range v {
			if str, ok := item.(string); ok {
				parts = append(parts, str)
			}
		}
		result.Reasoning = strings.Join(parts, "\n\n")
	default:
		// 그 외의 경우 (예: null)
		result.Reasoning = "상세 분석 내용을 불러오지 못했습니다."
	}

	// 값 보정
	if result.SafetyScore < 0 {
		result.SafetyScore = 0
	}
	if result.SafetyScore > 100 {
		result.SafetyScore = 100
	}
	if result.Summary == "" {
		result.Summary = "분석 완료 (요약 없음)"
	}

	return result, nil
}