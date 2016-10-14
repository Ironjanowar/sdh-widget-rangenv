/*Custom model based in LineWithFocusChart*/
MyCustomChart = function() {
    "use strict";
    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var lines = nv.models.line(),
	lines2 = nv.models.line(),
	xAxis = nv.models.axis(),
	yAxis = nv.models.axis(),
	x2Axis = nv.models.axis(),
	y2Axis = nv.models.axis(),
	legend = nv.models.legend(),
	brush = d3.svg.brush(),
	tooltip = nv.models.tooltip(),
	interactiveLayer = nv.interactiveGuideline();

    var margin = {top: 30, right: 30, bottom: 30, left: 60},
	margin2 = {top: 0, right: 30, bottom: 20, left: 60},
	color = nv.utils.defaultColor(),
	width = null,
	height = null,
	height2 = 50,
	useInteractiveGuideline = false,
	x,
	y,
	x2,
	y2,
	showLegend = true,
	brushExtent = null,
	noData = null,
	dispatch = d3.dispatch('brush', 'stateChange', 'changeState'),
	transitionDuration = 250,
	state = nv.utils.state(),
	defaultState = null;

    lines.clipEdge(true).duration(0);
    lines2.interactive(false);
    xAxis.orient('bottom').tickPadding(5);
    yAxis.orient('left');
    x2Axis.orient('bottom').tickPadding(5);
    y2Axis.orient('left');

    tooltip.valueFormatter(function(d, i) {
        return yAxis.tickFormat()(d, i);
    }).headerFormatter(function(d, i) {
        return xAxis.tickFormat()(d, i);
    });

    //============================================================
    // Private Variables
    //------------------------------------------------------------

    var stateGetter = function(data) {
        return function(){
            return {
                active: data.map(function(d) { return !d.disabled })
            };
        }
    };

    var stateSetter = function(data) {
        return function(state) {
            if (state.active !== undefined)
                data.forEach(function(series,i) {
                    series.disabled = !state.active[i];
                });
        }
    };

    function chart(selection) {
        selection.each(function(data) {
            var container = d3.select(this),
                that = this;
            nv.utils.initSVG(container);
            var availableWidth = nv.utils.availableWidth(width, container, margin),
                availableHeight1 = nv.utils.availableHeight(height, container, margin) - height2,
                availableHeight2 = height2 - margin2.top - margin2.bottom;

            chart.update = function() {
                container.transition().duration(transitionDuration).call(chart)
            };
            chart.container = this;

            state
                .setter(stateSetter(data), chart.update)
                .getter(stateGetter(data))
                .update();

            // DEPRECATED set state.disableddisabled
            state.disabled = data.map(function(d) { return !!d.disabled });

            if (!defaultState) {
                var key;
                defaultState = {};
                for (key in state) {
                    if (state[key] instanceof Array)
                        defaultState[key] = state[key].slice(0);
                    else
                        defaultState[key] = state[key];
                }
            }

            // Display No Data message if there's nothing to show.
            if (!data || !data.length || !data.filter(function(d) { return d.values.length }).length) {
                nv.utils.noData(chart, container)
                return chart;
            } else {
                container.selectAll('.nv-noData').remove();
            }

            // Setup Scales
            x = lines.xScale();
            y = lines.yScale();
            x2 = lines2.xScale();
            y2 = lines2.yScale();

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('g.nv-wrap.nv-lineWithFocusChart').data([data]);
            var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-lineWithFocusChart').append('g');
            var g = wrap.select('g');

            gEnter.append('g').attr('class', 'nv-legendWrap');

            var focusEnter = gEnter.append('g').attr('class', 'nv-focus');
            focusEnter.append('g').attr('class', 'nv-x nv-axis');
            focusEnter.append('g').attr('class', 'nv-y nv-axis');
            focusEnter.append('g').attr('class', 'nv-linesWrap');
            focusEnter.append('g').attr('class', 'nv-interactive');

            var contextEnter = gEnter.append('g').attr('class', 'nv-context');
            contextEnter.append('g').attr('class', 'nv-x nv-axis');
            contextEnter.append('g').attr('class', 'nv-y nv-axis');
            contextEnter.append('g').attr('class', 'nv-linesWrap');
            contextEnter.append('g').attr('class', 'nv-brushBackground');
            contextEnter.append('g').attr('class', 'nv-x nv-brush');

            // Legend
            if (showLegend) {
                legend.width(availableWidth);

                g.select('.nv-legendWrap')
                    .datum(data)
                    .call(legend);

                if ( margin.top != legend.height()) {
                    margin.top = legend.height();
                    availableHeight1 = nv.utils.availableHeight(height, container, margin) - height2;
                }

                g.select('.nv-legendWrap')
                    .attr('transform', 'translate(0,' + (-margin.top) +')')
            }

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


            //Set up interactive layer
            if (useInteractiveGuideline) {
                interactiveLayer
                    .width(availableWidth)
                    .height(availableHeight1)
                    .margin({left:margin.left, top:margin.top})
                    .svgContainer(container)
                    .xScale(x);
                wrap.select(".nv-interactive").call(interactiveLayer);
            }

            // Main Chart Component(s)
            lines
                .width(availableWidth)
                .height(availableHeight1)
                .color(
                    data
                        .map(function(d,i) {
                            return d.color || color(d, i);
                        })
                        .filter(function(d,i) {
                            return !data[i].disabled;
                        })
                );

            lines2
                .defined(lines.defined())
                .width(availableWidth)
                .height(availableHeight2)
                .color(
                    data
                        .map(function(d,i) {
                            return d.color || color(d, i);
                        })
                        .filter(function(d,i) {
                            return !data[i].disabled;
                        })
                );

            g.select('.nv-context')
                .attr('transform', 'translate(0,' + ( availableHeight1 + margin.bottom + margin2.top) + ')')

            var contextLinesWrap = g.select('.nv-context .nv-linesWrap')
                .datum(data.filter(function(d) { return !d.disabled }))

            d3.transition(contextLinesWrap).call(lines2);

            // Setup Main (Focus) Axes
            xAxis
                .scale(x)
                ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                .tickSize(-availableHeight1, 0);

            yAxis
                .scale(y)
                ._ticks( nv.utils.calcTicksY(availableHeight1/36, data) )
                .tickSize( -availableWidth, 0);

            g.select('.nv-focus .nv-x.nv-axis')
                .attr('transform', 'translate(0,' + availableHeight1 + ')');

            // Setup Brush
            brush
                .x(x2)
                .on('brush', function() {
                    onBrush();
                });

            if (brushExtent) brush.extent(brushExtent);

            var brushBG = g.select('.nv-brushBackground').selectAll('g')
                .data([brushExtent || brush.extent()])

            var brushBGenter = brushBG.enter()
                .append('g');

            brushBGenter.append('rect')
                .attr('class', 'left')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', availableHeight2);

            brushBGenter.append('rect')
                .attr('class', 'right')
                .attr('x', 0)
                .attr('y', 0)
                .attr('height', availableHeight2);

            var gBrush = g.select('.nv-x.nv-brush')
                .call(brush);
            gBrush.selectAll('rect')
                .attr('height', availableHeight2);

            gBrush.selectAll('.resize').append('path').attr('d', resizePath);

            onBrush(true);

            // Setup Secondary (Context) Axes
            x2Axis
                .scale(x2)
                ._ticks( nv.utils.calcTicksX(availableWidth/100, data) )
                .tickSize(-availableHeight2, 0);

            g.select('.nv-context .nv-x.nv-axis')
                .attr('transform', 'translate(0,' + y2.range()[0] + ')');
            d3.transition(g.select('.nv-context .nv-x.nv-axis'))
                .call(x2Axis);

            y2Axis
                .scale(y2)
                ._ticks( nv.utils.calcTicksY(availableHeight2/36, data) )
                .tickSize( -availableWidth, 0);

            d3.transition(g.select('.nv-context .nv-y.nv-axis'))
                .call(y2Axis);

            g.select('.nv-context .nv-x.nv-axis')
                .attr('transform', 'translate(0,' + y2.range()[0] + ')');

            //============================================================
            // Event Handling/Dispatching (in chart's scope)
            //------------------------------------------------------------

            legend.dispatch.on('stateChange', function(newState) {
                for (var key in newState)
                    state[key] = newState[key];
                dispatch.stateChange(state);
                chart.update();
            });

            interactiveLayer.dispatch.on('elementMousemove', function(e) {
                lines.clearHighlights();
                var singlePoint, pointIndex, pointXLocation, allData = [];
                data
                    .filter(function(series, i) {
                        series.seriesIndex = i;
                        return !series.disabled;
                    })
                    .forEach(function(series,i) {
                        var extent = brush.empty() ? x2.domain() : brush.extent();
                        var currentValues = series.values.filter(function(d,i) {
                            return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                        });

                        pointIndex = nv.interactiveBisect(currentValues, e.pointXValue, lines.x());
                        var point = currentValues[pointIndex];
                        var pointYValue = chart.y()(point, pointIndex);
                        if (pointYValue != null) {
                            lines.highlightPoint(i, pointIndex, true);
                        }
                        if (point === undefined) return;
                        if (singlePoint === undefined) singlePoint = point;
                        if (pointXLocation === undefined) pointXLocation = chart.xScale()(chart.x()(point,pointIndex));
                        allData.push({
                            key: series.key,
                            value: chart.y()(point, pointIndex),
                            color: color(series,series.seriesIndex)
                        });
                    });
                //Highlight the tooltip entry based on which point the mouse is closest to.
                if (allData.length > 2) {
                    var yValue = chart.yScale().invert(e.mouseY);
                    var domainExtent = Math.abs(chart.yScale().domain()[0] - chart.yScale().domain()[1]);
                    var threshold = 0.03 * domainExtent;
                    var indexToHighlight = nv.nearestValueIndex(allData.map(function(d){return d.value}),yValue,threshold);
                    if (indexToHighlight !== null)
                        allData[indexToHighlight].highlight = true;
                }

                var xValue = xAxis.tickFormat()(chart.x()(singlePoint,pointIndex));
                interactiveLayer.tooltip
                    .position({left: e.mouseX + margin.left, top: e.mouseY + margin.top})
                    .chartContainer(that.parentNode)
                    .valueFormatter(function(d,i) {
                        return d == null ? "N/A" : yAxis.tickFormat()(d);
                    })
                    .data({
                        value: xValue,
                        index: pointIndex,
                        series: allData
                    })();

                interactiveLayer.renderGuideLine(pointXLocation);

            });

            interactiveLayer.dispatch.on("elementMouseout",function(e) {
                lines.clearHighlights();
            });

            dispatch.on('changeState', function(e) {
                if (typeof e.disabled !== 'undefined') {
                    data.forEach(function(series,i) {
                        series.disabled = e.disabled[i];
                    });
                }
                chart.update();
            });

            //============================================================
            // Functions
            //------------------------------------------------------------

            // Taken from crossfilter (http://square.github.com/crossfilter/)
            function resizePath(d) {
                var e = +(d == 'e'),
                    x = e ? 1 : -1,
                    y = availableHeight2 / 3;
                return 'M' + (.5 * x) + ',' + y
                    + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
                    + 'V' + (2 * y - 6)
                    + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
                    + 'Z'
                    + 'M' + (2.5 * x) + ',' + (y + 8)
                    + 'V' + (2 * y - 8)
                    + 'M' + (4.5 * x) + ',' + (y + 8)
                    + 'V' + (2 * y - 8);
            }

            /*var domain = x2.domain();
              var domainWidth = domain[1] - domain[0];
              //var width = parseInt($(gBrush.node()).parent().find(".background").attr("width"));
              function updateBrushBar(nextent, extent, gBrush) {
              var width = parseInt($(gBrush.node()).parent().find(".background").attr("width"));
              var dif = nextent - extent;
              var trans = dif * (width / domainWidth);
              var exp = /translate\((\d+),0\)/;
              var nE = gBrush.attr("transform");
              var res = exp.exec(nE);
              var currentTrans;
              console.log("dif: " + dif + " trans: " + trans + "  nextent: " + nextent + "  extent: " + extent + " _currentTrans: " + res[0]);
              if (res) {
              //console.log("Res: " + res)
              currentTrans = parseFloat(res[1]);
              currentTrans += trans;
              //console.log(res[1], trans)
              } else {
              console.log("No res: " + res)
              }
              setTimeout(function() {
              console.log("translate("+currentTrans+", 0)");
              gBrush.attr("transform", "translate("+currentTrans+", 0)");
              }, 1000);
              }*/

            function updateBrushBG() {
                if (!brush.empty()) brush.extent(brushExtent);
                brushBG
                    .data([brush.empty() ? x2.domain() : brushExtent])
                    .each(function(d,i) {
                        var leftWidth = x2(d[0]) - x.range()[0],
                            rightWidth = availableWidth - x2(d[1]);
                        d3.select(this).select('.left')
                            .attr('width',  leftWidth < 0 ? 0 : leftWidth);

                        d3.select(this).select('.right')
                            .attr('x', x2(d[1]))
                            .attr('width', rightWidth < 0 ? 0 : rightWidth);
                    });
            }

            // fail
            /*function updateDragIcos(nextent, extent) {
              var geBrush = container.select('.nv-x.nv-brush .resize.e')
              var gwBrush = container.select('.nv-x.nv-brush .resize.w')
              //updateBrushBar(nextent[0], extent[0], gwBrush);
              //updateBrushBar(nextent[1], extent[1], geBrush);
              }*/

            function onBrush(fromPaint) {
                brushExtent = brush.empty() ? null : brush.extent();
                var extent = brush.empty() ? x2.domain() : brushExtent;

                //The brush extent cannot be less than one.  If it is, don't update the line chart.
                if (Math.abs(extent[0] - extent[1]) <= 1) {
                    console.log("The brush extent cannot be less than one");
                    return;
                }
                var nExtent = getNormalExtent(extent);
                if (first) {
                    first = false;
                    dispatch.brush({extent: extent, brush: brush});
                } else {
                    if (nExtent[0] !== lastExtent[0] || nExtent[1] !== lastExtent[1] || fromPaint) {
                        lastExtent = nExtent;
                        dispatch.brush({extent: nExtent, brush: brush});
                        updateBrushBG();
                    } else {
                        console.log("discarding extent: " + nExtent);
                    }
                }
            }
            var extentTimer;
            var setNewExtent = function setNewExtent(extent) {
                if (extentTimer) {
                    clearTimeout(extentTimer); //cancel the previous timer.
                    extentTimer = null;
                }
                extentTimer = setTimeout( function() {
                    chart.brushExtent(extent);
                    if (!firstLoad) {
                        updateBrushBG();
                        chart.update();
                    }
                    //this.updateContext(extent); Brush event contains the updateContext
                },0);
            };

            // Normal brush method
            /*function onBrush() {
              brushExtent = brush.empty() ? null : brush.extent();
              var extent = brush.empty() ? x2.domain() : brush.extent();
              //The brush extent cannot be less than one.  If it is, don't update the line chart.
              if (Math.abs(extent[0] - extent[1]) <= 1) {
              return;
              }
              dispatch.brush({extent: extent, brush: brush});
              updateBrushBG();
              }*/
            chart.updateBrushBG = updateBrushBG;
            chart.setNewExtent = setNewExtent;
        });

        return chart;
    }
    //============================================================
    // Event Handling/Dispatching (out of chart's scope)
    //------------------------------------------------------------

    lines.dispatch.on('elementMouseover.tooltip', function(evt) {
        tooltip.data(evt).position(evt.pos).hidden(false);
    });

    lines.dispatch.on('elementMouseout.tooltip', function(evt) {
        tooltip.hidden(true)
    });

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    // expose chart's sub-components
    chart.dispatch = dispatch;
    chart.legend = legend;
    chart.lines = lines;
    chart.lines2 = lines2;
    chart.xAxis = xAxis;
    chart.yAxis = yAxis;
    chart.x2Axis = x2Axis;
    chart.y2Axis = y2Axis;
    chart.interactiveLayer = interactiveLayer;
    chart.tooltip = tooltip;

    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        focusHeight:     {get: function(){return height2;}, set: function(_){height2=_;}},
        showLegend: {get: function(){return showLegend;}, set: function(_){showLegend=_;}},
        brushExtent: {get: function(){return brushExtent;}, set: function(_){brushExtent=_;}},
        defaultState:    {get: function(){return defaultState;}, set: function(_){defaultState=_;}},
        noData:    {get: function(){return noData;}, set: function(_){noData=_;}},

        // deprecated options
        tooltips:    {get: function(){return tooltip.enabled();}, set: function(_){
            // deprecated after 1.7.1
            nv.deprecated('tooltips', 'use chart.tooltip.enabled() instead');
            tooltip.enabled(!!_);
        }},
        tooltipContent:    {get: function(){return tooltip.contentGenerator();}, set: function(_){
            // deprecated after 1.7.1
            nv.deprecated('tooltipContent', 'use chart.tooltip.contentGenerator() instead');
            tooltip.contentGenerator(_);
        }},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = _.top    !== undefined ? _.top    : margin.top;
            margin.right  = _.right  !== undefined ? _.right  : margin.right;
            margin.bottom = _.bottom !== undefined ? _.bottom : margin.bottom;
            margin.left   = _.left   !== undefined ? _.left   : margin.left;
        }},
        color:  {get: function(){return color;}, set: function(_){
            color = nv.utils.getColor(_);
            legend.color(color);
            // line color is handled above?
        }},
        interpolate: {get: function(){return lines.interpolate();}, set: function(_){
            lines.interpolate(_);
            lines2.interpolate(_);
        }},
        xTickFormat: {get: function(){return xAxis.tickFormat();}, set: function(_){
            xAxis.tickFormat(_);
            x2Axis.tickFormat(_);
        }},
        yTickFormat: {get: function(){return yAxis.tickFormat();}, set: function(_){
            yAxis.tickFormat(_);
            y2Axis.tickFormat(_);
        }},
        duration:    {get: function(){return transitionDuration;}, set: function(_){
            transitionDuration=_;
            yAxis.duration(transitionDuration);
            y2Axis.duration(transitionDuration);
            xAxis.duration(transitionDuration);
            x2Axis.duration(transitionDuration);
        }},
        x: {get: function(){return lines.x();}, set: function(_){
            lines.x(_);
            lines2.x(_);
        }},
        y: {get: function(){return lines.y();}, set: function(_){
            lines.y(_);
            lines2.y(_);
        }},
        useInteractiveGuideline: {get: function(){return useInteractiveGuideline;}, set: function(_){
            useInteractiveGuideline = _;
            if (useInteractiveGuideline) {
                lines.interactive(false);
                lines.useVoronoi(false);
            }
        }}
    });

    nv.utils.inheritOptions(chart, lines);
    nv.utils.initOptions(chart);

    return chart;
};


