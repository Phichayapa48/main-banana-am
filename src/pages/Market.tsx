import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  id: string;
  farm_name: string;
  farm_location: string;
  rating: number | null;
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

/* ---------- Component ---------- */
const Market = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<"all" | "fruit" | "shoot">("all");
  const [topFarms, setTopFarms] = useState<FarmProfile[]>([]);


  const translateType = (type: string) => {
    const types: Record<string, string> = {
      fruit: "ผล",
      shoot: "หน่อ",
      "ผล": "ผล",
      "หน่อ": "หน่อ"
    };
    return types[type] || type;
  };

  useEffect(() => {
    loadProducts();
    loadTopFarms();
  }, []);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  const loadProducts = async () => {
    try {
      setLoading(true);
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
            rating
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      setProducts(data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("โหลดสินค้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const loadTopFarms = async () => {
  try {
    const { data, error } = await supabase
      .from("farm_profiles")
      .select("id, farm_name, farm_location, rating")
      .not("rating", "is", null)
      .order("rating", { ascending: false })
      .limit(3);

    if (error) throw error;
    setTopFarms(data ?? []);
  } catch (err) {
    console.error(err);
  }
};


  /* -----------------------------------------------------------
      ✨ จุดที่แก้ไข: กรองสินค้าที่ของหมด (ดักจับทุก Data Type)
      ----------------------------------------------------------- */
  const filteredProducts = products.filter((p) => {
    const keyword = search.toLowerCase();
    const matchName = p.name.toLowerCase().includes(keyword);
    const matchFarm = p.farm?.farm_name.toLowerCase().includes(keyword) ?? false;
    const matchType = typeFilter === "all" || p.product_type === typeFilter;
    
    // บังคับให้เป็น Number ก่อนเช็ค เพื่อป้องกันค่าว่างหรือ String "0" หลุดมา
    // กรองเอาเฉพาะที่มีสต็อกมากกว่า 0 เท่านั้น
    const hasStock = p.available_quantity !== null && Number(p.available_quantity) > 0;

    return (matchName || matchFarm) && matchType && hasStock;
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      <div className="container mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-gray-800">ค้นหาผลผลิตกล้วยจากฟาร์ม</h2>
          <p className="text-muted-foreground">เชื่อมต่อการจองผลผลิตกล้วยกับฟาร์มโดยตรงทั่วประเทศไทย</p>
        </div>

        {/* ⭐ Top 3 Farms */}
{topFarms.length > 0 && (
  <div className="max-w-4xl mx-auto mb-10">
    <h3 className="text-2xl font-bold mb-4 text-gray-800">
      ⭐ ฟาร์มยอดนิยม
    </h3>

    <div className="grid md:grid-cols-3 gap-4">
      {topFarms.map((farm, index) => (
        <Card
          key={index}
          className="p-4 cursor-pointer hover:shadow-lg transition"
          onClick={() => navigate(`/farm/${farm.id}`)}
        >
          <h4 className="font-bold text-lg">{farm.farm_name}</h4>

          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {farm.farm_location}
          </p>

          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="font-bold">
              {farm.rating?.toFixed(1)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            อันดับที่ {index + 1}
          </p>
        </Card>
      ))}
    </div>
  </div>
)}




        {/* Filters */}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
          <div className="text-center py-20 text-muted-foreground">ไม่พบสินค้าที่มีจำหน่ายในขณะนี้</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((p) => (
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

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                    {p.description || "ผลผลิตคุณภาพสดใหม่จากเกษตรกรไทย"}
                  </p>

                  <div className="flex justify-between items-end border-t pt-4">
                    <div>
                      <p className="text-xl font-black text-primary">
                        ฿{p.price_per_unit.toLocaleString()}
                        <span className="text-sm font-medium text-muted-foreground ml-1">/{p.unit}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mt-1">
                        สต็อกคงเหลือ: {p.available_quantity} {p.unit}
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
            ))}
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
