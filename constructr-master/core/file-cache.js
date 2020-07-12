/**
 * Copyright (c) 2016 Structured Data, LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to 
 * deal in the Software without restriction, including without limitation the 
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
 * sell copies of the Software, and to permit persons to whom the Software is 
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in 
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

"use strict";

var fs = require( "fs" );

/**
 * utility: cache file contents and refresh on mtime.
 */
var FileCache = function(){
	
	var store = {};
	
	var cache = function( path ){
		return new Promise( function( resolve, reject ){
			fs.readFile( path, { encoding: "utf8" }, function( err, contents ){
				if( err ) reject( err );
				if( !contents ) contents = "";
				store[path] = { 
					contents: contents, 
					cache_time: new Date().getTime()
				};
				resolve( contents );
			});
		});
	};
	
	this.ensure = function( path ){
		return new Promise( function( resolve, reject ){
			var cached = store[path];
			if( typeof cached !== "undefined" ){
				fs.stat( path, function(err, stats){
					if( err ) reject( err );
					if( stats.mtime.getTime() > cached.cache_time ){
						cache( path ).then( function( contents ){
							resolve(contents);
						}).catch( function( err ){ reject(err); });
					}
					else {
						resolve( cached.contents );
					}
				});
			}
			else {
				cache( path ).then( function( contents ){
					resolve(contents);
				}).catch( function( err ){ reject(err); });
			}
		});
	};

};

module.exports = FileCache;

