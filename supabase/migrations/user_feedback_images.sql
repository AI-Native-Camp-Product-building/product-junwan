-- user_feedback 테이블에 image_urls 컬럼 추가
ALTER TABLE user_feedback ADD COLUMN image_urls text[] DEFAULT '{}';

-- Supabase Storage: feedback-images 버킷 생성 (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-images', 'feedback-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 정책
-- service_role: 업로드(insert) 허용
CREATE POLICY "service_role_insert_feedback_images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'feedback-images');

-- service_role: 삭제(delete) 허용
CREATE POLICY "service_role_delete_feedback_images"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'feedback-images');

-- public: 읽기(select) 허용
CREATE POLICY "public_read_feedback_images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-images');
