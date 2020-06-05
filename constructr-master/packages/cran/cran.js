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
const PubSub = require( "pubsub-js" );
const electron = require('electron');

/**
 * open the CRAN mirror selector in the panel
 * 
 * TODO: make this modal?
 */
var open_mirror_chooser = function(core, cb){

	console.info( "OMC CB", cb, "t?", typeof cb );

	var panel = document.createElement( "mirror-chooser" );
	panel.id = "mirror-chooser-panel";
	panel.className = "panel";
	panel.addEventListener( 'close', function(){ 
		PubSub.publish( core.Constants.SIDE_PANEL_POP, panel );
	});
	panel.$.cancel.addEventListener( 'click', function(){ 
		PubSub.publish( core.Constants.SIDE_PANEL_POP, panel );
	});

	panel.message = core.Messages.LOADING_MIRROR_LIST; 

	PubSub.publish( core.Constants.SIDE_PANEL_PUSH, { node: panel });
	
	var mirror = undefined;
	var selected_index = 0;
	
	core.R.get_cran_mirror().then( function( m ){
		if( m && m !== "@CRAN@" ){
			mirror = m;
			panel.http = ( !mirror.startsWith( "https" ));
		}
		else panel.http = false;
		return core.Utils.data_cache.get_cached_data( "cran.mirrors", core.Utils.data_cache.DEFAULT_CACHE_TIME, "getCRANmirrors()" );
	}).then( function( obj ){

		if( obj && obj.$data ){		
			var data = core.Utils.data_cache.transpose_frame( obj.$data ); 

			// check the current mirror, independent of filter

			// it seems like chooseCRANmirror sets the mirror WITHOUT
			// a trailing slash, even though the list entries have a 
			// trailing slash.  So.
	
			for( var i = 0; i< data.length; i++ ){
				data[i].checked = false;
				data[i].index = i;
				if( mirror && ( mirror === data[i].URL || mirror + "/" === data[i].URL )){
					data[i].checked = true;
					data[i].initial_selection = true;
				}
			}
			
			var filter_http = function(http){
				var filtered = data.filter(function(elt){
					return ( http || elt.URL.startsWith( "https" ));
				});
				selected_index = 0;
				for( var i = 0; i< filtered.length; i++ ){
					if( filtered[i].checked ){
						selected_index = i;	
						break;
					} 
				}
				return filtered;
			}
			
			panel.addEventListener( 'filter-change', function(){
				panel.data = filter_http(panel.http);
				panel.scrollTo(selected_index);
			});
			
			panel.addEventListener( 'selection-change', function(e){
				var index = e.detail.index;
				for( var i = 0; i< data.length; i++ ){
					if(i === index){
						data[i].checked = true;
						mirror = data[i].URL;
					}
					else data[i].checked = false;
				}
				panel.data = filter_http(panel.http);
			});
			
			panel.$.accept.addEventListener( 'click', function(e){
				
				e.stopPropagation();
				e.preventDefault();
				
				if( typeof mirror === "undefined" ) return;
				
				if( panel.setDefault ){
					console.info( "setting default mirror" );
					core.Settings["default.mirror"] = mirror ;
				}
				
				var msg = `${core.Messages.SET_CRAN_MIRROR}: ${mirror}`;
				
				core.R.set_cran_mirror( mirror, msg ).then( function(){
					if( cb ) cb.call(this);
					else PubSub.publish( core.Constants.SIDE_PANEL_POP, panel);
					PubSub.publish( core.Constants.SHELL_FOCUS );
					//shell.focus();
				}).catch( function(){
					if( cb ) cb.call(this);
					else PubSub.publish( core.Constants.SIDE_PANEL_POP, panel);
					PubSub.publish( core.Constants.SHELL_FOCUS );
					//shell.focus();
				});
				
			});
			
			panel.data = filter_http(panel.http);
			panel.scrollTo(selected_index);
		}
		else {
			panel.message = core.Messages.ERROR_OCCURRED;
		}	
			
	});
		
};


/**
 * if a mirror is set, open the package chooser.  otherwise open the 
 * mirror chooser, and then (on accept) open the package chooser.
 */
var open_package_chooser_if = function(core){

	core.R.get_cran_mirror().then( function( m ){
		if( m && !m.startsWith('@')){
			open_package_chooser(core);
		}
		else {
			PubSub.publish(core.Constants.SHELL_MESSAGE, [ core.Messages.PLEASE_SELECT_MIRROR, "shell-system-information"]);
			open_mirror_chooser( core, open_package_chooser.bind(this, core));
		}
	}).catch( function(e){
		console.info(e);
	});
	
};

