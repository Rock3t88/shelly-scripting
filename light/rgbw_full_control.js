let CONFIG = {
    name: 'Bulb',
    device_ip: '192.168.0.7',
    steps: 10,
    steps_temp: 150,
    steps_color: 25,
    blink_time: 1000,
};

let MODES = {
    _default: 'default',
    temperature: 'temperature',
    rgb: 'rgb',
};

let baseUrl = 'http://' + CONFIG.device_ip + '';
let lightUrl = '' + baseUrl + '/light/0';
let brightnessUrl = '' + lightUrl + '?brightness=';
let tempUrl = '' + lightUrl + '?temp=';
let gainUrl = '' + lightUrl + '?gain=';
let toggleUrl = '' + lightUrl + '?turn=toggle';
let colorModeUrl = '' + lightUrl + '?mode=';
let redColorUrl = '' + lightUrl + '?red=';
let greenColorUrl = '' + lightUrl + '?green=';
let blueColorUrl = '' + lightUrl + '?blue=';

function setStates(settings) {

    let url = lightUrl + '?';

    for (let setting in settings) {

        let value = settings[setting];

        if (typeof (value) !== 'string') {
            url = url + setting + '=' + JSON.stringify(value) + '&';
        }
        else {
            url = url + setting + '=' + value + '&';
        }
    }

    url = url.slice(0, -1);
    print(url);

    Shelly.call("http.get",
        {
            url: url
        },
        null,
        null);
}

function setState(url, value) {

    if (value !== null) {
        if (typeof (value) !== 'string') {
            value = JSON.stringify(value);
        }
        url = url + '' + value + '';
    }

    print(url);

    Shelly.call("http.get",
        {
            url: url
        },
        null,
        null);
};

function sleep(milliseconds, callback, state) {

    return Timer.set(milliseconds, false, callback, state);
}

