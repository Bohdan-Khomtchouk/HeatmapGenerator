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

/**
 * load messages from json file.  placeholder for i18n.
 */

const fs = require( "fs" );

/** array -> multiline string */
var concatenate_strings = function( obj ){
	var keys = Object.keys(obj);
	keys.forEach( function( key ){
		var val = obj[key];
		if( Array.isArray( val )) obj[key] = val.join( "\n" );
		else if( typeof val === "object" ) obj[key] = concatenate_strings(val);
	});
	return obj;
}

/** singleton */
var Messages = function(){
	this.load = function(path){
		var contents = fs.readFileSync( path, { encoding: "utf8" });
		if( !contents ) return {};
		try { 
			contents = JSON.parse( contents );
			return concatenate_strings( contents );
		}
		catch( e ){
			console.err( e );
		}
		return {};
	};
};

module.exports = new Messages();

