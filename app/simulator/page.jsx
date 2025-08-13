"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  Activity,
  Zap,
  Target,
  DollarSign,
  Users,
  Timer,
} from "lucide-react";

export default function SimulatorPage() {
  // Global State
  const [yesOrders, setYesOrders] = useState([]);
  const [noOrders, setNoOrders] = useState([]);
  const [totalPool, setTotalPool] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [orderIdCounter, setOrderIdCounter] = useState(0);
  const [proboFee, setProboFee] = useState(2);
  const [totalFeesCollected, setTotalFeesCollected] = useState(0);
  const [currentMarketPrice, setCurrentMarketPrice] = useState(null);
  const [newBetsLog, setNewBetsLog] = useState([
    "All newly placed bets will be logged here.",
  ]);
  const [matchedOrdersLog, setMatchedOrdersLog] = useState([
    "All matched orders will be logged here.",
  ]);

  // Form state
  const [yesBets, setYesBets] = useState(100);
  const [yesPriceSlider, setYesPriceSlider] = useState([5.0]);
  const [noBets, setNoBets] = useState(100);
  const [noPriceSlider, setNoPriceSlider] = useState([5.0]);

  // Function to create a unique ID for each order
  const getUniqueId = useCallback(() => {
    setOrderIdCounter((prev) => prev + 1);
    return `order-${orderIdCounter}`;
  }, [orderIdCounter]);

  // Log functions
  const logNewBet = useCallback((message) => {
    setNewBetsLog((prev) => [message, ...prev].slice(0, 50));
  }, []);

  const logMatchedOrder = useCallback((message) => {
    setMatchedOrdersLog((prev) => [message, ...prev].slice(0, 50));
  }, []);

  // Core matching logic
  const matchOrders = useCallback(() => {
    const yesOrdersCopy = [...yesOrders].sort((a, b) => b.price - a.price);
    const noOrdersCopy = [...noOrders].sort((a, b) => a.price - b.price);

    let i = 0;
    let j = 0;
    const matchedOrders = [];

    while (i < yesOrdersCopy.length && j < noOrdersCopy.length) {
      const yesOrder = yesOrdersCopy[i];
      const noOrder = noOrdersCopy[j];

      if (yesOrder.price + noOrder.price === 10) {
        matchedOrders.push({ yes: yesOrder, no: noOrder });
        i++;
        j++;
      } else if (yesOrder.price + noOrder.price > 10) {
        i++;
      } else {
        j++;
      }
    }

    if (matchedOrders.length > 0) {
      const yesIdsToRemove = new Set(matchedOrders.map((m) => m.yes.id));
      const noIdsToRemove = new Set(matchedOrders.map((m) => m.no.id));

      setYesOrders((prev) =>
        prev.filter((order) => !yesIdsToRemove.has(order.id))
      );
      setNoOrders((prev) =>
        prev.filter((order) => !noIdsToRemove.has(order.id))
      );

      logMatchedOrder(`Successfully matched ${matchedOrders.length} orders.`);
      setCurrentMarketPrice(matchedOrders[matchedOrders.length - 1].yes.price);
      setTotalPool((prev) => prev + matchedOrders.length * 10);
      setMatchedCount((prev) => prev + matchedOrders.length);
      setTotalFeesCollected(
        (prev) => prev + (proboFee / 100) * matchedOrders.length * 10
      );
    } else {
      logMatchedOrder(`No new matches were found in this round.`);
    }
  }, [yesOrders, noOrders, proboFee, logMatchedOrder]);

  // Function to place a bulk of bets
  const placeBulkBets = useCallback(
    (type, count, centerPrice) => {
      const newOrders = [];
      const roundedPrice = Math.round(centerPrice * 2) / 2;

      for (let i = 0; i < count; i++) {
        newOrders.push({
          id: getUniqueId(),
          type: type,
          price: Math.max(0.5, Math.min(9.5, roundedPrice)),
        });
      }

      if (type === "yes") {
        setYesOrders((prev) => [...prev, ...newOrders]);
        logNewBet(`Placed ${count} 'YES' bets at ₹${roundedPrice.toFixed(1)}.`);
      } else {
        setNoOrders((prev) => [...prev, ...newOrders]);
        logNewBet(`Placed ${count} 'NO' bets at ₹${roundedPrice.toFixed(1)}.`);
      }
    },
    [getUniqueId, logNewBet]
  );

  // Order book depth calculation
  const getOrderBookDepth = useCallback(() => {
    const yesPrices = {};
    const noPrices = {};

    yesOrders.forEach(
      (order) => (yesPrices[order.price] = (yesPrices[order.price] || 0) + 1)
    );
    noOrders.forEach(
      (order) =>
        (noPrices[10 - order.price] = (noPrices[10 - order.price] || 0) + 1)
    );

    const allPossiblePrices = Array.from(
      { length: 19 },
      (_, i) => 0.5 + i * 0.5
    ).reverse();
    const maxOrders = Math.max(
      ...Object.values(yesPrices),
      ...Object.values(noPrices),
      1
    );

    return allPossiblePrices.map((price) => ({
      price,
      yesCount: yesPrices[price] || 0,
      noCount: noPrices[price] || 0,
      yesWidth: ((yesPrices[price] || 0) / maxOrders) * 100,
      noWidth: ((noPrices[price] || 0) / maxOrders) * 100,
    }));
  }, [yesOrders, noOrders]);

  // Event handlers
  const handlePlaceYesBets = () => {
    if (yesBets > 0 && yesPriceSlider[0] >= 0.5 && yesPriceSlider[0] <= 9.5) {
      placeBulkBets("yes", yesBets, yesPriceSlider[0]);
    } else {
      logNewBet(
        "Invalid input for Yes bets. Number must be > 0 and price between 0.5 and 9.5."
      );
    }
  };

  const handlePlaceNoBets = () => {
    if (noBets > 0 && noPriceSlider[0] >= 0.5 && noPriceSlider[0] <= 9.5) {
      placeBulkBets("no", noBets, noPriceSlider[0]);
    } else {
      logNewBet(
        "Invalid input for No bets. Number must be > 0 and price between 0.5 and 9.5."
      );
    }
  };

  const handleUpdateFee = () => {
    logNewBet(`Probo Fee updated to ${proboFee}%.`);
  };

  // Sync sliders and recommended prices on market price change
  useEffect(() => {
    if (currentMarketPrice !== null) {
      setYesPriceSlider([currentMarketPrice]);
      setNoPriceSlider([10 - currentMarketPrice]);
    }
  }, [currentMarketPrice]);

  useEffect(() => {
    matchOrders();
  }, [yesOrders, noOrders, matchOrders]);

  const orderBookDepth = getOrderBookDepth();
  const probability =
    currentMarketPrice !== null ? (currentMarketPrice * 10).toFixed(0) : 50;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto pt-16 pb-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Trading Simulator</h1>
          <p className="text-muted-foreground">
            Experience prediction market mechanics in real-time
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-2xl font-bold">₹{totalPool.toFixed(2)}</p>
              </div>
              <p className="text-sm text-muted-foreground">Total Pool</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <p className="text-2xl font-bold">
                  ₹{totalFeesCollected.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Fees Collected</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <p className="text-2xl font-bold">{yesOrders.length}</p>
              </div>
              <p className="text-sm text-muted-foreground">Yes Orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <p className="text-2xl font-bold">{noOrders.length}</p>
              </div>
              <p className="text-sm text-muted-foreground">No Orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <p className="text-2xl font-bold">{matchedCount}</p>
              </div>
              <p className="text-sm text-muted-foreground">Matched</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Yes Betting Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <TrendingUp className="h-5 w-5" />
                Place 'Yes' Bets
              </CardTitle>
              <CardDescription>
                Recommended Price: ₹{currentMarketPrice?.toFixed(1) || "5.0"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="yes-bets">Number of Bets</Label>
                <Input
                  id="yes-bets"
                  type="number"
                  value={yesBets}
                  onChange={(e) => setYesBets(parseInt(e.target.value) || 0)}
                  min="1"
                  placeholder="Enter number of bets"
                />
              </div>

              <div className="space-y-4">
                <Label>Target Price: ₹{yesPriceSlider[0].toFixed(1)}</Label>
                <Slider
                  value={yesPriceSlider}
                  onValueChange={setYesPriceSlider}
                  max={9.5}
                  min={0.5}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>₹0.5</span>
                  <span>₹9.5</span>
                </div>
              </div>

              <Button
                onClick={handlePlaceYesBets}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Place Yes Bets
              </Button>
            </CardContent>
          </Card>

          {/* No Betting Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <TrendingDown className="h-5 w-5" />
                Place 'No' Bets
              </CardTitle>
              <CardDescription>
                Recommended Price: ₹
                {currentMarketPrice
                  ? (10 - currentMarketPrice).toFixed(1)
                  : "5.0"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="no-bets">Number of Bets</Label>
                <Input
                  id="no-bets"
                  type="number"
                  value={noBets}
                  onChange={(e) => setNoBets(parseInt(e.target.value) || 0)}
                  min="1"
                  placeholder="Enter number of bets"
                />
              </div>

              <div className="space-y-4">
                <Label>Target Price: ₹{noPriceSlider[0].toFixed(1)}</Label>
                <Slider
                  value={noPriceSlider}
                  onValueChange={setNoPriceSlider}
                  max={9.5}
                  min={0.5}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>₹0.5</span>
                  <span>₹9.5</span>
                </div>
              </div>

              <Button
                onClick={handlePlaceNoBets}
                className="w-full bg-red-500 hover:bg-red-600"
                size="lg"
              >
                Place No Bets
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Platform Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="fee">Platform Fee (%)</Label>
                <Input
                  id="fee"
                  type="number"
                  value={proboFee}
                  onChange={(e) => setProboFee(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleUpdateFee} className="mt-6">
                Update Fee
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Book */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Order Book Depth
              </CardTitle>
              <CardDescription>
                Real-time view of pending orders at each price level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  {orderBookDepth.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-3 items-center gap-2"
                    >
                      {/* Yes Orders */}
                      <div className="flex justify-end">
                        {item.yesCount > 0 && (
                          <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium min-w-[2rem] text-center">
                            {item.yesCount}
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-center font-mono text-sm">
                        ₹{item.price.toFixed(1)}
                      </div>

                      {/* No Orders */}
                      <div className="flex justify-start">
                        {item.noCount > 0 && (
                          <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium min-w-[2rem] text-center">
                            {item.noCount}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Logs */}
          <div className="space-y-4">
            {/* New Bets Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4" />
                  New Bets Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-44">
                  <div className="space-y-1">
                    {newBetsLog.map((log, index) => (
                      <p
                        key={index}
                        className="text-xs text-muted-foreground p-2 bg-muted/50 rounded"
                      >
                        {log}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Matched Orders Log */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Timer className="h-4 w-4" />
                  Matched Orders Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-44">
                  <div className="space-y-1">
                    {matchedOrdersLog.map((log, index) => (
                      <p
                        key={index}
                        className="text-xs text-muted-foreground p-2 bg-muted/50 rounded"
                      >
                        {log}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
