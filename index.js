require('./Devices/ColorLEDBulb');
require('./Devices/DeskLamp');
require('./Devices/ColorLEDStrip');
require('./Devices/CeilingLamp');
require('./Devices/WhiteBulb');

var fs = require('fs');
var packageFile = require("./package.json");
var PlatformAccessory, Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
    if(!isConfig(homebridge.user.configPath(), "platforms", "ReYeelightPlatform")) {
        return;
    }
    
    PlatformAccessory = homebridge.platformAccessory;
    Accessory = homebridge.hap.Accessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform('homebridge-re-yeelight', 'ReYeelightPlatform', ReYeelightPlatform, true);
}

function isConfig(configFile, type, name) {
    var config = JSON.parse(fs.readFileSync(configFile));
    if("accessories" === type) {
        var accessories = config.accessories;
        for(var i in accessories) {
            if(accessories[i]['accessory'] === name) {
                return true;
            }
        }
    } else if("platforms" === type) {
        var platforms = config.platforms;
        for(var i in platforms) {
            if(platforms[i]['platform'] === name) {
                return true;
            }
        }
    } else {
    }
    
    return false;
}

function ReYeelightPlatform(log, config, api) {
    if(null == config) {
        return;
    }
    
    this.Accessory = Accessory;
    this.PlatformAccessory = PlatformAccessory;
    this.Service = Service;
    this.Characteristic = Characteristic;
    this.UUIDGen = UUIDGen;
    
    this.log = log;
    this.config = config;

    if (api) {
        this.api = api;
    }
    
    
    this.log.info("[INFO]*********************************************************************");
    this.log.info("[INFO]*                         ReYeelight v%s                         *",packageFile.version);
    this.log.info("[INFO]*    GitHub: https://github.com/Zzm317/homebridge-re-yeelight       *");
    this.log.info("[INFO]*                        QQ Group:545171648                         *");
    this.log.info("[INFO]*    Telegram Group:https://t.me/joinchat/EujYfA-JKSwpRlXURD1t6g    *");
    this.log.info("[INFO]*********************************************************************");
    this.log.info("[INFO]start success...");
    
}

ReYeelightPlatform.prototype = {
    accessories: function(callback) {
        var myAccessories = [];

        var deviceCfgs = this.config['deviceCfgs'];
        
        if(deviceCfgs instanceof Array) {
            for (var i = 0; i < deviceCfgs.length; i++) {
                var deviceCfg = deviceCfgs[i];
                if(null == deviceCfg['type'] || "" == deviceCfg['type'] || null == deviceCfg['token'] || "" == deviceCfg['token'] || null == deviceCfg['ip'] || "" == deviceCfg['ip']) {
                    continue;
                }
                
                if (deviceCfg['type'] == "ColorLEDBulb") {
                    new YeColorLEDBulb(this, deviceCfg).forEach(function(accessory, index, arr){
                        myAccessories.push(accessory);
                    });
                } else if(deviceCfg['type'] == "DeskLamp") {
                    new YeDeskLamp(this, deviceCfg).forEach(function(accessory, index, arr){
                        myAccessories.push(accessory);
                    });
                } else if(deviceCfg['type'] == "ColorLEDStrip") {
                    new YeColorLEDStrip(this, deviceCfg).forEach(function(accessory, index, arr){
                        myAccessories.push(accessory);
                    });
                } else if(deviceCfg['type'] == "CeilingLamp") {
                    new YeCeilingLamp(this, deviceCfg).forEach(function(accessory, index, arr){
                        myAccessories.push(accessory);
                    });
                } else if(deviceCfg['type'] == "WhiteBulb") {
                    new YeWhiteBulb(this, deviceCfg).forEach(function(accessory, index, arr){
                        myAccessories.push(accessory);
                    });
                }
            }
            this.log.info("[INFO]device size: " + deviceCfgs.length + ", accessories size: " + myAccessories.length);
        }

        callback(myAccessories);
    }
}