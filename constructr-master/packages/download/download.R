
#------------------------------------------------------------------------------
# download: add handler for download method "js", which uses built-in 
# support in electron
#------------------------------------------------------------------------------

(function(){

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
}

download.file.original <- get( "download.file", envir=as.environment( "package:utils" ));
override.binding( "download.file",  
	function (url, destfile, method, quiet = FALSE, mode = "w", cacheOK = TRUE, 
    	extra = getOption("download.file.extra")) 
	{
		# arglist <- as.list( match.call())[-1];
		# cat( paste( "DL", url, destfile, "\n" ));

		method <- if (missing(method)) 
			getOption("download.file.method", default = "auto")
		else match.arg(method, c("auto", "internal", "wininet", "libcurl", 
			"wget", "curl", "lynx", "js"))
		
		if( method == "js" ){
			jsClientLib:::.js.client.callback.sync( list( arguments=as.list(environment()), command="download" ));
		}
		else {
			# do.call( download.file.original, arglist, envir=parent.env(environment()));
			do.call( download.file.original, as.list(environment()), envir=parent.env(environment()));
		}
	}, "utils", T );

options( download.file.method="js" );

})();

