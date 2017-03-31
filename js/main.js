//definition of the global objects we are going to use in the application
var METERSPERSEC_MILESPERHOUR_FACTOR = 2.23693629;
//google map obj
var map;
//weborb 4 proxy obj
var proxy;
//appTimer is the timer for the entire application, it will drive the refresh interval and the clock updates.
var appTimer; 
//cameraTimer is the timer object for when the camera icon is clicked. it will refresh the camera image.
var cameraTimer;
//these are the default images for the cctv icons
var cctv_good = "img/cctv/cctv_good.png";
var cctv_fail = "img/cctv/cctv_fail.png";
//these are the default images for the logos
var logo_mta = "img/logos/mtaLogo.gif";
var logo_nyc = "img/logos/dotLogo_g.gif";
var logo_nys = "img/logos/nysdot_logo2.gif";
//these are for the reader location icons
var readerLocationIcon = "img/icons/bullet_green.png";
var readerLocationIcon_good = "img/icons/bullet_green.png";
var readerLocationIcon_fail = "img/icons/bullet_black.png";


var readerLocations;

//the vars below are used for the marker cluster and marker cluster styles
//markerCluster is the MarkerCluster object to clluster the cameras together. it is defined by the MarkerCluster Library.
//myCameraMarkers is an array that is used by the MarkerCluster class to cluster the cameras together. it is also used to hide the cameras overlay using the menu
//cctvClusterStyle are the styles array for the markercluster using my own icons for the cctv obejcts
var markerCluster;
var myCameraMarkers = new Array();
var cctvClusterStyle = [{
	url : "img/cctv/cluster/cctv_blue.png",
	height : 40,
	width : 40,
	anchor : [20, 0],
	textColor : "#000000",
	textSize : 14,
	fontFamily : "ubuntu",
	fontWeight : "normal"
}, {
	url : "img/cctv/cluster/cctv_yellow.png",
	height : 50,
	width : 50,
	anchor : [25, 0],
	textColor : "#000000",
	textSize : 14,
	fontFamily : "ubuntu",
	fontWeight : "normal",
}, {
	url : "img/cctv/cluster/cctv_red.png",
	height : 60,
	width : 60,
	anchor : [30, 0],
	textColor : "#444444",
	textSize : 14,
	fontFamily : "ubuntus",
	fontWeight : "normal"
}, {
	url : "img/cctv/cluster/cctv_pink.png",
	height : 70,
	width : 70,
	anchor : [35, 0],
	textColor : "#444444",
	textSize : 14,
	fontFamily : "ubuntu",
	fontWeight : "normal"
}, {
	url : "img/cctv/cluster/cctv_purple.png",
	height : 80,
	width : 80,
	anchor : [40, 0],
	textColor : "#444444",
	textSize : 22,
	fontFamily : "ubuntu",
	fontWeight : "normal"
}];

//we define an infowindow object to hold the camera image.
var cameraInfoWindow = new google.maps.InfoWindow();
//mimLocations is an array that will hold the markers where the mim locations are installed. it will also be used to show/hide the overlay using the menu
var mimReaderLocations;
var transcomReaderLocations;
//mimLinks is an array that will hold the traveltime links overlay objects once created on the map. we will also used these to hide them from the menu
var mimLinks;
var transcomLinks;
//linkToolTip is an InfoBox class object that will appear when the user mouseover the link. it is defined by the Infobox class library
var linkToolTip;
//object to use for the polyline directional arrow
var arrowSymbol;
//objects to the display the date and time on the page
var myTime;
var myDate;
//properties for the polylines
var defaultPolylineColorOptions = {
	strokeWeight : 3,
	strokeOpacity : 1
};
var onPolylineHoverColorOptions = {
	strokeWeight : 5,
	strokeOpacity : .80
};
//dataRefreshInterval_seconds is the amount of time that will pass before the timer resets and grabs new data for the links
//it used primaraly by the timer function and reset by it.
var dataRefreshInterval_seconds = 180;
//secondsToNextREfresh is a global var that will provide the amount of seconds to the next refresh.
//by default it is set to the number of dataREfreshInterval_seconds and it is updated by the timer function
var secondsToNextRefresh = dataRefreshInterval_seconds;
//event listener on the dom to load the map
google.maps.event.addDomListener(window, 'load', initialize);

/**
 *initialize if the listener mothod from the google maps event to run when the windows load.
 * it willstart the map and being downloading the data
 */
function initialize() {

	//initialize the main variable objects
	readerLocations = new Array();

	mimReaderLocations = new Array();
	transcomReaderLocations = new Array();
	mimLinks = new Array();
	transcomLinks = new Array();
	appTimer = new Timer();
	appTimer.Interval = 1000;
	cameraTimer = new Timer();
	cameraTimer.Interval = 2000;

	linkToolTip = new InfoBox({
		closeBoxURL : "",
		boxClass : "tooltip",
		disableAutoPan : true,
		maxWidth : 0,
		pixelOffset : new google.maps.Size(10, 10)

	});

	//create an arrow symbol for the polylines
	arrowSymbol = {
		path : google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
		scale : 2,
		strokeColor : '#444444',
		strokeWeight : 1,
		fillOpacity : 1,
		fillColor : '#444444'

	};

	//create a custom map style
	var customMapStyle = createMyMapStyle();
	var styledMap = new google.maps.StyledMapType(customMapStyle, {
		name : "tmc"
	});

	//create a set of options for the map to run
	var mapOptions = {
		center : new google.maps.LatLng(40.71462, -74.006600),
		zoom : 11,
		streetViewControl : true,
		streetViewControlOptions : {
			position : google.maps.ControlPosition.RIGHT_TOP
		},
		zoomControl : false,
		panControl : false,
		scaleControl : true,
		mapTypeControl : false,
		mapTypeControlOptions : {
			mapTypeIds : [google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID, "map_style"],
			style : google.maps.MapTypeControlStyle.DROPDOWN_MENU,
			position : google.maps.ControlPosition.TOP_LEFT
		}
	};

	//set the map
	map = new google.maps.Map(document.getElementById("mapCanvas"), mapOptions);
	map.mapTypes.set("map_style", styledMap);
	map.setMapTypeId("map_style");
	google.maps.event.addListenerOnce(map, "tilesloaded", ontilesloaded);

	//set the application time and data once
	myTime = moment().format("hh:mm:ss a");
	myDate = moment().format("dddd, MMMM DD");

	document.getElementById("timeDiv").innerHTML = myTime;
	document.getElementById("dateDiv").innerHTML = myDate;

	//here we add a set of custom map controls. The controls are stored in the 'myCustomControls.js' file
	var mOptions = {
		gmap : map,
		position : google.maps.ControlPosition.TOP_RIGHT,

	};

	var dOptions = {
		gmap : map,
		position : google.maps.ControlPosition.RIGHT_BOTTOM,
		message : 'The link colors are derived from the aggregation of the last 15 minutes of data<br>The last data update occurred on: '
	};
	var legendOptions = {
		gmap : map,
		legendTitle : 'Legend',
		position : google.maps.ControlPosition.RIGHT_BOTTOM

	};

	var myMenuControl = new myMapMenuCntrl(mOptions);
	var myMessageControl = new mapDesclaimer(dOptions);
	var myLegendControl = new mapLegend(legendOptions);

	//set the timer
	appTimer.Tick = mytick;
	appTimer.Enable = true;
	appTimer.Start();

}

