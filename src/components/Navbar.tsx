import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Book, Store, User, LogOut, ArrowLeft } from "lucide-react"; 
import { useNavigate, useLocation } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NavLink } from "./NavLink"; 

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
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
    <nav className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        
        <div className="flex items-center gap-2">
          {/* ✨ ปุ่มย้อนกลับ: จ่อแล้วส้มขาว */}
          {location.pathname !== "/" && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)} 
              className="mr-1 rounded-xl text-slate-500 hover:bg-orange-600 hover:text-white transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          <h1
            className="text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            Banana Expert
          </h1>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Knowledge: จ่อแล้วส้มขาว */}
          <NavLink 
            to="/knowledge" 
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:bg-orange-600 hover:text-white"
            activeClassName="bg-orange-600 text-white shadow-md" 
          >
            <Book className="w-4 h-4" />
            Knowledge
          </NavLink>

          {/* Marketplace: จ่อแล้วส้มขาว */}
          <NavLink 
            to="/market" 
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:bg-orange-600 hover:text-white"
            activeClassName="bg-orange-600 text-white shadow-md"
          >
            <Store className="w-4 h-4" />
            Marketplace
          </NavLink>

          {session ? (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
              {/* ✨ ปุ่ม Profile: พี่ใส่ group ไว้ที่นี่ */}
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")} 
                className="group gap-2 rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-orange-600 hover:text-white font-bold shadow-sm transition-all"
              >
                {/* ✨ ไอคอน User: ปกติส้ม แต่พอปุ่มโดน Hover (group-hover) ให้เปลี่ยนเป็นขาว! */}
                <User className="w-4 h-4 text-orange-500 group-hover:text-white transition-colors" /> 
                Profile
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut} 
                className="rounded-xl text-slate-500 hover:bg-orange-600 hover:text-white transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => navigate("/auth/login")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl px-6 shadow-md transition-all active:scale-95"
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
