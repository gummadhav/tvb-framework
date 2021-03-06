/**
 * TheVirtualBrain-Framework Package. This package holds all Data Management, and
 * Web-UI helpful to run brain-simulations. To use it, you also need do download
 * TheVirtualBrain-Scientific Package (for simulators). See content of the
 * documentation-folder for more details. See also http://www.thevirtualbrain.org
 *
 * (c) 2012-2013, Baycrest Centre for Geriatric Care ("Baycrest")
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License version 2 as published by the Free
 * Software Foundation. This program is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
 * License for more details. You should have received a copy of the GNU General
 * Public License along with this program; if not, you can download it here
 * http://www.gnu.org/licenses/old-licenses/gpl-2.0
 *
 **/
/* global doAjaxCall, displayMessage */
//general chores
//todo create the cutting path around the canvas so that the ticks and other items don't make it look bad
//todo investigate new series array structure that will make adding more dots easier
//todo create an exporting function that can save the figure
//todo ask about the cases inwich the simulations are still underway, and whether the metrics will become updated, or how should I plot?
//todo ask if there is anything lia knows about with the svg scaling being off.
//todo ask about whether there should be radius scaling that happens on zooming, because many simulations will have miniscule dots in current setup
//todo figure out how to propperly position all dots within the innerhtml svg before the plotting begins
//todo create a red marker line that pinpoints the dot on the canvas (or just highlights the grid lines)
//todo !!ask lia which is preferred, (an xi:include and a template function call in the html) or (a new genshi template that returns the elements i need accessed by a ajax call to the controller method)

// We keep all-nodes information for current PSE as a global, to have them ready at node-selection, node-overlay.
var PSE_nodesInfo;
// Keep Plot-options and MIN/MAx colors for redraw (e.g. at resize).
var _PSE_plotOptions;
var _PSE_minColor;
var _PSE_maxColor;
var _PSE_plot;

/*
 * @param canvasId: the id of the HTML DIV on which the drawing is done. This should have sizes defined or else FLOT can't do the drawing.
 * @param xLabels: the labels for the x - axis
 * @param yLabels: the labels for the y - axis
 * @param seriesArray: the actual data to be used by FLOT
 * @param data_info: additional information about each node. Used when hovering over a node
 * @param min_color: minimum color, used for gradient
 * @param max_color: maximum color, used for gradient
 * @param backPage: page where visualizers fired from overlay should take you back.
 */
function _updatePlotPSE(canvasId, xLabels, yLabels, seriesArray, data_info, min_color, max_color, backPage) {

    _PSE_minColor = min_color;
    _PSE_maxColor = max_color;
    PSE_nodesInfo = data_info;
    _PSE_plotOptions = {
        series: {
            lines: {
                show: false
            },
            points: {
                lineWidth: 0,
                show: true,
                fill: true
            }
        },
        margins: { // is this the correct way to be doing margins? It's just how I have in the past,
            top: 20,
            bottom: 40,
            left: 20,
            right: 50
        },
        xaxis: {
            labels: xLabels, // is there a better way to get access to these values inside my plotting?
            min: -1,
            max: xLabels.length,
            tickSize: 1,
            tickFormatter: function (val) {
                if (val < 0 || val >= xLabels.length) {
                    return "";
                }
                return xLabels[val];
            }
        },
        yaxis: {
            labels: yLabels,
            min: -1,
            max: yLabels.length,
            tickSize: 1,
            tickFormatter: function (val) {
                if (val < 0 || val >= yLabels.length || yLabels[val] === "_") {
                    return "";
                }
                return yLabels[val];
            }
        },
        grid: {
            clickable: true,
            hoverable: true
        }

    };
    _d3PSE_plot = d3Plot("#" + canvasId, seriesArray, $.extend(true, {}, _PSE_plotOptions), backPage);

    //this has been commented out below so that I can see what I have done on the canvas after the above function has ended
    /*_PSE_plot = $.plot($("#" + canvasId), $.parseJSON(seriesArray), $.extend(true, {}, _PSE_plotOptions));
     changeColors(); // this will need to eventually have the addition of the d3 plot function
     $(".tickLabel").each(function () {
     $(this).css("color", "#000000");
     });
     //if you want to catch the right mouse click you have to change the flot sources
     // because it allows you to catch only "plotclick" and "plothover"
     applyClickEvent(canvasId, backPage);
     applyHoverEvent(canvasId);*/
}


