import type { UserFeedback } from "@/types/feedback";
import { FEEDBACK_CATEGORIES } from "@/types/feedback";

function getCategoryEmoji(category: string): string {
  return FEEDBACK_CATEGORIES.find((c) => c.value === category)?.emoji ?? "💬";
}

function getCategoryLabel(category: string): string {
  return FEEDBACK_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

/** Format a single feedback item as markdown for Notion paste. */
export function feedbackToMarkdown(fb: UserFeedback): string {
  const lines = [
    `### ${getCategoryEmoji(fb.category)} ${getCategoryLabel(fb.category)} | ${formatDate(fb.created_at)}`,
    `- **유저:** ${fb.user_email}`,
  ];

  if (fb.page_url) {
    lines.push(`- **페이지:** ${fb.page_url}`);
  }

  lines.push(`- **내용:** ${fb.message}`);
  lines.push(`- **상태:** ${fb.status}`);

  if (fb.admin_memo) {
    lines.push(`- **메모:** ${fb.admin_memo}`);
  }

  return lines.join("\n");
}

/** Format multiple feedback items as markdown, separated by ---. */
export function feedbackListToMarkdown(items: UserFeedback[]): string {
  return items.map(feedbackToMarkdown).join("\n\n---\n\n");
}

/** Copy text to clipboard with execCommand fallback. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  // execCommand fallback
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
