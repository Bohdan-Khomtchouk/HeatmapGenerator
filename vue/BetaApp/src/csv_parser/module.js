const addon = require('./build/Release/csv_parser');
const csv_file_path = "/Users/erica/Local Documents/Projects/AR_Heatmap/libheatmap/sample_data/smallGenesFile.csv";
console.log(`${csv_file_path} is the original file path. The returned json string is `, addon.parse_csv(csv_file_path));
