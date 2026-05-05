import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ActionButton from "@/components/ui/ActionButton";

export default function MessageButton({ userId, className = "" }) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  if (!userId) return null;
  return (
    <ActionButton
      variant="outline"
      size="sm"
      loading={loading}
      loadingText="Opening..."
      className={`gap-2 ${className}`}
      onClick={async () => {
        setLoading(true);
        const { data: convId, error } = await supabase.rpc("get_or_create_direct_conversation", {
          other_user_id: userId,
        });
        if (error) {
          setLoading(false);
          return;
        }
        navigate(`/Messages?conversation=${convId}`);
        setLoading(false);
      }}
    >
      <MessageCircle className="w-4 h-4" />
      Message
    </ActionButton>
  );
}