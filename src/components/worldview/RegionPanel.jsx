import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  MapPin,
  BarChart3,
  Scale,
  Calendar,
  Users,
  Clock,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import NewsLayer from "./NewsLayer";
import InstitutionMarkers from "./InstitutionMarkers";
import ElectionSimulator from "./ElectionSimulator";
import ScenarioModeler from "./ScenarioModeler";

export default function RegionPanel({ countryCode, polls, impactEvents, onClose }) {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Filter content for this region
  const regionPolls = polls.filter(poll => {
    const pollCountry = poll.location_country_code || poll.audience_country_code;
    return pollCountry === countryCode || (poll.location_scope === 'global' && countryCode);
  });

  const regionImpactEvents = impactEvents.filter(event => {
    return event.location_country_code === countryCode && event.moderation_status === 'approved';
  });

  // Time filtering
  const now = new Date();
  const filterByTime = (item) => {
    if (timeFilter === 'all') return true;
    const itemDate = new Date(item.created_date);
    const hoursDiff = (now - itemDate) / (1000 * 60 * 60);
    
    if (timeFilter === '24h') return hoursDiff <= 24;
    if (timeFilter === '7d') return hoursDiff <= 168;
    if (timeFilter === '30d') return hoursDiff <= 720;
    return true;
  };

  const filteredPolls = regionPolls.filter(filterByTime);
  const filteredEvents = regionImpactEvents.filter(filterByTime);

  // Sorting
  const sortItems = (items) => {
    const sorted = [...items];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    } else if (sortBy === 'trending') {
      sorted.sort((a, b) => (b.total_votes_cached || 0) - (a.total_votes_cached || 0));
    } else if (sortBy === 'most_voted') {
      sorted.sort((a, b) => (b.total_votes_cached || 0) - (a.total_votes_cached || 0));
    }
    return sorted;
  };

  const sortedPolls = sortItems(filteredPolls);
  const sortedEvents = sortItems(filteredEvents);

  const allItems = [
    ...sortedPolls.map(p => ({ ...p, type: 'poll' })),
    ...sortedEvents.map(e => ({ ...e, type: 'event' }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-gradient-to-br from-blue-50 to-white">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">{countryCode}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
            <BarChart3 className="w-3 h-3 mr-1" />
            {filteredPolls.length} polls
          </Badge>
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            <Scale className="w-3 h-3 mr-1" />
            {filteredEvents.length} records
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 space-y-3">
        <div className="flex gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="most_voted">Most Voted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="flex-shrink-0 mx-4 mt-4 grid w-auto grid-cols-7 text-xs">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="polls">Polls</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
          <TabsTrigger value="petitions">Petitions</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="orgs">Orgs</TabsTrigger>
          <TabsTrigger value="simulate">Simulate</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 overflow-auto px-4 pb-4 mt-4">
          <ContentList items={allItems} navigate={navigate} />
        </TabsContent>

        <TabsContent value="polls" className="flex-1 overflow-auto px-4 pb-4 mt-4">
          <PollsList polls={sortedPolls} navigate={navigate} />
        </TabsContent>

        <TabsContent value="impact" className="flex-1 overflow-auto px-4 pb-4 mt-4">
          <EventsList events={sortedEvents} navigate={navigate} />
        </TabsContent>

        <TabsContent value="petitions" className="flex-1 overflow-auto px-4 pb-4 mt-4">
          <PetitionsTab countryCode={countryCode} navigate={navigate} />
        </TabsContent>

        <TabsContent value="news" className="flex-1 overflow-auto px-4 pb-4 mt-4">
          <NewsLayer
            countryCode={countryCode}
            onLinkToPoll={(id) => navigate(createPageUrl("PollDetail") + `?id=${id}`)}
            onLinkToPetition={(id) => navigate(createPageUrl("PetitionDetail") + `?id=${id}`)}
          />
        </TabsContent>

        <TabsContent value="orgs" className="flex-1 overflow-auto px-4 pb-4 mt-4">
          <InstitutionMarkers
            countryCode={countryCode}
            onSelectInstitution={(inst) =>
              navigate(createPageUrl("InstitutionProfile") + `?id=${inst.id}`)
            }
          />
        </TabsContent>

        <TabsContent value="simulate" className="flex-1 overflow-auto px-4 pb-4 mt-4 space-y-4">
          <ElectionSimulator countryCode={countryCode} />
          <ScenarioModeler decisionTitle={`${countryCode} Policy Scenario`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PetitionsTab({ countryCode, navigate }) {
  const { data: petitions = [], isLoading } = useQuery({
    queryKey: ["petitionsByCountry", countryCode],
    queryFn: async () => {
      const allPetitions = await api.entities.Petition.list();
      return allPetitions.filter(
        p => p.country_code === countryCode && 
        (p.status === 'active' || p.status === 'delivered') &&
        p.moderation_status === 'approved'
      );
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-sm text-slate-500">Loading...</div>;
  }

  if (petitions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {petitions.map(petition => (
        <PetitionMiniCard key={petition.id} petition={petition} navigate={navigate} />
      ))}
    </div>
  );
}

function PetitionMiniCard({ petition, navigate }) {
  return (
    <div
      onClick={() => navigate(createPageUrl("PetitionDetail") + `?id=${petition.id}`)}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="bg-orange-50 p-2 rounded-lg flex-shrink-0">
          <FileText className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{petition.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {petition.signature_count_total || 0} signatures
            </span>
            <Badge variant="outline" className="text-xs">
              {petition.target_type.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentList({ items, navigate }) {
  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        item.type === 'poll' ? (
          <PollCard key={`poll-${item.id}`} poll={item} navigate={navigate} />
        ) : (
          <EventCard key={`event-${item.id}`} event={item} navigate={navigate} />
        )
      ))}
    </div>
  );
}

function PollsList({ polls, navigate }) {
  if (polls.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {polls.map(poll => (
        <PollCard key={poll.id} poll={poll} navigate={navigate} />
      ))}
    </div>
  );
}

function EventsList({ events, navigate }) {
  if (events.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {events.map(event => (
        <EventCard key={event.id} event={event} navigate={navigate} />
      ))}
    </div>
  );
}

function PollCard({ poll, navigate }) {
  return (
    <div
      onClick={() => navigate(createPageUrl("PollDetail") + `?id=${poll.id}`)}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{poll.question}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {poll.total_votes_cached || 0} votes
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(poll.created_date), 'MMM d')}
            </span>
          </div>
          {poll.location_scope === 'global' && (
            <Badge variant="outline" className="text-xs">Global • Relevant here</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, navigate }) {
  return (
    <div
      onClick={() => navigate(createPageUrl("FigureProfile") + `?id=${event.figure_id}`)}
      className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="bg-amber-50 p-2 rounded-lg flex-shrink-0">
          <Scale className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{event.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-2">
            <Badge variant="outline" className="text-xs">
              {event.impact_type}
            </Badge>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(event.date_of_event), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-600 text-sm">No content found for this region with current filters</p>
    </div>
  );
}