var getNormalExtent = function getNormalExtent(extent) {
    var e1 = 100000000000000000;
    var e2 = 100000000000000000;
    var newe1, newe2, dif;
    for(var i=0; i < validSteps.length; i ++) {
        dif = Math.abs(validSteps[i] - extent[0]);
        if (dif < e1) {
            newe1 = validSteps[i];
            e1 = dif;
        }
        dif = Math.abs(validSteps[i] - extent[1]);
        if (dif < e2) {
            newe2 = validSteps[i];
            e2 = dif;
        }
    }
    //console.log("Normalized extent: " + [newe1, newe2]);
    if (newe1 == newe2) {
        return null;
    } else {
        return [newe1, newe2];
    }
};

var normalizeConfig = function normalizeConfig(configuration) {
    if (configuration == null) {
        configuration = {};
    }

    if (typeof configuration.height != "number") {
        configuration.height = 240;
    }

    if (typeof configuration.showFocus != "boolean") {
        configuration.showFocus = true;
    }

    // nvd3 focusHeight is contextHeight
    if (typeof configuration.focusHeight != "number") {
        configuration.focusHeight = configuration.height * 0.5;
        if (!configuration.showFocus) {
            // -30 for leyend
            configuration.focusHeight = configuration.height - 30;
        }
    }

    if (typeof configuration.ownContext != "string") {
        configuration.ownContext = "dafault_rangeNv_Context_id";
    }

    if (typeof configuration.isArea != "boolean") {
        configuration.isArea = false;
    }

    if (typeof configuration.duration != "number") {
        configuration.duration = 250;
    }

    if (typeof configuration.labelFormat != "string") {
        configuration.labelFormat = "%mid%";
    }

    if (typeof configuration.interpolate != "string") {
        configuration.interpolate = "linear";
    }

    if (typeof configuration.background != "string") {
        configuration.background = "rgba(0,0,0,0)";
    }

    if (typeof configuration.axisColor != "string") {
        configuration.axisColor = "#000";
    }

    if (typeof configuration.colors != "object") {
        configuration.colors = undefined;
    }

    if (typeof configuration.showLegend != "boolean") {
        configuration.showLegend = true;
    }

    if (typeof configuration.maxDecimals != "number") {
        configuration.maxDecimals = 2;
    }

    if (typeof configuration.showDirectControls != "boolean") {
        configuration.showDirectControls = true;
    }

    return configuration;
};