/**
 *onTilesLoaded is the listener method that will run once all the map tiles are finished loading and the map
 * is ready to go. once the map is ready we call on the invokeServer method to begin downloading data
 */
function ontilesloaded() {
	//console.log('tiles loaded...so begin the loading of the weborb objects');
	//invoke weborb server
	invokeServer(true);
	//getMimLocations();
	getTranscomLocations();
	getTranscomPolylines();
	//getMimPolylines();
}

/**
 *invokeServer is the method that is called once the map tiles are loaded.
 * it is the main method that sets up the weborb proxy connection to the server to grab all data
 * proxy is defined as a global object in order to call it later in other methods.
 *
 * NOTE: the webORBURL will change depending on your server. when you go live into production, you must change the
 * URL to the address where you have weborb running. Also, all files for the applicatin must reside inside the root
 * of weborb in order for the application to work.
 */
function invokeServer(syncMode) {

	var className = "flowMapSolutions_dev.EzPassData";
	var webORBURL = "http://flowmap.nyctmc.org/weborb4/weborb.aspx";

	proxy = webORB.bind(className, webORBURL);

	proxy.getMidtownEzPassLocations(new Async(successReaderLocation, errorDownloadingData));
	proxy.getMidtownEzpassLinks(new Async(successMimPolylines, errorDownloadingData));
	proxy.getWebCameras(new Async(successGotCamera, errorDownloadingData));

}

function getMimLocations() {
	$.ajax({
		type : "GET",
		url : "data/mim_locations_info.json",
		async : true,
		dataType : "json",
		contentType : "application/json", // content type sent to server
		success : getMimLocations_sucess,
		error : ServiceFailed
	});
}
function getTranscomLocations() {
	$.ajax({
		type : "GET",
		url : "http://flowmap.nyctmc.org/flowmap_json_data_sources/transcom_locations_info.json",
		async : true,
		dataType : "json",
		contentType : "application/json", // content type sent to server
		success : getTranscomLocations_success,
		error : ServiceFailed
	});
}

function getTranscomPolylines() {
	$.ajax({
		type : "GET",
		url : "http://flowmap.nyctmc.org/flowmap_json_data_sources/transcom_polylines_info.json",
		async : true,
		dataType : "json",
		//data: '{"value": "' + 65+ '"}',
		contentType : "application/json", // content type sent to server
		success : getTranscomPolylines_success,
		error : ServiceFailed
	});
}

function getMimPolylines() {
	$.ajax({
		type : "GET",
		url : "data/mim_polylines_info.json",
		async : true,
		dataType : "json",
		//data: '{"value": "' + 65+ '"}',
		contentType : "application/json", // content type sent to server
		success : getMimPolylines_success,
		error : ServiceFailed
	});
}

function getTranscomLinkData() {
	$.ajax({
		type : "GET",
		url : "http://flowmap.nyctmc.org/flowmap_json_data_sources/transcom_link_data.json",
		async : true,
		dataType : "json",
		contentType : "application/json", // content type sent to server
		success : processTranscomLinkData_success,
		error : processTranscomLinkData_error
	});

}


function getMimLocations_sucess(results) {
	console.log("success got mim locations: " + results.RECORDS.length);
	if (results.RECORDS.length != 0 || results.RECORDS.length != null) {
		for (var i = 0; i < results.RECORDS.length; i++) {
			//console.log(results.RECORDS[i].lat+" "+results.RECORDS[i].lng);
			var readerMarker = new google.maps.Marker({
				position : new google.maps.LatLng(results.RECORDS[i].lat, results.RECORDS[i].lng),
				map : map,
				icon : {
					url : readerLocationIcon_good,
					size : new google.maps.Size(16, 16),
					origin : new google.maps.Point(0, 0),
					anchor : new google.maps.Point(8, 8)
				},
				title : results.RECORDS[i].location_name + " (location ID: " + results.RECORDS[i].lid + ")\ntotal number of readers at location: "+results.RECORDS[i].total_readers
			});

		}
		//document.getElementById("mimReaderLocationsNumber").innerHTML += " " + results.RECORDS.length;

	}
}

