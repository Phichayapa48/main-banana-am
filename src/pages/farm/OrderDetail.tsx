import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Package, User, MapPin, Truck } from "lucide-react";


type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "reviewed";


interface OrderData {
  id: string;
  order_number?: string;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  carrier?: string | null;
  expiry_date?: string | null;

  user_id: string;
  status: OrderStatus;
  total_price: number;
  quantity: number;
  delivery_address: string;
  delivery_notes: string | null;
  tracking_number: string | null;
  created_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;

  products: {
    id: string;
    name: string;
    price_per_unit: number;
    unit: string;
    image_url: string | null;
  } | null;

  profiles: {
    full_name: string;
    phone: string | null;
  } | null;

  is_reservation?: boolean;
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");


  useEffect(() => {
    if (id) loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth/login");
        return;
      }

      const { data: farm, error: farmError } = await supabase
        .from("farm_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (farmError) throw farmError;

      if (!farm) {
        toast.error("No farm profile found");
        navigate("/dashboard");
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          receiver_name,
          receiver_phone,
          carrier,
          user_id,
          status,
          total_price,
          quantity,
          delivery_address,
          delivery_notes,
          tracking_number,
          created_at,
          confirmed_at,
          shipped_at,
          delivered_at,
          expiry_date,
          products (id, name, price_per_unit, unit, image_url),
          profiles:user_id (full_name, phone)
        `)

        .eq("id", id)
        .maybeSingle();
      if (orderData) {
        setOrder(orderData as unknown as OrderData);
        setTrackingNumber(orderData.tracking_number || "");
        setCarrier(orderData.carrier || ""); 
      } else {
        const { data: resData } = await supabase
          .from("reservations")
          .select(`
            id,
            user_id,
            quantity,
            note,
            status,
            created_at,
            receiver_name,
            receiver_phone,
            delivery_address,
            expiry_date,
            products:product_id (id, name, price_per_unit, unit, image_url),
            profiles:user_id (full_name, phone)
          `)

          .eq("id", id)
          .maybeSingle();

        if (resData) {
          const formattedRes: OrderData = {
            id: resData.id,
            user_id: resData.user_id,
            status: resData.status as OrderStatus,
            quantity: resData.quantity,
            delivery_address: resData.delivery_address || "รอยืนยันที่อยู่",
            receiver_name: resData.receiver_name,
            receiver_phone: resData.receiver_phone,
            delivery_notes: null,
            expiry_date: resData.expiry_date,
            total_price: (resData.products?.price_per_unit || 0) * resData.quantity,
            created_at: resData.created_at,
            tracking_number: null,
            confirmed_at: null,
            shipped_at: null,
            delivered_at: null,
            products: resData.products,
            profiles: resData.profiles,
            is_reservation: true
          } as unknown as OrderData;
          setOrder(formattedRes);
        } else {
          toast.error("Order not found");
          navigate("/farm/orders");
          return;
        }
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load order";
      toast.error(message);
      navigate("/farm/orders");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);

    try {
      if (newStatus === "confirmed" && order.is_reservation) {
        const { error } = await supabase.rpc("confirm_reservation", {
          p_reservation_id: order.id,
        });
        if (error) throw error;
        toast.success("Order confirmed and moved to orders");
        loadOrder(); 
        return;
      }

      const updates: Record<string, unknown> = { status: newStatus };

      if (newStatus === "confirmed") {

  updates.confirmed_at = new Date().toISOString();

      } else if (newStatus === "shipped") {
        if (!trackingNumber.trim()) {
          toast.error("Please enter a tracking number");
          setUpdating(false);
          return;
        }
        if (!carrier.trim()) { 
          toast.error("Please enter carrier");
          setUpdating(false);
          return;
        }
        updates.shipped_at = new Date().toISOString();
        updates.tracking_number = trackingNumber.trim();
        updates.carrier = carrier.trim(); 
      } else if (newStatus === "delivered") {
        updates.delivered_at = new Date().toISOString();
      }


      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", order.id);

      if (error) throw error;

      toast.success(`Order ${newStatus}`);
      await loadOrder();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update order";
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      reviewed: "bg-emerald-100 text-emerald-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          {/* ✨ ปรับจุดนี้เพื่อให้ย้อนกลับไปหน้าก่อนหน้าได้แม่นยำขึ้นครับ */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/farm/orders");
              }
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🍌</span>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              รายละเอียดการจอง
            </h1>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div> <h3 className="font-semibold"> {order.order_number ? "หมายเลขออเดอร์" : "หมายเลขการจอง"} </h3>
              <p className="font-mono"> {order.order_number ?? order.id} </p></div>

              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              วันที่จอง {new Date(order.created_at).toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              วันที่ต้องจัดส่ง {new Date(order.expiry_date).toLocaleString()}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">ข้อมูลลูกค้า</h3>
            </div>
            <div className="space-y-2">
              <p><strong>ชื่อผู้รับ:</strong>{" "}{order.receiver_name ?? order.profiles?.full_name ?? "N/A"}</p>
              <p><strong>เบอร์โทรศัพท์:</strong>{" "}{order.receiver_phone ?? order.profiles?.phone ?? "N/A"}</p>

            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">ข้อมูลการจัดส่ง</h3>
            </div>
            <div className="space-y-2">
              <p className="whitespace-pre-wrap"><strong>ที่อยู่:</strong> {order.delivery_address}</p>
              {order.delivery_notes && (
                <p><strong>หมายเหตุ:</strong> {order.delivery_notes}</p>
              )}
              {order.carrier && (
                <p><strong>บริษัทขนส่ง:</strong> {order.carrier}</p>
            )}
              {order.tracking_number && (
                <p><strong>หมายเลขติดตามพัสดุ:</strong> {order.tracking_number}</p>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">รายการสินค้า</h3>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              {order.products?.image_url && (
                <img
                  src={order.products.image_url}
                  alt={order.products.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{order.products?.name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">
                  ฿{order.products?.price_per_unit}/{order.products?.unit} × {order.quantity}
                </p>
              </div>
              <p className="font-semibold">฿{order.total_price.toLocaleString()}</p>
            </div>
          </Card>

          {order.status !== "delivered" && order.status !== "cancelled" && order.status !== "reviewed" && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">อัปเดตสถานะการจอง</h3>
              </div>

              {order.status === "pending" && (
                <Button
                  onClick={() => updateStatus("confirmed")}
                  disabled={updating}
                  className="w-full"
                >
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  ยืนยันการจอง
                </Button>
              )}

              {order.status === "confirmed" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>บริษัทขนส่ง</Label>
                    <Input
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="Flash / Kerry / Thailand Post"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tracking">หมายเลขติดตามพัสดุ</Label>
                    <Input
                      id="tracking"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="กรอกหมายเลขติดตามพัสดุ"
                    />
                  </div>
                  <Button
                    onClick={() => updateStatus("shipped")}
                    disabled={updating}
                    className="w-full"
                  >
                    {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    ยืนยันการจัดส่ง
                  </Button>
                </div>
              )}

              {order.status === "shipped" && (
                <Button
                  onClick={() => updateStatus("delivered")}
                  disabled={updating}
                  className="w-full"
                >
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  ยืนยันว่าจัดส่งสำเร็จ
                </Button>
              )}

            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
