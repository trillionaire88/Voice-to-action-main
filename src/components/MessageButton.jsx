import React from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getOrCreateConversation } from "@/api/socialApi";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function MessageButton({ targetUserId, size = "sm", className = "" }) {
  const navigate = useNavigate();

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Please sign in to send messages"); return; }
      if (user.id === targetUserId) return;
      await getOrCreateConversation(targetUserId);
      navigate(createPageUrl("Messages"));
    } catch (err) {
      toast.error(err.message || "Could not open conversation");
    }
  };

  return (
    <Button size={size} variant="outline" onClick={handleClick} className={className}>
      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
      Message
    </Button>
  );
}
