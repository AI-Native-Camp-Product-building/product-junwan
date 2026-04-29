import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function InsightsPage() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
      <div>
        <Badge
          variant="outline"
          className="mb-3 border-white/[0.08] text-muted-foreground"
        >
          글로벌 분석
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight">시사점</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          HTML 보고서의 시사점 영역은 별도 페이지로 분리했습니다.
        </p>
      </div>

      <Card className="border-white/[0.08] bg-white/[0.03] backdrop-blur-[12px]">
        <CardHeader>
          <CardTitle>AI 분석 시사점</CardTitle>
          <CardDescription>
            현재 단계에서는 라우트와 페이지 구조만 준비합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-white/[0.08] px-4 text-center text-sm text-muted-foreground">
            아직 구현되지 않은 영역입니다. 추후 현재 필터와 RAW 데이터를 기반으로
            AI 액션 아이템을 생성하도록 연결할 수 있습니다.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
