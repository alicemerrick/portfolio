var width = 500;
var height = 500;
var margin = {top: 40, right: 40, bottom: 40, left: 40};
var w = width - margin.left - margin.right;
var h = height - margin.top - margin.bottom;

var dataset; //the full dataset
var ndata; //new dataset
var counties, states; // topojson for US


d3.csv("joinedData.csv", function(error, joinedData) {
    //read in the data
    if (error) return console.warn(error);
    joinedData.forEach(function(d) {
	d.fips= +d.fips;
	d.trump_margin = +d.trump_margin;
	d.foreign_pop = +d.foreign_pop;
	if (d.foreign_pop == 0) {
            d.foreign_pop = +d.foreign_pop_09;
	}
	d.total_votes = +d.total_votes;
	// election.set(d.fips, d.trump_margin);
	// foreign.set(d.fips, +d.foreign_pop);
	supermap.set(d.fips, d);
    });
    //dataset is the full dataset -- maintain a copy of this at all times
    dataset = joinedData;
    ndata = dataset;

    // electionscale = d3.scaleQuantile()
    //   .domain(dataset.map(function(d) { return d.trump_margin; }))
    //   .range(d3.schemeRdBu[10]);
    //
    //   foreignscale = d3.scaleSequential(d3.interpolateBlues)
    //     .domain([0,12]);


    //all the data is now loaded, so draw the initial vis
    drawVis(dataset);

    d3.queue()
	.defer(d3.json, "https://d3js.org/us-10m.v1.json")
	.await(function(error, us) {
	    if (error) throw error;
	    counties = topojson.feature(us, us.objects.counties).features;
	    states = topojson.feature(us, us.objects.states, function(a, b) { return a !== b; });

	    drawMap("trump_margin");
	    // drawForeign();
	});
});

//none of these depend on the data being loaded so fine to define here