var RangeNv = function RangeNv(element, metrics, contextId, configuration) {
    if (element == null) {
        return;
    }
    // CHECK D3
    if(typeof d3 === 'undefined') {
        console.error("rangeNv could not be loaded because d3 did not exist.");
        return;
    }

    // CHECK NVD3
    if(typeof nv === 'undefined') {
        console.error("rangeNv could not be loaded because nvd3 did not exist.");
        return;
    }

    // We need relative position for the nvd3 tooltips
    element.style.position = 'inherit';

    this.element = $(element); //Store as jquery object
    this.data = null;
    this.chart = null;
    this.labels = {};
    this.lastExtent = [];
    this.maxY = Number.MIN_VALUE;
    this.minY = Number.MAX_VALUE;
    this.maxT = -8640000000000000;
    this.minT = 8640000000000000;
    this.status = 0; // 0 - not initialized, 1 - ready, 2 - destroyed

    // Configuration
    this.configuration = normalizeConfig(configuration);

    this.ownContext = configuration.ownContext;

    this.element.append('<svg class="blurable"></svg>');
    this.svg = this.element.children("svg");
    this.svg.get(0).style.minHeight = this.configuration.height + "px";
    this.svg.get(0).style.backgroundColor = this.configuration.background;
};

//Function that returns the value to replace with the label variables
var replacer = function(resourceId, resource, str) {

    //Remove the initial an trailing '%' of the string
    str = str.substring(1, str.length-1);

    //Check if it is a parameter an return its value
    if(str === "resourceId") { //Special command to indicate the name of the resource
        return resourceId;

    } else { // Obtain its value through the object given the path

        var path = str.split(".");
        var subObject = resource;

        for(var p = 0; p < path.length; ++p) {
            if((subObject = subObject[path[p]]) == null)
                return "";
        }

        return subObject.toString();
    }

};

