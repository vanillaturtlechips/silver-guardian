# Step Functions Workflow Visualization

## State Machine Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    S3 Upload Event                          │
│         (uploads/user123/video.mp4)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  EventBridge Rule                           │
│         (silver-guardian-s3-upload)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Step Functions Start                           │
│         (silver-guardian-analysis-workflow)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ ExtractS3Info │
                 │   (Pass)      │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ ParallelAnalysis │
                 └───────┬───────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ AudioAnalysis  │ │ VideoAnalysis  │ │BedrockAnalysis │
│                │ │                │ │                │
│ HTTP POST      │ │ HTTP POST      │ │ Bedrock Invoke │
│ audio-analyzer │ │ video-analyzer │ │ Claude 3       │
│ :8000/analyze  │ │ :8001/analyze  │ │                │
│                │ │                │ │                │
│ Retry: 3x      │ │ Retry: 3x      │ │ Retry: 3x      │
│ Fallback: 0.5  │ │ Fallback: 0.5  │ │ Fallback: 0.5  │
└────────┬───────┘ └────────┬───────┘ └────────┬───────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │AggregateResults│
                 │   (Pass)      │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ SaveToDatabase│
                 │   (Lambda)    │
                 └───────┬───────┘
                         │
                         ▼
                    ┌────────┐
                    │  End   │
                    └────────┘
```

## Parallel Execution Details

### Branch 1: Audio Analysis
```json
{
  "StartAt": "AudioAnalysis",
  "States": {
    "AudioAnalysis": {
      "Type": "Task",
      "Resource": "arn:aws:states:::http:invoke",
      "Parameters": {
        "ApiEndpoint": "http://audio-analyzer.default.svc.cluster.local:8000/analyze",
        "Method": "POST",
        "RequestBody": {
          "s3_bucket": "silver-guardian-uploads",
          "s3_key": "uploads/user123/video.mp4"
        }
      },
      "Retry": [3 attempts, exponential backoff],
      "Catch": [Fallback to 0.5]
    }
  }
}
```

### Branch 2: Video Analysis
```json
{
  "StartAt": "VideoAnalysis",
  "States": {
    "VideoAnalysis": {
      "Type": "Task",
      "Resource": "arn:aws:states:::http:invoke",
      "Parameters": {
        "ApiEndpoint": "http://video-analyzer.default.svc.cluster.local:8001/analyze",
        "Method": "POST",
        "RequestBody": {
          "s3_bucket": "silver-guardian-uploads",
          "s3_key": "uploads/user123/video.mp4",
          "sample_rate": 30
        }
      },
      "Retry": [3 attempts, exponential backoff],
      "Catch": [Fallback to 0.5]
    }
  }
}
```

### Branch 3: Bedrock Context Analysis
```json
{
  "StartAt": "BedrockAnalysis",
  "States": {
    "BedrockAnalysis": {
      "Type": "Task",
      "Resource": "arn:aws:states:::bedrock:invokeModel",
      "Parameters": {
        "ModelId": "anthropic.claude-3-sonnet-20240229-v1:0",
        "Body": {
          "messages": [
            {
              "role": "user",
              "content": "이 영상이 딥페이크, 보이스피싱, 또는 금융 사기일 가능성을 평가하세요."
            }
          ]
        }
      },
      "Retry": [3 attempts, exponential backoff],
      "Catch": [Fallback to 0.5]
    }
  }
}
```

## Execution Timeline

```
Time: 0s
├─ S3 Upload Event
└─ EventBridge triggers Step Functions

Time: 0.5s
├─ ExtractS3Info (Pass state)
└─ Start Parallel execution

Time: 1s - 30s (Parallel execution)
├─ Branch 1: Audio Analysis (2-5s)
├─ Branch 2: Video Analysis (3-7s)
└─ Branch 3: Bedrock Analysis (1-3s)

Time: 30s
├─ All branches complete
└─ AggregateResults

Time: 31s
├─ SaveToDatabase (Lambda)
└─ Execution complete

Total: ~31 seconds
```

## Error Handling

### Retry Strategy
- **Max Attempts**: 3
- **Interval**: 2 seconds
- **Backoff Rate**: 2x (2s → 4s → 8s)

### Fallback Values
- Audio Analysis fails → `deepfake_probability: 0.5`
- Video Analysis fails → `manipulation_probability: 0.5`
- Bedrock Analysis fails → `scam_probability: 0.5`

### Catch Mechanism
```json
"Catch": [
  {
    "ErrorEquals": ["States.ALL"],
    "ResultPath": "$.audioError",
    "Next": "AudioFallback"
  }
]
```

## Data Flow

### Input (from EventBridge)
```json
{
  "detail": {
    "bucket": {
      "name": "silver-guardian-uploads"
    },
    "object": {
      "key": "uploads/user123/video.mp4",
      "size": 52428800
    }
  }
}
```

### After ExtractS3Info
```json
{
  "bucket": "silver-guardian-uploads",
  "key": "uploads/user123/video.mp4",
  "size": 52428800
}
```

### After ParallelAnalysis
```json
{
  "bucket": "silver-guardian-uploads",
  "key": "uploads/user123/video.mp4",
  "analysisResults": [
    {
      "audioResult": {
        "deepfake_probability": 0.234,
        "audio_duration": 45.67,
        "status": "success"
      }
    },
    {
      "videoResult": {
        "manipulation_probability": 0.345,
        "total_frames": 1800,
        "status": "success"
      }
    },
    {
      "bedrockResult": {
        "scam_probability": 0.156,
        "reasoning": "정상적인 콘텐츠로 보임",
        "status": "success"
      }
    }
  ]
}
```

### After AggregateResults
```json
{
  "finalResult": {
    "bucket": "silver-guardian-uploads",
    "key": "uploads/user123/video.mp4",
    "audio_score": 0.234,
    "video_score": 0.345,
    "context_score": 0.156,
    "timestamp": "2026-02-21T08:44:11.863Z"
  }
}
```

### Lambda Input (SaveToDatabase)
```json
{
  "bucket": "silver-guardian-uploads",
  "key": "uploads/user123/video.mp4",
  "audio_score": 0.234,
  "video_score": 0.345,
  "context_score": 0.156,
  "timestamp": "2026-02-21T08:44:11.863Z"
}
```

## Cost Estimation

### Step Functions
- **State Transitions**: ~10 transitions per execution
- **Cost**: $0.000025 per transition
- **Per Execution**: $0.00025

### Bedrock (Claude 3 Sonnet)
- **Input Tokens**: ~100 tokens
- **Output Tokens**: ~50 tokens
- **Cost**: ~$0.003 per execution

### Total per Execution
- **Step Functions**: $0.00025
- **Bedrock**: $0.003
- **EKS Pods**: Variable (KEDA scales)
- **Total**: ~$0.00325 per video analysis
