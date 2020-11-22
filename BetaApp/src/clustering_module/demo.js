/* eslint-disable */
const addon = require('./build/Release/cclust')

// Input
var matrix = [['', 'col1', 'col2'], ['row1', 1, 2], ['row2', 3, 4], ['row3', 3, 4]]
var distance_function = 'e'
var linkage_function = 'a'
var axes = 'b'

// Output after clustering
var output_object = addon.ccluster(matrix, distance_function, linkage_function, axes)
console.log(`\n The output is `, JSON.stringify(output_object))
