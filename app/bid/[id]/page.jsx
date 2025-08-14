"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import io from "socket.io-client";
import {
  Crown,
  Award,
  TrendingUp,
  TrendingDown,
  Bot,
  MessageCircle,
  BarChart3,
  Clock,
  DollarSign,
  Plus,
  Minus,
  RotateCcw,
  Loader2,
  Activity,
  Target,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  History,
  BookOpen,
  // Add weather-related icons
  Cloud,
  Sun,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  Eye,
} from "lucide-react";

// UI Components
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import { Progress } from "../../components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

import {
  incrementPrice,
  decrementPrice,
  formatPrice,
  PRICING_CONFIG,
} from "../../utils/pricing";

// Import the new component
import { ProfitLossAlert } from "../../components/ProfitLossAlert";

// Add this helper function near the top with other utility functions
const calculateDynamicPricing = (orderDepth) => {
  const yesOrders = orderDepth.yes || [];
  const noOrders = orderDepth.no || [];

  // Find the price with maximum pending orders
  let maxQuantity = 0;
  let dominantPrice = null;
  let dominantOption = null;

  // Check YES orders
  yesOrders.forEach((order) => {
    if (order.quantity > maxQuantity) {
      maxQuantity = order.quantity;
      dominantPrice = order.price;
      dominantOption = "YES";
    }
  });

  // Check NO orders
  noOrders.forEach((order) => {
    if (order.quantity > maxQuantity) {
      maxQuantity = order.quantity;
      dominantPrice = order.price;
      dominantOption = "NO";
    }
  });

  // Calculate dynamic pricing
  let dynamicYesPrice = 5.0; // Default fallback
  let dynamicNoPrice = 5.0;

  if (dominantPrice !== null && dominantOption) {
    if (dominantOption === "YES") {
      dynamicYesPrice = dominantPrice;
      dynamicNoPrice = 10 - dominantPrice;
    } else {
      dynamicNoPrice = dominantPrice;
      dynamicYesPrice = 10 - dominantPrice;
    }
  }

  return {
    dynamicYesPrice,
    dynamicNoPrice,
    dominantOption,
    dominantPrice,
    maxQuantity,
    fallbackToDefault: dominantPrice === null,
  };
};

// Replace the getAvailableQuantityAtPrice function (around line 88)
// Replace the getAvailableQuantityAtPrice function (around line 125)
const getAvailableQuantityAtPrice = (orderDepth, selectedOption, price) => {
  // Calculate complementary price (YES + NO = 10)
  const complementaryPrice = price;

  // Get orders from the OPPOSITE option at the COMPLEMENTARY price
  // This is because YES orders at price X can match with NO orders at price (10-X)
  const oppositeOptionOrders =
    selectedOption === "YES" ? orderDepth.yes : orderDepth.no;

  // Find orders at the COMPLEMENTARY price (not same price) and sum their quantities
  const availableQuantity = oppositeOptionOrders
    .filter((order) => Math.abs(order.price - complementaryPrice) < 0.01) // Small epsilon for float comparison
    .reduce((total, order) => total + order.quantity, 0);

  return availableQuantity;
};