function getTranscomLocations_success(results) {
	console.log("success got mim locations: " + results.RECORDS.length);
	if (results.RECORDS.length != 0 || results.RECORDS.length != null) {
		for (var i = 0; i < results.RECORDS.length; i++) {
			//console.log(results.RECORDS[i].lat+" "+results.RECORDS[i].lng);
			var locationStatusIcon;
			if (results.RECORDS[i].userstatuscode == "4"){
				locationStatusIcon = readerLocationIcon_fail;
				
			}else{locationStatusIcon=readerLocationIcon_good;}
			var readerMarker = new google.maps.Marker({
				position : new google.maps.LatLng(results.RECORDS[i].latitude, results.RECORDS[i].longitude),
				map : map,
				icon : {
					url : locationStatusIcon,
					size : new google.maps.Size(16, 16),
					origin : new google.maps.Point(0, 0),
					anchor : new google.maps.Point(8, 8)
				},
				title : results.RECORDS[i].readername + "\norg: " + results.RECORDS[i].serverset + ")\nstatus code: "+results.RECORDS[i].userstatuscode
			});
			readerLocations.push(readerMarker);

		}
		//document.getElementById("readerLocationsNumber").innerHTML += " " + results.RECORDS.length;

	}
}



function getMimPolylines_success(results) {
	console.log("sucess getting mim polylines: " + results.RECORDS.length);
	if (results.RECORDS != null && results.RECORDS.length != 0) {
		for (var i = 0; i < results.RECORDS.length; i++) {
			var mypoly = new google.maps.Polyline({
				path : google.maps.geometry.encoding.decodePath(results.RECORDS[i].polyline),
				geodesic : true,
				strokeOpacity : 1,
				strokeWeight : 2,
			});

			mypoly.linkName = results.RECORDS[i].linkName;
			mypoly.sid = results.RECORDS[i].sid;
			mypoly.lid0 = results.RECORDS[i].lid0;
			mypoly.lid1 = results.RECORDS[i].lid1;
			mypoly.road_designation = results.RECORDS[i].road_designation;
			mypoly.borough = results.RECORDS[i].borough;
			mypoly.middlepoint = getMostMiddlePoint(google.maps.geometry.encoding.decodePath(results.RECORDS[i].polyline));
			mypoly.linkLength = google.maps.geometry.spherical.computeLength(mypoly.getPath()).toFixed(2);
			mypoly.medianTtSeconds = 0;
			mypoly.medianSpeedMph = 0;
			mypoly.medianTtString = 'undefined';
			mypoly.medianTtDatetime = new Date();
			mypoly.numberOfRecords = 0;
			mypoly.linkColor = "undefined";

			mypoly.setMap(map);

			//google.maps.event.addListener(mypoly, 'click', onPolylineMouseClick);
			google.maps.event.addListener(mypoly, 'mouseover', onMimPolylineMouseOver);
			google.maps.event.addListener(mypoly, 'mouseout', onPolylineMouseOut);
		}

		//after the polylines are drawn get the data for the first time
	} else {
		alert("no polylines found on server");
	}
}

function getTranscomPolylines_success(results) {
	//console.log("sucess getting transcom polylines: "+results.RECORDS.length);
	if (results.RECORDS != null && results.RECORDS.length != 0) {
		for (var i = 0; i < results.RECORDS.length; i++) {
			//console.log(results.RECORDS[i].xcomID);
			var mypoly = new google.maps.Polyline({
				path : google.maps.geometry.encoding.decodePath(results.RECORDS[i].polyline),
				geodesic : true,
				strokeOpacity : 1,
				strokeWeight : 2,
			});
			mypoly.id = results.RECORDS[i].ExternalId;
			mypoly.linkName = results.RECORDS[i].Name;
			mypoly.readersStatus = results.RECORDS[i].readersStatus;
			mypoly.speedMph = 0;
			mypoly.currTtSec = 0;
			mypoly.SystemStatus = "undefined";
			mypoly.NewMatchesInSamplePeriod = 0;
			mypoly.VehiclesInSample = 0;
			mypoly.ConfidenceLevel = 0;
			mypoly.FromSyntheticSegment = "undefined";
			mypoly.recordTimeStamp = "";
			mypoly.linkColor = "undefined";
			mypoly.linkLength = google.maps.geometry.spherical.computeLength(mypoly.getPath()).toFixed(2);

			transcomLinks.push(mypoly);
			mypoly.setMap(map);

			//google.maps.event.addListener(mypoly, 'click', onPolylineMouseClick);
			google.maps.event.addListener(mypoly, 'mouseover', onTranscomPolylineMouseOver);
			google.maps.event.addListener(mypoly, 'mouseout', onPolylineMouseOut);
		}
		//after the polylines are drawn get the data for the first time
		getTranscomLinkData();

	} else {
		alert("no polylines found on server");
	}

}


function processTranscomLinkData_success(results) {
	console.log("success getting transcom link data: " + results.RECORDS.length + " records obtained");
	for (var i = 0; i < results.RECORDS.length; i++) {
		var id = results.RECORDS[i].ExternalId;
		for (var j = 0; j < transcomLinks.length; j++) {
			if (id == transcomLinks[j].id) {
				//console.log(id+" = "+transcomLinks[j].id);
				transcomLinks[j].speedMph = results.RECORDS[i].speed_mph;
				transcomLinks[j].currTtSec = results.RECORDS[i].CurrentTravelTimeSeconds;
				transcomLinks[j].SystemStatus = results.RECORDS[i].SystemStatus;
				transcomLinks[j].VehiclesInSample = results.RECORDS[i].VehiclesInSample;
				transcomLinks[j].NewMatchesInSamplePeriod = results.RECORDS[i].NewMatchesInSamplePeriod;
				transcomLinks[j].ConfidenceLevel = results.RECORDS[i].ConfidenceLevel;
				transcomLinks[j].FromSyntheticSegment = results.RECORDS[i].FromSyntheticSegment;
				transcomLinks[j].recordTimeStamp = results.RECORDS[i].TimeStamp;
				
				//if (transcomLinks[j].readersStatus != "both failed") {
					transcomLinks[j].linkColor = transcomGetLinkColor(transcomLinks[j].VehiclesInSample, transcomLinks[j].speedMph, transcomLinks[j].SystemStatus, transcomLinks[j].FromSyntheticSegment,transcomLinks[j].ConfidenceLevel);
				//}//console.log(transcomLinks[j].icons[0].icon.fillColor);
transcomLinks[j].setOptions({
					strokeColor : transcomLinks[j].linkColor,

					icons : [{
						icon : {
							path : google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
							scale : 2,
							strokeColor:'#444',
							strokeWeight : .5,
							fillOpacity : 1,
							//fillColor :transcomLinks[j].linkColor
						},
						offset : '50%'
					}]
				}); 

				

			}

		}
	}
}


