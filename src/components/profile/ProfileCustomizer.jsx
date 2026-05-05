import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Palette, Image, Layout, Link2, Shield } from "lucide-react";

export default function ProfileCustomizer({ user, onSave }) {
  const [formData, setFormData] = useState({
    display_name: user.display_name || "",
    bio: user.bio || "",
    website_url: user.website_url || "",
    accent_color: user.accent_color || "#3B82F6",
    profile_layout: user.profile_layout || "default",
    avatar_shape: user.avatar_shape || "circle",
    show_social_links: user.show_social_links || false,
    show_activity_history: user.show_activity_history !== false,
    show_petitions_signed: user.show_petitions_signed || false,
    languages_spoken: user.languages_spoken || [],
  });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customize Your Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div>
              <Label>Display Name</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                placeholder="Your display name"
              />
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>

            <div>
              <Label>Website</Label>
              <Input
                value={formData.website_url}
                onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                placeholder="https://your-website.com"
              />
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div>
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Accent Color
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.accent_color}
                  onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div>
              <Label>Avatar Shape</Label>
              <Select
                value={formData.avatar_shape}
                onValueChange={(v) => setFormData({...formData, avatar_shape: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="square">Square</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-4 mt-4">
            <div>
              <Label className="flex items-center gap-2">
                <Layout className="w-4 h-4" />
                Profile Layout
              </Label>
              <Select
                value={formData.profile_layout}
                onValueChange={(v) => setFormData({...formData, profile_layout: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="cards">Card-Based</SelectItem>
                  <SelectItem value="minimalist">Minimalist</SelectItem>
                  <SelectItem value="creator">Creator Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show_activity"
                  checked={formData.show_activity_history}
                  onCheckedChange={(checked) =>
                    setFormData({...formData, show_activity_history: checked})
                  }
                />
                <Label htmlFor="show_activity" className="cursor-pointer">
                  Show activity history publicly
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show_petitions"
                  checked={formData.show_petitions_signed}
                  onCheckedChange={(checked) =>
                    setFormData({...formData, show_petitions_signed: checked})
                  }
                />
                <Label htmlFor="show_petitions" className="cursor-pointer">
                  Show petitions I've signed
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show_social"
                  checked={formData.show_social_links}
                  onCheckedChange={(checked) =>
                    setFormData({...formData, show_social_links: checked})
                  }
                />
                <Label htmlFor="show_social" className="cursor-pointer">
                  Show social links
                </Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
}