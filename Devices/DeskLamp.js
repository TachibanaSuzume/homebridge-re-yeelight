require('./Base');

const inherits = require('util').inherits;
const miio = require('miio');

var Accessory, PlatformAccessory, Service, Characteristic, UUIDGen;
DeskLamp = function(platform, config) {
    this.init(platform, config);
    
    Accessory = platform.Accessory;
    PlatformAccessory = platform.PlatformAccessory;
    Service = platform.Service;
    Characteristic = platform.Characteristic;
    UUIDGen = platform.UUIDGen;
    
    this.device = new miio.Device({
        address: this.config['ip'],
        token: this.config['token']
    });
    
    this.accessories = {};
    if(this.config['Name'] && this.config['Name'] != "") {
        this.accessories['LightAccessory'] = new DeskLampService(this);
    }
    var accessoriesArr = this.obj2array(this.accessories);
    
    this.platform.log.debug("[ReYeelight][DEBUG]Initializing " + this.config["type"] + " device: " + this.config["ip"] + ", accessories size: " + accessoriesArr.length);
    
    
    return accessoriesArr;
}
inherits(DeskLamp, Base);

DeskLampService = function(dThis) {
    this.device = dThis.device;
    this.name = dThis.config['Name'];
    this.token = dThis.config['token'];
    this.platform = dThis.platform;
    this.updatetimere = dThis.config["updatetimer"];
    this.interval = dThis.config["interval"];
    if(this.interval == null){
        this.interval = 3;
    }
    this.Lampservice = false;
    this.timer;
    if(this.updatetimere === true){
        this.updateTimer();
    }
}

DeskLampService.prototype.getServices = function() {
    var that = this;
    var services = [];
    var tokensan = this.token.substring(this.token.length-8);
    var infoService = new Service.AccessoryInformation();
    infoService
        .setCharacteristic(Characteristic.Manufacturer, "YeeLight")
        .setCharacteristic(Characteristic.Model, "DeskLamp")
        .setCharacteristic(Characteristic.SerialNumber, tokensan);
    services.push(infoService);
    
    var DeskLampServices = this.Lampservice = new Service.Lightbulb(this.name, "DeskLamp");
    var DeskLampOnCharacteristic = DeskLampServices.getCharacteristic(Characteristic.On);
    DeskLampServices
        .addCharacteristic(Characteristic.ColorTemperature)
        .setProps({
            minValue: 50,
            maxValue: 400,
            minStep: 1
        });
    DeskLampOnCharacteristic
        .on('get', function(callback) {
            this.device.call("get_prop", ["power"]).then(result => {
                that.platform.log.debug("[ReYeelight][DEBUG]DeskLamp - getPower: " + result);
                callback(null, result[0] === 'on' ? true : false);
            }).catch(function(err) {
                that.platform.log.error("[ReYeelight][ERROR]DeskLamp - getPower Error: " + err);
                callback(err);
            });
        }.bind(this))
        .on('set', function(value, callback) {
            that.device.call("set_power", [value ? "on" : "off"]).then(result => {
                that.platform.log.debug("[ReYeelight][DEBUG]DeskLamp - setPower Result: " + result);
                if(result[0] === "ok") {
                    callback(null);
                } else {
                    callback(new Error(result[0]));
                }
            }).catch(function(err) {
                that.platform.log.error("[ReYeelight][ERROR]DeskLamp - setPower Error: " + err);
                callback(err);
            });
        }.bind(this));
    DeskLampServices
        .addCharacteristic(Characteristic.Brightness)
        .on('get', function(callback) {
            this.device.call("get_prop", ["bright"]).then(result => {
                that.platform.log.debug("[ReYeelight][DEBUG]DeskLamp - getBrightness: " + result);
                callback(null, result[0]);
            }).catch(function(err) {
                that.platform.log.error("[ReYeelight][ERROR]DeskLamp - getBrightness Error: " + err);
                callback(err);
            });
        }.bind(this))
        .on('set', function(value, callback) {
            if(value > 0) {
                this.device.call("set_bright", [value]).then(result => {
                    that.platform.log.debug("[ReYeelight][DEBUG]DeskLamp - setBrightness Result: " + result);
                    if(result[0] === "ok") {
                        callback(null);
                    } else {
                        callback(new Error(result[0]));
                    }
                }).catch(function(err) {
                    that.platform.log.error("[ReYeelight][ERROR]DeskLamp - setBrightness Error: " + err);
                    callback(err);
                });
            } else {
                callback(null);
            }
        }.bind(this));
    DeskLampServices
        .getCharacteristic(Characteristic.ColorTemperature)
        .on('get', function(callback) {
            this.device.call("get_prop", ["ct"]).then(result => {
                ct = result[0] - 2700;
                ct = ct / 3800 * 100;
                ct = 100 - ct;
                that.platform.log.debug("[ReYeelight][DEBUG]DeskLamp - getColorTemperature: " + ct + "%");
                callback(null, ct);
            }).catch(function(err) {
                that.platform.log.error("[ReYeelight][ERROR]DeskLamp - getColorTemperature Error: " + err);
                callback(err);
            });
        }.bind(this))
        .on('set', function(value,callback) {
            value = value - 50;
            value = value / 350 * 100;
            value = Math.round(100 - value);
            if(value == 0) {
                value = 1;
            }
            ct = 3800 * value / 100;
            ct = ct + 2700;
            that.platform.log.debug("[ReYeelight]DeskLamp - setColorTemperature : " + ct);
            
            this.device.call("set_ct_abx", [ct,"smooth",500]).then(result => {
                that.platform.log.debug("[ReYeelight][DEBUG]DeskLamp - setColorTemperature Result: " + result);
                if(result[0] === "ok") {
                    callback(null);
                } else {
                    callback(new Error(result[0]));
                }
            }).catch(function(err) {
                that.platform.log.error("[ReYeelight][ERROR]DeskLamp - setColorTemperature Error: " + err);
                callback(err);
            });
        }.bind(this));
    services.push(DeskLampServices);
    return services;
}

