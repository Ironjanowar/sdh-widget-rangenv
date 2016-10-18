var validSteps = [];
var first = true;
var lastExtent = [];

// data:
// [
//     { values: [
//      { x: "fecha ms", y: "dato" },
//      { x: "fecha ms", y: "dato" },
//      { x: "fecha ms", y: "dato" }
//     ],
//       labels: "Descripcion",
//       area: "Boolean"
//     }
// ]
var paint = function paint(data) {
    // Creates the svg
    var element = $("#fixed-chart");
    element.append('<svg class="blurable"></svg>');
    svg = element.children("svg");
    svg.get(0).style.minHeight = "240px";
    svg.get(0).style.backgroundColor = "rgba(0,0,0,0)";

    nv.addGraph(function() {

        if(this.status != 0) {
            return; //Already initialized or destroyed
        }

        // By the moment taking default params
        var chart = MyCustomChart()
            .focusHeight(240*0.5)
            .interpolate("linear")
            .color(undefined)
            .duration(250)
            .showLegend(true)
        // only affect to focus .How can i force Y axis in context chart?
        // ... i don't know ...
        //.forceY([this.maxY + 10, this.minY]);
        this.chart = chart;

        chart.margin({"top":10,"bottom":14, "right":40});

        chart.xAxis.tickFormat(function(d) {
            var dat = new Date(d);
            return [dat.getFullYear(), dat.getMonth(), dat.getDay()].join('-');
        }.bind(this));

        chart.x2Axis.tickFormat(function(d) {
            var dat = new Date(d);
            return [dat.getFullYear(), dat.getMonth(), dat.getDay()].join('-');
        }.bind(this));

        chart.yAxis.tickFormat(function(d) {

            //Truncate decimals
            var pow =  Math.pow(10, 2);
            d = Math.floor(d * pow) / pow;


            if (d >= 1000 || d <= -1000) {
                return Math.abs(d/1000) + " K";
            } else {
                return Math.abs(d);
            }
        }.bind(this));

        chart.y2Axis.tickFormat(function(d) {

            //Truncate decimals
            var pow =  Math.pow(10, 2);
            d = Math.floor(d * pow) / pow;


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
                updateContext(extent.extent);
            }.bind(this), 500);
        }.bind(this));

        //Update the chart when window resizes.
        this.updateChart = this.chart.update; //This is important to get the reference because it changes!
        $(window).resize(this.updateChart);

        $(".nv-focus").attr("class", "nv-focus hidden");

        // axis color
        $(svg).find("[class~=nv-axisG]").attr('style', 'fill: "#000";')
        // leyend color
        $(svg).find("[class~=nv-legend-text]").attr('style', 'fill: "#000";')

        // bigger brush cover
        $(svg).find("[class~=nv-brushBackground] rect").attr('height', 98);
        $(svg).find("[class~=nv-brushBackground] rect").attr('transform', 'translate(0,-4)');

        //Call update to update the chart and threfore the context
        chart.update();

        // Set the chart as ready
        this.status = 1;

        createDateControls.call(this, element, chart);

        return chart;
    }.bind(this));

};

var updateContext = function updateContext(d) {
    lastExtent = d;
    setTimeInfo(d[0], d[1]);
};

