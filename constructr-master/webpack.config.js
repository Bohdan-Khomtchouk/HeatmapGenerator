var webpack = require("webpack");
var fs = require( "fs" );
var ext = fs.readdirSync('node_modules').filter( function( name ){
	return( !name.match( /^\./ ));
});

module.exports = {
	entry: "./core/renderer.js",
	output: {
		filename: "./app/core.js"
	},
	externals: [
		function( context, request, callback ){
			if(/^[a-z\-0-9]+$/.test(request) || /plugin/.test(request) || /packages/.test(request)){
				return callback( null, "require('" + request + "');" );
			}
			callback();
		}
	],
	target: 'node',
	devtool: 'inline-source-map',
	plugins: [
		// new webpack.optimize.UglifyJsPlugin({})
	],
	node: {
		__dirname: false
	}
}

