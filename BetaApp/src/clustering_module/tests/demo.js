/* eslint-disable */
const addon = require('../build/Release/cclust')
let filePath = 'crashingFile.csv'
let output_object = addon.ccluster(filePath, 'e', 's', 'b')
console.log(output_object)