var normalizedStep = function(interval, step, index, dat) {
    var from = moment(interval.from);
    var to = moment(interval.to);
    return;
};

var getNormalizedData = function getNormalizedData(framework_data) {
    var labelVariable = /%(\w|\.)+%/g; //Regex that matches all the "variables" of the label such as %mid%, %pid%...

    var series = [];
    this.labels = {};
    //var colors = ['#ff7f0e','#2ca02c','#7777ff','#D53E4F','#9E0142'];
    //Data is represented as an array of {x,y} pairs.
    for (var metricData of framework_data) {

        // var metric = framework_data[metricId][m];
        // var metricData = metric['data'];

        if(metricData.interval.from < this.minT) {
            this.minT = metricData.interval.from;
        }
        if(metricData.interval.to > this.maxT) {
            this.maxT = metricData.interval.to;
        }

        var yserie = metricData.values;

        // Create a replacer for this metric
        // var metricReplacer = replacer.bind(null, metricId, metric);

        // var genLabel = function genLabel(i) {
        //     var lab = this.configuration.labelFormat.replace(labelVariable,metricReplacer);
        //     if (i > 0) {
        //         lab = lab + '(' + i + ')';
        //     }
        //     if (lab in this.labels) {
        //         lab = genLabel.call(this, ++i);
        //     }
        //     this.labels[lab] = null;
        //     return lab;
        // };
        //
        //         // Generate the label by replacing the variables
        //         var label = genLabel.call(this, 0);

        // Metric dataset
        validSteps = [];
        var dat = yserie.map(function(dat, index) {

            if(dat > this.maxY) {
                this.maxY = dat;
            }
            if (dat < this.minY) {
                this.minY = dat;
            }

            //We need to distribute the time of the step among all the "segments" of data so that the first
            // value's date corresponds to the "from" date of the interval and the last value's date corresponds
            // to the "to" date of the interval minus 1 second.
            var distributedStep = index * (metricData.step - 1) / (metricData.values.length - 1);
            var newD = normalizedStep(metricData.interval, metricData.step, index, dat);
            var auxDate = new Date(metricData.interval.from + index * metricData.step + distributedStep);
            validSteps.push(auxDate.getTime());
            return {'x': auxDate, 'y': dat};
        }.bind(this));
        series.push({
            values: dat,      //values - represents the array of {x,y} data points
            // key: label, //key  - the name of the series.
            area: this.configuration.isArea
        });
        if (series.length == 1) {
            series[0]['bar'] = true
        }
    }


    //Line chart data should be sent as an array of series objects.
    return series;
};

