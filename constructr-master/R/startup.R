
# Copyright (c) 2016 Structured Data, LLC
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to 
# deal in the Software without restriction, including without limitation the 
# rights to use, copy, modify, merge, publish, distribute, sublicense, and/or 
# sell copies of the Software, and to permit persons to whom the Software is 
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in 
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
# IN THE SOFTWARE.

(function(){

with( jsClientLib:::.client.env, {

#------------------------------------------------------------------------------
# data store for watches, file watcher, and progress bars
#------------------------------------------------------------------------------

data.env <- new.env();

#------------------------------------------------------------------------------
# tools
#------------------------------------------------------------------------------

#'
#' get locals
#'
#' the idea is to give a relatively short representation of each field, as
#' a string.  the first line is used as the brief description and the full
#' text is displayed for a selected item.
#'
#' by default we're using \code{print} for functions and \code{str} for all other 
#' fields, and we have wrappers for these that call \code{capture.output}.
#'
#' @param envir The current environment -- generally \code{.GlobalEnv}, but 
#' when debugging, the active function.
#'
# FIXME: this should go into the client, in startup script, to facilitate
# modification for various purposes.  or perhaps we could leave this one
# and allow users to change the call to something more useful.
#
.js.client.locals <- function( envir ){
	.js.client.callback( "locals", list(
		fields = lapply( mget( ls(envir), envir=envir), function(a){ 
			if( is.function(a)){ string.representation <- capture.print(a); }
			else if( is.environment(a)){ string.representation <- capture.env(a); }
			else { string.representation <- capture.str(a) }
			rslt <- list( value=string.representation, class=class(a), size=dim(a));
            if( is.null( rslt$size )){ rslt$size <- length(a); };
            if( is.numeric(a) && ( length(a) > 1 )){ rslt$histogram = hist(a, plot=F); }
            rslt;
		}),
		envir = capture.output(str(envir)))
	);
}

#
# watches allow arbitrary expressions; we call eval(), which is dangerous
# but very flexible.  by default the results are presented as str() or 
# print() for functions, but you can pass in a function (or function name)
# for custom results (see, e.g., capture.histogram).
#

assign( "watches", list(), envir=data.env );

#'
#' Get watches
#'
#' Get watches.  A numbered list is returned, use those indexes to 
#' manipulate watches.
#'
#' @return List of watche variables
#' @seealso \code{\link{js.client.remove.watch}}
#'
.js.client.watches <- function(){
	.js.client.callback( "watches", list(
		fields = lapply( data.env$watches, function(a){ 
			envir <- a$envir;
			a$envir <- capture.output(str(envir));
			tryCatch({
				val <- eval( a$expr, envir=envir );
				a$value <- do.call( a$func, list(val));
				a$class <- class(val);
                a$size <- dim(val);
                if( is.null( a$size )){ a$size <- length(val); }
				if( !inherits( a$value, "character" )){ a$value <- capture.output( print( a$value )); }
                if( is.numeric( val ) && (length(val) > 1 )){ a$histogram = hist(val, plot=F); }
				return(a); 
			}, error=function( cond ){ 
				a$err <- toString(cond); 
				return(a);
			});
		})
	));
}

#'
#' Add a watch variable
#'
#' @param expr Any R expression, generally a field, function, or slice
#' @param func The function used to render the field in the viewer.  Defaults
#' to \code{print} for functions and \code{str} for everything else.
#' @param label Optional label, defaults to \code{expr}.
#' @param envir The environment in which to resolve \code{expr}. Defaults 
#' to \code{.GlobalEnv}.
#'
#' @export
js.client.add.watch <- function( expr, func, label, envir=.GlobalEnv, open.watch.panel=T ){
	if( missing( func )){
		
		# NOTE: this resolves expr, which will throw an error
		# if expr doesn't exist at this moment.  that might not
		# be desirable.  it's worth considering supporting 
		# non-existent fields or out-of-range indexes.

		# actually this will work if there's a func specified...
		# it only resolves expr if it needs to test whether
		# it's a function or not.
		
		# FIXME: since we allow specification of the function,
		# we should probably skip this and just default to str().
		# users can use print() if they want.
		
		x <- eval( substitute( expr ));
		if( is.function( x )){ func="capture.print"; }
		else { func="capture.str"; }
	}
	else {
		if( !is.character( substitute( func ))){
			func = toString( substitute( func ));
		}
	}
	
	if( missing(label)){
		label = capture.output(print(substitute(expr)));
	}
	
	tmp <- data.env$watches;
	tmp[[length(tmp)+1]] <- list( label=label, expr=substitute(expr), func=func, envir=envir );
	data.env$watches <- tmp ;

    # notify the client so it can pop open a view (if desired)
    # .js.client.callback( "add-watch", as.list( environment()));

    if( open.watch.panel){
        .js.client.callback( "add-watch", label );
    }
    
}

#'
#' Remove a watch variable
#'
#' Remove watch, by index.  watches are somewhat complicated because you
#' can have multiple watches on one field, and we allow a full set of equal
#' parameters; hence there's no reasonable way to look up a value.  
#'
#' @param index the (integer) index into the list of watches
#'
#' @export
js.client.remove.watch <- function( index ){
	data.env$watches <- data.env$watches[-index];
}

#'
#' remove all watches
#'
#' @export
js.client.clear.watches <- function(){
	data.env$watches <- list();
}

# these are utility functions for watch/locals

#'
#' return output of \code{str}
#'
#' calls \code{str} and returns output as a string.  this is a utility 
#' function for use with watches in the js client.
#'
#' @param x Any R object
#' @return the output of \code{str(x)}, as a string
#' @seealso \code{\link{capture.print}}, \code{\link{capture.histogram}}
#'
#' @export
capture.str <- function(x){ capture.output( str(x, give.head=F)); }

#'
#' return output of \code{print}
#'
#' calls \code{print} and returns output as a string.  this is a utility 
#' function for use with watches in the js client.
#'
#' @param x any R object
#' @return the output of \code{print(x)}, as a string
#' @seealso \code{\link{capture.str}}, \code{\link{capture.histogram}}
#'
#' @export
capture.print <- function(x){ capture.output( print(x)); }

#'
#' return output of \code{histogram}
#'
#' calls \code{histogram} and returns output as a string, wihtout plotting
#' the histogram.  this is a utility function for use with watches in the 
#' js client.
#'
#' @param x any R object
#' @return the output of \code{hist(x, plot=F)}, as a string
#' @seealso \code{\link{capture.print}}, \code{\link{capture.str}}
#'
#' @export
capture.histogram <- function(x){ capture.output( print( hist(x, plot=F ))); }

#'
#' return output of \code{ls.str}
#'
#' calls \code{print} and returns output as a string.  this is a utility 
#' function for use with watches in the js client.
#'
#' @param env an environment
#' @return the output of \code{ls.str(x)}, as a string
#' @seealso \code{\link{capture.print}}, \code{\link{capture.str}}, \code{\link{capture.histogram}}
#'
#' @export
capture.env <- function( env ){
	c( capture.output( print( env )), "", "Members:", "", paste0( " ", capture.output( print( ls.str(env)))));
}

#------------------------------------------------------------------------------
# shell utilities
#------------------------------------------------------------------------------

#'
#' Browser function
#'
#' Function for use in \code{options(browser)}
#'
#browser <- function( url ){
#	.js.client.callback( "browser", as.list( environment()));
#}

#'
#' Pager function
#'
#' Function for use in \code{options(pager)}
#'
#pager <- function( files, header, title, delete.file ){
#	.js.client.callback( "pager", as.list( environment()));
#}

#'
#' Quit function
#'
#' Quit function, intended to replace \code{base::quit} and allow the 
#' JS client to exit gracefully.
#'
#quit <- function(...){
#    	.js.client.callback( "system", list( cmd="quit", args=as.list(environment())));
#}

#------------------------------------------------------------------------------
# options
#------------------------------------------------------------------------------

.js.client.options.env <- new.env();

#'
#' get and set client.options
#'
#' js.client.options controls options (preferences) in the shell application.
#' it functions like \code{options()}; use list syntax to set values, and 
#' names to get values.  Call with no arguments to list all options.
#'
#' @export
js.client.options <- function(...) {

	args <- list(...);
	if( is.null( names(args))){
		args <- unlist( args );
		if( length( args ) == 0 ){
			args <- unlist( ls( .js.client.options.env ));
		}
		sapply( args, function(a){
			.js.client.options.env[[a]];
		}, simplify=F, USE.NAMES=T );
	}
	else {
		sapply( names( args ), function(n){
			prev <- .js.client.options.env[[n]];
			if( is.null( args[[n]] )){
				if( exists( n, envir=.js.client.options.env )){
					rm( list=c(n), envir=.js.client.options.env );
				}
			}
			else {
				assign( n, args[[n]], envir=.js.client.options.env );
			}
			
			# explicitly pass key and value so we don't lose null values in lists
			.js.client.callback( "preferences", list( KEY=n, VALUE=args[[n]] ));
			prev;
			
		}, simplify=F, USE.NAMES=T );
	}

}

#------------------------------------------------------------------------------
# file watch api
#
# FIXME: use an environment (for storage).  simplifies semantics.
#------------------------------------------------------------------------------

data.env$file.watches <- list();

#'
#' Watch a file
#'
#' Watch a file and reload (or execute some arbitrary code) when the file changes.
#'
#' @param path Path to the file.  we will call \code{normalizePath}.
#' @param FUNC Code to execute when the file changes.  Defaults to \code{source(path)}.
#' @param override Remove any prior file watches.  You might add two separate watches
#' that execute different functions when a file changes; this is supported, unless the 
#' \code{override} parameter is set. Defaults to True.
#'
#' @export
js.client.watch.file <- function( path, FUNC=NULL, override=T, source.now=T ){
	path = normalizePath(path);
	if( !override ){ unwatch.file( path ); }
	if( source.now ){ source(path); }
	tmp <- data.env$file.watches;
	tmp[[length(tmp)+1]] <- list( path=path, func=FUNC );
	data.env$file.watches <- tmp ;
	.js.client.callback( "file.watch", list( command="watch", path=path ));
}

#'
#' List watched files
#'
#' @export
js.client.watched.files <- function(){
	data.env$file.watches;
}

#'
#' Unwatch a file
#'
#' @param path Path to the file
#'
#' @export
js.client.unwatch.file <- function( path ){
	tmp <- data.env$file.watches;
	path = normalizePath(path);
	for( index in length(tmp):1 ){
		if( tmp[[index]]$path == path ){
			tmp[[index]] <- NULL;
		}
	}
	data.env$file.watches <- tmp;
	.js.client.callback( "file.watch", list( command="unwatch", path=path ));
}

#'
#' Remove all file watches
#'
#' @export
js.client.unwatch.all <- function(){
	data.env$file.watches <- list();
	.js.client.callback( "file.watch", list( command="clear" ));
}

#'
#' Notification when a watched file has changed.
#'
#' @param path Path to the file
#'
.js.client.file.changed <- function( filename, original_path ){
	x<- lapply( data.env$file.watches, function( watch ){
		if( watch$path == original_path ){
			if( is.null( watch$func )){
				.js.client.callback( "file.watch", list( command="reloading", filename=filename, original_path=original_path ));
				source( filename );
			}
			else {
				.js.client.callback( "file.watch", list( command="executing", filename=filename, original_path=original_path ));
				watch$func(filename);
			}
		}
	});
}

#------------------------------------------------------------------------------
# progress bars (for win/tk replacement, text progress bars are ok as-is)
#------------------------------------------------------------------------------

data.env$progress.bars <- list();
data.env$progress.bar.key <- 1;

#'
#' Create progress bar
#'
#' Create a progress bar and return the handle.
#'
#' @param min Minimum value 
#' @param max Maximum value 
#' @param initial Initial value.  Defaults to \code{min} 
#' @param ... Additional arguments (width, style)
#' @return An object of class \code{js.client.progress.bar}
#' @seealso \code{\link{js.client.get.progress.bar}}, \code{\link{js.client.set.progress.bar}}
#'
#' @export

js.client.progress.bar <- function( min=0, max=1, initial=min, ... ){

	key <- data.env$progress.bar.key;
	struct <- list( key=key, min=min, max=max, initial=initial, value=initial, ... );
	handle <- list( key=key );
	class(handle) <- "js.client.progress.bar";
	data.env$progress.bars[[toString(key)]] <- struct;
	.js.client.callback( "progress.bar", struct );
	
    print("A4");

	# increment key	for next call
	data.env$progress.bar.key <- data.env$progress.bar.key + 1;	
	
	return(handle);
}

#'
#' Get progress bar value
#'
#' @param pb An object of class \code{js.client.progress.bar}
#' @seealso \code{\link{js.client.progress.bar}}, \code{\link{js.client.set.progress.bar}}
#'
#' @export
js.client.get.progress.bar <- function( pb ){
	struct <- data.env$progress.bars[[toString(pb$key)]];
	return( struct$value );	
}

#'
#' Set value in a progress bar
#'
#' @param pb An object of class \code{js.client.progress.bar}
#' @param value A number
#' @seealso \code{\link{js.client.progress.bar}}, \code{\link{js.client.get.progress.bar}}
#'
#' @export
js.client.set.progress.bar <- function( pb, value ){
	struct <- data.env$progress.bars[[toString(pb$key)]];
	struct$value <- value;
	data.env$progress.bars[[toString(pb$key)]] <- struct;
	.js.client.callback( "progress.bar", struct );
	return( struct$value );	
}

#'
#' Close a progress bar handle
#'
#' implementation of generic \code{close} for objects of class 
#' \code{js.client.progress.bar}
#'
#' @param pb An object of class \code{js.client.progress.bar}
#' @seealso \code{\link{js.client.progress.bar}}, \code{\link{js.client.get.progress.bar}},
#' \code{\link{js.client.set.progress.bar}}
#'
#' @export
close.js.client.progress.bar <- function( pb ){
	struct <- data.env$progress.bars[[toString(pb$key)]];
	struct$closed <- T;
	.js.client.callback( "progress.bar", struct );
	data.env$progress.bars[[toString(pb$key)]] <- NULL;
}

#
# FIXME: move
#

.js.client.autocomplete <- function( text, pos ){
    tryCatch(
    	utils:::.win32consoleCompletion( text, pos ),
        error = function(e){
        }
    );
    utils:::.CompletionEnv;
}

});

attach( jsClientLib:::.client.env );

#-----------------------------------------------------------------------------
# requried libs (if any)
#-----------------------------------------------------------------------------

# jsClientLib is automatically loaded so no longer needs to be 
# loaded here -- but we should still have the error message somewhere

#library.loaded <- suppressWarnings( require( jsClientLib, quietly=T ));
#
#if( !library.loaded ){
#	stop( "	
#
#The jsClientLib library is not available.  Many functions in the shell
#depend on this library, and will not work as expected.  You can download
#the library from the git repo:
#
#https://github.com/sdllc/jsclientlib
#
#" );
#
#}

#-----------------------------------------------------------------------------
# set options (user can override)
#-----------------------------------------------------------------------------

options( 
	browser=function(url){ jsClientLib:::.js.client.callback( "browser", as.list( environment())) }, 
	pager=function( files, header, title, delete.file ){ .js.client.callback( "pager", as.list( environment())); },
	help_type='html'
);

#-----------------------------------------------------------------------------
# change some functions for the js shell.  FIXME: user configurable 
#-----------------------------------------------------------------------------

override.binding <- function( name, func, ns, assign.in.namespace=T ){
	
	if( exists( name ) ){ 
		package <- paste0( "package:", ns );
		
		unlockBinding( name, as.environment(package)); 
		assign( name, func, as.environment(package));

		if( assign.in.namespace ){
			ns <- asNamespace( ns );
			if (bindingIsLocked(name, ns)) {
				unlockBinding(name, ns)
				assign(name, func, envir = ns, inherits = FALSE)
				w <- options("warn")
				on.exit(options(w))
				options(warn = -1)
				lockBinding(name, ns)
			}
			else assign(name, func, envir = ns, inherits = FALSE);
		}
		
		lockBinding( name, as.environment(package)); 
	}
	else {
		# can't assign to a locked environment if there is no existing binding?
		# assign( name, func, .GlobalEnv);
	}
}

#-----------------------------------------------------------------------------
# override quit() and q() so we can close properly
#-----------------------------------------------------------------------------

override.binding( "quit", function(){ jsClientLib:::.js.client.callback( "system", list( cmd="quit", args=as.list(environment())))} , "base" ); 
override.binding( "q", function(){ jsClientLib:::.js.client.callback( "system", list( cmd="quit", args=as.list(environment())))} , "base" ); 

#-----------------------------------------------------------------------------
# we override install.packages and chooseCRANmirror to use the local
# mechanisms, but only when they are called with 0 arguments.  the 
# arguments are mapped to the replacement functions so that calltips 
# work as expected.
#-----------------------------------------------------------------------------

subvert.function <- function( base.name, ns ){
	package.name <- paste0( "package:", ns );
	original.function <- get( base.name, envir=as.environment( package.name ));
	f <- function(){
		if( nargs() == 0 ){
			jsClientLib:::.js.client.callback( "system", list( cmd=base.name, args=list()));
		}
		else {
			arglist <- as.list( match.call())[-1];
			do.call( original.function, arglist, envir=parent.env(environment()));
		}
	}
	formals(f) <- formals( original.function );
	override.binding( base.name, f, ns );
}
subvert.function( "install.packages", "utils" );
subvert.function( "chooseCRANmirror", "utils" );

#-----------------------------------------------------------------------------
# separately override history.  this won't actually overwrite the 
# utils::history binding because it's locked, but it does put it into
# that package's namespace
#-----------------------------------------------------------------------------

override.binding( "history", 
	function(max.show = 25, reverse = FALSE, pattern, ...){
		
		text <- jsClientLib:::.js.client.callback.sync( list( command="history" ));
		lines <- strsplit( text, "\n", fixed=T )[[1L]];
		
		if( !missing( pattern )){
			
			lines = lines[grep( pattern, lines, ... )];
			
			# from ?history: 
			#
			# When supplied, only unique matching lines are shown.
			# 
			
			lines = lines[ !duplicated(lines)];
		}
		
		lines <- rev(lines);
		lines <- lines[1:min(length(lines),max.show)];
		if( !reverse ) lines = rev(lines);
		
		cat( "\n" );
		cat( paste(" ", lines), sep="\n" );
		cat( "\n" );
		
	}, "utils");

#------------------------------------------------------------------------------
# autocomplete
#------------------------------------------------------------------------------

#--------------------------------------------------------
# this is a monkeypatch for the existing R autocomplete 
# functionality. we are making two changes: (1) for 
# functions, store the signagure for use as a call tip.  
# (2) for functions within environments, resolve and get 
# parameters.
#--------------------------------------------------------
rc.options( custom.completer = function (.CompletionEnv) 
{
	.fqFunc <- function (line, cursor=-1) 
	{
		localBreakRE <- "[^\\.\\w\\$\\@\\:]";

		if( cursor == -1 ){ cursor = nchar(line); }

	    parens <- sapply(c("(", ")"), function(s) gregexpr(s, substr(line, 
		1L, cursor), fixed = TRUE)[[1L]], simplify = FALSE)
	    parens <- lapply(parens, function(x) x[x > 0])
	       
	    
	    temp <- data.frame(i = c(parens[["("]], parens[[")"]]), c = rep(c(1, 
		-1), lengths(parens)))
	    if (nrow(temp) == 0) 
		return(character())
		
	    temp <- temp[order(-temp$i), , drop = FALSE]
	    wp <- which(cumsum(temp$c) > 0)

	    if (length(wp)) {
		index <- temp$i[wp[1L]]
		prefix <- substr(line, 1L, index - 1L)
		suffix <- substr(line, index + 1L, cursor + 1L)
		
		if ((length(grep("=", suffix, fixed = TRUE)) == 0L) && 
		    (length(grep(",", suffix, fixed = TRUE)) == 0L)) 
		    utils:::setIsFirstArg(TRUE)
		if ((length(grep("=", suffix, fixed = TRUE))) && (length(grep(",", 
		    substr(suffix, utils:::tail.default(gregexpr("=", suffix, 
			fixed = TRUE)[[1L]], 1L), 1000000L), fixed = TRUE)) == 
		    0L)) {
		    return(character())
		}
		else {
		    possible <- suppressWarnings(strsplit(prefix, localBreakRE, 
			perl = TRUE))[[1L]]
		    possible <- possible[nzchar(possible)]
		    if (length(possible)) 
			return(utils:::tail.default(possible, 1))
		    else return(character())
		}
	    }
	    else {
		return(character())
	    }
	}

	.fqFunctionArgs <- function (fun, text, S3methods = utils:::.CompletionEnv$settings[["S3"]], 
	    S4methods = FALSE, add.args = rc.getOption("funarg.suffix")) 
	{
		.tip <- F;
		.resolveObject <- function( name ){
			p <- environment();
			name <- sub( ",.*$", "", name );
			n <- unlist( strsplit( name, "[^\\w\\.]", F, T ));
			 while( length( n ) > 1 ){
				if( !exists( n[1], where=p )) return( NULL );
				p <- get( n[1], envir=p );
				n <- n[-1];
			}
			if( !exists( n[1], where=p )) return( NULL );
			list( name=n[1], fun=get( n[1], envir=p ));
		}
	
		.function.signature <- function(fun){
			x <- capture.output( args(fun));
			paste(trimws(x[-length(x)]), collapse=" ");
		}
	
		.fqArgNames <- function (fname, use.arg.db = utils:::.CompletionEnv$settings[["argdb"]]) 
		{
			funlist <- .resolveObject( fname );
			fun <- funlist$fun;
			if( !is.null(fun) && is.function(fun )) { 
				if( !.tip ){
					env <- utils:::.CompletionEnv;
					env$function.signature <- sub( '^function ', paste0( funlist$name, ' ' ), .function.signature(fun));
					.tip <<- T;
				}
				return(names( formals( fun ))); 
			}
			return( character());
		};

		if (length(fun) < 1L || any(fun == "")) 
			return(character())
		    specialFunArgs <- utils:::specialFunctionArgs(fun, text)
		if (S3methods && exists(fun, mode = "function")) 
			fun <- c(fun, tryCatch(methods(fun), warning = function(w) {
			}, error = function(e) {
			}))
		if (S4methods) 
			warning("cannot handle S4 methods yet")
		allArgs <- unique(unlist(lapply(fun, .fqArgNames)))
		ans <- utils:::findMatches(sprintf("^%s", utils:::makeRegexpSafe(text)), 
			allArgs)
		if (length(ans) && !is.null(add.args)) 
			ans <- sprintf("%s%s", ans, add.args)
		c(specialFunArgs, ans)
	}

	.CompletionEnv[["function.signature"]] <- "";
	.CompletionEnv[["in.quotes"]] <- F;

	    text <- .CompletionEnv[["token"]]
	    if (utils:::isInsideQuotes()) {
			.CompletionEnv[["in.quotes"]] <- T;
			if (.CompletionEnv$settings[["quotes"]]) {
				fullToken <- utils:::.guessTokenFromLine(update = FALSE)
				probablyHelp <- (fullToken$start >= 2L && ((substr(.CompletionEnv[["linebuffer"]], 
					fullToken$start - 1L, fullToken$start - 1L)) == 
					"?"))
				if (probablyHelp) {
					fullToken$prefix <- utils:::.guessTokenFromLine(end = fullToken$start - 
					2, update = FALSE)$token
				}
				probablyName <- ((fullToken$start > 2L && ((substr(.CompletionEnv[["linebuffer"]], 
					fullToken$start - 1L, fullToken$start - 1L)) == 
					"$")) || (fullToken$start > 3L && ((substr(.CompletionEnv[["linebuffer"]], 
					fullToken$start - 2L, fullToken$start - 1L)) == 
					"[[")))
				probablyNamespace <- (fullToken$start > 3L && ((substr(.CompletionEnv[["linebuffer"]], 
					fullToken$start - 2L, fullToken$start - 1L)) %in% 
					c("::")))
				probablySpecial <- probablyHelp || probablyName || 
					probablyNamespace

				tentativeCompletions <- if (probablyHelp) {
					substring(utils:::helpCompletions(fullToken$prefix, fullToken$token), 
					2L + nchar(fullToken$prefix), 1000L)
				}
				else if (!probablySpecial) 
					utils:::fileCompletions(fullToken$token)
				utils:::.setFileComp(FALSE)
				.CompletionEnv[["comps"]] <- substring(tentativeCompletions, 
					1L + nchar(fullToken$token) - nchar(text), 1000L)
			}
			else {
				.CompletionEnv[["comps"]] <- character()
				utils:::.setFileComp(TRUE)
			}
	    }
	    else {
			utils:::.setFileComp(FALSE)
			utils:::setIsFirstArg(FALSE)
			guessedFunction <- if (.CompletionEnv$settings[["args"]]) 
				.fqFunc(.CompletionEnv[["linebuffer"]], .CompletionEnv[["start"]])
			else ""
			
			.CompletionEnv[["fguess"]] <- guessedFunction
			fargComps <- .fqFunctionArgs(guessedFunction, text)
			
			if (utils:::getIsFirstArg() && length(guessedFunction) && guessedFunction %in% 
				c("library", "require", "data")) {
				.CompletionEnv[["comps"]] <- fargComps
				return()
			}
			lastArithOp <- utils:::tail.default(gregexpr("[\"'^/*+-]", text)[[1L]], 
				1)
			if (haveArithOp <- (lastArithOp > 0)) {
				prefix <- substr(text, 1L, lastArithOp)
				text <- substr(text, lastArithOp + 1L, 1000000L)
			}
			spl <- utils:::specialOpLocs(text)
			comps <- if (length(spl)) 
				utils:::specialCompletions(text, spl)
			else {
				appendFunctionSuffix <- !any(guessedFunction %in% 
				c("help", "args", "formals", "example", "do.call", 
				"environment", "page", "apply", "sapply", "lapply", 
				"tapply", "mapply", "methods", "fix", "edit"))
				utils:::normalCompletions(text, check.mode = appendFunctionSuffix)
			}
			if (haveArithOp && length(comps)) {
				comps <- paste0(prefix, comps)
			}
			comps <- c(fargComps, comps)
			.CompletionEnv[["comps"]] <- comps
	    }
});


})();

