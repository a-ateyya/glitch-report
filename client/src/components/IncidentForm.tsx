import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Incident } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface IncidentFormProps {
  incident?: Incident;
  onSuccess: () => void;
}

export function IncidentForm({ incident, onSuccess }: IncidentFormProps) {
  const isEditing = !!incident;
  const { toast } = useToast();

  const [titleAr, setTitleAr] = useState(incident?.titleAr || "");
  const [titleEn, setTitleEn] = useState(incident?.titleEn || "");
  const [descriptionAr, setDescriptionAr] = useState(incident?.descriptionAr || "");
  const [descriptionEn, setDescriptionEn] = useState(incident?.descriptionEn || "");
  const [category, setCategory] = useState(incident?.category || "ai");
  const [severity, setSeverity] = useState(incident?.severity || "medium");
  const [lossAmount, setLossAmount] = useState(incident?.lossAmount?.toString() || "");
  const [date, setDate] = useState(incident?.date?.split("T")[0] || new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState(incident?.status || "published");
  const [isStarred, setIsStarred] = useState(incident?.isStarred === 1);
  const [imageUrl, setImageUrl] = useState(incident?.imageUrl || "");

  let initSources: Array<{ title: string; url: string }> = [];
  try {
    initSources = JSON.parse(incident?.sourcesJson || "[]");
  } catch {}
  const [sources, setSources] = useState<Array<{ title: string; url: string }>>(
    initSources.length > 0 ? initSources : [{ title: "", url: "" }]
  );

  let initTags: string[] = [];
  try {
    initTags = JSON.parse(incident?.tagsJson || "[]");
  } catch {}
  const [tagsStr, setTagsStr] = useState(initTags.join(", "));

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        await apiRequest("PATCH", `/api/admin/incidents/${incident!.id}`, data);
      } else {
        await apiRequest("POST", "/api/admin/incidents", data);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "تم التعديل" : "تمت الإضافة",
        description: isEditing ? "تم تعديل الحادثة بنجاح" : "تمت إضافة الحادثة بنجاح",
      });
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validSources = sources.filter((s) => s.title && s.url);
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    mutation.mutate({
      titleAr,
      titleEn: titleEn || null,
      descriptionAr,
      descriptionEn: descriptionEn || null,
      category,
      severity,
      lossAmount: lossAmount ? parseInt(lossAmount) : null,
      date: new Date(date).toISOString(),
      sourcesJson: JSON.stringify(validSources),
      tagsJson: JSON.stringify(tags),
      imageUrl: imageUrl || null,
      status,
      isStarred: isStarred ? 1 : 0,
      sourceType: "manual",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Arabic Title */}
      <div>
        <Label className="text-xs font-medium">العنوان (عربي) *</Label>
        <Input
          value={titleAr}
          onChange={(e) => setTitleAr(e.target.value)}
          placeholder="عنوان الحادثة بالعربية"
          required
          className="mt-1 text-sm font-arabic"
          dir="rtl"
          data-testid="input-title-ar"
        />
      </div>

      {/* English Title */}
      <div>
        <Label className="text-xs font-medium">العنوان (إنجليزي)</Label>
        <Input
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          placeholder="English title (optional)"
          className="mt-1 text-sm font-mono"
          dir="ltr"
          data-testid="input-title-en"
        />
      </div>

      {/* Arabic Description */}
      <div>
        <Label className="text-xs font-medium">الوصف (عربي) *</Label>
        <Textarea
          value={descriptionAr}
          onChange={(e) => setDescriptionAr(e.target.value)}
          placeholder="وصف تفصيلي للحادثة..."
          required
          rows={5}
          className="mt-1 text-sm font-arabic"
          dir="rtl"
          data-testid="input-description-ar"
        />
      </div>

      {/* English Description */}
      <div>
        <Label className="text-xs font-medium">الوصف (إنجليزي)</Label>
        <Textarea
          value={descriptionEn}
          onChange={(e) => setDescriptionEn(e.target.value)}
          placeholder="English description (optional)"
          rows={3}
          className="mt-1 text-sm font-mono"
          dir="ltr"
          data-testid="input-description-en"
        />
      </div>

      {/* Row: Category + Severity + Status */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-medium">الفئة *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1 text-sm" data-testid="select-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai">🤖 ذكاء اصطناعي</SelectItem>
              <SelectItem value="crypto">💰 عملات مشفرة</SelectItem>
              <SelectItem value="iot">📡 إنترنت الأشياء</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium">الخطورة *</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="mt-1 text-sm" data-testid="select-severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 منخفض</SelectItem>
              <SelectItem value="medium">🟡 متوسط</SelectItem>
              <SelectItem value="high">🟠 مرتفع</SelectItem>
              <SelectItem value="critical">🔴 حرج</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium">الحالة *</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-1 text-sm" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published">منشور</SelectItem>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="archived">أرشيف</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row: Loss + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">مبلغ الخسارة (دولار)</Label>
          <Input
            type="number"
            value={lossAmount}
            onChange={(e) => setLossAmount(e.target.value)}
            placeholder="0"
            className="mt-1 text-sm font-mono"
            dir="ltr"
            data-testid="input-loss"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">التاريخ *</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 text-sm font-mono"
            dir="ltr"
            data-testid="input-date"
          />
        </div>
      </div>

      {/* Sources */}
      <div>
        <Label className="text-xs font-medium">المصادر</Label>
        <div className="space-y-2 mt-1">
          {sources.map((source, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={source.title}
                onChange={(e) => {
                  const updated = [...sources];
                  updated[i].title = e.target.value;
                  setSources(updated);
                }}
                placeholder="اسم المصدر"
                className="text-xs flex-1"
                data-testid={`input-source-title-${i}`}
              />
              <Input
                value={source.url}
                onChange={(e) => {
                  const updated = [...sources];
                  updated[i].url = e.target.value;
                  setSources(updated);
                }}
                placeholder="https://..."
                className="text-xs flex-1 font-mono"
                dir="ltr"
                data-testid={`input-source-url-${i}`}
              />
              {sources.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => setSources(sources.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            onClick={() => setSources([...sources, { title: "", url: "" }])}
            data-testid="button-add-source"
          >
            <Plus className="h-3 w-3" />
            إضافة مصدر
          </Button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <Label className="text-xs font-medium">الوسوم (مفصولة بفاصلة)</Label>
        <Input
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="اختراق, ثغرة, خسارة"
          className="mt-1 text-sm"
          data-testid="input-tags"
        />
      </div>

      {/* Image URL */}
      <div>
        <Label className="text-xs font-medium">رابط الصورة</Label>
        <Input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 text-sm font-mono"
          dir="ltr"
          data-testid="input-image-url"
        />
      </div>

      {/* Starred */}
      <div className="flex items-center gap-2">
        <Switch
          checked={isStarred}
          onCheckedChange={setIsStarred}
          data-testid="switch-starred"
        />
        <Label className="text-xs">مميز</Label>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full"
        disabled={mutation.isPending}
        data-testid="button-submit-incident"
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin ml-2" />
        ) : null}
        {isEditing ? "تحديث الحادثة" : "إضافة الحادثة"}
      </Button>
    </form>
  );
}
