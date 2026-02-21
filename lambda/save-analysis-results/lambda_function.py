import json
import os
import psycopg2
from datetime import datetime

def lambda_handler(event, context):
    """
    Step Functions에서 호출되는 Lambda 함수
    분석 결과를 PostgreSQL DB에 저장
    """
    
    # DB 연결 정보 (환경변수)
    db_host = os.environ.get('DB_HOST')
    db_port = os.environ.get('DB_PORT', '5432')
    db_name = os.environ.get('DB_NAME')
    db_user = os.environ.get('DB_USER')
    db_password = os.environ.get('DB_PASSWORD')
    
    # 입력 파라미터
    bucket = event.get('bucket')
    key = event.get('key')
    audio_score = event.get('audio_score', 0.5)
    video_score = event.get('video_score', 0.5)
    context_score = event.get('context_score', 0.5)
    timestamp = event.get('timestamp')
    
    # 최종 점수 계산 (가중 평균)
    final_score = round((audio_score * 0.3 + video_score * 0.3 + context_score * 0.4) * 100)
    
    try:
        # DB 연결
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        cur = conn.cursor()
        
        # S3 키에서 video_id 추출 (uploads/user123/uuid/video.mp4 -> uuid)
        video_id = extract_video_id(key)
        
        # analysis_results 테이블에 저장
        cur.execute("""
            INSERT INTO analysis_results 
            (video_id, s3_bucket, s3_key, audio_score, video_score, context_score, 
             final_score, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (video_id) 
            DO UPDATE SET
                audio_score = EXCLUDED.audio_score,
                video_score = EXCLUDED.video_score,
                context_score = EXCLUDED.context_score,
                final_score = EXCLUDED.final_score,
                status = EXCLUDED.status,
                updated_at = NOW()
            RETURNING id
        """, (
            video_id,
            bucket,
            key,
            audio_score,
            video_score,
            context_score,
            final_score,
            'completed',
            timestamp or datetime.utcnow().isoformat()
        ))
        
        result_id = cur.fetchone()[0]
        
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'result_id': result_id,
            'video_id': video_id,
            'final_score': final_score,
            'status': 'success'
        }
        
    except Exception as e:
        print(f"Database error: {str(e)}")
        return {
            'statusCode': 500,
            'error': str(e),
            'status': 'error'
        }


def extract_video_id(s3_key):
    """
    S3 키에서 video_id 추출
    uploads/user123/uuid/video.mp4 -> uuid
    """
    parts = s3_key.split('/')
    if len(parts) >= 3:
        return parts[2]  # uuid
    return s3_key.replace('/', '-')
