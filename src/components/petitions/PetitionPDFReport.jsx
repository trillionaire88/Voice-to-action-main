import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { appHostname } from "@/constants/siteUrl";

export default function PetitionPDFReport({ petition, signatures = [] }) {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 20;
      const contentWidth = W - margin * 2;
      let y = 0;

      // --- HEADER BAND ---
      doc.setFillColor(30, 78, 172); // blue-700
      doc.rect(0, 0, W, 38, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Voice to Action", margin, 16);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Civic Petition Report", margin, 23);
      doc.text(`Generated: ${format(new Date(), "d MMMM yyyy")}`, margin, 29);
      doc.text(appHostname(), W - margin, 23, { align: "right" });

      y = 50;

      // --- PETITION TITLE ---
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(petition.title, contentWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 4;

      // Category / location badges (drawn as rounded rects)
      const drawBadge = (text, x, badgeY, r, g, b) => {
        const w = doc.getTextWidth(text) + 8;
        doc.setFillColor(r, g, b);
        doc.roundedRect(x, badgeY - 4.5, w, 6.5, 1.5, 1.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(text, x + 4, badgeY);
        return w + 4;
      };
      let bx = margin;
      if (petition.category) {
        bx += drawBadge(petition.category.replace(/_/g, " ").toUpperCase(), bx, y, 30, 78, 172);
      }
      if (petition.country_code) {
        bx += drawBadge(petition.country_code, bx, y, 5, 150, 105);
      }
      if (petition.target_type) {
        drawBadge(petition.target_type.replace(/_/g, " "), bx, y, 120, 53, 180);
      }
      y += 12;

      // --- DIVIDER ---
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(margin, y, W - margin, y);
      y += 8;

      // --- STATS ROW ---
      const stats = [
        { label: "Total Signatures", value: (petition.signature_count_total || 0).toLocaleString() },
        { label: "Verified Signers", value: (petition.signature_count_verified || 0).toLocaleString() },
        { label: "Goal", value: (petition.signature_goal || 1000).toLocaleString() },
        { label: "Progress", value: `${Math.min(Math.round(((petition.signature_count_total || 0) / (petition.signature_goal || 1000)) * 100), 100)}%` },
      ];
      const boxW = contentWidth / 4 - 2;
      stats.forEach(({ label, value }, i) => {
        const bxs = margin + i * (boxW + 2.5);
        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(bxs, y, boxW, 18, 2, 2, "F");
        doc.setTextColor(71, 85, 105); // slate-500
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(label, bxs + boxW / 2, y + 6, { align: "center" });
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(value, bxs + boxW / 2, y + 14, { align: "center" });
      });
      y += 26;

      // Progress bar
      const barW = contentWidth;
      const pct = Math.min((petition.signature_count_total || 0) / (petition.signature_goal || 1000), 1);
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(margin, y, barW, 4, 2, 2, "F");
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(margin, y, barW * pct, 4, 2, 2, "F");
      y += 12;

      // --- PETITION TARGET ---
      doc.setTextColor(30, 78, 172);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("TARGET", margin, y);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(petition.target_name || "—", margin + 20, y);
      y += 10;

      // --- SUMMARY ---
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, W - margin, y);
      y += 7;

      doc.setTextColor(30, 78, 172);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", margin, y);
      y += 6;

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const summaryLines = doc.splitTextToSize(petition.short_summary || "", contentWidth);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 5 + 6;

      // --- REQUESTED ACTION ---
      doc.setFillColor(239, 246, 255); // blue-50
      const actionLines = doc.splitTextToSize(petition.requested_action || "", contentWidth - 10);
      const boxH = actionLines.length * 5 + 12;
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, "F");
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, "S");
      doc.setTextColor(30, 78, 172);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Requested Action", margin + 5, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(9);
      doc.text(actionLines, margin + 5, y + 13);
      y += boxH + 10;

      // --- GEOGRAPHIC BREAKDOWN ---
      const validSigs = signatures.filter(s => !s.is_invalidated && !s.has_withdrawn && s.country_code);
      if (validSigs.length > 0) {
        const countryMap = {};
        validSigs.forEach(s => {
          countryMap[s.country_code] = (countryMap[s.country_code] || 0) + 1;
        });
        const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, W - margin, y);
        y += 7;

        doc.setTextColor(30, 78, 172);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Geographic Support Breakdown", margin, y);
        y += 7;

        const maxCount = topCountries[0][1];
        topCountries.forEach(([code, count], idx) => {
          if (y > 260) return; // page overflow guard
          const pctBar = count / maxCount;
          doc.setTextColor(71, 85, 105);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(`${idx + 1}.`, margin, y);
          doc.setTextColor(15, 23, 42);
          doc.setFont("helvetica", "bold");
          doc.text(code, margin + 7, y);
          doc.setFillColor(226, 232, 240);
          doc.roundedRect(margin + 18, y - 3.5, 80, 4, 1, 1, "F");
          doc.setFillColor(37, 99, 235);
          doc.roundedRect(margin + 18, y - 3.5, 80 * pctBar, 4, 1, 1, "F");
          doc.setTextColor(71, 85, 105);
          doc.setFont("helvetica", "normal");
          doc.text(`${count.toLocaleString()} (${Math.round((count / validSigs.length) * 100)}%)`, margin + 102, y);
          y += 7;
        });
        y += 4;
      }

      // --- FULL DESCRIPTION (page 2 if needed) ---
      if (petition.full_description) {
        if (y > 230) { doc.addPage(); y = 20; }
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, W - margin, y);
        y += 7;
        doc.setTextColor(30, 78, 172);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Full Description", margin, y);
        y += 6;
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(petition.full_description, contentWidth);
        // paginate description
        descLines.forEach(line => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(line, margin, y);
          y += 5;
        });
      }

      // --- FOOTER on each page ---
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 285, W, 12, "F");
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(`This document was generated by Voice to Action — ${appHostname()}`, margin, 291);
        doc.text(`Page ${p} of ${pageCount}`, W - margin, 291, { align: "right" });
      }

      const filename = `petition-report-${(petition.title || "report").toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40)}.pdf`;
      doc.save(filename);
      toast.success("PDF report downloaded!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={generatePDF}
      disabled={generating}
      className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
    >
      {generating ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="w-4 h-4 mr-2" />
      )}
      {generating ? "Generating Report…" : "Download PDF Report"}
    </Button>
  );
}