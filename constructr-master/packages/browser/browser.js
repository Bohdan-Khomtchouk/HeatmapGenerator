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

var path = require("path");
var PubSub = require( "pubsub-js" );

/** inject stylesheet into help pages */
var help_stylesheet = null;

module.exports = {

	init: function(core){

		var html = path.join( "packages", "browser", "browser.html" );
		core.Utils.install_html_component( html );

		core.Hooks.install( "browser", function(hook, url){

			if( core.Settings["browser.panel"])
			{
				var browser = document.getElementById( "browser-pane" );
				if( !browser ){

					browser = document.createElement( "browser-component" );
					browser.id = "browser-pane";
					browser.cache = core.Utils.file_cache;

					// don't destroy if the panel closes
					browser.setAttribute( "data-preserve", true );
			
					// close box
					browser.addEventListener( "close", function(e){
						//sidePanel.pop();
						PubSub.publish( "side-panel-pop", browser );
					});
					
					// on load, possibly inject stylesheet
					browser.addEventListener( 'load-commit', function(e){
						var url = e.url || e.detail.url;
						if( url && url.match( /^http\:\/\/127\.0\.0\.1\:\d+\/(?:library|doc)\// )){
							if( help_stylesheet && help_stylesheet !== "default" ){
								var ss = path.join( help_styles.dir, help_stylesheet + ".css" );
								browser.inject_stylesheet( ss );
							}
						}
					});

				}

				/** 
				 * this must be done _after_ the parent has been changed 
				 * or it will crash hard (this is a bug in electron or polymer?)
				 */
				browser._onShow = function(){
					browser.open( url );
				};

				PubSub.publish( "side-panel-attach", { node: browser });
				return true;
				
			}
			return false;

		});

		return Promise.resolve();
	}

};