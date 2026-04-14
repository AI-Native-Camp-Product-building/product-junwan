export type FeedbackCategory = "bug" | "feature" | "data_error" | "other";
export type FeedbackStatus = "open" | "resolved" | "dismissed";

export interface UserFeedback {
  id: string;
  user_email: string;
  user_name: string | null;
  category: FeedbackCategory;
  message: string;
  page_url: string | null;
  status: FeedbackStatus;
  admin_memo: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
}

export const FEEDBACK_CATEGORIES: {
  value: FeedbackCategory;
  label: string;
  emoji: string;
}[] = [
  { value: "bug", label: "버그", emoji: "🐛" },
  { value: "feature", label: "기능요청", emoji: "💡" },
  { value: "data_error", label: "데이터오류", emoji: "📊" },
  { value: "other", label: "기타", emoji: "💬" },
];

export const FEEDBACK_STATUSES: {
  value: FeedbackStatus;
  label: string;
}[] = [
  { value: "open", label: "접수" },
  { value: "resolved", label: "해결" },
  { value: "dismissed", label: "보류" },
];
