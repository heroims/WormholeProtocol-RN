import BLEStorage from './BLEStore';
import BLETransferManager from './BLETransferManager';
const Platform = require('Platform');

class Wormhole {

    constructor() {
        this.scanning=false;        
    }

    CreateNativeEventEmitter(centralEmitter,peripheralEmitter){
        BLETransferManager.CreateNativeEventEmitter(centralEmitter,peripheralEmitter);
        BLETransferManager.centralEmitter.addListener('BleManagerDiscoverPeripheral', (device)=>{   
            let deviceName = device.name;
            if (device.advertising){
                deviceName = device.advertising.localName;
            }
            let tmpDevice={name:deviceName,serviceUUIDs:device.advertising.serviceUUIDs===undefined?device.advertising.serviceUUIDs:device.advertising.serviceUUIDs.concat(),deviceID:device.id,connected:false}
            this.DiscoverDeviceHandler(tmpDevice)
        });

        BLETransferManager.centralEmitter.addListener('BleManagerDisconnectPeripheral', (device)=>{   
            this.DisconnectHandler(device.peripheral)
        });

        BLETransferManager.centralEmitter.addListener('BleManagerDidUpdateState', (res)=>{   
            this.BluetoothStateHandler(res)
        });

        BLETransferManager.centralEmitter.addListener('BleManagerStopScan', ()=>{   
            this.DiscoverDeviceStopHandler()
        });

        BLETransferManager.centralEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', (data) => {
            let characteristic = {'uuid':data.characteristic,'value':data.value.concat(),'service':data.service,'device':data.peripheral}
            BLETransferManager.TransferReceive(null,characteristic,(err,buffers)=>{
                characteristic.value=buffers;
                this.ReceiveHandler(characteristic);
            });    
        });
        
        BLETransferManager.peripheralEmitter.addListener('unsubscribedCentral',(central)=>{
            this.DisconnectHandler(central);
        });

        BLETransferManager.peripheralEmitter.addListener('didReceiveWrite',([err,data])=>{
            if (err){
              console.error(err);
              this.ReceiveHandler(undefined); 
            }
            else{
              let characteristic = {'uuid':data.uuid,'value':data.value.concat(),'service':data.service,'device':data.central}
              BLETransferManager.TransferReceive(null,characteristic,(err,buffers)=>{
                characteristic.value=buffers;
                this.ReceiveHandler(characteristic);
              });  
            }
        });
    }

    CreatServer(serviceUUID,characteristicUUIDs,name = ''){
        let deviceName = name;
        if(deviceName === ''){
            deviceName = this.deviceUUID;
        }
        BLETransferManager.SetPeripheralName(deviceName);
        BLETransferManager.AddPeripheralServer(serviceUUID);
  
        if (Platform.OS === 'android') {
            for (const characteristicUUID of characteristicUUIDs) {
                BLETransferManager.AddPeripheralCharacteristicToService(serviceUUID,characteristicUUID,1|16,2|8|16)
            }
        }
        else if(Platform.OS === 'ios'){
            for (const characteristicUUID of characteristicUUIDs) {
                BLETransferManager.AddPeripheralCharacteristicToService(serviceUUID,characteristicUUID,0x01|0x02,0x02|0x08|0x10)
            }
        }
        else{
        
        }
    }

    Start(receiveHandler){
        if(receiveHandler!=undefined){
            this.ReceiveHandler=receiveHandler;
        }
        return BLETransferManager.StartTransfer();
    }

    StartCentral(){
        return BLETransferManager.StartCentral();
    }

    StartPeripheral(){
        return BLETransferManager.StartPeripheral();
    }

    CheckState(){
        BLETransferManager.CheckState();
    }

    SendBuffer(deviceName,deviceID,serviceUUID,characteristicUUID,sendBuffer){
        BLETransferManager.TransferSend(sendBuffer,buffers=>{
            if(this.deviceUUID==deviceName){
                let deviceIDs=[deviceID];
                if(deviceID == undefined || deviceID == null){
                    deviceIDs = [];
                }
                BLETransferManager.SendToCentral([],serviceUUID,characteristicUUID,buffers);
            }
            else{
                BLETransferManager.SendToPeripheral(deviceID,serviceUUID,characteristicUUID,buffers).then()
            }
        });
    }

    Scan(serviceUUIDs,seconds,allowDuplicates,discoverDeviceHandler,discoverDeviceStopHandler){
        if(discoverDeviceHandler!=undefined){
            this.DiscoverDeviceHandler=discoverDeviceHandler;
        }
        if(discoverDeviceStopHandler!=undefined){
            this.DiscoverDeviceStopHandler=discoverDeviceStopHandler;
        }
        return new Promise((fulfill, reject)=>{
            BLETransferManager.Scan(serviceUUIDs,seconds,allowDuplicates)
            .then(res=>{
                this.scanning = true;
                fulfill(res);
            })
            .catch(err=>{
                this.scanning = false;
                reject(err);
            });
        });
    }

    StopScan(){
        if(this.scanning){
            this.scanning=false;
            return BLETransferManager.StopScan();
        }
        else{
            return new Promise((fulfill, reject)=>{
                this.scanning=false
                fulfill(true);
                reject('');
            });
        }
    }

    Connect(deviceID,serviceUUID,characteristicUUIDs){
        return new Promise((fulfill, reject)=>{
            BLETransferManager.ConnectPeripheral(deviceID)
            .then(()=>{
                BLETransferManager.StartNotification(deviceID,serviceUUID,characteristicUUIDs)
                .then((characteristic)=>{
                    fulfill(characteristic);
                })
                .catch(err=>{
                    reject(err);
                })
            })
            .catch(err=>{
                reject(err);
            })
        });
    }

    StopNotification(deviceID,serviceUUID,characteristicUUID){
        return BLETransferManager.StopNotification(deviceID,serviceUUID,characteristicUUID);
    }

    Disconnect(deviceID){
        return BLETransferManager.DisconnectPeripheral(deviceID)
    }

    GenerateDeviceID(){
        return new Promise((fulfill, reject)=>{
            BLEStorage
            .load({
                key: 'deviceInfo',
            })
            .then(ret => {
                this.deviceUUID = ret.uuid;
                fulfill(this.deviceUUID)
            })
            .catch(err => {
                this.deviceUUID = this.Generate8BitUUID().toUpperCase();
                fulfill(this.deviceUUID)
                BLEStorage.save({
                    key: 'deviceInfo', // Note: Do not use underscore("_") in key!
                    data: {
                        uuid: this.deviceUUID,
                    }
                })
                .then()
                .catch(err1=>{
                    reject(err1);
                })
            })
        })
    }

    GenerateBLEUUID() {
        let d = new Date().getTime();
        let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          let r = (d + Math.random()*16)%16 | 0;
          d = Math.floor(d/16);
          return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    }

    Generate8BitUUID() {
        let d = new Date().getTime();
        let uuid = 'xxxxxxxx'.replace(/[xy]/g, function(c) {
          let band = 36;
          let r = (d + Math.random()*band)%band | 0;
          d = Math.floor(d/band);
          return (c=='x' ? r : (r&0x5|0x7)).toString(band);
        });
        return uuid;
    }
}

export default BLEWormhole = new Wormhole();