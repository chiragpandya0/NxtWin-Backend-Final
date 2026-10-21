const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Import Bid schema
const Bid = require("./src/models/BidSchema");
const connectDB = require("./src/config/db");

// Sample markets (prices in GBP, 0-10 per share; max payout is £10)
const SAMPLE = [
  {
    question: "Will London's temperature exceed 30°C before the end of next month?",
    category: "Weather",
    yesPrice: 5.0,
    volume: 0,
    days: 14,
    image: "/london-weather.jpg",
  },
  {
    question: "Will the Bank of England cut interest rates at its next meeting?",
    category: "Finance",
    yesPrice: 5.0,
    volume: 0,
    days: 21,
    image: "/boe.jpg",
  },
  {
    question: "Will UK CPI inflation come in below 3% in the next release?",
    category: "Finance",
    yesPrice: 5.0,
    volume: 0,
    days: 30,
    image: "/inflation.jpg",
  },
  {
    question: "Will the FTSE 100 close above 8,500 at the end of this month?",
    category: "Finance",
    yesPrice: 5.0,
    volume: 0,
    days: 25,
    image: "/ftse.jpg",
  },
  {
    question: "Will GBP/USD trade above 1.35 by the end of next week?",
    category: "Finance",
    yesPrice: 5.0,
    volume: 0,
    days: 7,
    image: "/gbpusd.jpg",
  },
  {
    question: "Will Bitcoin close above £80,000 this Friday?",
    category: "Crypto",
    yesPrice: 5.0,
    volume: 0,
    days: 5,
    image: "/btc.jpg",
  },
  {
    question: "Will Ethereum trade above £3,000 by month end?",
    category: "Crypto",
    yesPrice: 5.0,
    volume: 0,
    days: 20,
    image: "/eth.jpg",
  },
  {
    question: "Will Claude 5 be released before the end of the year?",
    category: "Tech",
    yesPrice: 5.0,
    volume: 0,
    days: 60,
    image: "/claude.webp",
  },
  {
    question: "Will Apple announce a foldable iPhone this year?",
    category: "Tech",
    yesPrice: 5.0,
    volume: 0,
    days: 90,
    image: "/apple.jpg",
  },
  {
    question: "Will Jeff Bezos become the world's richest person again this year?",
    category: "Finance",
    yesPrice: 5.0,
    volume: 0,
    days: 75,
    image: "/jeff.jpg",
  },
  {
    question: "Will Arsenal win the Premier League this season?",
    category: "Sports",
    yesPrice: 5.0,
    volume: 0,
    days: 120,
    image: "/arsenal.jpg",
  },
  {
    question: "Will Manchester City finish in the top two of the Premier League?",
    category: "Sports",
    yesPrice: 5.0,
    volume: 0,
    days: 120,
    image: "/mancity.jpg",
  },
  {
    question: "Will England win their next international football match?",
    category: "Sports",
    yesPrice: 5.0,
    volume: 0,
    days: 10,
    image: "/england.jpg",
  },
  {
    question: "Will the UK government announce a general election date this year?",
    category: "Politics",
    yesPrice: 5.0,
    volume: 0,
    days: 90,
    image: "/uk-politics.jpg",
  },
  {
    question: "Will UK GDP growth be positive in the next quarterly estimate?",
    category: "Finance",
    yesPrice: 5.0,
    volume: 0,
    days: 45,
    image: "/gdp.jpg",
  },
  {
    question: "Will the Great British Bake Off final draw more than 8 million viewers?",
    category: "Entertainment",
    yesPrice: 5.0,
    volume: 0,
    days: 60,
    image: "/bakeoff.jpg",
  },
  {
    question: "Will it snow in central London on Christmas Day?",
    category: "Weather",
    yesPrice: 5.0,
    volume: 0,
    days: 65,
    image: "/snow.jpg",
  },
];

// Close each market N days from now so seeded markets are always open
const closeDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 0, 0);
  return d;
};

const seedBids = async () => {
  try {
    await connectDB();
    console.log("Connected to MongoDB.");

    // Clear existing bid data
    await Bid.deleteMany({});
    console.log("Existing bids cleared.");

    const formattedBids = SAMPLE.map((item) => ({
      question: item.question,
      category: item.category,
      yesPrice: item.yesPrice,
      volume: item.volume,
      endTime: closeDate(item.days),
      image: item.image,
    }));

    await Bid.insertMany(formattedBids);
    console.log("Database seeded with sample bids!");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    mongoose.connection.close();
  }
};

seedBids();