var getNormalExtent = function getNormalExtent(extent) {
    var e1 = 100000000000000000;
    var e2 = 100000000000000000;
    var newe1, newe2, dif;

    // By the moment
    var steps = [];

    for (var data of validSteps[0]) {
        steps.push(data.x);
    }

    for(var i=0; i < steps.length; i ++) {
        dif = Math.abs(steps[i] - extent[0]);
        if (dif < e1) {
            newe1 = steps[i];
            e1 = dif;
        }
        dif = Math.abs(steps[i] - extent[1]);
        if (dif < e2) {
            newe2 = steps[i];
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

var buttonMode = false;
var createDateControls = function createDateControls(container, theChart) {
    // Calculate ranges
    //var fullRange = theChart.x2Axis.domain(); //[1432936800000, 1467042160548]
    /*var startWeek = moment(fullRange[1]).subtract(1, 'weeks').startOf('isoWeek');
      var endWeek =   moment(fullRange[1]).subtract(1, 'weeks').endOf('isoWeek');
      var weekRange = [startWeek.valueOf(), endWeek.valueOf()];
    */
    var aDay = 1000*60*60*24;
    var aWeek = aDay*7;
    var aMonth = aDay*30;
    var aYear = aDay*365;


    // Control Div
    var rangeControlsDiv = document.createElement('div');
    
    $(rangeControlsDiv).addClass('rangeControls');
    $(container).append(rangeControlsDiv);
    // All Range
    var fullRange = theChart.x2Axis.domain();
    var allRangeDiv = document.createElement('div');
    allRangeDiv.addEventListener('click', function() {
        destroyLeftRightControls('all');
        theChart.setNewExtent.call(this, fullRange);
    }.bind(this));
    $(allRangeDiv).addClass('rangeButt allRange');
    $(allRangeDiv).text('all');
    rangeControlsDiv.appendChild(allRangeDiv);

    // Week
    var firstweekDay = moment(fullRange[1]).startOf('isoWeek').valueOf();
    var lastWeekDay = moment(fullRange[1]).endOf('isoWeek').valueOf();
    var weekRange = [firstweekDay, lastWeekDay];
    var weekRangeN = getNormalExtent(weekRange);
    if (weekRangeN) {
        var lastWeekDiv = document.createElement('div');
        lastWeekDiv.addEventListener('click', function() {
            buttonMode = true;
            currentControlPosition = 0;
            destroyLeftRightControls('week');
            addLeftRightControls.call(this, lastWeekDiv, 'week');
            theChart.setNewExtent.call(this, weekRange);
        }.bind(this));
        $(lastWeekDiv).addClass('rangeButt weekRange');
        $(lastWeekDiv).text('week');
        rangeControlsDiv.appendChild(lastWeekDiv);
    }

    // Month
    var fistInMonth = moment(fullRange[1]).startOf('month').valueOf();
    var lastInMonth = moment(fullRange[1]).endOf('month').valueOf();
    var monthRange = [fistInMonth, lastInMonth];
    var monthRangeN = getNormalExtent(monthRange);
    if (monthRangeN) {
        var lastMonthDiv = document.createElement('div');
        lastMonthDiv.addEventListener('click', function () {
            buttonMode = true;
            currentControlPosition = 0;
            destroyLeftRightControls('month');
            addLeftRightControls.call(this, lastMonthDiv, 'month');
            theChart.setNewExtent.call(this, monthRange);
        }.bind(this));
        $(lastMonthDiv).addClass('rangeButt month');
        $(lastMonthDiv).text('month');
        rangeControlsDiv.appendChild(lastMonthDiv);
    }

    // Year
    var firstInYear = moment(fullRange[1]).startOf('year').valueOf();
    var lastInYear = moment(fullRange[1]).endOf('year').valueOf();
    var yearRange = [firstInYear, lastInYear];
    var yearRangeN = getNormalExtent(yearRange);
    if (yearRangeN) {
        var lastYearDiv = document.createElement('div');
        lastYearDiv.addEventListener('click', function () {
            currentControlPosition = 0;
            buttonMode = true;
            theChart.setNewExtent.call(this, yearRange);
            destroyLeftRightControls('year');
            addLeftRightControls.call(this, lastYearDiv, 'year');
        }.bind(this));
        $(lastYearDiv).addClass('rangeButt lastYear');
        $(lastYearDiv).text('year');
        rangeControlsDiv.appendChild(lastYearDiv);
    }

    var buttonBackup;
    var butTimer;
    var currentControlPosition = 0;
    // range can be week, year, month strings
    var addLeftRightControls = function leftRightControls(button, range) {
        if (buttonBackup) {
            return;
        }
        buttonMode = true;
        // Go back
        var newLeftDiv = document.createElement('div');
        var leftIco = document.createElement('i');
        $(leftIco).addClass("fa fa-angle-double-left");
        $(newLeftDiv).addClass('extraButton goBack');
        newLeftDiv.appendChild(leftIco);
        var leftHandler = function () {
            theChart.setNewExtent.call(this, goBackRange(range));
        }.bind(this);
        newLeftDiv.addEventListener('click', leftHandler);
        // Go next
        var newRightDiv = document.createElement('div');
        var rightIco = document.createElement('i');
        $(rightIco).addClass("fa fa-angle-double-right");
        $(newRightDiv).addClass('extraButton goNext');
        newRightDiv.appendChild(rightIco);
        var rightHandler = function () {
            theChart.setNewExtent.call(this, goNextRange(range));
        }.bind(this);
        newRightDiv.addEventListener('click', rightHandler);
        // Extra controls container
        var extraContainer = document.createElement('div');
        $(extraContainer).addClass('moveButtonContainer');
        extraContainer.appendChild(newLeftDiv);
        extraContainer.appendChild(newRightDiv);
        button.parentNode.appendChild(extraContainer);
        var closeHandler = function (e) {
            destroyLeftRightControls(null);
            document.removeEventListener('rangeClose', closeHandler);
        }
        document.addEventListener('rangeClose', closeHandler);

        // Hide range button
        buttonBackup = {
            'type': range,
            'onButton': button,
            'lHandler': leftHandler,
            'rHandler': rightHandler,
            'newLeftDiv': newLeftDiv,
            'newRightDiv': newRightDiv
        };
        $(button).addClass('on');
        if (butTimer) {
            clearTimeout(butTimer); //cancel the previous timer.
            timer = null;
        }
        butTimer = setTimeout(function() {
            buttonMode = false;
        }, 2000);
    };

    var destroyLeftRightControls = function destroyLeftRightControls(newRangeId) {
        buttonMode = false;
        currentControlPosition = 0;
        if (!buttonBackup || newRangeId == buttonBackup.type) {
            return;
        }
        buttonBackup.newLeftDiv.removeEventListener('click', buttonBackup.leftHandler);
        buttonBackup.newRightDiv.removeEventListener('click', buttonBackup.rightHandler);
        $(buttonBackup.onButton).removeClass('on');
        var father = buttonBackup.newLeftDiv.parentNode;
        father.removeChild(buttonBackup.newLeftDiv);
        father.removeChild(buttonBackup.newRightDiv);
        father.parentNode.removeChild(father);
        buttonBackup = null;
    };

    var fullRange = theChart.x2Axis.domain();
    var goBackRange = function goBackRange(range) {
        buttonMode = true;
        var rangeA = range;
        if (range == "week") {
            rangeA = "isoWeek"
        }
        currentControlPosition ++;
        var startRange = moment(fullRange[1]).subtract(currentControlPosition, range).startOf(rangeA);
        var endRange =   moment(fullRange[1]).subtract(currentControlPosition, range).endOf(rangeA);
        buttonMode = true;
        if (butTimer) {
            clearTimeout(butTimer); //cancel the previous timer.
            timer = null;
        }
        butTimer = setTimeout(function() {
            buttonMode = false;
        }, 2000);
        return [startRange.valueOf(), endRange.valueOf()];
    };

    var goNextRange = function goNextRange(range) {
        buttonMode = true;
        if (currentControlPosition == 0) {
            return;
        }
        var rangeA = range;
        if (range == "week") {
            rangeA = "isoWeek"
        }
        currentControlPosition --;
        var startRange = moment(fullRange[1]).subtract(currentControlPosition, range).startOf(rangeA);
        var endRange =   moment(fullRange[1]).subtract(currentControlPosition, range).endOf(rangeA);
        if (butTimer) {
            clearTimeout(butTimer); //cancel the previous timer.
            timer = null;
        }
        butTimer = setTimeout(function() {
            buttonMode = false;
        }, 2000);
        return [startRange.valueOf(), endRange.valueOf()];
    };
};

// data:
// [
//     {
//         values: [
//             1, 2, 3, 4
//         ],
//
//         interval: {
//             data_begin: 219308171293, // Date
//             data_end: 2362873018723,  // Date
//             from: 219308171293,       // Same as data_begin
//             to: 2362873018723         // Same as data_end
//         },
//         label: "label"
//     },
//     {
//         values: [
//             3, 12, 1, 9
//         ],
//         interval: {
//             data_begin: 219308171293, // Date
//             data_end: 2362873018723,  // Date
//             from: 219308171293,       // Same as data_begin
//             to: 2362873018723         // Same as data_end
//         },
//         label: "label2"
//     }
//
// ]
var normalizeData = function normalizeData(data) {
    var normalized_data = [{}];

    for (var i in data) {
        var num_values = data[i].values.length;
        var from = data[i].interval.from;
        var to = data[i].interval.to;
        var step = (to-from)/num_values;
        var date = from;
        normalized_data[i].values = [];
        for (var j in data[i].values) {
            normalized_data[i].values.push({ x: date, y: data[i].values[j] });
            date += step;
        }

        normalized_data[i].label = data[i].label;
    }

    for (var metric of normalized_data) {
        validSteps.push(metric.values);
    }

    paint(normalized_data);
    return normalized_data;
}

// Test
var test = [
    {
        "values": [
            0.5966769568622112,
            0.9683617448899895,
            0.5736363758333027,
            0.7009576193522662,
            0.15998542145825922,
            0.508637759136036,
            0.759652794804424,
            0.5132142077200115,
            0.4594250472728163,
            0.33273247303441167,
            0.030058797914534807,
            0.7948863040655851,
            0.624317214358598,
            0.5884561631828547,
            0.019016560167074203,
            0.956395122455433,
            0.7237868141382933,
            0.113882502540946,
            0.389601735631004,
            0.2922046137973666,
            0.3028266099281609,
            0.03186552785336971,
            0.5254538685549051,
            0.9022018504329026,
            0.6512108761817217,
            0.37231862149201334,
            0.008751642657443881,
            0.7438864926807582,
            0.18089947942644358,
            0.7044435807038099,
            0.05348323239013553,
            0.47526864940300584,
            0.05173218180425465,
            0.7738808719441295,
            0.07072291802614927,
            0.1003110259771347,
            0.3567163529805839,
            0.41355186724103987,
            0.29106423747725785,
            0.9508458017371595,
            0.656428198562935,
            0.4753708243370056,
            0.8683033566921949,
            0.604866506299004,
            0.8358124177902937,
            0.6434795230161399,
            0.14538440550677478,
            0.20685624959878623,
            0.5120464388746768,
            0.12339830072596669,
            0.00370257580652833,
            0.612016347469762,
            0.627319821389392,
            0.7359956563450396,
            0.11613209592178464,
            0.8350023380480707,
            0.9278828990645707,
            0.7565393524710089,
            0.5048994710668921,
            0.5203659036196768
        ],

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
]

normalizeData(test);
