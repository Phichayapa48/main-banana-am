import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Loader2 } from "lucide-react";

interface FarmProfile {
  id: string;
  farm_name: string;
  farm_location: string;
  farm_description: string | null;
  rating: number | null;
  total_reviews: number | null;
  // ✨ เพิ่มไว้รับข้อมูลสถานะออนไลน์
  profiles?: any; 
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

/* ---------- Helper สำหรับคำนวณเวลาออนไลน์ (เหมือนหน้า Market) ---------- */
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

      // ✨ ดึงข้อมูลฟาร์มพร้อมกับ last_seen ของเจ้าของฟาร์ม
      const { data: farmData } = await supabase
        .from("farm_profiles")
        .select(`
          *,
          profiles: user_id (
            last_seen
          )
        `)
        .eq("id", farmId)
        .single();

      setFarm(farmData as any);

      // ✨ ดึงสินค้า และกรองเฉพาะตัวที่มีสต็อก (available_quantity > 0)
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("farm_id", farmId)
        .eq("is_active", true)
        .gt("available_quantity", 0) // ซ่อนสินค้าหมด
        .order("created_at", { ascending: false });

      setProducts(productsData || []);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // ✨ คำนวณสถานะ Online
  const farmProfiles = farm?.profiles;
  const lastSeenVal = Array.isArray(farmProfiles) 
    ? farmProfiles[0]?.last_seen 
    : farmProfiles?.last_seen;

  const isOnline = lastSeenVal && 
    (new Date().getTime() - new Date(lastSeenVal).getTime()) < 300000;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            ย้อนกลับ
          </Button>

          <h1 className="text-xl font-bold">{farm?.farm_name}</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Farm Info */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold">{farm?.farm_name}</h2>
          <p className="text-muted-foreground">{farm?.farm_location}</p>

          {/* ✨ เพิ่มบรรทัดสถานะออนไลน์ใต้โลเคชั่น */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <span className="text-[11px] font-medium text-slate-500">
              {getTimeAgo(lastSeenVal)}
            </span>
          </div>

          {farm?.rating != null && (
            <div 
              className="flex items-center gap-1 text-yellow-500 mt-2 cursor-pointer hover:underline w-fit"
              onClick={() => navigate(`/farm/reviews/${farm.id}`)}
            >
              <Star className="w-4 h-4 fill-current" />
              {farm.rating.toFixed(1)}
              <span className="text-sm text-muted-foreground ml-1">
                ({farm.total_reviews ?? 0} reviews)
              </span>
            </div>
          )}

          {farm?.farm_description && (
            <p className="mt-4 text-sm text-muted-foreground">
              {farm.farm_description}
            </p>
          )}
        </Card>

        {/* Products */}
        <h3 className="text-lg font-semibold mb-4">สินค้าในร้าน</h3>

        {products.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            ฟาร์มนี้ยังไม่มีสินค้าพร้อมจำหน่าย
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:shadow-md transition"
                onClick={() => navigate(`/market/product/${p.id}`)}
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">🍌</span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-lg">{p.name}</h3>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {p.description || "Fresh produce"}
                  </p>

                  <p className="text-xl font-bold text-primary">
                    ฿{p.price_per_unit}/{p.unit}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {p.available_quantity} available
                  </p>
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
