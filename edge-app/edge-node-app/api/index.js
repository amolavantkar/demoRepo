// import required libraries
const express = require('express');
const redis = require('redis');
var cors = require('cors')
var bodyParser = require('body-parser')
const webpush = require('web-push');
var apn = require('apn');

var path = require('path');


pfx = path.join(__dirname, '../certs/apns.p8');
console.log("pfx", pfx);

// create Redis client
// const redisClient = redis.createClient({
//   host: "redis-13669.c252.ap-southeast-1-1.ec2.cloud.redislabs.com",
//   port: 13669,
//   password: "g6ZvR5rVwzDshnaY9dkeOnq9dV9ftyNd"
// });
var redisClient = redis.createClient({
  host: "10.0.0.69",
  port: 6379
});


// var publisher = redis.createClient({
//   host: "redis-13669.c252.ap-southeast-1-1.ec2.cloud.redislabs.com",
//   port: 13669,
//   password: "g6ZvR5rVwzDshnaY9dkeOnq9dV9ftyNd"
// });
// var subscriber = redis.createClient({
//   host: "redis-13669.c252.ap-southeast-1-1.ec2.cloud.redislabs.com",
//   port: 13669,
//   password: "g6ZvR5rVwzDshnaY9dkeOnq9dV9ftyNd"
// });
var subscriber = redis.createClient({
  host: "10.0.0.69",
  port: 6379
});

const publicVapidKey = 'BLn2OAIzZn2_iEwuDuBsblIUCzmCXzKapr4DFnPTj_J7U7g0LVd5Gxon9i-ox-1ueaQ6XDfTK4sDk72OXZimAF4';
const privateVapidKey = 'CicJ3CWEkewyI8_z-GG0PEuV4WciZpzleueJDnTzMZk';

// create express app
const app = express();
// app.use(cors())
app.use(cors({
  origin: '*'
}));

// app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

webpush.setVapidDetails('mailto:mercymeave@section.com', publicVapidKey, privateVapidKey);

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const { error } = require('console');
const io = new Server(server, {
  cors: {
    origin: "http://0.0.0.0:3000"
  }
});

// io.use(cors({
//   origin: '*'
// }));'

var options = {
  token: {
    key: pfx,
    keyId: "WAS66V7XGL",
    teamId: "THP5EV5EJ9"
  },
  production: false
};



let deviceToken = "07c624deb7b5d61338561334c9bd00a46d4614974f9d0427d211e4e72563a77f";

subscriber.on('subscribe', function (channel, count) {
  console.log(`Subscribed to ${channel}.`);
});

subscriber.on('message', function (chan, msg) {
  // if (typeof msg == 'object') {
    var jsonParse = JSON.parse(msg);
    var apnProvider = new apn.Provider(options);

    var note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
    note.badge = 0;
    note.sound = "default";
    note.title = "Issue Detected";
    note.body = jsonParse.description;
    note.payload = {
      "id":jsonParse.id
      // ,
      // "img":jsonParse.img
    };
    note.topic = "com.accenture.proj.flurry";

    console.log("note")
    console.log(note)

    // const notification = new apn.Notification({
    //   alert: 'Hello from ChatGPT!',
    //   payload: {
    //     message: 'This is a custom message from ChatGPT',
    //     sender: 'ChatGPT'
    //   }
    // });


    apnProvider.send(note, deviceToken).then((result) => {
      // see documentation for an explanation of result
      console.log("sent")
    }).catch((error) => {
      console.log(error)
    });
  // }



});

// subscriber.on('reditMsgEvent', function (chan, msg) {
//  console.log(`Received message on ${chan}: ${msg}`);

// });


subscriber.subscribe('edgeApp');



io.on('connection', (socket) => {
  // console.log(`A client with ID ${socket.id} has connected`);


  socket.on('operations', (data) => {
    // console.log(`Received message from client with ID ${socket.id}: ${data}`);
    redisClient.get('operations', (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error fetching data from Redis');
      } else {

        // res.send(result);
        // const resultFilter = result
        // if(result){
        //   const par
        // }
        io.emit('operations', result);
      }
    });

  });


});



// define operations to fetch data
app.get('/operations', (req, res) => {
  // io.emit('LeaderData', "LeaderData");
  redisClient.unsubscribe();
  redisClient.get('operations', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data from Redis');
    } else {

      res.send(result);
    }
  });
});

