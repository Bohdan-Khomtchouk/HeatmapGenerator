const addon = require('./build/Release/cclust');
const input = "{heatmap_input:[[,col1,col2],[row1,1,2],[row2,3,4]],\ndistance_function:e,\nlinkage_function:a,\naxes:r}";

var output_object =  addon.ccluster(input)
console.log(`\n ${input} \n is the original input. The output is `, JSON.stringify(output_object));