function d3Plot(placeHolder, data, options, pageParam) {
    //these lines are cleanup for artifacts of the conversion that aren't behaving nicely, they should eventually be removed because they are just treating the symptoms.
    if (d3.select(".outerCanvas").empty() != true) {
        d3.selectAll(".outerCanvas").remove()
    }
    if (d3.selectAll("#main_div_pse")[0].length != 1) {
        var oneOrMoreDiv = d3.selectAll("div > div.flex-wrapper"); //index necessary because selection is an array with two elements, and second is unneccessary

        if (oneOrMoreDiv[0].length > 1) {
            oneOrMoreDiv[0][1].remove()
        } else {
            oneOrMoreDiv[0][0].remove()
        }
    }
    function createScale(xORy) {
        // !! there is the potential to create wrong looking figures when the lower extent has a negative value in it, but is this just an error coming from large ranges? or
        //todo relate the scaling factor to the radius values available
        if (xORy === "x") {
            var [lowerExtent,upperExtent] = d3.extent(_PSE_plotOptions.xaxis.labels),
                extentPadding = ((upperExtent - lowerExtent) * .10) / 2, // this multiplication factor controls how much the dots are gathered together
                [padLo,padUp] = [lowerExtent - extentPadding, upperExtent + extentPadding];


                var newScale = d3.scale.linear()
                    .domain([padLo, padUp])
                    .range([options.margins.left, innerWidth - options.margins.right]);
            }
        else {
            var [lowerExtent,upperExtent] = d3.extent(_PSE_plotOptions.yaxis.labels),
                extentPadding = ((upperExtent - lowerExtent) * .35) / 2,
                [padLo,padUp] = [lowerExtent - extentPadding, upperExtent + extentPadding];


                var newScale = d3.scale.linear()
                    .domain([padLo, padUp])
                    .range([innerHeight - (options.margins.bottom), options.margins.top]);

            }
            return newScale
        }


    function createRange(arr) { // this makes a large range in the form of an array of values that configure to the proper step value that the ticks would otherwise be spaced at.
        var step = arr[1] - arr[0];
        return d3.range(-50 + arr[1], 50 + arr[1], step)
    }

    function createAxis(xORy) {
        if (xORy === "x") { // should I be creating the whole axis inside here, or should I simply return the axis that has the parts to be customized and called later
            newAxis = d3.svg.axis().scale(xScale)
                .orient("bottom")
                .tickValues(createRange(_PSE_plotOptions.xaxis.labels));
            return newAxis
        }
        else {
            newAxis = d3.svg.axis().scale(yScale)
                .orient("left")
                .tickValues(createRange(_PSE_plotOptions.yaxis.labels));
            return newAxis
        }
    }

    function split_element_string(string) {
        string = string.replace("\n")
    }

    function getFilterSelections(selectElement) { //todo make this specific to the element that it is applied to. so parameter is the selection element
        doAjaxCall({
            type: 'POST',
            url: '/flow/PSE_filter_selections',
            success: function (r) {
                for (var i = 0; i < d3.selectAll(".action-store")[0].length; i++) { // note the indexing due to the selectAll returning a one ele array of multiple arrays
                    var selectElement = d3.select("#filterSelect" + i);
                    selectElement.selectAll("option").remove();
                    selectElement.html(r);// this is the best way that i could come up with to separate out the returned elements
                }

            },
            error: function () {
                displayMessage("couldn't load the selection bar", "errorMessage")
            }
        })
    }
    function moveDots() {
        circles
            .transition()
            .attr({
                cx: function (d) {
                    return xScale(_PSE_plotOptions.xaxis.tickFormatter(d.data[0][0]))
                },
                cy: function (d) {
                    return yScale(_PSE_plotOptions.yaxis.tickFormatter(d.data[0][1]))
                }

                // return yScale(d.yCen) // why is this placing dots far below the bottom of the pane? Is the canvas dimension off?


            })
    }

    function workingDataRemove(index, dataObj) {
        for (i in dataObj) {
            if (dataObj[i].data[0] == index) {
                dataObj.splice(i, 1);
                return
            }
        }

    }


    function getKey(d) {
        return d.key
    }

    function transparentDots() {
        d3.selectAll("circle").data(workingData, getKey).exit()
            .transition()
            .duration(500)
            .attr("fill-opacity", ".1")
    }

    function xyzoomed() { // more compact way of doing this?
        d3.select("#xAxis").call(xAxis);
        d3.select("#yAxis").call(yAxis);
        d3.select("#xGrid").call(xGrid);
        d3.select("#yGrid").call(yGrid);
        moveDots()
    }

    function xzoomed() {
        d3.select("#xAxis").call(xAxis);
        d3.select("#xGrid").call(xGrid);
        moveDots()
    }

    function yzoomed() {
        d3.select("#yAxis").call(yAxis);
        d3.select("#yGrid").call(yGrid);
        moveDots()
    }

    function returnfill(weight) {

            var colTest = ColSch_getGradientColorString(weight, _PSE_minColor, _PSE_maxColor).replace("a", ""), // the a creates an error in the color scale creation
                d3color = d3.rgb(colTest);
            return d3color

    }


    var myBase, workingData, canvasDimensions, canvas, xScale, yScale, xRef, yRef, xAxis, yAxis, circles, brush,
        dotsCanvas, innerHeight, innerWidth, toolTipDiv, zoom, zoomable;
    myBase = d3.select(placeHolder);
    workingData = $.parseJSON(data);
    for (ind in workingData) {
        workingData[ind].key = parseFloat(ind)
    }
    ;
    canvasDimensions = {h: parseInt(myBase.style("height")), w: parseInt(myBase.style("width"))};
    innerHeight = canvasDimensions.h - options.margins.top;
    innerWidth = canvasDimensions.w - options.margins.left;
    xScale = createScale("x");
    yScale = createScale("y");
    xyzoom = d3.behavior.zoom()
        .x(xScale)
        .y(yScale)
        .on("zoom", xyzoomed);
    yzoom = d3.behavior.zoom()
        .y(yScale)
        .on("zoom", yzoomed);
    xzoom = d3.behavior.zoom()
        .x(xScale)
        .on("zoom", xzoomed);
    canvas = myBase.append("svg")
        .attr({
            class: "outerCanvas",
            height: canvasDimensions.h,
            width: canvasDimensions.w
        })
        .append("g")
        .attr("transform", "translate( " + options.margins.left + "," + options.margins.top + " )");
    canvasClip = canvas.append("svg:clipPath")
        .attr("id", "genClip")
        .append("svg:rect")
        .attr("id", "clipRect")
        .attr("x", _PSE_plotOptions.margins.left)
        .attr("y", _PSE_plotOptions.margins.top)
        .attr("width", innerWidth - _PSE_plotOptions.margins.left - _PSE_plotOptions.margins.right)
        .attr("height", innerHeight - _PSE_plotOptions.margins.bottom - _PSE_plotOptions.margins.top);
    xAxisClip = canvas.append("svg:clipPath")
        .attr("id", "xClip")
        .append("svg:rect")
        .attr("x", _PSE_plotOptions.margins.left)
        .attr("y", 0)
        .attr("width", innerWidth - _PSE_plotOptions.margins.left - _PSE_plotOptions.margins.right)
        .attr("height", _PSE_plotOptions.margins.bottom);
    yAxisClip = canvas.append("svg:clipPath")
        .attr("id", "yClip")
        .append("svg:rect")
        .attr("x", -_PSE_plotOptions.margins.left * 2)// these two areas are simply selected for what they accomplish visually. I wonder if there could be a real connection to the values used for arranging the canvas
        .attr("y", _PSE_plotOptions.margins.top)
        .attr("width", _PSE_plotOptions.margins.right)//
        .attr("height", innerHeight - _PSE_plotOptions.margins.bottom - _PSE_plotOptions.margins.top);

    toolTipDiv = d3.select(".tooltip");
    xAxis = createAxis("x");
    xGrid = createAxis("x")
        .tickSize(innerHeight, 0, 0)
        .tickFormat("");
    yAxis = createAxis("y");
    yGrid = createAxis("y")
        .tickSize(-innerWidth, 0, 0)
        .tickFormat("");


    canvas.append("g")
        .attr("id", "yGrid")
        .attr("clip-path", "url(#genClip)")
        .attr("transform", "translate (0,0)")
        .style("stroke", "gray")
        .style("stroke-opacity", ".5")
        .call(yGrid);

    canvas.append("g")
        .attr("id", "xGrid")
        .attr("clip-path", "url(#genClip)")
        .attr("transform", "translate (0,0)")
        .style("stroke", "gray")
        .style("stroke-opacity", ".5")
        .call(xGrid);

    canvas.append("g") // the tricky part here is to applythe clip where the xaxis was before the transform
        .attr("id", "xAxis")
        .attr("clip-path", "url(#xClip)")
        .attr("transform", "translate (0," + ( innerHeight - _PSE_plotOptions.margins.bottom ) + ")")
        .call(xAxis)
        .call(xzoom);
    canvas.append("g")
        .attr("id", "yAxis")
        .attr("clip-path", "url(#yClip)")
        .attr("transform", "translate (" + _PSE_plotOptions.margins.left + " ,0)")
        .call(yAxis)
        .call(yzoom);

    dotsCanvas = canvas.append("svg")
        .classed("dotsCanvas", true)
        .attr({
            height: innerHeight,
            width: innerWidth
        })
        .attr("clip-path", "url(#genClip)");
    circles = dotsCanvas.selectAll("circle").data(workingData, getKey).enter().append("circle")
        .attr({
            r: function (d) {
                return d.points.radius
            },
            cx: function (d) {
                return xScale(_PSE_plotOptions.xaxis.tickFormatter(d.data[0][0]))
            },
            cy: function (d) {
                return yScale(_PSE_plotOptions.yaxis.tickFormatter(d.data[0][1]))
            },
            fill: function (d) {
                var nodeInfo = PSE_nodesInfo[d.data[0][0]][d.data[0][1]];
                if (nodeInfo.tooltip.search("PENDING") == -1 && nodeInfo.tooltip.search("CANCELED") == -1) {
                    color = returnfill(nodeInfo.color_weight);
                }
                else {
                    var color = d3.rgb("black");
                }
                return color
            }

        });


    d3.select("#Explore").on("click", function () { //todo deactivate the hand panning so that brush can be used
        function expBrushMove() {
            // var xRange
        }

        function expBrushStop() { // todo add sliders to the div that shows up
            if (exploreBrush.empty() == true) {
                explToolTip.style("display", "none")
            } else {
                var extent = exploreBrush.extent();
                var xRange = Math.abs(extent[0][0] - extent[1][0]),
                    yRange = Math.abs(extent[0][1] - extent[1][1]);
                explToolTip.style({
                    position: "absolute",
                    left: xScale(extent[1][0]) + _PSE_plotOptions.margins.left + "px", //this is the x cordinate of where the drag ended (assumption here is drags from left to right
                    top: yScale(extent[1][1]) + _PSE_plotOptions.margins.top + 100 + "px",
                    display: "block",
                    'background-color': '#C0C0C0',
                    border: '1px solid #fdd',
                    padding: '2px',
                    opacity: 0.80
                });
                d3.select("#xRange").text(xRange);
                d3.select("#yRange").text(yRange)
            }
        }

        var explToolTip = d3.select("#ExploreToolTip");

        var exploreBrush = d3.svg.brush()
            .x(xScale)
            .y(yScale)
            .on("brush", expBrushMove)
            .on("brushend", expBrushStop);
        if (d3.select(".brush").empty() == true) {
            canvas.append("g")
                .attr("class", "brush")
                .call(exploreBrush)
                .selectAll("rect");
        } else {
            d3.select(".brush").remove();
            explToolTip.style("display", "none"); // is this redundant with the above tooltip hider?
        }


    });

    d3.select("#Filter").on("click", function () { //todo standardize the id names for the div elements used for the various overlays.
        //todo ask lia if I'm going about adding the selector in the correct way.
        //todo !!ask lia how to debug the python aspects of this code. (breakpoints and introspection)
        //todo do I need to make a new genshi template that will return the elements


        var filterDiv = d3.select("#FilterDiv"),
            idNum = d3.selectAll("#threshold").length;
        if (filterDiv.style("display") == "none") {
            filterDiv.style("display", "block");
            getFilterSelections()
        }


        else {
            filterDiv.style("display", "none")
        }
    });

    d3.select("#filterGo").on("click", function () {
        // so I could make a function that gets called on each of the bars that have been selected yes?
        function thresholdFilterSize(cir, set) {
            var radius = parseFloat(cir.attributes.r.value);
            if (radius < sizeScale(criteria.threshold.value)) {
                set.add(cir.__data__.data[0]); // why does having workingData as an argument make it in the local scope all of a sudden?
            }
        }

        function thresholdFilterColor(cir, set) { //todo !!ask about how to easily give users a way to select a reasonable value, because numbers are really small
            // will I need to be able to parse exponential(scientific) digits?
            // should I give people a sampling tool for the color? like an eyedropper?
            var nodeInfo = PSE_nodesInfo[cir.__data__.data[0][0]][cir.__data__.data[0][1]];
            if (nodeInfo.color_weight < criteria.threshold.value) {
                set.add(cir.__data__.data[0]);
            }
        }

        function rateFilterColor(cir, set) {
            allCircles; // why does putting this here actually create a reference to it?
            var focusRow = cir.__data__.data[0][1], //zero based index
                focusCol = cir.__data__.data[0][0],
                colorWeight = PSE_nodesInfo[focusCol][focusRow].color_weight, //essentially the same as the row above
                topRow = PSE_nodesInfo[0].length - 1, //1 based index so subtract 1 PERHAPS NOT NEEDED INSIDE FUNCTION AS VALUES ARE STATIC
                rightCol = PSE_nodesInfo.length - 1;
            if (focusRow != topRow && focusCol != rightCol) { //wha is a good algorithmic way to check all these options efficiently
                var vertCircle = allCircles[0][focusRow + focusCol + 1],//allcircles is ordered in columns, so this selects dot above
                    horzCircle = allCircles[0][focusCol + focusRow + 3];
                // what will happen if we start making non linear groups here?
            }
            else if (focusRow == topRow && focusCol != rightCol) {
                var vertCircle = allCircles[0][focusRow + focusCol - 1],
                    horzCircle = allCircles[0][focusCol + focusRow + 3]
            }
            else if (focusRow != topRow && focusCol == rightCol) {
                var vertCircle = allCircles[0][focusRow + focusCol + 1],
                    horzCircle = allCircles[0][focusCol + focusRow - 3]

            }
            else {
                var vertCircle = allCircles[0][focusRow + focusCol - 1],
                    horzCircle = allCircles[0][focusCol + focusRow - 3]
            }


            for (otherCir of [horzCircle, vertCircle]) { // todo determine how to parse scientific entries
                var otherCirColWeight = PSE_nodesInfo[otherCir.__data__.data[0][0]][otherCir.__data__.data[0][1]].color_weight,  //the inverting brings out values that are related to max and min for the size
                    colDiff = Math.abs(colorWeight - otherCirColWeight);
                if (colDiff < criteria.rate.value) {
                    set.add(cir.__data__.data[0])
                }

            }
        }

        function rateFilterSize(cir, set) {
            //todo come back and fix the indexing so that the vertical circles are actually the ones that are being selected in col numbers greater than 0
            allCircles, sizeScale; // why does putting this here actually create a reference to it?
            var focusRow = cir.__data__.data[0][1], //zero based index
                focusCol = cir.__data__.data[0][0] * 3, // the multiplication by 3 should be a necessary conversion number to match with the indices of the actual sized array.t
                topRow = PSE_nodesInfo[0].length - 1, //1 based index so subtract 1 PERHAPS NOT NEEDED INSIDE FUNCTION AS VALUES ARE STATIC
                rightCol = PSE_nodesInfo.length - 1;
            if (focusRow != topRow && focusCol / 3 != rightCol) { //wha is a good algorithmic way to check all these options efficiently
                var vertCircle = allCircles[0][focusRow + focusCol + 1],//allcircles is ordered in columns, so this selects dot above
                    horzCircle = allCircles[0][focusCol + focusRow + 3];
                // what will happen if we start making non linear groups here?
            }
            else if (focusRow == topRow && focusCol / 3 != rightCol) {
                var vertCircle = allCircles[0][focusRow + focusCol - 1],
                    horzCircle = allCircles[0][focusCol + focusRow + 3]
            }
            else if (focusRow != topRow && focusCol == rightCol) {
                var vertCircle = allCircles[0][focusRow + focusCol + 1],
                    horzCircle = allCircles[0][focusCol + focusRow - 3]

            }
            else {
                var vertCircle = allCircles[0][focusRow + focusCol - 1],
                    horzCircle = allCircles[0][focusCol + focusRow - 3]
            }
            ;


            for (otherCir of [horzCircle, vertCircle]) { //todo have conditional check to prevent the top row and the far right from making duplicates
                var radDiff = Math.abs(sizeScale.invert(cir.attributes.r.value) - sizeScale.invert(otherCir.attributes.r.value)),
                    lineFunc = d3.svg.line()
                        .x(function (d) {
                            return d.x
                        })
                        .y(function (d) {
                            return d.y
                        })
                        .interpolate("linear");

                if (radDiff > criteria.rate.value) { // the < should make it so that only items with large changes of metric are kept on canvas
                    // set.add(cir.__data__.data[0])
                    //todo still make things sensitive to placement on the canvas, (border cases)
                    //todo figure out what's happening in the bottom right of the canvas
                    var cirRad = +cir.attributes.r.value,
                        cirX = +cir.attributes.cx.value,
                        cirY = +cir.attributes.cy.value,
                        otherRad = +otherCir.attributes.r.value,
                        otherX = +otherCir.attributes.cx.value,
                        otherY = +otherCir.attributes.cy.value,
                        diffDistX = ((otherX + otherRad) - (cirX + cirRad)) / 2,
                        diffDistY = ((cirY + cirRad) - (otherY + otherRad)) / 2,
                        lineData = [];
                    if (cirX - otherX == 0) { //determines which pair we are examining, if zero it is vert circle
                        var lineData = [{
                            y: cirY - diffDistY, // this is the bottom position of the focused circle
                            x: cirY
                        },
                            {
                                y: cirY - diffDistY, // this is the bottom position of the focused circle
                                x: otherY
                            }]

                    } else {
                        // this should calculate the distance between the inner edges of the circles and then divide by 2
                        var lineData = [{
                            x: cirX + diffDistX, // this is the bottom position of the focused circle
                            y: cirX
                        },
                            {
                                x: cirX + diffDistX, // this is the bottom position of the focused circle
                                y: otherX
                            }]
                    }
                    ;
                    if (lineData != null) {
                        d3.select(".dotsCanvas").append("path")
                            .attr("d", lineFunc(lineData))
                            .attr("stroke", radDiffColScale(radDiff))
                            .attr("stroke-width", "2px")
                            .attr("fill", "none");
                    }
                }
            }
        }


        var allCircles = d3.selectAll("circle"),
            min_size = d3.select("#minShapeLabel").node().innerHTML,
            max_size = d3.select("#maxShapeLabel").node().innerHTML,
            sizeScale = d3.scale.linear()
                .domain([+min_size, +max_size]) // these plus signs convert the string to number
                .range(d3.extent(workingData, function (d) {
                    return +d.points.radius
                })), // makes sure that we don't start creating negative radii based on user input, clamps to upper or lower bounds
            criteria = {
                threshold: {//currently this is hard coded for the size filters which needs to be updated
                    value: +d3.select("#threshold").node().value
                    , type: d3.select("input[name=threshold]:checked").node().id
                },//specifies color versus size measurements
                rate: { // how to relate rate of change  to the max and min
                    value: +d3.select("#rateOfChange").node().value //in theory this won't need to have the scale, because the differences will be arbitrary value
                    , type: d3.select("input[name=rateOfChange]:checked").node().id
                },
                logic: d3.select("input[name=logicButton]:checked").node().id
            },
            removalSet,
            radDiffColScale = d3.scale.linear()
                .domain([0, max_size - min_size])
                .range(["white", "red"]);

        if (criteria.logic == "Or") {
            var thresholdSet = new Set(),
                rateSet = new Set();
            d3.selectAll("circle")[0].forEach(function (d) {// [0] part seems strange, is there another way to use forEach without it?
                if (criteria.threshold.type == "Size" && criteria.rate.type == "Size") {
                    thresholdFilterSize(d, thresholdSet);
                    rateFilterSize(d, rateSet);

                } else if (criteria.threshold.type == "Color" && criteria.rate.type == "Size") {
                    thresholdFilterColor(d, thresholdSet);
                    rateFilterSize(d, rateSet);

                } else if (criteria.threshold.type == "Size" && criteria.rate.type == "Color") {
                    thresholdFilterSize(d, thresholdSet);
                    rateFilterColor(d, rateSet);
                } else {
                    thresholdFilterColor(d, thresholdSet);
                    rateFilterColor(d, rateSet)
                }
            });
            // @formatter:off
            removalSet = new Set([...thresholdSet, ...rateSet]);// this performs a union of the two sets, and the actual syntax is messing up pycharm
            // @formatter: on
        } else if (criteria.logic == "And") {
            var thresholdSet = new Set(),
                rateSet = new Set();
            d3.selectAll("circle")[0].forEach(function (d) {// [0] part seems strange, is there another way to use forEach without it?
                if (criteria.threshold.type == "Size" && criteria.rate.type == "Size") {
                    thresholdFilterSize(d, thresholdSet);
                    rateFilterSize(d, rateSet);

                } else if (criteria.threshold.type == "Color" && criteria.rate.type == "Size") {
                    thresholdFilterColor(d, thresholdSet);
                    rateFilterSize(d, rateSet);

                } else if (criteria.threshold.type == "Size" && criteria.rate.type == "Color") {
                    thresholdFilterSize(d, thresholdSet);
                    rateFilterColor(d, rateSet);
                } else {
                    thresholdFilterColor(d, thresholdSet);
                    rateFilterColor(d, rateSet)
                }

            });

            //line below is pycharm commmand to prevent bug triggered by auto format
            // @formatter:off
            removalSet = new Set([...thresholdSet].filter(x => rateSet.has(x))) // this is an intersection for set arithmetic the [...] converts by spreading out elements => is a shorthand function form
            // @formatter:on


        }
        ;
        ;
        removalSet.forEach(function (indPair) {
            workingDataRemove(indPair, workingData)
        });
        transparentDots()
    });



    d3.selectAll("circle").on("mouseover", function (d) {
        var nodeInfo = PSE_nodesInfo[d.data[0][0]][d.data[0][1]];
        var toolTipText = nodeInfo.tooltip.split("&amp;").join("&").split("&lt;").join("<").split("&gt;").join(">");
        toolTipDiv.html(toolTipText);
        toolTipDiv.style({
            position: "absolute",
            left: (d3.event.pageX) + "px",
            top: (d3.event.pageY - 100) + "px",
            display: "block",
            'background-color': '#C0C0C0',
            border: '1px solid #fdd',
            padding: '2px',
            opacity: 0.80
        })
    })
        .on("mouseout", function (d) {
            toolTipDiv.transition()
                .duration(300)
                .style("display", "none")
        });
    d3.selectAll("circle").on("click", function (d) {
        var nodeInfo = PSE_nodesInfo[d.data[0][0]][d.data[0][1]];
        if (nodeInfo.dataType != undefined) {
            displayNodeDetails(nodeInfo['Gid'], nodeInfo['dataType'], pageParam); // curious because backPage isn't in the scope, but appears to work.
        }
    });

    d3.select(".action-store").on("click", function () { // this is the functionality for the save button next to the text box for the select  element.
        var incoming_values = {
            name: d3.select('#overlayNameInput').property('value'),
            threshold_value: d3.select('input#threshold').property('value'),
            threshold_type: d3.select('input[name="threshold"]:checked').property('id')
        };
        doAjaxCall({
            type: 'POST',
            url: '/flow/save_PSE_filter_setup/',
            data: incoming_values,
            success: function (r) {
                getFilterSelections();
                d3.select('#overlayNameInput').property('value', '')
            },
            error: function () {
                displayMessage('could not store the selected text', 'errorMessage')
            }

        })
    });

    d3.select("#filterSelect").on("change", function () { // todo make this specific to the incremental ids
        var filterSpecs = d3.select(this).property("value").split(','); //threshold value (type float) is stored first index, and then the type (string)
        d3.select("input#threshold").property("value", parseFloat(filterSpecs[0]));
        d3.select("input[type='radio']#" + filterSpecs[1]).property("checked", true)
    })

    d3.select("#addFilterOps").on("click", function () { //todo attach id numbers to the add and remove buttons
        var nextRowId = d3.selectAll("#addFilterOps").length;
        doAjaxCall({
            type: "POST",
            url: "/flow/create_row_of_specs/" + nextRowId + "/", //remember if you experience an error about there now being a row for one(), there is some silly typo sitting around, so go and check everything with the working examples.
            success: function (r) {
                var newLiEntry = d3.select("#FilterDiv > ul").append("li").html(r)
                getFilterSelections()
            },
            error: function () { //todo make sure the selection options get shared to all selection bars
                displayMessage("couldn't add new row of filter options", "errorMessage")
            }
        })

    })


}
/*
 * Do a redraw of the plot. Be sure to keep the resizable margin elements as the plot method seems to destroy them.
 */
