const priceStore = {}; 
// Example:
// {
//   AAPL: { price: 198.34, timestamp: 1735659932, updatedAt: 1735659932981 }
// }

export function updatePrice(symbol, data) {
  priceStore[symbol] = {
    ...data,
    updatedAt: Date.now(),
  };
}

export function getPrices(symbols = []) {
  const result = {};
  symbols.forEach(symbol => {
    if (priceStore[symbol]) {
      result[symbol] = priceStore[symbol];
    }
  });
  return result;
}