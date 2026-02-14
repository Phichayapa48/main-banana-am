import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Upload, Sparkles, Book, Store, Utensils,
  Sprout, Droplets, BookOpen, Search, RefreshCw,
  ArrowRight, ShieldCheck // ✅ เพิ่ม ShieldCheck เข้ามา
} from "lucide-react";
import { useNavigate, useNavigationType } from "react-router-dom";
import { toast } from "sonner";
import heroImage from "@/assets/hero-bananas.jpg";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar"; 

const Index = () => {
  const navigate = useNavigate();
  const navType = useNavigationType();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [detecting, setDetecting] = useState(false);
  const [isConsent, setIsConsent] = useState(false); // ✅ เพิ่ม State ยินยอมเก็บข้อมูล
  
  const [result, setResult] = useState<any>(null);
  const [bananaDetails, setBananaDetails] = useState<any>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isReload = (
      window.performance.navigation.type === 1 ||
      performance.getEntriesByType("navigation").some((nav: any) => nav.type === "reload")
    );

    if (isReload || navType !== "POP") {
      sessionStorage.removeItem("last_detect_result");
      sessionStorage.removeItem("last_banana_details");
      sessionStorage.removeItem("last_preview_url");
      setResult(null);
      setBananaDetails(null);
      setPreviewUrl("");
    }

    if (navType === "POP" && !isReload) {
      const savedResult = sessionStorage.getItem("last_detect_result");
      const savedDetails = sessionStorage.getItem("last_banana_details");
      const savedPreview = sessionStorage.getItem("last_preview_url");

      if (savedResult && savedDetails && savedPreview) {
        setResult(JSON.parse(savedResult));
        setBananaDetails(JSON.parse(savedDetails));
        setPreviewUrl(savedPreview);

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 500);
      }
    }
  }, [navType]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResult(null);
      setBananaDetails(null);
      setIsConsent(false); // ✅ Reset consent เมื่ออัปโหลดภาพใหม่
    }
  };

  const resetDetection = () => {
    setSelectedImage(null);
    setPreviewUrl("");
    setResult(null);
    setBananaDetails(null);
    setIsConsent(false); // ✅ Reset consent
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info("ล้างข้อมูลเรียบร้อย เริ่มสแกนใหม่ได้เลยงับ");
  };

  const handleDetect = async () => {
    if (!selectedImage) {
      toast.error("กรุณาเลือกรูปภาพก่อนครับพี่");
      return;
    }

    setDetecting(true);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      // ✅ ส่งค่าความยินยอมไปที่ Backend ด้วย
      formData.append("allow_storage", String(isConsent));

      const backendUrl = import.meta.env.VITE_API_BASE_URL || "/api";

      const response = await fetch(`${backendUrl}/detect`, {
        method: "POST",
        body: formData,
      });

      // ✅ เช็ค HTTP status ก่อน
      if (!response.ok) {
        console.error("Backend HTTP Error:", response.status);
        toast.error("ระบบวิเคราะห์มีปัญหา กรุณาลองใหม่");
        return;
      }

      const data = await response.json();
      console.log("AI response:", data);

      // ❌ AI fail
      if (!data?.success) {
        if (data?.reason === "no_banana_detected") {
          toast.error("ไม่พบกล้วยในภาพ กรุณาลองใหม่");
        } else if (data?.reason === "invalid_image") {
          toast.error("ไฟล์ภาพไม่ถูกต้อง");
        } else if (data?.reason === "all_models_failed") {
          toast.error("ระบบไม่สามารถวิเคราะห์ได้ กรุณาลองใหม่");
        } else {
          toast.error("เกิดข้อผิดพลาดจากระบบ AI");
        }
        return;
      }

      // ✅ ตรวจ banana_key
      if (!data?.banana_key) {
        toast.error("ไม่พบรหัสสายพันธุ์จาก AI");
        return;
      }

      const aiKey = String(data.banana_key);

      const dbSlug = `kluai-${aiKey
        .toLowerCase()
        .replace(/[_\s-]/g, "")}`;

      console.log("Query slug:", dbSlug);

      const { data: dbData, error } = await supabase
        .from("cultivars")
        .select("*")
        .eq("slug", dbSlug)
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        toast.error("เกิดข้อผิดพลาดในการดึงข้อมูลฐานข้อมูล");
        return;
      }

      if (!dbData) {
        toast.error("ไม่พบข้อมูลสายพันธุ์ในฐานข้อมูล");
        return;
      }

      const confidenceValue =
        typeof data.confidence === "number"
          ? data.confidence
          : 0;

      const finalResult = {
        cultivar: dbData.thai_name,
        confidence: confidenceValue,
      };

      setBananaDetails(dbData);
      setResult(finalResult);

      sessionStorage.setItem(
        "last_detect_result",
        JSON.stringify(finalResult)
      );
      sessionStorage.setItem(
        "last_banana_details",
        JSON.stringify(dbData)
      );
      sessionStorage.setItem(
        "last_preview_url",
        previewUrl
      );

      toast.success("วิเคราะห์กล้วยเรียบร้อย! 🍌");

    } catch (err) {
      console.error("Detect error:", err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navbar />

      {/* 🟢 Hero Header Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src={heroImage} alt="Fresh bananas background" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 py-20 relative z-10 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            AI-Powered Thai Banana
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Variety Identification
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            ระบบจำแนกสายพันธุ์กล้วย พร้อมระบบจองผลผลิตจากกล้วยเชื่อมต่อโดยตรงกับเกษตกรฟาร์มกล้วยไทย
          </p>
        </div>
      </section>

      {/* 🟢 Main Detection Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-4xl mx-auto p-8 shadow-card bg-white/90 backdrop-blur">
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Detection</span>
            </div>
            <h3 className="text-3xl font-bold mb-2">ระบบจำแนกสายพันธุ์กล้วย</h3>
            {previewUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetDetection}
                className="text-muted-foreground hover:text-destructive mt-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> ล้างข้อมูล/สแกนใหม่
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer group">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <label htmlFor="image-upload" className="cursor-pointer block">
                {previewUrl ? (
                  <div className="relative overflow-hidden rounded-lg">
                    <img src={previewUrl} alt="Preview" className="max-h-80 mx-auto rounded-lg mb-4 shadow-md transition-transform group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="py-12">
                    <Upload className="w-16 h-16 mx-auto text-muted-foreground mb-4 group-hover:text-primary transition-colors" />
                    <p className="text-lg font-medium mb-2 text-gray-700">Click to upload image</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </label>
            </div>

            {/* ✅ ส่วน Consent: จะปรากฏเมื่อเลือกรูปแล้วแต่ยังไม่ได้วิเคราะห์ */}
            {previewUrl && !result && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      id="data-consent"
                      checked={isConsent}
                      onChange={(e) => setIsConsent(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </div>
                  <label htmlFor="data-consent" className="text-sm text-slate-600 leading-relaxed cursor-pointer select-none">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-0.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      ช่วยให้ AI เก่งขึ้น (Data Collection)
                    </div>
                    ยินยอมให้นำรูปภาพนี้ไปพัฒนาความแม่นยำของโมเดลจำแนกสายพันธุ์กล้วยในอนาคต โดยจะจัดเก็บเป็นข้อมูลนิรนาม (สอดคล้องกับนโยบาย PDPA)
                  </label>
                </div>
              </div>
            )}

            {previewUrl && !result && (
              <Button
                onClick={handleDetect}
                disabled={detecting}
                size="lg"
                className="w-full h-14 text-lg font-bold"
              >
                {detecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> กำลังวิเคราะห์...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" /> เริ่มการจำแนกสายพันธุ์
                  </>
                )}
              </Button>
            )}

            {result && (
              <div
                ref={resultRef}
                className="mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <Card className="p-6 rounded-2xl shadow-lg border-l-8 border-yellow-400 bg-white">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                      <h2 className="text-3xl font-bold text-gray-800">{result.cultivar}</h2>
                      <div className="mt-2 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                        ความมั่นใจ {(result.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <Button
                      className="bg-secondary hover:bg-secondary/90 text-white gap-2 w-full md:w-auto shadow-md"
                      onClick={() => navigate(`/market?search=${encodeURIComponent(result.cultivar)}`)}
                    >
                      <Store size={18} /> แนะนำฟาร์มที่ขายกล้วยชนิดนี้
                    </Button>
                  </div>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-blue-50 border-blue-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold">
                      <Search size={18} /> ลักษณะ
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{bananaDetails?.description || "-"}</p>
                  </Card>
                  <Card className="p-4 bg-orange-50 border-orange-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-orange-700 font-bold">
                      <Utensils size={18} /> รสชาติ
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{bananaDetails?.taste || "-"}</p>
                  </Card>
                  <Card className="p-4 bg-green-50 border-green-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-green-700 font-bold">
                      <Sprout size={18} /> การปลูก
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{bananaDetails?.soil || "-"}</p>
                  </Card>
                  <Card className="p-4 bg-teal-50 border-teal-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-teal-700 font-bold">
                      <Droplets size={18} /> การดูแล
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{bananaDetails?.watering || "-"}</p>
                  </Card>
                  <Card className="p-4 bg-purple-50 border-purple-200 md:col-span-2 shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-purple-700 font-bold">
                      <Sparkles size={18} /> ประโยชน์ของกล้วย
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{bananaDetails?.benefits || "-"}</p>
                  </Card>
                </div>

                <Button
                  variant="ghost"
                  className="w-full py-6 text-muted-foreground hover:text-primary transition-colors border-t border-dashed"
                  onClick={() => {
                    if (bananaDetails?.slug) {
                      navigate(`/cultivar/${bananaDetails.slug}`);
                    } else {
                      toast.error("ขออภัย ไม่พบหน้ารายละเอียดของสายพันธุ์นี้");
                    }
                  }}
                >
                  <BookOpen className="w-4 h-4 mr-2" /> คลิกเพื่อดูรายละเอียดข้อมูลเชิงลึกของกล้วยที่ทำนาย...
                </Button>
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* 🟢 Features Section Overview */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-6 text-center hover:shadow-soft transition-shadow">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Detection</h3>
            <p className="text-muted-foreground">
              จำแนกสายพันธุ์กล้วยได้ทันที ด้วยเทคโนโลยี Machine Learning
            </p>
          </Card>
          <Card className="p-6 text-center hover:shadow-soft transition-shadow">
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Expert Knowledge</h3>
            <p className="text-muted-foreground">
              องค์ความรู้เกี่ยวกับกล้วยไทยมากกว่า 10 สายพันธุ์
            </p>
          </Card>
          <Card className="p-6 text-center hover:shadow-soft transition-shadow">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2">Direct from Farms</h3>
            <p className="text-muted-foreground">จองผลผลิตกล้วยโดยตรงจากฟาร์ม</p>
          </Card>
        </div>
      </section>

      {/* 🟢 CTA Section - High Gloss Design */}
      <section className="container mx-auto px-4 py-24">
        <div className="relative group max-w-6xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-emerald-400 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>

          <Card className="relative overflow-hidden bg-white/80 backdrop-blur-xl border border-white/40 p-12 md:p-16 text-center shadow-2xl rounded-[3rem]">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-yellow-200/50 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-200/50 rounded-full blur-3xl" style={{ animation: 'pulse 8s infinite' }}></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full mb-6 animate-bounce" style={{ animationDuration: '3s' }}>
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Join our community</span>
              </div>

              <h3 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-slate-800 leading-tight">
                เริ่มต้นการเดินทาง <br />
                ไปกับ <span className="bg-gradient-to-r from-yellow-500 to-emerald-600 bg-clip-text text-transparent">Banana Expert</span>
              </h3>

              <p className="text-lg md:text-xl mb-12 text-slate-600 max-w-2xl mx-auto leading-relaxed">
                ค้นพบความหลากหลายของกล้วยไทย และเชื่อมต่อตรงกับฟาร์มคุณภาพ <br className="hidden md:block" />
                เพื่อผลผลิตที่ดีที่สุดจากมือเกษตรกรไทย
              </p>

              <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                <Button
                  size="lg"
                  className="group/btn relative overflow-hidden bg-slate-900 hover:bg-slate-800 text-white px-12 py-8 text-xl rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                  onClick={() => navigate("/market")}
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Store className="w-6 h-6" />
                    ตลาดออนไลน์
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-700 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white hover:bg-yellow-50 text-slate-800 border-2 border-yellow-400 hover:border-yellow-500 hover:text-yellow-700 px-12 py-8 text-xl rounded-2xl shadow-lg transition-all hover:scale-105 w-full sm:w-auto"
                  onClick={() => navigate("/knowledge")}
                >
                  <Book className="w-6 h-6 mr-3 text-yellow-500 transition-transform group-hover:rotate-12" />
                  เรียนรู้เพิ่มเติม
                </Button>
              </div>
            </div>

            <div className="absolute top-10 left-10 text-yellow-400/20 -rotate-12 animate-float hidden lg:block">
              <Sprout size={120} />
            </div>
            <div className="absolute bottom-10 right-10 text-emerald-400/20 rotate-12 animate-float hidden lg:block" style={{ animationDelay: '2s' }}>
              <Utensils size={100} />
            </div>
          </Card>
        </div>
      </section>

      {/* 🟢 Footer Section */}
      <footer className="border-t border-border bg-background/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© 2026 Banana Expert. Connecting Thailand's finest banana farms.</p>
        </div>
      </footer>

      {/* ✨ Tailwind Custom Animation Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-12deg); }
          50% { transform: translateY(-20px) rotate(-8deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default Index;
