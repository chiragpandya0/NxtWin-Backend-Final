const BASE_URL = process.env.NEXT_PUBLIC_https://nxtwin-backend-final.onrender.com || "https://nxtwin-backend-final.onrender.com";

export const api = {
  // Get user balance
  getUserBalance: async (clerkId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/user/balance/${clerkId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching user balance:", error);
      throw error;
    }
  },

  // Get bid details with current prices
  getBid: async (bidId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/get/bid/${bidId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching bid:", error);
      throw error;
    }
  },

  // Get all bids
  getAllBids: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/get/bids`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching bids:", error);
      throw error;
    }
  },

  // Place a bid
  placeBid: async (bidId, clerkId, price, option, quantity) => {
    try {
      const response = await fetch(`${BASE_URL}/api/buy/${bidId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clerkId,
          amount: price,
          option,
          quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error placing bid:", error);
      throw error;
    }
  },
};