function redrawPlot(plotCanvasId) {
    /*// todo: mh the selected element is not an ancestor of the second tab!!!
     // thus this redraw call fails, ex on resize

     if (_PSE_plot != null) {
     _PSE_plot = $.plot($('#' + plotCanvasId)[0], _PSE_plot.getData(), $.extend(true, {}, _PSE_plotOptions));
     }*/
    //it appears that there is a tie in for window.resize to this function. Lets see how this works out
    if (backPage == null || backPage == '') {
        var backPage = get_URL_param('back_page');
    }
    PSE_mainDraw('main_div_pse', backPage)

}


/*
 * Fire DataType overlay when clicking on a node in PSE.
 */
function applyClickEvent(canvasId, backPage) {
    var currentCanvas = $("#" + canvasId);
    currentCanvas.unbind("plotclick");
    currentCanvas.bind("plotclick", function (event, pos, item) {
        if (item != null) {
            var dataPoint = item.datapoint;
            var dataInfo = PSE_nodesInfo[dataPoint[0]][dataPoint[1]];
            if (dataInfo['dataType'] != undefined) {
                displayNodeDetails(dataInfo['Gid'], dataInfo['dataType'], backPage);
            }
        }
    });
}

var previousPoint = null;
/*
 * On hover display few additional information about this node.
 */
