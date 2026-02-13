package youtube

import (
    "context"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os/exec"
    "regexp"
    "strings"
    "time"
)

type Client struct {
    apiKey     string
    httpClient *http.Client
}

type VideoMetadata struct {
    VideoID     string
    Title       string
    Description string
    Channel     string
    Duration    int64
    ViewCount   int64
    PublishedAt time.Time
}

type Comment struct {
    Author string
    Text   string
    Likes  int64
    Rank   int
}

func NewClient(apiKey string) *Client {
    return &Client{
        apiKey: apiKey,
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

// ExtractVideoID extracts YouTube video ID from URL
func ExtractVideoID(videoURL string) (string, error) {
	fmt.Printf("[DEBUG] Parsing Input: %s\n", videoURL)

	// 1. 입력값이 이미 깔끔한 11자리 ID인 경우 (프론트엔드가 처리해준 경우)
	// 예: "6NNaHMzFnac"
	if len(videoURL) == 11 {
		match, _ := regexp.MatchString(`^[a-zA-Z0-9_-]{11}$`, videoURL)
		if match {
			fmt.Printf("[DEBUG] Input is already a raw ID: %s\n", videoURL)
			return videoURL, nil
		}
	}

	// 2. URL 형식이면 정규식으로 추출 (Shorts, Live, Embed, 공유 링크 등 모두 지원)
	// 예: "https://www.youtube.com/shorts/6NNaHMzFnac"
	regex := regexp.MustCompile(`(?:v=|be\/|embed\/|shorts\/|live\/)([\w-]{11})`)
	matches := regex.FindStringSubmatch(videoURL)
	
	if len(matches) < 2 {
		fmt.Printf("[DEBUG] Regex failed to match\n")
		return "", fmt.Errorf("invalid YouTube URL")
	}

	fmt.Printf("[DEBUG] Extracted ID from URL: %s\n", matches[1])
	return matches[1], nil
}

// GetMetadata retrieves video metadata using YouTube Data API
func (c *Client) GetMetadata(ctx context.Context, videoID string) (*VideoMetadata, error) {
    apiURL := fmt.Sprintf(
        "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=%s&key=%s",
        videoID, c.apiKey,
    )

    req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
    if err != nil {
        return nil, err
    }

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("YouTube API error: %s - %s", resp.Status, string(body))
    }

    var result struct {
        Items []struct {
            Snippet struct {
                Title       string    `json:"title"`
                Description string    `json:"description"`
                ChannelTitle string   `json:"channelTitle"`
                PublishedAt time.Time `json:"publishedAt"`
            } `json:"snippet"`
            ContentDetails struct {
                Duration string `json:"duration"`
            } `json:"contentDetails"`
            Statistics struct {
                ViewCount string `json:"viewCount"`
            } `json:"statistics"`
        } `json:"items"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    if len(result.Items) == 0 {
        return nil, fmt.Errorf("video not found")
    }

    item := result.Items[0]
    
    // Parse duration (ISO 8601 format: PT1H2M10S)
    duration := parseDuration(item.ContentDetails.Duration)
    
    // Parse view count
    var viewCount int64
    fmt.Sscanf(item.Statistics.ViewCount, "%d", &viewCount)

    return &VideoMetadata{
        VideoID:     videoID,
        Title:       item.Snippet.Title,
        Description: item.Snippet.Description,
        Channel:     item.Snippet.ChannelTitle,
        Duration:    duration,
        ViewCount:   viewCount,
        PublishedAt: item.Snippet.PublishedAt,
    }, nil
}

// GetCaptions downloads captions using yt-dlp
func (c *Client) GetCaptions(ctx context.Context, videoID string) (string, error) {
    videoURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)

    // Check if yt-dlp is installed
    if _, err := exec.LookPath("yt-dlp"); err != nil {
        return "", fmt.Errorf("yt-dlp not found: please install it (pip install yt-dlp)")
    }

    cmd := exec.CommandContext(ctx, "yt-dlp",
        "--skip-download",
        "--write-auto-sub",
        "--sub-lang", "en,ko",
        "--convert-subs", "srt",  // txt → srt 변경
        "--print", "%(subtitles)s",
        videoURL,
    )

    output, err := cmd.CombinedOutput()
    if err != nil {
        // If auto-generated captions not available, try manual captions
        cmd = exec.CommandContext(ctx, "yt-dlp",
            "--skip-download",
            "--write-sub",
            "--sub-lang", "en,ko",
            "--convert-subs", "srt",  // txt → srt 변경
            "--print", "%(subtitles)s",
            videoURL,
        )
        output, err = cmd.CombinedOutput()
        if err != nil {
            return "", fmt.Errorf("failed to get captions: %w - %s", err, string(output))
        }
    }

    captions := string(output)
    
    // Clean up captions (remove timestamps, formatting)
    captions = cleanCaptions(captions)
    
    if strings.TrimSpace(captions) == "" {
        return "", fmt.Errorf("no captions available for this video")
    }

    return captions, nil
}

// GetTopComments retrieves top comments using YouTube Data API
func (c *Client) GetTopComments(ctx context.Context, videoID string, count int) ([]Comment, error) {
    apiURL := fmt.Sprintf(
        "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=%s&order=relevance&maxResults=%d&key=%s",
        videoID, count, c.apiKey,
    )

    req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
    if err != nil {
        return nil, err
    }

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("YouTube API error: %s - %s", resp.Status, string(body))
    }

    var result struct {
        Items []struct {
            Snippet struct {
                TopLevelComment struct {
                    Snippet struct {
                        AuthorDisplayName string `json:"authorDisplayName"`
                        TextDisplay       string `json:"textDisplay"`
                        LikeCount         int64  `json:"likeCount"`
                    } `json:"snippet"`
                } `json:"topLevelComment"`
            } `json:"snippet"`
        } `json:"items"`
    }

    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    var comments []Comment
    for i, item := range result.Items {
        comment := item.Snippet.TopLevelComment.Snippet
        comments = append(comments, Comment{
            Author: comment.AuthorDisplayName,
            Text:   stripHTML(comment.TextDisplay),
            Likes:  comment.LikeCount,
            Rank:   i + 1,
        })
    }

    return comments, nil
}

// Helper: Parse ISO 8601 duration
func parseDuration(duration string) int64 {
    // PT1H2M10S -> 3730 seconds
    re := regexp.MustCompile(`PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?`)
    matches := re.FindStringSubmatch(duration)
    
    var hours, minutes, seconds int64
    if len(matches) > 1 && matches[1] != "" {
        fmt.Sscanf(matches[1], "%d", &hours)
    }
    if len(matches) > 2 && matches[2] != "" {
        fmt.Sscanf(matches[2], "%d", &minutes)
    }
    if len(matches) > 3 && matches[3] != "" {
        fmt.Sscanf(matches[3], "%d", &seconds)
    }
    
    return hours*3600 + minutes*60 + seconds
}

// Helper: Clean captions
func cleanCaptions(text string) string {
    // Remove VTT formatting
    lines := strings.Split(text, "\n")
    var cleaned []string
    
    for _, line := range lines {
        line = strings.TrimSpace(line)
        // Skip timestamps, empty lines, WEBVTT headers
        if line == "" || strings.HasPrefix(line, "WEBVTT") || 
           regexp.MustCompile(`^\d{2}:\d{2}:\d{2}`).MatchString(line) ||
           regexp.MustCompile(`^\d+ --> \d+`).MatchString(line) {
            continue
        }
        cleaned = append(cleaned, line)
    }
    
    return strings.Join(cleaned, " ")
}

// Helper: Strip HTML tags
func stripHTML(text string) string {
    re := regexp.MustCompile(`<[^>]*>`)
    return re.ReplaceAllString(text, "")
}