// Order Book Component - Updated with clearer labels
function OrderBook({ orderDepth, currentYesPrice }) {
  const formatQuantity = (qty) => {
    if (qty >= 1000) return `${(qty / 1000).toFixed(1)}k`;
    return qty.toString();
  };

  const getBarWidth = (quantity, maxQuantity) => {
    return Math.max((quantity / maxQuantity) * 100, 2);
  };

  const yesOrders = orderDepth.yes || [];
  const noOrders = orderDepth.no || [];

  const maxYesQty = Math.max(...yesOrders.map((o) => o.quantity), 1);
  const maxNoQty = Math.max(...noOrders.map((o) => o.quantity), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4" />
          Order Book
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* YES Orders */}
          <div className="border-r border-border/50">
            <div className="bg-green-50 dark:bg-green-950/20 p-3 border-b">
              <div className="flex justify-between text-xs font-medium">
                <span>PRICE</span>
                <span>Available YES Orders</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Place NO order at these prices to match
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {yesOrders.length > 0 ? (
                yesOrders.map((order, index) => (
                  <div
                    key={index}
                    className="relative flex justify-between items-center p-2 border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    {/* Quantity bar */}
                    <div
                      className="absolute left-0 top-0 h-full bg-green-100 dark:bg-green-900/30 transition-all duration-300"
                      style={{
                        width: `${getBarWidth(order.quantity, maxYesQty)}%`,
                      }}
                    />

                    <div className="relative z-10 flex justify-between w-full">
                      <span className="text-sm font-medium text-green-600">
                        ₹{order.price.toFixed(2)}
                      </span>
                      <span className="text-sm font-mono">
                        {formatQuantity(order.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No YES orders available
                </div>
              )}
            </div>
          </div>

          {/* NO Orders */}
          <div>
            <div className="bg-red-50 dark:bg-red-950/20 p-3 border-b">
              <div className="flex justify-between text-xs font-medium">
                <span>PRICE</span>
                <span>Available NO Orders</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Place YES order at these prices to match
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {noOrders.length > 0 ? (
                noOrders.map((order, index) => (
                  <div
                    key={index}
                    className="relative flex justify-between items-center p-2 border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    {/* Quantity bar */}
                    <div
                      className="absolute left-0 top-0 h-full bg-red-100 dark:bg-red-900/30 transition-all duration-300"
                      style={{
                        width: `${getBarWidth(order.quantity, maxNoQty)}%`,
                      }}
                    />

                    <div className="relative z-10 flex justify-between w-full">
                      <span className="text-sm font-medium text-red-600">
                        ₹{order.price.toFixed(2)}
                      </span>
                      <span className="text-sm font-mono">
                        {formatQuantity(order.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No NO orders available
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// User Order History Component
function UserOrderHistory({ userOrders }) {
  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case "filled":
        return (
          <Badge
            variant="default"
            className=" border-green-400 bg-transparnent text-green-400 hover:bg-green-600"
          >
            Executed
          </Badge>
        );
      case "partly_filled":
        return (
          <Badge
            variant="default"
            className="  border-b-yellow-500 bg-transparnent text-green-400 hover:bg-yellow-600"
          >
            Partly Filled
          </Badge>
        );
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <History className="h-4 w-4" />
          Your Orders
        </CardTitle>
      </CardHeader>
      <CardContent>
        {userOrders.length > 0 ? (
          <div className="space-y-2">
            {/* Mobile view */}
            <div className="md:hidden space-y-3">
              {userOrders.map((order) => (
                <Card key={order.id} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          order.option === "Yes" ? "default" : "secondary"
                        }
                        className={
                          order.option === "Yes" ? "bg-green-500" : "bg-red-500"
                        }
                      >
                        {order.option.toUpperCase()}
                      </Badge>
                      {getStatusBadge(order.status)}
                    </div>
                    <span className="text-sm font-medium">
                      ₹{(order.price * order.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Price: ₹{order.price.toFixed(2)} × {order.quantity}
                    </div>
                    <div>{new Date(order.timestamp).toLocaleString()}</div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop view */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Option</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Badge
                          variant={
                            order.option === "Yes" ? "default" : "secondary"
                          }
                          className={
                            order.option === "Yes"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }
                        >
                          {order.option.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{order.price.toFixed(2)}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>
                        ₹{(order.price * order.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No orders yet</h3>
            <p className="text-sm">Your order history will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Update EventResolutionPanel component
function EventResolutionPanel({ market, clerkUser, setMarket }) {
  const [isResolving, setIsResolving] = useState(false);
  const [isUpdatingWeather, setIsUpdatingWeather] = useState(false);

  // Check if user is admin (modify this logic as needed)
  const isAdmin = clerkUser?.id === "user_31EJ9jzTGNPdgsTBT6YFl96E8of";

  // Use market status directly from the database
  const isResolved = market?.status === "resolved";

  const handleResolveEvent = async (resolution) => {
    if (!market || !clerkUser?.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to resolve this event as "${resolution}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsResolving(true);

    try {
      const response = await fetch(
        "https://nxtwin-backend-final.onrender.com/api/resolve-event",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bidId: market.id,
            resolution,
            clerkId: clerkUser.id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Update local market state immediately
        setMarket((prev) => ({
          ...prev,
          status: "resolved",
          resolution: resolution,
          resolvedAt: new Date(),
        }));

        // Check if this event resolution is for the current user (has profit/loss data)
        if (
          data.profitLoss !== undefined &&
          data.previousBalance !== undefined
        ) {
          // Show profit/loss alert for the current user
          setProfitLossAlert({
            isOpen: true,
            eventTitle: data.eventTitle || market?.title || "Event",
            resolution: data.resolution,
            profitLoss: data.profitLoss,
            previousBalance: data.previousBalance,
            newBalance: data.newBalance,
            winningOrders: data.winningOrders || [],
            losingOrders: data.losingOrders || [],
            refundedOrders: data.refundedOrders || [],
          });

          // Update balance if provided
          if (data.newBalance !== undefined) {
            setBalance(data.newBalance);
          }
        } else {
          // Show general resolution toast for other users
          toast.success(`🎉 Event Resolved: ${data.resolution} Won!`, {
            description: "Check your balance for any winnings",
            duration: 10000,
          });
        }
      } else {
        toast.error(`Failed to resolve event: ${data.error}`, {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error resolving event:", error);
      toast.error("Network error. Please try again.", {
        duration: 4000,
      });
    } finally {
      setIsResolving(false);
    }
  };

  // NEW: Handle weather update
  const handleUpdateWeather = async () => {
    if (!clerkUser?.id) return;

    setIsUpdatingWeather(true);

    try {
      const response = await fetch(
        "https://nxtwin-backend-final.onrender.com/api/admin/update-weather",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: clerkUser.id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("🌤️ Market Data Updated!", {
          description: "Weather data has been refreshed and sent to all users",
          duration: 5000,
        });
      } else {
        toast.error(`Failed to update weather: ${data.error}`, {
          description: data.details || "Please try again",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error updating weather:", error);
      toast.error("Network error. Please try again.", {
        duration: 4000,
      });
    } finally {
      setIsUpdatingWeather(false);
    }
  };

  // Show resolution card for everyone if event is resolved
  if (isResolved) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300 text-base">
            <Award className="h-4 w-4" />
            Event Resolved
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-4">
            <Badge
              variant="default"
              className="bg-green-500 hover:bg-green-600 text-white mb-3"
            >
              Winner: {market?.resolution || "Unknown"}
            </Badge>
            <p className="text-sm text-muted-foreground">
              All payouts have been distributed
            </p>
            {market?.resolvedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Resolved on {new Date(market.resolvedAt).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show admin controls to admins for unresolved events
  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="border-gray-200 bg-gray-50 dark:bg-gray-800/20 dark:border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-gray-700 dark:text-gray-200 text-base">
          <Crown className="h-4 w-4" />
          Admin Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <Alert className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Admin-only controls. Event resolution is permanent.
          </AlertDescription>
        </Alert>

        {/* Event Resolution Controls */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Event Resolution
          </h4>
          <div className="flex gap-2">
            <Button
              onClick={() => handleResolveEvent("Yes")}
              disabled={isResolving}
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              {isResolving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <TrendingUp className="mr-1 h-3 w-3" />
              )}
              Resolve YES
            </Button>

            <Button
              onClick={() => handleResolveEvent("No")}
              disabled={isResolving}
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {isResolving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              Resolve NO
            </Button>
          </div>
        </div>

        {/* Market Data Controls */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Market Data
          </h4>
          <Button
            onClick={handleUpdateWeather}
            disabled={isUpdatingWeather}
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            {isUpdatingWeather ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Cloud className="mr-1 h-3 w-3" />
                Update Market Data
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced OrderPanel component
function OrderPanel({
  market,
  balance,
  setBalance,
  onOrderPlaced,
  clerkUser,
  orderDepth,
}) {
  const [selectedOption, setSelectedOption] = useState("YES");
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Use dynamic pricing from market object (which is updated via socket)
  const yesPrice = market?.yesPrice || 5;
  const noPrice = market?.noPrice || 10 - yesPrice; // Use noPrice from market if available

  const getCurrentPrice = () => {
    if (customPrice !== null) return customPrice;
    return selectedOption === "YES" ? yesPrice : noPrice;
  };

  const currentPrice = getCurrentPrice();
  const cost = currentPrice * quantity;
  const potentialReturn = quantity * PRICING_CONFIG.MAX_PAYOUT;

  // Calculate available quantity for immediate matching
  const availableQuantity = getAvailableQuantityAtPrice(
    orderDepth,
    selectedOption,
    currentPrice
  );
  const immediatelyFillableQuantity = Math.min(quantity, availableQuantity);
  const pendingQuantity = Math.max(0, quantity - availableQuantity);

  const handleOptionChange = (option) => {
    setSelectedOption(option);
    setCustomPrice(null);
  };

  const handleIncreasePrice = () => {
    const newPrice = incrementPrice(currentPrice);
    setCustomPrice(newPrice);
  };

  const handleDecreasePrice = () => {
    const newPrice = decrementPrice(currentPrice);
    setCustomPrice(newPrice);
  };

  const handlePlaceOrder = async () => {
    if (!market) return;

    // Ensure quantity is valid
    const validQuantity = Math.max(1, Math.floor(Number(quantity)));
    if (validQuantity !== quantity) {
      setQuantity(validQuantity);
    }

    const validPrice = Number(currentPrice);
    const cost = validPrice * validQuantity;

    if (cost <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (cost > balance) {
      toast.error("Insufficient balance to place this order");
      return;
    }

    if (!clerkUser?.id) {
      toast.error("Please sign in to place orders");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderData = {
        bidId: market.id,
        clerkId: clerkUser.id,
        optionKey: selectedOption === "YES" ? "Yes" : "No",
        price: validPrice,
        quantity: validQuantity,
      };

      console.log("Placing order with data:", orderData);

      const orderResponse = await fetch(
        "https://nxtwin-backend-final.onrender.com/api/order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        }
      );

      let orderResult;
      try {
        orderResult = await orderResponse.json();
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError);
        throw new Error("Server returned invalid response");
      }

      console.log("Order response:", orderResult);

      if (orderResponse.ok) {
        // Update balance from the response
        if (orderResult.remainingBalance !== undefined) {
          setBalance(orderResult.remainingBalance);
        }

        const optionText = selectedOption === "YES" ? "Yes" : "No";

        // Enhanced success toast with more details
        toast.success("Your Order was Placed Successfully!", {
          description: `${validQuantity} ${optionText} share${
            validQuantity > 1 ? "s" : ""
          } @ ₹${validPrice.toFixed(2)} each • Total: ₹${cost.toFixed(2)}`,
          duration: 6000,
        });

        // Call the order placed handler
        onOrderPlaced?.();

        // Reset form
        setQuantity(1);
        setCustomPrice(null);
      } else {
        const errorMsg = orderResult.error || "Failed to place order";
        console.error("Order failed:", orderResult);
        toast.error(`❌ Order Failed: ${errorMsg}`, {
          description: orderResult.details || "Please try again",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Error placing order:", error);

      if (error.name === "TypeError" && error.message.includes("fetch")) {
        toast.error("🔌 Connection Error", {
          description:
            "Cannot connect to server. Please check if the backend is running.",
          duration: 5000,
        });
      } else {
        toast.error("⚠️ Network Error", {
          description: error.message || "Please try again in a moment.",
          duration: 4000,
        });
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!market) {
    return (
      <Card className="h-96">
        <CardContent className="flex justify-center items-center h-full">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading order panel...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if event is resolved
  const isEventResolved = market?.status === "resolved";

  return (
    <Card>
      {" "}
      {/* Changed from top-6 to top-20 */}
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Target className="h-5 w-5" />
          {isEventResolved ? "Event Resolved" : "Place Your Bid"}
        </CardTitle>
        <CardDescription>
          {isEventResolved
            ? "Trading has ended for this market"
            : "Choose your prediction and stake amount"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Authentication Alert */}
        {!clerkUser?.id && !isEventResolved && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Please sign in to place orders</AlertDescription>
          </Alert>
        )}

        {/* Event Resolved Alert */}
        {isEventResolved && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <Award className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              This event has been resolved. Winner:{" "}
              <strong>{market?.resolution || "Unknown"}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* YES/NO Toggle with dynamic prices */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={selectedOption === "YES" ? "default" : "outline"}
            onClick={() => handleOptionChange("YES")}
            className={`h-14 ${
              selectedOption === "YES"
                ? "bg-green-400 hover:bg-green-500 text-black"
                : "border-green-200 text-green-500 hover:bg-green-50"
            }`}
            disabled={isPlacingOrder || isEventResolved}
          >
            <div className="flex flex-col items-center">
              <span className="font-bold">YES</span>
              <span className="text-xs">₹{formatPrice(yesPrice)}</span>
            </div>
          </Button>

          <Button
            variant={selectedOption === "NO" ? "default" : "outline"}
            onClick={() => handleOptionChange("NO")}
            className={`h-14 ${
              selectedOption === "NO"
                ? "bg-red-500 hover:bg-red-500 text-white"
                : "border-red-200 text-red-400 hover:bg-red-50"
            }`}
            disabled={isPlacingOrder || isEventResolved}
          >
            <div className="flex flex-col items-center">
              <span className="font-bold">NO</span>
              <span className="text-xs">₹{formatPrice(noPrice)}</span>
            </div>
          </Button>
        </div>

        {/* Price Controls */}
        {!isEventResolved && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Price</label>
                {customPrice !== null && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Custom
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDecreasePrice}
                  disabled={
                    currentPrice <= PRICING_CONFIG.MIN_PRICE || isPlacingOrder
                  }
                  aria-label="Decrease price"
                >
                  <Minus className="h-3 w-3" />
                </Button>

                <div className="px-4 py-2 bg-muted rounded-md min-w-[80px] text-center font-mono">
                  ₹{formatPrice(currentPrice)}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIncreasePrice}
                  disabled={
                    currentPrice >= PRICING_CONFIG.MAX_PRICE || isPlacingOrder
                  }
                  aria-label="Increase price"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Available Quantity Display */}
            {availableQuantity > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">
                    Available Quantity:
                  </span>
                  <Badge
                    variant="default"
                    className="bg-blue-400 hover:bg-blue-500"
                  >
                    {availableQuantity} shares
                  </Badge>
                </div>
              </div>
            )}

            {/* Quantity Controls */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isPlacingOrder}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </Button>

                <div className="px-4 py-2 bg-muted rounded-md min-w-[60px] text-center font-mono">
                  {Math.max(1, quantity)}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity((q) => Math.max(1, q + 1))}
                  disabled={isPlacingOrder}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Order Matching Info */}
            {quantity > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs">
                {immediatelyFillableQuantity > 0 && (
                  <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                    <span>Instant fill:</span>
                    <span className="font-medium">
                      {immediatelyFillableQuantity} shares
                    </span>
                  </div>
                )}
                {pendingQuantity > 0 && (
                  <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
                    <span>Will be pending:</span>
                    <span className="font-medium">
                      {pendingQuantity} shares
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Reset to market price */}
            {customPrice !== null && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomPrice(null)}
                  className="text-xs"
                  disabled={isPlacingOrder}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset to market price
                </Button>
              </div>
            )}
          </div>
        )}

        {!isEventResolved && <Separator />}

        {/* Order Summary */}
        {!isEventResolved && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>You pay:</span>
              <span className="font-bold">₹{cost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>You Get (after 10% fee):</span>
              <span className="font-bold text-green-400">
                ₹{(cost + (potentialReturn - cost) * 0.9).toFixed(2)}
              </span>
            </div>

            {customPrice !== null && (
              <p className="text-xs text-muted-foreground">
                Using custom price (Market: ₹
                {formatPrice(selectedOption === "YES" ? yesPrice : noPrice)})
              </p>
            )}
          </div>
        )}

        {/* Place Order Button */}
        <Button
          onClick={handlePlaceOrder}
          className={`w-full h-12 text-lg font-bold ${
            isEventResolved
              ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed"
              : ""
          }`}
          disabled={
            cost > balance ||
            !clerkUser?.id ||
            isPlacingOrder ||
            isEventResolved
          }
          size="lg"
          style={isEventResolved ? { cursor: "not-allowed" } : {}}
        >
          {isEventResolved ? (
            "Event Over"
          ) : isPlacingOrder ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing Order...
            </>
          ) : !clerkUser?.id ? (
            "Sign In Required"
          ) : cost > balance ? (
            "Insufficient Balance"
          ) : immediatelyFillableQuantity === quantity ? (
            `Buy @ ₹${cost.toFixed(2)}`
          ) : immediatelyFillableQuantity > 0 ? (
            `Place Order @ ₹${cost.toFixed(2)}`
          ) : (
            `Place Order @ ₹${cost.toFixed(2)}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Enhanced AI Results Card
function AIResultsCard({ result }) {
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
function MarketSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-start gap-6">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <div className="w-72 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Real-time Connection Status Component
function ConnectionStatus({ isConnected, userCount }) {
  return (
    <Badge
      variant={isConnected ? "default" : "destructive"}
      className="flex items-center gap-1"
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Live • {userCount} Patricipants
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Offline
        </>
      )}
    </Badge>
  );
}

// Updated Weather Component - News feed style with stacked cards
function WeatherWidget({ socket }) {
  const [weatherHistory, setWeatherHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch weather from database
  const fetchWeatherFromDB = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        "https://nxtwin-backend-final.onrender.com/api/get/weather"
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "No weather data available. Please ask admin to update market data."
          );
        }
        throw new Error("Failed to fetch weather data");
      }

      const data = await response.json();

      // Set the weather history from database (don't add to existing, replace it)
      if (data.weatherHistory && data.weatherHistory.length > 0) {
        const transformedHistory = data.weatherHistory.map(
          (weather, index) => ({
            ...weather,
            id: weather._id || `${Date.now()}_${index}`,
            fetchedAt: new Date(weather.fetchedAt || weather.createdAt),
          })
        );

        console.log("Setting weather history from DB:", transformedHistory);
        setWeatherHistory(transformedHistory);
      }
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch from database
    fetchWeatherFromDB();
  }, []);

  // Listen for real-time weather updates via socket
  useEffect(() => {
    if (socket?.current) {
      socket.current.on("weatherUpdate", (data) => {
        console.log("Received weather update:", data);

        // Add new weather data to history (only add if it's truly new)
        setWeatherHistory((prev) => {
          const newEntry = {
            ...data.weather,
            id: data.weather._id || Date.now(),
            fetchedAt: new Date(
              data.weather.fetchedAt || data.weather.createdAt
            ),
          };

          // Check if this entry already exists to avoid duplicates
          const existingEntry = prev.find(
            (entry) =>
              entry.id === newEntry.id ||
              entry.fetchedAt.getTime() === newEntry.fetchedAt.getTime()
          );

          if (existingEntry) {
            console.log("Weather entry already exists, not adding duplicate");
            return prev;
          }

          console.log("Adding new weather entry:", newEntry);
          // Add new entry at the beginning and keep only 4 latest
          const updated = [newEntry, ...prev].slice(0, 4);
          return updated;
        });

        setError(null);

        // Show notification to user
        toast.success("🌤️ Weather data updated!", {
          description: "New market data has been refreshed by admin",
          duration: 4000,
        });
      });

      return () => {
        socket.current?.off("weatherUpdate");
      };
    }
  }, [socket]);

  const getWeatherIcon = (description) => {
    const desc = description?.toLowerCase() || "";
    if (desc.includes("sunny") || desc.includes("clear"))
      return <Sun className="h-4 w-4 text-yellow-500" />;
    if (desc.includes("cloud"))
      return <Cloud className="h-4 w-4 text-gray-500" />;
    if (desc.includes("rain"))
      return <Droplets className="h-4 w-4 text-blue-500" />;
    return <Cloud className="h-4 w-4 text-gray-500" />;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading && weatherHistory.length === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-2">
              Loading weather...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && weatherHistory.length === 0) {
    return (
      <Card className="mb-4 border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (weatherHistory.length === 0) {
    return (
      <Card className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">
              No weather data available. Ask admin to update market data.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Cloud className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
          Live Weather Updates
        </h3>
      </div>

      {/* Weather Cards - News feed style */}
      {weatherHistory.map((weather, index) => {
        const { current, location } = weather;
        const isLatest = index === 0;

        return (
          <Card
            key={weather.id}
            className={`transition-all duration-300 ${
              isLatest
                ? "border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-md"
                : "border-gray-600 bg-gray-50/50 dark:bg-gray-800/20"
            }`}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                {/* Left side - Location and Weather */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-blue-600" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      {location.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {getWeatherIcon(current.weather_descriptions?.[0])}
                    <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                      {current.temperature}°C
                    </span>
                  </div>

                  <span className="text-xs text-blue-700 dark:text-blue-300">
                    {current.weather_descriptions?.[0] || "Unknown"}
                  </span>
                </div>

                {/* Right side - Time */}
                <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(weather.fetchedAt)}</span>
                  {isLatest && (
                    <Badge
                      variant="default"
                      className="bg-green-500 text-white text-xs px-1.5 py-0"
                    >
                      Latest
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function BidPage() {
  const { id } = useParams();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const [market, setMarket] = useState(null);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [balance, setBalance] = useState(1000);
  const [message, setMessage] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [bidRoomUserCount, setBidRoomUserCount] = useState(0);
  const [userNamesCache, setUserNamesCache] = useState({});

  // New state for order book and user orders
  const [orderDepth, setOrderDepth] = useState({
    yes: [],
    no: [],
  });
  const [userOrders, setUserOrders] = useState([]);

  // Add dynamic pricing state
  const [dynamicPricing, setDynamicPricing] = useState({
    dynamicYesPrice: 5.0,
    dynamicNoPrice: 5.0,
    fallbackToDefault: true,
  });

  // Add new state for platform metrics
  const [platformMetrics, setPlatformMetrics] = useState({
    totalMoneyCollected: 0,
    maxLiability: 0,
    platformProfit: 0,
    isProfitable: false,
  });

  // Add new state for profit/loss alert
  const [profitLossAlert, setProfitLossAlert] = useState({
    isOpen: false,
    eventTitle: "",
    resolution: "",
    profitLoss: 0,
    previousBalance: 0,
    newBalance: 0,
    winningOrders: [],
    losingOrders: [],
    refundedOrders: [],
  });

  const mount = useRef(false);
  const socket = useRef(null);

  // Helper function to get user name with caching
  const getUserName = async (clerkId) => {
    // Check cache first
    if (userNamesCache[clerkId]) {
      return userNamesCache[clerkId];
    }

    try {
      const userResponse = await fetch(
        `https://nxtwin-backend-final.onrender.com/api/get/user/${clerkId}`
      );
      if (userResponse.ok) {
        const userData = await userResponse.json();
        if (userData.user && userData.user.name) {
          // Cache the name
          setUserNamesCache((prev) => ({
            ...prev,
            [clerkId]: userData.user.name,
          }));
          return userData.user.name;
        }
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }

    // Fallback to User + last 4 digits
    const fallbackName = `User${clerkId.slice(-4)}`;
    setUserNamesCache((prev) => ({
      ...prev,
      [clerkId]: fallbackName,
    }));
    return fallbackName;
  };

  // Function to update order depth - SIMPLIFIED
  const updateOrderDepth = (newDepthData) => {
    setOrderDepth(newDepthData.depth);
  };

  // ADD THIS MISSING FUNCTION
  const handleCloseProfitLossAlert = () => {
    setProfitLossAlert((prev) => ({ ...prev, isOpen: false }));
  };

  // Socket.IO Connection Management
  useEffect(() => {
    // Initialize socket connection
    socket.current = io("https://nxtwin-backend-final.onrender.com", {
      transports: ["websocket", "polling"],
    });

    socket.current.on("connect", () => {
      console.log("Socket connected:", socket.current.id);
      setIsSocketConnected(true);

      // Join bid room
      if (id) {
        socket.current.emit("joinBid", id);
      }

      // Join user room if logged in
      if (clerkUser?.id) {
        socket.current.emit("joinUser", clerkUser.id);
      }

      // toast.success(" Connected to live market!", {
      //   duration: 2000,
      // });
    });

    socket.current.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsSocketConnected(false);
      // toast.error("You left the bid", {
      //   duration: 2000,
      // });
    });

    socket.current.on("reconnect", () => {
      console.log("Socket reconnected");
      setIsSocketConnected(true);
      toast.success("🔄 Reconnected to live updates", {
        duration: 3000,
      });
    });

    // Listen for real-time updates with improved user name handling
    socket.current.on("orderUpdate", async (data) => {
      console.log("Received order update:", data);

      // Check if this order was placed by the current user
      const isCurrentUser = data.order.clerkId === clerkUser?.id;

      // Get the actual user name
      const displayName = await getUserName(data.order.clerkId);

      // Add to user's order history if it's their order
      if (isCurrentUser) {
        const newOrder = {
          id: data.order._id || Date.now(),
          orderId: data.order._id, // Store the backend order ID for matching
          option: data.optionKey,
          price: data.order.price,
          quantity: data.order.quantity,
          status: data.order.status, // Use the status from the order update (which comes after matching)
          timestamp: new Date(data.order.createdAt || new Date()),
        };

        setUserOrders((prev) => {
          // Check if order already exists and update it, or add new
          const existingIndex = prev.findIndex(
            (order) =>
              order.orderId === data.order._id || order.id === data.order._id
          );

          if (existingIndex >= 0) {
            // Update existing order
            const updated = [...prev];
            updated[existingIndex] = newOrder;
            return updated;
          } else {
            // Add new order
            return [newOrder, ...prev];
          }
        });
      }

      // Only show notification if it's not the current user's order
      if (!isCurrentUser) {
        toast.info("📈 New order placed!", {
          description: `${displayName} placed a ${data.optionKey} order`,
          duration: 3000,
        });
      }

      // Always add to recent orders regardless of who placed it
      setRecentOrders((prev) => [
        {
          id: Date.now(),
          option: data.optionKey,
          price: data.order.price,
          quantity: data.order.quantity,
          userId: data.order.clerkId.slice(-4),
          userName: displayName,
          timestamp: new Date(),
        },
        ...prev.slice(0, 7),
      ]);
    });

    // NEW: Listen for order book updates
    socket.current.on("orderBookUpdate", (data) => {
      console.log("Received order book update:", data);
      updateOrderDepth(data);

      // Calculate and update dynamic pricing based on the new order book
      const newPricing = calculateDynamicPricing(data.depth);
      setDynamicPricing(newPricing);

      // Update market prices
      setMarket((prev) => ({
        ...prev,
        yesPrice: newPricing.dynamicYesPrice,
        noPrice: newPricing.dynamicNoPrice,
      }));
    });

    // Listen for dynamic pricing updates
    socket.current.on("dynamicPricingUpdate", (data) => {
      console.log("Received dynamic pricing update:", data);
      setDynamicPricing(data);

      // Update market prices in the market object
      setMarket((prev) => ({
        ...prev,
        yesPrice: data.dynamicYesPrice,
        noPrice: data.dynamicNoPrice,
      }));
    });

    socket.current.on("orderMatched", (data) => {
      console.log("Received order match:", data);

      // Update user order status if it's current user's order
      if (data.clerkId === clerkUser?.id) {
        setUserOrders((prev) =>
          prev.map((order) => {
            const isMatch =
              order.id === data.orderId ||
              order.orderId === data.orderId ||
              (order.price === data.price &&
                order.quantity === data.quantity &&
                order.option === data.optionKey &&
                order.status === "pending");

            if (isMatch) {
              return {
                ...order,
                status: data.status, // Use the status from the match data
                filledQuantity:
                  data.filledQuantity || order.filledQuantity || 0,
              };
            }
            return order;
          })
        );

        // Show appropriate toast based on status
        if (data.status === "filled") {
          toast.success("🎯 Your order was completely filled!", {
            description: `${data.quantity} ${data.optionKey} shares @ ₹${data.price}`,
            duration: 5000,
          });
        } else if (data.status === "partly_filled") {
          toast.success("🎯 Your order was partially filled!", {
            description: `${data.quantity} of ${data.totalQuantity} ${data.optionKey} shares @ ₹${data.price}`,
            duration: 5000,
          });
        }
      }
    });

    // Add new socket event for order status updates
    socket.current.on("orderStatusUpdate", (data) => {
      console.log("Received order status update:", data);

      // Update user order status if it's current user's order
      if (data.clerkId === clerkUser?.id) {
        setUserOrders((prev) =>
          prev.map((order) => {
            const isMatch =
              order.id === data.orderId || order.orderId === data.orderId;

            return isMatch ? { ...order, status: data.status } : order;
          })
        );

        // Show appropriate toast based on status
        if (data.status === "filled") {
          toast.success("🎯 Your order was filled!", {
            description: `Order status updated to ${data.status}`,
            duration: 5000,
          });
        } else if (data.status === "cancelled") {
          toast.warning("❌ Order cancelled", {
            description: `Your order has been cancelled`,
            duration: 4000,
          });
        }
      }
    });

    socket.current.on("globalOrderUpdate", (data) => {
      console.log("Received global order update:", data);

      // Update market volume if it's for this bid
      if (data.bidId === id && market) {
        setMarket((prev) => ({
          ...prev,
          volume: (prev.volume || 0) + data.order.price * data.order.quantity,
        }));
      }
    });

    socket.current.on("balanceUpdate", (data) => {
      console.log("Received balance update:", data);

      // Only update if it's for the current user
      if (data.clerkId === clerkUser?.id) {
        setBalance(data.newBalance);

        toast.success("💰 Balance updated", {
          description: `Your new balance: ₹${data.newBalance.toFixed(2)}`,
          duration: 4000,
        });
      }
    });

    socket.current.on("bidRoomUserCount", (data) => {
      console.log("Received user count update:", data);

      if (data.bidId === id) {
        setBidRoomUserCount(data.userCount);
      }
    });

    socket.current.on("priceUpdate", (data) => {
      console.log("Received price update:", data);

      toast.info("📊 Price updated", {
        description: "Market prices have been updated",
        duration: 3000,
      });
    });

    socket.current.on("bidMatch", (data) => {
      console.log("Received bid match:", data);

      toast.success("🎯 Bid matched!", {
        description: "A bid has been successfully matched",
        duration: 5000,
      });
    });

    // Add new socket event listener for event resolution
    socket.current.on("eventResolved", (data) => {
      console.log("Received event resolution:", data);

      if (data.bidId === id) {
        // Update market status
        setMarket((prev) => ({
          ...prev,
          status: "resolved",
          resolution: data.resolution,
        }));

        // Check if this event resolution is for the current user (has profit/loss data)
        if (
          data.profitLoss !== undefined &&
          data.previousBalance !== undefined
        ) {
          // Show profit/loss alert for the current user
          setProfitLossAlert({
            isOpen: true,
            eventTitle: data.eventTitle || market?.title || "Event",
            resolution: data.resolution,
            profitLoss: data.profitLoss,
            previousBalance: data.previousBalance,
            newBalance: data.newBalance,
            winningOrders: data.winningOrders || [],
            losingOrders: data.losingOrders || [],
            refundedOrders: data.refundedOrders || [],
          });

          // Update balance if provided
          if (data.newBalance !== undefined) {
            setBalance(data.newBalance);
          }
        } else {
          // Show general resolution toast for other users
          toast.success(`🎉 Event Resolved: ${data.resolution} Won!`, {
            description: "Check your balance for any winnings",
            duration: 10000,
          });
        }
      }
    });

    // Listen for platform metrics updates
    socket.current.on("platformMetrics", (data) => {
      console.log("Received platform metrics:", data);
      setPlatformMetrics(data);

      // Show house betting notification
      if (data.executionType === "house") {
        toast.success("🏠 Order executed by house!", {
          description: `Platform profit: ₹${data.platformProfit.toFixed(2)}`,
          duration: 5000,
        });
      }
    });

    // Cleanup on unmount
    return () => {
      if (socket.current) {
        socket.current.emit("leaveBid", id);
        socket.current.disconnect();
      }
    };
  }, [id, clerkUser?.id, market?.title]); // Add market?.title to dependencies

  // Update socket room when user changes
  useEffect(() => {
    if (socket.current && clerkUser?.id) {
      socket.current.emit("joinUser", clerkUser.id);
    }
  }, [clerkUser?.id]);

  // Fetch user balance and orders from backend when user is loaded
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userLoaded || !clerkUser?.id) return;

      try {
        const response = await fetch(
          `https://nxtwin-backend-final.onrender.com/api/get/user/${clerkUser.id}`
        );
        const data = await response.json();

        if (response.ok && data.user) {
          setBalance(data.user.balance);

          // Fetch user's orders for this bid with better error handling
          try {
            const ordersResponse = await fetch(
              `https://nxtwin-backend-final.onrender.com/api/get/user-orders/${clerkUser.id}/${id}`
            );
            if (ordersResponse.ok) {
              const ordersData = await ordersResponse.json();
              if (ordersData.orders) {
                // Transform orders to match expected format
                const transformedOrders = ordersData.orders.map((order) => ({
                  id: order._id,
                  orderId: order._id, // Store backend ID for matching
                  option: order.optionKey,
                  price: order.price,
                  quantity: order.quantity,
                  status: order.status,
                  timestamp: order.createdAt,
                }));
                setUserOrders(transformedOrders);
              }
            } else {
              console.log("No orders found for user");
              setUserOrders([]);
            }
          } catch (orderError) {
            console.error("Error fetching user orders:", orderError);
            setUserOrders([]);
          }
        } else {
          // Create user if doesn't exist
          const createResponse = await fetch(
            "https://nxtwin-backend-final.onrender.com/api/create-user",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: clerkUser.id,
                name: clerkUser.fullName || clerkUser.firstName || "User",
                email: clerkUser.primaryEmailAddress?.emailAddress || "",
              }),
            }
          );

          const createData = await createResponse.json();
          if (createResponse.ok && createData.user) {
            setBalance(createData.user.balance);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
      }
    };

    fetchUserData();
  }, [userLoaded, clerkUser?.id, id]);

  // Update the order depth fetching logic
  useEffect(() => {
    mount.current = true;

    async function loadData() {
      setLoadingMarket(true);
      try {
        const response = await fetch(
          `https://nxtwin-backend-final.onrender.com/api/get/bid/${id}`
        );
        const data = await response.json();

        if (mount.current && data.bid) {
          // First, fetch dynamic pricing BEFORE setting market data
          let dynamicYesPrice = data.bid.yesPrice; // fallback to DB price
          let dynamicNoPrice = 10 - data.bid.yesPrice;

          try {
            const pricingResponse = await fetch(
              `https://nxtwin-backend-final.onrender.com/api/get/dynamic-pricing/${id}`
            );
            if (pricingResponse.ok) {
              const pricingData = await pricingResponse.json();
              if (!pricingData.fallbackToDefault) {
                // Only use dynamic pricing if it's not falling back to default
                dynamicYesPrice = pricingData.dynamicYesPrice;
                dynamicNoPrice = pricingData.dynamicNoPrice;
                setDynamicPricing(pricingData);
              }
            }
          } catch (pricingError) {
            console.log("Error fetching dynamic pricing:", pricingError);
          }

          const transformedMarket = {
            id: data.bid._id,
            title: data.bid.question,
            category: data.bid.category,
            yesPrice: dynamicYesPrice, // Use dynamic price instead of DB price
            noPrice: dynamicNoPrice, // Add noPrice field
            volume: data.bid.volume,
            endTime: data.bid.endTime,
            image: data.bid.image,
            createdAt: data.bid.createdAt,
            updatedAt: data.bid.updatedAt,
            // Add these fields to properly handle resolved state
            status: data.bid.status || "active",
            resolution: data.bid.resolution || null,
            resolvedAt: data.bid.resolvedAt || null,
            deadline:
              new Date(data.bid.endTime) > new Date()
                ? `Ends ${new Date(data.bid.endTime).toLocaleDateString()}`
                : "Today",
            context: `Make correct prediction and win big!`,
            marketNews: `Current Yes price: ₹${dynamicYesPrice}, Volume: ₹${data.bid.volume}`,
            optionA: "Yes",
            optionB: "No",
          };
          setMarket(transformedMarket);

          // Fetch real order depth for this market
          try {
            const depthResponse = await fetch(
              `https://nxtwin-backend-final.onrender.com/api/get/order-depth/${id}`
            );
            if (depthResponse.ok) {
              const depthData = await depthResponse.json();
              if (depthData.depth) {
                setOrderDepth(depthData.depth);

                // Calculate dynamic pricing from order depth and update if different
                const calculatedPricing = calculateDynamicPricing(
                  depthData.depth
                );
                if (!calculatedPricing.fallbackToDefault) {
                  setDynamicPricing(calculatedPricing);
                  setMarket((prev) => ({
                    ...prev,
                    yesPrice: calculatedPricing.dynamicYesPrice,
                    noPrice: calculatedPricing.dynamicNoPrice,
                  }));
                }
              }
            } else {
              console.log("No order depth data available");
              setOrderDepth({ yes: [], no: [] });
            }
          } catch (error) {
            console.log("Error fetching order depth:", error);
            setOrderDepth({ yes: [], no: [] });
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (mount.current) {
          toast.error("Failed to load market data");
        }
      } finally {
        if (mount.current) setLoadingMarket(false);
      }
    }

    loadData();

    return () => {
      mount.current = false;
    };
  }, [id]);

  const runAi = async () => {
    if (!market) return;

    setAiLoading(true);
    setAiResult(null);

    try {
      const payload = {
        question: market.title,
        optionA: market.optionA,
        optionB: market.optionB,
        context: market.context || "",
        marketNews: market.marketNews || "",
      };

      const res = await fetch("/api/gemini/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      let data = j?.data ?? j;

      if (j?.ok && j?.data) data = j.data;
      if (!data && j?.raw) {
        try {
          data = typeof j.raw === "string" ? JSON.parse(j.raw) : j.raw;
        } catch {
          data = null;
        }
      }

      setAiResult(data || j);
      toast.success("AI analysis completed!");
    } catch (e) {
      setAiResult({ error: "AI request failed" });
      toast.error("Failed to run AI analysis");
    } finally {
      setAiLoading(false);
    }
  };

  const handleOrderPlaced = () => {
    console.log("Order placed successfully - refreshing data if needed");
  };

  // Add this new function for claiming reward
  const handleClaimReward = async () => {
    if (!clerkUser?.id) {
      toast.error("Please sign in to claim reward");
      return;
    }

    setIsClaimingReward(true);

    try {
      const response = await fetch(
        "https://nxtwin-backend-final.onrender.com/api/claim-reward",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkId: clerkUser.id }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setBalance(data.newBalance);
        toast.success("🎉 Reward Claimed!", {
          description: `You've received ₹500! Your new balance is ₹${data.newBalance}`,
          duration: 5000,
        });
      } else {
        toast.error(`Failed to claim reward: ${data.error}`, {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Network error. Please try again.", {
        duration: 4000,
      });
    } finally {
      setIsClaimingReward(false);
    }
  };

  if (loadingMarket) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto pt-16 pb-6 px-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MarketSkeleton />
            </div>
            <div>
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Profit/Loss Alert */}
      <ProfitLossAlert
        isOpen={profitLossAlert.isOpen}
        onClose={handleCloseProfitLossAlert}
        eventTitle={profitLossAlert.eventTitle}
        resolution={profitLossAlert.resolution}
        profitLoss={profitLossAlert.profitLoss}
        previousBalance={profitLossAlert.previousBalance}
        newBalance={profitLossAlert.newBalance}
        winningOrders={profitLossAlert.winningOrders}
        losingOrders={profitLossAlert.losingOrders}
        refundedOrders={profitLossAlert.refundedOrders}
      />

      <div className="container mx-auto pt-16 pb-6 px-4 max-w-7xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{market?.category}</Badge>
                      <ConnectionStatus
                        isConnected={isSocketConnected}
                        userCount={bidRoomUserCount}
                      />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-4">
                      {market?.title}
                    </h1>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {market?.deadline}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground">{market?.context}</p>
                  </div>

                  {/* Updated Balance section */}
                  <Card className="w-full lg:w-72">
                    <CardContent className="p-4 text-center space-y-3">
                      {clerkUser?.id && (
                        <div className="text-sm text-muted-foreground">
                          Hi, {clerkUser.firstName || "User"}
                        </div>
                      )}

                      <div className="text-2xl font-bold">
                        ₹{balance.toFixed(2)}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        {clerkUser?.id
                          ? "is your remaining balance"
                          : "is your demo balance"}
                      </div>

                      {/* Claim Reward Button - only show if balance is 0 and user is signed in */}
                      {clerkUser?.id && balance === 0 && (
                        <Button
                          onClick={handleClaimReward}
                          disabled={isClaimingReward}
                          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition-all duration-200"
                        >
                          {isClaimingReward ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Claiming...
                            </>
                          ) : (
                            <>🎁 Claim Your Reward!</>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Add Event Resolution Panel - Show for everyone */}
            <EventResolutionPanel
              market={market}
              clerkUser={clerkUser}
              setMarket={setMarket}
            />

            {/* Enhanced Tabs with Order Book and Activity */}
            <Tabs defaultValue="order-book" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger
                  value="order-book"
                  className="flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Order Book
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Activity
                </TabsTrigger>
                <TabsTrigger
                  value="ai-analysis"
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  AI Analysis
                </TabsTrigger>
                <TabsTrigger
                  value="discussion"
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Discussion
                </TabsTrigger>
              </TabsList>

              <TabsContent value="order-book" className="space-y-4">
                <OrderBook
                  orderDepth={orderDepth}
                  currentYesPrice={market?.yesPrice}
                />

                <UserOrderHistory userOrders={userOrders} />
              </TabsContent>

              <TabsContent value="activity">
                <div className="space-y-4">
                  {/* Weather Widget - Pass socket as prop */}
                  <WeatherWidget socket={socket} />

                  {/* Existing Market News */}
                </div>
              </TabsContent>

              <TabsContent value="ai-analysis" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        Realtime AI Market Analysis
                      </CardTitle>
                      <Button
                        onClick={runAi}
                        disabled={aiLoading}
                        className="flex items-center gap-2"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Bot className="h-4 w-4" />
                            Run AI Analysis
                          </>
                        )}
                      </Button>
                    </div>
                    <CardDescription>
                      Get AI-powered predictions and insights for this market
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {aiResult && !aiResult.error && (
                      <AIResultsCard result={aiResult} />
                    )}
                    {aiResult?.error && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />

                        <AlertDescription>
                          Failed to analyze: {aiResult.error}
                        </AlertDescription>
                      </Alert>
                    )}
                    {!aiResult && !aiLoading && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>
                          Click "Run AI Analysis" to get AI-powered predictions
                          for this market
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discussion">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      Discussion & Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      Discuss with other people using comments. (Coming Soon...)
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column - Order panel and stats */}
          <aside className="space-y-6">
            {/* Order Panel - Updated to handle resolved state */}
            <OrderPanel
              market={market}
              balance={balance}
              setBalance={setBalance}
              onOrderPlaced={handleOrderPlaced}
              clerkUser={clerkUser}
              orderDepth={orderDepth}
            />

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Market ID</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {market?.id?.slice(-8) ?? id}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Yes Price</span>
                  <Badge className="bg-green-100 text-green-800">
                    ₹{market?.yesPrice ?? "—"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>No Price</span>
                  <Badge className="bg-red-100 text-red-800">
                    ₹{market ? (10 - market.yesPrice).toFixed(2) : "—"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Volume</span>
                  <span className="font-semibold">
                    ₹{(market?.volume ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Expires</span>
                  <Badge variant="outline" className="text-orange-600">
                    {market?.deadline ?? "—"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Platform Stats - Add padding to prevent overlap */}
            <Card className="mt-6">
              {" "}
              {/* Added margin-top for better spacing */}
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Platform Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Money Collected</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    ₹{platformMetrics.totalMoneyCollected?.toFixed(2) || "0"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Max Liability</span>
                  <Badge className="bg-orange-100 text-orange-800">
                    ₹{platformMetrics.maxLiability?.toFixed(2) || "0"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Platform Profit</span>
                  <Badge
                    className={
                      platformMetrics.platformProfit >= 0
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    ₹{platformMetrics.platformProfit?.toFixed(2) || "0"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Status</span>
                  <Badge
                    variant={
                      platformMetrics.isProfitable ? "default" : "secondary"
                    }
                  >
                    {platformMetrics.isProfitable ? "Profitable" : "At Risk"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity - Add padding to prevent overlap */}
            <Card className="mt-6">
              {" "}
              {/* Added margin-top for better spacing */}
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span>Market created</span>
                  <span className="text-muted-foreground">
                    {market?.createdAt
                      ? new Date(market.createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Last updated</span>
                  <span className="text-muted-foreground">
                    {market?.updatedAt
                      ? new Date(market.updatedAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Current volume</span>
                  <Badge className="bg-emerald-100 text-emerald-800">
                    ₹{market?.volume ?? 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        {/* Real-time Recent Orders Section */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Live Orders
              {isSocketConnected && (
                <Badge variant="default" className="ml-2">
                  <Activity className="h-3 w-3 mr-1" />
                  Real-time
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Latest betting activity on this market
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentOrders.map((order, i) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {order.userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              order.option === "Yes" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {order.option.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">
                            ₹{order.price * order.quantity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.userName}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No orders yet</h3>
                <p className="text-sm">
                  Be the first to place an order on this market!
                </p>
                {!isSocketConnected && (
                  <Badge variant="destructive" className="mt-4">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline - Live updates unavailable
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
