jQuery(document).ready(function($){
 var url = 'https://api.promio.com/api/postdata';
 var pAuth = 'AE1C7F21-D842-43F9-BD5E-38AC67467FBA';
 jQuery( ":input" ).each( function(index, elem) {
        if(jQuery(elem).attr('id') !== undefined){
         jQuery(elem).attr('name',jQuery(elem).attr('id'));
        }
 });
 jQuery("form").on("submit", function(e){
        console.log("Kick in");
        var cf_ld_id = jQuery( this ).attr('id');
        var cf_ld_className = jQuery(this).attr('class');
        var cf_formData         = jQuery(this).serializeArray();
        var cf_ld_formValid = true;  var cf_elem;
        var cf_parentForm   = null;  var cf_child = null;
        var cf_str  = { source: window.location.href,
         fields: []
        };
        jQuery.each(cf_formData, function(i, obj) {
         if(obj.name.indexOf('wpcf7') === -1){
           //Looking for Required fields and check if the value is empty
           cf_child = jQuery('form').find('[name="'+obj.name+'"]');
           cf_elem  = cf_child.attr('aria-required');
           if(typeof cf_elem !== typeof undefined){
             if(cf_elem && obj.value == '' && (!cf_child.hasClass('wpcf7-quiz'))){
               cf_ld_formValid = false;
               console.log(obj.name);
             }
             else if(cf_child.hasClass('wpcf7-validates-as-email')){
               if(!ldValidateEmail(obj.value)){
                 cf_ld_formValid = false;
                 console.log('Email:'+obj.name);
               }
             }
           }
           var attrList  = [];
           attrList = getAttributes(cf_child);
           attrList.value = obj.value;
           attrList.style = '';
           cf_str.fields.push(attrList);
         }
        });
        if(cf_ld_formValid){
         console.log("Sending Request");
         jQuery.ajax({
           type:"POST",
           contentType: "application/json",
           async: false,
           crossDomain: true,
           url:url+ '?AuthToken='+pAuth+'&DataMap=PromioExternalLead',
           data: JSON.stringify(cf_str),
           success: function(response){
             console.log(response);
           }
         });
        }
 });
});
function getAttributes ( node ) {
 var attrs = {};
 jQuery.each( node[0].attributes, function ( index, attribute ) {
        attrs[attribute.name] = attribute.value;
 } );
 return attrs;
};
function ldValidateEmail(email) {
  var expr = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
  return expr.test(email); //update
};