// var svg = d3.select("body").append("svg")
//     .attr("width", w + margin.left + margin.right)
//     .attr("height", h + margin.top + margin.bottom)
//     .append("g")
//     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var chart = d3.select(".chart")
    .attr("width", w + margin.left + margin.right)
    .attr("height", h + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


/////////////////////MAP//////////////////////
// var col = d3.scaleOrdinal(d3.schemeCategory10);
// var electionscale = d3.scaleSequential(d3.schemeRdBu).domain([1, -1]);
//
// var foreignscale = d3.scaleSequential(d3.schemeBlues).domain([1, 0]);

var svg = d3.select(".map"),
    width = +svg.attr("width"),
    height = +svg.attr("height");


var election = d3.map();
var foreign = d3.map();
var supermap = d3.map();

var path = d3.geoPath();


var BuRd = chroma.brewer.RdBu.reverse();
var electionscale = chroma.scale(BuRd).domain([-50,50]).classes(10);
var foreignscale = chroma.scale('GnBu').domain([0.5, 60]).classes(chroma.limits(chroma.analyze([0.5, 60]), 'l', 10));

var colorscale, color;
var mapAttr = "trump_margin";
// var g = svg.append("g")
//     .attr("class", "key")
//     .attr("transform", "translate(0,40)");




function drawMap(highlightId) {

    var text, domain, y, ticks;
    if (mapAttr == "foreign_pop") {
	colorscale = foreignscale;
	text = "Foreign-born Population";
	domain = [0.1,100];
	y = d3.scaleLog()
            .domain(domain)
            .rangeRound([600, 860]);
	ticks = 3;
    }
    else {
	colorscale = electionscale;
	text = "Trump Margin";
	domain = [-50,50];
	y = d3.scaleLinear()
            .domain(domain)
            .rangeRound([600, 860]);
	ticks = 10;
    }

    //LEGEND//
    var x = d3.scaleLinear()
        .domain([0, ticks])
        .rangeRound([600, 860]);
    /*
    var y = d3.scaleLinear()
        .domain(domain)
        .rangeRound([600, 860]);
    */

    svg.selectAll("g").remove();

    var g = svg.append("g")
    .attr("class", "key")
    .attr("transform", "translate(0,40)");
    for (var i = 0; i < ticks; i++) {
      var leftstart = x(i);
      var tickwidth = (x(ticks) - x(0)) / ticks;
      for (var j = 0; j < tickwidth; j++) {
        if (mapAttr == "foreign_pop") {
          fillcolor = colorscale(domain[0] * Math.pow(10, i + (j/tickwidth)));
        }
        else {
          fillcolor = colorscale(domain[0] + (i*10) + ((10/tickwidth)*j));
        }
    g.append("rect")
      .attr("height", 8)
      .attr("x", leftstart + j)
      .attr("width", 1)
      .attr("fill", fillcolor);
	}
    }
    /*
    g.selectAll("rect")
	.data(color.range().map(function(d) {
            d = color.invertExtent(d);
            if (d[0] == null) d[0] = x.domain()[0];
            if (d[1] == null) d[1] = x.domain()[1];
            return d;
        }))
	.enter().append("rect")
        .attr("height", 8)
        .attr("x", function(d) { return x(d[0]); })
        .attr("width", function(d) { return x(d[1]) - x(d[0]); })
        .attr("fill", function(d) { return color(d[0]); });
    */

    g.append("text")
        .attr("class", "caption")
        .attr("x", x.range()[0])
        .attr("y", -6)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(text);
    if (mapAttr == "foreign_pop") {
	g.call(d3.axisBottom(y)
	   .ticks(3)
           .tickSize(13)
           .tickFormat(function(y, i) { return y + "%"; }))
        .select(".domain")
            .remove();
    }
    else {
    g.call(d3.axisBottom(y)
           .tickSize(13)
           .tickFormat(function(y, i) { return y + "%"; }))
        .select(".domain")
            .remove();
    }



    svg.append("g")
	.attr("class", "counties")
	.selectAll("path")
	.data(counties)
	.enter().append("path")
	.attr("stroke-width", ".25px")
	.attr("stroke",
	      function(d) {
		  if (highlightId!= undefined&&(+d.id) == highlightId) {
		      return "black";
		  }
		  return "gray";
	      })
	.attr("fill",
	      function(d) {
		  var row = supermap.get(+d.id);
		  if (row != undefined)
		  {
		      if (highlightId!= undefined&&(+d.id) == highlightId)
			  return "gray";
		      else
			  return colorscale(supermap.get(+d.id)[mapAttr]);
		  }
		  return 0;
	      })
	.attr("d", path)
	.on("mouseover", function(d) {
            tooltip.transition()
		.duration(300)
		.style("opacity", .9);
            var text =
		supermap.get(+d.id).county_name + ", " +
		supermap.get(+d.id).state_abbr + "<br>" +
		supermap.get(+d.id).foreign_pop +
		"% Foreign-born Population" + "<br>" +
		Math.round(supermap.get(+d.id).trump_margin*10)/10 +
		"% Trump Margin";
            tooltip.html(text)
		.style("left", (d3.event.pageX + 5) + "px")
		.style("top", (d3.event.pageY - 48) + "px");
        })
	.on("mouseout", function(d) {
            tooltip.transition()
		.duration(400)
		.style("opacity", 0);
	});

    svg.append("path")
        .datum(states)
        .attr("class", "states")
        .attr("d", path);


}

d3.selectAll("input[type=radio]").on("change", function() {
    mapAttr =
	d3.select('input[type=radio]:checked')
	.attr('value');
    drawMap();
});

//SCATTERPLOT//

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);


var x = d3.scaleLinear()
    .domain([0, 60])
    .range([0, w]);

var y = d3.scaleLinear()
    .domain([-50, 50])
    .range([h, 0]);

var xAxis = d3.axisBottom()
    .ticks(12)
    .scale(x);

chart.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + h + ")")
    .call(xAxis);
chart.append("text")
    .attr("transform", "translate(" + (w/2) + ", " + (h + 35) + ")")
    .style("text-anchor", "middle")
    .text("% Foreign-born Population");

var yAxis = d3.axisLeft()
    .scale(y);

chart.append("g")
    .attr("class", "axis")
    .call(yAxis);

chart.append("text")
    .attr("transform", "translate(-32, " + ((h/2) + 35) + ") rotate(-90)")
    .style("text-anchor", "center")
    .text("% Trump Margin");



