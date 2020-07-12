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

/**
 * this is a layer on top of electron's existing menu template
 * scheme that adds a few features we specifically want.
 */

"use strict";

const PubSub = require( "pubsub-js" );
const fs = require( "fs" );
const path = require( "path" );
const Menu = require('electron').remote.Menu;

/**
 * (1) remove any elements that have a "platform" attribute which
 *     does not match the current platform.
 * 
 *     UPDATE: we now also support !platform (gyp style)
 * 
 * (2) translate elements with a platform suffix if the platform
 *     matches.
 * 
 * (3) if an element has a "message" attribute, construct a click
 *     function.
 */
function build_menu_template( src, name, click ){
	
	if( !click ) click = function(message){ 
		PubSub.publish( "menu-click", {
			menu: name,
			message: message,
			item: arguments[1],
			focusedWindow: arguments[2]
		}); 
	};
	
	var platform_key = "-" + process.platform;
	return src.filter( function( entry ){
		
		var keys = Object.keys( entry );		
		keys.forEach( function( key ){
			if( key.endsWith( platform_key )){
				entry[key.substr( 0, key.length - platform_key.length )] = entry[key];
			}
		});
		
		for( var key in entry ){
			if(( key === "platform" && entry[key] !== process.platform )
				|| ( key === "!platform" && entry[key] === process.platform )){
				return undefined;
			}
			else {
				switch( key ){
				case "submenu":
					entry[key] = build_menu_template( entry[key], name, click );
					break;
				case "message":
					entry.click = click.bind( this, entry.message );
					break;
				}
			}
		}
		return entry;
	});

}

var MenuTemplate = function(path){

	try {
		this._template = fs.readFileSync(path, { encoding: "utf8" });
		if( this._template ){
			this._template = JSON.parse( this._template );
			var keys = Object.keys( this._template );
			keys.forEach( function( key ){
				this[key] = Menu.buildFromTemplate( build_menu_template( 
					this._template[key], key
				));
			}, this);
		}
	}
	catch( e ){
		console.error(e);
	}
	
};

module.exports = MenuTemplate;