function transcomGetLinkColor(nRecords,speed,status,linkType,confidence)
{
	var c = 'undefined';
	if ((speed > 0) && (status=="Operational" || status=="Unknown" || status=="Warning")) {
		if (nRecords < 5) {
			c = '#4E7AC7';
			//blue
		} else if (speed > 45.0) {
			c = '#32CD32';
			//green
		} else if ((speed <= 45.0) && (speed > 30.0)) {
			c = '#FFDF00';
			//yellow
		} else if ((speed <= 30.0) && (speed > 15.0)) {
			c = '#ffa500';
			//orange
		} else if (speed <= 15.0) {
			c = '#CC3333';
			//red
		}

	} else {
		c = '#444444';

	}
	return c;
}
function processTranscomLinkData_error(e) {
	alert("could not get the transcom link data");
}

/**
 *
 * onPolyMouseOver is the listener method for the google maps mouseover event. it will create a tooltip and change the polyline
 * settings
 */
function onTranscomPolylineMouseOver(e) {
	var tooltipContent = "";
	this.setOptions(onPolylineHoverColorOptions);
	if (this.icons != null){
		this.icons[0].icon.scale = 3;
	}
		



	tooltipContent = "<span><b>" + this.linkName + "</b></span><hr>";
	tooltipContent += "<br>segment ID: " + this.id;
	tooltipContent += "<br>number of records: " + this.VehiclesInSample;
	tooltipContent += "<br>new matches in sample period: " + this.NewMatchesInSamplePeriod;
	tooltipContent += "<br>link readers status: " + this.readersStatus;
	tooltipContent += "<br>link status: " + this.SystemStatus;
	tooltipContent += "<br>approx. travel-time: " + this.currTtSec + " seconds";
	tooltipContent += "<br>approx. speed: " + this.speedMph+ "(MPH)";
	tooltipContent += "<br>record timestamp: " + this.recordTimeStamp;
	tooltipContent += "<br>segment length: " + this.linkLength + " meters (" + (this.linkLength * 3.2808).toFixed(2) + " ft)";
	tooltipContent += "<br>confidence level: " + this.ConfidenceLevel;
	tooltipContent += "<br>Synthetic Link: " + this.FromSyntheticSegment;


	linkToolTip.setContent(tooltipContent);
	//here e is the overlay object and whenever we hover over the overlay we can get the coords to use with our infobox tooltip
	linkToolTip.setPosition(e.latLng);
	linkToolTip.open(map);
}

function onMimPolylineMouseOver(e) {
	var tooltipContent = "";
	this.setOptions(onPolylineHoverColorOptions);
	tooltipContent = "<span><b>" + this.linkName + "</b></span><hr>number of records: " + this.numberOfRecords;
	tooltipContent += "<br>borough: "+this.borough;
	tooltipContent += "<br>road designation: "+this.road_designation;
	tooltipContent += "<br>approx. median travel-time: " + this.medianTtString;
	tooltipContent += "<br>approx. median speed (mph): " + this.medianSpeedMph;
	tooltipContent += "<br>median record timestamp: " + moment(this.medianTtDatetime).format("M-DD-YY h:mm:ss a");
	tooltipContent += "<br>segment length: " + this.linkLength + " meters (" + (this.linkLength * 3.2808).toFixed(2) + " ft)";
	tooltipContent += "<br>segment ID " + this.sid;
	tooltipContent += "<br>segment points: " + this.lid0 + " to " + this.lid1;

	linkToolTip.setContent(tooltipContent);
	//here e is the overlay object and whenever we hover over the overlay we can get the coords to use with our infobox tooltip
	linkToolTip.setPosition(e.latLng);
	linkToolTip.open(map);
}


/**
 * 
 * onPolyMouseOver is the listener method for the google maps mouseover event. it will create a tooltip and change the polyline
 * settings
 */
function onPolylineMouseOver(e)
{
	var tooltipContent = "";
	this.setOptions(onPolylineHoverColorOptions);
	if (this.linkColor != "undefined")
	{
		this.icons[0].icon.fillColor = this.linkColor;
	}

	tooltipContent = "<span>" + this.linkName + "</span><hr>number of records: " + this.numberOfRecords;
	tooltipContent += "<br>approx. median travel-time: " + this.medianTtString;
	tooltipContent += "<br>approx. median speed (mph): " + this.medianSpeedMph;
	tooltipContent += "<br>median record timestamp: " + moment(this.medianTtDatetime).format("M-DD-YY h:mm:ss a");
	tooltipContent += "<br>segment length: " + this.linkLength + " meters (" +(this.linkLength*3.2808).toFixed(2)+" ft)";
	tooltipContent += "<br>segment ID " + this.sid;
	tooltipContent += "<br>segment points: " + this.lid0 + " to " + this.lid1;

	linkToolTip.setContent(tooltipContent);
	//here e is the overlay object and whenever we hover over the overlay we can get the coords to use with our infobox tooltip
	linkToolTip.setPosition(e.latLng);
	linkToolTip.open(map);
}

/**
 * onPolylineMouseOut is a google maps event listener method that will run when the user
 * removes the mouse from the poyline. it will change the poyline options to default and clear the tooltip
 */

function onPolylineMouseOut(e) {
	this.setOptions(defaultPolylineColorOptions);
	if(this.icons != null){
		this.icons[0].icon.scale = 2;
	}
	
	linkToolTip.close();
}

function ServiceFailed() {
	alert("comething went wrong getting the transcom polylines");
}

/**
 *
 * mytick is the main timer for the application. It must be defined for the 'appTimer' object.
 * it will drive the time and date components and more importantly it drives the refresh interval of the link data.
 * the method is called each timer ticks (refreshes) according to the timer definition.
 *
 */
