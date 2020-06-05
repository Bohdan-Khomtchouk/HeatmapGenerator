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

const path = require( "path" );
//const ControlR = require( "controlr" );
const ControlR = require( "../../controlr/js/controlr.js" );

/**
 * controlR is the basic R wrapper.  here we're adding some convenience 
 * methods and functions that are useful for our UI, but aren't core 
 * functionality (and hence aren't included in controlR).
 */
var ExtendR = function(){
	
	// fixme: utility lib
	
	/**  
	 * enquote with double quotes; escape other quotes. 
	 * 
	 * FIXME: is this correct? what if the string already has escaped quotes 
	 * in it (called twice, for example)?  should it then double-escape?
	 */
	function enquote(s){
		return `"${s.replace( /"/g, '\\\"')}"`; // chrome doesn't support 'g' with string match?
	}
	
	// === public methods =====================================================

	/** get all options */
	this.options = function(){
		return this.internal( `options()` );	
	};

	/** get option */
	this.get_option = function( key ){
		return this.internal( `options('${key}')` );	
	};
	
	/** set option.  strings will be quoted. */
	this.set_option = function( key, value ){
		if( typeof value === "string" ) value = enquote( value );
		return this.internal( `options(${key}=${value})` );
	};

	/** set multiple options */
	this.set_options = function( kvpairs ){
	
		var s = [];
		for( var key in kvpairs ){
			var val = kvpairs[key];
			if( typeof val === "string" ) val = enquote( val );
			s.push( `${key}=${val}` );
		}
		var cmd = `options(${s.join( "," )})`;
		console.info(cmd);
		return this.internal(cmd);
		
	};

	/** 
	 * set cran mirror, which has to be in a list.  this is in an 
	 * anonymous function to prevent leaving any detritus in the environment
	 */
	this.set_cran_mirror = function( mirror, message ){
		
		mirror = mirror ? enquote( mirror ) : "NULL" ;
		
		var cmd = [
			`(function(){ repos <- getOption('repos')`,
			`repos['CRAN'] <- ${mirror}`,
			`options(repos = repos)`
		];
		
		if( message ) cmd.push(
			`cat('${message}\n')` 
		);
		
		cmd.push( `})()` );
		return this.internal( cmd );
		
	};
	
	/** get cran mirror (shortcut) */
	this.get_cran_mirror = function(){
		var instance = this;
		return new Promise( function( resolve, reject ){
			instance.internal( "getOption('repos')").then( function( rslt ){
                if( rslt && rslt.response ){
                    if( typeof rslt.response === "string" ){
                        resolve( rslt.response.repos );
                    }
					else if( rslt.response.CRAN ){
						resolve( rslt.response.CRAN );
					}
    				else reject("NULL or not set");
                }
				else reject("NULL or not set");
			}).catch( function(e){
				reject(e);
			});
		});
	};
	
	/** 
	 * set console width (in characters)
	 */
	this.set_console_width = function(chars){
		this.internal( `options(width=${chars})`, "set.console.width" );
	};

	// === constructor ========================================================

	// superclass init
	ControlR.apply( this, arguments );
	
};

// inherit prototype methods
for (var x in ControlR.prototype){
	ExtendR.prototype[x] = ControlR.prototype[x];
}

module.exports = ExtendR;