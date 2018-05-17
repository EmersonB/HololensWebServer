
var express = require('express');
var path = require('path')
var bodyParser = require('body-parser');
var firebase = require("firebase");
var request = require("request");

const https = require("https");

var router = express.Router();
var app = express();

const gm_api_key = "AIzaSyDKxDdzzYAtOJDb-rgiJIRJy-w-Fcr1wOM";


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded())

// parse application/json
app.use(bodyParser.json())

app.use(express.static(__dirname + '/'));
app.use('/api', router);




// app.set('port', process.env.PORT || 8080);
// var listener = app.listen(app.get('port'), function() {
//   console.log( listener.address().port );
// });

app.listen(3000, () => console.log('Server running on port 3000'))

firebase.initializeApp({
  databaseURL: "https://senior-research-9bc05.firebaseio.com",
  service_account: "service.json"
})

var db = firebase.database();
var ref = db.ref("ids");

//Not needed??

app.post("/", function (req, res) {
  console.log(req.body) // populated!
  res.send(200, req.body);
});

app.get('/', function(req, res) {
  res.sendFile(__dirname+'/index.html');
});

router.route('/ids')
  .get(function(req,res){
    ref.once("value", function(snapshot) {
      console.log(snapshot.val());
      res.json(snapshot.val());
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
  });

router.route('/:device_id/route')
  .get(function(req,res){
    ref.child(req.params.device_id).child("route").once("value", function(snapshot) {
      console.log(snapshot.val());
      res.json(snapshot.val());
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
  })
  .post(function(req,res){
    console.log(req.body);
    var usersRef = ref.child(req.params.device_id).child("route");
    usersRef.set({
      start_lat: req.body.start.lat,
      start_long: req.body.start.long,
      end_lat: req.body.end.lat,
      end_long: req.body.end.long
    });
    res.send("success");
  })
  .put(function(req, res){

  })
  .delete(function(req,res){
    // var usersRef = ref.child(req.params.name);
    // usersRef.set(null);
  });

  router.route('/:device_id/location')
    .get(function(req,res){
      ref.child(req.params.device_id).child("location").once("value", function(snapshot) {
        console.log(snapshot.val());
        res.json(snapshot.val());
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      });
    })
    .post(function(req,res){
      console.log(req.body) // populated!
      var usersRef = ref.child(req.params.device_id).child("location");
      if(req.body == {}){
        res.error("no body");
      }
      usersRef.set({
          lat: req.body.lat,
          long: req.body.long
      });
      res.send(200, "Success");
    })
    .put(function(req, res){

    })
    .delete(function(req,res){
      // var usersRef = ref.child(req.params.name);
      // usersRef.set(null);
    });

    router.route('/:device_id/instructions')
      .get(function(req,res){
        ref.child(req.params.device_id).once("value", function(snapshot) {
          var current_lat = snapshot.val().location.lat;
          var current_long = snapshot.val().location.long;
          var end_lat = snapshot.val().route.end_lat;
          var end_long = snapshot.val().route.end_long;

          var origin = {"lat": current_lat, "long": current_long}
          var destination = {"lat": end_lat, "long": end_long}


          const url = construct_url(origin.lat, origin.long, destination.lat, destination.long);
          console.log(url);
          request(url, { json: true }, (err, response, body) => {
            if (err) { return console.log(err); }
            var next = body.routes[0].legs[0].steps[0].html_instructions;
            next = replaceAll(next,"<b>", "");
            next = replaceAll(next,"</b>", "");
            next = toTitleCase(next);
            res.send(next);
          });

          // https.get(url, response => {
          //   response.setEncoding("utf8");
          //   response.on("data", data => {
          //     console.log('hello' + data);
          //   });
          // });

          // res.json(snapshot.val());
          // const url = construct_url(origin, destination);
          // https.get(url, response => {
          //   response.setEncoding("utf8");
          //   response.on("data", data => {
          //     console.log(data)
          //   });
          // });
        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });
      })


  function google_maps_info(origin, destination){
    const url = construct_url(origin.lat, origin.long, destination.lat, destination.long);
    https.get(url, response => {
      response.setEncoding("utf8");
      response.on("data", data => {
        console.log(data)
      });
    });
  }

  function reverse_geo_location(lat, long){
    const url = "https://maps.googleapis.com/maps/api/geocode/json?latlng="+lat+","+long+"&key"+gm_api_key;
    https.get(url, response => {
      response.setEncoding("utf8");
      response.on("data", data => {
        console.log(data)
      });
    });
  }

  function construct_url(origin_lat, origin_long, destination_lat, destination_long){
      return "https://maps.googleapis.com/maps/api/directions/json?mode=driving&origin="+origin_lat+","+origin_long+"&destination="+destination_lat+","+destination_long+"&key="+gm_api_key;
  }

  function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}