function mytick() {
	//console.log("from timer tick: "+new Date() + ", and current count: "+appTimer.currentCount);
	myTime = moment().format("hh:mm:ss A");
	myDate = moment().format("dddd, MMMM DD, YYYY");

	document.getElementById("timeDiv").innerHTML = myTime;
	document.getElementById("dateDiv").innerHTML = myDate;
	document.getElementById("timeLeft").innerHTML = "Seconds left until next refresh: " + (secondsToNextRefresh--);
	//console.log(myDate+" "+myTime+" timer current count: "+appTimer.currentCount);
	if (appTimer.currentCount == dataRefreshInterval_seconds) {
		//refresh the MIM data
		//console.log('refreshing data');
		proxy.getSegmentsMedianTravelTimes("00:15:00", new Async(travelTimeDataSuccess, travelTimeDataError));
		
		getTranscomLinkData();
		
		//reset the timer so the current count resets as well
		appTimer.Reset();
		document.getElementById("disclaimerDateTime").innerHTML = moment().format('MMMM Do YYYY, h:mm:ss a');
		secondsToNextRefresh = dataRefreshInterval_seconds;
	}

};
/**
 * createMyMapStyle returns the custom google maps stylers
 */
function createMyMapStyle() {

	var style = new Array();

	var style = [{
		"featureType" : "administrative",
		"elementType" : "all",
		"stylers" : [{
			"visibility" : "on"
		}, {
			"saturation" : -100
		}, {
			"lightness" : 20
		}]
	}, {
		"featureType" : "administrative.neighborhood",
		"elementType" : "labels.text",
		"stylers" : [{
			"visibility" : "off"
		}]
	}, {
		"featureType" : "landscape.man_made",
		"elementType" : "all",
		"stylers" : [{
			"visibility" : "off"
		}, {
			"saturation" : -60
		}, {
			"lightness" : 10
		}]
	}, {
		"featureType" : "landscape.natural",
		"elementType" : "all",
		"stylers" : [{
			"visibility" : "simplified"
		}, {
			"saturation" : -60
		}, {
			"lightness" : 60
		}]
	}, {
		"featureType" : "poi",
		"elementType" : "all",
		"stylers" : [{
			"visibility" : "off"
		}, {
			"saturation" : -100
		}, {
			"lightness" : 60
		}]
	}, {
		"featureType" : "road",
		"elementType" : "all",
		"stylers" : [{
			"visibility" : "on"
		}, {
			"saturation" : -100
		}, {
			"lightness" : 40
		}]
	}, {
		"featureType" : "transit",
		"elementType" : "all",
		"stylers" : [{
			"visibility" : "off"
		}, {
			"saturation" : -100
		}, {
			"lightness" : 60
		}]
	}, {
		"featureType" : "water",
		"elementType" : "all",
		"stylers" : [{
			"visibility" : "on"
		}, {
			"saturation" : -10
		}, {
			"lightness" : 30
		}]
	}];

	return style;
}

function successReaderLocation(results)
{
	if (results.length != 0 || results != null)
	{
		for (var i = 0; i < results.length; i++)
		{
			var readerLocation = createReaderMarker(results[i]);
			readerLocations.push(readerLocation);
		}
		//document.getElementById("readerLocationsNumber").innerHTML += " " + results.length;

	}
}


function createReaderMarker(readerLocationObj)
{
	var locationCoords = new google.maps.LatLng(readerLocationObj.lat, readerLocationObj.lng);
	var markerIcon =
	{
		url : readerLocationIcon,
		size : new google.maps.Size(16, 16),
		origin : new google.maps.Point(0, 0),
		anchor : new google.maps.Point(8, 8)
	};
	var readerMarker = new google.maps.Marker(
	{
		position : locationCoords,
		map : map,
		icon : markerIcon,
		title : readerLocationObj.name + " (location ID: " + readerLocationObj.lid + ")"
	});

	return readerMarker;
}

//---------------------------------------------------------------------------------------polyline link functions-------------------------------------------------------//
/**
 *
 * successMimPolylines 
 */
function successMimPolylines(results)
{
	if (results != null && results.length != 0)
	{
		for (var i = 0; i < results.length; i++)
		{
			var polyline = createExistingPolyline(results[i]);
			polyline.setMap(map);
			mimLinks.push(polyline);
		}

		//document.getElementById("linkNumber").innerHTML += " " + results.length;
		results = [];

		//after the polylines are drawn get the data for the first time
		proxy.getSegmentsMedianTravelTimes("00:15:00", new Async(travelTimeDataSuccess, travelTimeDataError));
	}
	else
	{
		alert("no polylines found on server");
	}
}

function createExistingPolyline(linkInfo)
{
	var polyPath = google.maps.geometry.encoding.decodePath(linkInfo.polylineString);
	//create an arrow path object to add to the polyline
	var arrowSymbol =
	{
		path : google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
		scale : 2,
		strokeColor : '#444444',
		strokeWeight : 1,
		fillOpacity : 1,
		fillColor : '#444444'
		
	};
	var mypoly = new google.maps.Polyline(
	{
		path : polyPath,
		geodesic : true,
		//strokeColor : '#444444',
		strokeOpacity : 1,
		strokeWeight : 2,
		icons : [
		{
			icon : arrowSymbol,
			offset : '50%'
		}],
	});

	mypoly.linkName = linkInfo.linkName;
	mypoly.sid = linkInfo.linkSid;
	mypoly.lid0 = linkInfo.lid0;
	mypoly.lid1 = linkInfo.lid1;
	mypoly.middlepoint = getMostMiddlePoint(polyPath);
	mypoly.linkLength = google.maps.geometry.spherical.computeLength(mypoly.getPath()).toFixed(2);
	mypoly.medianTtSeconds = 0;
	mypoly.medianSpeedMph = 0;
	mypoly.medianTtString = 'undefined';
	mypoly.medianTtDatetime = new Date();
	mypoly.numberOfRecords = 0;
	mypoly.linkColor = "undefined";

	google.maps.event.addListener(mypoly, 'click', onPolylineMouseClick);
	google.maps.event.addListener(mypoly, 'mouseover', onPolylineMouseOver);
	google.maps.event.addListener(mypoly, 'mouseout', onPolylineMouseOut);

	return mypoly;
}


