import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Star, MapPin, X } from "lucide-react"; 
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ---------- Types ---------- */
interface FarmProfile {
  farm_name: string;
  farm_location: string;
  rating: number | null;
  profiles?: any; 
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  product_type: string; 
  price_per_unit: number;
  available_quantity: number;
  unit: string;
  harvest_date: string;
  image_url: string | null;
  farm_id: string;
  farm: FarmProfile | null;
}

/* ---------- Helper Function ---------- */
const getTimeAgo = (dateString: string | null | undefined) => {
  if (!dateString) return "ไม่ระบุสถานะ";
  const now = new Date();
  const lastSeen = new Date(dateString);
  
  // ตรวจสอบว่าเป็น Invalid Date หรือไม่
  if (isNaN(lastSeen.getTime())) return "ไม่ระบุสถานะ";

  const diffInMs = now.getTime() - lastSeen.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInMinutes < 5) return "ออนไลน์ตอนนี้";
  if (diffInMinutes < 60) return `ออนไลน์เมื่อ ${diffInMinutes} นาทีที่แล้ว`;
  if (diffInHours < 24) return `ออนไลน์เมื่อ ${diffInHours} ชม. ที่แล้ว`;
  return `ออนไลน์เมื่อ ${Math.floor(diffInHours / 24)} วันที่แล้ว`;
};

/* ---------- Component ---------- */
const Market = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<"all" | "fruit" | "shoot">("all");

  const translateType = (type: string) => {
    const types: Record<string, string> = {
      fruit: "ผล",
      shoot: "หน่อ",
    };
    return types[type] || type;
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // ✨ ใช้ user_id เชื่อมไปยัง profiles เพื่อดู last_seen (1 เมล 2 Role)
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          product_type,
          price_per_unit,
          available_quantity,
          unit,
          harvest_date,
          image_url,
          farm_id,
          farm: farm_profiles (
            farm_name,
            farm_location,
            rating,
            profiles: user_id (
              last_seen
            )
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      setProducts(data as any ?? []);
    } catch (err) {
      console.error("Load Fail, trying Fallback:", err);
      const { data: fallbackData } = await supabase
        .from("products")
        .select(`
          *,
          farm: farm_profiles (
            farm_name,
            farm_location,
            rating
          )
        `)
        .eq("is_active", true);
      
      if (fallbackData) setProducts(fallbackData as any);
      toast.error("แสดงสินค้าแบบออฟไลน์ (ดึงข้อมูลออนไลน์ไม่ได้)");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const keyword = search.toLowerCase();
    const matchName = p.name?.toLowerCase().includes(keyword);
    const matchFarm = p.farm?.farm_name?.toLowerCase().includes(keyword) ?? false;
    const matchType = typeFilter === "all" || p.product_type === typeFilter;
    return (matchName || matchFarm) && matchType;
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="container mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-gray-800">ค้นหาผลผลิตกล้วยจากฟาร์ม</h2>
          <p className="text-muted-foreground">เชื่อมต่อการจองผลผลิตกล้วยกับฟาร์มโดยตรงทั่วประเทศไทย</p>
        </div>

        <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสินค้าหรือฟาร์ม..."
              value={search}
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 pr-10 h-12 bg-white rounded-xl shadow-sm"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v: "all" | "fruit" | "shoot") => setTypeFilter(v)}
          >
            <SelectTrigger className="w-full sm:w-[160px] h-12 bg-white rounded-xl shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="fruit">ผล</SelectItem>
              <SelectItem value="shoot">หน่อ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground">กำลังโหลดสินค้า...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">ไม่พบสินค้าที่คุณต้องการ</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p) => {
              // ✨ แก้ไข Logic การดึงค่า last_seen ให้แม่นยำขึ้น
              const farmProfiles = p.farm?.profiles;
              const lastSeenVal = Array.isArray(farmProfiles) 
                ? farmProfiles[0]?.last_seen 
                : farmProfiles?.last_seen;

              const isOnline = lastSeenVal && 
                (new Date().getTime() - new Date(lastSeenVal).getTime()) < 300000;

              return (
                <Card
                  key={p.id}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-none rounded-2xl overflow-hidden bg-white"
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
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{p.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          <span
                            className="hover:underline hover:text-primary cursor-pointer transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/farm/${p.farm_id}`);
                            }}
                          >
                            {p.farm?.farm_name ?? "ไม่ระบุชื่อฟาร์ม"}
                          </span>
                        </div>
                      </div>

                      {p.farm?.rating != null && (
                        <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
                          <Star className="w-3.5 h-3.5 text-yellow-600 fill-yellow-600" />
                          <span className="text-xs font-bold text-yellow-700">
                            {p.farm.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2 h-10">
                      {p.description || "ผลผลิตคุณภาพสดใหม่จากเกษตรกรไทย"}
                    </p>

                    {/* ✨ สถานะออนไลน์ */}
                    <div className="flex items-center gap-1.5 mb-4">
                      <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                      <span className="text-[11px] font-medium text-slate-500">
                        {getTimeAgo(lastSeenVal)}
                      </span>
                    </div>

                    <div className="flex justify-between items-end border-t pt-4">
                      <div>
                        <p className="text-xl font-black text-primary">
                          ฿{p.price_per_unit.toLocaleString()}
                          <span className="text-sm font-medium text-muted-foreground ml-1">/{p.unit}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mt-1">
                          สต็อก: {p.available_quantity} {p.unit}
                        </p>
                      </div>
                      <span className="text-xs px-3 py-1 rounded-full bg-slate-100 font-bold text-slate-600">
                        {translateType(p.product_type)}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 mt-3 font-medium">
                      วันที่เก็บเกี่ยว: {new Date(p.harvest_date).toLocaleDateString('th-TH')}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
        <p>© 2026 Banana Expert Thailand. Supporting local farmers.</p>
      </footer>
    </div>
  );
};

export default Market;
