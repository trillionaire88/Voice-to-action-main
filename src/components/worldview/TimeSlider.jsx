import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Clock, Play, Pause, SkipBack, SkipForward, X } from "lucide-react";
import { format } from "date-fns";

export default function TimeSlider({ 
  startDate, 
  endDate, 
  currentDate, 
  onDateChange, 
  isPlaying, 
  onTogglePlay,
  onClose 
}) {
  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  const currentDay = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
  const _percentage = (currentDay / totalDays) * 100;

  const handleSliderChange = (value) => {
    const newDay = value[0];
    const newDate = new Date(startDate.getTime() + newDay * 24 * 60 * 60 * 1000);
    onDateChange(newDate);
  };

  const skipBackward = () => {
    const newDay = Math.max(0, currentDay - 30);
    const newDate = new Date(startDate.getTime() + newDay * 24 * 60 * 60 * 1000);
    onDateChange(newDate);
  };

  const skipForward = () => {
    const newDay = Math.min(totalDays, currentDay + 30);
    const newDate = new Date(startDate.getTime() + newDay * 24 * 60 * 60 * 1000);
    onDateChange(newDate);
  };

  return (
    <Card className="absolute bottom-8 left-1/2 -translate-x-1/2 p-4 shadow-2xl border-slate-200 bg-white/98 backdrop-blur-sm z-20 w-full max-w-3xl mx-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">Historical Timeline</h3>
          <Badge className="bg-blue-50 text-blue-700">
            {format(currentDate, "MMM d, yyyy")}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Timeline Slider */}
        <div className="px-2">
          <Slider
            value={[currentDay]}
            onValueChange={handleSliderChange}
            max={totalDays}
            step={1}
            className="w-full"
          />
        </div>

        {/* Date Range Labels */}
        <div className="flex items-center justify-between text-xs text-slate-600 px-2">
          <span>{format(startDate, "MMM d, yyyy")}</span>
          <span className="text-slate-400">
            {currentDay} of {totalDays} days
          </span>
          <span>{format(endDate, "MMM d, yyyy")}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={skipBackward}
            disabled={currentDay === 0}
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant={isPlaying ? "default" : "outline"}
            size="sm"
            onClick={onTogglePlay}
            className={isPlaying ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={skipForward}
            disabled={currentDay === totalDays}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Info */}
        <p className="text-xs text-center text-slate-500">
          View civic activity over time • Compare sentiment before/after decisions
        </p>
      </div>
    </Card>
  );
}