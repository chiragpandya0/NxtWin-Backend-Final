"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Loader2 } from "lucide-react";

export const AIPredictionPanel = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const runAI = async () => {
    setLoading(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 1200));
    // mock output
    const yes = Math.floor(45 + Math.random() * 20);
    const no = 100 - yes;
    const confidence = Math.floor(60 + Math.random() * 30);
    const reasoning = "Recent performance trends and news sentiment indicate a slight edge toward YES, but volatility remains.";
    setResult({ yes, no, confidence, reasoning });
    setLoading(false);
  };

  return (
    <aside className="animate-enter">
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="premium" className="w-full" onClick={runAI} disabled={loading}>
            {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>) : "Get AI Prediction"}
          </Button>

          {loading && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing latest data...</div>
          )}

          {result && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">YES</div>
                  <div className="text-2xl font-semibold">{result.yes}%</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">NO</div>
                  <div className="text-2xl font-semibold">{result.no}%</div>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Confidence</span><span>{result.confidence}%</span>
                </div>
                <Progress value={result.confidence} />
              </div>

              <Separator />
              <div className="text-sm text-muted-foreground">{result.reasoning}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
};

export default AIPredictionPanel;