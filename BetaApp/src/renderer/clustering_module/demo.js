const addon = require('./build/Release/cclust');
const input = "{heatmap_input:[[,col1,col2],[row1,1,2],[row2,3,4]],\ndistance_function:e,\nlinkage_function:a,\naxes:b}";
console.log(`${input} is the original input. The returned json string is `, addon.ccluster(input));