let protoDevice = {
    name: CONFIG.name,
    ip: CONFIG.ip,

    url: {
        baseUrl: baseUrl,
        mode: colorModeUrl,
        light: lightUrl,
        brightness: brightnessUrl,
        temp: tempUrl,
        gain: gainUrl,
        toggle: toggleUrl,
        colorMode: colorModeUrl,
        redColor: redColorUrl,
        greenColor: greenColorUrl,
        blueColor: blueColorUrl,
    },

    state: {
        switchMode: '',
        brightness: 0,
        gain: 0,
        temp: 0,
        redColor: 0,
        greenColor: 0,
        blueColor: 0,
        colorMode: '',
        currentColorChange: '',
        event: '',
        timer: null,
        timerRunning: false,
        timeEllapsed: 0,
    },

    init: function () {
        this.state.switchMode = 'default';
        this.state.brightness = 0;
        this.state.gain = 0;
        this.state.temp = 3000;
        this.state.redColor = 100;
        this.state.greenColor = 100;
        this.state.blueColor = 100;
        this.state.colorMode = 'undefined';
        this.state.currentColorChange = 'undefined';
        this.state.event = 'undefined';
        this.state.timeEllapsed = 0;
        this.state.timer = null;
        this.state.timerRunning = false;
    },

    getState: function (callback, event, device) {

        Shelly.call("http.get",
            {
                url: this.url.light
            },
            function (response, error_code, error_message, o) {

                let config = JSON.parse(response.body);

                o.obj.state.colorMode = config.mode;
                o.obj.state.brightness = config.brightness;
                o.obj.state.gain = config.gain;
                o.obj.state.temp = config.temp;
                o.obj.state.redColor = config.red;
                o.obj.state.greenColor = config.green;
                o.obj.state.blueColor = config.blue;

                o.callback(o.event, o.device);
            },
            { obj: this, callback: callback, event: event, device: device });
    },

    changeColorMode: function () {

        if (this.state.colorMode === 'white') {
            this.state.colorMode = 'color';
        }
        else {
            this.state.colorMode = 'white';
        }

        setStates({ 'mode': this.state.colorMode });

        return this.state.colorMode;
    },

    startTimer: function () {

        if (this.state.timerRunning === true)
            return;

        this.state.timerRunning = true;
        this.state.timer = Timer.set(1000, true, function (device) {

            device.state.timeEllapsed += 1;
            print('Time ellapsed: ', device.state.timeEllapsed);

            if (device.state.timeEllapsed === 10) {

                if (device.state.switchMode !== MODES._default) {
                    print('switch mode');
                    device.changeMode();
                }

                device.stopTimer();
            }

        }, this);
    },

    stopTimer: function () {

        if (this.state.timerRunning === true) {

            Timer.clear(this.state.timer);
            this.state.timerRunning = false;
            this.resetTimer();
        }
    },

    resetTimer: function () {
        this.state.timeEllapsed = 0;
    },

    changeMode: function () {

        if (this.state.switchMode === MODES._default) {
            if (this.state.colorMode === 'white') {

                if (this.state.colorMode !== 'white') {
                    this.changeColorMode();
                }
                this.state.switchMode = MODES.temperature;
                this.blink('temp', CONFIG.blink_time);
            }
            else {

                if (this.state.colorMode !== 'color') {
                    this.changeColorMode();
                }

                this.state.switchMode = MODES.rgb;
                this.state.currentColorChange = 'red';
                this.blink('red', CONFIG.blink_time);
            }

            this.startTimer();
        }
        else {
            this.state.switchMode = MODES._default;
            this.state.currentColorChange = 'undefined';

            if (this.state.colorMode === 'white') {
                this.blink('temp', CONFIG.blink_time);
            }
            else {
                this.blink('green', CONFIG.blink_time);
            }

            this.stopTimer();
        }

        print('switch mode changed to: ' + this.state.switchMode);
        return this.state.switchMode;
    },
    switchColorChange: function () {

        this.resetTimer();

        if (this.state.currentColorChange === 'red') {

            this.state.currentColorChange = 'green';
            this.blink('green', CONFIG.blink_time);
            return true;
        }
        else if (this.state.currentColorChange === 'green') {

            this.state.currentColorChange = 'blue';
            this.blink('blue', CONFIG.blink_time);
            return true;
        }
        else if (this.state.currentColorChange = 'blue') {
            this.state.currentColorChange = 'red';
            this.blink('red', CONFIG.blink_time);
            return true;
        }
    },

    changeState: function (setting, direction) {

        this.resetTimer();
        print('changeState: ' + setting + ' ' + direction);

        let value = 1;
        let url = '';
        let steps = CONFIG.steps;
        let min = 1;
        let max = 100;

        if (setting === 'brightness') {
            value = this.state.brightness;
            url = this.url.brightness;
            steps = CONFIG.steps;
            min = 1;
            max = 100;
        }
        else if (setting === 'gain') {
            value = this.state.gain;
            url = this.url.gain;
            steps = CONFIG.steps;
            min = 1;
            max = 100;
        }
        else if (setting === 'temperature') {
            value = this.state.temp;
            url = this.url.temp;
            steps = CONFIG.steps_temp;
            min = 3000;
            max = 6400;
        }
        else if (setting === 'redColor') {
            value = this.state.redColor;
            url = this.url.redColor;
            steps = CONFIG.steps_color;
            min = 1;
            max = 255;
        }
        else if (setting === 'greenColor') {
            value = this.state.greenColor;
            url = this.url.greenColor;
            steps = CONFIG.steps_color;
            min = 1;
            max = 255;
        }
        else if (setting === 'blueColor') {
            value = this.state.blueColor;
            url = this.url.blueColor;
            steps = CONFIG.steps_color;
            min = 1;
            max = 255;
        }

        let newValue = value;

        if (direction === 'up') {
            newValue = this.increaseValue(value, steps, max);
        }
        else {
            newValue = this.decreaseValue(value, steps, min);
        }
        setState(url, newValue);

        return newValue;
    },

    setBrightness: function (direction) {

        if (this.state.colorMode === 'white') {
            this.state.brightness = this.changeState('brightness', direction);
        }
        else {
            this.state.gain = this.changeState('gain', direction);
        }
    },

    setTemperature: function (direction) {
        this.state.temp = this.changeState('temperature', direction);
    },

    setRed: function (direction) {
        this.state.redColor = this.changeState('redColor', direction);
    },

    setGreen: function (direction) {
        this.state.greenColor = this.changeState('greenColor', direction);
    },

    setBlue: function (direction) {
        this.state.blueColor = this.changeState('blueColor', direction);
    },

    toggle: function () { setStates({'turn': 'toggle'}) },

    setRgb: function (direction) {

        print(this.state.currentColorChange);

        if (this.state.currentColorChange === 'red') {
            this.state.redColor = this.changeState('redColor', direction);
        }
        else if (this.state.currentColorChange === 'green') {
            this.state.greenColor = this.changeState('greenColor', direction);
        }
        else if (this.state.currentColorChange === 'blue') {
            this.state.blueColor = this.changeState('blueColor', direction);
        }
    },
    increaseValue: function (value, steps, max) {

        value = value + steps;

        if (value > max)
            value = max;

        return value;
    },
    decreaseValue: function (value, steps, min) {
        value = value - steps;

        if (value < min)
            value = min;

        return value;
    },
    blink: function (color, milliseconds) {

        let state = {
            color: color,
            lastStateRed: this.state.redColor,
            lastStateGreen: this.state.greenColor,
            lastStateBlue: this.state.blueColor,
            lastStateTemp: this.state.temp,
        };

        if (color === 'red') {
            setStates({
                'mode': 'color',
                'red': 255,
                'green': 0,
                'blue': 0,
            });
        }
        else if (color === 'green') {
            setStates({
                'mode': 'color',
                'red': 0,
                'green': 255,
                'blue': 0,
            });
        }
        else if (color === 'blue') {
            setStates({
                'mode': 'color',
                'red': 0,
                'green': 0,
                'blue': 255,
            });
        }
        else if (color === 'temp') {
            if (this.state.temp >= 5100) {
                setStates({
                    'mode': 'white',
                    'temp': 3000
                });
            }
            else {
                setStates({
                    'mode': 'white',
                    'temp': 6400
                });
            }
        }

        sleep(milliseconds, function (udState) {

            if (udState.color === 'temp') {

                setStates({
                    'temp': udState.lastStateTemp,
                });
            }
            else {

                setStates({
                    'red': udState.lastStateRed,
                    'green': udState.lastStateGreen,
                    'blue': udState.lastStateBlue,
                });
            }
        }, state);
    }
};