function applyHoverEvent(canvasId) {
    $("#" + canvasId).bind("plothover", function (event, pos, item) {
        if (item) {
            if (previousPoint != item.dataIndex) {
                previousPoint = item.dataIndex;
                $("#tooltip").remove();
                var dataPoint = item.datapoint;
                var dataInfo = PSE_nodesInfo[dataPoint[0]][dataPoint[1]];
                var tooltipText = ("" + dataInfo["tooltip"]).split("&amp;").join("&").split("&lt;").join("<").split("&gt;").join(">");

                $('<div id="tooltip"> </div>').html(tooltipText
                ).css({
                        position: 'absolute', display: 'none', top: item.pageY + 5, left: item.pageX + 5,
                        border: '1px solid #fdd', padding: '2px', 'background-color': '#C0C0C0', opacity: 0.80
                    }
                ).appendTo('body').fadeIn(200);
            }
        } else {
            $("#tooltip").remove();
            previousPoint = null;
        }
    });
}


function PSEDiscreteInitialize(labelsXJson, labelsYJson, series_array, dataJson, backPage, hasStartedOperations,
                               min_color, max_color, min_size, max_size) {


    var labels_x = $.parseJSON(labelsXJson);
    var labels_y = $.parseJSON(labelsYJson);
    var data = $.parseJSON(dataJson);

    min_color = parseFloat(min_color); // todo run a batch of simulations part of the way,  and then cancel to see what the result looks like.
    max_color = parseFloat(max_color);
    min_size = parseFloat(min_size);
    max_size = parseFloat(max_size);

    ColSch_initColorSchemeGUI(min_color, max_color, function () { //this now doesn't create error in simulator panel, why?
        _updatePlotPSE('main_div_pse', labels_x, labels_y, series_array, data, min_color, max_color, backPage);
    });

    function _fmt_lbl(sel, v) {
        $(sel).html(Number.isNaN(v) ? 'not available' : toSignificantDigits(v, 3));
    }

    _fmt_lbl('#minColorLabel', min_color);
    _fmt_lbl('#maxColorLabel', max_color);
    _fmt_lbl('#minShapeLabel', min_size);
    _fmt_lbl('#maxShapeLabel', max_size);

    if (Number.isNaN(min_color)) {
        min_color = 0;
        max_color = 1;
    }
    _updatePlotPSE('main_div_pse', labels_x, labels_y, series_array, data, min_color, max_color, backPage); // why is this called a second time?


    if (hasStartedOperations) {
        setTimeout("PSE_mainDraw('main_div_pse','" + backPage + "')", 3000);
    }
}