DeskLampService.prototype.updateTimer = function() {
    if (this.updatetimere) {
        clearTimeout(this.timer);
        this.timer = setTimeout(function() {
            if(this.Lampservice !== false){
                this.runTimer();
            }
            this.updateTimer();
        }.bind(this), this.interval * 1000);
    }
}

DeskLampService.prototype.runTimer = function() {
    var that = this;
    this.device.call("get_prop", ["power"]).then(result => {
        that.platform.log.debug("[ReYeelight][" + this.name + "][DEBUG]DeskLamp - getPower: " + result);
        this.Lampservice.getCharacteristic(Characteristic.On).updateValue(result[0] === 'on' ? true : false);
    }).catch(function(err) {
        if(err == "Error: Call to device timed out"){
            that.platform.log.debug("[ReYeelight][ERROR]DeskLamp - Lamp Offline");
        }else{
            that.platform.log.error("[ReYeelight][" + this.name + "][ERROR]DeskLamp - getPower Error: " + err);
        }
    });
    this.device.call("get_prop", ["bright"]).then(result => {
        that.platform.log.debug("[ReYeelight][" + this.name + "][DEBUG]DeskLamp - getBrightness: " + result);
        this.Lampservice.getCharacteristic(Characteristic.Brightness).updateValue(result[0]);
    }).catch(function(err) {
        if(err == "Error: Call to device timed out"){
            that.platform.log.debug("[ReYeelight][ERROR]DeskLamp - Lamp Offline");
        }else{
            that.platform.log.error("[ReYeelight][" + this.name + "][ERROR]DeskLamp - getBrightness Error: " + err);
        }
    });
    this.device.call("get_prop", ["ct"]).then(result => {
        that.platform.log.debug("[ReYeelight][" + this.name + "][DEBUG]DeskLamp - getColorTemperature: " + result);
        ct = result[0] - 2700;
        ct = ct / 3800 * 100;
        ct = 100 - ct;
        that.platform.log.debug("[ReYeelight][" + this.name + "][DEBUG]DeskLamp - getColorTemperature: " + result);
        this.Lampservice.getCharacteristic(Characteristic.Saturation).updateValue(ct);
    }).catch(function(err) {
        if(err == "Error: Call to device timed out"){
            that.platform.log.debug("[ReYeelight][ERROR]DeskLamp - Lamp Offline");
        }else{
            that.platform.log.error("[ReYeelight][" + this.name + "][ERROR]DeskLamp - getColorTemperature Error: " + err);
        }
    });
}
