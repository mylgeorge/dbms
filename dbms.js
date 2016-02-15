"use strict";
(function ($) {
    var debug = false;
    var countLoaders, loaderStart, loaderStop;

    function _confirm() {
        var deferredObject = $.Deferred();

        var $target = $(this);
        var confirm = ($target.attr('confirm') !== undefined) ? $target.attr('confirm') : $target.data('confirm');
        if (confirm !== undefined) {
            if (isFunction(confirm)) {
                return eval(confirm).call(this);
            }
            else {
                var msg = ($target.attr('msg') !== undefined) ? $target.attr('msg') : $target.data('msg');
                if (!msg || msg === undefined) {
                    msg = "Are you sure?";
                }
                if (window.confirm(msg))
                    deferredObject.resolve();
                else
                    deferredObject.reject();
            }
        }
        else {
            deferredObject.resolve();
        }

        return deferredObject.promise();
    }
    ;

    function isFunction(fn) {
        return /^\$?[a-zA-Z._]+$/.test(fn) && eval('typeof ' + fn) === "function";
    }
    ;

    function postQueueInOrder(q, thiscontext) {
        if (thiscontext instanceof jQuery)
            thiscontext = thiscontext[0];

        if (debug)
            console.log('DEBUG:process postQueueInOrder:' + q);

        var queue = q.slice();
        if (queue.length === 0)
            return;

        var arg = queue.shift();
        if (isFunction(arg)) {

            if (debug)
                console.log('DEBUG:execute postQueueInOrder Function:' + arg);

            eval(arg).call(thiscontext);
            postQueueInOrder(queue, thiscontext);
        }
        else if ($(arg).length !== 0) {
            _confirm.call($(arg)[0]).done(function () {
                $(arg).postit({
                    onSuccess: function (data, type) {
                        if (type === 'json') {
                            this.renderit(data, {
                                'json': true
                            });
                        }
                        else {
                            this.renderit(data);//.selectit();
                        }
                        postQueueInOrder(queue, thiscontext);
                    }
                });
            });
        }
        else {
            if (debug)
                console.log('DEBUG: postQueueInOrder not found :' + arg);
            postQueueInOrder(queue, thiscontext);
        }
    }
    ;

    $.fn.replaceWithMod = function (obj) {
        var $a = $(obj);
        this.replaceWith($a);
        return $a;
    };

    $.fn.selectit = function (options) {

        var settings = $.extend({
            'selectcls': 'slt'
        },
        $.fn.selectit.defaults,
                options);

        var classes = '';

        var obj = this.closest('[objectid],[data-objectid]');
        var selector = this.closest('[selector],[data-selector]');

        if (selector.length === 0) {
            return this;
        }
        var cls = (selector.attr('cls') !== undefined) ? selector.attr('cls') : selector.data('cls');

        if (cls === undefined || !cls) {
            selector.find('.' + settings['selectcls']).each(function () {
                $(this).removeClass(settings['selectcls']);
            });
            obj.addClass(settings['selectcls']);
        }
        else {
            cls.split(' ').forEach(function (val) {
                classes = classes + '.' + val;
            });
            selector.find(classes).each(function () {
                $(this).removeClass(cls);
            });
            obj.addClass(cls);
        }

        return this;
    };

    $.fn.postit = function (options) {

        var settings = $.extend({
            'dataType': 'html',
            'async': true,
            'fieldSeparator': ",",
            onSuccess: function (data, type) {
                if (type === 'json')
                    this.renderit(data, {
                        'json': true
                    });
                else
                    this.renderit(data);//.selectit();
            }
        },
        $.fn.postit.defaults,
                options);

        var post = [], href, val, $c, is_ok, valid = true, action, trigger, loadpage, objectclass, send, autoAction, pre, value, posttarget, datatype;

        var $data = {
            'controller': this.closest('[controller],[data-controller]'),
            'objectId': this.closest('[objectid],[data-objectid]'),
            'action': this.closest('[action],[data-action]')
        };
        //controller element 
        //atrributes controller, auto-action, objectclass
        $c = $data['controller'];

        if ($c.length == 0) {
            console.error('No Controller found!');
            return null;
        }
        else if ($c.hasClass('loading')) {
            console.error('Controller busy loading! Try queue up your actions!');
            return null;
        }
        else {
            $c.addClass('loading');
        }

        href = ($c.attr('controller') !== undefined) ? $c.attr('controller') : $c.data('controller');
        autoAction = ($c.attr('auto-action') !== undefined) ? $c.attr('auto-action') : $c.data('autoAction');
        objectclass = ($c.attr('objectclass') !== undefined) ? $c.attr('objectclass') : $c.data('objectclass');

        posttarget = ($c.attr('target') !== undefined) ? $c.attr('target') : $c.data('target');
        datatype = ($c.attr('datatype') !== undefined) ? $c.attr('datatype') : $c.data('datatype');

        if (!href)
            href = $.fn.autoAjaxify.defaults['controller'];

        if (objectclass !== undefined) {
            post.push({
                'name': 'objectClass',
                'value': objectclass
            });
        }


        //action element
        $c = $data['action'];
        loadpage = ($c.attr('loadpage') !== undefined) ? $c.attr('loadpage') : $c.data('loadpage');
        if (loadpage !== undefined) {
            post.push({
                'name': 'pageid',
                'value': loadpage
            });
        }
        //PRE TRIGGERD actions 
        pre = ($c.attr('preactions') !== undefined) ? $c.attr('preactions') : $c.data('preactions');
        if (pre !== undefined) {
            if (debug)
                console.log('DEBUG:0-queue postactions:' + pre);
            pre = pre.split(settings['fieldSeparator']);
            postQueueInOrder(pre, $c);
        }

        //atrributes action, send
        val = ($c.attr('action') !== undefined) ? $c.attr('action') : $c.data('action');
        send = ($c.attr('send') !== undefined) ? $c.attr('send') : $c.data('send');

        if (send !== undefined) {
            send = send.split(settings['fieldSeparator']);

            send.forEach(function (v) {
                post.push({
                    'name': $(v).attr('name'),
                    'value': $(v).val()
                });
            });
        }

        for (var extraParam in $.fn.autoAjaxify.defaults['extraParams']) {
            post.push({
                'name': extraParam,
                'value': $.fn.autoAjaxify.defaults['extraParams'][extraParam]
            });
        }

        // $.fn.autoAjaxify.defaults['extraParams'].forEach(function (v) {
        //         post.push({
        //             'name': $(v).attr('name'),
        //             'value': $(v).val()
        //         });
        //     });

        if (val === undefined) {
            if (autoAction === undefined || !autoAction) {
                console.error('No Action found!');
                $data['controller'].removeClass('loading');
                return;
            }
            else
                val = autoAction;
        }

        post.push({
            'name': 'action',
            'value': val
        });

        //objectid element
        var validate = ($c.attr('novalidate') !== undefined) ? $c.attr('novalidate') : $c.data('novalidate');
        validate = (validate === undefined) ? true : false;
        $c = $data['objectId'];
        val = ($c.attr('objectid') !== undefined) ? $c.attr('objectid') : $c.data('objectid');
        if (val !== undefined) {
            //check validation of objectid elemnt
            if (validate) {
                $c.find("input,select,textarea").each(function () {
                    $(this).tooltip({
                        track: true,
                        disabled: true
                    });

                    validate = true;
                    var fn = ($(this).attr('validate') !== undefined) ? $(this).attr('validate') : $(this).data('validate');
                    if (isFunction(fn)) {
                        validate = eval(fn).call(this);
                    }

                    if (this.checkValidity() && validate) {
                        $(this).tooltip('disable');
                        $(this).removeClass('invalid');
                    }
                    else {
                        $(this).addClass('invalid');
                        $(this).tooltip('enable');
                        $(this).on('keyup', function (event) {
                            $(this).removeClass('invalid');
                            $(this).tooltip('disable');
                            $(this).off('keyup');
                        });
                        if (valid) {
                            $(this).focus();
                            valid = false;
                        }
                    }

                    if ($(this).attr('type') === 'checkbox') {
                        if ($(this).attr('name').indexOf('[]') > 0) {
                            if ($(this).prop('checked'))
                                value = $(this).attr('value');
                            else
                                value = "";
                        } else
                            value = $(this).prop('checked') ? 1 : 0;
                    }
                    else {
                        value = $(this).val();
                    }

                    post.push({
                        'name': $(this).attr("name"),
                        'value': value
                    });
                });
            }
            post.push({
                'name': 'objectId',
                'value': val
            });
        }

        //check valid data
        if (!valid) {
            $data['controller'].removeClass('loading');
            return;
        }

        //post obectid with data to controller url
        //onSuccess callback returns data from request
        var _self = this;

        if (debug)
            console.log('DEBUG process for target:' + posttarget);

        if (posttarget == "_blank") {
            $data['controller'].removeClass('loading');
            window.open(href);
            $c = $data['action'];
            pre = ($c.attr('postactions') !== undefined) ? $c.attr('postactions') : $c.data('postactions');
            if (pre !== undefined) {

                if (debug)
                    console.log('DEBUG:queue postactions:' + pre);

                pre = pre.split(settings['fieldSeparator']);
                postQueueInOrder(pre, $c);

            }
        } else {

            if (loaderStart !== null)
                loaderStart(posttarget, $data['action']);

            $.ajax({
                type: 'POST',
                dataType: datatype ? datatype : settings['dataType'],
                //jsonpCallback: 'test',
                url: href,
                data: post,
                async: settings['async'],
                success: function (data, textStatus, jqXHR) {
                    $data['controller'].removeClass('loading');
                    if (loaderStop != null)
                        loaderStop(posttarget, $data['controller']);

                    var ct = jqXHR.getResponseHeader("content-type") || "";
                    if (ct.indexOf('json') > -1) {
                        settings.onSuccess.call(_self, JSON.parse(data), 'json');
                    }
                    else {
                        settings.onSuccess.call(_self, data);
                    }

                    //postactions
                    $c = $data['action'];
                    pre = ($c.attr('postactions') !== undefined) ? $c.attr('postactions') : $c.data('postactions');
                    if (pre !== undefined) {
                        if (debug)
                            console.log('DEBUG:queue postactions:' + pre);
                        pre = pre.split(settings['fieldSeparator']);
                        postQueueInOrder(pre, $c);
                    }

                },
                error: function (e) {
                    $data['controller'].removeClass('loading');
                    console.error(e);
                },
                complete: function () {

                }
            });
        }
        return this;
    };

    $.resizecalls = function () {
        $('[heighttofill],[data-heighttofill]').each(function () {

            var $thisEl = $(this);
            var rs = $thisEl.attr('heighttofill');
            if (rs == undefined)
                rs = $thisEl.data('heighttofill');

            var ww = $(window).width();
            var hh = $(window).height();
            var v = 0;
            if (rs == "tobottom") {
                if (ww > 800) {
                    var offsetparams = $thisEl.offset();
                    v = hh - offsetparams.top;
                } else
                    v = hh;
            } else if (rs == "css") {
                v = "calc(100% - 10px)";
            } else {
                var offsetparams = $thisEl.offset();
                var topy = offsetparams.top;
                rs = rs.replace("hh", hh);
                rs = rs.replace("top", topy);
                rs = "v=" + rs.replace("ww", ww);
                eval(rs);
            }
            //   alert(v);

            if (v > 80) {
                $thisEl.css('overflow', 'auto');
                $thisEl.css('height', v);
            }
            if (debug)
                console.log('Height resize:' + $thisEl.attr('id') + ">" + v + "px");
        });
        $('[bind="resize"]').each(function () {

            var funcToCall = ($(this).attr('action') !== undefined) ? $(this).attr('action') : $(this).data('action');
            if (isFunction(funcToCall))
                eval(funcToCall).call(this);

            if (debug)
                console.log('On Resize trigger:' + funcToCall);
        });
    };

    // $.fn.renderJSON = function (mod, options) {
    //      var settings = $.extend({
    //             onSuccess: function () {
    //             }
    //         },
    //         $.fn.renderJSON.defaults,
    //         options);

    //     var action, template, htmlOutput, prop, data;

    //     action = this.closest('[action],[data-action]');
    //     if (action.length === 0) {
    //         action = this.closest('[auto-action],[data-auto-action]');
    //     }

    //     if(prop) data = mod[prop];
    //     else data = mod;
    //     if(!$.templates) return this;
    //     template = $.templates(template);
    //     htmlOutput = template.render(data);

    //     $("#result").html(htmlOutput);

    //     console.log("ok");
    //     return this;
    // };

    $.fn.renderit = function (mod, options) {

        var settings = $.extend({
            'json': false,
            onSuccess: function () {
            }
        },
        $.fn.renderit.defaults,
                options);

        var $v, href, newObj, action, renderer, target, template, htmlOutput, prop, data, form;

        action = this.closest('[action],[data-action]');
        if (action.length === 0) {
            action = this.closest('[auto-action],[data-auto-action]');
        }
        renderer = (action.attr('target') !== undefined) ? action.attr('target') : action.data('target');

        if (renderer === undefined) {
            renderer = this.closest('[controller],[data-controller]');

            if ($(renderer)[0] === undefined) {
                renderer = null;
            }
            else {
                target = (renderer.attr('target') !== undefined) ? renderer.attr('target') : renderer.data('target');
                if (target !== undefined && $(target).length !== 0) {
                    renderer = $(target);
                }

            }
        }
        else if (renderer === 'this') {
            renderer = this;
        } else if (renderer === '_blank') {
            // if (loaderStop != null)
            //     loaderStop();
            var w = window.open();
            w.document.write(mod);
            w.document.close();

            return this;
        }
        // else if(eval("typeof " + renderer) === "function")  {
        //     if (loaderStop != null) loaderStop();
        //     eval(renderer).call(this, mod);
        //     return this;
        // }
        else if (typeof window[renderer] === "function") {
            // if (loaderStop != null)
            //     loaderStop();
            if (debug)
                console.log('DEBUG:renderer calls:' + renderer);

            window[renderer].call(this, mod);
            return this;
        }

        if (debug)
            console.log('DEBUG:render data in:' + renderer);

        if (!renderer) {
            // if (loaderStop != null)
            //     loaderStop();
            return this;
        }

        if (settings['json']) {
            template = (action.attr('template') !== undefined) ? action.attr('template') : action.data('template');
            prop = (action.attr('json-selector') !== undefined) ? action.attr('json-selector') : action.data('jsonSelector');
            form = $(renderer)[0];

            data = mod;

            if (prop) {
                var props = prop.split('.');
                for (var i = 0; i < props.length; i++) {
                    if (data[props[i]]) {
                        data = data[props[i]];
                    }
                    else {
                        data = mod;
                        break;
                    }
                }

            }

            if (!$.templates || template === undefined || $(template).length === 0)
            {

                if (form !== undefined || $(form).length !== 0) {
                    $('[name],[data-name]', form).each(function () {
                        var v = ($(this).attr('name') !== undefined) ? $(this).attr('name') : $(this).data('name');
                        if (data[v]) {
                            if (this.tagName === 'DIV' || this.tagName === 'SPAN')
                                $(this).text(data[v]);
                            else
                                $(this).val(data[v]);
                        }
                    });
                }

                return this;
            }

            var templateSrc = ($(template).attr('src') !== undefined) ? $(template).attr('src') : $(template).data('src');
            if (templateSrc !== undefined) {
                console.log("todo");
                $.ajax({
                    url : templateSrc,
                //     //cache: true,
                    success: function(data){
                //         _renderer();
                //         console.log("ajax2");
                //         console.log(data);
                //         // template = $.templates({ tmpl: tmplData });
                //         // htmlOutput = template.render(data);

                        $(template).replaceWithMod(data);
                //         // if (loaderStop != null) loaderStop(renderer);
                //         // settings.onSuccess.call(newObj);
                //         // $.resizecalls();
                //         // $(newObj).autoAjaxify();
                  }
                });
                // // $.when($.get(templateSrc))
                // //     .done(function(tmplData) {
                // //         console.log(tmplData);
                // //     });
            }
            
            if (data.object !== undefined && data.object.html !== undefined) {
                htmlOutput = data.object.html;
                _render();
            }
            else {
                template = $.templates(template);
                htmlOutput = template.render(data);
                _render();
            }
        }
        else {
            htmlOutput = mod;
            _render();
        }

        return this;

        function _render() {
            newObj = $(renderer).replaceWithMod(htmlOutput);
            // if (loaderStop != null)
            //     loaderStop(renderer);
            settings.onSuccess.call(newObj);
            $.resizecalls();
            $(newObj).autoAjaxify();
        }

    };

    //bind the events in an action
    $.fn.autoAjaxify = function (options) {
        // Create some defaults, extending them with any options that were provided
        var settings = $.extend({
            'debug': false,
            'cls': 'ajaxified',
            'fieldSeparator': ",",
            'dateformat': 'dd/mm/yy',
            'startLoader': null,
            'stopLoader': null,
            'controller': '',
            'extraParams': {}
        },
        $.fn.autoAjaxify.defaults,
                options);

        $.fn.autoAjaxify.defaults = settings;
        loaderStart = settings['startLoader'];
        loaderStop = settings['stopLoader'];
        debug = settings['debug'];
        var txt, trigger, type, slt, $action, $this, $target, $ctr, autoAction, evnt;

        $.resizecalls();
        $(window).resize(function () {
            clearTimeout($.data(this, 'resizeTimer'));
            $.data(this, 'resizeTimer', setTimeout(function () {
                //do something
                $.resizecalls();
            }, 200));
        });

        this.find("input,select,textarea").addBack("input,select,textarea").each(function () {
            $this = $(this);

            slt = ($this.attr('select-value') !== undefined) ? $this.attr('select-value') : $this.attr('data-select-value');
            if (slt !== undefined && slt) {
                $this.val(slt);
            }

            trigger = ($this.attr('trigger') !== undefined) ? $this.attr('trigger') : $this.data('trigger');
            if (trigger === undefined) {
                $ctr = $this.closest('[controller],[data-controller]');
                if ($ctr !== undefined) {
                    //data-bind
                    evnt = ($ctr.attr('bind') !== undefined) ? $ctr.attr('bind') : $ctr.data('bind');
                    if (evnt === undefined || !evnt)
                        evnt = 'change';
                    //data-trigger
                    trigger = ($ctr.attr('trigger') !== undefined) ? $ctr.attr('trigger') : $ctr.data('trigger');
                    if (trigger === undefined) {
                        autoAction = ($ctr.attr('auto-action') !== undefined) ? $ctr.attr('auto-action') : $ctr.data('autoAction');
                        if (autoAction !== undefined) {
                            $this.on(evnt, {
                                "trigger": $this
                            }, function (event) {
                                event.data.trigger.postit();
                            });
                        }
                    }
                    else {
                        trigger = trigger.split(settings['fieldSeparator']);
                        $this.on(evnt, {
                            "trigger": trigger
                        }, function (event) {
                            postQueueInOrder(event.data.trigger, $ctr);
                        });
                    }

                }
            }
            else {
                trigger = trigger.split(settings['fieldSeparator']);
                //data-bind
                evnt = ($this.attr('bind') !== undefined) ? $this.attr('bind') : $this.data('bind');
                if (evnt === undefined || !evnt)
                    evnt = 'change';
                $this.on(evnt, {
                    "trigger": trigger
                }, function (event) {
                    postQueueInOrder(event.data.trigger, $this);
                });
            }

            var eltype = ($this.attr('type') !== undefined) ? $this.attr('type') : $this.data('type');
            if (jQuery().datepicker && eltype === 'datepicker') {
                var noinit = evnt = ($this.attr('noinit') !== undefined) ? $this.attr('noinit') : $this.data('noinit');
                $this.datepicker({
                    dateFormat: settings['dateformat']
                });
                if (!$this.val() && noinit === undefined)
                    $this.datepicker("setDate", new Date());
            }
            else {
                type = ($this.attr('extend') !== undefined) ? $this.attr('extend') : $this.data('extend');
                if (isFunction(type)) {
                    eval(type).call(this);
                }
            }

        });

        this.find('[action],[data-action]').addBack('[action],[data-action]').each(function () {
            $action = $(this);
            if ($(this).prop("tagName") === 'FORM')
                return;
            $action.addClass(settings['cls']);
            var act = ($action.attr('action') !== undefined) ? $action.attr('action') : $action.data('action');

            var evnt = ($action.attr('bind') !== undefined) ? $action.attr('bind') : $action.data('bind');
            if (evnt === undefined || !evnt)
                evnt = 'click tap';
            if (evnt !== 'resize')
                $action.on(evnt, function (event) {
                    $action = $(this);
                    act = ($action.attr('action') !== undefined) ? $action.attr('action') : $action.data('action');

                    if (debug)
                        console.log('TRIGGER:' + act + ">" + event.target);

                    event.preventDefault();
                    $target = $(this);

                    if (isFunction(act)) {
                        if (debug)
                            console.log('Trigger funcion by actuin:' + act);
                        eval(act).call(this); //if the function does not exists it creates a rat reload loop FIXIT
                    } else
                        _confirm.call(this).done(function () {
                            if (debug)
                                console.log('Confiramtions are good:' + $target.attr('id'));
                            $target.postit();
                        }).fail(function () {
                            if (debug)
                                console.log('FAILED confirmation:' + $target.attr('id'));
                            // loaderStop();
                        });
                });

            $action.trigger('load');
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
