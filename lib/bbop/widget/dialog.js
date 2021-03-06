/*
 * Package: dialog.js
 * 
 * Namespace: bbop.widget.dialog
 * 
 * BBOP object to produce a self-constructing/self-destructing
 * jQuery popup dialog.
 * 
 * This is a completely self-contained UI.
 */

if ( typeof bbop == "undefined" ){ var bbop = {}; }
if ( typeof bbop.widget == "undefined" ){ bbop.widget = {}; }

/*
 * Constructor: dialog
 * 
 * Contructor for the bbop.widget.dialog object.
 * 
 * The optional hash arguments look like:
 * 
 * Arguments:
 *  item - string or bbop.html to display.
 *  in_argument_hash - *[optional]* optional hash of optional arguments
 * 
 * Returns:
 *  self
 */
bbop.widget.dialog = function(item, in_argument_hash){
    
    this._is_a = 'bbop.widget.dialog';

    var anchor = this;

    // Per-UI logger.
    var logger = new bbop.logger();
    logger.DEBUG = true;
    function ll(str){ logger.kvetch('W (dialog): ' + str); }

    // Our argument default hash.
    var default_hash = {
	//modal: true,
	//draggable: false,
	width: 300, // the jQuery default anyways
	title: '',
	buttons: null,
	close:
	function(){
	    // TODO: Could maybe use .dialog('destroy') instead?
	    jQuery('#' + div_id).remove();
	}
    };
    var folding_hash = in_argument_hash || {};
    var arg_hash = bbop.core.fold(default_hash, folding_hash);

    // Not an argument for the dialog, so remove it.
    var title = arg_hash['title'];
    delete arg_hash['title'];

    ///
    /// Actually draw.
    ///

    // Coerce our argument into a string.
    var str = item || 'Nothing here...';
    if( bbop.core.what_is(item) != 'string' ){
	str = item.to_string();
    }

    // Create new div.
    var div = new bbop.html.tag('div', {'generate_id': true, title: title});
    var div_id = div.get_id();

    // Append div to end of body.
    jQuery('body').append(div.to_string());
    
    // Add text to div.
    jQuery('#' + div_id).append(str);
    
    // Boink!
    var dia = jQuery('#' + div_id).dialog(arg_hash);
};
