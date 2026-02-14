import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

type ProductType = "fruit" | "shoot";

const AddProduct = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [farmId, setFarmId] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    product_type: "fruit" as ProductType,
    price_per_unit: "",
    available_quantity: "",
    unit: "kg",
    harvest_date: "",
    expiry_date: "",
  });

  /* ================= LOAD FARM ================= */

  useEffect(() => {
    const loadFarm = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth/login", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("farm_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (error || !data) {
        toast.error("คุณยังไม่มีฟาร์ม");
        navigate("/dashboard", { replace: true });
        return;
      }

      setFarmId(data.id);
      setLoading(false);
    };

    loadFarm();
  }, [navigate]);

  /* ================= UPLOAD IMAGES ================= */

  const uploadImages = async (productId: string) => {
    if (!farmId || files.length === 0) return [];

    const results: { path: string; url: string }[] = [];

    for (const file of files) {
      const path = `${farmId}/${productId}/${crypto.randomUUID()}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      results.push({
        path,
        url: data.publicUrl,
      });
    }

    return results;
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!farmId) {
      toast.error("ไม่พบ farm profile");
      return;
    }

    // ✨ เช็คชื่อสินค้าซ้ำอีกรอบในโค้ดเพื่อความปลอดภัย
    const isNumericOnly = /^[0-9]+$/.test(form.name.trim());
    if (isNumericOnly) {
      toast.error("กรุณาระบุชื่อสินค้าให้ถูกต้อง เช่น กล้วยนาก");
      return;
    }

    try {
  setSubmitting(true);

  /* ---------- 1. เตรียม product id ล่วงหน้า ---------- */
  const tempProductId = crypto.randomUUID();

  /* ---------- 2. Upload รูปก่อน ---------- */
  const uploaded: { path: string; url: string }[] = [];

  if (files.length > 0 && farmId) {
    for (const file of files) {
      const path = `${farmId}/${tempProductId}/${crypto.randomUUID()}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      uploaded.push({
        path,
        url: data.publicUrl,
      });
    }
  }

  /* ---------- 3. เรียก RPC สร้างสินค้า ---------- */

  const { data: productId, error } = await supabase.rpc(
    "create_product_secure",
    {
      p_name: form.name,
      p_description: form.description || null,
      p_product_type: form.product_type,
      p_price: Number(form.price_per_unit),
      p_quantity: Number(form.available_quantity),
      p_unit: form.unit,
      p_harvest_date: form.harvest_date,
      p_expiry_date: form.expiry_date || null,
      p_image_url: uploaded[0]?.url || null,
    }
  );

  if (error || !productId) throw error;

  /* ---------- 4. บันทึก product_images ---------- */

  if (uploaded.length > 0) {
    await supabase.from("product_images").insert(
      uploaded.map((img) => ({
        product_id: productId,
        image_path: img.path,
      }))
    );
  }

  toast.success("เพิ่มสินค้าเรียบร้อย");
  navigate("/farm/products", { replace: true });

} catch (err: any) {
  console.error(err);
  toast.error(err.message || "เกิดข้อผิดพลาด");
} finally {
  setSubmitting(false);
}

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  }
  /* ================= UI ================= */

  return (
    <div className="container mx-auto max-w-xl py-10 px-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="w-fit mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        ย้อนกลับ
      </Button>

      <Card className="p-6 space-y-6">
        <h1 className="text-xl font-bold">เพิ่มสินค้า</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* --- ชื่อสินค้า --- */}
          <div>
            <Label>ชื่อสินค้า</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                e.target.setCustomValidity("");
                setForm({ ...form, name: e.target.value });
              }}
              placeholder=""
              required
              pattern="^(?!\d+$).+"
              onInvalid={(e) => {
                (e.target as HTMLInputElement).setCustomValidity("กรุณาระบุชื่อสินค้าให้ถูกต้อง เช่น กล้วยนาก");
              }}
            />
          </div>

          <div>
            <Label>รายละเอียด</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div>
            <Label>ประเภท</Label>
            <Select
              value={form.product_type}
              onValueChange={(v: ProductType) =>
                setForm({ ...form, product_type: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fruit">ผล</SelectItem>
                <SelectItem value="shoot">หน่อ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* --- ราคา --- */}
            <div>
              <Label>ราคา</Label>
              <Input
                type="number"
                value={form.price_per_unit}
                onChange={(e) => {
                  e.target.setCustomValidity("");
                  setForm({ ...form, price_per_unit: e.target.value });
                }}
                onInvalid={(e) => {
                  (e.target as HTMLInputElement).setCustomValidity("กรุณาระบุราคาเป็นตัวเลขนะคะ");
                }}
                required
              />
            </div>
            {/* --- จำนวน --- */}
            <div>
              <Label>จำนวน</Label>
              <Input
                type="number"
                value={form.available_quantity}
                onChange={(e) => {
                  e.target.setCustomValidity("");
                  setForm({ ...form, available_quantity: e.target.value });
                }}
                onInvalid={(e) => {
                  (e.target as HTMLInputElement).setCustomValidity("กรุณาระบุจำนวนเป็นตัวเลขนะคะ");
                }}
                required
              />
            </div>
          </div>

          <div>
            <Label>หน่วย (เช่น kg, ชิ้น, หวี) </Label>
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>วันเก็บเกี่ยว</Label>
              <Input
                type="date"
                value={form.harvest_date}
                onChange={(e) =>
                  setForm({ ...form, harvest_date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label>วันที่จัดส่ง (ถ้ามี)</Label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) =>
                  setForm({ ...form, expiry_date: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label>รูปสินค้า</Label>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (!e.target.files) return;
                setFiles(Array.from(e.target.files));
              }}
            />

            <div className="flex gap-2 flex-wrap mt-2">
              {files.map((file, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(file)}
                  className="w-24 h-24 object-cover rounded border"
                  alt="preview"
                />
              ))}
            </div>
          </div>

          <Button disabled={submitting} type="submit" className="w-full">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "เพิ่มสินค้า"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AddProduct;