function drawVis(dataset) { //draw the circiles initially and on each interaction with a control

    var circle = chart.selectAll("circle")
	.data(dataset);

    circle.attr("cx", function(d) { return x(d.foreign_pop);  })
        .attr("cy", function(d) { return y(d.trump_margin);  })
        .style("stroke", "white")
        .style("opacity", .9)
        .style("fill", "steelblue" );
    //	.style("fill", function(d) { return electionscale(d.trump_margin); });

    circle.exit().remove();

    circle.enter().append("circle")
        .attr("cx", function(d) { return x(d.foreign_pop);  })
        .attr("cy", function(d) { return y(d.trump_margin);  })
        .attr("r", 3)
        .style("stroke", "white")
        .style("opacity", .9)
        .style("fill", "steelblue" )
    // 	.style("fill", function(d) { return electionscale(d.trump_margin); })
        .on("mouseover", function(d) {
            d3.select(this)
            .raise()
            .transition()
          		.duration(500)
          		.attr("r", 6)
          		.style("fill", "crimson");
            // console.log(d3.select(this));

            drawMap(d.fips);

            tooltip.transition()
          		.duration(300)
          		.style("opacity", 1);
          	    tooltip.html(d.county_name+", "+ d.state_abbr+
          			 "<br>Foreign-born Population: " + d.foreign_pop + "%<br>Trump Margin: " + Math.round(d.trump_margin*10)/10 + "%")
          		.style("left", (d3.event.pageX + 5) + "px")
          		.style("top", (d3.event.pageY - 28) + "px");

	})
        .on("mouseout", function(d) {
            d3.select(this).transition()
		.duration(500)
		.attr("r", 3)
    .style("fill", "steelblue")
		.style("stroke", "white");

            drawMap();

            tooltip.transition()
          	.duration(500)
          	.style("opacity", 0);
        });


}

var maxPop = 60;
// var maxVote = d3.max(dataset, function(d) { return d.total_votes; });
var maxVote = 2652072;
//in case I add more sliders later
var attributes = ["foreign_pop", "trump_margin", "total_votes"];
var ranges = [[0, maxPop], [-50,50], [0, maxVote]];

$(function() {
    $( "#foreignpop" ).slider({
        range: true,
        min: 0,
        max: maxPop,
        values: [ 0, maxPop ], slide: function( event, ui ) {
            $("#percentamount").val(ui.values[0] + "-" + ui.values[1]);
            ranges[0]=ui.values;
            filterData(ranges);
        }
    });
    $("#percentamount")
	.val(
	    $("#foreignpop").slider("values", 0)
		+ " - "
		+ $("#foreignpop").slider("values",1));
});



$(function() {
    $( "#trumpmargin" ).slider({
        range: true,
        min: -50,
        max: 50,
        values: [ -50, 50 ], slide: function( event, ui ) {
            $("#marginamount").val(ui.values[0] + "-" + ui.values[1]);
            ranges[1]=ui.values;
            filterData(ranges);
        }
    });
    $("#marginamount")
	.val(
	    $("#trumpmargin").slider("values", 0)
		+ " - "
		+ $("#trumpmargin").slider("values",1));
});


$(function() {
    $( "#totalvotes" ).slider({
        range: true,
        min: 0,
        max: maxVote,
        values: [ 0, maxVote ], slide: function( event, ui ) {
            $("#voteamount").val(ui.values[0] + "-" + ui.values[1]);
            ranges[2]=ui.values;
            filterData(ranges);
        }
    });
    $("#voteamount")
	.val(
	    $("#totalvotes").slider("values", 0)
		+ " - "
		+ $("#totalvotes").slider("values",1));
});

var patt = new RegExp("all");
//dropdown filter
function filterType(mystate) {
    var res = patt.test(mystate);
    if(res){
	ndata = dataset;
    }
    else {
	ndata = dataset.filter(function(d) {return d["state_abbr"] == mystate; });
    }
    filterData(ranges);

}

//a general filter to add more filters later
function filterData(attr, values){
    for (i = 0; i < attributes.length; i++){
	if (attr == attributes[i]){
	    ranges[i] = values;
	}
    }
    var toVisualize = ndata.filter(function(d) {
	return isInRange(d)
    });
    drawVis(toVisualize);
}

function isInRange(datum){
    for (i = 0; i < attributes.length; i++){
	if (datum[attributes[i]] < ranges[i][0] || datum[attributes[i]] > ranges[i][1]){
	    return false;
	}
    }
    return true;
}
