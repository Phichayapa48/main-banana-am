import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Book, Store, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NavLink } from "./NavLink"; 

const Navbar = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("ออกจากระบบเรียบร้อย");
    navigate("/");
  };

  return (
    <nav className="border-b border-border bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1
            className="text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-500 to-emerald-600 bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            Banana Expert
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* ✨ แก้ activeClassName ให้อ่านง่าย: ใช้สีเข้มขึ้นและพื้นหลังจางๆ */}
          <NavLink 
            to="/knowledge" 
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
            activeClassName="bg-slate-100 text-slate-900 shadow-sm" 
          >
            <Book className="w-4 h-4 text-yellow-500" />
            Knowledge
          </NavLink>

          <NavLink 
            to="/market" 
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
            activeClassName="bg-slate-100 text-slate-900 shadow-sm"
          >
            <Store className="w-4 h-4 text-emerald-500" />
            Marketplace
          </NavLink>

          {/* ส่วนเช็คสถานะ Login */}
          {session ? (
            <div className="flex items-center gap-2 border-l pl-4 ml-2 border-slate-200">
              {/* ✨ แก้ปุ่ม Profile: เปลี่ยนเป็นสี Slate เข้ม อ่านออกแน่นอน */}
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")} 
                className="gap-2 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold shadow-sm"
              >
                <User className="w-4 h-4 text-yellow-500" /> Profile
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut} 
                className="rounded-xl text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => navigate("/auth/login")}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-6 shadow-lg shadow-slate-200 transition-all active:scale-95"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
