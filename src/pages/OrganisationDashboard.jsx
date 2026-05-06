import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrganisationDashboard() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Organisation Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Verified Presence</CardTitle></CardHeader><CardContent>$99 AUD / month</CardContent></Card>
        <Card><CardHeader><CardTitle>Official Responses</CardTitle></CardHeader><CardContent>Respond to petitions targeting your institution.</CardContent></Card>
        <Card><CardHeader><CardTitle>Analytics</CardTitle></CardHeader><CardContent>Track references and sentiment.</CardContent></Card>
      </div>
    </>
  );
}