/*
 * Take currently selected metrics and refresh the plot.
 */
function PSE_mainDraw(parametersCanvasId, backPage, groupGID) {

    if (groupGID == null) {
        // We didn't get parameter, so try to get group id from page
        groupGID = document.getElementById("datatype-group-gid").value;
    }
    if (backPage == null || backPage == '') {
        backPage = get_URL_param('back_page');
    }

    var url = '/burst/explore/draw_discrete_exploration/' + groupGID + '/' + backPage;
    var selectedColorMetric = $('#color_metric_select').val();
    var selectedSizeMetric = $('#size_metric_select').val();

    if (selectedColorMetric != '' && selectedColorMetric != null) {
        url += '/' + selectedColorMetric;
        if (selectedSizeMetric != '' && selectedSizeMetric != null) {
            url += '/' + selectedSizeMetric;
        }
    }


    doAjaxCall({
        type: "POST",
        url: url,
        success: function (r) {
            $('#' + parametersCanvasId).html(r);
        },
        error: function () {
            displayMessage("Could not refresh with the new metrics.", "errorMessage");
        }
    });
}


/**
 * Changes the series colors according to the color picker component.
 */
function changeColors() {
    var series = _PSE_plot.getData();
    for (var i = 0; i < series.length; i++) {
        var indexes = series[i].datapoints.points;
        var dataInfo = PSE_nodesInfo[indexes[0]][indexes[1]];
        var colorWeight = dataInfo['color_weight'];
        var color = ColSch_getGradientColorString(colorWeight, _PSE_minColor, _PSE_maxColor);
        series[i].points.fillColor = color;
        series[i].color = color;
    }
    _PSE_plot.draw();
}


