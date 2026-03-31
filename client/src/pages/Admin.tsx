import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Incident } from "@shared/schema";
import { GlitchLogo } from "@/components/GlitchLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  LayoutDashboard,
  Eye,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { categoryInfo, severityInfo, formatDateArabic, formatLossArabic } from "@/lib/utils";
import { IncidentForm } from "@/components/IncidentForm";
import { Link } from "wouter";

export default function Admin() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ incidents: Incident[]; total: number }>({
    queryKey: ["/api/admin/incidents", category, status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      params.set("limit", "100");
      const res = await apiRequest("GET", `/api/admin/incidents?${params}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/incidents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "تم الحذف", description: "تم حذف الحادثة بنجاح" });
    },
  });

  const incidents = data?.incidents || [];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Admin Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GlitchLogo size="small" />
            <div>
              <h1 className="font-mono font-bold text-sm">لوحة التحكم</h1>
              <p className="text-xs text-muted-foreground font-mono">Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-view-site">
                <Eye className="h-3.5 w-3.5" />
                عرض الموقع
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground mb-1">إجمالي الحوادث</div>
            <div className="font-mono text-xl font-bold" data-testid="text-admin-total">{data?.total || 0}</div>
          </Card>
          {Object.entries(categoryInfo).map(([key, info]) => (
            <Card key={key} className="p-4">
              <div className="text-xs text-muted-foreground mb-1">{info.emoji} {info.labelAr}</div>
              <div className="font-mono text-xl font-bold">
                {incidents.filter(i => i.category === key).length}
              </div>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" data-testid="button-create-incident">
                <Plus className="h-4 w-4" />
                إضافة حادثة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle className="font-arabic">إضافة حادثة جديدة</DialogTitle>
              </DialogHeader>
              <IncidentForm
                onSuccess={() => {
                  setShowCreateDialog(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/admin/incidents"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
                }}
              />
            </DialogContent>
          </Dialog>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-filter-category">
              <SelectValue placeholder="الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفئات</SelectItem>
              <SelectItem value="ai">🤖 ذكاء اصطناعي</SelectItem>
              <SelectItem value="crypto">💰 عملات مشفرة</SelectItem>
              <SelectItem value="iot">📡 إنترنت الأشياء</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-filter-status">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="published">منشور</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="archived">أرشيف</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="h-8 text-xs pr-9 font-mono"
              data-testid="input-admin-search"
            />
          </div>
        </div>

        {/* Incidents Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">العنوان</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">الفئة</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground w-24">الخطورة</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground w-28">الخسارة</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground w-28">التاريخ</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground w-20">الحالة</th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground w-20">المصدر</th>
                <th className="text-center p-3 text-xs font-medium text-muted-foreground w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              )}
              {!isLoading && incidents.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">
                    لا توجد حوادث
                  </td>
                </tr>
              )}
              {incidents.map((incident) => {
                const cat = categoryInfo[incident.category];
                const sev = severityInfo[incident.severity];
                return (
                  <tr key={incident.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors" data-testid={`row-incident-${incident.id}`}>
                    <td className="p-3">
                      <div className="font-medium text-xs leading-relaxed line-clamp-2">{incident.titleAr}</div>
                    </td>
                    <td className="p-3">
                      <span className={`${cat?.colorClass} text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap`}>
                        {cat?.emoji} {cat?.labelAr}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs ${sev?.colorClass}`}>{sev?.emoji} {sev?.labelAr}</span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {incident.lossAmount ? (
                        <span className="text-red-500">{formatLossArabic(incident.lossAmount)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {formatDateArabic(incident.date)}
                    </td>
                    <td className="p-3">
                      <Badge variant={incident.status === "published" ? "default" : "secondary"} className="text-[10px]">
                        {incident.status === "published" ? "منشور" : incident.status === "draft" ? "مسودة" : "أرشيف"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">
                        {incident.sourceType === "auto" ? "تلقائي" : "يدوي"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingIncident(incident)}
                              data-testid={`button-edit-${incident.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
                            <DialogHeader>
                              <DialogTitle className="font-arabic">تعديل الحادثة</DialogTitle>
                            </DialogHeader>
                            {editingIncident && (
                              <IncidentForm
                                incident={editingIncident}
                                onSuccess={() => {
                                  setEditingIncident(null);
                                  queryClient.invalidateQueries({ queryKey: ["/api/admin/incidents"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
                                }}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("هل أنت متأكد من حذف هذه الحادثة؟")) {
                              deleteMutation.mutate(incident.id);
                            }
                          }}
                          data-testid={`button-delete-${incident.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
