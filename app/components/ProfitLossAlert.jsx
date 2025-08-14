"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";

export function ProfitLossAlert({
  isOpen,
  onClose,
  eventTitle,
  resolution,
  profitLoss,
  previousBalance,
  newBalance,
  winningOrders = [],
  losingOrders = [],
  refundedOrders = [],
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const isProfit = profitLoss > 0;
  const isLoss = profitLoss < 0;
  const isBreakEven = profitLoss === 0;

  const getStatusIcon = () => {
    if (isProfit) return <TrendingUp className="h-6 w-6 text-green-500" />;
    if (isLoss) return <TrendingDown className="h-6 w-6 text-red-500" />;
    return <Minus className="h-6 w-6 text-gray-500" />;
  };

  const getStatusColor = () => {
    if (isProfit) return "text-green-600";
    if (isLoss) return "text-red-600";
    return "text-gray-600";
  };

  const getStatusBg = () => {
    if (isProfit) return "bg-green-50 dark:bg-green-950/20 border-green-200";
    if (isLoss) return "bg-red-50 dark:bg-red-950/20 border-red-200";
    return "bg-gray-50 dark:bg-gray-950/20 border-gray-200";
  };

  const getStatusText = () => {
    if (isProfit) return "Congratulations!";
    if (isLoss) return "Better luck next time";
    return "Break Even";
  };

  const formatCurrency = (amount) => `₹${Math.abs(amount).toFixed(2)}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[90vw] max-h-[85vh] overflow-y-auto p-0 m-4">
        <div className={`${getStatusBg()} border-2 rounded-lg overflow-hidden`}>
          {/* Header */}
          <div className="p-4 text-center">
            {/* Status Icon */}
            <div className="mb-2">{getStatusIcon()}</div>

            {/* Title */}
            <DialogHeader className="space-y-1">
              <DialogTitle className={`text-lg font-bold ${getStatusColor()}`}>
                {getStatusText()}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Event has been resolved
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="px-4 pb-4 space-y-3">
            {/* Event Details */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="text-center">
                  <h3 className="font-medium text-xs text-muted-foreground mb-2">
                    Event Result
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    <Award className="h-3 w-3 text-amber-500" />
                    <Badge
                      variant="default"
                      className={`text-xs ${
                        resolution === "Yes" ? "bg-green-500" : "bg-red-500"
                      } text-white`}
                    >
                      {resolution} Won
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Profit/Loss Display */}
                <div className="text-center space-y-1">
                  <h3 className="font-medium text-xs text-muted-foreground">
                    Your Net Result
                  </h3>
                  <div className={`text-xl font-bold ${getStatusColor()}`}>
                    {isProfit && "+"}
                    {isLoss && "-"}
                    {isBreakEven && "±"}
                    {formatCurrency(profitLoss)}
                  </div>
                  {isProfit && (
                    <p className="text-xs text-green-600">You made a profit!</p>
                  )}
                  {isLoss && (
                    <p className="text-xs text-red-600">You had a loss</p>
                  )}
                  {isBreakEven && (
                    <p className="text-xs text-gray-600">No gain, no loss</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            {(winningOrders.length > 0 ||
              losingOrders.length > 0 ||
              refundedOrders.length > 0) && (
              <Card>
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-medium text-xs text-muted-foreground text-center">
                    Order Summary
                  </h3>

                  {winningOrders.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 font-medium">
                          Winning Orders ({winningOrders.length})
                        </span>
                      </div>
                      {winningOrders.slice(0, 2).map((order, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded"
                        >
                          <span>
                            {order.quantity} × {order.optionKey} @ ₹
                            {order.price}
                          </span>
                          <span className="text-green-600 font-medium">
                            +₹{order.winnings?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {winningOrders.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{winningOrders.length - 2} more winning orders
                        </p>
                      )}
                    </div>
                  )}

                  {losingOrders.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <XCircle className="h-3 w-3 text-red-500" />
                        <span className="text-red-600 font-medium">
                          Losing Orders ({losingOrders.length})
                        </span>
                      </div>
                      {losingOrders.slice(0, 2).map((order, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-xs bg-red-50 dark:bg-red-950/20 p-2 rounded"
                        >
                          <span>
                            {order.quantity} × {order.optionKey} @ ₹
                            {order.price}
                          </span>
                          <span className="text-red-600">
                            -₹{(order.price * order.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {losingOrders.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{losingOrders.length - 2} more losing orders
                        </p>
                      )}
                    </div>
                  )}

                  {refundedOrders.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <AlertCircle className="h-3 w-3 text-blue-500" />
                        <span className="text-blue-600 font-medium">
                          Refunded Orders ({refundedOrders.length})
                        </span>
                      </div>
                      {refundedOrders.slice(0, 2).map((order, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-xs bg-blue-50 dark:bg-blue-950/20 p-2 rounded"
                        >
                          <span>
                            {order.quantity} × {order.optionKey} @ ₹
                            {order.price}
                          </span>
                          <span className="text-blue-600">
                            +₹{order.refund?.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {refundedOrders.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{refundedOrders.length - 2} more refunded orders
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Close Button */}
            <Button onClick={handleClose} className="w-full" size="sm">
              Continue Trading
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
