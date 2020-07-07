const addon = require('./build/Release/csv_parser');
const value = 8;    
console.log(`${value} times 2 equals`, addon.parse_csv(value));
