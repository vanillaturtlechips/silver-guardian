import json
import boto3
import time
import re
from datetime import datetime

# AWS 클라이언트
transcribe = boto3.client('transcribe', region_name='ap-northeast-2')
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
s3 = boto3.client('s3', region_name='ap-northeast-2')

def lambda_handler(event, context):
    """
    Step Functions에서 호출되는 Lambda 함수
    1. S3 비디오에서 오디오 추출 (Transcribe)
    2. 텍스트를 Bedrock Claude 3에 전달
    3. 피싱/스캠 확률 반환
    """
    
    # 입력 파라미터
    bucket = event.get('bucket')
    key = event.get('key')
    
    if not bucket or not key:
        return {
            'statusCode': 400,
            'scam_probability': 0.5,
            'reasoning': 'Missing bucket or key',
            'status': 'error'
        }
    
    try:
        # 1. Transcribe Job 시작
        transcript_text = transcribe_video(bucket, key)
        
        # 2. Bedrock으로 컨텍스트 분석
        result = analyze_with_bedrock(transcript_text, bucket, key)
        
        return {
            'statusCode': 200,
            'scam_probability': result['scam_probability'],
            'reasoning': result['reasoning'],
            'transcript_length': len(transcript_text),
            'status': 'success'
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'scam_probability': 0.5,
            'reasoning': f'Analysis failed: {str(e)}',
            'status': 'error'
        }


def transcribe_video(bucket, key):
    """
    S3 비디오를 Transcribe하여 텍스트 추출
    """
    job_name = f"sg-{key.replace('/', '-')}-{int(time.time())}"
    job_uri = f"s3://{bucket}/{key}"
    
    # Transcribe Job 시작
    transcribe.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={'MediaFileUri': job_uri},
        MediaFormat='mp4',
        LanguageCode='ko-KR',
        OutputBucketName=bucket,
        OutputKey=f"transcripts/{job_name}.json"
    )
    
    # Job 완료 대기 (최대 5분)
    max_wait = 300  # 5분
    wait_interval = 10  # 10초
    elapsed = 0
    
    while elapsed < max_wait:
        status = transcribe.get_transcription_job(TranscriptionJobName=job_name)
        job_status = status['TranscriptionJob']['TranscriptionJobStatus']
        
        if job_status == 'COMPLETED':
            # Transcript 다운로드
            transcript_uri = status['TranscriptionJob']['Transcript']['TranscriptFileUri']
            transcript_key = f"transcripts/{job_name}.json"
            
            # S3에서 transcript 읽기
            response = s3.get_object(Bucket=bucket, Key=transcript_key)
            transcript_data = json.loads(response['Body'].read().decode('utf-8'))
            
            # 텍스트 추출
            text = transcript_data['results']['transcripts'][0]['transcript']
            
            # Job 정리
            transcribe.delete_transcription_job(TranscriptionJobName=job_name)
            
            return text
            
        elif job_status == 'FAILED':
            raise Exception(f"Transcription failed: {status['TranscriptionJob'].get('FailureReason', 'Unknown')}")
        
        time.sleep(wait_interval)
        elapsed += wait_interval
    
    # 타임아웃
    raise Exception("Transcription timeout (5 minutes)")


def analyze_with_bedrock(transcript_text, bucket, key):
    """
    Bedrock Claude 3로 컨텍스트 분석
    """
    
    # 텍스트가 너무 짧으면 분석 불가
    if len(transcript_text) < 10:
        return {
            'scam_probability': 0.3,
            'reasoning': '텍스트가 너무 짧아 분석이 어렵습니다.'
        }
    
    # 프롬프트 엔지니어링
    prompt = f"""다음은 YouTube 영상에서 추출한 음성 텍스트입니다. 이 영상이 다음 중 하나에 해당하는지 분석하세요:

1. 딥페이크 (Deepfake): 유명인의 목소리나 얼굴을 조작한 영상
2. 보이스피싱 (Voice Phishing): 금융기관, 정부기관을 사칭하여 금전을 요구
3. 금융 사기 (Financial Scam): 투자 권유, 대출 사기, 다단계 등

텍스트:
\"\"\"
{transcript_text[:2000]}
\"\"\"

위 텍스트를 분석하여 다음 JSON 형식으로만 응답하세요:
{{
  "scam_probability": 0.0~1.0 사이의 숫자,
  "reasoning": "판단 근거를 한국어로 2-3문장"
}}

주의사항:
- scam_probability는 0.0 (안전)부터 1.0 (매우 위험)까지의 숫자입니다
- 정상적인 콘텐츠는 0.0~0.3
- 의심스러운 콘텐츠는 0.4~0.6
- 명백한 사기는 0.7~1.0
- JSON 형식만 반환하고 다른 설명은 하지 마세요"""

    # Bedrock API 호출
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 500,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3,
        "top_p": 0.9
    })
    
    response = bedrock.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=body
    )
    
    # 응답 파싱
    response_body = json.loads(response['body'].read())
    content = response_body['content'][0]['text']
    
    # JSON 추출 (Claude가 추가 텍스트를 포함할 수 있음)
    result = parse_bedrock_response(content)
    
    return result


def parse_bedrock_response(content):
    """
    Bedrock 응답에서 JSON 추출 및 파싱
    """
    try:
        # JSON 블록 찾기
        json_match = re.search(r'\{[^}]+\}', content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            data = json.loads(json_str)
            
            # 확률 값 검증
            probability = float(data.get('scam_probability', 0.5))
            probability = max(0.0, min(1.0, probability))  # 0.0~1.0 범위로 제한
            
            return {
                'scam_probability': round(probability, 3),
                'reasoning': data.get('reasoning', '분석 완료')
            }
    except Exception as e:
        print(f"Parse error: {str(e)}, content: {content}")
    
    # 파싱 실패 시 기본값
    return {
        'scam_probability': 0.5,
        'reasoning': '응답 파싱 실패'
    }
