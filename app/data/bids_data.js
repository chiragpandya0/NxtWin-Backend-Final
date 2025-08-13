import { withRandomVolume } from "../utils/formatters";

export const SAMPLE = [
  {
    id: "100",
    title: "Will Trump meet Putin in 2025?",
    category: "Politics",
    optionA: "Yes",
    optionB: "No",
    yesShare: 62,
    amount: 425,
    participants: 129,
    deadline: "Closes in 9h 24m",
    date: "2025-08-10",
    image: "/trump.jpg",
    volume: "1.1L",
  },
  {
    id: "102",
    title: "Claude 5 release before 2025 end?",
    category: "Tech",
    optionA: "Yes",
    optionB: "No",
    yesShare: 48,
    amount: 1200,
    participants: 812,
    deadline: "Closes in 1d 2h",
    date: "2025-08-08",
    image: "/claude.webp",
    volume: "47,800",
  },
  {
    id: "103",
    title: "Jeff Bezos to become richest man again?",
    category: "Finance",
    optionA: "Yes",
    optionB: "No",
    yesShare: 39,
    amount: 760,
    participants: 351,
    deadline: "Closes in 5d",
    date: "2025-08-10",
    image: "/jeff.jpg",
  },
  {
    id: "104",
    title: "Ethereum above ___ on August 13?",
    category: "Crypto",
    optionA: ">$3600",
    optionB: ">$3800",
    yesShare: 22,
    amount: 980,
    participants: 1240,
    deadline: "Closes in 12h",
    date: "2025-08-06",
    image: "/eth.jpg",
  },
];

SAMPLE.map((m) => ({
  ...m,
  volume: withRandomVolume(m.amount * 1000),
}));

// Helper function to find a market by ID
export const getMarketById = (id) => {
  return SAMPLE_MARKETS.find((market) => market.id === id);
};

// Helper function to get all markets by category
export const getMarketsByCategory = (category) => {
  return SAMPLE_MARKETS.filter(
    (market) => market.category.toLowerCase() === category.toLowerCase()
  );
};
