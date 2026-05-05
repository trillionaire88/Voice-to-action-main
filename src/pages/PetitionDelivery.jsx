import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { cleanForDB } from "@/lib/dbHelpers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function PetitionDelivery() {
  const petitionId = new URLSearchParams(window.location.search).get("id");
  const [institution, setInstitution] = useState("");
  const [method, setMethod] = useState("email");
  const { data: petition } = useQuery({
    queryKey: ["delivery-petition", petitionId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("petitions").select("*").eq("id", petitionId).single();
        if (error) throw error;
        return data || null;
      } catch {
        return null;
      }
    },
    enabled: !!petitionId,
  });
  const deliver = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in");
      const { error } = await supabase.from("petition_deliveries").insert(cleanForDB({
        petition_id: petitionId,
        delivered_by: user.id,
        institution_name: institution,
        delivery_method: method,
      }));
      if (error) throw error;
    },
    onSuccess: () => toast.success("Delivery recorded"),
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Petition Delivery</h1>
      <p className="text-slate-600 mb-4">{petition?.title || "Select a petition"}</p>
      <Input placeholder="Institution name" value={institution} onChange={(e) => setInstitution(e.target.value)} />
      <Select value={method} onValueChange={setMethod}>
        <SelectTrigger className="mt-3"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="postal">Postal</SelectItem>
          <SelectItem value="online_portal">Online Portal</SelectItem>
          <SelectItem value="in_person">In-Person</SelectItem>
        </SelectContent>
      </Select>
      <Button className="mt-4" onClick={() => deliver.mutate()} disabled={!institution || deliver.isPending}>Deliver to Institution</Button>
    </>
  );
}
