import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Loader2, MapPin } from "lucide-react";

/* ---------- Types ---------- */
interface FarmProfile {
  id: string;
  farm_name: string;
  farm_location: string;
  farm_description: string | null;
  rating: number | null;
  total_reviews: number | null;
  profiles?: {
    last_seen: string | null;
  };
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_per_unit: number;
  available_quantity: number;
  unit: string;
  product_type: string;
  harvest_date: string;
  image_url: string | null;
}

/* ---------- Helper Function ---------- */
const getTimeAgo = (dateString: string | null | undefined) => {
  if (!dateString) return "ไม่ระบุสถานะ";
  const now = new Date();
  const lastSeen = new Date(dateString);
  
  if (isNaN(lastSeen.getTime())) return "ไม่ระบุสถานะ";

  const diffInMs = now.getTime() - lastSeen.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInMinutes < 5) return "ออนไลน์ตอนนี้";
  if (diffInMinutes < 60) return `ออนไลน์เมื่อ ${diffInMinutes} นาทีที่แล้ว`;
  if (diffInHours < 24) return `ออนไลน์เมื่อ ${diffInHours} ชม. ที่แล้ว`;
  return `ออนไลน์เมื่อ ${Math.floor(diffInHours / 24)} วันที่แล้ว`;
};

const FarmPublic = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();

  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmId) loadFarm();
  }, [farmId]);

  const loadFarm = async () => {
    try {
      setLoading(true);

      // ✨ แก้ไข Query: ดึงข้อมูล profiles (last_seen) ผ่าน user_id ของฟาร์ม
      const { data: farmData, error: farmError } = await supabase
        .from("farm_profiles")
        .select(`
          *,
          profiles: user_id (
            last_seen
          )
        `)
        .eq("id", farmId)
        .single();

      if (farmError) throw farmError;
      setFarm(farmData as any);

      // farm products - ดึงเฉพาะสินค้าที่มีสต็อกและ Active
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("farm_id", farmId)
        .eq("is_active", true)
        .gt("available_quantity", 0) // ✨ ซ่อนสินค้าหมดตาม Logic หน้า Market
        .order("created_at", { ascending: false });

      setProducts(productsData || []);
    } catch (err) {
      console.error("Load Farm Error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ✨ คำนวณสถานะ Online (5 นาที)
  const lastSeenVal = Array.isArray(farm?.profiles) 
    ? farm?.profiles[0]?.last_seen 
    : farm?.profiles?.last_seen;

  const isOnline = lastSeenVal && 
    (new Date().getTime() - new Date(lastSeenVal).getTime()) < 300000;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <nav className="border-b bg-background sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            ย้อนกลับ
          </Button>
          <h1 className="text-xl font-bold truncate">{farm?.farm_name}</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Farm Info Card */}
        <Card className="p-8 mb-8 border-none shadow-sm rounded-3xl bg-white">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex-1">
              <h2 className="text-3xl font-black text-gray-800 mb-2">{farm?.farm_name}</h2>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm">{farm?.farm_location}</span>
              </div>

              {/* ✨ แสดงสถานะออนไลน์เหมือนหน้า Market */}
              <div className="flex items-center gap-2 mb-4 bg-slate-50 w-fit px-3 py-1.5 rounded-full border border-slate-100">
                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                <span className="text-xs font-bold text-slate-600">
                  {getTimeAgo(lastSeenVal)}
                </span>
              </div>
            </div>

            {farm?.rating != null && (
              <div 
                className="bg-yellow-50 p-4 rounded-2xl flex flex-col items-center border border-yellow-100 cursor-pointer hover:bg-yellow-100 transition"
                onClick={() => navigate(`/farm/reviews/${farm.id}`)}
              >
                <div className="flex items-center gap-1 text-yellow-600 mb-1">
                  <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                  <span className="text-xl font-black">{farm.rating.toFixed(1)}</span>
                </div>
                <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">
                  {farm.total_reviews ?? 0} รีวิว
                </span>
              </div>
            )}
          </div>

          {farm?.farm_description && (
            <div className="mt-6 pt-6 border-t border-dashed">
              <p className="text-sm text-slate-600 leading-relaxed">
                {farm.farm_description}
              </p>
            </div>
          )}
        </Card>

        {/* Products Section */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">สินค้าในร้าน</h3>
          <span className="text-xs font-bold text-muted-foreground bg-white px-3 py-1 rounded-full shadow-sm">
            {products.length} รายการ
          </span>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed">
            <span className="text-5xl mb-4 block">📦</span>
            <p className="text-muted-foreground font-medium">ฟาร์มนี้ยังไม่มีสินค้าพร้อมจำหน่ายในขณะนี้</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <Card
                key={p.id}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-none rounded-2xl overflow-hidden bg-white"
                onClick={() => navigate(`/market/product/${p.id}`)}
              >
                <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <span className="text-5xl">🍌</span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-800 mb-1 group-hover:text-primary transition-colors">{p.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">
                    {p.description || "ผลผลิตสดใหม่จากฟาร์ม"}
                  </p>

                  <div className="flex justify-between items-end border-t pt-4">
                    <div>
                      <p className="text-xl font-black text-primary">
                        ฿{p.price_per_unit.toLocaleString()}
                        <span className="text-sm font-medium text-muted-foreground ml-1">/{p.unit}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">
                        สต็อก: {p.available_quantity} {p.unit}
                      </p>
                    </div>
                    <Button size="sm" className="rounded-xl font-bold shadow-sm">
                      ดูรายละเอียด
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmPublic;
