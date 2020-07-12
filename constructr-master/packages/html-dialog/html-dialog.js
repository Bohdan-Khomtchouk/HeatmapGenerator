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

/**
 * show a dialog and return result/cancel via promise
 * 
 * fields title, cancel-button, cancel-text, accept-button, 
 * accept-text are passed directly to dialog (there are defaults).
 * 
 * validate() is a function that is called on accept events, 
 * if validate returns false it prevents closing the dialog.
 * 
 * content is added to the dialog, this should be an html node.
 * content will get removed the next time this function is called,
 * so manage that node if you need to.
 */
function show_dialog(core, opts){
	
	opts = opts || {};

	var on_cancel = function(){
		dialog.removeEventListener( "cancel", on_cancel );
		dialog.removeEventListener( "accept", on_accept );
		dialog.show(false);
		setImmediate( function(){ 
			if( opts.complete ) opts.complete(false);
		});
	};
	
	var on_accept = function(){
		if( opts.validate && !opts.validate.call(dialog)) return;
		dialog.removeEventListener( "cancel", on_cancel );
		dialog.removeEventListener( "accept", on_accept );
		dialog.show(false);
		setImmediate( function(){ 
			if( opts.complete ) opts.complete(true);
		});
	};
	
	var dialog = document.getElementById( "dialog" );
	if( !dialog ){
		dialog = document.createElement( "html-dialog" );
		dialog.id = "dialog";
		dialog.addEventListener( "cancel", function(e){
			dialog.show(false);	
		});
		dialog.show(false);
		document.body.appendChild( dialog );
	}

	dialog.addEventListener( "cancel", on_cancel );
	dialog.addEventListener( "accept", on_accept );

	// content
	
	dialog.clear();
	if( opts.content ) dialog.appendChild( opts.content );

	// set fields or defaults
	
	['cancel-button', 'accept-button'].map( function( a ){
		if( typeof opts[a] !== "undefined" ) dialog[a] = opts[a];
		else dialog[a] = true;
	})
	
	dialog['cancel-text'] = opts['cancel-text'] || "Cancel";
	dialog['accept-text'] = opts['accept-text'] || "Accept";
	
	dialog.title = opts.title || "Dialog";
	
	// ok, show
	
	dialog.show();
		
}

module.exports = {

	init: function(core){

		let html = path.join( "packages", "html-dialog", "dialog.html" );
		core.Utils.install_html_component( html );

		Object.assign( core.Constants, {
			DIALOG_SHOW: "dialog-show"
		});

		PubSub.subscribe( core.Constants.DIALOG_SHOW, function( channel, opts ){
			show_dialog( core, opts );
		});

	}

};