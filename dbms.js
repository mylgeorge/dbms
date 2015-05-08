"use strict";
(function($){

    function _confirm() {
        var deferredObject = $.Deferred();

        var $target = $(this);
        var confirm = ($target.attr('confirm') !== undefined)?$target.attr('confirm'):$target.data('confirm');
        if( confirm !== undefined) {
            var fn = window[confirm];
            if (typeof fn === "function") {
                return fn.call(this);
            }
            else{
                var msg = ($target.attr('msg') !== undefined)?$target.attr('msg'):$target.data('msg');
                if( ! msg || msg === undefined){
                    msg = "Are you sure?";
                }
                if(window.confirm(msg)) 
                    deferredObject.resolve();
                else
                    deferredObject.reject();
            }
        }
        else {
            deferredObject.resolve();
        }

        return deferredObject.promise();
    };


    function postQueueInOrder( queue,forcedAction ) {
        
        if (queue.length === 0) return; 

        var arg = queue.shift();
        if($(arg).length !== 0){
            _confirm.call($(arg)[0]).done(function(){
                $(arg).postit({
                    onSuccess: function( data ) {
                        this.renderit( data ).selectit();
                        postQueueInOrder(queue);
                    },triggerAction:forcedAction
                });
            });
        }
        else{
            postQueueInOrder(queue);
        }      
    };

    $.fn.replaceWithMod = function(obj) {
        var $a = $(obj);
        this.replaceWith($a);
        return $a;  
    };

    $.fn.selectit = function(options){

        var settings = $.extend({
            'selectcls' : 'slt'
        },
        $.fn.selectit.defaults,
        options);

        var classes = '';

        var obj = this.closest('[objectid],[data-objectid]');
        var selector = this.closest('[selector],[data-selector]');
		
        if( selector.length===0 ){
            return this;
        }
        var cls = (selector.attr('cls') !== undefined)? selector.attr('cls'):selector.data('cls');

        if (cls === undefined || ! cls) {
            selector.find('.' + settings['selectcls']).each(function(){
                $(this).removeClass(settings['selectcls']);
            });
            obj.addClass(settings['selectcls']);
        }
        else{
            cls.split( ' ' ).forEach(function( val ){
                classes = classes + '.' + val;
            });
            selector.find(classes).each(function(){
                $(this).removeClass(cls);
            });
            obj.addClass(cls);
        }

        return this;
    };

    $.fn.postit = function(options) {

        var settings = $.extend({
            'async' : true,
            'fieldSeparator' : ",",
            onSuccess: function( data ) {
                this.renderit( data ).selectit();
            }
        },
        $.fn.postit.defaults,
        options);

        var post=[], href, val, $c, is_ok, valid=true, action, trigger, objectclass, send, autoAction, pre, value;

        var $data = {
            'controller' : this.closest('[controller],[data-controller]'),
            'objectId' : this.closest('[objectid],[data-objectid]'),
            'action' :   this.closest('[action],[data-action]')
        };
     
     if(settings['triggerAction']!=undefined) $data['action']=settings['triggerAction'];
        //controller element 
        //atrributes controller, auto-action, objectclass
        $c = $data['controller'];
        if( $c.length==0 ){
            console.log('No Controller found!');
            return null;
        }
        else if( $c.hasClass('loading') ){
            return null;
        }
        else {
            $c.addClass('loading');
        }

        href = ($c.attr('controller') !== undefined)? $c.attr('controller'):$c.data('controller');
        autoAction = ($c.attr('auto-action') !== undefined)? $c.attr('auto-action'):$c.data('autoAction');
        objectclass = ($c.attr('objectclass') !== undefined)? $c.attr('objectclass'):$c.data('objectclass');
        if(objectclass !== undefined) {
            post.push({
                'name' : 'objectClass', 
                'value' : objectclass
            });
        }

        //action element
        $c = $data['action'];
        //PRE TRIGGERD actions 
        pre = ($c.attr('preactions') !== undefined)? $c.attr('preactions'):$c.data('preactions');
        if( pre !== undefined ){
            pre = pre.split( settings['fieldSeparator'] ); 
            postQueueInOrder(pre);
        }

        //atrributes action, send
        val = ($c.attr('action') !== undefined)? $c.attr('action') : $c.data('action');
        send = ($c.attr('send') !== undefined)? $c.attr('send') : $c.data('send');

        if( send !== undefined ){
            send = send.split( settings['fieldSeparator'] ); 

            send.forEach(function(v){
                post.push({
                    'name' :  $(v).attr('name'), 
                    'value' : $(v).val()
                });
            });
        }

        if(val === undefined ) {
            if( autoAction === undefined || ! autoAction ){
                $data['controller'].removeClass('loading');
                return;
            }
            else
                val = autoAction;
        }

        post.push({
            'name' : 'action', 
            'value' : val
        });

        //objectid element
        var validate = ($c.attr('novalidate') !== undefined)? $c.attr('novalidate') : $c.data('novalidate');
        validate = (validate === undefined)? true : false;
        $c = $data['objectId'];
        val = ($c.attr('objectid') !== undefined)?$c.attr('objectid'):$c.data('objectid');
        if( val !== undefined ) {
            //check validation of objectid elemnt
            if(validate){
                $c.find("input,select,textarea").each(function(){
                    $(this).tooltip({
                        track: true,
                        disabled: true
                    });

                    validate = true;
                    var fnstr = ($(this).attr('validate') !== undefined)?$(this).attr('validate'):$(this).data('validate');
                    var fn = window[fnstr];
                    if (typeof fn === "function") {
                        validate = fn.call(this);
                    }

                    if( this.checkValidity() && validate ){
                        $(this).tooltip('disable');
                        $(this).removeClass('invalid');
                    }
                    else {
                        $(this).addClass('invalid');
                        $(this).tooltip('enable');
                        $(this).on('keyup', function(event){
                            $(this).removeClass('invalid');
                            $(this).tooltip('disable');
                            $(this).off('keyup');
                        });
                        if(valid) {
                            $(this).focus();
                            valid=false;
                        }
                    }

                    if( $(this).attr('type') === 'checkbox' ) {
                        value = $(this).prop('checked')?1:0;
                    }
                    else{
                        value = $(this).val();
                    }

                    post.push({
                        'name' : $(this).attr("name"), 
                        'value' : value 
                    });
                });
            }
            post.push({
                'name' : 'objectId', 
                'value' : val
            });
        }

        //check valid data
        if( ! valid ){
            $data['controller'].removeClass('loading');
            return;
        }

        //post obectid with data to controller url
        //onSuccess callback returns data from request
        var _self = this;
        $.ajax({
            type: 'POST',
            //contentType: 'multipart/form-data',
            url: href,
            data: post,
            async: settings['async'],
            success: function( data, textStatus, jqXHR ){
                $data['controller'].removeClass('loading');
                settings.onSuccess.call( _self , data );

                //postactions
                $c = $data['action'];
                pre = ($c.attr('postactions') !== undefined)? $c.attr('postactions'):$c.data('postactions');
                if( pre !== undefined ){
                    pre = pre.split( settings['fieldSeparator'] ); 
                    postQueueInOrder(pre);
                }
            }
        });	
        return this;
    };

    $.fn.renderit = function(mod, options) {

        var settings = $.extend({
            onSuccess : function(){} 
        }, 
        $.fn.renderit.defaults,
        options);

        var $v, href, newObj, action, renderer, target;

        action = this.closest('[action],[data-action]');
        renderer = (action.attr('target') !== undefined)? action.attr('target'):action.data('target');
        if( renderer === undefined  ){
            renderer = this.closest('[controller],[data-controller]');

            if( $(renderer)[0] === undefined ) {
                renderer = null;
            }
            else {
                target = (renderer.attr('target') !== undefined)? renderer.attr('target'):renderer.data('target');
                if( target !== undefined && $(target).length !==0 ) {
                    renderer = $(target);
                }

            }
        }
        else if (renderer === 'this') {
            renderer = this;
        }

        if( ! renderer ) return this;
		
        if (typeof window[renderer] === "function") {
            window[renderer].call(this, mod);
        }
        else{
            newObj = $(renderer).replaceWithMod( mod );
            settings.onSuccess.call( newObj );
            $(newObj).autoAjaxify();
        }
        return this;
    };

    //bind the events in an action
    $.fn.autoAjaxify = function(options) {
        // Create some defaults, extending them with any options that were provided
        var settings = $.extend({
            'debug' : false,
            'cls' : 'ajaxified',
            'fieldSeparator' : ",",
            'dateformat' : 'dd/mm/yy'
        },
        $.fn.autoAjaxify.defaults,
        options);

        var txt, trigger, type, slt, $action, $this, $target, $ctr;

        //<span fire-on="change" trigger="#..." observe=""
       
        this.find( '[action],[data-action]' ).each(function(){
            $action = $(this);

            $action.addClass( settings['cls'] );
            var act = ($action.attr('action') !== undefined)?$action.attr('action'):$action.data('action');

            var evnt = ($action.attr('bind') !== undefined)?$action.attr('bind'):$action.data('bind');

            if( evnt === undefined || ! evnt)
                evnt = 'click tap';

            $action.on(evnt,function(event){
                event.preventDefault(); 
                $target = $(this);
                _confirm.call(this).done(function() {
                    $target.postit();
                })
            });
            $action.trigger('load');
        });

        this.find( "input,select,textarea" ).each(function(){
            $this = $(this);


            slt = ($this.attr('select-value') !== undefined) ? $this.attr('select-value') : $this.attr('data-select-value');
            if( slt !== undefined && slt ){
                $this.val(slt);
            }
            // trigger = ($this.attr('trigger') !== undefined) ? $this.attr('trigger') : $this.data('trigger');
            // if( trigger !== undefined ){
            // 	trigger = trigger.split( settings['fieldSeparator'] ); 

            // 	trigger.forEach(function(v){
            // 		$(v).postit({
            // 			onSuccess: function() {
            //         		this.obj.render( this.data );
            // 			}
            // 		})
					
            // 	});
            // }

            //$('<span />').html(txt).insertAfter( $this ).on('click tap',function(ev){
            // 	$(ev.target).css('display','none');
            // 	$(ev.target).prev().css('display','block').focus;
            //});
            //$this.css('display','none');

            $this.on('change',function(event){
                $target = $(this);

                trigger = ($target.attr('trigger') !== undefined) ? $target.attr('trigger') : $target.data('trigger');
                if( trigger === undefined ){
                    $ctr = $target.closest('[controller],[data-controller]');
                    if( $ctr === undefined ) return false;
                    trigger = ($ctr.attr('trigger') !== undefined) ? $ctr.attr('trigger') : $ctr.data('trigger');
                    if( trigger === undefined ) return false;
                    else trigger = $(trigger); 
                }
                else{
                    trigger = trigger.split( settings['fieldSeparator'] ); 
                }
		 		
                postQueueInOrder([$target],trigger);
            });


            if(jQuery().datepicker && $this.attr('type') === 'datepicker' ) {
                $this.datepicker({ 
                    dateFormat: settings['dateformat']
                });
                if( ! $this.val() )
                    $this.datepicker("setDate",new Date());
            }
            //     	else if($this.attr('type') === 'checkbox'){
            // $this.off("change");
            // $this.on('change',function(event){
            // 		alert('ok');
            // 	});
            //     	}
            else {
                type = ($this.attr('extend') !== undefined)?$this.attr('extend'):$this.data('extend');
                var fn = window[type];

                if (typeof fn === "function") {
                    fn.call(this);
                }
            }
        	
        });

        return this;
    }
}(jQuery));
/*
(function( $ ){

    var methods = {
        init : function(options) {

        },
        show : function( ) {    },// IS
        hide : function( ) {  },// GOOD
        update : function( content ) {  }// !!!
    };

    $.fn.tooltip = function(methodOrOptions) {
        if ( methods[methodOrOptions] ) {
            return methods[ methodOrOptions ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof methodOrOptions === 'object' || ! methodOrOptions ) {
            // Default to "init"
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  methodOrOptions + ' does not exist on jQuery.tooltip' );
        }    
    };


})( jQuery );
http://stackoverflow.com/questions/1117086/how-to-create-a-jquery-plugin-with-methods?rq=1
*/