//---------------------------------------------------------------------------------------polyline link functions-------------------------------------------------------//

/**
 *
 * errorDownloadingData is a generic listener method on the Async object calling the server for data.
 *
 */
function errorDownloadingData(error) {
	showDialog("Error downloading Data from Server", "There was an error downloading data from the server. Check the stack below.<br>" + error.message);
}

/**
 * onPolylineMouseClick is a google maps event listener method that will run when a polyline is clicked
 * it will execute the showChart method which will open up the chart object div
 *
 */
function onPolylineMouseClick(e) {
	//this is the actual polyline object
	showChart(this);
}

/**
 * this method will obtain the middle point of the polyline path array in order to display the infowindow at this location
 * @param {Array} an Array containing the polyline path
 */
function getMostMiddlePoint(arr) {
	var middle = arr[Math.floor((arr.length - 1) / 2)];
	var middle2 = google.maps.geometry.spherical.interpolate(arr[0], arr[arr.length - 1], .5);
	return middle;
}

/**
 *
 * getMimData() is the method that is going to be called to get the real-time travel time data from the server
 * it will call the weborb proxy to get the data using the weborb method "getSegmentMedianTravelTimes".
 * this method will be called at certain time intervals based on the appTimer tick function
 *
 */
function travelTimeDataSuccess(results) {
	try {
		//console.log("success downloading new travel time data - " + moment().format("MM-DD-YY HH:mm:ss"));
		if (results.length != 0 || results != null) {
			var mimData = results;

			for (var i = 0; i < mimData.length; i++) {
				for (var j = 0; j < mimLinks.length; j++) {
					if (mimData[i].derivedSegmentId == mimLinks[j].sid) {
						//here i append properties to the object in order for me to used them later
						mimLinks[j].numberOfRecords = mimData[i].numberOfRecords;
						mimLinks[j].medianTtSeconds = mimData[i].medianTravelTime_seconds;
						mimLinks[j].medianTtString = mimData[i].medianTravelTime_string;
						mimLinks[j].medianTtDatetime = mimData[i].medianTravelTimeDate;
						mimLinks[j].medianSpeedMph = ((mimLinks[j].linkLength / mimData[i].medianTravelTime_seconds) * METERSPERSEC_MILESPERHOUR_FACTOR).toFixed(2);

						mimLinks[j].linkColor = getColor(mimLinks[j].sid, mimLinks[j].medianTtSeconds, mimLinks[j].medianSpeedMph, mimLinks[j].numberOfRecords);
						mimLinks[j].setOptions({
							strokeColor : mimLinks[j].linkColor
							//strokeColor: getColor(mimLinks[j].sid, mimLinks[j].medianTtSeconds, mimLinks[j].medianSpeedMph, mimLinks[j].numberOfRecords)
						});
						mimLinks[j].icons[0].icon.fillColor = mimLinks[j].linkColor;
						mimLinks[j].icons[0].icon.strokeColor = mimLinks[j].linkColor;

						//console.log(mimLinks[j].linkName+"--"+mimLinks[j].medianSpeedMph+" (mph) - "+mimLinks[j].linkColor);

					}
				}
			}
			//console.log("success parsing new travel time data - " + moment().format("MM-DD-YY HH:mm:ss"));
			mimData = [];
		}
	} catch(error) {
		showDialog("Error Parsing Travel Time Data", "There was an eror parsing the live travel time data received from the server. Wait for next refresh cycle to correct the problem.");
	}
}

function travelTimeDataError(error) {
	showDialog("Error Downloading Live Travel Time Data", "There was a problem downloading live data from the server. Wait for the next refresh cycle to correct the problem.");
}

/**
 *
 * getColor is the main method that will decide the color of the polyline link.
 * it will choose the type of link (highwya, street, mim) and run a second method
 * based on this to get the color. we will need the link id(linksid) the travel time
 * the speed and the number of records in order for this function to run
 *
 * @param {string} linkSid
 * @param {number} travelTime
 * @param {number} speed
 * @param {number} nRecords
 */
