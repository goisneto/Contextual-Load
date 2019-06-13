function contextualLoad(target, callback) {
    var $ = function(query, all, filter) {
            var callee = arguments.callee,
                context = this,
                queryCall = 'querySelector',
                rt;
            if (this == window) {
                context = target;
            }
            if (typeof query == 'string') {
                if (!!all) queryCall = 'querySelectorAll';
                rt = context[queryCall](query);
            } else if (typeof query == 'object' || typeof query == 'function') rt = query;
            else return query;
            if (typeof filter == 'function' && (rt_ = Array.prototype.map.apply(rt, [function(e) { return e; }])).length > 0)
                rt = rt_.filter(filter);
            rt.$ = function(query, all, filter) {
                return callee.apply(this, arguments);
            };
            rt.protos = function(callback) {
                return (function(doc, arr) {
                    if (!Array.isArray(arr)) arr = [];
                    if (doc == null) return arr;
                    if (typeof doc == 'object' || typeof doc == 'function') {
                        if (typeof callback == 'function')
                            arr.push(callback(doc, arr));
                        else
                            arr.push(doc);
                    }
                    if (typeof doc.__proto__ == 'object') arr = arguments.callee(doc.__proto__, arr);
                    return arr;
                })(this);
            };
            rt.keys = function() {
                return Object.assign.apply(Object, this.protos(function(proto) { return Object.keys(proto); }));
            };
            rt.getOwnPropertyDescriptors = function() {
                return Object.assign.apply(Object, this.protos(function(proto) { return Object.getOwnPropertyDescriptors(proto); }));
            };
            return rt;
        },
        ajax = function(method, data, success, data_) {
			var rt;
			try{
				var xhr = new XMLHttpRequest();
				rt = { xhr: xhr, onerror: null, onaways: null, url: data, data: data_, method: method };
				xhr.onreadystatechange = function() {
					if (typeof rt.onaways == 'function') rt.onaways(rt);
					if (this.readyState == 4) {
						if (this.status == 200) {
							if (typeof success == 'function') {
								success(rt);
							}
						} else if (typeof rt.onerror == 'function') rt.onerror(rt);
					}
				};
				xhr.open(method, data, true);
				xhr.send(data_);
				return rt;
			}catch(e){
				setTimeout(function(){
					if(typeof rt.onaways == 'function') rt.onaways(rt);
					if(typeof rt.onerror == 'function') rt.onerror(rt);
				});
				return rt;
			}
        },
        contextWalk = function(context, data, callback) {
            var callee = arguments.callee,
                contextualKeys = $(context).$("[data-contextual-key]", true, function(e) {
                    var parentChild = function(e) {
                        return e.parentElement && (context.hasChildNodes(e.parentElement) || arguments.callee(e.parentElement));
                    };
                    return parentChild({ parentElement: e });
                });
            if (Array.isArray(data)) {
                var contextClone_ = context.cloneNode(true);
                delete contextClone_.dataset['contextualKey'];
                delete contextClone_.dataset['contextual'];
                data.forEach(function(e, i) {
                    contextClone = contextClone_.cloneNode(true);
                    if (i == 0) {
                        callee(context, e);
                    } else {
                        callee(contextClone, e);
                        context.parentElement.appendChild(contextClone);
                    }
                });
            } else if (typeof data == 'object') {
                contextualKeys.forEach(function(e) {
                    var key = e.dataset['contextualKey'];
                    if (data[key]) {
                        callee(e, data[key]);
                        delete data[key];
                    }
                });
                (function(data, context) {
                    if (typeof context != 'object' && typeof context != 'function') return context;
                    var callee_k = arguments.callee,
                        contextProtosKeys = $(context).keys(),
                        OwnPropertyDescriptors = $(context).getOwnPropertyDescriptors();
                    Object.keys(data).forEach(function(k) {
                        var v = data[k];
                        (function(v) {
                            var callee_v = arguments.callee;
                            if (Array.isArray(v)) {
                                v.forEach(function(v_) {
                                    if (Array.isArray(v_)) {
                                        if (contextProtosKeys.indexOf(k) > -1 && typeof context[k] == 'function')
                                            return context[k].apply(context, [v]);
                                        else if (typeof OwnPropertyDescriptors[k] == 'object' && (typeof OwnPropertyDescriptors[k].set == 'function' || OwnPropertyDescriptors[k].writable))
                                            return context[k] = v;
                                    }
                                    return callee_v(v_, context);
                                });
                            } else if (v != null && typeof v == 'object') {
                                callee_k(v, context[k]);
                            } else {
                                if (contextProtosKeys.indexOf(k) > -1 && typeof context[k] == 'function') {
                                    var args = [];
                                    if (v != null) args.push(v);
                                    return context[k].apply(context, args);
                                } else if (
                                    typeof OwnPropertyDescriptors[k] == 'object' && (
                                        typeof OwnPropertyDescriptors[k].set == 'function' ||
                                        OwnPropertyDescriptors[k].writable
                                    )
                                ) {
                                    if (v != null) return context[k] = v;
                                } else if (v != null) return context.setAttribute(k, v);
                                if (v == null && typeof context.hasAttribute == 'function' && context.hasAttribute(k)) return context.removeAttribute(k);
                                if (v == null) return delete context[k];
                            }
                        })(v, context);
                    });
                })(data, context);
            }
        };
    Object.assign(contextualLoad, {
        $: $,
        ajax: ajax,
        contextWalk: contextWalk
    });
    (function(buffer, callback) {
        var context = $('[data-contextual]', true, function(e) {
                return (buffer.map((b) => b.context).indexOf(e) < 0);
            }),
            allLoaded = 0,
            allEached = 0,
            callee = arguments.callee;
        if (buffer.length > 100) return;
        if (context.length > 0)
            context.forEach(function(context) {
                allEached++;
                ajax('get', context.dataset['contextual'], function(xdata) {
                    var data = JSON.parse(xdata.xhr.response);
                    buffer.push({ context: context, data: data });
                    if(data == '' || Object.keys(data).length < 1) context.parentElement.removeChild(context);
					else contextWalk(context, data);
                    allLoaded++;
                    if (allEached == allLoaded && typeof callback == 'function') {
                        callee(buffer, callback);
                    }
                }).onerror = function(){
                    buffer.push({ context: context, data: null });
					context.parentElement.removeChild(context);
                    allEached--;
                    if (allEached == allLoaded && typeof callback == 'function') {
                        callee(buffer, callback);
                    }
				};
            });
        else callback(buffer);
    })([], callback);
}
contextualLoad.withScripts = function(target, scripts) {
    var self = contextualLoad;
    self(target, function() {
        var buffer = [],
            fireBuffer = function() {
                if (document.readyState === "loading") {
                    window.addEventListener('DOMContentLoaded', fireBuffer);
                } else {
                    fireBuffer = function() {};
                    Array.from(buffer).forEach(function(e) {
                        (new Function(e))();
                    });
                }
            },
            allLoaded = 0,
            allEached = 0;
        scripts.forEach(function(e, i) {
            allEached++;
            self.ajax('get', e, function(xdata) {
                buffer[i] = xdata.xhr.response;
                allLoaded++;
                if (allEached == allLoaded) fireBuffer();
            }).onerror = function(xdata) {
                var script = document.createElement('script');
                script.src = xdata.url;
                script.async = false;
                script.defer = true;
                script.addEventListener('load', function() {
                    setTimeout(function() {
                        allEached--;
                        if (allEached == allLoaded) fireBuffer();
                    }, 1);
                });
                target.appendChild(script);
            };
        });
    });

}