/*************************************************************************************************************************
 *            ISOCLINE PSE BELLOW
 *************************************************************************************************************************/


var serverURL = null;
var figuresDict = null;
var currentFigure = null;


/*
 * Do the actual resize on currentFigure global var, and a given width and height.
 */
function resizePlot(width, height) {
    if (currentFigure != null) {
        MPLH5_resize = currentFigure;
        do_resize(currentFigure, width, height);
        MPLH5_resize = -1;
    }
}

/*
 * Store all needed data as js variables so we can use later on.
 */
function initISOData(metric, figDict, servURL) {
    figuresDict = $.parseJSON(figDict);
    serverURL = servURL;
    currentFigure = figuresDict[metric];
    connect_manager(serverURL, figuresDict[metric]);
    $('#' + metric).show();
    initMPLH5CanvasForExportAsImage(figuresDict[metric]);
}

/*
 * On plot change update metric and do any required changes like resize on new selected plot.
 */
function updateMetric(selectComponent) {
    var newMetric = $(selectComponent).find(':selected').val();
    showMetric(newMetric);
    var pseElem = $('#section-pse');
    var width = pseElem.width() - 60;
    var height = pseElem.height() - 90;
    waitOnConnection(currentFigure, 'resizePlot(' + width + ', ' + height + ')', 200, 50);
}

