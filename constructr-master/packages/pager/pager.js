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

const fs = require( "fs" );
const PubSub = require( "pubsub-js" );

var Pager = function(){

	this.init = function(opts){

		opts.source.on( 'pager', function(obj){

			var data = obj.$data;

			// can be one or many? use the loop

			if( typeof( data.files ) === "string" ){
				data.files = [data.files];
				data.title = [data.title];
				data['delete.file'] = [data['delete.file']];
			}

			if( opts.debug ) console.info( data );

			if( typeof( data.files ) === "object" ){
				for( var i = 0; i< data.files.length; i++ ){

					var title = null;
					if( data.title[i] && data.title[i].trim().length ){
						title = "\n" + data.title[i] + "\n" + Array( data.title[i].length + 1 ).join('=') + "\n";
					}
					
					if( data.files[i] ){
						fs.readFile( data.files[i], { encoding: "utf8" }, function(err, contents){
							
							if( title ) opts.text( title, "pager pager-title", true );
							
							if( contents && contents.length ){
								opts.text( "\n" + contents, "pager pager-text", true );
							}
							
							opts.text( "\n", undefined, true );
							
							if( data['delete.file'][i] ){
								console.info( "unlink", data.files[i] );
								fs.unlink( data.files[i] );
							}
						});
					}

				}
			}

		});
	};
	
};

module.exports = {
	
	init: function( core ){
		new Pager().init({
			source: core.R,
			text: function(){
				var args = [];
				for( var i = 0; i< arguments.length; i++ ) args[i] = arguments[i];
				PubSub.publish( core.Constants.SHELL_MESSAGE, args );
			}
		});
		return Promise.resolve();
	}

};