function getColor(linkSid, travelTime, speed, nRecords) {
	var linkColor = 'undefined';
	if (travelTime <= 0) {
		linkColor = '#444444';
		//linkColor = '#FFDF00';
	} else {
		//decide what type of color system to use using the segmentID property.
		switch (linkSid.toString()) {

		/*
		 *
		 * The segments below are local streets outside of Midtown. if the segment is a local street not MIM then use the MUTCD local street speed system
		 *
		 */
		case '11771':
		case '11772':
		case '71101':
		case '10171':
		case '72117':
		case '71117':
		case '8788':
		case '8887':
		case '8889':
		case '8988':
		case '8990':
		case '9089':
		case '9091':
		case '9190':
		case '9192':
		case '9291':
		case '6563':
		case '6364':
		case '6374':
		case '7071':
		case '7170':
		case '7073':
		case '7370':
		case '123124':
		case '7462':
		case '6274':
		case '7466':
		case '6674':
		case '6667':
		case '8466':
		case '66128':
		case '124123':
		case '124125':
		case '125124':
		case '62126':
		case '12662':
		case '125127':
		case '127125':
		case '127121':
		case '121127':
		case '121126':
		case '126121':
		case '12868':
		case '7463':
		case '6768':
		case '9394':
		case '9498':
		case '9493':
		case '9894':
		case '10098':
		case '98100':
		case '111112':
		case '112111':
		case '111113':
		case '113111':
		case '11393':
		case '93113':
		case '100115':
		case '115100':
		case '131129':
		case '129131':
		case '129130':
		case '130129':
		case '6663':
		case '6366':
		case '114115':
		case '115114':
		case '8687':
		case '8786':
		case '9596':
		case '9695':
		case '9697':
		case '9986':
		case '8699':
		case '9796':
		case '9799':
		case '9997':
		case '133134':
		case '134133':
		case '134122':
		case '122134':
		case '122135':
		case '135122':
		case '135120':
		case '120135':
		case '130139':
		case '139130':
		case '140120':
		case '120140':
		case '140144':
		case '144140':
		case '14492':
		case '92144':
		case '12662':
		case '62126':
		case '126145':
		case '145126':
		case '146139':
		case '139146':
		case '121146':
		case '146121':
		case '150147':
		case '147150':
		case '150148':
		case '148150':
		case '148151':
		case '151148':

		//flushing links
		case '158157':
		case '157158':
		case '157159':
		case '159157':
		case '160157':
		case '157160':
		case '160159':
		case '183160':
		case '160183':
		case '161162':
		case '164163':
		case '163164':
		case '164165':
		case '165164':
		case '165158':
		case '158165':
		case '177178':
		case '178177':
		case '157177':
		case '177157':
		case '177176':
		case '176177':
		case '176175':
		case '175176':
		case '162175':
		case '179159':
		case '159179':
		case '162179':
		case '179162':
		case '183161':
		case '161183':
		// end of flushing links

		//links for woodhaven to/from dry harbor
		case '17095':
		case '95170':

		//links on beach channel dr and seagirt
		case '182154':
		case '154182':
		case '154181':
		case '181154':
		case '181156':
		case '156181':
		case '180155':
		case '155180':
			linkColor = applyLocalStreetColorSystem(speed, nRecords);
			break;

		/*
		 *
		 * the links below are highway type links. use the highway color system to assign a color
		 *
		 */
		case '2426':
		case '2829':
		case '3527':
		case '2535':
		case '3425':
		case '2734':
		case '3428':
		case '2634':
		case '3324':
		case '3536':
		case '29150':

		//jackie robinson links
		case '168167':
		case '167168':
		case '166167':
		case '167166':
		case '169166':
		case '166169':

		//henry hudson pkwy / west side hwy links
		case '17131':
		case '30171':
		case '171172':
		case '172171':
		case '173172':
		case '172173':
		case '173174':
		case '174173':
			linkColor = applyHighwaysColorSystem(speed, nRecords);
			break;

		/*
		 *
		 * as default, if the segment is not a local street or a highway, then use the MIM color scheme to assign the color to the link
		 *
		 */
		default:
			linkColor = applyMidtownInMotionColorSystem(speed, travelTime, nRecords);
			break;

		}
	}

	return linkColor;

};

/**
 *
 * applyLocalStreetColorSystem -
 * this function changes the color of the link based on the MUTCD local street color designations
 *
 * @param {number} speed
 * @param {number} nRecords
 *
 * */
function applyLocalStreetColorSystem(speed, nRecords) {
	var c = 'undefined';
	if (speed >= 0) {
		if (nRecords < 5) {
			//blue
			c = '#4E7AC7';
		} else if (speed > 13) {
			//green
			c = '#32CD32';
		} else if ((speed <= 13) && (speed > 9)) {
			c = '#FFDF00';
			//yellow
		} else if ((speed <= 9) && (speed > 7)) {
			//orange
			c = '#ffa500';
		} else if (speed <= 7) {
			//red
			c = '#CC3333';
		}
	} else {
		c = '#444444';

	}

	return c;
}

/**
 *
 * applyHighwayColorSystem is the method that will be used to change the color of the link in case the link
 * is a  highway type street. we use the speed and the number of records to check the color
 *
 * @param {number} speed
 * @param {number} nRecords
 */

function applyHighwaysColorSystem(speed, nRecords) {
	var c = 'undefined';
	if (speed > 0) {
		if (nRecords < 5) {

			c = '#4E7AC7';
			//blue
		} else if (speed > 45.0) {
			c = '#32CD32';
			//green
		} else if ((speed <= 45.0) && (speed > 30.0)) {
			c = '#FFDF00';
			//yellow
		} else if ((speed <= 30.0) && (speed > 15.0)) {
			c = '#ffa500';
			//orange
		} else if (speed <= 15.0) {
			c = '#CC3333';
			//red
		}

	} else {
		c = '#444444';

	}
	return c;
}

/**
 *
 *
 */
function applyMidtownInMotionColorSystem(speed, travelTime, nRecords) {
	var c = 'undefined';
	if (speed > 0) {
		if (nRecords < 5) {
			c = '#4E7AC7';
			//blue
		} else if (0 < travelTime && travelTime <= 180) {
			c = '#32CD32';
			//green
		} else if (180 < travelTime && travelTime <= 270) {
			c = '#FFDF00';
			//yellow
		} else if (270 < travelTime && travelTime <= 360) {
			c = '#ffa500';
			//orange
		} else if (360 < travelTime) {
			c = '#ff0000';
			//red
		}

	} else {
		c = '#444444';

	}
	return c;
}

//----------------------------------------- end of polyline link functions-------------------------------------------------------//
/**
 *
 *
 */
function successGotCamera(response) {
	//this array will be used for the markercluster

	for (var i = 0; i < response.length; i++) {
		var item = response[i];

		//this is a temp hack while debugging. these lines MUST be deleted before going to production
		if (item._owner != "mta") {
			item._url = "http://207.251.86.237/cctv" + item._camNumber + ".jpg";
		}

		//we create a marker object to push into the markercluster array only is the visible property is set to 1 or true
		if (item._visible == 1) {
			var marker = makeCameraMarker(item);
		}

		//push the marker into the array
		myCameraMarkers.push(marker);
	}

	//create a new amrker manager object to set on the map and control the many markers
	//i comment this out since i dont want to show the cameras when the map loads, but the array
	//with the camera objects is still filled, so if the user wants to see the cameras they would select
	//them from the menu

	/*
	 markerCluster = new MarkerClusterer(map, myCameraMarkers,
	 {
	 styles : cctvClusterStyle
	 });
	 */

}

/**
 *
 * makeCameraMarker makes the google map marker for the camera object that will be displayed on the map.
 * cam is a camera object that is passed from the calling function. it holds all the camera
 * information neccessary to make the camera marker
 * @param {object} cam
 *
 * @return {google.maps.Marker} a google map Marker object with included event listener for onclick events.
 */
