var Pgpio = require('pigpio').Gpio;
var led = new Pgpio(21, { mode: Pgpio.OUTPUT });

const MICROSECDONDS_PER_CM = 1e6/34321;

var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://192.168.1.199');  //This can be change to your mosquitt Server IP

var intervalID=null;
var bright;
const trigger = new Pgpio(23, {mode: Pgpio.OUTPUT});
const echo = new Pgpio(24, {mode: Pgpio.INPUT, alert: true});

trigger.digitalWrite(0); 

const watchHCSR04 = () => {
    let startTick;
    let result;
    echo.on('alert', (level, tick) => {
    if (level == 1) {
        startTick = tick;
    } else {
        const endTick = tick;
        const diff = (endTick >> 0) - (startTick >> 0); 
        if((diff / 2 / MICROSECDONDS_PER_CM) >1)
        {
        result=(diff / 2 / MICROSECDONDS_PER_CM);
        }
        bright=(100-Math.round(result)).toString();
        if(result < 100 & result > 1)
        {
        led.pwmWrite(bright);
        }
        else
        {
            led.digitalWrite('0');
        }
    }
});
}

watchHCSR04();

var status='0';
var auto='0';
var brightness;

client.on('connect', function () {
    client.subscribe('status', function (err) {
        if (!err) {
            console.log('connected');
            client.subscribe('on');
            client.subscribe('auto');
            client.subscribe('brightness');
        }
        else {
            console.log(err);
        }
    });

    client.on('message',function(topic,message){
        switch(topic.toString())
        {
            case 'on':status=message.toString();break;
            case 'brightness':brightness=message.toString();break;
            case 'auto':auto=message.toString();break;
        }
        console.log(auto);
        if(auto != '1')
        {
                clearInterval(intervalID);

                if(status == 1 && brightness >0)
                {
                    led.pwmWrite(brightness);        
                }
                else if (status == 1 || status == 0)
                {
                    led.digitalWrite(status);
                }

        }
        else
        {
            intervalID=setInterval(() => {
                trigger.trigger(10, 1);       
              },5);
        }
    })
});


function sendStatus() {
    client.publish('onStatus', status);
    client.publish('brightnessStatus',brightness);
    client.publish('autoStatus',auto);
}
setInterval(() => {
    sendStatus();
  },5);

