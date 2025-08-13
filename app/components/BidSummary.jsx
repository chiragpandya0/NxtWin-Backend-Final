"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Separator } from "./ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Award,
  X,
  RotateCcw,
  DollarSign,
} from "lucide-react";

export default function BidSummary({
  bidId,
  clerkUserId,
  isVisible,
  onClose,
  resolution,
}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && bidId && clerkUserId) {
      fetchBidSummary();
    }
  }, [isVisible, bidId, clerkUserId]);

  const fetchBidSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nxtwin-backend-final.onrender.com/api/get/bid-summary/${clerkUserId}/${bidId}`
      );

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      } else {
        console.error("Failed to fetch bid summary");
      }
    } catch (error) {
      console.error("Error fetching bid summary:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  const getOrderTypeInfo = (order) => {
    if (order.type === "win") {
      return {
        icon: <TrendingUp className="h-4 w-4 text-green-600" />,
        label: "Won",
        amount: `+₹${order.winnings?.toFixed(2) || "0.00"}`,
        className: "text-green-600",
      };
    } else if (order.type === "refund") {
      return {
        icon: <RotateCcw className="h-4 w-4 text-blue-600" />,
        label: "Refunded",
        amount: `+₹${order.refund?.toFixed(2) || "0.00"}`,
        className: "text-blue-600",
      };
    } else {
      return {
        icon: <TrendingDown className="h-4 w-4 text-red-600" />,
        label: "Lost",
        amount: `-₹${(order.price * order.quantity).toFixed(2)}`,
        className: "text-red-600",
      };
    }
  };

  const netProfitLoss = summary
    ? summary.totalWinnings + summary.totalRefunds - summary.totalInvested
    : 0;

  const isProfit = netProfitLoss > 0;
  const isBreakeven = netProfitLoss === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <CardTitle>Bid Summary</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Event resolved: <Badge variant="outline">{resolution}</Badge> won
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading summary...</p>
            </div>
          ) : summary ? (
            <>
              {/* Net Profit/Loss Card */}
              <Card
                className={`border-2 ${
                  isProfit
                    ? "border-green-200 bg-green-50 dark:bg-green-950/20"
                    : isBreakeven
                    ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
                    : "border-red-200 bg-red-50 dark:bg-red-950/20"
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DollarSign
                      className={`h-6 w-6 ${
                        isProfit
                          ? "text-green-600"
                          : isBreakeven
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    />
                    <h3 className="text-lg font-semibold">
                      {isProfit
                        ? "Profit"
                        : isBreakeven
                        ? "Break Even"
                        : "Loss"}
                    </h3>
                  </div>
                  <div
                    className={`text-3xl font-bold ${
                      isProfit
                        ? "text-green-600"
                        : isBreakeven
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {isProfit ? "+" : ""}₹{Math.abs(netProfitLoss).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {isProfit
                      ? "Congratulations! You made a profit 🎉"
                      : isBreakeven
                      ? "You broke even on this market"
                      : "Better luck next time"}
                  </p>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{summary.totalInvested.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Invested</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{summary.totalWinnings.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Won</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{summary.totalRefunds.toFixed(2)}
                    </div>
                    <p className="text-sm text-muted-foreground">Refunded</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Order Details */}
              <div>
                <h4 className="font-semibold mb-4">Order Details</h4>
                {summary.orders && summary.orders.length > 0 ? (
                  <div className="space-y-2">
                    {/* Mobile View */}
                    <div className="md:hidden space-y-3">
                      {summary.orders.map((order, index) => {
                        const orderInfo = getOrderTypeInfo(order);
                        return (
                          <Card key={index} className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    order.optionKey === "Yes"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={
                                    order.optionKey === "Yes"
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }
                                >
                                  {order.optionKey.toUpperCase()}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  {orderInfo.icon}
                                  <span className="text-sm font-medium">
                                    {orderInfo.label}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`font-semibold ${orderInfo.className}`}
                              >
                                {orderInfo.amount}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ₹{order.price.toFixed(2)} × {order.quantity} = ₹
                              {(order.price * order.quantity).toFixed(2)}
                            </div>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Option</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Invested</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.orders.map((order, index) => {
                            const orderInfo = getOrderTypeInfo(order);
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <Badge
                                    variant={
                                      order.optionKey === "Yes"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className={
                                      order.optionKey === "Yes"
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }
                                  >
                                    {order.optionKey.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>₹{order.price.toFixed(2)}</TableCell>
                                <TableCell>{order.quantity}</TableCell>
                                <TableCell>
                                  ₹{(order.price * order.quantity).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {orderInfo.icon}
                                    <span className="text-sm">
                                      {orderInfo.label}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell
                                  className={`text-right font-medium ${orderInfo.className}`}
                                >
                                  {orderInfo.amount}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No orders found for this market
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No summary available</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
