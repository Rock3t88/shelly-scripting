let CONFIG = {
    name: 'Bulb',
    device_ip: '192.168.0.7',
    switch_mode_timeout: 10,
    steps: 10,
    steps_temp: 150,
    steps_color: 25,
    blink_time: 1000,
    min_temp: 3000,
    max_temp: 6500,
    min_color: 0,
    max_color: 255,
    min_brightness: 1,
    max_brightness: 100,
    min_gain: 1,
    max_gain: 100,
};

let MODES = {
    _default: 'default',
    temp: 'temp',
    rgb: 'rgb',
};

let COLOR_MODES = {
    white: 'white',
    color: 'color'
};

let COLORS = {
    white: 'white',
    red: 'red',
    green: 'green',
    blue: 'blue',
};

let DIRECTIONS = {
    up: 'up',
    down: 'down'
};

let EVENTS = {
    double_push: 'double_push',
    single_push: 'single_push',
    long_push: 'long_push'
};

let SETTINGS = {
    brightness: 'brightness',
    temp: 'temp',
    gain: 'gain',
    turn: 'turn',
    mode: 'mode',
    red: 'red',
    green: 'green',
    blue: 'blue'
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
};

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
};

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
        isOn: null,
        switchMode: null,
        brightness: null,
        gain: null,
        temp: null,
        redColor: null,
        greenColor: null,
        blueColor: null,
        colorMode: null,
        currentColorChange: null,
        event: null,
        timer: null,
        timerRunning: null,
        timeEllapsed: null,
    },

    init: function () {

        if (this.state.timerRunning === true) {
            this.stopTimer();
        }

        this.state.isOn = null;
        this.state.switchMode = MODES._default;
        this.state.brightness = 0;
        this.state.gain = 0;
        this.state.temp = 0;
        this.state.redColor = 0;
        this.state.greenColor = 0;
        this.state.blueColor = 0;
        this.state.colorMode = 'undefined';
        this.state.currentColorChange = 'undefined';
        this.state.event = 'undefined';
        this.state.timeEllapsed = 0;
        this.state.timer = null;
        this.state.timerRunning = false;
    },

    run: function (callback, event, device) {

        Shelly.call("http.get",
            {
                url: this.url.light
            },
            function (response, error_code, error_message, o) {

                let config = JSON.parse(response.body);

                o.obj.state.isOn = config.ison;
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

        if (this.state.colorMode === COLOR_MODES.white) {
            this.state.colorMode = COLOR_MODES.color;

            if (this.state.switchMode === MODES.temp) {
                this.changeMode(MODES.rgb);
            }
        }
        else {
            this.state.colorMode = COLOR_MODES.white;

            if (this.state.switchMode === MODES.rgb) {
                this.changeMode(MODES.temp);
            }
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

            if (device.state.timeEllapsed >= CONFIG.switch_mode_timeout) {

                if (device.state.switchMode !== MODES._default) {
                    device.changeMode(MODES._default);
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

    changeMode: function (mode) {

        if (typeof(mode) !== 'undefined' || this.state.switchMode === MODES._default) {
            if (mode === MODES.temp || this.state.colorMode === COLOR_MODES.white) {

                if (this.state.colorMode !== COLOR_MODES.white) {
                    this.changeColorMode();
                }
                this.state.switchMode = MODES.temp;
                this.blink('temp', CONFIG.blink_time);
            }
            else {

                if (this.state.colorMode !== COLOR_MODES.color) {
                    this.changeColorMode();
                }

                this.state.switchMode = MODES.rgb;
                this.state.currentColorChange = COLORS.red;
                this.blink(COLORS.red, CONFIG.blink_time);
            }

            this.startTimer();
        }
        else {
            this.state.switchMode = MODES._default;
            this.state.currentColorChange = 'undefined';

            if (this.state.colorMode === COLOR_MODES.white) {
                this.blink('temp', CONFIG.blink_time);
            }
            else {
                this.blink(COLORS.green, CONFIG.blink_time);
            }

            this.stopTimer();
        }

        print('switch mode changed to: ' + this.state.switchMode);
        return this.state.switchMode;
    },

    switchColorChange: function () {

        this.resetTimer();

        if (this.state.currentColorChange === COLORS.red) {

            this.state.currentColorChange = COLORS.green;
            this.blink(COLORS.green, CONFIG.blink_time);
        }
        else if (this.state.currentColorChange === COLORS.green) {

            this.state.currentColorChange = COLORS.blue;
            this.blink(COLORS.blue, CONFIG.blink_time);
        }
        else if (this.state.currentColorChange = COLORS.blue) {
            this.state.currentColorChange = COLORS.red;
            this.blink(COLORS.red, CONFIG.blink_time);
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

        if (setting === SETTINGS.brightness) {
            value = this.state.brightness;
            url = this.url.brightness;
            steps = CONFIG.steps;
            min = CONFIG.min_brightness;
            max = CONFIG.max_brightness;
        }
        else if (setting === SETTINGS.gain) {
            value = this.state.gain;
            url = this.url.gain;
            steps = CONFIG.steps;
            min = CONFIG.min_gain;
            max = CONFIG.max_gain;
        }
        else if (setting === SETTINGS.temp) {
            value = this.state.temp;
            url = this.url.temp;
            steps = CONFIG.steps_temp;
            min = CONFIG.min_temp;
            max = CONFIG.max_temp;
        }
        else if (setting === SETTINGS.red) {
            value = this.state.redColor;
            url = this.url.redColor;
            steps = CONFIG.steps_color;
            min = CONFIG.min_color;
            max = CONFIG.max_color;
        }
        else if (setting === SETTINGS.green) {
            value = this.state.greenColor;
            url = this.url.greenColor;
            steps = CONFIG.steps_color;
            min = CONFIG.min_color;
            max = CONFIG.max_color;
        }
        else if (setting === SETTINGS.blue) {
            value = this.state.blueColor;
            url = this.url.blueColor;
            steps = CONFIG.steps_color;
            min = CONFIG.min_color;
            max = CONFIG.max_color;
        }

        let newValue = value;

        if (direction === DIRECTIONS.up) {
            newValue = this.increaseValue(value, steps, max);
        }
        else {
            newValue = this.decreaseValue(value, steps, min);
        }
        setState(url, newValue);

        return newValue;
    },

    setBrightness: function (direction) {

        if (this.state.colorMode === COLOR_MODES.white) {
            this.state.brightness = this.changeState(SETTINGS.brightness, direction);
        }
        else {
            this.state.gain = this.changeState(SETTINGS.gain, direction);
        }
    },

    setTemperature: function (direction) {
        this.state.temp = this.changeState(SETTINGS.temp, direction);
    },

    setRed: function (direction) {
        this.state.redColor = this.changeState(SETTINGS.red, direction);
    },

    setGreen: function (direction) {
        this.state.greenColor = this.changeState(SETTINGS.green, direction);
    },

    setBlue: function (direction) {
        this.state.blueColor = this.changeState(SETTINGS.blue, direction);
    },

    toggle: function () { setStates({'turn': 'toggle'}) },

    setRgb: function (direction) {

        if (this.state.currentColorChange === COLORS.red) {
            this.state.redColor = this.changeState(SETTINGS.red, direction);
        }
        else if (this.state.currentColorChange === COLORS.green) {
            this.state.greenColor = this.changeState(SETTINGS.green, direction);
        }
        else if (this.state.currentColorChange === COLORS.blue) {
            this.state.blueColor = this.changeState(SETTINGS.blue, direction);
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

        if (color === COLORS.red) {
            setStates({
                mode: COLOR_MODES.color,
                red: 255,
                green: 0,
                blue: 0,
            });
        }
        else if (color === COLORS.green) {
            setStates({
                mode: COLOR_MODES.color,
                red: 0,
                green: 255,
                blue: 0,
            });
        }
        else if (color === COLORS.blue) {
            setStates({
                mode: COLOR_MODES.color,
                red: 0,
                green: 0,
                blue: 255,
            });
        }
        else if (color === 'temp') {
            if (this.state.temp >= 5100) {
                setStates({
                    mode: COLOR_MODES.white,
                    temp: CONFIG.min_temp
                });
            }
            else {
                setStates({
                    mode: COLOR_MODES.white,
                    temp: CONFIG.max_temp
                });
            }
        }

        sleep(milliseconds, function (udState) {

            if (udState.color === 'temp') {

                setStates({
                    temp: udState.lastStateTemp,
                });
            }
            else {

                setStates({
                    red: udState.lastStateRed,
                    green: udState.lastStateGreen,
                    blue: udState.lastStateBlue,
                });
            }
        }, state);
    }
};

let _device = Object.create(protoDevice);
_device.init();

Shelly.addEventHandler(
    function (event, device) {

        if (event.info.event !== EVENTS.single_push &&
            event.info.event !== EVENTS.double_push &&
            event.info.event !== EVENTS.long_push) {
            return true;
        }

        device.event = event;
        device.run(function (device) {

            if (device.state.isOn !== true) {

                device.toggle();
                return true;
            }

            let event = device.event.info.event;

            if (event === EVENTS.long_push) {
                device.changeMode();
                return true;
            }

            //print(event);

            if (device.event.info.id === 0) {
                if (device.state.switchMode === MODES.rgb) {

                    device.setRgb(DIRECTIONS.down);

                    if (event === EVENTS.double_push) {
                        device.setRgb(DIRECTIONS.down);
                    }
                }
                else if (device.state.switchMode === MODES.temp) {

                    device.setTemperature(DIRECTIONS.down);

                    if (event === EVENTS.double_push) {
                        device.setTemperature(DIRECTIONS.down);
                    }
                }
                else {

                    device.setBrightness(DIRECTIONS.down);

                    if (event === EVENTS.double_push) {
                        device.setBrightness(DIRECTIONS.down);
                    }
                }
            }
            else if (device.event.info.id === 1) {

                if (device.state.switchMode === MODES.rgb) {

                    device.setRgb(DIRECTIONS.up);

                    if (event === EVENTS.double_push) {
                        device.setRgb(DIRECTIONS.up);
                    }
                }
                else if (device.state.switchMode === MODES.temp) {

                    device.setTemperature(DIRECTIONS.up);

                    if (event === EVENTS.double_push) {
                        device.setTemperature(DIRECTIONS.up);
                    }
                }
                else {

                    device.setBrightness(DIRECTIONS.up);

                    if (event === EVENTS.double_push) {
                        device.setBrightness(DIRECTIONS.up);
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
                else if (device.state.switchMode === MODES._default) {

                    device.changeColorMode();
                }
            }
            return true;
        }, device);

    }, _device);
