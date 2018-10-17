var exec = require('child_process').exec;

// Create shutdown function
function shutdown(callback){
    exec('shutdown now', function(error, stdout, stderr){ callback(stdout); });
}

var rxCount = 0; 
var Gpio = require('onoff').Gpio;
var led = new Gpio(17,'out'); // rasp pin11

const SerialPort = require('serialport');
const port = new SerialPort('/dev/ttyAMA0',{
   baudRate: 9600
});

port.on('open',function(err){
   if(err) return console.log('Error on write : '+ err.message);
   console.log('serial open');
});

port.on('error', function(err) {
    console.log('Error: ', err.message);
    console.log('Error Occured');
});

const eventEmitter = require('events');
class MyEmitter extends eventEmitter{};
const myEmitter = new MyEmitter();

var express      = require('express');
var path         = require('path');
var favicon      = require('serve-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var cons         = require('consolidate');

var routes    = require('./routes/index');
var users     = require('./routes/users');
var receiver  = require('./lib/receiver');
var debug     = require('debug')('ploty:server');
var portAddr  = process.env.PORT || '4445';

//--- create express application
var app = express();
app.set('port', portAddr);

//--- create server
var server = require('http').Server(app);

//--- connect socket.io to server
var io = require('socket.io')(server);

//--- view engine setup
app.engine('html',cons.swig);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

var count = 0; 

//--- start server
console.log('http on : ' + portAddr.toString());
server.listen(portAddr);

//--- socket.io support
const WAIT_TX_MSEC = 10;
	
io.on('connection', function (socket) {

	var host  = socket.client.request.headers.host;
	console.log('connected to : ' + host);

	socket.on('disconnect', function () {
	  	console.log('disconnected from : ' + host);
  	});

	socket.on('readSensor',function(msg){

		console.log('Read Sensor command ='+msg);

		var command = 'E0';
		var ID_ADDR = '\x51';
		var send = 1;

		if(msg==1){
			ID_ADDR = '\x51';
		}else if ( msg == 2 ){
			ID_ADDR = '\x61';
		}else if ( msg == 3 ){
			ID_ADDR = '\x71';
		} else {
			send = 0;
		}
		
		if ( send == 1 ){
			led.writeSync(1);
			var txd = '\x02'+ID_ADDR+ command + '\x03';
		
			console.log('txd : ' + txd);
			port.write(txd);

	   	setTimeout(function(){
  		   	led.writeSync(0);
  			},WAIT_TX_MSEC);
		}

	});

  myEmitter.on('uartRxd',function(poo){
      socket.emit('rs485',poo);
   });    
});

port.on('data',function (data){

	rxCount = ( rxCount < 99998 ) ? rxCount = rxCount+1 : rxCount ++;
	//console.log( 'RXD = ' + rxCount + ' : '+ data);
  	
	var buff = new Buffer(data,'utf8');
  	console.log('received data = ' + buff.toString());
	// var buff = new Buffer(data);

	if( buff[0] == 0x02 ) { 

		//var sensValue = parseInt(buff.slice(3,7));
		var sensValue = buff.toString('utf8',3,7);
		var packet = {ch:0,data:'0'};
	
		packet.ch=buff[1];
		packet.data = sensValue;

		console.log(packet);

		myEmitter.emit('uartRxd', packet);
	}
});

function sleepFor( sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ /* do nothing */ } 
}

var exec = require('child_process').exec;

process.on('SIGTERM', function () {
    process.exit(0);
});

process.on('SIGINT', function () {
    process.exit(0);
});
 
process.on('exit', function () {
    console.log('\nShutting down, performing GPIO cleanup');
    process.exit(0);
});
//--- end of scope