var open_package_chooser = function(core){
		
	var panel = document.createElement( "package-chooser" );
	panel.id = "package-chooser-panel";
	panel.className = "panel";
	panel.addEventListener( 'close', function(){ PubSub.publish( core.Constants.SIDE_PANEL_POP, panel ); });
	panel.$.cancel.addEventListener( 'click', function(){ PubSub.publish( core.Constants.SIDE_PANEL_POP, panel ); });

    let mirror;
    let click_cran_link = function(e){
        electron.shell.openExternal(e.detail.href);
    }
    panel.addEventListener( "click-link", click_cran_link );

	panel.message = core.Messages.LOADING_PACKAGE_LIST;

	PubSub.publish( core.Constants.SIDE_PANEL_PUSH, { node: panel });
	
	var packages = undefined;
	var installed = undefined;

    core.R.get_cran_mirror().then( function( rslt ){
        mirror = rslt ;
        if( !mirror.endsWith( "/" )) mirror = mirror + "/";
	    return core.Utils.data_cache.get_cached_data( "available.packages", core.Utils.data_cache.DEFAULT_CACHE_TIME, "available.packages()" );

    }).then( function( obj ){

		packages = core.Utils.data_cache.build_matrix(obj.$data, obj.$nrows, obj.$ncols, true );
		
		// this is nice, but unecessary and expensive
		packages = core.Utils.data_cache.apply_names( packages, 1, obj.$dimnames.$data[1] );
		return core.R.queued_internal( "installed.packages()" );

	}).then( function( obj ){
		
		// leave this one as column-dominant; we only need the first column
		installed = core.Utils.data_cache.build_matrix( obj.response.$data, obj.response.$nrows, obj.response.$ncols );
		var installed_packages = installed[0];
		
		// why not walk both arrays at once? there's a possibility
		// that something is installed but not from CRAN; we might
		// get stuck on that (FIXME: just use lexical comparison)
		
		for( var i = 0; i< packages.length; i++ ){
			
			// using property bindings we need these to be !undef
			packages[i].installed = false;
			packages[i].checked = false;
			
			// for ref
			packages[i].index = i;
            packages[i].link = mirror + "web/packages/" + packages[i].Package;

			for( var j = 0; j< installed_packages.length; j++ ){
				if( packages[i].Package === installed_packages[j] ){
					packages[i].installed = true;
					packages[i].Package += ( " " + core.Messages.INSTALLED_FLAG );
					break;
				}
			}
		}
		
		// console.info( packages, installed );
		panel.data = packages;
		panel.$.accept.addEventListener( 'click', function(){ 
			
			var list = [];
			for( var i = 0; i< packages.length; i++ ){
				if( packages[i].checked ){
					console.info( packages[i] );
					list.push( `"${packages[i].Package}"`);
				}
			}
			
			PubSub.publish( core.Constants.SIDE_PANEL_POP, panel );
			setImmediate(function(){
				if( list.length ){
					//shell.block();
					PubSub.publish(core.Constants.SHELL_BLOCK);
					PubSub.publish(core.Constants.SHELL_MESSAGE, [core.Messages.INSTALLING_PACKAGES, "shell-system-information" ]);
					var cmd = `install.packages(c(${list.join(',')}))`;
					core.R.queued_exec( cmd ).then( function( packet ){
						//shell.unblock.apply( this, arguments );
						PubSub.publish( core.Constants.SHELL_UNBLOCK, arguments );
						PubSub.publish( core.Constants.SHELL_FOCUS );
					})
				}
			});
		});
		
	}).catch(function(e){
		panel.message = core.Messages.ERROR_OCCURRED;
		console.info(e);
	});
	
}


module.exports = {

	init: function(core){

		var html = path.join( "packages", "cran", "cran.html" );
		core.Utils.install_html_component( html );

		// menu
		PubSub.subscribe( "menu-click", function(){
			var data = arguments[1];
			if( data.message === "choose-mirror" ){
				open_mirror_chooser( core );
			}
			if( data.message === "install-packages" ){
				open_package_chooser_if( core );
			}
		});

		// direct
		PubSub.subscribe( "open-mirror-chooser", function(cb){
			open_mirror_chooser( core, cb );
		});

		// system (shoudl be hook)
		core.R.on('system', function(msg){
			var cmd = msg.$data ? msg.$data.cmd : undefined;
			if( cmd === "chooseCRANmirror" ){
				open_mirror_chooser( core );
			} 
			if( cmd === "install.packages" ){
				open_package_chooser_if( core );
			}
		});

	}
};
