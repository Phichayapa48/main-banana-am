import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  User,
  LogOut,
  ArrowLeft,
  Store,
} from "lucide-react";
import { toast } from "sonner";

/* ---------- Types ---------- */

interface Order {
  id: string;
  status: string;
  created_at: string;
  products: {
    name: string;
    farm_profiles: {
      farm_name: string;
    } | null;
  } | null;
}

type Role = "user" | "farm";

/* ---------- Component ---------- */

const Dashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>("user");
  const [profile, setProfile] = useState<{
    full_name: string;
    phone: string;
    address: string;
  } | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        navigate("/auth/login");
        return;
      }

      setUser(data.user);

      const roles = await fetchUserRoles(data.user.id);
      setRole(roles.includes("farm") ? "farm" : "user");

      await Promise.all([
        fetchOrders(data.user.id),
        loadProfile(data.user.id),
      ]);
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async (userId: string): Promise<Role[]> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    return data?.map((r) => r.role as Role) || [];
  };

  const fetchOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        created_at,
        products (
          name,
          farm_profiles (
            farm_name
          )
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    setOrders(data || []);
  };

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, address")
      .eq("id", userId)
      .single();

    setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleUpgradeToFarm = async () => {
  try {
    const { error } = await supabase.rpc("upgrade_to_farm");

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("อัปเกรดเป็นบัญชีฟาร์มเรียบร้อย");
    navigate("/farm/dashboard");

  } catch {
    toast.error("การอัปเกรดล้มเหลว");
  }
};

  /* ✨ จุดที่แก้ไข: เปลี่ยนข้อความสถานะเป็นภาษาไทย */
  const statusLabels: Record<string, string> = {
    pending: "รอการยืนยัน",
    confirmed: "รับออเดอร์แล้ว",
    shipped: "กำลังจัดส่ง",
    delivered: "จัดส่งแล้ว",
    cancelled: "ยกเลิกแล้ว",
  };

  const statusStyle: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      {/* NAVBAR */}
      <nav className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">หน้าหลัก</h1>
          </div>

          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            ออกจากระบบ
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
        {/* USER INFO */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold">{profile?.full_name || "ผู้ใช้งาน"}</h2>
          <p className="text-muted-foreground">{user.email}</p>
          <div className="mt-4 text-sm space-y-1">
            <p>📞 {profile?.phone || "-"}</p>
            <p>📍 {profile?.address || "-"}</p>
          </div>
        </Card>

        {/* ACTION CARDS */}
        <div className="grid md:grid-cols-3 gap-6">
          <ActionCard
            icon={<User />}
            title="โปรไฟล์"
            subtitle="จัดการข้อมูลส่วนตัว"
            onClick={() => navigate("/profile")}
          />

          <ActionCard
            icon={<ShoppingBag />}
            title="ออเดอร์"
            subtitle={`${orders.length} ออเดอร์`}
            onClick={() => navigate("/dashboard/orders")}
          />

          {role === "farm" ? (
            <ActionCard
              icon={<Store />}
              title="ฟาร์มของฉัน"
              subtitle="จัดการข้อมูลฟาร์ม"
              highlight
              onClick={() => navigate("/farm/dashboard")}
            />
          ) : (
            <ActionCard
              icon={<Store />}
              title="เปิดร้านค้า"
              subtitle="อัปเกรดเพื่อเริ่มขายสินค้า"
              highlight
              onClick={handleUpgradeToFarm}
            />
          )}
        </div>

        {/* RECENT ORDERS */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">รายการสั่งจองล่าสุด</h3>

          {orders.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">ยังไม่มีรายการสั่งซื้อ</p>
              <Button onClick={() => navigate("/market")}>
                ไปดูตลาดซื้อขาย
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="flex justify-between items-center p-3 rounded hover:bg-muted transition"
                >
                  <div>
                    <p className="font-medium">
                      {o.products?.name || "สินค้า"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ฟาร์ม: {o.products?.farm_profiles?.farm_name || "-"}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-1 text-xs rounded ${statusStyle[o.status]}`}
                  >
                    {statusLabels[o.status] || o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

/* ---------- UI Component ---------- */

const ActionCard = ({
  icon,
  title,
  subtitle,
  onClick,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  highlight?: boolean;
}) => (
  <Card
    onClick={onClick}
    className={`p-6 cursor-pointer transition hover:shadow-md ${
      highlight ? "border-primary bg-primary/5" : ""
    }`}
  >
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  </Card>
);

export default Dashboard;