RangeNv.prototype.updateData = function(framework_data) {

    //Has been destroyed
    if(this.status === 2)
        return;

    var normalizedData = getNormalizedData.call(this,framework_data);

    //Update data
    if(this.status === 1) {
        d3.select(this.svg.get(0)).datum(normalizedData);

    } else { // Paint it for first time
        paint.call(this, normalizedData);
    }

};

var paint = function paint(data) {
    nv.addGraph(function() {

        if(this.status != 0) {
            return; //Already initialized or destroyed
        }

        var chart = MyCustomChart()
            .focusHeight(this.configuration.focusHeight)
            .interpolate(this.configuration.interpolate)
            .color(this.configuration.colors)
            .duration(this.configuration.duration)
            .showLegend(this.configuration.showLegend)
        // only affect to focus .How can i force Y axis in context chart?
        // ... i don't know ...
        //.forceY([this.maxY + 10, this.minY]);
        this.chart = chart;

        chart.margin({"top":10,"bottom":14, "right":40});

        chart.xAxis.tickFormat(function(d) {
            return this.format.date(new Date(d));
        }.bind(this));
        chart.x2Axis.tickFormat(function(d) {
            return this.format.date(new Date(d))
        }.bind(this));

        chart.yAxis.tickFormat(function(d) {

            //Truncate decimals
            if(this.configuration.maxDecimals >= 0) {
                var pow =  Math.pow(10, this.configuration.maxDecimals);
                d = Math.floor(d * pow) / pow;
            }

            if (d >= 1000 || d <= -1000) {
                return Math.abs(d/1000) + " K";
            } else {
                return Math.abs(d);
            }
        }.bind(this));

        chart.y2Axis.tickFormat(function(d) {

            //Truncate decimals
            if(this.configuration.maxDecimals >= 0) {
                var pow =  Math.pow(10, this.configuration.maxDecimals);
                d = Math.floor(d * pow) / pow;
            }

            if (d >= 1000 || d <= -1000) {
                return Math.abs(d/1000) + " K";
            } else {
                return Math.abs(d);
            }
        }.bind(this));

        d3.select(this.svg.get(0))
            .datum(data)
            .call(chart);

        var timer = null;
        chart.dispatch.on('brush', function(extent){
            if(JSON.stringify(this.lastExtent) == JSON.stringify(extent.extent)){
                // Resize event causes a unwanted brush event in this chart
                return;
            }
            if (timer) {
                clearTimeout(timer); //cancel the previous timer.
                timer = null;
            }
            timer = setTimeout(function() {
                this.chart.brushExtent(extent.extent);
                if (!firstLoad) {
                    this.chart.updateBrushBG();
                    this.chart.update();
                }
                firstLoad = false;
                if (!buttonMode) {
                    var tEvent = new CustomEvent("rangeClose");
                    document.dispatchEvent(tEvent);
                }
                this.updateContext(extent.extent);
            }.bind(this), 500);
        }.bind(this));

        //Update the chart when window resizes.
        this.updateChart = this.chart.update; //This is important to get the reference because it changes!
        $(window).resize(this.updateChart);

        if (!this.configuration.showFocus) {
            $(".nv-focus").attr("class", "nv-focus hidden");
        }
        // axis color
        $(this.svg).find("[class~=nv-axisG]").attr('style', 'fill:' + this.configuration.axisColor + ';')
        // leyend color
        $(this.svg).find("[class~=nv-legend-text]").attr('style', 'fill:' + this.configuration.axisColor + ';')

        // bigger brush cover
        $(this.svg).find("[class~=nv-brushBackground] rect").attr('height', 98);
        $(this.svg).find("[class~=nv-brushBackground] rect").attr('transform', 'translate(0,-4)');

        //Call update to update the chart and threfore the context
        chart.update();

        // Set the chart as ready
        this.status = 1;

        if (this.configuration.showDirectControls) {
            createDateControls.call(this, this.element, chart);
        }
        return chart;
    }.bind(this));

};

