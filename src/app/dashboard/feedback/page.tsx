"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { isAdmin } from "@/lib/admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackHistory } from "@/components/feedback/feedback-history";
import { FeedbackAdminTable } from "@/components/feedback/feedback-admin-table";
import { FeedbackDetailPanel } from "@/components/feedback/feedback-detail-panel";
import type { UserFeedback, FeedbackStatus } from "@/types/feedback";

export default function FeedbackPage() {
  const { data: session } = useSession();
  const admin = isAdmin(session?.user?.email);
  const [items, setItems] = React.useState<UserFeedback[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedItem, setSelectedItem] = React.useState<UserFeedback | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const fetchFeedback = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const res = await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((fb) => (fb.id === id ? updated : fb)));
      if (selectedItem?.id === id) setSelectedItem(updated);
    }
  };

  const handleMemoSave = async (id: string, adminMemo: string) => {
    const res = await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, adminMemo }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((fb) => (fb.id === id ? updated : fb)));
      setSelectedItem(updated);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((fb) => fb.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
        setDetailOpen(false);
      }
    }
  };

  const handleSelectItem = (item: UserFeedback) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  if (admin) {
    return (
      <div className="flex flex-1 flex-col gap-6 py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <h1 className="text-xl font-semibold">피드백 관리</h1>
        </div>
        <div className="px-4 lg:px-6">
          <Tabs defaultValue="manage">
            <TabsList>
              <TabsTrigger value="manage">관리</TabsTrigger>
              <TabsTrigger value="submit">제출</TabsTrigger>
            </TabsList>
            <TabsContent value="manage" className="mt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground py-4">불러오는 중...</p>
              ) : (
                <FeedbackAdminTable
                  items={items}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onSelect={handleSelectItem}
                />
              )}
            </TabsContent>
            <TabsContent value="submit" className="mt-4">
              <Card className="max-w-lg">
                <CardHeader>
                  <CardTitle>피드백 제출</CardTitle>
                </CardHeader>
                <CardContent>
                  <FeedbackForm onSuccess={fetchFeedback} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <FeedbackDetailPanel
          item={selectedItem}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onStatusChange={handleStatusChange}
          onMemoSave={handleMemoSave}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <h1 className="text-xl font-semibold">피드백</h1>
      </div>
      <div className="flex flex-col gap-6 px-4 lg:px-6 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>피드백 제출</CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackForm onSuccess={fetchFeedback} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>내 피드백</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">불러오는 중...</p>
            ) : (
              <FeedbackHistory items={items} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
