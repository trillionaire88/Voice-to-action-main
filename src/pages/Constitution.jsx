import React, { useState } from "react";
import { api } from '@/api/client';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText, Plus, Vote, History } from "lucide-react";

export default function Constitution() {
  const { data: documents = [] } = useQuery({
    queryKey: ["constitutionDocuments"],
    queryFn: () => api.entities.ConstitutionDocument.list("-version"),
  });

  const activeDoc = documents.find((d) => d.status === "active") || documents[0];

  const { data: articles = [] } = useQuery({
    queryKey: ["articles", activeDoc?.id],
    queryFn: () =>
      api.entities.ConstitutionArticle.filter({ document_id: activeDoc.id }),
    enabled: !!activeDoc,
  });

  const { data: amendments = [] } = useQuery({
    queryKey: ["amendments"],
    queryFn: () => api.entities.ConstitutionAmendment.list("-created_date"),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
          <ScrollText className="w-10 h-10 text-blue-600" />
          Global Constitution
        </h1>
        <p className="text-slate-600">
          Collectively drafted principles for global democracy
        </p>
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles">
            <ScrollText className="w-4 h-4 mr-2" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="amendments">
            <Vote className="w-4 h-4 mr-2" />
            Proposed Amendments
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Version History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {activeDoc && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-2">{activeDoc.title}</h2>
                {activeDoc.preamble && (
                  <p className="text-slate-700 italic">{activeDoc.preamble}</p>
                )}
              </CardContent>
            </Card>
          )}

          {articles.map((article) => (
            <Card key={article.id} className="border-slate-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Article {article.section_number}: {article.title}
                    </CardTitle>
                    <Badge
                      className={
                        article.status === "active"
                          ? "bg-green-50 text-green-700 mt-2"
                          : "bg-slate-100 text-slate-600 mt-2"
                      }
                    >
                      {article.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{article.text}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="amendments" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Propose Amendment
            </Button>
          </div>

          {amendments.filter((a) => a.state !== "adopted").map((amendment) => (
            <Card key={amendment.id} className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">{amendment.title}</CardTitle>
                <Badge
                  className={
                    amendment.state === "voting"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700"
                  }
                >
                  {amendment.state}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-slate-700">{amendment.rationale}</p>
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-sm font-mono text-slate-800">{amendment.text}</p>
                </div>
                {amendment.state === "voting" && (
                  <div className="flex items-center gap-4 pt-3">
                    <div className="text-sm">
                      <span className="font-semibold text-green-600">
                        {amendment.votes_for}
                      </span>{" "}
                      for
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-red-600">
                        {amendment.votes_against}
                      </span>{" "}
                      against
                    </div>
                    <Button size="sm" className="ml-auto">
                      Vote
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id} className="border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{doc.title}</h3>
                      <p className="text-sm text-slate-600">Version {doc.version}</p>
                    </div>
                    <Badge>{doc.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}