RangeNv.prototype.delete = function() {

    // Has already been destroyed
    if(this.status === 2)
        return;

    //Remove resize event listener
    if(this.status === 1) {
        $(window).off("resize", this.updateChart);
    }

    //Clear DOM
    $(this.svg).empty();
    this.element.empty();

    this.svg = null;
    this.chart = null;

    //Update status
    this.status = 2;
};

(function displayWidget() {
    var rangeNv_dom = document.getElementById("fixed-chart");
    var rangeNv_metrics = [
        {
            "interval": {
                "data_begin": 1432936800000,
                "data_end": 1476452763000,
                "from": 1432936800000,
                "to": 1476452763000
            },
            "size": 60,
            "max": 60,
            "step": 725266050,
            "timestamp": 1476452763000,
            "info": {
                "id": "director-activity",
                "title": "Activity of Director",
                "path": "/metrics/director-activity",
                "params": [
                    "uid"
                ],
                "optional": [
                    "from",
                    "to",
                    "max",
                    "accumulated",
                    "aggr"
                ],
                "aggr": [
                    "sum"
                ],
                "uid": {
                    "uid": "1004",
                    "name": "Francisco Javier Soriano",
                    "nick": "jsoriano",
                    "avatar": "https://pbs.twimg.com/profile_images/1652209779/Foto_Jefe_Estudios.jpg",
                    "email": [
                        "jsoriano@fi.upm.es"
                    ],
                    "firstcommit": null,
                    "lastcommit": null,
                    "register": null,
                    "positionsByOrgId": {
                        "1": [
                            1
                        ]
                    }
                }
            }
        }
    ];

    var rangeNv_configuration = {
        ownContext: "time-context",
        isArea: true,
        showLegend: false,
        interpolate: 'monotone',
        showFocus: false,
        height: 140,
        duration: 500,
        colors: ["#004C8B"],
        axisColor: "#004C8B"
    };

    var rangeNv = new RangeNv(rangeNv_dom, rangeNv_metrics, ["org-context", "current-user-context"], rangeNv_configuration);
    rangeNv.updateData(rangeNv_metrics);
})();
