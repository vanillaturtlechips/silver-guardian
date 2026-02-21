package s3

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type Client struct {
	s3Client   *s3.Client
	bucketName string
	region     string
}

func NewClient(ctx context.Context, bucketName, region string) (*Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	return &Client{
		s3Client:   s3.NewFromConfig(cfg),
		bucketName: bucketName,
		region:     region,
	}, nil
}

type PresignedURLRequest struct {
	Filename    string
	ContentType string
	FileSize    int64
	UserID      string
}

type PresignedURLResponse struct {
	UploadURL string
	S3Key     string
	ExpiresIn int32
	UploadID  string
}

func (c *Client) GeneratePresignedURL(ctx context.Context, req PresignedURLRequest) (*PresignedURLResponse, error) {
	uploadID := uuid.New().String()
	s3Key := fmt.Sprintf("uploads/%s/%s/%s", req.UserID, uploadID, req.Filename)

	presignClient := s3.NewPresignClient(c.s3Client)
	
	putObjectInput := &s3.PutObjectInput{
		Bucket:      aws.String(c.bucketName),
		Key:         aws.String(s3Key),
		ContentType: aws.String(req.ContentType),
	}

	presignedReq, err := presignClient.PresignPutObject(ctx, putObjectInput, func(opts *s3.PresignOptions) {
		opts.Expires = 15 * time.Minute
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return &PresignedURLResponse{
		UploadURL: presignedReq.URL,
		S3Key:     s3Key,
		ExpiresIn: int32(15 * 60),
		UploadID:  uploadID,
	}, nil
}