let _device = Object.create(protoDevice);
_device.init();

Shelly.addEventHandler(
    function (event, device) {

        if (event.info.event !== 'single_push' &&
            event.info.event !== 'double_push' &&
            event.info.event !== 'long_push') {
            return true;
        }

        device.event = event;
        device.getState(function (device) {

            let event = device.event.info.event;

            if (event === 'long_push') {
                device.changeMode();
                return true;
            }

            print(event);

            if (device.event.info.id === 0) {
                if (device.state.switchMode === MODES.rgb) {

                    device.setRgb('down');

                    if (event === 'double_push') {
                        device.setRgb('down');
                    }
                }
                else if (device.state.switchMode === MODES.temperature) {

                    device.setTemperature('down');

                    if (event === 'double_push') {
                        device.setTemperature('down');
                    }
                }
                else {

                    device.setBrightness('down');

                    if (event === 'double_push') {
                        device.setBrightness('down');
                    }
                }
            }
            else if (device.event.info.id === 1) {

                if (device.state.switchMode === MODES.rgb) {

                    device.setRgb('up');

                    if (event === 'double_push') {
                        device.setRgb('up');
                    }
                }
                else if (device.state.switchMode === MODES.temperature) {

                    device.setTemperature('up');

                    if (event === 'double_push') {
                        device.setTemperature('up');
                    }
                }
                else {

                    device.setBrightness('up');

                    if (event === 'double_push') {
                        device.setBrightness('up');
                    }
                }
            }
            else if (device.event.info.id === 2) {

                device.toggle();
                device.init();
            }
            else if (device.event.info.id === 3) {

                if (device.state.switchMode === MODES.rgb) {

                    device.switchColorChange();
                }
                else {

                    device.changeColorMode();
                }
            }
            return true;
        }, device);

    }, _device);