/*
 * Update html to show the new metric. Also connect to backend mplh5 for this new image.
 */
function showMetric(newMetric) {
    for (var key in figuresDict) {
        $('#' + key).hide()
            .find('canvas').each(function () {
            if (this.drawForImageExport) {            // remove redrawing method such that only current view is exported
                this.drawForImageExport = null;
            }
        });
    }
    currentFigure = figuresDict[newMetric];
    connect_manager(serverURL, figuresDict[newMetric]);
    $('#' + newMetric).show();
    initMPLH5CanvasForExportAsImage(figuresDict[newMetric]);
}

/*
 * This is the callback that will get evaluated by an onClick event on the canvas through the mplh5 backend.
 */
function clickedDatatype(datatypeGid) {
    displayNodeDetails(datatypeGid);
}

/*
 * Update info on mouse over. This event is passed as a callback from the isocline python adapter.
 */
function hoverPlot(id, x, y, val) {
    $('#cursor_info_' + id).html('x axis:' + x + ' y axis:' + y + ' value:' + val);
}


function Isocline_MainDraw(groupGID, divId, width, height) {
    width = Math.floor(width);
    height = Math.floor(height);
    $('#' + divId).html('');
    doAjaxCall({
        type: "POST",
        url: '/burst/explore/draw_isocline_exploration/' + groupGID + '/' + width + '/' + height,
        success: function (r) {
            $('#' + divId).html(r);
        },
        error: function () {
            displayMessage("Could not refresh with the new metrics.", "errorMessage");
        }
    });
}