// fetch an image related to the operations IDs
app.get('/operations/:id', (req, res) => {
  const id = req.params.id;
  const alertKey = `alert_${id}`;
  // io.emit('LeaderData', "LeaderData");
  redisClient.unsubscribe();
  redisClient.get(alertKey, (err, result) => {
    if (err) {
      console.error(`Error fetching data for key ${alertKey}: ${err}`);
      res.status(500).json({ error: 'Internal server error' });
      return;
    } 
    
    if (!result) {
      res.status(404).json({ error: `No alert found with ID ${id}` });
      return;
    }

    res.send(result);
  });
});

// define endpoint to fetch data
app.post('/acknowledged', (req, res) => {
  // io.emit('LeaderData', "LeaderData");
  // console.log("res.body",req.body);

  redisClient.get('operations', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data from Redis');
    } else {

      const parseJson = JSON.parse(result);
      const filterData = [...parseJson?.data];
      if (req.body && req.body.id) {
        const userIndex = parseJson?.data.findIndex((e) => e.ack.toLowerCase() == 'no' && e.id == req.body.id);
        if (userIndex == -1) {
          res.send({ status: "error", msg: "record not found" });
        } else {
          const userdata = { ...filterData[userIndex] };
          // console.log('userdata',userdata)
          const updatedUserData = { ...userdata, ack: "Yes" }

          filterData.splice(userIndex, 1);
          filterData.splice(userIndex, 0, updatedUserData);
          // console.log("updatedUserData",filterData)
          redisClient.set('operations', JSON.stringify({ data: filterData }), (err, result) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error saving data from Redis');
            } else {
              // console.log("result", result)
              io.emit('operations', JSON.stringify({ data: filterData }));
              res.send({ status: "success",  data: filterData  });
            }
          });
        }

      } else {
        res.send({ status: "error", msg: "record not found" });
      }


      // console.log("filterData",filterData)
      // setNoficationData(filterData)
      // console.log("result",result);
      // io.emit('operations', result);
    }
  });

});



// define endpoint to fetch data
app.get('/leaderboard', (req, res) => {
  // io.emit('LeaderData', "LeaderData");
  redisClient.unsubscribe();
  redisClient.get('leaderboard', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data from Redis');
    } else {

      res.send(result);
    }
  });


});


app.get('/drivethru', (req, res) => {
  // perform Redis operation to fetch data
  redisClient.get('drivethru', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data from Redis');
    } else {
      // console.log("result", result)
      res.send(result);
    }
  });


});

app.get('/instore', (req, res) => {
  // perform Redis operation to fetch data
  redisClient.get('instore', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data from Redis');
    } else {
      // console.log("result", result)
      res.send(result);
    }
  });


});


app.get('/readImag', (req, res) => {
  // perform Redis operation to fetch data
  redisClient.get('test_byteimage_as_json_string', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching data from Redis');
    } else {
      if (result) {
        const parseJoson = JSON.parse(result);
        console.log("result", parseJoson)
        res.send('data:image/jpg;base64,' + parseJoson.image_data);
      }

    }
  });


});

app.post('/notifications/subscribe', (req, res) => {
  //get push subscription object from the request
  const subscription = req.body.subscription;
  const data = req.body.data;
  // console.log("subscription",subscription)
  const pushSubscription = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/dwRyXQQ3NdE:APA91bEMZw-NhMGYiZpR4j1ESK1r2HSGLDmpYA6lY1aJSbzbiuv06p5Bj1PaX8KYxQP-9dVGUOlP5_KVuctzWD5Ik0-vXt9FyR5XUTrSZ2B98o63SpDe9AxVtHkMKO8VqSSpBtPG_8EX",
    "expirationTime": null,
    "keys": {
      "p256dh": "BLarxVgNQx8LFhtroxNwEXIzb2DzDRAs3XJ0n1XqLoVInFxV0qt3wI58O85dNTpiuEVfFYLJgMP-GG5hWn27v_Y",
      "auth": "n_tbIt0eGrWsw2Z6XcKb4Q"
    }
  };

  //send status 201 for the request
  res.status(201).json({})
  console.log("subscription", subscription)
  //create paylod: specified the detals of the push notification
  const payload = JSON.stringify({ title: 'Section.io Push Notification' });

  //pass the object into sendNotification fucntion and catch any error
  webpush.sendNotification(subscription, payload).then((resc) => console.log("resc", payload)).catch(err => console.error(err));
})


// start server
// const httpserver = app.listen(5000);
io.on('connection', (socket) => {
  console.log('a user connected');
});

server.listen(8080, () => {
  console.log('listening on *:8080');
});
// io.listen(8080, () => {
//   console.log('listening on *:8080');
// });


