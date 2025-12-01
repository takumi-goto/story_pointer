"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import Card, { CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SimilarTicketsSection from "./SimilarTicketsSection";
import PointCandidates from "./PointCandidates";
import SplitSuggestion from "./SplitSuggestion";
import { getPointColor, getPointDescription } from "@/lib/utils/fibonacci";
import type { EstimationResult, StoryPoint } from "@/types";

interface EstimateResultProps {
  result: EstimationResult;
  ticketKey: string;
  ticketSummary: string;
}

export default function EstimateResult({ result, ticketKey, ticketSummary }: EstimateResultProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;

    setIsExporting(true);

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f9fafb",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      // Handle multi-page if content is too long
      const scaledHeight = imgHeight * ratio;
      const pageHeight = pdfHeight - 20;

      if (scaledHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, scaledHeight);
      } else {
        let remainingHeight = scaledHeight;
        let sourceY = 0;
        let pageNum = 0;

        while (remainingHeight > 0) {
          if (pageNum > 0) {
            pdf.addPage();
          }

          const sliceHeight = Math.min(pageHeight, remainingHeight);
          const sourceSliceHeight = sliceHeight / ratio;

          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = imgWidth;
          tempCanvas.height = sourceSliceHeight;
          const tempCtx = tempCanvas.getContext("2d");

          if (tempCtx) {
            tempCtx.drawImage(
              canvas,
              0, sourceY,
              imgWidth, sourceSliceHeight,
              0, 0,
              imgWidth, sourceSliceHeight
            );

            const sliceData = tempCanvas.toDataURL("image/png");
            pdf.addImage(sliceData, "PNG", imgX, imgY, imgWidth * ratio, sliceHeight);
          }

          sourceY += sourceSliceHeight;
          remainingHeight -= pageHeight;
          pageNum++;
        }
      }

      const filename = `${ticketKey}_estimation_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDFの生成に失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Download Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={isExporting}
          isLoading={isExporting}
        >
          {isExporting ? "PDF生成中..." : "PDFでダウンロード"}
        </Button>
      </div>

      {/* Content to be exported */}
      <div ref={contentRef} className="space-y-6">
        {/* Main Estimation Result */}
        <Card>
          <div>
            <CardTitle>推定結果</CardTitle>
            <CardDescription className="mt-1">
              {ticketKey}: {ticketSummary}
            </CardDescription>
          </div>

          <div className="mt-6 flex items-center gap-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-bold ${getPointColor(result.estimatedPoints)}`}>
                {result.estimatedPoints}
              </div>
              <div className="mt-2 text-sm text-gray-600">ストーリーポイント</div>
            </div>

            <div className="flex-1">
              <p className="text-sm text-gray-500">
                {getPointDescription(result.estimatedPoints as StoryPoint)}
              </p>
              {result.baseline && (
                <p className="text-sm text-gray-600 mt-2">
                  ベースライン: <span className="font-medium">{result.baseline.key}</span> ({result.baseline.points}pt)
                </p>
              )}
            </div>
          </div>

          {/* Point Candidates */}
          {result.pointCandidates && result.pointCandidates.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <PointCandidates
                candidates={result.pointCandidates}
                selectedPoint={result.estimatedPoints}
              />
            </div>
          )}
        </Card>

        {/* Split Suggestion */}
        {result.shouldSplit && result.splitSuggestion && (
          <SplitSuggestion suggestion={result.splitSuggestion} />
        )}

        {/* Reasoning */}
        <Card>
          <CardTitle>推定理由</CardTitle>
          <p className="mt-4 text-gray-700 whitespace-pre-wrap">{result.reasoning}</p>
        </Card>

        {/* Similar Tickets Analysis */}
        {result.baseline && (
          <Card>
            <CardTitle>類似チケット分析</CardTitle>
            <CardDescription className="mb-4">
              過去のチケットとの比較に基づいてポイントを推定しました
            </CardDescription>
            <SimilarTicketsSection
              baseline={result.baseline}
              similarTickets={result.similarTickets || []}
            />
          </Card>
        )}

        {/* Footer for PDF */}
        <div className="text-center text-xs text-gray-400 pt-4">
          Generated by Story Pointer on {new Date().toLocaleDateString("ja-JP")}
        </div>
      </div>
    </div>
  );
}
