export {BLECentral as BleManager};
import BLECentral from "react-native-ble-manager/BleManager";
import BLEPeripheral from 'react-native-ble-peripheral';
import {
    NativeEventEmitter,
    NativeModules,
  } from 'react-native';
  
import { Buffer } from 'buffer';

const EndFlag=0xfe;
const PartFlag=0xfd;
// const StartFlag=0xfc;
const MaxSendSize=20;
const PushSplitSize=18;

class TransferManager {
    constructor() {
        this.tmpWaitArr = {};
    }

    CreateNativeEventEmitter(centralEmitter,peripheralEmitter){
        if(peripheralEmitter==undefined){
            this.peripheralEmitter = new NativeEventEmitter(BLEPeripheral);
        }
        else{
            this.peripheralEmitter = peripheralEmitter;
        }
        if(centralEmitter==undefined){
            this.centralEmitter = new NativeEventEmitter(NativeModules.BleManager);
        }
        else{
            this.centralEmitter = centralEmitter;
        }
    }

    SetDeviceCharacteristicUUID(uuid){
        this.deviceCharacteristicUUID = uuid;
    }

    SetPeripheralName(localName){
        BLEPeripheral.setName(localName);
    }

    AddPeripheralServer(serviceUUID,primary=true){
        BLEPeripheral.addService(serviceUUID, primary);
    }

    AddPeripheralCharacteristicToService(bleServiceUUID,deviceCharacteristicUUID,permissions,properties){
        BLEPeripheral.addCharacteristicToService(bleServiceUUID,deviceCharacteristicUUID,permissions,properties)
    }

    StartTransfer(){
        return new Promise((fulfill, reject)=>{
            this.StartPeripheral()
            .then(res1=>{
                this.StartCentral()
                .then(res2=>{
                    fulfill({'res1':res1,'res2':res2});
                })
                .catch(err2=>{
                    reject(err2);
                })
            })
            .catch(err1=>{
                reject(err1);
            });
        });
    }

    StartPeripheral(){
       return BLEPeripheral.start()
    }

    StartCentral(){
        return BLECentral.start()
    }

    CheckState(){
        BLECentral.checkState();
    }

    Scan(serviceUUIDs,seconds,allowDuplicates, scanningOptions = {}){
        return BLECentral.scan(serviceUUIDs,seconds,allowDuplicates,scanningOptions);
    }

    StopScan(){
        return BLECentral.stopScan();
    }

    ConnectPeripheral(peripheralID){
        return BLECentral.connect(peripheralID);
    }

    DisconnectPeripheral(peripheralID){
        return BLECentral.disconnect(peripheralID);
    }

    RetrievePeripheralServices(peripheralID,serviceUUIDs){
        return BLECentral.retrieveServices(peripheralID,serviceUUIDs);
    }

    StopNotification(peripheralID,serviceUUID,characteristicUUID){
        return BLECentral.stopNotification(peripheralID,serviceUUID,characteristicUUID);
    }

    StartNotification(peripheralID,serviceUUID,characteristicUUIDs){
        return new Promise((fulfill, reject)=>{
            this.RetrievePeripheralServices(peripheralID,[serviceUUID])
            .then((peripheralInfo)=>{
                var tmpArr = peripheralInfo.characteristics;
                var tmpCharIDs = characteristicUUIDs.concat();

                while(tmpCharIDs.length>0){
                    var characteristicUUID = tmpCharIDs.pop();

                    for (var element of tmpArr) {

                        if(
                            (element.service.toUpperCase()==serviceUUID.toUpperCase())&&
                            (characteristicUUID.toUpperCase()==element.characteristic.toUpperCase())
                        ){
                            fulfill(element);

                            BLECentral.startNotification(peripheralID,serviceUUID,characteristicUUID).then(res=>{
                                console.log('startNotification sccuess',element);
                            })
                            break;
                        }
                    }
                }
              
            })
            .catch(err=>{
                reject(err);
            });
        });
    }

    GenerateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = (d + Math.random()*16)%16 | 0;
          d = Math.floor(d/16);
          return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    }

    SendToPeripheral(peripheralID,serviceUUID,characteristicUUID,buffer){
        return BLECentral.write(peripheralID,serviceUUID,characteristicUUID,buffer)
    }

    SendToCentral(centralIDs,serviceUUID,characteristicUUID,buffer){
        BLEPeripheral.sendNotificationToDevices(serviceUUID,characteristicUUID,buffer,centralIDs)
    }

    TransferSend(buffer, cb){
        var dataArr=[];
        var dataBuffer=buffer;
        if(dataBuffer.length<MaxSendSize){
          for (const iterator of dataBuffer) {
            dataArr.push(iterator);
          }
          dataArr.push(EndFlag)
          cb(dataArr)
        }
        else
        {
          for (let index = 0; index < dataBuffer.length; index++) {
            const element = dataBuffer[index];
            
            if(index==dataBuffer.length-1){
              dataArr.push(element);
              dataArr.push(EndFlag);
              cb(dataArr)
              dataArr=[];
            }
            else if(index%PushSplitSize==0){
              dataArr.push(PartFlag);
              cb(dataArr)
              dataArr=[element];
            }
            else{
              dataArr.push(element);
            }
          }
        }
    }

    TransferReceive(err,characteristic,cb,tag=''){
        if (err){
            cb(err,null)
        }
        else{
            var tmpDataArr=characteristic.value.concat();
            var tmpDataBuffer=Buffer.from(characteristic.value);

            if(this.tmpWaitArr[characteristic.uuid+tag]==undefined){
               this.tmpWaitArr[characteristic.uuid+tag]=[];
            }

            if(tmpDataBuffer[tmpDataBuffer.length-1]==EndFlag){
              tmpDataArr.pop();

              this.tmpWaitArr[characteristic.uuid+tag]=this.tmpWaitArr[characteristic.uuid+tag].concat(tmpDataArr);

              cb(err,Buffer.from(this.tmpWaitArr[characteristic.uuid+tag]))

              delete this.tmpWaitArr[characteristic.uuid+tag];
            }
            else if(tmpDataBuffer[tmpDataBuffer.length-1]==PartFlag){
              tmpDataArr.pop();

              this.tmpWaitArr[characteristic.uuid+tag]=this.tmpWaitArr[characteristic.uuid+tag].concat(tmpDataArr);
            }
            else{
               cb(err,Buffer.from(tmpDataArr));
            }
        }
    }
}

export default BLETransferManager = new TransferManager();