/*
    #-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=#
      This file is part of the Smart Developer Hub Project:
        http://www.smartdeveloperhub.org/
      Center for Open Middleware
            http://www.centeropenmiddleware.com/
    #-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=#
      Copyright (C) 2015 Center for Open Middleware.
    #-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=#
      Licensed under the Apache License, Version 2.0 (the "License");
      you may not use this file except in compliance with the License.
      You may obtain a copy of the License at
                http://www.apache.org/licenses/LICENSE-2.0
      Unless required by applicable law or agreed to in writing, software
      distributed under the License is distributed on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
      See the License for the specific language governing permissions and
      limitations under the License.
    #-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=#
*/

(function() {

    var __loader = (function() {

        var oldposstyle;

        var CommonWidget = function CommonWidget(extending, container) {

            if (extending === true) {
                return;
            }

            if(!container || !container.tagName) {
                console.error(new Error("Invalid container element provided to insert the widget in."));
                this._common = { disposed: true };
                return;
            }

            //First of all, register this widget with the dashboard
            framework.dashboard.registerWidget(this);

            this._common = {};
            this._common.isloading = 0;
            this._common.callback = null;
            this._common.secureEndTimer = null;
            this._common.disposed = false;
            this._common.container = container;
            this._common.resizeHandler = null;
            this._common.hasErrorMessage = false;

            this._common.statusContainer = document.createElement('div');
            this._common.statusContainer.className ='statusContainer';
            var loadingLayer = document.createElement('div');
            loadingLayer.className ='loadingLayer';
            var spinner = document.createElement('i');
            spinner.className ='fa fa-spinner fa-pulse';

            var errorLayer = $('<div class="errorLayer"><i class="fa fa-warning" data-toggle="tooltip"></i></div>')[0];

            this._common.statusContainer.appendChild(loadingLayer);
            this._common.statusContainer.appendChild(errorLayer);
            loadingLayer.appendChild(spinner);
            this._common.container.appendChild(this._common.statusContainer);
            this._common.loadingLayer = loadingLayer;
            this._common.errorLayer = errorLayer;

            this.restoreContainerHandler = function restoreContainerHandler(e) {
                clearTimeout(this._common.secureEndTimer);
                this._common.loadingLayer.removeEventListener('transitionend', this.restoreContainerHandler);
                $(this._common.container).removeClass('blurMode');
                this._common.container.style.position = oldposstyle;
                window.removeEventListener("resize", this._common.resizeHandler);
                this._common.resizeHandler = null;
                if (typeof this._common.callback == 'function' && !this._common.disposed) {
                    this._common.callback();
                }
            }.bind(this);

            //Set the widget as loading when created
            this.startLoading();
        };

        CommonWidget.prototype.startLoading = function startLoading() {

            if (this._common.isloading == 1) {
                return;
            }

            this._common.isloading = 1;

            if (!oldposstyle) {
                oldposstyle = this._common.container.style.position;
            }
            this._common.container.style.position = 'relative';
            setStatusSize.call(this);
            this._common.resizeHandler = resizeHandler.bind(this);
            window.addEventListener("resize", this._common.resizeHandler);
            $(this._common.container).addClass('blurMode');
            $(this._common.loadingLayer).addClass('on');

        };

        /**
         *
         * @param msg
         */
        CommonWidget.prototype.showError = function(msg) {

            if(!this._common.hasErrorMessage) {
                $(this._common.container).addClass('blurMode');
                $(this._common.errorLayer).addClass('on');
                $(this._common.errorLayer).find("i").attr("title", msg).tooltip();
                setStatusSize.call(this);
                this._common.resizeHandler = resizeHandler.bind(this);
                window.addEventListener("resize", this._common.resizeHandler);

            } else { //If already showing an error message, change the message
                $(this._common.errorLayer).find("i").attr("title", msg).tooltip();
            }

        };

        /**
         *
         */
        CommonWidget.prototype.hideError = function() {

            if(this._common.hasErrorMessage) {
                $(this._common.errorLayer).removeClass('on');
                $(this._common.container).removeClass('blurMode');
                window.removeEventListener("resize", this._common.resizeHandler);
                this._common.resizeHandler = null;
            }

        };

        /*
        The transitionend event doesn't fire if the transition is aborted before
        the transition is completed because either the element is made display: none
        or the animating property's value is changed.
        */
        CommonWidget.prototype.endLoading = function endLoading(callback) {
            this._common.isloading = 0;
                this._common.callback = callback;
                this._common.loadingLayer.addEventListener('transitionend', this.restoreContainerHandler);
                setTimeout(function() {
                    $(this._common.loadingLayer).removeClass('on')
                }.bind(this), 100);
                this._common.secureEndTimer = setTimeout(function() {
                    this.restoreContainerHandler();
                }.bind(this), 600);

        };

        CommonWidget.prototype.extractMetrics = function extractMetrics(framework_data) {

            var values = [];

            for(var metricId in framework_data) {

                for(var m = 0; m < framework_data[metricId].length; ++m) {

                    var metricData = framework_data[metricId][m]['data'];

                    if(typeof metricData === 'object' && metricData['values'] != null) {
                        for(var k = 0; k < metricData['values'].length; k++) {
                            values.push(metricData['values'][k]);
                        }
                    }

                }
            }

            return values;

        };

        CommonWidget.prototype.extractData = function extractData(framework_data) {

            var values = [];

            for(var metricId in framework_data) {

                for(var m = 0; m < framework_data[metricId].length; ++m) {

                    var metricData = framework_data[metricId][m]['data'];

                    if(metricData instanceof Array) {
                        for(var k = 0; k < metricData.length; k++) {
                            values.push(metricData[k]);
                        }
                    } else if(typeof metricData === 'object' && metricData['values'] == null) {
                        values.push(metricData);
                    }

                }
            }

            return values;

        };

        CommonWidget.prototype.extractAll = function extractAll(framework_data) {

            return [].concat(this.extractData(framework_data), this.extractMetrics(framework_data));
        };

        var inArray = function inArray(str, array) {
            for(var c = 0; c < array.length; ++c) {
                if(array[c] === str) {
                    return true;
                }
            }

            return false;
        };

        // Set the global
        CommonWidget.prototype.previousColors = {};

        /**
         * Generates colors for the chart given the data received from the framework and a palette. This method must be
         * used to keep the same colors for the same resources among widget updates.
         * @param framework_data Data received from the framework
         * @param palette Palette of colors to use. It can be an array of colors or an object hash map. In case of a
         * hash map, the key refers to the id of the resource and the value refers to the color that it must have. This case
         * can be used to force colors instead of selecting them randomly from a palette as in the case of the array.
         * @returns {Array} Array of colors keeping the order of the resources in the data from the framework.
         */
        CommonWidget.prototype.generateColors = function generateColors(framework_data, palette) {

            var newPreviousColors = {};
            palette = palette || d3.scale.category20().range();

            var colors = [];
            var forcedColors = false;
            var usedColorIndexes = {};
            for(var id in CommonWidget.prototype.previousColors){
                usedColorIndexes[CommonWidget.prototype.previousColors[id]] = true;
            }

            if(!(palette instanceof Array) && palette instanceof Object) {
                forcedColors = true;
            }

            var currentColorIndex = -1;

            for(var metricId in framework_data) {

                for (var m = 0; m < framework_data[metricId].length; ++m) {

                    if(forcedColors) { //Colors assigned 'by hand' depending of the resource
                        colors.push(palette[metricId]);

                    } else { //Colors assigned from a palette

                        var UID = framework_data[metricId][m]['info']['UID'];

                        if(CommonWidget.prototype.previousColors[UID] != null && newPreviousColors[UID] == null) { //Use the previous color
                            colors.push(palette[CommonWidget.prototype.previousColors[UID] % palette.length]);

                        } else { //Try to assign an unused color

                            while(true) {

                                if(!usedColorIndexes[++currentColorIndex]) {
                                    CommonWidget.prototype.previousColors[UID] = currentColorIndex;
                                    colors.push(palette[currentColorIndex % palette.length]);
                                    break;
                                }

                            }

                        }
                    }

                }

            }

            return colors;

        };

        /**
         * Generic observe methods that should be used in the widget as it controls concurrency problems.
         * When new data is received, the updateData method is called. It also triggers an DATA_RECEIVED event.
         * @param event
         */
        CommonWidget.prototype.commonObserveCallback = function commonObserveCallback(event) {

            if(this._common.disposed) {
                return;
            }

            if(event.event === 'loading') {
                this.startLoading();

            } else if(event.event === 'data') {

                //Remove the error message if was displayed
                this.hideError();

                //Check if there is any metric that needs to be filled with zeros
                for(var resourceId in event.data) {
                    for(var i in event.data[resourceId]){
                        var resource = event.data[resourceId][i];

                        //Only metrics need to be checked
                        if(isMetric(resource)) {
                            zeroFillMetric(resource);
                        }
                    }
                }

                this.endLoading(function(data) {
                    this.updateData(data);
                    $(this).trigger("DATA_RECEIVED", data);
                }.bind(this, event.data));


            } else if(event.event === 'error') {

                this.endLoading(function() {

                    if(this.onError != null) { //If the widget has a method to handle the errors, execute it
                        this.onError(event.msg);

                    } else { //Default action
                        this.showError(event.msg);
                    }

                }.bind(this));

                $(this).trigger("ERROR", event.msg);

            }

        };

        /**
         * Sets the widget as disposed.
         * @param event
         */
        CommonWidget.prototype.dispose = function dispose() {
            this._common.disposed = true;
        };

        //TODO:
        CommonWidget.prototype.replace = function(string, data, extraData) {

            var codeExpression = /¬([^¬]|_%)+¬/g;

            //Create a replacer for this data
            var metricReplacer = replacer.bind(this, data, extraData);

            //Generate the label by replacing the variables
            return string.replace(codeExpression,metricReplacer);
        };

        /**
         * Normalizes the configuration of a widget checking the types of the configuration parameters.
         * @param defaultConfig Default configuration. The configuration must be an object with entries like:
         *     height: {
         *           type: ['type', Instance], //the method checks with typeof and instanceof
         *           default: <Default_value>
         *      },
         * @param configuration Widget configuration.
         * @returns {*}
         */
        CommonWidget.prototype.normalizeConfig = function normalizeConfig(defaultConfig, configuration) {

            if (configuration == null) {
                configuration = {};
            }

            // Clone the configuration into a new object
            var retConfig = {};
            for(var k in configuration) {
                retConfig[k] = configuration[k];
            }

            for(var confName in defaultConfig) {

                var conf = defaultConfig[confName];
                var isValidValue = false;

                //Check if it is of one of the accepted types
                for(var x = conf['type'].length - 1; x >= 0; x--) {
                    var type = conf['type'][x];
                    if(typeof configuration[confName] === type || (typeof configuration[confName] === 'object' && configuration[confName] instanceof type)) {
                        isValidValue = true;
                        break;
                    }
                }

                //If not valid, change its value with the default
                if(!isValidValue) {
                    retConfig[confName] = conf['default'];
                }

            }

            return retConfig;

        };

        CommonWidget.prototype.format = {};

        CommonWidget.prototype.format.date = function (date) {

            if(!(date instanceof Date)) {
                date = new Date(date);
            }

            return d3.time.format.utc('%x')(date)
        };

        CommonWidget.prototype.format.datetime = function (date) {

            if(!(date instanceof Date)) {
                date = new Date(date);
            }

            return d3.time.format.utc('%c')(date)
        };


        // ---------------------------
        // ------PRIVATE METHODS------
        // ---------------------------

        var setStatusSize = function setStatusSize() {
            var wsize = this._common.container.getBoundingClientRect();
            // center the spinner vertically because a responsive
            // widget can change it height dynamically
            this._common.loadingLayer.style.lineHeight = wsize.height + 'px';
            this._common.errorLayer.style.lineHeight = wsize.height + 'px';
            this._common.statusContainer.style.height = wsize.height + 'px';
            this._common.statusContainer.style.width = wsize.width + 'px';
            if(this._common.statusContainer.getBoundingClientRect().top == 0) {
                this._common.statusContainer.style.top = wsize.top + 'px';
            }
            this._common.statusContainer.style.left = 'auto';
        };

        var resizeHandler = function resizeHandler(e) {
            setStatusSize.call(this);
        };

        var isNumber = function isNumber(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        };

        var isMetric = function isMetric(resource) {
            var resourceData = resource.data;
            return resourceData != null && resourceData.values instanceof Array && isNumber(resourceData.values[0]);
        };

        var zeroFillMetric = function zeroFillMetric(resource) {

            var resourceInterval = resource['data']['interval'];
            var requestedInterval = {
                from: resource['info']['request']['params']['from'],
                to: resource['info']['request']['params']['to']
            };

            var step = resource['data']['step'];
            var values = resource['data']['values'];

            //We need step to be a number
            if(!isNumber(step)){
                return;
            }
            step = Number(step);

            // Check 'from'
            if(resourceInterval['from'] != null && requestedInterval['from'] != null) {

                //Make sure they are numbers
                resourceInterval['from'] = Number(resourceInterval['from']);
                requestedInterval['from'] = Number(requestedInterval['from']);

                // We need to add zeros
                if(requestedInterval['from'] < resourceInterval['from']) {
                    var diff = resourceInterval['from'] - requestedInterval['from'];
                    var nZeros = Math.floor(diff/step);

                    //Add the calculated number of zeros
                    for(var i = nZeros; i > 0; --i) {
                        values.unshift(0);
                    }

                    //Update the new from
                    resourceInterval['from'] -= nZeros * step;
                }

            }

            // Check 'to'
            if(resourceInterval['to'] != null && requestedInterval['to'] != null) {

                //Make sure they are numbers
                resourceInterval['to'] = Number(resourceInterval['to']);
                requestedInterval['to'] = Number(requestedInterval['to']);

                // We need to add zeros
                if(requestedInterval['to'] > resourceInterval['to']) {
                    var diff = requestedInterval['to'] - resourceInterval['to'];
                    var nZeros = Math.floor(diff/step);

                    //Add the calculated number of zeros
                    for(var i = nZeros; i > 0; --i) {
                        values.push(0);
                    }

                    //Update the new to
                    resourceInterval['to'] += nZeros * step;
                }

            }


        };

        /**
         * Handle each of the occurrences of the replace method. It evaluates the string in a sandboxed environment.
         * Note: a return if concatenated to the code to be evaluated, so only expressions can be used.
         * @param data Data that can be accessed with _D in the code to be evaluated.
         * @param extra Extra data that can be accessed with _E in the code to be evaluated.
         * @param str String with the format ¬Code_to_evaluate¬
         * @returns {*}
         */
        var replacer = function(data, extra, str) {

            //Remove the initial an trailing delimiters
            str = str.substring(1, str.length-1);

            var code = 'return ' + str;

            var locals = {

                /* Basic functionallity */
                window: {
                },
                document: {
                },
                Math: window.Math,
                Number: window.Number,
                NaN: window.NaN,
                Infinity: window.Infinity,
                Boolean: window.Boolean,
                Function: window.Function,
                Array: window.Array,
                String: window.String,
                Widget: this,

                /* Libraries */
                moment: window.moment,

                /* Widet data */
                _D: data,
                _E: extra
            };

            var that = Object.create(null); // create our own this object for the user code


            try {
                var sandbox = createSandbox(code, that, locals); // create a sandbox
                return sandbox(); // call the user code in the sandbox
            } catch(e) {
                console.error(e);
                return null;
            }


        };

        //TODO: improve how to define the elements of window that you want to conserve
        function createSandbox(code, that, locals) {

            var validVariable = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;

            code = '"use strict";' + code;
            var params = []; // the names of local variables
            var args = []; // the local variables

            var keys = Object.getOwnPropertyNames( window ),
                value;

            for( var i = 0; i < keys.length; ++i ) {
                if(typeof locals[keys[i]] === 'undefined') {
                    locals[keys[i]] = null;
                }
            }

            delete locals['eval'];
            delete locals['arguments'];


            for (var param in locals) {
                if (locals.hasOwnProperty(param) && validVariable.test(param)) {
                    args.push(locals[param]);
                    params.push(param);
                }
            }

            var context = Array.prototype.concat.call(that, params, code); // create the parameter list for the sandbox
            //console.log(context);
            var sandbox = new (Function.prototype.bind.apply(Function, context)); // create the sandbox function
            context = Array.prototype.concat.call(that, args); // create the argument list for the sandbox

            return Function.prototype.bind.apply(sandbox, context); // bind the local variables to the sandbox
        }

        //Register it in the framework
        window.framework.widgets.CommonWidget = CommonWidget;

        //Set it to be reset on every change of dashboard
        framework.ready(function() {
            framework.dashboard.addEventListener('change', function () {
                CommonWidget.prototype.previousColors = {};
            });
        });

        return CommonWidget;

    });

    // AMD compliant
    if ( typeof define === "function" && define.amd) {
        define( "sdh-framework/widgets/Common/common", [
            'sdh-framework',
            'css!./common.css',
            'css!roboto-fontface/css/roboto-fontface.css'
        ], function () {
            return __loader();
        } );
    } else {
        __loader();
    }

})();