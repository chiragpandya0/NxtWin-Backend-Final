"use client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Bot, TrendingUp, TrendingDown, Crown, Award, Target, AlertTriangle, CheckCircle2, XCircle, BarChart3 } from "lucide-react";

export function AIResultsCard({ result }) {
  const getWinnerColor = (winner) => {
    if (winner === "A") return "text-green-600";
    if (winner === "B") return "text-amber-600";
    return "text-gray-600";
  };

  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return { text: "High", variant: "default" };
    if (confidence >= 0.6) return { text: "Medium", variant: "secondary" };
    return { text: "Low", variant: "destructive" };
  };

  const confidenceInfo = getConfidenceLevel(result.confidence);

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              AI Prediction
            </label>
            <Badge
              variant="outline"
              className={`w-full justify-center py-2 ${getWinnerColor(
                result.winner
              )}`}
            >
              {result.winner === "Tie"
                ? "Too Close to Call"
                : result.winner === "A"
                ? result.optionA
                : result.optionB}
            </Badge>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Confidence
            </label>
            <div className="space-y-2">
              <Badge
                variant={confidenceInfo.variant}
                className="w-full justify-center py-2"
              >
                {confidenceInfo.text} ({Math.round(result.confidence * 100)}%)
              </Badge>
              <Progress value={result.confidence * 100} className="h-2" />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h5 className="font-medium mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Reasoning
          </h5>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.reasoning}
          </p>
        </div>

        {result.market_insights && result.market_insights.length > 0 && (
          <>
            <Separator />
            <div>
              <h5 className="font-medium mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Market Insights
              </h5>
              <ul className="space-y-2">
                {result.market_insights.map((insight, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeleton for market data
