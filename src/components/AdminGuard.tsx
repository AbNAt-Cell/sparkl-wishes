import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Props = {
  children: React.ReactNode;
};

export const AdminGuard: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const role = session?.user?.app_metadata?.role;
      if (role === "admin") {
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
      setChecking(false);
    };
    check();
  }, []);


  if (!authorized) {
    navigate("/auth");
    return null;
  }

  return <>{children}</>;
};

export default AdminGuard;


