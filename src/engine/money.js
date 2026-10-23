// All money is integer pence. Rounding always favours the house.
const toPence = (pounds) => Math.round(pounds * 100);
const toPounds = (pence) => pence / 100;

// Amounts the user pays: round up to the next penny.
const ceilPence = (x) => Math.ceil(x - 1e-9);
// Amounts the user receives: round down.
const floorPence = (x) => Math.floor(x + 1e-9);

const formatGBP = (pence) => `£${(pence / 100).toFixed(2)}`;

module.exports = { toPence, toPounds, ceilPence, floorPence, formatGBP };
