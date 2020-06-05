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

// FIXME: we shouldn't be using filenames as identifiers.  use
// some sort of parameter in the file (minimally, make it optional)
// OTOH, there's no real CSS support for anything like that...

const fs = require( "fs" );
const path = require( "path" );
const PubSub = require( "pubsub-js" );

var Theme = function(opts, core){

	opts = opts || {};

	this.dir = opts.dir || "./themes";
	this.default = opts.default || "default";
	this.themes = [ this.default ];
	this.key = opts.key || "theme";
	this.active = this.default;
	
	this.list_themes = function(){
		var instance = this;
		fs.readdir( this.dir, function(err, files){
			if( err ) console.info( "E", err );
			files.map( function( f ){
				instance.themes.push( f.replace( /\.css$/, "" ));
			});
		})
	};
	
	/** load from settings */
	this.load = function(){
		
		var theme = core.Settings[ this.key ] || this.default;
		// console.info( this.key, theme );
		this.load_theme( theme, false );
		
	};
	
	/** load explicitly (by name) */
	this.load_theme = function( theme, save ){
		
		// console.info( "load theme", theme );
		if( !theme ) theme = this.default;

		// save to settings
		if( save ) core.Settings[ this.key ] = theme ;
		
		// set field for lookups
		this.active = theme;
		
		// remove existing theme, if any
		var elts = document.querySelectorAll( `link[data-target=${this.key}]` );
		for( var i = 0; i< elts.length; i++ ){
			elts[i].parentElement.removeChild( elts[i] );
		}

		// default? don't add
		if( theme && theme === this.default ){
			// special
			if( this.key === "theme" ){
				//opts.shell.setOption( "theme", this.default );
				//opts.shell.refresh();
				PubSub.publish( core.Constants.SHELL_UPDATE_THEME, this.default);
			}
			this.active = "default";
			return;
		}

		if( !theme.match( /\.css$/ )) theme = theme + ".css";

		var elt = document.querySelector( "link[data-position=last]" );
		var n = document.createElement( "link" );
		n.setAttribute( "rel", "stylesheet" );
		n.setAttribute( "data-target", this.key );
		n.setAttribute( "href", path.join( this.dir, theme ) );
		
		if( elt ) elt.parentElement.insertBefore( n, elt );
		else document.head.appendChild( n );
		
		// special
		if( this.key === "theme" ){
			//opts.shell.setOption( "theme", theme.replace( /\.css$/, "" ));
			//opts.shell.refresh();
			PubSub.publish( core.Constants.SHELL_UPDATE_THEME, theme.replace( /\.css$/, "" ));
		}
				
	};
	
};

var shell_theme, ui_theme;

module.exports = {

	init: function( core ){

		shell_theme = new Theme({
			default: "default",
			dir: path.join( __dirname, "shell" )
		}, core);

		ui_theme = new Theme({
			default: "default",
			key: "uitheme",
			dir: path.join( __dirname, "ui" ),
		}, core);

		PubSub.subscribe( core.Constants.SETTINGS_CHANGE, function(channel, obj){
			switch( obj.key ){
			case "theme":
				shell_theme.load_theme( obj.val, false );
				break;
			case "uitheme":
				ui_theme.load_theme( obj.val, false );
				break;
			};
		});

		shell_theme.list_themes();
		shell_theme.load();

		ui_theme.list_themes();
		ui_theme.load();

		return Promise.resolve();
	},

	get_shell_themes: function(){
		return shell_theme.themes;
	},

	get_ui_themes: function(){
		return ui_theme.themes;
	},

};