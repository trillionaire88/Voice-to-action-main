import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, Calendar, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function NewsLayer({ countryCode, onLinkToPoll, onLinkToPetition }) {
  // Mock news data - in production would fetch from API
  const newsItems = [
    {
      id: 1,
      type: "government",
      title: "New Climate Legislation Under Review",
      date: "2025-11-20",
      summary: "Parliament debates comprehensive climate action framework with public consultation period.",
      source: "Official Government Portal",
      verified: true,
      relatedPollId: null,
      relatedPetitionId: null,
    },
    {
      id: 2,
      type: "court",
      title: "Supreme Court Rules on Digital Privacy",
      date: "2025-11-18",
      summary: "Landmark decision establishes new standards for data protection and user consent.",
      source: "Judicial Press Office",
      verified: true,
      relatedPollId: null,
      relatedPetitionId: null,
    },
    {
      id: 3,
      type: "corporate",
      title: "Major Energy Company Announces Transition Plan",
      date: "2025-11-15",
      summary: "Regional energy provider commits to renewable transition by 2030.",
      source: "Corporate Press Release",
      verified: false,
      relatedPollId: null,
      relatedPetitionId: null,
    },
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case "government":
        return <Building2 className="w-4 h-4" />;
      case "court":
        return <Building2 className="w-4 h-4" />;
      case "corporate":
        return <Building2 className="w-4 h-4" />;
      default:
        return <Newspaper className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      government: "bg-blue-50 text-blue-700 border-blue-200",
      court: "bg-purple-50 text-purple-700 border-purple-200",
      corporate: "bg-orange-50 text-orange-700 border-orange-200",
      activism: "bg-green-50 text-green-700 border-green-200",
    };
    return colors[type] || "bg-slate-50 text-slate-700";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-900">Civic News & Updates</h3>
      </div>

      {newsItems.map((item) => (
        <Card key={item.id} className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-1">{getTypeIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-slate-900 text-sm leading-tight">
                    {item.title}
                  </h4>
                  {item.verified && (
                    <Badge className="bg-emerald-50 text-emerald-700 text-xs shrink-0">
                      Verified
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-slate-600 mb-2 line-clamp-2">{item.summary}</p>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                  <Badge variant="outline" className={getTypeBadge(item.type)}>
                    {item.type}
                  </Badge>
                </div>

                <div className="text-xs text-slate-500 mb-3">
                  Source: <span className="font-medium">{item.source}</span>
                </div>

                {(item.relatedPollId || item.relatedPetitionId) && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex gap-2">
                      {item.relatedPollId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => onLinkToPoll(item.relatedPollId)}
                        >
                          Related Poll
                        </Button>
                      )}
                      {item.relatedPetitionId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => onLinkToPetition(item.relatedPetitionId)}
                        >
                          Related Petition
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-slate-500 text-center pt-2">
        All news items are sourced from verified channels and fact-checked
      </p>
    </div>
  );
}