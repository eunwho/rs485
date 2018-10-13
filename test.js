var rxCount = 0; 
var Gpio = require('onoff').Gpio;
var led = new Gpio(17,'out'); // rasp pin11

var TX_EN=0;

led.writeSync(0);

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

port.on('data', function (data) {
  console.log('RXD %d : %s', rxCount++, data);
})

setInterval(function(){

	led.writeSync(1);

   port.write('\x02'+'B000'+'\x03');
	setTimeout(function(){
		led.writeSync(0);
	},10);

},1000);