function makeCameraMarker(cam) {
	var camName = cam._name;
	var camUrl = cam._url;
	var camPosition = new google.maps.LatLng(cam._lat, cam._lon);
	var camStatus = 1;
	var camIcon;
	//get the logos
	switch(cam._owner) {
	case "MTA":
		var logo = logo_mta;
		break;
	case "nycdot":
		var logo = logo_nyc;
		break;
	case "nysdot":
		var logo = logo_nys;
		break;
	default:
		var logo = null;
	}

	google.maps.event.addDomListener(cameraInfoWindow, 'domready', modifyInfoWindowCss);
	//the line below was originally used to listen for the closeclick from the infowindow close btn. since i created
	//my own close button i dont need to listen for a close anymore. you can delete it if you want
	//google.maps.event.addListener(cameraInfoWindow, 'closeclick', stopCameraInfoWindow);

	//set the icon based on the status. i defaulted to status 1 for now to show all cameras and don't bother to change the icon.
	//for production you need to use this var to set the correct icon
	if (camStatus == 1) {
		var img = {
			url : cctv_good,
			size : new google.maps.Size(20, 20),
			origin : new google.maps.Point(0, 0),
			anchor : new google.maps.Point(0, 0)
		};
	} else {
		var img = {
			url : cctv_fail,
			size : new google.maps.Size(20, 20),
			origin : new google.maps.Point(0, 0),
			anchor : new google.maps.Point(0, 0)
		};
	}

	camIcon = img;
	//create the marker and set the options object
	var camMarker = new google.maps.Marker({
		position : camPosition,
		icon : camIcon,
		title : camName
	});

	google.maps.event.addListener(camMarker, 'click', function() {
		var iwContents = CameraIW(camName, camUrl, logo, camPosition);
		var timerErrorCount = 0;
		stopCameraInfoWindow();
		cameraInfoWindow.setContent(iwContents);

		cameraInfoWindow.open(map, this);

		cameraTimer.Tick = function() {

			//jquery line to refresh the image url with a new date object to bust the cache
			$('#myImg').error(function() {
				timerErrorCount++;
				console.log("error loading image");
				console.log("timer error count: " + timerErrorCount);
				if (cameraTimer.Enable && timerErrorCount >= 10) {
					console.log("timer error count: " + timerErrorCount);
					cameraTimer.Stop();
					cameraTimer.Enable = false;
					console.log('no good image src in over 10 refresh cycles; the timer has stopped');
				}
			}).attr('src', camUrl + '?d=' + cameraTimer.currentCount);

			//this is a trace to the console...it can be commented out when going to production.
			//console.log("timer-tick for camera image:" + cameraTimer.currentCount + " for url: " + camUrl);
		};
		cameraTimer.Start();

	});
	return camMarker;
}

//this is to modify the infowindow css once it's created. the main stylesheet handles the dimensioning of the window, this handles
//modifying the infowindow once the image is loaded
function modifyInfoWindowCss() {
	var c = document.querySelector(".gm-style-iw");

	//these lines change the right and width css elements of the infowindow so that the close button "floats" on top of the content added to the window
	c.style.setProperty("right", c.style.left, "important");
	c.style.setProperty("margin", "0 auto");
	c.style.setProperty("padding-left", "0");
	c.style.setProperty("padding-right", "0");

	//the lines below affect the infowindow close button. you can use this path in the DOM to change other css
	//c.nextElementSibling.style.setProperty("position", "absolute");
	c.nextElementSibling.style.setProperty('display', 'none', 'important');
	//c.nextElementSibling.style.setProperty('top', '30');
	//this value moves the clsoe button up and down
	//c.nextElementSibling.style.setProperty('right', '0');
	//this value moves the close button left and right.
	//c.nextElementSibling.style.setProperty('border', '1px dotted red');

	//the lines below affect the infowindow class itself. you can use this path in the dom to change other css
	//c.parentNode.style.setProperty('border','2px dotted black');

}

/**
 *
 */
function stopCameraInfoWindow() {
	//console.log("camera infowindow closed\ntimer stopped");

	if (cameraTimer.Enable) {
		cameraTimer.Stop();
		cameraTimer.Enable = false;
		cameraInfoWindow.close();
	}

}

/**
 * the showChart function will 'pop up' the overlay div which is hidden intially through css. once a call to this function is made, the
 * modal pop up will show. The important things to rememeber are the css for the overlay div and to put it at the end of your document
 * after the </html> tag.
 */
function showChart(link) {
	//console.log('showing chart');
	var el = document.getElementById("overlay");
	var oc = document.getElementById("overlayContent");
	var closeButton = document.getElementById("closeBtn");
	var chartPopUp = new PolylineInfoWindowControl(link);

	el.style.visibility = "visible";
	el.style.opacity = 1;

	//this is needed for IE9+ since opacity property doest work, instead ie uses filter
	el.style.filter = 'alpha(opacity=100)';
	oc.appendChild(chartPopUp);
}

/**
 * the closeChart function is bound to the close button element onclick event. it will clear the modal chart from the screen
 * please note that you must define the actual chart element and it's parent to delete it from the stage
 */
function closeChartIw() {
	var el = document.getElementById("overlay");
	//this is the actual overlay node that will dissapear
	var chartDiv = document.getElementById("chartWrapper");
	//chart2 is the id of the node that holds the chart. it should be in the DOM before we clear the overlay from the screen.
	chartDiv.parentNode.removeChild(chartDiv);
	//we call the parent of the chart node to remove the child.

	el.style.opacity = 0;
	//we set the opacity back to zero to reset the transition effect
	el.style.filter = 'alpha(opacity=0)';
	el.style.visibility = "hidden";
	//we clear the overlay from the screeen

	//chartData and chart are object for the amchart in the mycustomcontrols lib
	chartData = [];
	chart.clear();
	clearInterval(refreshLiveDataTimer);
}

