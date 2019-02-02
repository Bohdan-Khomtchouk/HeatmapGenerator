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

const PubSub = require( "pubsub-js" );

const electron = require('electron');
const remote = electron.remote;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

var path = require( "path" );

const createInstance = function(core, opts, src){

    let node = document.createElement("histogram-panel");
    node.data = src === "locals" ? opts.data.$data.histogram : opts.histogram;

    let token = 0;
    node.field = opts.name;

    let onclose = function(){
        PubSub.publish( core.Constants.SIDE_PANEL_REMOVE, node );
    };

    node.addEventListener( "close", onclose );
    node.onShow = function(){

        if( src === "locals" ){
            let name = opts.name;
            token = PubSub.subscribe( "locals", function(ch, locals){
                if( !locals.$data.fields.$data[name] 
                    || !locals.$data.fields.$data[name].$data    
                    || !locals.$data.fields.$data[name].$data.histogram ){
                        node.data = null;
                        return;
                }
                node.data = locals.$data.fields.$data[name].$data.histogram;
            });
        }
        else if( src === "watches" ){
            token = PubSub.subscribe( "watch", function(ch, watches){
                let key = opts.key;
                for( let i = 0; i< watches.length; i++ ){
                    if( key === watches[i].key ){
                        node.data = watches[i].histogram;
                        return;
                    }
                }
                node.data = null;
            });
        }
    };

    node.onHide = function(){
        if( token ){
            PubSub.unsubscribe( token );
            token = 0;
        }
    };

    node.onUnload = function(){
        if( token ){
            PubSub.unsubscribe( token );
            token = 0;
        }
        node.removeEventListener( "close", onclose );
    };

    return node;
    
};

module.exports = {

	init: function(core){

        core.Hooks.install( "locals_click", function( hook, opts ){
            // ...
            return false;    
        });

        const show = function(node){
            let pos = core.Settings["histogram.panel.position"];
            if( !pos ) pos = core.Settings["details.panel.position"];
            if( !pos ) pos = { row: 3, column: 0 };
            PubSub.publish( core.Constants.SIDE_PANEL_ATTACH, { position: pos, node: node });
        };

		let menuitem = new MenuItem({
			label: "View histogram",
			click: function( menuitem ){
                show(createInstance( core, menuitem.menu_target, menuitem.menu_source ));
			}
		});

		core.Hooks.install( "locals_context_menu", function( hook, menu ){
            menuitem.menu_target = menu.target;
            menuitem.menu_source = "locals";
			menu.insert( 3, menuitem );
			menuitem.visible = !!menu.target.data.$data.histogram; 
		});

		core.Hooks.install( "watches_context_menu", function( hook, menu ){
            menuitem.menu_target = menu.target;
            menuitem.menu_source = "watches";
			menu.insert( 3, menuitem );
			menuitem.visible = !!menu.target.histogram; 
		});

        // (optionally) override default click on locals
		core.Hooks.install( "locals_click", function( hook, opts ){

            if( !core.Utils.array_cross_match( core.Settings["locals.default.view"], "histogram" )
                || !opts.data.$data.histogram ) return false;

            // we have to be well-behaved
            if( opts.handled ) return false;
            opts.handled = true;

            show( createInstance( core, opts, "locals" ));

            return true;
        });

        core.Hooks.install( "watches_click", function( hook, opts ){

            if( !core.Utils.array_cross_match( core.Settings["watches.default.view"], "histogram" )
                || !opts.histogram ) return false;

            // we have to be well-behaved
            if( opts.handled ) return false;
            opts.handled = true;

            show( createInstance( core, opts, "watches" ));

            return true;
        });

    }

};